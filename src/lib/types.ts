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
  cheapestRecordedAt: string | null; // kapan harga termurah itu dicek
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

// Bentuk hasil perbandingan keranjang tinggal di `@/lib/agen/tipe.ts`, bukan di
// sini: keranjang sekarang diputuskan oleh mesin keputusan, dan tipenya ikut
// mesinnya supaya tidak ada dua bentuk untuk hal yang sama.

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
  latestRecordedAt: string | null; // catatan harga terbaru di seluruh DB
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
    // Penurunan dari harga perkiraan bukan kabar yang sama kuatnya dengan
    // penurunan yang benar-benar dicek. Bedanya harus terbawa sampai ke UI.
    isReal: boolean;
  }[];
  cheapestStoreOverall: { name: string; color: string; winRate: number } | null;
  /**
   * Rekomendasi hemat, seluruhnya berdasar HARGA PER SATUAN. Tanpa itu,
   * "termurah di kategori ini" cuma berarti "angkanya paling kecil", dan
   * beras 5 kg selalu kalah dari gula 1 kg.
   */
  recommendations: {
    categoryName: string;
    pickName: string;
    pickSlug: string;
    pickEmoji: string;
    pickPrice: number;
    pickUnit: string;
    pickStore: string;
    /** Rp per kg / L / pcs. */
    perSatuan: number;
    satuanTampil: string;
    /** Pembanding: median per satuan produk sebanding di kategori yang sama. */
    medianPerSatuan: number;
    hematPerSatuan: number;
    hematPersen: number;
    /** Berapa produk sebanding yang ikut jadi pembanding. */
    jumlahPembanding: number;
  }[];
  realPriceCount: number; // total harga nyata di database (untuk banner kejujuran)
};
