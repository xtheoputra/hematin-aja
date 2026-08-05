import { prisma } from "@/lib/db";
import { isRealSource } from "@/lib/source";
import { denganCache, kunciData, kunciTakBergantungMode, TTL } from "@/lib/cache";
import type {
  ProductListItem,
  ProductDetail,
  PricePoint,
  StorePrice,
} from "@/lib/types";
import {
  REAL_SOURCES,
  alignedCells,
  cellComparator,
  dayKey,
  hargaTerakhirPerToko,
  pickPerStore,
  type PriceWithStore,
} from "./pilih";
import { SERTAKAN_RIWAYAT_PENUH, SM_SELECT, sertakanHarga, stempelTerbaru } from "./muat";
import { cariProduk, catatPencarian, saranProduk, type JalurCari } from "./cari";

/** Bawaan & batas jumlah produk per halaman. Tidak ada cara meminta semuanya. */
export const PRODUK_PER_HALAMAN = 24;
export const MAKS_PER_HALAMAN = 96;

export async function getCategories() {
  return denganCache(kunciTakBergantungMode("kategori"), TTL.cari, () =>
    prisma.category.findMany({ orderBy: { name: "asc" } })
  );
}

/**
 * Kapan harga terakhir kali dicatat. Dipakai untuk melabeli umur data agar
 * pengguna tahu seberapa mutakhir angka yang dilihatnya.
 */
export async function getLatestRecordedAt(): Promise<string | null> {
  return denganCache(kunciTakBergantungMode("harga-terbaru"), TTL.harga, async () => {
    const latest = await prisma.price.findFirst({
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true },
    });
    return latest?.recordedAt.toISOString() ?? null;
  });
}

/**
 * Di mode "Hanya Nyata", produk tanpa satu pun harga nyata memang tidak akan
 * menampilkan apa-apa. Menyaringnya di database — bukan setelah semuanya
 * ditarik — sekaligus menjaga halaman pertama tidak berisi 24 kartu kosong.
 */
function saringMode(realOnly: boolean) {
  return realOnly ? { prices: { some: { source: { in: REAL_SOURCES } } } } : {};
}

function keItemDaftar(
  p: {
    id: string;
    slug: string;
    name: string;
    brand: string | null;
    unit: string;
    emoji: string;
    image: string | null;
    category: { slug: string; name: string };
    prices: unknown[];
  },
  realOnly: boolean,
  totalStores: number
): ProductListItem {
  const perStore = pickPerStore(p.prices as PriceWithStore[], realOnly);
  const inStock = [...perStore.values()].filter((s) => s.inStock);
  const sorted = [...inStock].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const min = cheapest?.price ?? 0;
  const max = sorted[sorted.length - 1]?.price ?? 0;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    emoji: p.emoji,
    image: p.image,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    minPrice: min,
    maxPrice: max,
    available: inStock.length > 0,
    cheapestStore: cheapest?.supermarketName ?? "-",
    cheapestStoreColor: cheapest?.color ?? "#10b981",
    cheapestSource: cheapest?.source ?? null,
    cheapestRecordedAt: cheapest?.recordedAt ?? null,
    priceIsReal: cheapest?.isReal ?? false,
    storeCount: inStock.length,
    totalStores,
    spread: max - min,
    hasRealPrice: [...perStore.values()].some((s) => s.isReal),
  };
}

export type DaftarProduk = {
  items: ProductListItem[];
  /** Berapa produk yang cocok seluruhnya — bukan cuma yang muat di halaman ini. */
  total: number;
  /** Langkah pencarian mana yang membuahkan hasil. `null` bila tidak sedang mencari. */
  jalur: JalurCari | null;
  /** "Maksud Anda…?" — hanya terisi saat pencarian nihil. */
  saran: { slug: string; name: string }[];
};

