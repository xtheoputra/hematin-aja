// Kontrak untuk semua scraper supermarket.
// Tambah toko baru = buat satu file adapter yang mengembalikan ScrapedPrice[].

export type ScrapedPrice = {
  /** slug produk di DB kita (harus cocok dengan Product.slug) */
  productSlug: string;
  /** slug supermarket di DB kita (harus cocok dengan Supermarket.slug) */
  supermarketSlug: string;
  /** harga dalam Rupiah (integer) */
  price: number;
  inStock?: boolean;
  /** tautan ke halaman produk di situs toko */
  url?: string;
};

export type Scraper = {
  /** identitas unik scraper, mis. "alfagift" */
  slug: string;
  /** nama tampilan */
  name: string;
  /** true = ikut dijalankan oleh runner. Set false untuk menonaktifkan. */
  enabled: boolean;
  /** ambil & parse harga. Lempar error jika gagal. */
  run(): Promise<ScrapedPrice[]>;
};
