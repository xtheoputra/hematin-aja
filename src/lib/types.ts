// Asal harga: "real" (terverifikasi), "estimate" (perkiraan), "none" (tidak tersedia).
export type SourceKind = "real" | "estimate" | "none";

export type StorePrice = {
  supermarketId: string;
  supermarketSlug: string;
  supermarketName: string;
  color: string;
  price: number;
  inStock: boolean;
  recordedAt: string;
  url?: string | null;
  source: string; // "seed"|"import-off" (perkiraan) | "open-prices"|"scrape" (nyata)
  isReal: boolean;
  sourceKind: SourceKind;
};

/**
 * Satu sel perbandingan: harga sebuah produk di sebuah supermarket.
 * price === null berarti "tidak tersedia" pada mode tampilan aktif.
 */
export type StoreCell = {
  supermarketId: string;
  slug: string;
  name: string;
  color: string;
  type: string;
  price: number | null;
  inStock: boolean;
  available: boolean; // ada harga (di mode aktif)
  isReal: boolean;
  source: string | null;
  sourceKind: SourceKind;
  recordedAt: string | null;
  isCheapest: boolean;
  vsMin: number | null; // selisih dari harga termurah pasar (0 = termurah)
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  unit: string;
  emoji: string;
  image: string | null;
  categorySlug: string;
  categoryName: string;
  minPrice: number;
  maxPrice: number;
  available: boolean; // ada minimal satu harga di mode aktif
  cheapestStore: string; // nama supermarket termurah
  cheapestStoreColor: string;
  cheapestSource: string | null;
  priceIsReal: boolean; // harga termurah yang ditampilkan berasal dari sumber nyata
  storeCount: number; // jumlah toko dengan harga (mode aktif)
  totalStores: number; // total supermarket dipantau
  spread: number; // selisih maksimal-minimal (potensi hemat)
  hasRealPrice: boolean; // ada harga nyata
};

export type PricePoint = {
  date: string; // ISO
  [supermarketSlug: string]: number | string;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  unit: string;
  emoji: string;
  image: string | null;
  categorySlug: string;
  categoryName: string;
  stores: StoreCell[]; // SEMUA supermarket (termasuk "tidak tersedia"), termurah dulu
  availableCount: number;
  realCount: number; // berapa toko punya harga nyata
  history: PricePoint[]; // seri waktu untuk grafik (per toko)
  stats: {
    min: number;
    max: number;
    avg: number;
    cheapestStore: string;
    changePct: number | null; // perubahan harga termurah vs periode awal
  } | null; // null bila tak ada harga sama sekali (mis. mode "real")
};

export type CartCompareLine = {
  productId: string;
  name: string;
  emoji: string;
  unit: string;
  qty: number;
  price: number | null; // harga di toko ini (null = tidak tersedia)
  available: boolean;
  isReal: boolean;
  sourceKind: SourceKind;
};

export type CartCompareStore = {
  supermarketId: string;
  slug: string;
  name: string;
  color: string;
  total: number;
  availableCount: number;
  missingCount: number;
  realCount: number;
  lines: CartCompareLine[];
};

export type SupermarketSummary = {
  slug: string;
  name: string;
  color: string;
  type: string;
  tagline: string | null;
  outlets: number | null;
  website: string | null;
  productCount: number; // jumlah produk yang tersedia (in stock)
  realProductCount: number; // jumlah produk dengan harga nyata
  wins: number; // jumlah produk di mana toko ini termurah
  winRate: number; // % produk yang termurah di toko ini
  priceIndex: number; // 100 = rata-rata pasar; <100 lebih murah, >100 lebih mahal
};

export type SupermarketProductRow = {
  slug: string;
  name: string;
  emoji: string;
  image: string | null;
  unit: string;
  categoryName: string;
  price: number;
  inStock: boolean;
  isCheapest: boolean;
  vsMin: number; // selisih dari harga termurah pasar (0 jika termurah)
  cheapestStore: string;
  isReal: boolean;
  source: string | null;
  sourceKind: SourceKind;
};

export type SupermarketDetail = SupermarketSummary & {
  products: SupermarketProductRow[];
};

// Satu baris matriks perbandingan: produk + harga di SEMUA supermarket.
export type CompareRow = {
  slug: string;
  name: string;
  brand: string | null;
  unit: string;
  emoji: string;
  image: string | null;
  categoryName: string;
  min: number | null;
  cells: StoreCell[]; // satu per supermarket, urut sesuai header
};

export type CompareMatrix = {
  stores: { slug: string; name: string; color: string; type: string }[];
  rows: CompareRow[];
  realPriceCount: number;
};

export type Insights = {
  topDrops: {
    slug: string;
    name: string;
    emoji: string;
    store: string;
    oldPrice: number;
    newPrice: number;
    changePct: number;
  }[];
  cheapestStoreOverall: { name: string; color: string; winRate: number } | null;
  recommendations: {
    categoryName: string;
    pickName: string;
    pickSlug: string;
    pickEmoji: string;
    pickPrice: number;
    pickStore: string;
    comparedTo: string;
    saving: number;
  }[];
  realPriceCount: number; // total harga nyata di database (untuk banner kejujuran)
};
