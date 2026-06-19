export type StorePrice = {
  supermarketId: string;
  supermarketSlug: string;
  supermarketName: string;
  color: string;
  price: number;
  inStock: boolean;
  recordedAt: string;
  url?: string | null;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  unit: string;
  emoji: string;
  categorySlug: string;
  categoryName: string;
  minPrice: number;
  maxPrice: number;
  cheapestStore: string; // nama supermarket termurah
  cheapestStoreColor: string;
  storeCount: number; // jumlah toko yang punya harga
  spread: number; // selisih maksimal-minimal (potensi hemat)
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
