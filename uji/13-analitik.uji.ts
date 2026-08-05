/**
 * Uji ringkasan analitik pencarian — murni logika, tanpa database.
 *
 * Jamnya disuntikkan (`sampai`), jadi ujinya tidak akan berubah hasil hanya
 * karena dijalankan tengah malam.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  HARI_ANALITIK,
  ringkasPencarian,
  type BarisLogRingkas,
} from "@/lib/queries/analitik";

const SAMPAI = new Date("2026-08-05T12:00:00Z");

function baris(
  query: string,
  resultCount: number,
  hariLalu: number,
  jalur: string | null = "persis"
): BarisLogRingkas {
  const d = new Date(SAMPAI);
  d.setDate(d.getDate() - hariLalu);
  return { query, resultCount, jalur, createdAt: d };
}

kelompok("ringkasPencarian() — angka pokok", () => {
  const data = [
    baris("indomie", 5, 0),
    baris("indomie", 3, 1),
    baris("aqua", 2, 1),
    baris("barang gaib", 0, 2, "kosong"),
  ];
  const r = ringkasPencarian(data, SAMPAI);

  uji("total pencarian dihitung", () => harus.sama(r.totalPencarian, 4));
  uji("pencarian nihil dihitung", () => harus.sama(r.totalGagal, 1));
  uji("rasio nihil dalam persen", () => harus.dekat(r.persenGagal, 25, 0.001));
  uji("tidak dianggap kosong saat ada data", () => harus.salah(r.kosong, "kosong"));
});

kelompok("ringkasPencarian() — kueri terpopuler", () => {
  const r = ringkasPencarian(
    [
      baris("Indomie", 5, 0),
      baris("indomie", 5, 1),
      baris("INDOMIE", 5, 2),
      baris("aqua", 2, 0),
    ],
    SAMPAI
  );

  uji("beda huruf besar-kecil dihitung sebagai kueri yang sama", () => {
    harus.sama(r.kueriTeratas[0].query, "indomie");
    harus.sama(r.kueriTeratas[0].jumlah, 3);
  });

  uji("yang terbanyak muncul lebih dulu", () =>
    harus.sama(r.kueriTeratas.map((k) => k.query), ["indomie", "aqua"]));

  uji("hasil terakhir dibawa untuk menandai kueri yang kini nihil", () => {
    const x = ringkasPencarian(
      [baris("indomie", 0, 0), baris("indomie", 7, 3)],
      SAMPAI
    );
    harus.sama(x.kueriTeratas[0].hasilTerakhir, 0);
  });

  uji("kueri kosong/spasi tidak ikut", () =>
    harus.sama(ringkasPencarian([baris("   ", 0, 0)], SAMPAI).kueriTeratas, []));

  uji("daftar dibatasi", () => {
    const banyak = Array.from({ length: 30 }, (_, i) => baris(`kueri-${i}`, 1, 0));
    harus.maksimal(ringkasPencarian(banyak, SAMPAI, 14, 10).kueriTeratas.length, 10, "jumlah");
  });
});

kelompok("ringkasPencarian() — deret harian", () => {
  const r = ringkasPencarian([baris("a", 1, 0), baris("b", 0, 0), baris("c", 1, 3)], SAMPAI);

  uji("panjang deret sesuai jendela yang diminta", () =>
    harus.sama(r.harian.length, HARI_ANALITIK));

  uji("hari tanpa pencarian TETAP muncul sebagai nol", () => {
    // Kalau hari kosong dilewati, grafiknya memampatkan waktu dan jeda
    // panjang antar-pencarian jadi tak terlihat.
    const kosong = r.harian.filter((h) => h.jumlah === 0);
    harus.minimal(kosong.length, 1, "hari kosong");
  });

  uji("hari terakhir adalah hari ini", () =>
    harus.sama(r.harian[r.harian.length - 1].tanggal, "2026-08-05"));

  uji("urutannya menaik menurut tanggal", () => {
    for (let i = 1; i < r.harian.length; i++) {
      harus.benar(r.harian[i - 1].tanggal < r.harian[i].tanggal, "urutan tanggal");
    }
  });

  uji("pencarian nihil dihitung terpisah per hari", () => {
    const hariIni = r.harian[r.harian.length - 1];
    harus.sama(hariIni.jumlah, 2);
    harus.sama(hariIni.gagal, 1);
  });
});

kelompok("ringkasPencarian() — sebaran jalur", () => {
  const r = ringkasPencarian(
    [
      baris("a", 1, 0, "persis"),
      baris("b", 1, 0, "persis"),
      baris("c", 1, 0, "typo"),
      baris("d", 1, 0, null),
    ],
    SAMPAI
  );

  uji("jalur terbanyak lebih dulu", () => harus.sama(r.jalur[0].jalur, "persis"));
  uji("persentase dihitung terhadap seluruh pencarian", () =>
    harus.dekat(r.jalur[0].persen, 50, 0.001));
  uji("jalur yang tak tercatat tetap dilaporkan, bukan dibuang", () =>
    harus.memuat(r.jalur.map((j) => j.jalur), "tak tercatat"));
  uji("jumlah seluruh jalur = jumlah pencarian", () =>
    harus.sama(r.jalur.reduce((s, j) => s + j.jumlah, 0), r.totalPencarian));
});

kelompok("ringkasPencarian() — tanpa data", () => {
  const r = ringkasPencarian([], SAMPAI);

  uji("ditandai kosong", () => harus.benar(r.kosong, "kosong"));
  uji("rasio nihil tidak jadi NaN saat pembaginya nol", () =>
    harus.sama(r.persenGagal, 0));
  uji("deret harian tetap terbentuk penuh", () =>
    harus.sama(r.harian.length, HARI_ANALITIK));
  uji("tidak ada kueri & jalur", () => {
    harus.sama(r.kueriTeratas, []);
    harus.sama(r.jalur, []);
  });
});

kelompok("ringkasPencarian() — klik ke situs toko", () => {
  const klik = [
    { toko: "alfamart", jumlah: 3 },
    { toko: "indomaret", jumlah: 7 },
  ];

  uji("diurutkan dari yang paling sering diklik", () => {
    const r = ringkasPencarian([], SAMPAI, 14, 10, klik);
    harus.sama(r.klikToko.map((k) => k.toko), ["indomaret", "alfamart"]);
  });

  uji("panel TIDAK dianggap kosong bila ada klik walau nol pencarian", () => {
    // Kalau ini salah, data klik yang sudah terkumpul tidak akan pernah tampil.
    harus.salah(ringkasPencarian([], SAMPAI, 14, 10, klik).kosong, "kosong");
  });

  uji("benar-benar kosong bila tak ada pencarian maupun klik", () =>
    harus.benar(ringkasPencarian([], SAMPAI).kosong, "kosong"));

  uji("masukan asli tidak diubah urutannya", () => {
    ringkasPencarian([], SAMPAI, 14, 10, klik);
    harus.sama(klik[0].toko, "alfamart");
  });
});
