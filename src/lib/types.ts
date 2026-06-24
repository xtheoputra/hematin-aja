export type StorePrice = {
  supermarketId: string;
  supermarketSlug: string;
  supermarketName: string;
  color: string;
  price: number;
  inStock: boolean;
  recordedAt: string;
  url?: string | null;
  source: string; // "seed" | "import-off" (ilustrasi) | "open-prices" (nyata)
  isReal: boolean; // true bila harga berasal dari sumber nyata
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
  cheapestStore: string; // nama supermarket termurah
  cheapestStoreColor: string;
  storeCount: number; // jumlah toko yang punya harga
  spread: number; // selisih maksimal-minimal (potensi hemat)
  hasRealPrice: boolean; // true bila ada harga nyata (Open Prices)
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
  stores: StorePrice[]; // harga terbaru per toko, terurut termurah dulu
  history: PricePoint[]; // seri waktu untuk grafik (per toko)
  stats: {
    min: number;
    max: number;
    avg: number;
    cheapestStore: string;
    changePct: number | null; // perubahan harga termurah vs periode awal
  };
};

export type CartCompareLine = {
  productId: string;
  name: string;
  emoji: string;
  unit: string;
  qty: number;
  price: number | null; // harga di toko ini (null = tidak tersedia)
  available: boolean;
};

export type CartCompareStore = {
  supermarketId: string;
  slug: string;
  name: string;
  color: string;
  total: number;
  availableCount: number;
  missingCount: number;
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
  isCheapest: boolean;
  vsMin: number; // selisih dari harga termurah pasar (0 jika termurah)
  cheapestStore: string;
  isReal: boolean;
};

export type SupermarketDetail = SupermarketSummary & {
  products: SupermarketProductRow[];
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
};
