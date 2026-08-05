/**
 * Uji perbandingan varian ukuran — murni logika, tanpa database.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  MAKS_VARIAN,
  bandingVarian,
  type ProdukVarian,
} from "@/lib/varian";
import { ringkasKesegaran } from "@/lib/queries/kondisi";
import { AGING_MAX_DAYS, FRESH_MAX_DAYS } from "@/lib/freshness";

function v(
  slug: string,
  nama: string,
  satuan: string,
  harga: number,
  categorySlug = "sembako"
): ProdukVarian {
  return {
    slug,
    nama,
    emoji: "📦",
    satuan,
    categorySlug,
    harga,
    toko: "Toko A",
    nyata: true,
  };
}

const BERAS_1 = v("beras-1", "Beras Medium 1 kg", "1 kg", 13_500);
const BERAS_5 = v("beras-5", "Beras Medium 5 kg", "5 kg", 62_000);
const BERAS_10 = v("beras-10", "Beras Medium 10 kg", "10 kg", 118_000);

kelompok("bandingVarian() — inti perbandingan", () => {
  const r = bandingVarian(BERAS_1, [BERAS_1, BERAS_5, BERAS_10])!;

  uji("hasil terbentuk", () => harus.benar(r, "hasil"));

  uji("diurutkan dari termurah per satuan", () =>
    harus.sama(r.baris.map((b) => b.slug), ["beras-10", "beras-5", "beras-1"]));

  uji("yang termurah ditandai", () => {
    harus.benar(r.baris[0].paling, "paling");
    harus.salah(r.baris[2].paling, "paling");
  });

  uji("produk yang sedang dibuka ditandai", () => {
    const dibuka = r.baris.filter((b) => b.iniYangDibuka);
    harus.sama(dibuka.length, 1);
    harus.sama(dibuka[0].slug, "beras-1");
  });

  uji("selisih persen dihitung terhadap yang termurah", () => {
    harus.sama(r.baris[0].lebihMahalPersen, 0);
    harus.benar(r.baris[2].lebihMahalPersen > 0, "yang dibuka lebih mahal");
  });

  uji("hemat dihitung dari kemasan SEKELAS, bukan yang termurah mutlak", () => {
    // Termurah per kg sebenarnya beras 10 kg (11.800/kg), tapi 10× lipat dari
    // 1 kg sudah beda kelas belanja. Klaimnya memakai 5 kg (12.400/kg).
    harus.sama(r.targetHemat, "Beras Medium 5 kg");
    harus.dekat(r.hematPersen, ((13_500 - 12_400) / 13_500) * 100, 0.01);
  });

  uji("yang beda kelas tetap tampil, hanya tak dipakai mengklaim hemat", () => {
    const sepuluh = r.baris.find((b) => b.slug === "beras-10")!;
    harus.benar(sepuluh.ukuranBedaKelas, "beda kelas");
    harus.benar(sepuluh.paling, "tetap termurah per kg");
  });

  uji("satuan tampil dibawa", () => harus.sama(r.satuanTampil, "kg"));
});

kelompok("bandingVarian() — saat yang dibuka SUDAH paling hemat", () => {
  const r = bandingVarian(BERAS_10, [BERAS_1, BERAS_5, BERAS_10])!;

  uji("hemat nol", () => harus.sama(r.hematPersen, 0));
  uji("baris pertama adalah yang sedang dibuka", () => {
    harus.benar(r.baris[0].iniYangDibuka, "yang dibuka");
    harus.benar(r.baris[0].paling, "paling");
  });
});

kelompok("bandingVarian() — gerbang", () => {
  uji("tanpa pembanding → null, bukan tabel satu baris", () =>
    harus.sama(bandingVarian(BERAS_1, [BERAS_1]), null));

  uji("beda kategori tidak ikut", () => {
    const lain = { ...BERAS_5, categorySlug: "snack" };
    harus.sama(bandingVarian(BERAS_1, [BERAS_1, lain]), null);
  });

  uji("barang tidak sejenis tidak ikut walau sekategori", () => {
    // Gula 1 kg sekategori & sebasis, tapi bukan varian dari beras.
    const gula = v("gula-1", "Gula Pasir 1 kg", "1 kg", 16_000);
    harus.sama(bandingVarian(BERAS_1, [BERAS_1, gula]), null);
  });

  uji("beda basis satuan tidak diadu (kg vs liter)", () => {
    const cair = v("beras-cair", "Beras Medium 1 L", "1 L", 13_000);
    harus.sama(bandingVarian(BERAS_1, [BERAS_1, cair]), null);
  });

  uji("satuan produk yang dibuka tak terbaca → null", () => {
    const rusak = v("x", "Beras Medium Aneh", "RH. 30", 10_000);
    harus.sama(bandingVarian(rusak, [rusak, BERAS_5]), null);
  });

  uji("kandidat bersatuan rusak dilewati, bukan menggagalkan semuanya", () => {
    const rusak = v("y", "Beras Medium Aneh", "220", 10_000);
    const r = bandingVarian(BERAS_1, [BERAS_1, BERAS_5, rusak]);
    harus.benar(r, "hasil");
    harus.takMemuat(r!.baris.map((b) => b.slug), "y");
  });

  uji("produk yang sama tidak muncul dua kali", () => {
    const r = bandingVarian(BERAS_1, [BERAS_1, BERAS_1, BERAS_5])!;
    harus.sama(r.baris.filter((b) => b.slug === "beras-1").length, 1);
  });
});

kelompok("bandingVarian() — pemotongan daftar", () => {
  // 8 varian; yang dibuka sengaja yang PALING MAHAL supaya jatuh di luar batas.
  const banyak = Array.from({ length: 8 }, (_, i) =>
    v(`beras-${i}`, `Beras Medium ${i + 1} kg`, `${i + 1} kg`, 20_000 * (8 - i))
  );
  const termahalPerKg = banyak[banyak.length - 1]; // 1 kg seharga 20.000
  const r = bandingVarian(termahalPerKg, banyak)!;

  uji("daftar dipotong", () => harus.maksimal(r.baris.length, MAKS_VARIAN, "jumlah baris"));

  uji("produk yang sedang dibuka TETAP ikut walau daftarnya dipotong", () => {
    // Tanpa dia, perbandingannya kehilangan titik acuan.
    harus.benar(
      r.baris.some((b) => b.iniYangDibuka),
      "baris yang dibuka ada"
    );
  });

  uji("yang termurah tetap ikut", () => harus.benar(r.baris[0].paling, "paling"));
});

// ─────────────── Sebaran kesegaran (halaman /data) ───────────────

kelompok("ringkasKesegaran()", () => {
  const kini = new Date("2026-08-05T12:00:00Z");
  const hariLalu = (n: number) => {
    const d = new Date(kini);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  uji("dipilah sesuai batas yang sama dengan freshness.ts", () => {
    const r = ringkasKesegaran(
      [hariLalu(0), hariLalu(FRESH_MAX_DAYS), hariLalu(AGING_MAX_DAYS), hariLalu(400)],
      kini
    );
    harus.sama(r.segar, 2); // 0 dan tepat di batas segar
    harus.sama(r.lawas, 1);
    harus.sama(r.kedaluwarsa, 1);
    harus.sama(r.total, 4);
  });

  uji("tanggal kosong/null tidak ikut dihitung", () => {
    const r = ringkasKesegaran([null, undefined, "", hariLalu(1)], kini);
    harus.sama(r.total, 1);
  });

  uji("daftar kosong aman", () =>
    harus.sama(ringkasKesegaran([], kini), {
      segar: 0,
      lawas: 0,
      kedaluwarsa: 0,
      total: 0,
    }));

  uji("total selalu sama dengan jumlah ketiganya", () => {
    const r = ringkasKesegaran([hariLalu(1), hariLalu(20), hariLalu(90)], kini);
    harus.sama(r.segar + r.lawas + r.kedaluwarsa, r.total);
  });
});

kelompok("bandingVarian() — REGRESI: galon bukan pengganti botol", () => {
  // Ditemukan setelah tabelnya dibuka di aplikasi sungguhan: judulnya berbunyi
  // "ada kemasan 92% lebih murah" dengan mengadu botol 700 ml vs galon 19 L.
  const BOTOL = v("air-700", "Air Mineral Murni Alami 700 ml", "700ml", 9_000, "minuman");
  const BOTOL_1500 = v("air-1500", "Air Mineral Murni Alami 1,5 L", "1.5 L", 8_000, "minuman");
  const GALON = v("air-galon", "Air Mineral Galon Aqua", "19 L", 17_200, "minuman");

  const r = bandingVarian(BOTOL, [BOTOL, BOTOL_1500, GALON])!;

  uji("galon TETAP muncul di tabel — itu informasi yang sah", () =>
    harus.memuat(r.baris.map((b) => b.slug), "air-galon"));

  uji("galon ditandai beda kelas ukuran", () =>
    harus.benar(
      r.baris.find((b) => b.slug === "air-galon")!.ukuranBedaKelas,
      "beda kelas"
    ));

  uji("kemasan sekelas TIDAK ditandai beda kelas", () =>
    harus.salah(
      r.baris.find((b) => b.slug === "air-1500")!.ukuranBedaKelas,
      "beda kelas"
    ));

  uji("klaim hemat TIDAK memakai galon", () => {
    // Kalau galon ikut, hematnya ±93%. Yang benar: vs botol 1,5 L (±58%).
    harus.sama(r.targetHemat, "Air Mineral Murni Alami 1,5 L");
    harus.benar(r.hematPersen < 80, `hemat ${r.hematPersen}% seharusnya wajar`);
  });

  uji("tanpa pembanding sekelas, tidak ada klaim hemat sama sekali", () => {
    const cumaGalon = bandingVarian(BOTOL, [BOTOL, GALON])!;
    harus.sama(cumaGalon.hematPersen, 0);
    harus.sama(cumaGalon.targetHemat, null);
    // Tapi galonnya tetap ditampilkan sebagai pembanding.
    harus.memuat(cumaGalon.baris.map((b) => b.slug), "air-galon");
  });
});
