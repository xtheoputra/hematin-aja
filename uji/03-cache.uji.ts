/**
 * Uji cache — terutama satu aturan yang kalau bocor membatalkan seluruh fitur
 * kejujuran data: **kunci cache wajib memuat `realOnly`**. Tanpa itu, pengguna
 * mode "Hanya Nyata" bisa disuguhi hasil mode "Semua" dari cache, yaitu harga
 * PERKIRAAN yang tampil sebagai harga NYATA.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  ambilCache,
  batalkanCache,
  denganCache,
  kunciData,
  kunciTakBergantungMode,
  simpanCache,
  statistikCache,
  TTL,
} from "@/lib/cache";

kelompok("kunciData()", () => {
  uji("mode Semua dan Hanya Nyata TIDAK pernah berbagi kunci", () => {
    const a = kunciData("daftar-produk", false, "indomie", "makanan-instan", 24, 0);
    const b = kunciData("daftar-produk", true, "indomie", "makanan-instan", 24, 0);
    harus.benar(a !== b, "kunci mode all vs real");
  });

  uji("mode ikut terbaca di kuncinya", () => {
    harus.memuat(kunciData("x", true).split("|"), "real");
    harus.memuat(kunciData("x", false).split("|"), "all");
  });

  uji("kueri berbeda menghasilkan kunci berbeda", () => {
    harus.benar(
      kunciData("d", false, "indomie") !== kunciData("d", false, "aqua")
    );
  });

  uji("null & undefined tidak menyamarkan kunci", () => {
    harus.benar(kunciData("d", false, null, "a") !== kunciData("d", false, "a", null));
  });

  uji("kunci tak-bergantung-mode menyatakan dirinya begitu", () => {
    harus.memuat(kunciTakBergantungMode("stempel").split("|"), "semua-mode");
  });
});

kelompok("simpan & ambil", () => {
  uji("nilai kembali utuh", () => {
    batalkanCache();
    simpanCache("k1", { a: 1 }, 10_000);
    harus.sama(ambilCache<{ a: number }>("k1"), { a: 1 });
  });

  uji("kunci yang belum ada = undefined", () => {
    batalkanCache();
    harus.sama(ambilCache("belum-ada"), undefined);
  });

  uji("entri kedaluwarsa tidak dikembalikan", async () => {
    batalkanCache();
    simpanCache("k2", "lama", 1);
    await new Promise((r) => setTimeout(r, 15));
    harus.sama(ambilCache("k2"), undefined);
  });
});

kelompok("denganCache()", () => {
  uji("pengambilan kedua tidak memanggil ulang sumbernya", async () => {
    batalkanCache();
    let panggil = 0;
    const ambil = async () => {
      panggil++;
      return panggil;
    };
    harus.sama(await denganCache("k3", TTL.cari, ambil), 1);
    harus.sama(await denganCache("k3", TTL.cari, ambil), 1);
    harus.sama(panggil, 1, "jumlah pemanggilan sumber");
  });

  uji("dua mode diambil terpisah, tidak saling menimpa", async () => {
    batalkanCache();
    const kAll = kunciData("uji-mode", false);
    const kReal = kunciData("uji-mode", true);
    harus.sama(await denganCache(kAll, TTL.cari, async () => "semua"), "semua");
    harus.sama(await denganCache(kReal, TTL.cari, async () => "nyata"), "nyata");
    harus.sama(ambilCache(kAll), "semua");
    harus.sama(ambilCache(kReal), "nyata");
  });
});

kelompok("batalkanCache()", () => {
  uji("tanpa awalan membuang semuanya", () => {
    batalkanCache();
    simpanCache("a", 1, 10_000);
    simpanCache("b", 2, 10_000);
    harus.sama(batalkanCache(), 2);
    harus.sama(statistikCache().entri, 0);
  });

  uji("dengan awalan hanya membuang yang cocok", () => {
    batalkanCache();
    simpanCache("daftar-produk|all|x", 1, 10_000);
    simpanCache("daftar-produk|real|x", 2, 10_000);
    simpanCache("insight|all", 3, 10_000);
    harus.sama(batalkanCache("daftar-produk"), 2);
    harus.sama(statistikCache().entri, 1);
  });
});
