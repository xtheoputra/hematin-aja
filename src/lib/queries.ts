import { prisma } from "@/lib/db";
import { isRealSource, sourceKindOf } from "@/lib/source";
import type {
  ProductListItem,
  ProductDetail,
  StorePrice,
  StoreCell,
  PricePoint,
  CartCompareStore,
  CartCompareLine,
  Insights,
  SupermarketSummary,
  SupermarketDetail,
  SupermarketProductRow,
  CompareMatrix,
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

type SupermarketLite = {
  id: string;
  slug: string;
  name: string;
  color: string;
  type: string;
};

// Harga NYATA = sumber open-prices / scrape (bukan seed/import-off).
const REAL_SOURCES = ["open-prices", "scrape"];

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
    sourceKind: sourceKindOf(p.source),
  };
}

/**
 * Pilih satu harga representatif per supermarket (daftar harga terurut desc).
 *  - mode "all"  : utamakan harga NYATA (walau tanggalnya lebih lama), jika tak
 *                  ada pakai harga terbaru (perkiraan).
 *  - mode "real" : HANYA pertimbangkan harga nyata; toko tanpa harga nyata
 *                  tidak masuk (akan ditandai "tidak tersedia").
 */
function pickPerStore(
  prices: PriceWithStore[],
  realOnly: boolean
): Map<string, StorePrice> {
  const real = new Map<string, StorePrice>();
  const any = new Map<string, StorePrice>();
  for (const p of prices) {
    const sp = toStorePrice(p);
    if (!any.has(p.supermarketId)) any.set(p.supermarketId, sp);
    if (sp.isReal && !real.has(p.supermarketId)) real.set(p.supermarketId, sp);
  }
  const out = new Map<string, StorePrice>();
  for (const id of any.keys()) {
    if (realOnly) {
      if (real.has(id)) out.set(id, real.get(id)!);
    } else {
      out.set(id, real.get(id) ?? any.get(id)!);
    }
  }
  return out;
}

function minInStock(perStore: Map<string, StorePrice>): number | null {
  const arr = [...perStore.values()].filter((s) => s.inStock).map((s) => s.price);
  return arr.length ? Math.min(...arr) : null;
}

function cellFor(
  sm: SupermarketLite,
  sp: StorePrice | undefined,
  min: number | null
): StoreCell {
  if (!sp) {
    return {
      supermarketId: sm.id,
      slug: sm.slug,
      name: sm.name,
      color: sm.color,
      type: sm.type,
      price: null,
      inStock: false,
      available: false,
      isReal: false,
      source: null,
      sourceKind: "none",
      recordedAt: null,
      isCheapest: false,
      vsMin: null,
    };
  }
  return {
    supermarketId: sm.id,
    slug: sm.slug,
    name: sm.name,
    color: sm.color,
    type: sm.type,
    price: sp.price,
    inStock: sp.inStock,
    available: true,
    isReal: sp.isReal,
    source: sp.source,
    sourceKind: sp.sourceKind,
    recordedAt: sp.recordedAt,
    isCheapest: sp.inStock && min !== null && sp.price === min,
    vsMin: sp.inStock && min !== null ? sp.price - min : null,
  };
}

// Satu sel per supermarket, MENGIKUTI urutan daftar supermarket (untuk matriks).
function alignedCells(
  perStore: Map<string, StorePrice>,
  supermarkets: SupermarketLite[]
): StoreCell[] {
  const min = minInStock(perStore);
  return supermarkets.map((sm) => cellFor(sm, perStore.get(sm.id), min));
}

function cellRank(c: StoreCell): number {
  if (c.available && c.inStock) return 0;
  if (c.available) return 1; // ada harga tapi stok habis
  return 2; // tidak tersedia
}

