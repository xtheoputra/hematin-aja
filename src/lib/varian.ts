/**
 * Perbandingan varian ukuran — logika MURNI, tanpa database.
 *
 * Menjawab pertanyaan yang paling sering muncul di depan rak dan paling jarang
 * dijawab aplikasi pembanding harga: **kemasan yang mana yang paling hemat?**
 *
 * Halaman produk selama ini menjawab "di toko mana barang INI paling murah".
 * Itu setengah pertanyaan. Setengah lainnya — apakah barang ini sendiri
 * pilihan yang masuk akal dibanding kemasan lain dari barang yang sama —
 * tidak pernah ditanyakan, padahal selisihnya biasanya jauh lebih besar
 * daripada selisih antar-toko.
 *
 * Dua gerbang, sama seperti saran pengganti agen:
 *
 *  1. **Harus sejenis**, bukan sekadar sekategori (lihat `kataJenis()`).
 *  2. **Harus sebasis satuan.** Rp/kg tidak pernah diadu dengan Rp/L.
 *
 * Bedanya dengan `agen/substitusi.ts`: di sini **tidak ada ambang hemat**.
 * Substitusi menyarankan tindakan, jadi harus menahan diri; ini menyajikan
 * perbandingan, jadi tugasnya menampilkan apa adanya — termasuk kalau ternyata
 * produk yang sedang dibuka memang yang paling hemat.
 *
 * ⚠️ Satu rem tetap dipasang, dan ini ditambahkan **setelah tabelnya dilihat
 * di aplikasi sungguhan**: judulnya sempat berbunyi "ada kemasan 92% lebih
 * murah" dengan membandingkan botol 700 ml terhadap **galon 19 L**. Benar
 * secara Rp/L, tapi galon menuntut dispenser dan bukan pilihan kemasan untuk
 * orang yang sedang memilih botol. Jadi:
 *
 *   - **Tabelnya tetap memuat semua ukuran** — itu informasi yang sah, persis
 *     seperti label harga per satuan di rak supermarket.
 *   - **Klaim hematnya hanya dihitung dari kemasan sekelas** (lihat
 *     `ukuranSekelas()`), dan yang di luar kelas diberi tanda.
 *
 * Menampilkan angka adalah satu hal; menyuruh orang pindah ke sana adalah hal
 * lain, dan cuma yang kedua yang perlu menahan diri.
 */
import { jenisBersama } from "./normalize";
import { hargaPerSatuan, ukuranSekelas } from "./satuan";

export type ProdukVarian = {
  slug: string;
  nama: string;
  emoji: string;
  satuan: string;
  categorySlug: string;
  /** Harga termurah yang tersedia di pasar untuk varian ini. */
  harga: number;
  toko: string;
  nyata: boolean;
};

export type BarisVarian = ProdukVarian & {
  perSatuan: number;
  satuanTampil: string;
  /** Varian ini adalah produk yang sedang dibuka. */
  iniYangDibuka: boolean;
  /** Paling murah per satuan di antara varian yang dibandingkan. */
  paling: boolean;
  /** Selisih persen terhadap varian termurah. 0 untuk yang termurah. */
  lebihMahalPersen: number;
  /**
   * Ukurannya terlalu jauh dari produk yang dibuka untuk disebut "kemasan
   * lain dari barang yang sama" (mis. botol 600 ml vs galon 19 L). Tetap
   * ditampilkan, tapi TIDAK ikut menghitung klaim hemat.
   */
  ukuranBedaKelas: boolean;
};

export type HasilVarian = {
  baris: BarisVarian[];
  /**
   * Berapa persen bisa dihemat dengan pindah ke kemasan termurah **yang masih
   * sekelas ukurannya**. 0 bila yang dibuka sudah paling hemat.
   */
  hematPersen: number;
  /** Nama kemasan yang jadi dasar klaim hemat di atas. */
  targetHemat: string | null;
  satuanTampil: string;
};

/** Di bawah ini bukan perbandingan, cuma satu barang berdiri sendiri. */
export const MIN_VARIAN = 2;

/** Paling banyak sekian baris supaya bagian ini tetap terbaca. */
export const MAKS_VARIAN = 6;

export function bandingVarian(
  ini: ProdukVarian,
  kandidat: ProdukVarian[]
): HasilVarian | null {
  const dasar = hargaPerSatuan(ini.harga, ini.satuan);
  if (!dasar) return null; // satuannya tak terbaca — tak ada dasar membandingkan

  const terkumpul: BarisVarian[] = [
    {
      ...ini,
      perSatuan: dasar.nilai,
      satuanTampil: dasar.satuan,
      iniYangDibuka: true,
      paling: false,
      lebihMahalPersen: 0,
      ukuranBedaKelas: false,
    },
  ];

  for (const k of kandidat) {
    if (k.slug === ini.slug) continue;
    if (k.categorySlug !== ini.categorySlug) continue;
    if (jenisBersama(ini.nama, k.nama).length === 0) continue;

    const hs = hargaPerSatuan(k.harga, k.satuan);
    if (!hs || hs.basis !== dasar.basis) continue;

    terkumpul.push({
      ...k,
      perSatuan: hs.nilai,
      satuanTampil: hs.satuan,
      iniYangDibuka: false,
      paling: false,
      lebihMahalPersen: 0,
      ukuranBedaKelas: !ukuranSekelas(dasar.ukuran, hs.ukuran),
    });
  }

  if (terkumpul.length < MIN_VARIAN) return null;

  terkumpul.sort((a, b) => a.perSatuan - b.perSatuan || a.nama.localeCompare(b.nama));

  const termurah = terkumpul[0].perSatuan;
  for (const b of terkumpul) {
    b.paling = b.perSatuan === termurah;
    b.lebihMahalPersen = termurah > 0 ? ((b.perSatuan - termurah) / termurah) * 100 : 0;
  }

  // Baris produk yang sedang dibuka SELALU ikut ditampilkan walau daftarnya
  // dipotong — tanpa dia, perbandingannya kehilangan titik acuan.
  let baris = terkumpul.slice(0, MAKS_VARIAN);
  if (!baris.some((b) => b.iniYangDibuka)) {
    const dibuka = terkumpul.find((b) => b.iniYangDibuka)!;
    baris = [...baris.slice(0, MAKS_VARIAN - 1), dibuka];
  }

  const dibuka = terkumpul.find((b) => b.iniYangDibuka)!;

  // Klaim hemat HANYA dari kemasan sekelas — lihat rem di kepala berkas.
  const sekelas = terkumpul.filter((b) => !b.ukuranBedaKelas);
  const target = sekelas.reduce((a, c) => (c.perSatuan < a.perSatuan ? c : a), dibuka);
  const hematPersen =
    dibuka.perSatuan > 0 && target.perSatuan < dibuka.perSatuan
      ? ((dibuka.perSatuan - target.perSatuan) / dibuka.perSatuan) * 100
      : 0;

  return {
    baris,
    hematPersen,
    targetHemat: hematPersen > 0 ? target.nama : null,
    satuanTampil: dasar.satuan,
  };
}
