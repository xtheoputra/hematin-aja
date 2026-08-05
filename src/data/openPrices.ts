/**
 * Penarik harga NYATA dari Open Prices (https://prices.openfoodfacts.org) —
 * proyek harga terbuka dari Open Food Facts. Datanya dikontribusikan publik,
 * lengkap dengan toko (OpenStreetMap), tanggal, dan info diskon.
 *
 * Dipakai oleh tombol "Refresh" (on-demand) lewat /api/refresh, atau CLI
 * `npm run refresh`. TIDAK berjalan di background.
 *
 * Strategi:
 *  1) Ambil harga ber-currency IDR (terbaru dulu).
 *  2) Cocokkan toko via nama/brand OSM → slug supermarket kita.
 *     Lokasi yang bukan supermarket (mis. "Katedral Jakarta") otomatis terlewat.
 *  3) Cocokkan produk via barcode. Bila belum ada, buat produk dari Open Food
 *     Facts agar harga nyata tetap tampil.
 *  4) Simpan sebagai Price source="open-prices" (di-dedup per produk+toko+tanggal).
 */
import type { PrismaClient } from "@prisma/client";
import { cobaLagi, log } from "../lib/log";
import { periksaHarga } from "../lib/harga";
import { barcodeBukanBarang, periksaKandidatProduk } from "../lib/impor";
import {
  catatKeRingkasan,
  ringkasanKosong,
  simpanHarga,
  type RingkasanSimpan,
} from "../lib/simpanHarga";

const PRICES_API = "https://prices.openfoodfacts.org/api/v1/prices";
const OFF_PRODUCT_API = "https://world.openfoodfacts.org/api/v2/product";
const UA = "HematinAja/0.3 (price-comparison demo; +https://example.com)";

// Pencocokan nama/brand toko (OSM) → slug supermarket kita.
const STORE_MATCHERS: [RegExp, string][] = [
  [/alfamidi/i, "alfamidi"],
  [/alfamart|alfa\s*gift/i, "alfamart"],
  [/indomaret|klik\s*indomaret/i, "indomaret"],
  [/super\s*indo/i, "superindo"],
  [/foodmart/i, "foodmart"],
  [/yogya|griya/i, "yogya"],
  [/tip\s*top/i, "tiptop"],
  [/hari[\s-]*hari/i, "harihari"],
  [/borma/i, "borma"],
  [/diamond/i, "diamond"],
  [/hypermart/i, "hypermart"],
  [/transmart|carrefour/i, "transmart"],
  [/lotte/i, "lottemart"],
  [/aeon/i, "aeon"],
  [/ranch\s*market/i, "ranchmarket"],
  [/farmers\s*market/i, "farmersmarket"],
  [/grand\s*lucky/i, "grandlucky"],
  [/food\s*hall/i, "foodhall"],
];

function matchStore(loc: any): string | null {
  const s = `${loc?.osm_brand ?? ""} ${loc?.osm_name ?? ""} ${loc?.osm_display_name ?? ""}`;
  for (const [re, slug] of STORE_MATCHERS) if (re.test(s)) return slug;
  return null;
}

