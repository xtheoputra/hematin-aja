import { prisma } from "@/lib/db";
import type {
  ProductListItem,
  ProductDetail,
  StorePrice,
  PricePoint,
  CartCompareStore,
  Insights,
  SupermarketSummary,
  SupermarketDetail,
  SupermarketProductRow,
} from "@/lib/types";

type PriceWithStore = {
  supermarketId: string;
  price: number;
  inStock: boolean;
  url: string | null;
  source: string;
  recordedAt: Date;
  supermarket: { slug: string; name: string; color: string };
};

// Harga dianggap NYATA bila bukan hasil seed/impor simulasi.
export const isRealSource = (source: string) =>
  source !== "seed" && source !== "import-off";

function toStorePrice(p: PriceWithStore): StorePrice {
  return {
    supermarketId: p.supermarketId,
    supermarketSlug: p.supermarket.slug,
    supermarketName: p.supermarket.name,
    color: p.supermarket.color,
    price: p.price,
    inStock: p.inStock,
    recordedAt: p.recordedAt.toISOString(),
    url: p.url,
    source: p.source,
    isReal: isRealSource(p.source),
  };
}

// Ambil harga TERBARU per supermarket (terurut desc lebih dulu).
// Bila ada harga NYATA untuk sebuah toko, itu yang dipakai (lebih diutamakan
// daripada harga ilustrasi), meski tanggalnya lebih lama.
function latestPerStore(prices: PriceWithStore[]): StorePrice[] {
  const real = new Map<string, StorePrice>();
  const any = new Map<string, StorePrice>();
  for (const p of prices) {
    const sp = toStorePrice(p);
    if (!any.has(p.supermarketId)) any.set(p.supermarketId, sp);
    if (sp.isReal && !real.has(p.supermarketId)) real.set(p.supermarketId, sp);
  }
  return [...any.keys()].map((id) => real.get(id) ?? any.get(id)!);
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

// Statistik ringkas untuk hero beranda (jumlah toko, produk, total potensi hemat).
export async function getHomeStats(): Promise<{
  storeCount: number;
  productCount: number;
  totalSaving: number;
}> {
  const [storeCount, products] = await Promise.all([
    prisma.supermarket.count(),
    prisma.product.findMany({
      include: {
        prices: {
          orderBy: { recordedAt: "desc" },
          include: { supermarket: true },
        },
      },
    }),
  ]);

  let totalSaving = 0;
  for (const p of products) {
    const inStock = latestPerStore(p.prices as PriceWithStore[]).filter(
      (s) => s.inStock
    );
    if (inStock.length < 2) continue;
    const prices = inStock.map((s) => s.price);
    totalSaving += Math.max(...prices) - Math.min(...prices);
  }

  return { storeCount, productCount: products.length, totalSaving };
}

export async function getProducts(opts: {
  search?: string;
  category?: string;
}): Promise<ProductListItem[]> {
  const { search, category } = opts;
  const products = await prisma.product.findMany({
    where: {
      AND: [
        category ? { category: { slug: category } } : {},
        search
          ? {
              OR: [
                { name: { contains: search } },
                { brand: { contains: search } },
              ],
            }
          : {},
      ],
    },
    include: {
      category: true,
      prices: {
        orderBy: { recordedAt: "desc" },
        include: { supermarket: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => {
    const stores = latestPerStore(p.prices as PriceWithStore[]).filter(
      (s) => s.inStock
    );
    const sorted = [...stores].sort((a, b) => a.price - b.price);
    const min = sorted[0]?.price ?? 0;
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
      cheapestStore: sorted[0]?.supermarketName ?? "-",
      cheapestStoreColor: sorted[0]?.color ?? "#10b981",
      storeCount: stores.length,
      spread: max - min,
      hasRealPrice: stores.some((s) => s.isReal),
    };
  });
}

export async function getProductDetail(
  slug: string
): Promise<ProductDetail | null> {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      prices: {
        orderBy: { recordedAt: "desc" },
        include: { supermarket: true },
      },
    },
  });
  if (!p) return null;

  const prices = p.prices as PriceWithStore[];
  const stores = latestPerStore(prices).sort((a, b) => a.price - b.price);

  // Bangun seri waktu untuk grafik: satu titik per tanggal, kolom per slug toko.
  const byDate = new Map<string, PricePoint>();
  for (const pr of prices) {
    const k = dayKey(pr.recordedAt);
    if (!byDate.has(k)) byDate.set(k, { date: k });
    const point = byDate.get(k)!;
    point[pr.supermarket.slug] = pr.price;
  }
  const history = [...byDate.values()].sort((a, b) =>
    a.date < b.date ? -1 : 1
  );

  const inStockPrices = stores.filter((s) => s.inStock).map((s) => s.price);
  const min = Math.min(...inStockPrices);
  const max = Math.max(...inStockPrices);
  const avg = Math.round(
    inStockPrices.reduce((a, b) => a + b, 0) / inStockPrices.length
  );

  // Perubahan harga termurah: bandingkan minimum di titik awal vs titik akhir.
  let changePct: number | null = null;
  if (history.length >= 2) {
    const priceCols = (pt: PricePoint) =>
      Object.entries(pt)
        .filter(([k]) => k !== "date")
        .map(([, v]) => v as number);
    const firstMin = Math.min(...priceCols(history[0]));
    const lastMin = Math.min(...priceCols(history[history.length - 1]));
    if (firstMin > 0) changePct = ((lastMin - firstMin) / firstMin) * 100;
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
    stores,
    history,
    stats: {
      min,
      max,
      avg,
      cheapestStore: stores[0]?.supermarketName ?? "-",
      changePct,
    },
  };
}

// Bandingkan total belanja keranjang di tiap supermarket → cari yang termurah.
export async function compareCart(
  items: { productId: string; qty: number }[]
): Promise<CartCompareStore[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.productId);
  const qtyById = new Map(items.map((i) => [i.productId, i.qty]));

  const [supermarkets, products] = await Promise.all([
    prisma.supermarket.findMany(),
    prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        prices: {
          orderBy: { recordedAt: "desc" },
          include: { supermarket: true },
        },
      },
    }),
  ]);

  // Map harga terbaru: productId -> supermarketId -> StorePrice
  const priceMap = new Map<string, Map<string, StorePrice>>();
  for (const p of products) {
    const m = new Map<string, StorePrice>();
    for (const s of latestPerStore(p.prices as PriceWithStore[])) {
      m.set(s.supermarketId, s);
    }
    priceMap.set(p.id, m);
  }

  const result: CartCompareStore[] = supermarkets.map((sm) => {
    const lines = products.map((p) => {
      const qty = qtyById.get(p.id) ?? 1;
      const sp = priceMap.get(p.id)?.get(sm.id);
      const available = !!sp && sp.inStock;
      return {
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        qty,
        price: available ? sp!.price : null,
        available,
      };
    });
    const total = lines.reduce(
      (sum, l) => sum + (l.available ? (l.price as number) * l.qty : 0),
      0
    );
    const availableCount = lines.filter((l) => l.available).length;
    return {
      supermarketId: sm.id,
      slug: sm.slug,
      name: sm.name,
      color: sm.color,
      total,
      availableCount,
      missingCount: lines.length - availableCount,
      lines,
    };
  });

  // Urutkan: kelengkapan barang dulu, lalu total termurah.
  return result.sort(
    (a, b) => b.availableCount - a.availableCount || a.total - b.total
  );
}

