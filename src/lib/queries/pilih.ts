/**
 * Logika penentu harga — **murni, tanpa database**.
 *
 * Dipisahkan dari akses DB supaya bisa diuji tanpa menyiapkan database:
 * "mana yang termurah", "harga mana yang mewakili sebuah toko", dan
 * "bagaimana urutan selnya" adalah aturan bisnis, bukan urusan Prisma.
 */
import { isRealSource, sourceKindOf } from "@/lib/source";
import type { StorePrice, StoreCell } from "@/lib/types";

/**
 * Harga dianggap NYATA bila kita tahu asal-usulnya dari dunia luar:
 * Open Prices, hasil cek situs toko, atau ketikan manusia lewat form admin.
 * `seed` & `import-off` adalah perkiraan.
 */
export const REAL_SOURCES = ["open-prices", "scrape", "manual"];

export type PriceWithStore = {
  supermarketId: string;
  price: number;
  inStock: boolean;
  url: string | null;
  source: string;
  recordedAt: Date;
  supermarket: { slug: string; name: string; color: string };
};

export type SupermarketLite = {
  id: string;
  slug: string;
  name: string;
  color: string;
  type: string;
};

export function toStorePrice(p: PriceWithStore): StorePrice {
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
export function pickPerStore(
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

export function minInStock(perStore: Map<string, StorePrice>): number | null {
  const arr = [...perStore.values()].filter((s) => s.inStock).map((s) => s.price);
  return arr.length ? Math.min(...arr) : null;
}

export function cellFor(
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
export function alignedCells(
  perStore: Map<string, StorePrice>,
  supermarkets: SupermarketLite[]
): StoreCell[] {
  const min = minInStock(perStore);
  return supermarkets.map((sm) => cellFor(sm, perStore.get(sm.id), min));
}

export function cellRank(c: StoreCell): number {
  if (c.available && c.inStock) return 0;
  if (c.available) return 1; // ada harga tapi stok habis
  return 2; // tidak tersedia
}

export function cellComparator(a: StoreCell, b: StoreCell): number {
  return (
    cellRank(a) - cellRank(b) ||
    (a.price ?? Infinity) - (b.price ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
