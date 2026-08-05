/**
 * Uji harga per satuan — murni logika, tanpa database.
 *
 * Bahan ujinya diambil dari satuan yang BENAR-BENAR ada di katalog
 * (`select distinct unit`), termasuk yang berantakan. Uji yang hanya memakai
 * contoh rapi buatan sendiri akan lulus sambil membiarkan parser gagal pada
 * data sungguhan.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  hargaPerSatuan,
  labelUkuran,
  sebanding,
  uraiUkuran,
  type Ukuran,
} from "@/lib/satuan";

const ukur = (t: string): Ukuran => {
  const u = uraiUkuran(t);
  if (!u) throw new Error(`"${t}" seharusnya terbaca, tapi menghasilkan null`);
  return u;
};

kelompok("uraiUkuran() — bentuk lazim", () => {
  uji("massa dibawa ke gram", () => harus.sama(ukur("5 kg").jumlah, 5000));
  uji("volume dibawa ke mililiter", () => harus.sama(ukur("1 L").jumlah, 1000));
  uji("tanpa spasi tetap terbaca", () => harus.sama(ukur("500ml").jumlah, 500));
  uji("huruf kecil satuan liter", () => harus.sama(ukur("1l").jumlah, 1000));
  uji("gr = gram", () => harus.sama(ukur("84gr").jumlah, 84));
  uji("galon 19 L", () => harus.sama(ukur("19 L").jumlah, 19000));
  uji("pecahan dengan titik", () => harus.sama(ukur("1.5 L").jumlah, 1500));
  uji("pecahan dengan koma", () => harus.sama(ukur("2,5 kg").jumlah, 2500));
  uji("tiga digit di belakang titik = ribuan", () =>
    harus.sama(ukur("1.500 g").jumlah, 1500));
  uji("basis massa benar", () => harus.sama(ukur("100 g").basis, "g"));
  uji("basis volume benar", () => harus.sama(ukur("350 ml").basis, "ml"));
});

kelompok("uraiUkuran() — satuan hitung", () => {
  uji("pcs terbaca sebagai butir", () => {
    const u = ukur("1 pcs");
    harus.sama(u.jumlah, 1);
    harus.sama(u.basis, "pcs");
  });
  uji("10 sachet = 10 butir", () => harus.sama(ukur("10 sachet").jumlah, 10));
  uji("250 sheet = 250 butir", () => harus.sama(ukur("250 sheet").jumlah, 250));
  uji('"isi 30" tanpa satuan tetap terbaca', () => {
    const u = ukur("isi 30");
    harus.sama(u.jumlah, 30);
    harus.sama(u.basis, "pcs");
  });
});

kelompok("uraiUkuran() — isi bersih menang atas kemasan", () => {
  uji('"1 pcs (85 g)" bernilai 85 g, bukan 1 pcs', () => {
    const u = ukur("1 pcs (85 g)");
    harus.sama(u.jumlah, 85);
    harus.sama(u.basis, "g");
  });
  uji('"1 cup (75 g)" bernilai 75 g', () => harus.sama(ukur("1 cup (75 g)").jumlah, 75));
  uji("kemasan majemuk dikalikan isinya", () => {
    const u = ukur("24 x 6.5g");
    harus.sama(u.jumlah, 156);
    harus.benar(u.majemuk, "penanda majemuk");
  });
  uji("majemuk dengan tanda kali unicode", () =>
    harus.sama(ukur("12 × 250 ml").jumlah, 3000));
  uji("bukan majemuk tidak ditandai majemuk", () =>
    harus.salah(ukur("500 ml").majemuk, "penanda majemuk"));
});

kelompok("uraiUkuran() — menyerah, bukan menebak", () => {
  const menyerah = (t: string) => harus.sama(uraiUkuran(t), null, `"${t}"`);

  uji("angka telanjang tanpa satuan", () => menyerah("220"));
  uji('satuan "1" saja', () => menyerah("1"));
  uji("teks sampah dari katalog", () => menyerah("RH. 30"));
  uji("nama produk nyasar ke kolom satuan", () => menyerah("susu uht"));
  uji("kosong", () => menyerah(""));
  uji("null aman", () => harus.sama(uraiUkuran(null), null));
  uji("undefined aman", () => harus.sama(uraiUkuran(undefined), null));
  uji("renceng TIDAK ditebak jumlahnya", () => menyerah("1 renceng"));
  uji("nol tidak pernah jadi ukuran sah", () => menyerah("0 g"));
});

kelompok("uraiUkuran() — data kotor tetap dibaca sebisanya", () => {
  uji('"123g g" terbaca 123 g', () => harus.sama(ukur("123g g").jumlah, 123));
});

kelompok("hargaPerSatuan()", () => {
  uji("beras 5 kg Rp 62.000 = Rp 12.400/kg", () => {
    const h = hargaPerSatuan(62_000, "5 kg");
    harus.sama(h?.nilai, 12_400);
    harus.sama(h?.satuan, "kg");
  });

  uji("KEMASAN BESAR MENANG — inilah alasan berkas ini ada", () => {
    const besar = hargaPerSatuan(62_000, "5 kg");
    const kecil = hargaPerSatuan(13_500, "1 kg");
    harus.benar(besar && kecil, "kedua harga terbaca");
    // Harga mutlak menyesatkan: 62.000 > 13.500. Per satuan, yang besar menang.
    harus.benar(besar!.nilai < kecil!.nilai, "beras 5 kg lebih murah per kg");
  });

  uji("volume dinyatakan per liter", () => {
    const h = hargaPerSatuan(4_000, "600 ml");
    harus.sama(h?.satuan, "L");
    harus.sama(h?.nilai, 6_667);
  });

  uji("satuan hitung dinyatakan per pcs", () => {
    const h = hargaPerSatuan(30_000, "10 sachet");
    harus.sama(h?.nilai, 3_000);
    harus.sama(h?.satuan, "pcs");
  });

  uji("satuan tak terbaca → null, bukan angka karangan", () =>
    harus.sama(hargaPerSatuan(5_000, "RH. 30"), null));
  uji("harga nol → null", () => harus.sama(hargaPerSatuan(0, "1 kg"), null));
  uji("harga negatif → null", () => harus.sama(hargaPerSatuan(-100, "1 kg"), null));
  uji("harga null aman", () => harus.sama(hargaPerSatuan(null, "1 kg"), null));
  uji("bukan angka aman", () => harus.sama(hargaPerSatuan(Number.NaN, "1 kg"), null));
});

kelompok("sebanding() — gerbang basis", () => {
  uji("kg vs kg boleh diadu", () =>
    harus.benar(sebanding(uraiUkuran("1 kg"), uraiUkuran("250 g"))));
  uji("kg vs liter TIDAK boleh diadu", () =>
    harus.salah(sebanding(uraiUkuran("1 kg"), uraiUkuran("1 L"))));
  uji("pcs vs gram TIDAK boleh diadu", () =>
    harus.salah(sebanding(uraiUkuran("10 sachet"), uraiUkuran("100 g"))));
  uji("null tidak pernah sebanding", () =>
    harus.salah(sebanding(uraiUkuran("RH. 30"), uraiUkuran("1 kg"))));
});

kelompok("labelUkuran()", () => {
  uji("ribuan gram jadi kg", () => harus.sama(labelUkuran(ukur("5 kg")), "5 kg"));
  uji("ratusan gram tetap gram", () => harus.sama(labelUkuran(ukur("250 g")), "250 g"));
  uji("ribuan mililiter jadi liter", () => harus.sama(labelUkuran(ukur("1.5 L")), "1,5 L"));
  uji("butir ditulis pcs", () => harus.sama(labelUkuran(ukur("10 sachet")), "10 pcs"));
});
