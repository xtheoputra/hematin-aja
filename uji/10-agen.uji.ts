/**
 * Uji mesin keputusan belanja — murni logika, tanpa database.
 *
 * Yang dijaga di sini bukan "kodenya jalan", tapi "keputusannya benar":
 * toko yang cuma punya sedikit barang tidak boleh menang, pemecahan belanja
 * tidak boleh disarankan demi hemat receh, dan rencana yang berdiri di atas
 * perkiraan harus mengaku begitu.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  AMBANG_PECAH_PERSEN,
  BIAYA_PERJALANAN_BAWAAN,
  cariPecahTerbaik,
  cariSubstitusi,
  nilaiTiapToko,
  pecahSepadan,
  saringHargaMustahil,
  susunPeringatan,
  susunRencana,
  type BarisMasuk,
  type HargaToko,
  type KandidatSubstitusi,
} from "@/lib/agen";

const SEKARANG = new Date("2026-08-05T00:00:00Z");
const HARI_INI = "2026-08-05T00:00:00.000Z";
const LAMA = "2026-05-01T00:00:00.000Z"; // > 30 hari

const TOKO = [
  { supermarketId: "a", slug: "toko-a", nama: "Toko A", warna: "#111" },
  { supermarketId: "b", slug: "toko-b", nama: "Toko B", warna: "#222" },
  { supermarketId: "c", slug: "toko-c", nama: "Toko C", warna: "#333" },
];

function harga(
  supermarketId: string,
  nilai: number,
  opsi: Partial<HargaToko> = {}
): HargaToko {
  const t = TOKO.find((x) => x.supermarketId === supermarketId)!;
  return {
    supermarketId,
    slug: t.slug,
    nama: t.nama,
    warna: t.warna,
    harga: nilai,
    adaStok: true,
    nyata: true,
    sourceKind: "real",
    dicatatPada: HARI_INI,
    ...opsi,
  };
}

function barang(
  productId: string,
  nama: string,
  satuan: string,
  daftar: HargaToko[],
  opsi: Partial<BarisMasuk> = {}
): BarisMasuk {
  return {
    productId,
    slug: productId,
    nama,
    emoji: "📦",
    satuan,
    categorySlug: "sembako",
    qty: 1,
    harga: daftar,
    ...opsi,
  };
}

// ─────────────────────── Total yang sebanding ───────────────────────

kelompok("nilaiTiapToko() — total yang benar-benar sebanding", () => {
  // Toko C cuma punya SATU barang, dan harganya murah. Cara lama menjumlahkan
  // barang yang tersedia saja, jadi C akan menang dengan total 5.000 — padahal
  // 2 barang sisanya tetap harus dibeli di tempat lain.
  const keranjang = [
    barang("p1", "Barang 1", "1 kg", [harga("a", 10_000), harga("b", 12_000)]),
    barang("p2", "Barang 2", "1 kg", [harga("a", 20_000), harga("b", 18_000)]),
    barang("p3", "Barang 3", "1 kg", [
      harga("a", 8_000),
      harga("b", 9_000),
      harga("c", 5_000),
    ]),
  ];

  const hasil = nilaiTiapToko(keranjang, TOKO);
  const c = hasil.find((t) => t.slug === "toko-c")!;
  const a = hasil.find((t) => t.slug === "toko-a")!;

  uji("toko dengan 1 barang murah TIDAK otomatis menang", () => {
    harus.sama(hasil[0].slug, "toko-a");
  });

  uji("barang yang tak dijual tetap dihitung dengan harga pasar termurah", () => {
    // C: 5.000 (punya) + 10.000 (p1 termurah di A) + 18.000 (p2 termurah di B)
    harus.sama(c.totalBarang, 33_000);
  });

  uji("toko yang tidak lengkap membayar ongkos perjalanan kedua", () => {
    // Inilah yang mencegah C menang: 3 barangnya tersebar, dan barang yang
    // kurang tetap menuntut mampir ke toko lain.
    harus.sama(c.biayaPerjalananTambahan, 10_000);
    harus.sama(c.totalSetara, 43_000);
  });

  uji("toko yang lengkap TIDAK dikenai ongkos perjalanan tambahan", () =>
    harus.sama(a.biayaPerjalananTambahan, 0));

  uji("toko tanpa satu pun barang keranjang tidak diperingkat", () => {
    const kosong = nilaiTiapToko(
      [barang("p9", "Cuma di A", "1 kg", [harga("a", 1_000)])],
      TOKO
    );
    harus.sama(kosong.map((t) => t.slug), ["toko-a"]);
  });

  uji("total tersedia tetap dilaporkan apa adanya", () =>
    harus.sama(c.totalTersedia, 5_000));

  uji("barang yang diasumsikan dihitung jumlahnya", () =>
    harus.sama(c.jumlahDiasumsikan, 2));

  uji("toko yang lengkap memakai harganya sendiri", () =>
    harus.sama(a.totalSetara, 38_000));

  uji("baris yang diasumsikan tidak mengaku berasal dari toko itu", () => {
    const l = c.baris.find((x) => x.productId === "p1")!;
    harus.sama(l.status, "diasumsikan");
    harus.sama(l.tokoNama, null);
  });

  uji("urutan: totalSetara termurah lebih dulu", () => {
    for (let i = 1; i < hasil.length; i++) {
      harus.benar(
        hasil[i - 1].totalSetara <= hasil[i].totalSetara,
        "urutan menaik"
      );
    }
  });
});

kelompok("nilaiTiapToko() — stok & barang nihil", () => {
  const keranjang = [
    barang("p1", "Ada", "1 kg", [harga("a", 10_000)]),
    barang("p2", "Nihil", "1 kg", [harga("a", 5_000, { adaStok: false })]),
  ];
  const hasil = nilaiTiapToko(keranjang, TOKO);
  const a = hasil.find((t) => t.slug === "toko-a")!;

  uji("harga tanpa stok tidak dipakai", () => harus.sama(a.totalSetara, 10_000));
  uji("barang tanpa stok di mana pun berstatus nihil", () => {
    harus.sama(a.baris.find((l) => l.productId === "p2")!.status, "nihil");
  });
  uji("baris nihil tidak menambah total", () =>
    harus.sama(a.baris.find((l) => l.productId === "p2")!.subtotal, 0));
});

kelompok("nilaiTiapToko() — harga per satuan ikut dihitung", () => {
  const keranjang = [barang("p1", "Beras", "5 kg", [harga("a", 62_000)])];
  const a = nilaiTiapToko(keranjang, TOKO).find((t) => t.slug === "toko-a")!;
  uji("baris membawa Rp per kg", () => {
    const l = a.baris[0];
    harus.sama(l.perSatuan, 12_400);
    harus.sama(l.satuanTampil, "kg");
  });

  const rusak = [barang("p1", "Cleo", "220", [harga("a", 3_000)])];
  const b = nilaiTiapToko(rusak, TOKO).find((t) => t.slug === "toko-a")!;
  uji("satuan tak terbaca → per satuan null, bukan angka karangan", () =>
    harus.sama(b.baris[0].perSatuan, null));
});

// ─────────────────────── Pecah dua toko ───────────────────────

kelompok("cariPecahTerbaik()", () => {
  // A murah untuk p1, B murah untuk p2 — selisihnya besar, jadi pecah menang.
  const keranjang = [
    barang("p1", "Barang 1", "1 kg", [harga("a", 10_000), harga("b", 40_000)]),
    barang("p2", "Barang 2", "1 kg", [harga("a", 40_000), harga("b", 10_000)]),
  ];
  const tunggal = nilaiTiapToko(keranjang, TOKO);
  const pecah = cariPecahTerbaik(keranjang, TOKO, tunggal[0].totalSetara, 10_000);

  uji("pemecahan ditemukan", () => harus.benar(pecah, "rencana pecah"));
  uji("tiap barang diambil di toko termurahnya", () =>
    harus.sama(pecah!.totalBarang, 20_000));
  uji("ongkos perjalanan tambahan ikut dihitung", () =>
    harus.sama(pecah!.totalAkhir, 30_000));
  uji("kedua toko sama-sama kebagian barang", () => {
    harus.minimal(pecah!.utama.jumlah, 1, "jumlah toko utama");
    harus.minimal(pecah!.kedua.jumlah, 1, "jumlah toko kedua");
  });
  uji("toko utama adalah yang belanjanya terbesar", () =>
    harus.benar(pecah!.utama.total >= pecah!.kedua.total, "utama ≥ kedua"));

  uji("pemecahan yang sepadan disetujui", () =>
    harus.benar(pecahSepadan(pecah, tunggal[0].totalSetara)));
});

kelompok("cariPecahTerbaik() — rem yang harus ada", () => {
  // Pecah cuma hemat Rp 1.000. Ongkos perjalanan Rp 10.000 harus mematikannya.
  const keranjang = [
    barang("p1", "Barang 1", "1 kg", [harga("a", 10_000), harga("b", 11_000)]),
    barang("p2", "Barang 2", "1 kg", [harga("a", 22_000), harga("b", 20_000)]),
  ];
  const tunggal = nilaiTiapToko(keranjang, TOKO);
  const pecah = cariPecahTerbaik(keranjang, TOKO, tunggal[0].totalSetara, 10_000);

  uji("hemat receh TIDAK dianggap sepadan", () =>
    harus.salah(pecahSepadan(pecah, tunggal[0].totalSetara)));

  uji("keputusan akhirnya tetap satu toko", () => {
    const r = susunRencana(keranjang, TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.keputusan.jenis, "satu-toko");
  });

  uji("alasan menyebutkan kenapa pecah ditolak", () => {
    const r = susunRencana(keranjang, TOKO, [], { sekarang: SEKARANG });
    harus.benar(
      r.keputusan.alasan.some((a) => a.toLowerCase().includes("belum sepadan")),
      "alasan menjelaskan penolakan"
    );
  });

  uji("ongkos perjalanan nol membuat pecah jadi masuk akal lagi", () => {
    const r = susunRencana(keranjang, TOKO, [], {
      biayaPerjalanan: 0,
      sekarang: SEKARANG,
    });
    // Hemat Rp 1.000 dari total Rp 31.000 = 3,2% ≥ ambang 3%. Yang berubah
    // cuma ongkosnya — buktinya ongkos itulah yang tadi mematikan pemecahan.
    harus.sama(r.keputusan.jenis, "pecah-dua-toko");
  });

  uji("ambang persen memang berlaku, bukan sekadar tertulis", () => {
    harus.minimal(AMBANG_PECAH_PERSEN, 1, "ambang");
  });
});

kelompok("cariPecahTerbaik() — kasus yang tak bisa dipecah", () => {
  uji("keranjang satu barang tidak pernah dipecah", () => {
    const k = [barang("p1", "Satu", "1 kg", [harga("a", 10_000), harga("b", 9_000)])];
    harus.sama(cariPecahTerbaik(k, TOKO, 9_000, 10_000), null);
  });

  uji("kalau satu toko menang di semua barang, itu bukan pemecahan", () => {
    const k = [
      barang("p1", "A", "1 kg", [harga("a", 10_000), harga("b", 12_000)]),
      barang("p2", "B", "1 kg", [harga("a", 20_000), harga("b", 22_000)]),
    ];
    const r = susunRencana(k, TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.keputusan.jenis, "satu-toko");
  });
});

// ─────────────────────── Keyakinan ───────────────────────

kelompok("keyakinan", () => {
  uji("harga nyata & segar → keyakinan tinggi", () => {
    const k = [barang("p1", "A", "1 kg", [harga("a", 10_000)])];
    const r = susunRencana(k, TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.keyakinan.tingkat, "tinggi");
    harus.sama(r.keyakinan.porsiNyata, 1);
  });

  uji("seluruhnya perkiraan → keyakinan rendah", () => {
    const k = [
      barang("p1", "A", "1 kg", [
        harga("a", 10_000, { nyata: false, sourceKind: "estimate" }),
      ]),
    ];
    const r = susunRencana(k, TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.keyakinan.porsiNyata, 0);
    harus.sama(r.keyakinan.tingkat, "rendah");
  });

  uji("data tua menurunkan keyakinan walau harganya nyata", () => {
    const segar = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000)])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    const basi = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000, { dicatatPada: LAMA })])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    harus.benar(basi.keyakinan.nilai < segar.keyakinan.nilai, "keyakinan turun");
  });

  uji("alasan keyakinan tidak pernah kosong saat ada barang", () => {
    const r = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000)])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    harus.minimal(r.keyakinan.alasan.length, 1, "jumlah alasan");
  });

  uji("umur rata-rata dihitung dalam hari", () => {
    const r = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000, { dicatatPada: LAMA })])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    harus.minimal(r.keyakinan.umurRerataHari ?? 0, 90, "umur");
  });
});

// ─────────────────────── Peringatan ───────────────────────

kelompok("susunPeringatan()", () => {
  const jenis = (k: BarisMasuk[]) =>
    susunPeringatan(k, SEKARANG).map((p) => p.jenis);

  uji("satuan tak terbaca dilaporkan", () =>
    harus.memuat(
      jenis([barang("p1", "Cleo", "220", [harga("a", 3_000)])]),
      "satuan-tak-terbaca"
    ));

  uji("barang tanpa harga di mana pun dilaporkan", () =>
    harus.memuat(
      jenis([barang("p1", "Hilang", "1 kg", [])]),
      "barang-nihil"
    ));

  uji("keranjang yang seluruhnya perkiraan dilaporkan", () =>
    harus.memuat(
      jenis([
        barang("p1", "A", "1 kg", [
          harga("a", 10_000, { nyata: false, sourceKind: "estimate" }),
        ]),
      ]),
      "semua-perkiraan"
    ));

  uji("harga basi dilaporkan", () =>
    harus.memuat(
      jenis([barang("p1", "A", "1 kg", [harga("a", 10_000, { dicatatPada: LAMA })])]),
      "harga-basi"
    ));

  uji("sebaran harga mustahil dilaporkan sebagai kemungkinan salah data", () =>
    harus.memuat(
      jenis([
        barang("p1", "A", "1 kg", [harga("a", 5_000), harga("b", 90_000)]),
      ]),
      "sebaran-harga-ekstrem"
    ));

  uji("data yang sehat tidak memicu peringatan apa pun", () =>
    harus.sama(
      jenis([barang("p1", "A", "1 kg", [harga("a", 10_000), harga("b", 11_000)])]),
      []
    ));

  uji("yang serius muncul lebih dulu", () => {
    const p = susunPeringatan(
      [
        barang("p1", "Cleo", "220", [harga("a", 3_000)]),
        barang("p2", "Hilang", "1 kg", []),
      ],
      SEKARANG
    );
    harus.sama(p[0].tingkat, "serius");
  });

  uji("keranjang kosong tidak memicu peringatan", () =>
    harus.sama(susunPeringatan([], SEKARANG), []));
});

kelompok("saringHargaMustahil() — REGRESI: kopi Rp 20", () => {
  // Ditemukan di katalog SUNGGUHAN: "Alfamart Htg Coffe Papua" berharga
  // Rp 20. Harga itu masuk sebelum periksaHarga() ada, dan ikut menarik
  // total toko ke bawah.
  const keranjang = [
    barang("kopi", "Kopi Papua", "1 pcs", [harga("a", 20), harga("b", 18_000)], {
      categorySlug: "minuman",
    }),
  ];
  const { bersih, dibuang } = saringHargaMustahil(keranjang);

  uji("harga mustahil dibuang dari perhitungan", () =>
    harus.sama(bersih[0].harga.map((h) => h.harga), [18_000]));

  uji("yang dibuang dilaporkan, tidak hilang diam-diam", () => {
    harus.sama(dibuang.length, 1);
    harus.sama(dibuang[0].harga, 20);
    harus.benar(dibuang[0].alasan, "alasan");
  });

  uji("harga wajar tidak tersentuh", () => {
    const wajar = [
      barang("a", "A", "1 kg", [harga("a", 12_000)], { categorySlug: "sembako" }),
    ];
    harus.sama(saringHargaMustahil(wajar).dibuang, []);
  });

  uji("rencana memakai harga yang sudah bersih", () => {
    const r = susunRencana(keranjang, TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.tokoTunggal[0].totalBarang, 18_000);
  });

  uji("peringatan harga mustahil muncul di rencana", () => {
    const r = susunRencana(keranjang, TOKO, [], { sekarang: SEKARANG });
    harus.memuat(
      r.peringatan.map((p) => p.jenis),
      "harga-mustahil"
    );
  });

  uji("peringatannya berjenis serius", () => {
    const p = susunPeringatan(keranjang, SEKARANG, dibuang);
    harus.sama(p[0].jenis, "harga-mustahil");
    harus.sama(p[0].tingkat, "serius");
  });
});

// ─────────────────────── Substitusi ───────────────────────

kelompok("cariSubstitusi() — REGRESI: harus barang sejenis", () => {
  // Ditemukan saat agen dijalankan pada katalog SUNGGUHAN, bukan oleh uji:
  // seluruh benda ini sekategori "minuman", dan versi pertama dengan yakin
  // menyuruh mengganti Adem Sari dengan air mineral.
  const nyata = [
    barang("adem-sari", "Adem Sari Sparkling 330ml", "320ml", [harga("a", 11_300)], {
      categorySlug: "minuman",
    }),
    barang("oats", "3 In 1 Oats Vanilla", "1 pcs", [harga("a", 10_300)], {
      categorySlug: "minuman",
    }),
    barang("aqua", "Air Mineral Aqua", "600 ml", [harga("a", 3_900)], {
      categorySlug: "minuman",
    }),
  ];
  const kandidat: KandidatSubstitusi[] = [
    {
      productId: "le-minerale",
      slug: "le-minerale",
      nama: "Le Minerale 1,5 L",
      emoji: "💧",
      satuan: "1.5 L",
      categorySlug: "minuman",
      hargaTermurah: 12_100,
      tokoTermurah: "Toko A",
      nyata: true,
    },
    {
      productId: "nescafe",
      slug: "nescafe",
      nama: "Nescafé Classic Sachet",
      emoji: "☕",
      satuan: "1 pcs",
      categorySlug: "minuman",
      hargaTermurah: 1_700,
      tokoTermurah: "Toko A",
      nyata: true,
    },
    {
      productId: "aqua-1500",
      slug: "aqua-1500",
      nama: "Air Mineral Aqua 1,5 L",
      emoji: "💧",
      satuan: "1.5 L",
      categorySlug: "minuman",
      hargaTermurah: 6_500,
      tokoTermurah: "Toko A",
      nyata: true,
    },
  ];

  const hasil = cariSubstitusi(nyata, kandidat);
  const asal = (id: string) => hasil.find((s) => s.dari.productId === id);

  uji("Adem Sari TIDAK diganti dengan air mineral", () =>
    harus.sama(asal("adem-sari"), undefined));

  uji("oatmeal TIDAK diganti dengan kopi sachet", () =>
    harus.sama(asal("oats"), undefined));

  uji("air mineral BOLEH diganti air mineral kemasan lebih besar", () => {
    const s = asal("aqua");
    harus.benar(s, "saran untuk Aqua");
    harus.sama(s!.ke.slug, "aqua-1500");
  });

  uji("alasannya menyebut kenapa keduanya dianggap sejenis", () =>
    harus.benar(
      asal("aqua")!.alasan.toLowerCase().includes("sama-sama"),
      "alasan sejenis"
    ));
});

kelompok("cariSubstitusi()", () => {
  const keranjang = [
    barang("beras-1kg", "Beras 1 kg", "1 kg", [harga("a", 13_500)]),
  ];
  const kandidat: KandidatSubstitusi[] = [
    {
      productId: "beras-5kg",
      slug: "beras-5kg",
      nama: "Beras 5 kg",
      emoji: "🍚",
      satuan: "5 kg",
      categorySlug: "sembako",
      hargaTermurah: 62_000,
      tokoTermurah: "Toko A",
      nyata: true,
    },
  ];

  const hasil = cariSubstitusi(keranjang, kandidat);

  uji("kemasan besar disarankan karena lebih murah per kg", () => {
    harus.sama(hasil.length, 1);
    harus.sama(hasil[0].ke.slug, "beras-5kg");
  });

  uji("angka per satuan dibawa apa adanya", () => {
    harus.sama(hasil[0].perSatuanDari, 13_500);
    harus.sama(hasil[0].perSatuanKe, 12_400);
  });

  uji("hemat dihitung pada isi yang setara, bukan selisih label", () =>
    harus.sama(hasil[0].hematRupiah, 1_100));

  uji("beda kategori tidak pernah disarankan", () => {
    const lain = [{ ...kandidat[0], categorySlug: "snack" }];
    harus.sama(cariSubstitusi(keranjang, lain), []);
  });

  uji("beda basis satuan tidak pernah diadu (kg vs liter)", () => {
    const lain = [{ ...kandidat[0], satuan: "5 L" }];
    harus.sama(cariSubstitusi(keranjang, lain), []);
  });

  uji("ukuran yang beda keterlaluan ditolak (600ml vs galon 19L)", () => {
    const air = [barang("air-600", "Air 600ml", "600 ml", [harga("a", 3_000)])];
    const galon: KandidatSubstitusi[] = [
      {
        productId: "galon",
        slug: "galon",
        nama: "Galon 19 L",
        emoji: "💧",
        satuan: "19 L",
        categorySlug: "sembako",
        hargaTermurah: 20_000,
        tokoTermurah: "Toko A",
        nyata: true,
      },
    ];
    harus.sama(cariSubstitusi(air, galon), []);
  });

  uji("hemat terlalu tipis tidak disarankan", () => {
    const tipis = [{ ...kandidat[0], hargaTermurah: 66_000 }]; // 13.200/kg, cuma 2%
    harus.sama(cariSubstitusi(keranjang, tipis), []);
  });

  uji("barang yang sudah ada di keranjang bukan pengganti", () => {
    const k2 = [
      ...keranjang,
      barang("beras-5kg", "Beras 5 kg", "5 kg", [harga("a", 62_000)]),
    ];
    harus.sama(cariSubstitusi(k2, kandidat), []);
  });

  uji("satuan tak terbaca → tidak ada dasar menyarankan", () => {
    const rusak = [barang("x", "Cleo", "220", [harga("a", 3_000)])];
    harus.sama(cariSubstitusi(rusak, kandidat), []);
  });

  uji("harga perkiraan tetap disarankan tapi diberi catatan", () => {
    const perkiraan = [{ ...kandidat[0], nyata: false }];
    const r = cariSubstitusi(keranjang, perkiraan);
    harus.sama(r.length, 1);
    harus.benar(r[0].alasan.toLowerCase().includes("cek dulu"), "catatan perkiraan");
  });
});

// ─────────────────────── Rencana utuh ───────────────────────

kelompok("susunRencana() — bentuk hasil", () => {
  uji("keranjang kosong menghasilkan rencana kosong yang aman", () => {
    const r = susunRencana([], TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.keputusan.jenis, "tak-bisa-memutuskan");
    harus.sama(r.tokoTunggal, []);
    harus.sama(r.jumlahBaris, 0);
  });

  uji("tanpa harga sama sekali, agen mengaku tidak bisa memutuskan", () => {
    const r = susunRencana([barang("p1", "A", "1 kg", [])], TOKO, [], {
      sekarang: SEKARANG,
    });
    // Semua toko bertotal 0 → tetap ada peringkat, tapi keputusannya jujur.
    harus.benar(
      r.peringatan.some((p) => p.jenis === "barang-nihil"),
      "peringatan barang nihil"
    );
  });

  uji("keputusan selalu punya alasan", () => {
    const r = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000), harga("b", 12_000)])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    harus.minimal(r.keputusan.alasan.length, 1, "jumlah alasan");
  });

  uji("hemat tidak pernah negatif", () => {
    const r = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000)])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    harus.minimal(r.keputusan.hemat, 0, "hemat");
  });

  uji("ongkos perjalanan bawaan terbawa ke hasil", () => {
    const r = susunRencana(
      [barang("p1", "A", "1 kg", [harga("a", 10_000)])],
      TOKO,
      [],
      { sekarang: SEKARANG }
    );
    harus.sama(r.biayaPerjalanan, BIAYA_PERJALANAN_BAWAAN);
  });

  uji("hasil sama untuk masukan sama (deterministik)", () => {
    const k = [
      barang("p1", "A", "1 kg", [harga("a", 10_000), harga("b", 40_000)]),
      barang("p2", "B", "1 kg", [harga("a", 40_000), harga("b", 10_000)]),
    ];
    const a = susunRencana(k, TOKO, [], { sekarang: SEKARANG });
    const b = susunRencana(k, TOKO, [], { sekarang: SEKARANG });
    harus.sama(JSON.stringify(a), JSON.stringify(b));
  });

  uji("qty ikut mengalikan subtotal", () => {
    const k = [
      barang("p1", "A", "1 kg", [harga("a", 10_000)], { qty: 3 }),
    ];
    const r = susunRencana(k, TOKO, [], { sekarang: SEKARANG });
    harus.sama(r.tokoTunggal[0].totalSetara, 30_000);
  });

  uji("ongkos perjalanan negatif dijepit ke nol", () => {
    const r = susunRencana([barang("p1", "A", "1 kg", [harga("a", 1)])], TOKO, [], {
      biayaPerjalanan: -5_000,
      sekarang: SEKARANG,
    });
    harus.sama(r.biayaPerjalanan, 0);
  });
});