function mapCategory(tags: string[] = []): string {
  const t = tags.join(" ").toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  if (has("noodle", "pasta", "instant")) return "makanan-instan";
  if (has("dairy", "milk", "cheese", "yogurt", "egg")) return "susu-telur";
  if (has("beverage", "drink", "water", "soda", "tea", "coffee", "juice")) return "minuman";
  if (has("sauce", "condiment", "spice", "seasoning", "margarine", "syrup")) return "bumbu-dapur";
  if (has("rice", "flour", "sugar", "oil", "cereal")) return "sembako";
  if (has("baby", "infant")) return "ibu-bayi";
  if (has("hygiene", "soap", "cleaning", "detergent")) return "kebersihan";
  return "snack";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export type RefreshResult = {
  fetched: number;
  matchedStore: number;
  newProducts: number;
  inserted: number;
  skipped: number;
  /** Ditolak validasi harga — dibedakan dari "dilewati", karena artinya beda. */
  rejected: number;
  /**
   * Ditolak gerbang mutu produk (buku/majalah, tanpa nama, harga tak wajar)
   * SEBELUM apa pun dibuat. Dibedakan lagi dari `rejected` karena yang ini
   * berarti "tidak ada produk sampah yang tertinggal" — dulu justru tertinggal.
   */
  ditolakMutu: number;
  /** Contoh alasan penolakan mutu, untuk ditelusuri saat angkanya melonjak. */
  alasanMutu: string[];
  byStore: Record<string, number>;
};

async function offProductInfo(barcode: string) {
  try {
    const url = `${OFF_PRODUCT_API}/${barcode}.json?fields=product_name,product_name_id,brands,quantity,categories_tags,image_front_small_url`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const d = (await res.json()) as any;
    return d?.product ?? null;
  } catch {
    return null;
  }
}

export async function refreshRealPrices(
  prisma: PrismaClient,
  opts: { pages?: number } = {}
): Promise<RefreshResult> {
  // Tarik banyak halaman; loop berhenti otomatis saat data habis (items kosong).
  const pages = opts.pages ?? 20;

  const [products, supermarkets, categories] = await Promise.all([
    prisma.product.findMany({ select: { id: true, barcode: true } }),
    prisma.supermarket.findMany({ select: { id: true, slug: true } }),
    prisma.category.findMany({ select: { id: true, slug: true } }),
  ]);
  const productByBarcode = new Map(
    products.filter((p) => p.barcode).map((p) => [p.barcode as string, p.id])
  );
  const usedSlugs = new Set(
    (await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug)
  );
  const storeBySlug = new Map(supermarkets.map((s) => [s.slug, s.id]));
  let catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // Pastikan ada kategori cadangan "Lainnya".
  async function categoryId(slug: string): Promise<string> {
    if (catBySlug.has(slug)) return catBySlug.get(slug)!;
    const created = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name: "Lainnya", icon: "🛒" },
    });
    catBySlug.set(slug, created.id);
    return created.id;
  }

  const result: RefreshResult = {
    fetched: 0,
    matchedStore: 0,
    newProducts: 0,
    inserted: 0,
    skipped: 0,
    rejected: 0,
    ditolakMutu: 0,
    alasanMutu: [],
    byStore: {},
  };
  const ringkas: RingkasanSimpan = ringkasanKosong();

  for (let page = 1; page <= pages; page++) {
    let items: any[] = [];
    try {
      const url = `${PRICES_API}?currency=IDR&size=100&page=${page}&order_by=-date`;
      // Percobaan ulang berjeda menaik: kegagalan di sini paling sering sesaat
      // (jaringan goyang), dan menyerah di percobaan pertama membuat "tidak ada
      // harga baru" tak bisa dibedakan dari "gagal menghubungi".
      const data = await cobaLagi(
        async () => {
          const res = await fetch(url, {
            headers: { "User-Agent": UA, Accept: "application/json" },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return (await res.json()) as any;
        },
        { label: `Open Prices halaman ${page}` }
      );
      items = data.items ?? data.results ?? [];
    } catch {
      // Sudah dicatat oleh cobaLagi(); berhenti menarik halaman berikutnya.
      break;
    }
    if (items.length === 0) break;

    for (const it of items) {
      result.fetched++;

      // 1) Toko harus cocok dengan salah satu supermarket kita.
      const slug = matchStore(it.location);
      const storeId = slug ? storeBySlug.get(slug) : undefined;
      if (!slug || !storeId) continue;
      result.matchedStore++;

      // 2) Harga valid.
      const price = Math.round(Number(it.price));
      if (!Number.isFinite(price) || price <= 0) {
        result.skipped++;
        continue;
      }

      const barcode = String(it.product_code || "").trim();
      if (!barcode) {
        result.skipped++;
        continue;
      }

      // Tolak buku & majalah sedini mungkin — sebelum satu pun permintaan
      // jaringan ke Open Food Facts terbuang untuknya.
      if (barcodeBukanBarang(barcode)) {
        result.ditolakMutu++;
        continue;
      }

      // 3) Produk: cari via barcode; bila belum ada, buat dari OFF / data harga.
      let productId = productByBarcode.get(barcode);
      if (!productId) {
        const off = await offProductInfo(barcode);
        const name = (off?.product_name_id || off?.product_name || it.product_name || "")
          .toString()
          .trim()
          .slice(0, 70);
        const catSlug = mapCategory(
          off?.categories_tags ?? (it.category_tag ? [it.category_tag] : [])
        );

        // ⚠️ Gerbang mutu dijalankan SEBELUM produknya dibuat.
        //
        // Urutan lama membuat produk dulu dan memvalidasi harga belakangan
        // lewat `simpanHarga()` — sehingga tiap harga yang ditolak tetap
        // meninggalkan produk sampah di katalog selamanya. Harganya diperiksa
        // di sini dengan fungsi yang sama persis, jadi tidak ada dua aturan.
        const periksa = periksaKandidatProduk({
          barcode,
          nama: name,
          satuan: off?.quantity,
          hargaSah: periksaHarga(price, { kategori: catSlug }).sah,
        });

        if (!periksa.layak) {
          result.ditolakMutu++;
          if (result.alasanMutu.length < 20) {
            result.alasanMutu.push(`${barcode}: ${periksa.pesan}`);
          }
          continue;
        }

        let slugP = slugify(periksa.nama);
        if (!slugP) {
          result.ditolakMutu++;
          continue;
        }
        if (usedSlugs.has(slugP)) slugP = `${slugP}-${barcode.slice(-4)}`;
        if (usedSlugs.has(slugP)) {
          result.skipped++;
          continue;
        }

        const created = await prisma.product.create({
          data: {
            slug: slugP,
            name: periksa.nama,
            brand: (off?.brands || "").split(",")[0].trim() || null,
            // Satuan tak terbaca disimpan KOSONG, bukan ditambal "1 pcs" —
            // lihat catatan di `satuanDariSumberLuar()`.
            unit: periksa.satuan,
            emoji: "🛒",
            image: off?.image_front_small_url || null,
            barcode,
            categoryId: await categoryId(catSlug),
          },
        });
        productId = created.id;
        productByBarcode.set(barcode, productId);
        usedSlugs.add(slugP);
        result.newProducts++;
      }

      // 4) Simpan lewat pintu bersama: validasi harga & aturan dedup identik
      //    dengan jalur scraper dan input manual.
      const recordedAt = new Date(`${it.date}T00:00:00.000Z`);
      const hasil = await simpanHarga(prisma, {
        productId,
        supermarketId: storeId,
        price,
        inStock: true,
        source: "open-prices",
        url: `https://prices.openfoodfacts.org/app/products/${barcode}`,
        recordedAt,
      });
      catatKeRingkasan(ringkas, hasil);

      if (hasil.status === "disimpan" || hasil.status === "diperbarui") {
        result.inserted++;
        result.byStore[slug] = (result.byStore[slug] ?? 0) + 1;
      } else if (hasil.status === "ditolak") {
        result.rejected++;
      } else {
        result.skipped++;
      }
    }
  }

  await log.info("refresh", "Tarikan Open Prices selesai", {
    diperiksa: result.fetched,
    cocokToko: result.matchedStore,
    produkBaru: result.newProducts,
    ...ringkas,
  });

  return result;
}
