/**
 * Tipe untuk mesin keputusan belanja ("agen").
 *
 * Dipisah dari logikanya supaya lapisan database, API, dan UI bisa bicara
 * bentuk yang sama tanpa saling mengimpor mesinnya.
 */
import type { SourceKind } from "@/lib/types";

// ───────────────────────────── Masukan ─────────────────────────────

/** Harga sebuah produk di sebuah toko — sudah dipilih satu per toko. */
export type HargaToko = {
  supermarketId: string;
  slug: string;
  nama: string;
  warna: string;
  harga: number;
  adaStok: boolean;
  nyata: boolean;
  sourceKind: SourceKind;
  /** ISO. Dipakai menilai kesegaran; `null` bila tak diketahui. */
  dicatatPada: string | null;
};

/** Satu baris keranjang beserta seluruh harga yang diketahui untuknya. */
export type BarisMasuk = {
  productId: string;
  slug: string;
  nama: string;
  emoji: string;
  /** Teks satuan apa adanya dari katalog — boleh berantakan. */
  satuan: string;
  categorySlug: string;
  qty: number;
  harga: HargaToko[];
};

/** Kandidat pengganti: produk lain di kategori yang sama. */
export type KandidatSubstitusi = {
  productId: string;
  slug: string;
  nama: string;
  emoji: string;
  satuan: string;
  categorySlug: string;
  /** Harga termurah yang tersedia di pasar untuk produk ini. */
  hargaTermurah: number;
  tokoTermurah: string;
  nyata: boolean;
};

export type OpsiAgen = {
  /**
   * Ongkos satu perjalanan tambahan (bensin/ongkir/waktu), dalam Rupiah.
   * Inilah yang mencegah agen menyuruh orang mampir ke toko kedua demi
   * hemat Rp 800.
   */
  biayaPerjalanan?: number;
  /** Hanya pertimbangkan harga nyata. */
  hanyaNyata?: boolean;
  /** "Sekarang" — disuntikkan supaya uji tidak bergantung jam dinding. */
  sekarang?: Date;
};

// ───────────────────────────── Keluaran ─────────────────────────────

/** Bagaimana sebuah barang diperoleh dalam satu rencana. */
export type StatusBaris = "ada" | "diasumsikan" | "nihil";

export type BarisRencana = {
  productId: string;
  slug: string;
  nama: string;
  emoji: string;
  satuan: string;
  qty: number;
  status: StatusBaris;
  /** Harga satuan yang dipakai; `null` bila barangnya nihil di mana pun. */
  harga: number | null;
  /** Total baris = harga × qty. */
  subtotal: number;
  /** Toko tempat barang ini diambil. `null` untuk status selain "ada". */
  tokoNama: string | null;
  tokoSlug: string | null;
  nyata: boolean;
  /** Rp per kg/L/pcs — `null` bila satuannya tak terbaca. */
  perSatuan: number | null;
  satuanTampil: string | null;
};

export type OpsiToko = {
  supermarketId: string;
  slug: string;
  nama: string;
  warna: string;
  /** Total barang yang benar-benar ada di toko ini. */
  totalTersedia: number;
  /**
   * Seluruh barang, termasuk yang tidak dijual di sini — yang kurang dihitung
   * memakai harga pasar termurah, karena tetap harus dibeli.
   */
  totalBarang: number;
  /**
   * Ongkos perjalanan kedua. Terisi bila toko ini tidak punya semua barang,
   * karena sisanya menuntut mampir ke tempat lain. Inilah yang mencegah toko
   * dengan 1 barang murah "meminjam" harga toko lain secara gratis.
   */
  biayaPerjalananTambahan: number;
  /**
   * totalBarang + biayaPerjalananTambahan. Angka INI yang diadu antar-toko,
   * dan satu-satunya yang setara dengan total rencana pecah.
   */
  totalSetara: number;
  jumlahAda: number;
  jumlahDiasumsikan: number;
  jumlahNihil: number;
  /** Berapa baris yang harganya nyata (bukan perkiraan). */
  jumlahNyata: number;
  baris: BarisRencana[];
};

export type RencanaPecah = {
  /** Toko utama — yang menanggung nilai belanja terbesar. */
  utama: { slug: string; nama: string; warna: string; total: number; jumlah: number };
  kedua: { slug: string; nama: string; warna: string; total: number; jumlah: number };
  /** Total barang saja, belum termasuk ongkos perjalanan tambahan. */
  totalBarang: number;
  biayaPerjalanan: number;
  /** totalBarang + biayaPerjalanan. Inilah yang diadu dengan toko tunggal. */
  totalAkhir: number;
  /** Hemat bersih dibanding belanja di satu toko terbaik. Bisa ≤ 0. */
  hemat: number;
  baris: BarisRencana[];
};

export type TingkatKeyakinan = "tinggi" | "sedang" | "rendah";

export type Keyakinan = {
  /** 0..1 */
  nilai: number;
  tingkat: TingkatKeyakinan;
  /** Porsi nilai belanja yang ditopang harga nyata (0..1). */
  porsiNyata: number;
  /** Umur rata-rata harga yang dipakai, dalam hari. `null` bila tak diketahui. */
  umurRerataHari: number | null;
  alasan: string[];
};

export type JenisPeringatan =
  | "harga-mustahil"
  | "satuan-tak-terbaca"
  | "harga-basi"
  | "semua-perkiraan"
  | "barang-nihil"
  | "sebaran-harga-ekstrem";

export type Peringatan = {
  jenis: JenisPeringatan;
  /** "info" masih aman, "waspada" perlu dilihat, "serius" mengubah keputusan. */
  tingkat: "info" | "waspada" | "serius";
  pesan: string;
  /** Produk terkait, bila peringatannya menyangkut baris tertentu. */
  produk?: { slug: string; nama: string }[];
};

export type Substitusi = {
  /** Barang di keranjang yang bisa diganti. */
  dari: { productId: string; slug: string; nama: string; emoji: string; satuan: string };
  ke: {
    productId: string;
    slug: string;
    nama: string;
    emoji: string;
    satuan: string;
    harga: number;
    toko: string;
    nyata: boolean;
  };
  /** Rp per satuan sebelum & sesudah — dasar seluruh saran ini. */
  perSatuanDari: number;
  perSatuanKe: number;
  satuanTampil: string;
  /** Persen lebih murah per satuan. */
  hematPersen: number;
  /**
   * Perkiraan hemat Rupiah bila diganti, disetarakan pada jumlah isi yang
   * sama — BUKAN sekadar selisih harga label.
   */
  hematRupiah: number;
  alasan: string;
};

/** Apa yang akhirnya disarankan agen. */
export type Keputusan = {
  jenis: "satu-toko" | "pecah-dua-toko" | "tak-bisa-memutuskan";
  judul: string;
  /** Kalimat-kalimat alasan, urut dari yang paling menentukan. */
  alasan: string[];
  /** Hemat dibanding pilihan terburuk yang masih masuk akal. */
  hemat: number;
  /** Nama toko yang dituju (satu atau dua). */
  toko: string[];
};

export type Rencana = {
  keputusan: Keputusan;
  tokoTunggal: OpsiToko[];
  pecah: RencanaPecah | null;
  keyakinan: Keyakinan;
  peringatan: Peringatan[];
  substitusi: Substitusi[];
  /** Total barang di keranjang (jumlah baris, bukan jumlah qty). */
  jumlahBaris: number;
  biayaPerjalanan: number;
};