function cellComparator(a: StoreCell, b: StoreCell): number {
  return (
    cellRank(a) - cellRank(b) ||
    (a.price ?? Infinity) - (b.price ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

const priceInclude = {
  orderBy: { recordedAt: "desc" },
  include: { supermarket: true },
} as const;

const SM_SELECT = { id: true, slug: true, name: true, color: true, type: true } as const;

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

// Statistik ringkas untuk hero beranda.
export async function getHomeStats(realOnly = false): Promise<{
  storeCount: number;
  productCount: number;
  totalSaving: number;
  realPriceCount: number;
}> {
  const [storeCount, products, realPriceCount] = await Promise.all([
    prisma.supermarket.count(),
    prisma.product.findMany({ include: { prices: priceInclude } }),
    prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
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

  return { storeCount, productCount: products.length, totalSaving, realPriceCount };
}

export async function getProducts(opts: {
  search?: string;
  category?: string;
  realOnly?: boolean;
}): Promise<ProductListItem[]> {
  const { search, category, realOnly = false } = opts;
  const [products, totalStores] = await Promise.all([
    prisma.product.findMany({
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
      include: { category: true, prices: priceInclude },
      orderBy: { name: "asc" },
    }),
    prisma.supermarket.count(),
  ]);

  return products.map((p) => {
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
      priceIsReal: cheapest?.isReal ?? false,
      storeCount: inStock.length,
      totalStores,
      spread: max - min,
      hasRealPrice: [...perStore.values()].some((s) => s.isReal),
    };
  });
}

export async function getProductDetail(
  slug: string,
  realOnly = false
): Promise<ProductDetail | null> {
  const [p, supermarkets] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: { category: true, prices: priceInclude },
    }),
    prisma.supermarket.findMany({ select: SM_SELECT, orderBy: { name: "asc" } }),
  ]);
  if (!p) return null;

  const prices = p.prices as PriceWithStore[];
  const perStore = pickPerStore(prices, realOnly);
  const cells = alignedCells(perStore, supermarkets).sort(cellComparator);
  const availableCount = cells.filter((c) => c.available).length;
  const realCount = cells.filter((c) => c.isReal).length;

  // Seri waktu untuk grafik. Di mode "real" hanya pakai titik harga nyata.
  const histSrc = realOnly
    ? prices.filter((pr) => isRealSource(pr.source))
    : prices;
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
}

// Matriks perbandingan: produk (baris) x semua supermarket (kolom).
export async function getCompareMatrix(opts: {
  search?: string;
  category?: string;
  realOnly?: boolean;
  limit?: number;
}): Promise<CompareMatrix> {
  const { search, category, realOnly = false, limit = 60 } = opts;
  const [supermarkets, products, realPriceCount] = await Promise.all([
    prisma.supermarket.findMany({ select: SM_SELECT, orderBy: { name: "asc" } }),
    prisma.product.findMany({
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
      include: { category: true, prices: priceInclude },
      orderBy: { name: "asc" },
      take: limit,
    }),
    prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
  ]);

  const rows = products.map((p) => {
    const perStore = pickPerStore(p.prices as PriceWithStore[], realOnly);
    const cells = alignedCells(perStore, supermarkets);
    const min = minInStock(perStore);
    return {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      unit: p.unit,
      emoji: p.emoji,
      image: p.image,
      categoryName: p.category.name,
      min,
      cells,
    };
  });

  return {
    stores: supermarkets.map((s) => ({
      slug: s.slug,
      name: s.name,
      color: s.color,
      type: s.type,
    })),
    rows,
    realPriceCount,
  };
}

// Bandingkan total belanja keranjang di tiap supermarket → cari yang termurah.
export async function compareCart(
  items: { productId: string; qty: number }[],
  realOnly = false
): Promise<CartCompareStore[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.productId);
  const qtyById = new Map(items.map((i) => [i.productId, i.qty]));

  const [supermarkets, products] = await Promise.all([
    prisma.supermarket.findMany({ select: SM_SELECT }),
    prisma.product.findMany({
      where: { id: { in: ids } },
      include: { prices: priceInclude },
    }),
  ]);

  // productId -> supermarketId -> StorePrice
  const priceMap = new Map<string, Map<string, StorePrice>>();
  for (const p of products) {
    priceMap.set(p.id, pickPerStore(p.prices as PriceWithStore[], realOnly));
  }

  const result: CartCompareStore[] = supermarkets.map((sm) => {
    const lines: CartCompareLine[] = products.map((p) => {
      const qty = qtyById.get(p.id) ?? 1;
      const sp = priceMap.get(p.id)?.get(sm.id);
      const available = !!sp && sp.inStock;
      return {
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        qty,
        price: available ? (sp as StorePrice).price : null,
        available,
        isReal: !!sp && sp.isReal,
        sourceKind: sp ? sp.sourceKind : "none",
      };
    });
    const total = lines.reduce(
      (sum, l) => sum + (l.available ? (l.price as number) * l.qty : 0),
      0
    );
    const availableCount = lines.filter((l) => l.available).length;
    const realCount = lines.filter((l) => l.available && l.isReal).length;
    return {
      supermarketId: sm.id,
      slug: sm.slug,
      name: sm.name,
      color: sm.color,
      total,
      availableCount,
      missingCount: lines.length - availableCount,
      realCount,
      lines,
    };
  });

  // Urutkan: kelengkapan barang dulu, lalu total termurah.
  return result.sort(
    (a, b) => b.availableCount - a.availableCount || a.total - b.total
  );
}

