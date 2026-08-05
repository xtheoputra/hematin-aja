/**
 * Uji tren harga & rekomendasi hemat — murni logika, tanpa database.
 *
 * Dua kelompok pertama adalah **uji regresi**: keduanya menjaga bug yang
 * benar-benar pernah ada di halaman Insight, dan keduanya lolos seluruh uji
 * lama karena yang lama hanya memeriksa bentuk hasil, bukan kebenarannya.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  penurunanPerToko,
  rekomendasiPerSatuan,
  type PilihanKategori,
} from "@/lib/queries/tren";
import type { PriceWithStore } from "@/lib/queries/pilih";

const PRODUK = { slug: "indomie-goreng", name: "Indomie Goreng", emoji: "🍜" };

function h(
  harga: number,
  sumber: string,
  hariLalu: number,
  toko = "t1"
): PriceWithStore {
  return {
    supermarketId: toko,
    price: harga,
    inStock: true,
    url: null,
    source: sumber,
    recordedAt: new Date(2026, 7, 5 - hariLalu),
    supermarket: { slug: toko, name: `Toko ${toko}`, color: "#111" },
  };
}

kelompok("penurunanPerToko() — REGRESI: sumber tak boleh dicampur", () => {
  // Kasus yang jadi alasan perbaikan: harga NYATA hari ini Rp 3.000, sementara
  // riwayat lama toko yang sama adalah PERKIRAAN Rp 3.500. Selisihnya bukan
  // penurunan harga — itu pergantian sumber data.
  const campur = [
    h(3_000, "manual", 0),
    h(3_500, "seed", 5),
    h(3_500, "seed", 10),
    h(3_500, "seed", 15),
    h(3_500, "seed", 20),
  ];

  uji("nyata-terbaru vs perkiraan-lama TIDAK dilaporkan sebagai penurunan", () =>
    harus.sama(penurunanPerToko(PRODUK, campur), []));

  uji("harga nyata sendirian tidak punya pembanding yang sah", () =>
    harus.sama(penurunanPerToko(PRODUK, [h(3_000, "manual", 0), h(9_000, "seed", 9)]), []));
});

kelompok("penurunanPerToko() — penurunan yang sungguhan", () => {
  const turun = [
    h(3_000, "seed", 0),
    h(3_400, "seed", 5),
    h(3_500, "seed", 10),
    h(3_500, "seed", 15),
    h(3_500, "seed", 20),
  ];
  const hasil = penurunanPerToko(PRODUK, turun);

  uji("penurunan sesama perkiraan tetap dilaporkan", () =>
    harus.sama(hasil.length, 1));
  uji("harga lama & baru diambil dari deret yang sama", () => {
    harus.sama(hasil[0].newPrice, 3_000);
    harus.sama(hasil[0].oldPrice, 3_500);
  });
  uji("persentasenya negatif", () => harus.benar(hasil[0].changePct < 0));
  uji("penurunan dari perkiraan ditandai bukan nyata", () =>
    harus.salah(hasil[0].isReal, "isReal"));

  uji("penurunan sesama harga nyata ditandai nyata", () => {
    const r = penurunanPerToko(PRODUK, [
      h(3_000, "manual", 0),
      h(3_500, "open-prices", 5),
    ]);
    harus.sama(r.length, 1);
    harus.benar(r[0].isReal, "isReal");
  });

  uji("kenaikan harga bukan urusan daftar ini", () =>
    harus.sama(
      penurunanPerToko(PRODUK, [h(4_000, "seed", 0), h(3_000, "seed", 5)]),
      []
    ));

  uji("gerak harga sangat kecil tidak dianggap kabar", () =>
    harus.sama(
      penurunanPerToko(PRODUK, [h(3_490, "seed", 0), h(3_500, "seed", 5)]),
      []
    ));

  uji("barang yang habis stok tidak dilaporkan turun", () => {
    const habis = [{ ...h(3_000, "seed", 0), inStock: false }, h(3_500, "seed", 5)];
    harus.sama(penurunanPerToko(PRODUK, habis), []);
  });

  uji("tiap toko dihitung sendiri-sendiri", () => {
    const dua = [
      h(3_000, "seed", 0, "t1"),
      h(3_500, "seed", 5, "t1"),
      h(2_000, "seed", 0, "t2"),
      h(2_600, "seed", 5, "t2"),
    ];
    harus.sama(penurunanPerToko(PRODUK, dua).length, 2);
  });

  uji("riwayat kosong aman", () => harus.sama(penurunanPerToko(PRODUK, []), []));
});

// ───────────────────────── Rekomendasi hemat ─────────────────────────

function pick(
  name: string,
  unit: string,
  price: number
): PilihanKategori {
  return { slug: name, name, emoji: "📦", unit, price, store: "Toko A" };
}

const kategori = (picks: PilihanKategori[]) =>
  new Map([["c1", { categoryName: "Sembako", picks }]]);

kelompok("rekomendasiPerSatuan() — REGRESI: ukuran tak boleh diabaikan", () => {
  // Kasus lama: yang harga labelnya terkecil dinyatakan "paling hemat".
  // Gula 1 kg Rp 15.000 labelnya paling murah, tapi beras 5 kg Rp 62.000
  // (Rp 12.400/kg) yang benar-benar paling murah per kilogram.
  const hasil = rekomendasiPerSatuan(
    kategori([
      pick("Beras 5 kg", "5 kg", 62_000),
      pick("Gula 1 kg", "1 kg", 15_000),
      pick("Tepung 1 kg", "1 kg", 16_000),
      pick("Minyak 2 kg", "2 kg", 40_000),
    ])
  );

  uji("yang dipilih adalah termurah PER KILOGRAM, bukan label terkecil", () => {
    harus.sama(hasil.length, 1);
    harus.sama(hasil[0].pickName, "Beras 5 kg");
  });

  uji("angka per satuan dilaporkan apa adanya", () =>
    harus.sama(hasil[0].perSatuan, 12_400));

  uji("pembandingnya median, bukan rata-rata", () => {
    // per kg: 12.400 / 15.000 / 16.000 / 20.000 → median (15.000+16.000)/2
    harus.sama(hasil[0].medianPerSatuan, 15_500);
    harus.sama(hasil[0].hematPerSatuan, 3_100);
  });

  uji("jumlah pembanding ikut dilaporkan", () =>
    harus.sama(hasil[0].jumlahPembanding, 4));
});

kelompok("rekomendasiPerSatuan() — gerbang yang harus ada", () => {
  uji("basis satuan berbeda tidak pernah diadu", () => {
    // 2 barang per kg + 2 barang per liter: tak satu pun grup mencapai 3.
    const hasil = rekomendasiPerSatuan(
      kategori([
        pick("Beras 5 kg", "5 kg", 62_000),
        pick("Gula 1 kg", "1 kg", 15_000),
        pick("Minyak 1 L", "1 L", 18_000),
        pick("Minyak 2 L", "2 L", 40_000),
      ])
    );
    harus.sama(hasil, []);
  });

  uji("pembanding kurang dari tiga = kebetulan, bukan pasar", () =>
    harus.sama(
      rekomendasiPerSatuan(
        kategori([pick("A", "1 kg", 10_000), pick("B", "1 kg", 20_000)])
      ),
      []
    ));

  uji("satuan tak terbaca tidak ikut dibandingkan", () => {
    const hasil = rekomendasiPerSatuan(
      kategori([
        pick("Rusak", "RH. 30", 1_000),
        pick("A", "1 kg", 10_000),
        pick("B", "1 kg", 20_000),
      ])
    );
    // Tinggal 2 yang terbaca → di bawah ambang.
    harus.sama(hasil, []);
  });

  uji("kalau semua sama harganya, tidak ada yang direkomendasikan", () =>
    harus.sama(
      rekomendasiPerSatuan(
        kategori([
          pick("A", "1 kg", 10_000),
          pick("B", "1 kg", 10_000),
          pick("C", "1 kg", 10_000),
        ])
      ),
      []
    ));

  uji("kategori kosong aman", () => harus.sama(rekomendasiPerSatuan(new Map()), []));

  uji("hasil dibatasi enam", () => {
    const banyak = new Map(
      Array.from({ length: 10 }, (_, i) => [
        `c${i}`,
        {
          categoryName: `Kategori ${i}`,
          picks: [
            pick(`A${i}`, "1 kg", 5_000),
            pick(`B${i}`, "1 kg", 20_000),
            pick(`C${i}`, "1 kg", 25_000),
          ],
        },
      ])
    );
    harus.maksimal(rekomendasiPerSatuan(banyak).length, 6, "jumlah rekomendasi");
  });
});
