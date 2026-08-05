/**
 * Agen belanja — pintu masuk tunggal.
 *
 * Menerima keranjang beserta seluruh harga yang diketahui, mengembalikan
 * **rencana yang bisa ditindaklanjuti**: ke toko mana, kenapa, berapa hematnya,
 * seberapa layak angkanya dipercaya, dan apa yang sebaiknya diganti.
 *
 * Seluruh isinya murni — tanpa database, tanpa jaringan, tanpa model bahasa.
 * Konsekuensinya sengaja: rencana ini bisa diuji sampai ke rupiahnya, dan
 * tidak akan pernah mengarang toko atau harga yang tidak ada di data.
 */
import {
  bakuOpsi,
  cariPecahTerbaik,
  hitungKeyakinan,
  nilaiTiapToko,
  pecahSepadan,
  saringHargaMustahil,
  susunKeputusan,
} from "./rencana";
import { susunPeringatan } from "./peringatan";
import { cariSubstitusi } from "./substitusi";
import type {
  BarisMasuk,
  KandidatSubstitusi,
  OpsiAgen,
  Rencana,
} from "./tipe";

export * from "./tipe";
export {
  AMBANG_PECAH_PERSEN,
  BIAYA_PERJALANAN_BAWAAN,
  cariPecahTerbaik,
  hitungKeyakinan,
  nilaiTiapToko,
  pecahSepadan,
  saringHargaMustahil,
  susunKeputusan,
  type HargaDibuang,
} from "./rencana";
export { BATAS_SEBARAN, susunPeringatan } from "./peringatan";
export {
  BATAS_LIPAT_UKURAN,
  MAKS_SARAN,
  MIN_HEMAT_PERSEN,
  MIN_HEMAT_RUPIAH,
  cariSubstitusi,
} from "./substitusi";

/** Rencana kosong — dipakai saat keranjang kosong, supaya UI tak perlu null-check. */
export function rencanaKosong(biayaPerjalanan: number): Rencana {
  return {
    keputusan: {
      jenis: "tak-bisa-memutuskan",
      judul: "Keranjang masih kosong",
      alasan: ["Tambahkan barang dulu, baru saya bisa menyusun rencana belanja."],
      hemat: 0,
      toko: [],
    },
    tokoTunggal: [],
    pecah: null,
    keyakinan: {
      nilai: 0,
      tingkat: "rendah",
      porsiNyata: 0,
      umurRerataHari: null,
      alasan: [],
    },
    peringatan: [],
    substitusi: [],
    jumlahBaris: 0,
    biayaPerjalanan,
  };
}

export function susunRencana(
  keranjangMentah: BarisMasuk[],
  toko: { supermarketId: string; slug: string; nama: string; warna: string }[],
  kandidat: KandidatSubstitusi[] = [],
  opsi: OpsiAgen = {}
): Rencana {
  const { biayaPerjalanan, sekarang } = bakuOpsi(opsi);
  if (keranjangMentah.length === 0) return rencanaKosong(biayaPerjalanan);

  // Langkah pertama, sebelum apa pun dihitung: buang harga yang mustahil.
  // Kalau tidak, satu harga sampah bisa memenangkan sebuah toko.
  const { bersih: keranjang, dibuang } = saringHargaMustahil(keranjangMentah);

  const tokoTunggal = nilaiTiapToko(keranjang, toko, biayaPerjalanan);
  const terbaik = tokoTunggal[0] ?? null;

  const pecah = terbaik
    ? cariPecahTerbaik(keranjang, toko, terbaik.totalSetara, biayaPerjalanan)
    : null;
  const pakaiPecah = pecahSepadan(pecah, terbaik?.totalSetara ?? 0);

  // Keyakinan dihitung dari baris rencana yang BENAR-BENAR disarankan —
  // kalau agen menyuruh pecah, yang dinilai adalah rencana pecah itu.
  const barisTerpakai = pakaiPecah && pecah ? pecah.baris : terbaik?.baris ?? [];

  return {
    keputusan: susunKeputusan(tokoTunggal, pecah, pakaiPecah, biayaPerjalanan),
    tokoTunggal,
    pecah,
    keyakinan: hitungKeyakinan(barisTerpakai, keranjang, sekarang),
    peringatan: susunPeringatan(keranjang, sekarang, dibuang),
    substitusi: cariSubstitusi(keranjang, kandidat),
    jumlahBaris: keranjang.length,
    biayaPerjalanan,
  };
}
