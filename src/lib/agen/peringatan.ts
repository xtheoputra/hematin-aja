/**
 * Peringatan mutu data — logika MURNI, tanpa database.
 *
 * Agen yang hanya menyodorkan angka tanpa pernah bilang "angka ini
 * meragukan" akan terdengar meyakinkan justru ketika datanya paling buruk.
 * Berkas ini tugasnya membuat keraguan itu terlihat.
 *
 * Semua ambangnya sengaja longgar: yang dicari adalah yang jelas-jelas
 * bermasalah, bukan menakut-nakuti pada tiap selisih kecil.
 */
import { daysSince, formatRupiah } from "@/lib/format";
import { AGING_MAX_DAYS } from "@/lib/freshness";
import { uraiUkuran } from "@/lib/satuan";
import type { HargaDibuang } from "./rencana";
import type { BarisMasuk, Peringatan } from "./tipe";

/**
 * Batas sebaran harga antar-toko yang dianggap mustahil. Selisih 3× untuk
 * barang yang sama di dua supermarket hampir selalu berarti salah data —
 * salah baca satuan, atau produk yang tertukar — bukan persaingan harga.
 */
export const BATAS_SEBARAN = 3;

export function susunPeringatan(
  keranjang: BarisMasuk[],
  sekarang: Date,
  /** Harga yang sudah dibuang penyaring mutu — lihat `saringHargaMustahil()`. */
  dibuang: HargaDibuang[] = []
): Peringatan[] {
  const out: Peringatan[] = [];
  if (keranjang.length === 0 && dibuang.length === 0) return out;

  // 0. Harga yang dibuang karena mustahil. Paling atas: angkanya sudah tidak
  //    ikut dihitung, dan pengguna berhak tahu itu terjadi.
  if (dibuang.length > 0) {
    const contoh = dibuang[0];
    out.push({
      jenis: "harga-mustahil",
      tingkat: "serius",
      pesan:
        dibuang.length === 1
          ? `Harga ${formatRupiah(contoh.harga)} untuk ${contoh.nama} di ${contoh.toko} tidak masuk akal, jadi tidak ikut dihitung.`
          : `${dibuang.length} harga tidak masuk akal (mis. ${formatRupiah(contoh.harga)} untuk ${contoh.nama} di ${contoh.toko}) dan tidak ikut dihitung.`,
      produk: [...new Map(dibuang.map((d) => [d.slug, { slug: d.slug, nama: d.nama }]))
        .values()],
    });
  }

  if (keranjang.length === 0) return out;

  // 1. Satuan tak terbaca → perbandingan per satuan tidak bisa dilakukan.
  const satuanRusak = keranjang.filter((b) => !uraiUkuran(b.satuan));
  if (satuanRusak.length > 0) {
    out.push({
      jenis: "satuan-tak-terbaca",
      tingkat: "waspada",
      pesan:
        satuanRusak.length === 1
          ? `Satuan "${satuanRusak[0].satuan}" pada ${satuanRusak[0].nama} tidak terbaca, jadi harga per kg/L-nya tidak bisa dihitung.`
          : `${satuanRusak.length} barang punya satuan yang tidak terbaca, jadi harga per kg/L-nya tidak bisa dihitung.`,
      produk: satuanRusak.map((b) => ({ slug: b.slug, nama: b.nama })),
    });
  }

  // 2. Barang yang tidak punya harga di toko mana pun.
  const nihil = keranjang.filter((b) => !b.harga.some((h) => h.adaStok));
  if (nihil.length > 0) {
    out.push({
      jenis: "barang-nihil",
      tingkat: "serius",
      pesan: `${nihil.length} barang tidak punya harga di toko mana pun, jadi tidak ikut dihitung dalam total.`,
      produk: nihil.map((b) => ({ slug: b.slug, nama: b.nama })),
    });
  }

  // 3. Tidak ada satu pun harga nyata → seluruh rencana berdiri di atas perkiraan.
  const adaNyata = keranjang.some((b) => b.harga.some((h) => h.adaStok && h.nyata));
  if (!adaNyata && keranjang.some((b) => b.harga.some((h) => h.adaStok))) {
    out.push({
      jenis: "semua-perkiraan",
      tingkat: "serius",
      pesan:
        "Tidak ada satu pun harga nyata di keranjang ini — seluruh rencana disusun dari harga perkiraan. Pakai sebagai gambaran kasar, bukan patokan belanja.",
    });
  }

  // 4. Harga yang sudah terlalu tua untuk dipercaya.
  const basi = keranjang.filter((b) => {
    const dipakai = b.harga.filter((h) => h.adaStok && h.dicatatPada);
    if (dipakai.length === 0) return false;
    return dipakai.every((h) => daysSince(h.dicatatPada!, sekarang) > AGING_MAX_DAYS);
  });
  if (basi.length > 0) {
    out.push({
      jenis: "harga-basi",
      tingkat: "waspada",
      pesan: `${basi.length} barang harganya sudah lebih dari ${AGING_MAX_DAYS} hari tidak dicek ulang.`,
      produk: basi.map((b) => ({ slug: b.slug, nama: b.nama })),
    });
  }

  // 5. Sebaran harga yang mustahil — tanda data salah, bukan tanda toko murah.
  const ekstrem = keranjang.filter((b) => {
    const harga = b.harga.filter((h) => h.adaStok).map((h) => h.harga);
    if (harga.length < 2) return false;
    const min = Math.min(...harga);
    const maks = Math.max(...harga);
    return min > 0 && maks / min > BATAS_SEBARAN;
  });
  if (ekstrem.length > 0) {
    out.push({
      jenis: "sebaran-harga-ekstrem",
      tingkat: "waspada",
      pesan: `${ekstrem.length} barang punya selisih harga antar-toko lebih dari ${BATAS_SEBARAN}× — biasanya itu tanda data salah, bukan tanda ada toko yang sangat murah.`,
      produk: ekstrem.map((b) => ({ slug: b.slug, nama: b.nama })),
    });
  }

  const urutan = { serius: 0, waspada: 1, info: 2 } as const;
  return out.sort((a, b) => urutan[a.tingkat] - urutan[b.tingkat]);
}
