/**
 * Saran pengganti — logika MURNI, tanpa database.
 *
 * Semua saran di sini berdiri di atas **harga per satuan**, bukan harga label.
 * Itulah bedanya dengan "rekomendasi" yang lama, yang membandingkan harga
 * mutlak lintas ukuran dan karenanya bisa menyarankan beras 1 kg sebagai
 * "lebih hemat" daripada beras 5 kg.
 *
 * Tiga rem yang sengaja dipasang, karena saran yang terlalu bersemangat lebih
 * merugikan daripada tidak ada saran:
 *
 *  - **Harus barang sejenis.** Ini rem terpenting, dan ditambahkan setelah
 *    agen dicoba pada katalog sungguhan: kategori saja terlalu kasar. Di
 *    kategori "minuman" ada Adem Sari, oatmeal instan, kopi sachet, dan air
 *    mineral — sehingga agen dengan yakin menyuruh mengganti Adem Sari dengan
 *    air mineral, dan oatmeal dengan kopi. Sekarang pengganti wajib berbagi
 *    kata jenis dengan barang yang diganti ("air mineral" dengan "air
 *    mineral"), bukan sekadar sekategori.
 *  - **Beda ukuran tidak boleh keterlaluan.** Mengganti air 600 ml dengan
 *    galon 19 L memang benar secara Rp/L, tapi itu bukan mengganti barang —
 *    itu membeli barang lain.
 *  - **Hemat harus terasa.** Beda 3% dan Rp 300 tidak sepadan dengan mengubah
 *    kebiasaan belanja.
 *
 * Batas yang diakui: berbagi kata bukan pemahaman. "Minyak goreng" dan "minyak
 * kayu putih" akan lolos bila kebetulan sekategori. Yang bisa dijamin di sini
 * hanyalah menutup kesalahan yang paling kasar; sisanya menunggu taksonomi
 * jenis produk yang memang belum ada di katalog.
 */
import { kataJenis } from "@/lib/normalize";
import { BATAS_LIPAT_UKURAN, hargaPerSatuan, type Ukuran } from "@/lib/satuan";
import type { BarisMasuk, KandidatSubstitusi, Substitusi } from "./tipe";

// Batas beda ukuran dipakai bersama dengan tabel varian di halaman produk —
// lihat `BATAS_LIPAT_UKURAN` di `@/lib/satuan`.
export { BATAS_LIPAT_UKURAN } from "@/lib/satuan";
/**
 * Hemat per satuan minimal, dalam persen. Bekerja BERPASANGAN dengan
 * `MIN_HEMAT_RUPIAH`: persen menyaring beda yang tak berarti pada barang mahal,
 * rupiah menyaring persen besar pada barang receh. Salah satu saja tidak cukup.
 */
export const MIN_HEMAT_PERSEN = 5;
/** Hemat rupiah minimal untuk seluruh baris. */
export const MIN_HEMAT_RUPIAH = 1_000;
/** Paling banyak sekian saran, supaya halamannya tetap bisa dibaca. */
export const MAKS_SARAN = 5;

/** Berapa satuan dasar dalam satu satuan tampil (1 kg = 1000 g). */
const pengaliTampil = (basis: Ukuran["basis"]) => (basis === "pcs" ? 1 : 1000);

export function cariSubstitusi(
  keranjang: BarisMasuk[],
  kandidat: KandidatSubstitusi[]
): Substitusi[] {
  const diKeranjang = new Set(keranjang.map((b) => b.productId));
  // Dihitung sekali di depan: tanpa ini tiap baris keranjang menokenisasi
  // ulang seluruh kandidat.
  const jenisKandidat = new Map(kandidat.map((k) => [k.productId, kataJenis(k.nama)]));
  const out: Substitusi[] = [];

  for (const baris of keranjang) {
    const jenisBaris = kataJenis(baris.nama);
    const hargaSekarang = termurahAdaStok(baris);
    if (hargaSekarang === null) continue;

    const dari = hargaPerSatuan(hargaSekarang, baris.satuan);
    if (!dari) continue; // satuannya tak terbaca — tidak ada dasar membandingkan

    let terbaik: Substitusi | null = null;

    for (const k of kandidat) {
      if (k.productId === baris.productId) continue;
      if (diKeranjang.has(k.productId)) continue; // sudah dibeli, bukan pengganti
      if (k.categorySlug !== baris.categorySlug) continue;

      // Gerbang jenis — lihat rem pertama di kepala berkas.
      const bersama = [...(jenisKandidat.get(k.productId) ?? [])].filter((t) =>
        jenisBaris.has(t)
      );
      if (bersama.length === 0) continue;

      const ke = hargaPerSatuan(k.hargaTermurah, k.satuan);
      if (!ke || ke.basis !== dari.basis) continue; // Rp/kg tidak diadu dgn Rp/L

      const lipat = ke.ukuran.jumlah / dari.ukuran.jumlah;
      if (lipat > BATAS_LIPAT_UKURAN || lipat < 1 / BATAS_LIPAT_UKURAN) continue;

      const hematPersen = ((dari.nilai - ke.nilai) / dari.nilai) * 100;
      if (hematPersen < MIN_HEMAT_PERSEN) continue;

      // Hemat disetarakan pada JUMLAH ISI yang sama, bukan selisih harga label.
      const isiTampil = (dari.ukuran.jumlah * baris.qty) / pengaliTampil(dari.basis);
      const hematRupiah = Math.round((dari.nilai - ke.nilai) * isiTampil);
      if (hematRupiah < MIN_HEMAT_RUPIAH) continue;

      if (terbaik && hematRupiah <= terbaik.hematRupiah) continue;

      terbaik = {
        dari: {
          productId: baris.productId,
          slug: baris.slug,
          nama: baris.nama,
          emoji: baris.emoji,
          satuan: baris.satuan,
        },
        ke: {
          productId: k.productId,
          slug: k.slug,
          nama: k.nama,
          emoji: k.emoji,
          satuan: k.satuan,
          harga: k.hargaTermurah,
          toko: k.tokoTermurah,
          nyata: k.nyata,
        },
        perSatuanDari: dari.nilai,
        perSatuanKe: ke.nilai,
        satuanTampil: dari.satuan,
        hematPersen,
        hematRupiah,
        alasan: susunAlasan(lipat, k.nyata, bersama),
      };
    }

    if (terbaik) out.push(terbaik);
  }

  return out.sort((a, b) => b.hematRupiah - a.hematRupiah).slice(0, MAKS_SARAN);
}

function susunAlasan(lipat: number, nyata: boolean, bersama: string[]): string {
  const sejenis = `Sama-sama ${bersama.slice(0, 2).join(" ")}.`;
  const dasar =
    lipat > 1.2
      ? "Kemasannya lebih besar, jadi lebih murah per satuan isi."
      : lipat < 0.85
      ? "Kemasannya lebih kecil, tapi tetap lebih murah per satuan isi."
      : "Ukurannya setara, tapi lebih murah per satuan isi.";
  const inti = `${sejenis} ${dasar}`;
  return nyata ? inti : `${inti} Harganya masih perkiraan, jadi cek dulu di toko.`;
}

function termurahAdaStok(b: BarisMasuk): number | null {
  const ada = b.harga.filter((h) => h.adaStok);
  return ada.length ? Math.min(...ada.map((h) => h.harga)) : null;
}
