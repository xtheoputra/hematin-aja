/**
 * Uji normalisasi & pencocokan — murni logika, tanpa database.
 * Kasus-kasusnya diambil langsung dari FASE-1-CHECKLIST.md §7.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  normalize,
  tokenize,
  cocok,
  adalahUkuran,
  gabunganBersebelahan,
  jarakSunting,
  tokenProduk,
  KATA_KATEGORI,
} from "@/lib/normalize";

const indomieGoreng = {
  name: "Indomie Goreng",
  brand: "Indomie",
  unit: "1 pcs (85 g)",
};
const mieSedaapGoreng = {
  name: "Mie Sedaap Goreng",
  brand: "Mie Sedaap",
  unit: "1 pcs (88 g)",
};
const aqua600 = { name: "Air Mineral Aqua", brand: "Aqua", unit: "600 ml" };
const aquaGalon = { name: "Air Mineral Galon Aqua", brand: "Aqua", unit: "19 L" };
const kecapABC = { name: "Kecap Manis ABC", brand: "ABC", unit: "275 ml" };

const MEREK = new Set(
  ["Indomie", "Mie Sedaap", "Aqua", "ABC", "Ultra Milk", "Bimoli"].flatMap(
    (m) => tokenize(m)
  )
);

kelompok("normalize()", () => {
  uji("huruf besar-kecil tidak berpengaruh", () => {
    harus.sama(normalize("INDOMIE GORENG"), normalize("indomie goreng"));
  });

  uji("urutan kata tidak berpengaruh", () => {
    harus.sama(normalize("mie goreng indomie"), normalize("indomie goreng mie"));
  });

  uji("simbol & spasi berlebih dibuang", () => {
    harus.sama(normalize("indomie   goreng!!"), normalize("indomie goreng"));
  });

  uji("sinonim token utuh: mi → mie", () => {
    harus.sama(normalize("mi goreng"), normalize("mie goreng"));
  });

  uji("merek TIDAK dirusak oleh aturan sinonim", () => {
    // Kalau "mi" dihapus/diganti sebagai substring, "indomie" jadi "indoe".
    harus.memuat(tokenize("indomie goreng"), "indomie", "token indomie");
  });

  uji("satuan volume diseragamkan: 1 L = 1000 ml", () => {
    harus.sama(normalize("aqua 1 L"), normalize("aqua 1000ml"));
  });

  uji("satuan massa diseragamkan: 1 kg = 1000 g", () => {
    harus.sama(normalize("gula 1kg"), normalize("gula 1000 gram"));
  });

  uji("pemisah ribuan gaya Indonesia: 1.500 ml = 1500 ml", () => {
    harus.sama(normalize("air 1.500 ml"), normalize("air 1500ml"));
  });

  uji("pecahan: 1,5 L = 1500 ml", () => {
    harus.sama(normalize("air 1,5 L"), normalize("air 1500ml"));
  });

  uji("token diurutkan sehingga hasilnya stabil", () => {
    harus.sama(normalize("goreng indomie"), "goreng indomie");
  });

  uji("teks kosong / null aman", () => {
    harus.sama(normalize(""), "");
    harus.sama(normalize(null), "");
    harus.sama(normalize(undefined), "");
  });

  uji("frasa 'susu uht' disamakan dengan 'susu'", () => {
    harus.sama(normalize("susu uht coklat"), normalize("susu coklat"));
  });
});

kelompok("token ukuran", () => {
  uji("600 ml dikenali sebagai ukuran", () => {
    harus.benar(adalahUkuran("600ml"));
  });

  uji("satuan hitung BUKAN ukuran", () => {
    harus.salah(adalahUkuran("1pc"), "1pc");
    harus.salah(adalahUkuran("indomie"), "indomie");
  });

  uji("satuan produk ikut jadi token produk", () => {
    harus.memuat(tokenProduk(aqua600), "600ml", "token Aqua 600ml");
  });
});

kelompok("cocok() — kasus wajib §7", () => {
  uji('"indomie goreng" → cocok', () => {
    harus.benar(cocok("indomie goreng", indomieGoreng).cocok);
  });

  uji('"mie goreng indomie" → TETAP cocok (urutan kata berbeda)', () => {
    harus.benar(cocok("mie goreng indomie", indomieGoreng).cocok);
  });

  uji('"indomie mi goreng" → TETAP cocok (sinonim mi/mie)', () => {
    harus.benar(cocok("indomie mi goreng", indomieGoreng).cocok);
  });

  uji('"INDOMIE GORENG" → cocok', () => {
    harus.benar(cocok("INDOMIE GORENG", indomieGoreng).cocok);
  });

  uji('"indomie   goreng!!" → cocok', () => {
    harus.benar(cocok("indomie   goreng!!", indomieGoreng).cocok);
  });

  uji("gerbang merek: indomie ≠ mie sedaap", () => {
    const r = cocok("indomie goreng", mieSedaapGoreng, { merekDikenal: MEREK });
    harus.salah(r.cocok, "indomie goreng vs Mie Sedaap Goreng");
  });

  uji("kata kategori tidak boleh bertindak sebagai merek", () => {
    // "mie" ada di daftar merek karena "Mie Sedaap". Kalau ia diperlakukan
    // sebagai pembeda merek, "mie goreng indomie" gugur — padahal itu justru
    // kasus utama yang harus lulus.
    harus.benar(MEREK.has("mie"), "'mie' memang token merek yang dikenal");
    harus.benar(
      cocok("mie goreng indomie", indomieGoreng, { merekDikenal: MEREK }).cocok,
      "mie goreng indomie"
    );
    harus.benar(
      cocok("indomie mi goreng", indomieGoreng, { merekDikenal: MEREK }).cocok,
      "indomie mi goreng"
    );
  });

  uji("gerbang merek tetap jalan tanpa daftar merek", () => {
    // Keterkandungan token saja sudah menggugurkan: "indomie" tidak ada di sana.
    harus.salah(cocok("indomie goreng", mieSedaapGoreng).cocok);
  });

  uji("gerbang ukuran: aqua 600ml ≠ aqua 19L", () => {
    const r = cocok("aqua 600ml", aquaGalon, { merekDikenal: MEREK });
    harus.salah(r.cocok, "aqua 600ml vs Aqua Galon 19L");
    harus.sama(r.alasan, "ukuran berbeda");
  });

  uji("gerbang ukuran: aqua 600ml cocok dengan produk 600 ml", () => {
    harus.benar(cocok("aqua 600ml", aqua600, { merekDikenal: MEREK }).cocok);
  });

  uji("tanpa ukuran di kueri, semua ukuran boleh muncul", () => {
    harus.benar(cocok("aqua", aqua600).cocok);
    harus.benar(cocok("aqua", aquaGalon).cocok);
  });

  uji("kata terpotong tetap ketemu tanpa toleransi typo", () => {
    // "indomi" adalah awalan "indomie" — ini keterkandungan, bukan salah ketik.
    harus.benar(cocok("indomi goreng", indomieGoreng).cocok);
  });

  uji("salah ketik sungguhan hanya cocok saat toleransi dinyalakan", () => {
    // "indomia" bukan awalan/bagian "indomie"; bedanya satu huruf.
    harus.salah(cocok("indomia goreng", indomieGoreng).cocok, "tanpa toleransi");
    harus.benar(
      cocok("indomia goreng", indomieGoreng, { toleransiTypo: true }).cocok,
      "dengan toleransi"
    );
  });

  uji("merek yang sama tapi produk beda tidak saling menjaring", () => {
    // "sedaap goreng" tidak boleh menjaring "Kecap Sedaap"-nya siapa pun.
    harus.salah(cocok("sedaap goreng", kecapABC).cocok);
  });
});

kelompok("cocok() — kata kategori opsional", () => {
  uji("kata kategori boleh berlebih di kueri", () => {
    // "mie" tidak ada di token produk Indomie, tapi tidak menggugurkan.
    harus.benar(KATA_KATEGORI.has("mie"));
    harus.benar(cocok("mie indomie goreng", indomieGoreng).cocok);
  });

  uji("kueri yang isinya kata kategori saja tetap harus menyentuh produk", () => {
    harus.benar(cocok("mie", mieSedaapGoreng).cocok, "mie → Mie Sedaap");
    harus.salah(cocok("teh", kecapABC).cocok, "teh → Kecap ABC");
  });

  uji('"mie" tetap menemukan "indomie" (kata majemuk)', () => {
    // Perilaku versi lama (`contains`) tidak boleh jadi lebih buruk.
    harus.benar(cocok("mie", indomieGoreng).cocok);
  });
});

kelompok("merek dengan/tanpa spasi", () => {
  const mamypoko = { name: "Popok Mamy Poko Pants M", unit: "1 pak" };

  uji("gabungan token bersebelahan dibentuk", () => {
    harus.memuat(gabunganBersebelahan(["mamy", "poko"]), "mamypoko");
  });

  uji("angka tidak ikut digabung", () => {
    // "1 pcs" tidak boleh jadi "1pcs" yang menyaru token ukuran.
    harus.sama(gabunganBersebelahan(["1", "pc"]).length, 0);
  });

  uji('"mamypoko" menemukan produk bernama "Mamy Poko"', () => {
    harus.benar(cocok("mamypoko", mamypoko).cocok);
  });

  uji('"mamy poko" juga tetap ketemu', () => {
    harus.benar(cocok("mamy poko", mamypoko).cocok);
  });

  uji("gabungan tidak membuat produk asing ikut terjaring", () => {
    harus.salah(cocok("mamypoko", indomieGoreng).cocok);
  });
});

kelompok("cocok() — skor untuk pengurutan", () => {
  uji("nama identik mendapat skor tertinggi", () => {
    harus.sama(cocok("indomie goreng", indomieGoreng).skor, 1);
  });

  uji("kecocokan sebagian berskor di bawah 1", () => {
    harus.maksimal(cocok("goreng", indomieGoreng).skor, 0.99, "skor 'goreng'");
  });

  uji("yang tidak cocok berskor 0", () => {
    harus.sama(cocok("aqua", indomieGoreng).skor, 0);
  });

  uji("nama persis menang atas kecocokan longgar", () => {
    const persis = cocok("indomie goreng", indomieGoreng).skor;
    const longgar = cocok("indomie goreng", indomieGoreng).skor;
    harus.minimal(persis, longgar);
    harus.minimal(persis, cocok("goreng", indomieGoreng).skor);
  });
});

kelompok("jarakSunting()", () => {
  uji("kata sama = 0", () => harus.sama(jarakSunting("indomie", "indomie"), 0));
  uji("beda satu huruf = 1", () => harus.sama(jarakSunting("indomi", "indomie"), 1));
  uji("beda jauh dipangkas di ambang", () =>
    harus.minimal(jarakSunting("aqua", "indomie", 1), 2));
});

kelompok("cocok() — masukan aneh tidak bikin crash", () => {
  uji("kueri kosong", () => harus.salah(cocok("", indomieGoreng).cocok));
  uji("kueri spasi saja", () => harus.salah(cocok("   ", indomieGoreng).cocok));
  uji("kueri simbol saja", () => harus.salah(cocok("!!!???", indomieGoreng).cocok));
  uji("kueri sangat panjang", () => {
    const panjang = "indomie ".repeat(500);
    harus.benar(cocok(panjang, indomieGoreng).cocok);
  });
  uji("produk tanpa merek & satuan", () => {
    const r = cocok("telur ayam", { name: "Telur Ayam Negeri" });
    harus.benar(r.cocok);
  });
});