// Ringkasan semua supermarket + statistik posisi harga.
export async function getSupermarkets(): Promise<SupermarketSummary[]> {
  const [supermarkets, products] = await Promise.all([
    prisma.supermarket.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: {
        prices: {
          orderBy: { recordedAt: "desc" },
          include: { supermarket: true },
        },
      },
    }),
  ]);

  type Acc = { stocked: number; wins: number; ratioSum: number; ratioN: number };
  const acc = new Map<string, Acc>();
  const get = (id: string) =>
    acc.get(id) ?? { stocked: 0, wins: 0, ratioSum: 0, ratioN: 0 };

  for (const p of products) {
    const stores = latestPerStore(p.prices as PriceWithStore[]).filter(
      (s) => s.inStock
    );
    if (stores.length === 0) continue;
    const min = Math.min(...stores.map((s) => s.price));
    const cheapest = [...stores].sort((a, b) => a.price - b.price)[0];

    for (const s of stores) {
      const a = get(s.supermarketId);
      a.stocked += 1;
      if (min > 0) {
        a.ratioSum += s.price / min;
        a.ratioN += 1;
      }
      acc.set(s.supermarketId, a);
    }
    const w = get(cheapest.supermarketId);
    w.wins += 1;
    acc.set(cheapest.supermarketId, w);
  }

  return supermarkets
    .map((sm) => {
      const a = get(sm.id);
      return {
        slug: sm.slug,
        name: sm.name,
        color: sm.color,
        type: sm.type,
        tagline: sm.tagline,
        outlets: sm.outlets,
        website: sm.website,
        productCount: a.stocked,
        wins: a.wins,
        winRate: a.stocked > 0 ? (a.wins / a.stocked) * 100 : 0,
        priceIndex: a.ratioN > 0 ? Math.round((a.ratioSum / a.ratioN) * 100) : 100,
      };
    })
    .sort((a, b) => a.priceIndex - b.priceIndex); // termurah dulu
}