export async function getDaftarProduk(opts: {
  search?: string;
  category?: string;
  realOnly?: boolean;
  limit?: number;
  offset?: number;
  /** Matikan pencatatan (dipakai oleh uji supaya tidak mengotori data). */
  tanpaCatat?: boolean;
}): Promise<DaftarProduk> {
  const {
    search,
    category,
    realOnly = false,
    limit = PRODUK_PER_HALAMAN,
    offset = 0,
    tanpaCatat = false,
  } = opts;
  const ambil = Math.min(Math.max(1, limit), MAKS_PER_HALAMAN);

  const kunci = kunciData(
    "daftar-produk",
    realOnly,
    search ?? "",
    category ?? "",
    ambil,
    offset
  );

  const hasil = await denganCache<DaftarProduk>(kunci, TTL.cari, async () => {
    let idCocok: string[] | null = null;
    let skor = new Map<string, number>();
    let jalur: JalurCari | null = null;

    if (search) {
      const r = await cariProduk(search);
      idCocok = r.ids;
      skor = r.skor;
      jalur = r.jalur;
      if (idCocok.length === 0) {
        return { items: [], total: 0, jalur, saran: await saranProduk(search) };
      }
    }

    const where = {
      AND: [
        category ? { category: { slug: category } } : {},
        idCocok ? { id: { in: idCocok } } : {},
        saringMode(realOnly),
      ],
    };

    const [total, stempel, totalStores] = await Promise.all([
      prisma.product.count({ where }),
      stempelTerbaru(),
      prisma.supermarket.count(),
    ]);

    // Saat mencari, urutan ditentukan skor kecocokan — jadi halamannya dipotong
    // setelah pengurutan di memori, bukan lewat `skip` di database.
    const produk = await prisma.product.findMany({
      where,
      include: { category: true, prices: sertakanHarga(stempel) },
      orderBy: { name: "asc" },
      ...(idCocok ? {} : { skip: offset, take: ambil }),
    });

    let items = produk.map((p) => keItemDaftar(p, realOnly, totalStores));
    if (idCocok) {
      items = items
        .sort(
          (a, b) => (skor.get(b.id) ?? 0) - (skor.get(a.id) ?? 0) || a.name.localeCompare(b.name)
        )
        .slice(offset, offset + ambil);
    }

    return { items, total, jalur, saran: [] };
  });

  if (search && !tanpaCatat) {
    await catatPencarian({
      kueri: search,
      jumlahHasil: hasil.total,
      realOnly,
      jalur: hasil.jalur ?? "kosong",
    });
  }

  return hasil;
}

/** Bentuk lama, dipertahankan supaya pemanggil yang cuma butuh daftar tetap ringkas. */
export async function getProducts(opts: {
  search?: string;
  category?: string;
  realOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ProductListItem[]> {
  return (await getDaftarProduk(opts)).items;
}

export async function getHomeStats(realOnly = false): Promise<{
  storeCount: number;
  productCount: number;
  totalSaving: number;
  realPriceCount: number;
  latestRecordedAt: string | null;
}> {
  return denganCache(kunciData("statistik-beranda", realOnly), TTL.harga, async () => {
    const stempel = await stempelTerbaru();
    const [storeCount, products, realPriceCount, latestRecordedAt] = await Promise.all([
      prisma.supermarket.count(),
      prisma.product.findMany({
        where: saringMode(realOnly),
        select: { id: true, prices: sertakanHarga(stempel) },
      }),
      prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
      getLatestRecordedAt(),
    ]);

    let totalSaving = 0;
    for (const p of products) {
      const inStock = [
        ...pickPerStore(p.prices as PriceWithStore[], realOnly).values(),
      ].filter((s) => s.inStock);
      if (inStock.length < 2) continue;
      const prices = inStock.map((s) => s.price);
      totalSaving += Math.max(...prices) - Math.min(...prices);
    }

    return {
      storeCount,
      productCount: products.length,
      totalSaving,
      realPriceCount,
      latestRecordedAt,
    };
  });
}

export async function getProductDetail(
  slug: string,
  realOnly = false
): Promise<ProductDetail | null> {
  return denganCache(kunciData("detail-produk", realOnly, slug), TTL.harga, async () => {
    // Halaman ini SATU-SATUNYA yang menarik riwayat penuh — grafik trennya
    // memang menampilkan semua titik. Satu produk ≈ 165 baris, bukan 16.390.
    const [p, supermarkets] = await Promise.all([
      prisma.product.findUnique({
        where: { slug },
        include: { category: true, prices: SERTAKAN_RIWAYAT_PENUH },
      }),
      prisma.supermarket.findMany({ select: SM_SELECT, orderBy: { name: "asc" } }),
    ]);
    if (!p) return null;

    const prices = p.prices as PriceWithStore[];
    const perStore = pickPerStore(prices, realOnly);
    // Bayangan = harga terakhir yang pernah diketahui, untuk toko yang di mode
    // aktif tidak punya harga sama sekali. Lihat `hargaTerakhirPerToko()`.
    const cells = alignedCells(
      perStore,
      supermarkets,
      hargaTerakhirPerToko(prices)
    ).sort(cellComparator);
    const availableCount = cells.filter((c) => c.available).length;
    const realCount = cells.filter((c) => c.isReal).length;

    // Seri waktu untuk grafik. Di mode "real" hanya pakai titik harga nyata.
    const histSrc = realOnly ? prices.filter((pr) => isRealSource(pr.source)) : prices;
    const byDate = new Map<string, PricePoint>();
    for (const pr of histSrc) {
      const k = dayKey(pr.recordedAt);
      if (!byDate.has(k)) byDate.set(k, { date: k });
      byDate.get(k)![pr.supermarket.slug] = pr.price;
    }
    const history = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

    const inStockPrices = cells
      .filter((c) => c.inStock && c.price !== null)
      .map((c) => c.price as number);

    let stats: ProductDetail["stats"] = null;
    if (inStockPrices.length > 0) {
      const min = Math.min(...inStockPrices);
      const max = Math.max(...inStockPrices);
      const avg = Math.round(
        inStockPrices.reduce((a, b) => a + b, 0) / inStockPrices.length
      );
      let changePct: number | null = null;
      if (history.length >= 2) {
        const cols = (pt: PricePoint) =>
          Object.entries(pt)
            .filter(([k]) => k !== "date")
            .map(([, v]) => v as number);
        const firstMin = Math.min(...cols(history[0]));
        const lastMin = Math.min(...cols(history[history.length - 1]));
        if (Number.isFinite(firstMin) && firstMin > 0) {
          changePct = ((lastMin - firstMin) / firstMin) * 100;
        }
      }
      const cheapestCell = cells.find((c) => c.isCheapest);
      stats = {
        min,
        max,
        avg,
        cheapestStore: cheapestCell?.name ?? "-",
        changePct,
      };
    }

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      unit: p.unit,
      emoji: p.emoji,
      image: p.image,
      categorySlug: p.category.slug,
      categoryName: p.category.name,
      stores: cells,
      availableCount,
      realCount,
      history,
      stats,
    };
  });
}

export type BarisKerjaProduk = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  categoryName: string;
  /** Berapa harga NYATA yang sudah dipunyai produk ini. 0 = belum tergarap. */
  hargaNyata: number;
};