// Ringkasan semua supermarket + statistik posisi harga.
export async function getSupermarkets(
  realOnly = false
): Promise<SupermarketSummary[]> {
  const [supermarkets, products] = await Promise.all([
    prisma.supermarket.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ include: { prices: priceInclude } }),
  ]);

  type Acc = {
    stocked: number;
    real: number;
    wins: number;
    ratioSum: number;
    ratioN: number;
  };
  const acc = new Map<string, Acc>();
  const get = (id: string) =>
    acc.get(id) ?? { stocked: 0, real: 0, wins: 0, ratioSum: 0, ratioN: 0 };

  for (const p of products) {
    const stores = [
      ...pickPerStore(p.prices as PriceWithStore[], realOnly).values(),
    ].filter((s) => s.inStock);
    if (stores.length === 0) continue;
    const min = Math.min(...stores.map((s) => s.price));
    const cheapest = [...stores].sort((a, b) => a.price - b.price)[0];

    for (const s of stores) {
      const a = get(s.supermarketId);
      a.stocked += 1;
      if (s.isReal) a.real += 1;
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
        realProductCount: a.real,
        wins: a.wins,
        winRate: a.stocked > 0 ? (a.wins / a.stocked) * 100 : 0,
        priceIndex:
          a.ratioN > 0 ? Math.round((a.ratioSum / a.ratioN) * 100) : 100,
      };
    })
    .sort((a, b) => a.priceIndex - b.priceIndex); // termurah dulu
}

// Profil satu supermarket + daftar produk yang dijualnya.
export async function getSupermarketDetail(
  slug: string,
  realOnly = false
): Promise<SupermarketDetail | null> {
  const summaries = await getSupermarkets(realOnly);
  const summary = summaries.find((s) => s.slug === slug);
  if (!summary) return null;

  const products = await prisma.product.findMany({
    include: { category: true, prices: priceInclude },
  });

  const rows: SupermarketProductRow[] = [];
  for (const p of products) {
    const perStore = pickPerStore(p.prices as PriceWithStore[], realOnly);
    const here = [...perStore.values()].find((s) => s.supermarketSlug === slug);
    if (!here) continue; // toko ini tidak punya harga produk tsb (di mode aktif)
    const inStock = [...perStore.values()].filter((s) => s.inStock);
    const min = inStock.length ? Math.min(...inStock.map((s) => s.price)) : here.price;
    const cheapest = [...inStock].sort((a, b) => a.price - b.price)[0];
    rows.push({
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      image: p.image,
      unit: p.unit,
      categoryName: p.category.name,
      price: here.price,
      inStock: here.inStock,
      isCheapest: here.inStock && here.price === min,
      vsMin: here.price - min,
      cheapestStore: cheapest?.supermarketName ?? here.supermarketName,
      isReal: here.isReal,
      source: here.source,
      sourceKind: here.sourceKind,
    });
  }

  rows.sort(
    (a, b) => Number(b.isCheapest) - Number(a.isCheapest) || a.vsMin - b.vsMin
  );

  return { ...summary, products: rows };
}

export async function getInsights(realOnly = false): Promise<Insights> {
  const [products, realPriceCount] = await Promise.all([
    prisma.product.findMany({ include: { category: true, prices: priceInclude } }),
    prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
  ]);

  const drops: Insights["topDrops"] = [];
  const winCount = new Map<
    string,
    { name: string; color: string; wins: number }
  >();
  const byCategory = new Map<
    string,
    {
      categoryName: string;
      picks: {
        slug: string;
        name: string;
        emoji: string;
        price: number;
        store: string;
      }[];
    }
  >();

  for (const p of products) {
    const allPrices = p.prices as PriceWithStore[];
    // Di mode "real" hanya pertimbangkan harga nyata.
    const prices = realOnly
      ? allPrices.filter((pr) => isRealSource(pr.source))
      : allPrices;
    const stores = [...pickPerStore(prices, false).values()].filter(
      (s) => s.inStock
    );
    if (stores.length === 0) continue;
    const sorted = [...stores].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];

    const w = winCount.get(cheapest.supermarketSlug) ?? {
      name: cheapest.supermarketName,
      color: cheapest.color,
      wins: 0,
    };
    w.wins += 1;
    winCount.set(cheapest.supermarketSlug, w);

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

    // drop terbesar per toko: harga terbaru vs ~4 titik (minggu) lalu
    const byStore = new Map<string, PriceWithStore[]>();
    for (const pr of prices) {
      const arr = byStore.get(pr.supermarketId) ?? [];
      arr.push(pr);
      byStore.set(pr.supermarketId, arr);
    }
    for (const [, arr] of byStore) {
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

  const recommendations: Insights["recommendations"] = [];
  for (const [, cat] of byCategory) {
    if (cat.picks.length < 2) continue;
    const avg = cat.picks.reduce((s, p) => s + p.price, 0) / cat.picks.length;
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
    realPriceCount,
  };
}