// Profil satu supermarket + daftar produk yang dijualnya.
export async function getSupermarketDetail(
  slug: string
): Promise<SupermarketDetail | null> {
  const summaries = await getSupermarkets();
  const summary = summaries.find((s) => s.slug === slug);
  if (!summary) return null;

  const products = await prisma.product.findMany({
    include: {
      category: true,
      prices: {
        orderBy: { recordedAt: "desc" },
        include: { supermarket: true },
      },
    },
  });

  const rows: SupermarketProductRow[] = [];
  for (const p of products) {
    const stores = latestPerStore(p.prices as PriceWithStore[]).filter(
      (s) => s.inStock
    );
    if (stores.length === 0) continue;
    const here = stores.find((s) => s.supermarketSlug === slug);
    if (!here) continue; // toko ini tidak menjual produk tsb
    const sorted = [...stores].sort((a, b) => a.price - b.price);
    const min = sorted[0].price;
    rows.push({
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      image: p.image,
      unit: p.unit,
      categoryName: p.category.name,
      price: here.price,
      isCheapest: here.price === min,
      vsMin: here.price - min,
      cheapestStore: sorted[0].supermarketName,
      isReal: here.isReal,
    });
  }

  // Urutkan: yang termurah (juara) dulu, lalu selisih terkecil.
  rows.sort(
    (a, b) => Number(b.isCheapest) - Number(a.isCheapest) || a.vsMin - b.vsMin
  );

  return { ...summary, products: rows };
}

export async function getInsights(): Promise<Insights> {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      prices: {
        orderBy: { recordedAt: "desc" },
        include: { supermarket: true },
      },
    },
  });

  // 1) Penurunan harga terbesar (harga terbaru vs harga ~4 minggu lalu) per toko.
  const drops: Insights["topDrops"] = [];
  // 2) Hitung "kemenangan" tiap toko (jadi termurah untuk sebuah produk).
  const winCount = new Map<string, { name: string; color: string; wins: number }>();
  // 3) Rekomendasi hemat per kategori (produk termurah vs rata-rata kategori).
  const byCategory = new Map<
    string,
    { categoryName: string; picks: { slug: string; name: string; emoji: string; price: number; store: string }[] }
  >();

  for (const p of products) {
    const prices = p.prices as PriceWithStore[];
    const stores = latestPerStore(prices).filter((s) => s.inStock);
    if (stores.length === 0) continue;
    const sorted = [...stores].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];

    // win count
    const w = winCount.get(cheapest.supermarketSlug) ?? {
      name: cheapest.supermarketName,
      color: cheapest.color,
      wins: 0,
    };
    w.wins += 1;
    winCount.set(cheapest.supermarketSlug, w);

    // category picks
    const cat = byCategory.get(p.categoryId) ?? {
      categoryName: p.category.name,
      picks: [],
    };
    cat.picks.push({
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      price: cheapest.price,
      store: cheapest.supermarketName,
    });
    byCategory.set(p.categoryId, cat);

    // drop terbesar per toko: latest vs harga sekitar 4 titik (minggu) lalu
    const byStore = new Map<string, PriceWithStore[]>();
    for (const pr of prices) {
      const arr = byStore.get(pr.supermarketId) ?? [];
      arr.push(pr);
      byStore.set(pr.supermarketId, arr);
    }
    for (const [, arr] of byStore) {
      // arr sudah desc (terbaru dulu)
      const latest = arr[0];
      const past = arr[Math.min(4, arr.length - 1)];
      if (!latest || !past || past.price <= 0) continue;
      const changePct = ((latest.price - past.price) / past.price) * 100;
      if (changePct < -2 && latest.inStock) {
        drops.push({
          slug: p.slug,
          name: p.name,
          emoji: p.emoji,
          store: latest.supermarket.name,
          oldPrice: past.price,
          newPrice: latest.price,
          changePct,
        });
      }
    }
  }

  drops.sort((a, b) => a.changePct - b.changePct);

  // Toko termurah secara keseluruhan (win rate)
  let cheapestStoreOverall: Insights["cheapestStoreOverall"] = null;
  const totalWins = [...winCount.values()].reduce((s, w) => s + w.wins, 0);
  if (totalWins > 0) {
    const best = [...winCount.values()].sort((a, b) => b.wins - a.wins)[0];
    cheapestStoreOverall = {
      name: best.name,
      color: best.color,
      winRate: (best.wins / totalWins) * 100,
    };
  }

  // Rekomendasi: per kategori, ambil produk termurah & bandingkan dengan rata-rata kategori.
  const recommendations: Insights["recommendations"] = [];
  for (const [, cat] of byCategory) {
    if (cat.picks.length < 2) continue;
    const avg =
      cat.picks.reduce((s, p) => s + p.price, 0) / cat.picks.length;
    const cheapest = [...cat.picks].sort((a, b) => a.price - b.price)[0];
    const saving = Math.round(avg - cheapest.price);
    if (saving <= 0) continue;
    recommendations.push({
      categoryName: cat.categoryName,
      pickName: cheapest.name,
      pickSlug: cheapest.slug,
      pickEmoji: cheapest.emoji,
      pickPrice: cheapest.price,
      pickStore: cheapest.store,
      comparedTo: `rata-rata ${cat.categoryName.toLowerCase()}`,
      saving,
    });
  }
  recommendations.sort((a, b) => b.saving - a.saving);

  return {
    topDrops: drops.slice(0, 6),
    cheapestStoreOverall,
    recommendations: recommendations.slice(0, 6),
  };
}
