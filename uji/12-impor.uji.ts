/**
 * Uji gerbang mutu impor — murni logika, tanpa jaringan.
 *
 * Seluruh berkas ini adalah **uji regresi**: barcode yang dipakai di sini
 * adalah barcode SUNGGUHAN yang berhasil menyelundupkan buku ke katalog
 * supermarket, ditemukan lewat `npm run db:periksa`.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  PREFIKS_BUKAN_BARANG,
  barcodeBukanBarang,
  namaProdukLayak,
  periksaKandidatProduk,
  satuanDariSumberLuar,
} from "@/lib/impor";

// Tiga barcode yang benar-benar masuk ke katalog sebagai "produk snack".
const ISBN_NYATA = ["9786238902507", "9789835038556", "9789797954789"];

kelompok("barcodeBukanBarang() — REGRESI: buku masuk katalog", () => {
  for (const b of ISBN_NYATA) {
    uji(`${b} dikenali sebagai buku`, () => harus.benar(barcodeBukanBarang(b), b));
  }

  uji("majalah (ISSN, awalan 977) juga ditolak", () =>
    harus.benar(barcodeBukanBarang("9771234567003")));

  uji("barang Indonesia (awalan GS1 899) diterima", () =>
    harus.salah(barcodeBukanBarang("8991002101234")));

  uji("barang luar negeri biasa diterima", () =>
    harus.salah(barcodeBukanBarang("3017620422003")));

  uji("barcode pendek (EAN-8) tidak dinilai dari prefiks ini", () =>
    harus.salah(barcodeBukanBarang("97812345")));

  uji("tanda hubung tidak mengelabui", () =>
    harus.benar(barcodeBukanBarang("978-6238902507")));

  uji("daftar prefiksnya memang berisi", () =>
    harus.minimal(PREFIKS_BUKAN_BARANG.length, 3, "jumlah prefiks"));
});

kelompok("namaProdukLayak() — REGRESI: nama yang tidak menamai apa pun", () => {
  uji('"Produk 9786238902507" ditolak', () =>
    harus.salah(namaProdukLayak("Produk 9786238902507", "9786238902507")));

  uji("nama yang isinya cuma angka ditolak", () =>
    harus.salah(namaProdukLayak("9786238902507", "9786238902507")));

  uji("nama kosong ditolak", () => harus.salah(namaProdukLayak("", "899")));
  uji("nama terlalu pendek ditolak", () => harus.salah(namaProdukLayak("ab", "899")));
  uji("nama sangat panjang ditolak", () =>
    harus.salah(namaProdukLayak("a".repeat(71), "899")));

  uji("nama sungguhan diterima", () =>
    harus.benar(namaProdukLayak("Indomie Goreng", "8991002101234")));

  uji("nama sungguhan yang memuat angka ukuran tetap diterima", () =>
    harus.benar(namaProdukLayak("Aqua 600 ml", "8991002101234")));

  uji("nama tanpa barcode pembanding tetap dinilai", () =>
    harus.benar(namaProdukLayak("Beras Medium")));
});

kelompok("satuanDariSumberLuar() — jangan menambal yang tak diketahui", () => {
  uji("satuan terbaca dipakai apa adanya", () =>
    harus.sama(satuanDariSumberLuar("600 ml"), "600 ml"));

  uji("spasi berlebih dirapikan", () =>
    harus.sama(satuanDariSumberLuar("  5 kg  "), "5 kg"));

  // Keempat nilai ini benar-benar ada di katalog, semuanya dari `quantity` OFF.
  for (const rusak of ["RH. 30", "220", "1", "susu uht"]) {
    uji(`"${rusak}" TIDAK disimpan`, () => harus.sama(satuanDariSumberLuar(rusak), ""));
  }

  uji("TIDAK pernah ditambal jadi \"1 pcs\"", () => {
    // Menambal berarti mengaku tahu isi kemasan padahal tidak, DAN membuat
    // cacatnya lolos panel Mutu data selamanya.
    harus.sama(satuanDariSumberLuar("RH. 30"), "");
    harus.sama(satuanDariSumberLuar(null), "");
  });

  uji("null & undefined aman", () => {
    harus.sama(satuanDariSumberLuar(null), "");
    harus.sama(satuanDariSumberLuar(undefined), "");
  });
});

kelompok("periksaKandidatProduk() — gerbang utuh", () => {
  const layak = {
    barcode: "8991002101234",
    nama: "Indomie Goreng",
    satuan: "85 g",
    hargaSah: true,
  };

  uji("kandidat sehat lolos", () => {
    const r = periksaKandidatProduk(layak);
    harus.benar(r.layak, "layak");
    if (r.layak) harus.sama(r.satuan, "85 g");
  });

  uji("buku ditolak dengan alasan yang jelas", () => {
    const r = periksaKandidatProduk({ ...layak, barcode: ISBN_NYATA[0] });
    harus.salah(r.layak, "layak");
    if (!r.layak) {
      harus.sama(r.alasan, "barcode-bukan-barang");
      harus.benar(r.pesan.toLowerCase().includes("isbn"), "pesan menyebut ISBN");
    }
  });

  uji("produk tanpa nama sungguhan ditolak", () => {
    const r = periksaKandidatProduk({ ...layak, nama: "Produk 8991002101234" });
    harus.salah(r.layak, "layak");
    if (!r.layak) harus.sama(r.alasan, "nama-tak-layak");
  });

  uji("barcode kosong ditolak", () => {
    const r = periksaKandidatProduk({ ...layak, barcode: "" });
    harus.salah(r.layak, "layak");
    if (!r.layak) harus.sama(r.alasan, "barcode-kosong");
  });

  uji("REGRESI: harga tak wajar tidak lagi meninggalkan produk", () => {
    // Inilah urutan yang dulu terbalik — produk dibuat dulu, harga
    // divalidasi belakangan, sampahnya tertinggal.
    const r = periksaKandidatProduk({ ...layak, hargaSah: false });
    harus.salah(r.layak, "layak");
    if (!r.layak) harus.sama(r.alasan, "harga-tak-wajar");
  });

  uji("satuan tak terbaca tidak menggagalkan produknya", () => {
    // Satuan rusak bukan alasan menolak barang yang jelas namanya — cukup
    // dikosongkan, lalu muncul di panel Mutu data.
    const r = periksaKandidatProduk({ ...layak, satuan: "RH. 30" });
    harus.benar(r.layak, "layak");
    if (r.layak) harus.sama(r.satuan, "");
  });

  uji("setiap penolakan selalu punya pesan", () => {
    const r = periksaKandidatProduk({ ...layak, barcode: ISBN_NYATA[1] });
    if (!r.layak) harus.benar(r.pesan.length > 10, "panjang pesan");
  });
});
