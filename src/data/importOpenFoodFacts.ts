/**
 * Importer data RIIL dari Open Food Facts (https://world.openfoodfacts.org).
 *
 * OFF adalah basis data produk terbuka (ODbL) dengan API gratis tanpa auth.
 * Kita memakainya untuk MEMPERKAYA katalog dengan produk Indonesia asli:
 * nama, merek, kategori, barcode, dan GAMBAR produk.
 *
 * Catatan penting:
 *  - OFF TIDAK menyediakan harga supermarket Indonesia. Maka harga di sini
 *    tetap disimulasikan (riwayat ~10 minggu lintas toko) memakai harga
 *    acuan per kategori — sama seperti seed. Yang "riil" adalah datanya
 *    (produk, merek, foto), bukan angka harganya.
 *  - Dedup berdasarkan barcode: produk yang sudah ada dilewati.
 *
 * Jalankan: npm run import:off            (default 30 produk)
 *           npm run import:off -- 60       (ambil 60 produk)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COUNTRY = "indonesia";
const TARGET = Number(process.argv[2]) || 30;
const PAGE_SIZE = 50;
const WEEKS = 10;
const USER_AGENT = "HematinAja/0.2 (price-comparison demo; +https://example.com)";

// Pengali harga rata-rata tiap toko (selaras dengan seed.ts).
const STORE_LEVEL: Record<string, number> = {
  alfamart: 1.02,
  indomaret: 1.01,
  alfamidi: 1.01,
  superindo: 0.99,
  foodmart: 0.99,
  yogya: 0.98,
  tiptop: 0.98,
  harihari: 0.97,
  borma: 0.96,
  diamond: 1.0,
  hypermart: 0.97,
  transmart: 0.95,
  lottemart: 0.94,
  aeon: 1.06,
  ranchmarket: 1.12,
  farmersmarket: 1.13,
  grandlucky: 1.09,
  foodhall: 1.16,
};

// Harga acuan kasar per kategori (Rupiah) untuk produk hasil impor.
const CATEGORY_BASE: Record<string, { base: number; vol: number }> = {
  "makanan-instan": { base: 6000, vol: 0.08 },
  snack: { base: 11000, vol: 0.07 },
  minuman: { base: 8000, vol: 0.08 },
  "susu-telur": { base: 18000, vol: 0.06 },
  "bumbu-dapur": { base: 13000, vol: 0.06 },
  sembako: { base: 25000, vol: 0.08 },
  "ibu-bayi": { base: 35000, vol: 0.06 },
  kebersihan: { base: 18000, vol: 0.07 },
};

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_id?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  image_front_small_url?: string;
  image_front_url?: string;
};

// Petakan tag kategori OFF -> slug kategori kita.
function mapCategory(tags: string[] = []): string | null {
  const t = tags.join(" ").toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  if (has("noodle", "pasta", "instant-meal", "instant-soup")) return "makanan-instan";
  if (has("dairy", "dairies", "milk", "cheese", "yogurt", "egg")) return "susu-telur";
  if (has("beverage", "drink", "water", "soda", "tea", "coffee", "juice", "soft-drink"))
    return "minuman";
  if (has("sauce", "condiment", "spice", "seasoning", "margarine", "syrup", "ketchup"))
    return "bumbu-dapur";
  if (has("rice", "flour", "sugar", "oil", "cereal", "grain")) return "sembako";
  if (has("baby", "infant")) return "ibu-bayi";
  if (has("hygiene", "soap", "cleaning", "detergent")) return "kebersihan";
  if (has("snack", "biscuit", "chocolate", "wafer", "candy", "crisp", "cracker", "confectioner"))
    return "snack";
  return null;
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

function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const round100 = (n: number) => Math.round(n / 100) * 100;
const hash = (s: string) =>
  [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page: number): Promise<OffProduct[]> {
  // API v2 lebih stabil daripada cgi/search.pl (yang sering 503).
  const params = new URLSearchParams({
    countries_tags_en: COUNTRY,
    page_size: String(PAGE_SIZE),
    page: String(page),
    fields:
      "code,product_name,product_name_id,brands,quantity,categories_tags,image_front_small_url,image_front_url",
  });
  const url = `https://world.openfoodfacts.org/api/v2/search?${params}`;

  // Coba beberapa kali dengan backoff bila server sibuk (5xx/429).
  let lastErr = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as { products?: OffProduct[] };
        return data.products ?? [];
      }
      lastErr = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) break; // error klien: jangan retry
    } catch (e) {
      lastErr = (e as Error).message;
    }
    const wait = 1500 * attempt;
    console.log(`     …server sibuk (${lastErr}), coba lagi dalam ${wait}ms`);
    await sleep(wait);
  }
  throw new Error(`OFF ${lastErr}`);
}

async function main() {
  console.log(`🌐 Mengimpor ±${TARGET} produk Indonesia dari Open Food Facts...`);

  const [supermarkets, existing] = await Promise.all([
    prisma.supermarket.findMany(),
    prisma.product.findMany({ select: { slug: true, barcode: true } }),
  ]);
  if (supermarkets.length === 0) {
    console.error("❌ Belum ada supermarket. Jalankan `npm run db:seed` dulu.");
    return;
  }
  const categories = await prisma.category.findMany();
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const usedSlugs = new Set(existing.map((p) => p.slug));
  const usedBarcodes = new Set(existing.map((p) => p.barcode).filter(Boolean));

  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  let imported = 0;
  let page = 1;
  const MAX_PAGES = 12;

  while (imported < TARGET && page <= MAX_PAGES) {
    let batch: OffProduct[];
    try {
      batch = await fetchPage(page);
    } catch (e) {
      console.error(`  ⚠️  Gagal ambil halaman ${page}:`, (e as Error).message);
      break;
    }
    if (batch.length === 0) break;

    for (const op of batch) {
      if (imported >= TARGET) break;

      const name = (op.product_name_id || op.product_name || "").trim();
      const brand = (op.brands || "").split(",")[0].trim();
      const image = op.image_front_small_url || op.image_front_url || "";
      const barcode = (op.code || "").trim();
      const catSlug = mapCategory(op.categories_tags);

      // Filter mutu: butuh nama, merek, gambar, barcode unik, kategori valid.
      if (!name || name.length < 3 || name.length > 70) continue;
      if (!brand || !image || !barcode || !catSlug) continue;
      if (usedBarcodes.has(barcode)) continue;
      if (!catBySlug[catSlug]) continue;

      let slug = slugify(name);
      if (!slug) continue;
      if (usedSlugs.has(slug)) slug = `${slug}-${barcode.slice(-4)}`;
      if (usedSlugs.has(slug)) continue;

      // Buat produk
      const product = await prisma.product.create({
        data: {
          slug,
          name,
          brand: brand || null,
          unit: op.quantity?.trim() || "1 pcs",
          emoji: "🛒",
          image,
          barcode,
          categoryId: catBySlug[catSlug].id,
        },
      });
      usedSlugs.add(slug);
      usedBarcodes.add(barcode);

      // Bangun riwayat harga tersimulasi lintas toko
      const cfg = CATEGORY_BASE[catSlug] ?? { base: 12000, vol: 0.07 };
      const seed = hash(barcode);
      const basePrice = round100(cfg.base * (0.6 + ((seed % 100) / 100) * 1.2));
      const rows: {
        productId: string;
        supermarketId: string;
        price: number;
        inStock: boolean;
        source: string;
        recordedAt: Date;
      }[] = [];

      supermarkets.forEach((sm, si) => {
        const rng = makeRng(seed + si * 7919 + 1);
        const level = STORE_LEVEL[sm.slug] ?? 1;
        const storeBias = level * (1 + (rng() - 0.5) * cfg.vol * 1.1);
        for (let w = WEEKS - 1; w >= 0; w--) {
          const trend = 1 + Math.sin((w / WEEKS) * Math.PI) * cfg.vol * 0.5;
          const noise = 1 + (rng() - 0.5) * cfg.vol;
          let price = round100(basePrice * storeBias * trend * noise);
          const promo = w <= 1 && rng() < 0.18 ? 0.85 : 1;
          price = round100(price * promo);
          rows.push({
            productId: product.id,
            supermarketId: sm.id,
            price: Math.max(500, price),
            inStock: rng() > 0.05,
            source: "import-off",
            recordedAt: new Date(now - w * WEEK_MS),
          });
        }
      });
      await prisma.price.createMany({ data: rows });

      imported++;
      console.log(`  ➕ [${imported}/${TARGET}] ${name} — ${brand} (${catSlug})`);
    }
    page++;
  }

  console.log(
    imported > 0
      ? `\n🎉 Selesai: ${imported} produk riil diimpor dari Open Food Facts.`
      : "\nTidak ada produk baru yang lolos filter mutu (coba jalankan lagi)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
