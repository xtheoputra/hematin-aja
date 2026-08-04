/**
 * Pintu masuk lapisan data. Dulu satu berkas `queries.ts` sepanjang 718 baris
 * yang mencampur logika bisnis dengan akses Prisma; sekarang dipecah per
 * urusan, dan yang murni logika (`pilih.ts`) bisa diuji tanpa database.
 *
 *   pilih.ts    — aturan "mana yang termurah / mewakili toko"  (TANPA database)
 *   muat.ts     — pemuatan harga secukupnya                     (Prisma)
 *   cari.ts     — alur pencarian bertingkat                     (Prisma)
 *   produk.ts   — daftar & detail produk                        (Prisma)
 *   toko.ts     — profil supermarket                            (Prisma)
 *   banding.ts  — matriks banding & keranjang                   (Prisma)
 *   insight.ts  — ringkasan hemat                               (Prisma)
 *
 * Jalur impor `@/lib/queries` sengaja dipertahankan supaya seluruh halaman
 * tidak perlu diubah hanya karena berkasnya dipecah.
 */
export {
  REAL_SOURCES,
  pickPerStore,
  minInStock,
  cellFor,
  alignedCells,
  cellComparator,
  type PriceWithStore,
  type SupermarketLite,
} from "./pilih";

export {
  getCategories,
  getLatestRecordedAt,
  getDaftarProduk,
  getProducts,
  getHomeStats,
  getProductDetail,
  getHargaProduk,
  produkTanpaHargaNyata,
  ringkasanKerja,
  PRODUK_PER_HALAMAN,
  MAKS_PER_HALAMAN,
  type DaftarProduk,
  type BarisKerjaProduk,
  type RingkasanKerja,
} from "./produk";

export {
  cariProduk,
  saranProduk,
  catatPencarian,
  kueriGagalTeratas,
  type JalurCari,
  type HasilCari,
} from "./cari";

export { getSupermarkets, getSupermarketDetail } from "./toko";
export { getCompareMatrix, compareCart } from "./banding";
export { getInsights } from "./insight";
export { stempelTerbaru, stempelTeratas } from "./muat";
