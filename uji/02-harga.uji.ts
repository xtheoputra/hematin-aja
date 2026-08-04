/**
 * Uji kendali mutu harga (FASE-1.5 §1.1–1.2) — murni logika, tanpa database.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  BATAS_ATAS_MEDIAN,
  BATAS_BAWAH_MEDIAN,
  RENTANG_KATEGORI,
  akhirHari,
  awalHari,
  hariSama,
  median,
  periksaHarga,
} from "@/lib/harga";

kelompok("median()", () => {
  uji("jumlah ganjil", () => harus.sama(median([1, 3, 2]), 2));
  uji("jumlah genap dibulatkan", () => harus.sama(median([10, 20]), 15));
  uji("daftar kosong = null", () => harus.sama(median([]), null));
  uji("nilai bukan angka diabaikan", () =>
    harus.sama(median([3000, NaN, 3200, Infinity]), 3100));
});

kelompok("periksaHarga() — aturan dasar", () => {
  uji("harga 0 ditolak", () => harus.salah(periksaHarga(0).sah));
  uji("harga negatif ditolak", () => harus.salah(periksaHarga(-500).sah));
  uji("harga pecahan ditolak (Rupiah tanpa desimal)", () =>
    harus.salah(periksaHarga(3300.5).sah));
  uji("bukan angka ditolak", () => harus.salah(periksaHarga(Number.NaN).sah));
  uji("alasan penolakan selalu terisi", () => {
    const r = periksaHarga(0);
    harus.benar(r.alasan, "alasan");
  });
});

kelompok("periksaHarga() — terhadap median riwayat", () => {
  const med = 3300; // harga Indomie

  uji("harga wajar diterima", () =>
    harus.benar(periksaHarga(3500, { median: med }).sah));

  uji("Indomie Rp 100.000 ditolak — inilah kasus yang jadi alasan berkas ini ada", () => {
    const r = periksaHarga(100_000, { median: med });
    harus.salah(r.sah, "harga 100rb");
  });

  uji("tepat di batas atas masih diterima", () =>
    harus.benar(periksaHarga(med * BATAS_ATAS_MEDIAN, { median: med }).sah));

  uji("sedikit di atas batas atas ditolak", () =>
    harus.salah(periksaHarga(med * BATAS_ATAS_MEDIAN + 1, { median: med }).sah));

  uji("tepat di batas bawah masih diterima", () =>
    harus.benar(periksaHarga(med * BATAS_BAWAH_MEDIAN, { median: med }).sah));

  uji("harga jatuh tak masuk akal ditolak", () =>
    harus.salah(periksaHarga(100, { median: med }).sah));

  uji("median menang atas rentang kategori", () => {
    // 15.000 masuk rentang kategori makanan-instan, tapi 4,5× median.
    const r = periksaHarga(15_000, { median: med, kategori: "makanan-instan" });
    harus.salah(r.sah, "15rb untuk produk bermedian 3300");
  });
});

kelompok("periksaHarga() — jaring pengaman kategori", () => {
  uji("dipakai saat belum ada riwayat", () => {
    const [min, maks] = RENTANG_KATEGORI["makanan-instan"];
    harus.benar(periksaHarga(min, { kategori: "makanan-instan" }).sah);
    harus.benar(periksaHarga(maks, { kategori: "makanan-instan" }).sah);
    harus.salah(periksaHarga(min - 1, { kategori: "makanan-instan" }).sah);
    harus.salah(periksaHarga(maks + 1, { kategori: "makanan-instan" }).sah);
  });

  uji("kategori tak dikenal jatuh ke rentang bawaan", () => {
    harus.benar(periksaHarga(50_000, { kategori: "entah-apa" }).sah);
    harus.salah(periksaHarga(9_000_000, { kategori: "entah-apa" }).sah);
  });

  uji("median null diperlakukan sebagai belum ada riwayat", () => {
    harus.benar(periksaHarga(3300, { median: null, kategori: "makanan-instan" }).sah);
  });
});

kelompok("batas hari", () => {
  const siang = new Date("2026-08-04T13:30:00");

  uji("awalHari & akhirHari mengurung tanggal yang sama", () => {
    harus.sama(awalHari(siang).getDate(), 4);
    harus.sama(awalHari(siang).getHours(), 0);
    harus.sama(akhirHari(siang).getHours(), 23);
  });

  uji("hariSama membedakan tanggal", () => {
    harus.benar(hariSama(siang, new Date("2026-08-04T01:00:00")));
    harus.salah(hariSama(siang, new Date("2026-08-05T01:00:00")));
  });
});