export type RingkasanKerja = {
  totalProduk: number;
  /** Produk yang punya ≥ 1 harga nyata — dihitung utuh, bukan dari daftar terpotong. */
  denganHargaNyata: number;
  belumTergarap: number;
  baris: BarisKerjaProduk[];
};

/**
 * Ringkasan kemajuan pengisian data + daftar kerjanya.
 *
 * Angka kemajuan dihitung dari SELURUH katalog, sementara `baris` dipotong
 * supaya tabelnya tetap ringan. Keduanya sengaja dipisah: pernah ada versi
 * yang menurunkan angka kemajuan dari panjang daftar terpotong, dan hasilnya
 * bar kemajuan mengaku 40/100 padahal harga nyata baru ada 11. Di aplikasi
 * yang seluruh gunanya adalah kejujuran data, angka hiasan seperti itu lebih
 * buruk daripada tidak ada angka sama sekali.
 */
export async function ringkasanKerja(batas = 60): Promise<RingkasanKerja> {
  const baris = await produkTanpaHargaNyata(batas);
  const [totalProduk, berharga] = await Promise.all([
    prisma.product.count(),
    prisma.price.groupBy({
      by: ["productId"],
      where: { source: { in: REAL_SOURCES } },
    }),
  ]);
  return {
    totalProduk,
    denganHargaNyata: berharga.length,
    belumTergarap: totalProduk - berharga.length,
    baris,
  };
}

/**
 * Daftar kerja pengisian data: produk beserta jumlah harga nyatanya, yang
 * paling kosong lebih dulu.
 *
 * Tanpa daftar ini, "isi harga nyata" cuma niat. Dengan daftar ini, ia jadi
 * antrean yang bisa dilihat berkurang.
 */
export async function produkTanpaHargaNyata(
  batas = 100
): Promise<BarisKerjaProduk[]> {
  const [produk, hitungan] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        unit: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.price.groupBy({
      by: ["productId"],
      where: { source: { in: REAL_SOURCES } },
      _count: { _all: true },
    }),
  ]);

  const per = new Map(hitungan.map((h) => [h.productId, h._count._all]));
  return produk
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      unit: p.unit,
      categoryName: p.category.name,
      hargaNyata: per.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.hargaNyata - b.hargaNyata || a.name.localeCompare(b.name))
    .slice(0, batas);
}

/** Daftar harga satu produk — untuk `GET /api/products/{id}/prices`. */
export async function getHargaProduk(
  idAtauSlug: string,
  realOnly = false
): Promise<{
  product: { id: string; slug: string; name: string; unit: string };
  prices: StorePrice[];
} | null> {
  const p = await prisma.product.findFirst({
    where: { OR: [{ id: idAtauSlug }, { slug: idAtauSlug }] },
    include: { prices: SERTAKAN_RIWAYAT_PENUH },
  });
  if (!p) return null;
  const perStore = pickPerStore(p.prices as PriceWithStore[], realOnly);
  return {
    product: { id: p.id, slug: p.slug, name: p.name, unit: p.unit },
    prices: [...perStore.values()].sort((a, b) => a.price - b.price),
  };
}
