/**
 * Uji lapisan kejujuran data: dari mana harga ini, dan kapan dicek.
 */
import { kelompok, uji, harus } from "./kerangka";
import { isRealSource, sourceKindOf, sourceMeta } from "@/lib/source";
import { AGING_MAX_DAYS, FRESH_MAX_DAYS, freshnessMeta, freshnessOf } from "@/lib/freshness";
import { daysSince, formatAge } from "@/lib/format";

kelompok("sourceKindOf()", () => {
  uji("open-prices = NYATA", () => harus.sama(sourceKindOf("open-prices"), "real"));
  uji("scrape = NYATA", () => harus.sama(sourceKindOf("scrape"), "real"));

  uji("manual = NYATA — bukan perkiraan", () => {
    // Kalau ini gagal, harga yang diketik sendiri lewat /admin akan tampil
    // ke pengguna sebagai "Perkiraan", dan mode Hanya Nyata tetap kosong
    // walau datanya sudah diisi.
    harus.sama(sourceKindOf("manual"), "real");
    harus.benar(isRealSource("manual"));
  });

  uji("seed & import-off = perkiraan", () => {
    harus.sama(sourceKindOf("seed"), "estimate");
    harus.sama(sourceKindOf("import-off"), "estimate");
  });

  uji("sumber tak dikenal dianggap perkiraan, bukan nyata", () => {
    // Bawaan yang aman: yang tidak kita kenali TIDAK boleh naik pangkat
    // jadi "nyata".
    harus.sama(sourceKindOf("entah-dari-mana"), "estimate");
  });

  uji("tanpa sumber = tidak tersedia", () => {
    harus.sama(sourceKindOf(null), "none");
    harus.sama(sourceKindOf(undefined), "none");
    harus.sama(sourceKindOf(""), "none");
  });
});

kelompok("sourceMeta()", () => {
  uji("manual punya label sendiri, bukan label perkiraan", () => {
    const m = sourceMeta("manual");
    harus.sama(m.kind, "real");
    harus.benar(m.badge.toLowerCase().includes("nyata"), "badge menyebut nyata");
  });

  uji("perkiraan memperingatkan untuk cek ke toko", () => {
    harus.benar(sourceMeta("seed").label.toLowerCase().includes("cek harga resmi"));
  });

  uji("setiap sumber punya badge tak kosong", () => {
    for (const s of ["open-prices", "scrape", "manual", "seed", "import-off", null]) {
      harus.benar(sourceMeta(s).badge.length > 0, `badge untuk ${s}`);
    }
  });
});

kelompok("kesegaran data", () => {
  const kini = new Date("2026-08-04T12:00:00Z");
  const hariLalu = (n: number) =>
    new Date(kini.getTime() - n * 86_400_000);

  uji("dicek hari ini = segar", () =>
    harus.sama(freshnessOf(kini, kini), "fresh"));

  uji(`${FRESH_MAX_DAYS} hari masih segar`, () =>
    harus.sama(freshnessOf(hariLalu(FRESH_MAX_DAYS), kini), "fresh"));

  uji(`${FRESH_MAX_DAYS + 1} hari sudah mulai lawas`, () =>
    harus.sama(freshnessOf(hariLalu(FRESH_MAX_DAYS + 1), kini), "aging"));

  uji(`lebih dari ${AGING_MAX_DAYS} hari = kedaluwarsa`, () =>
    harus.sama(freshnessOf(hariLalu(AGING_MAX_DAYS + 1), kini), "stale"));

  uji("hanya yang kedaluwarsa yang ditonjolkan", () => {
    harus.salah(freshnessMeta("fresh").warn);
    harus.salah(freshnessMeta("aging").warn);
    harus.benar(freshnessMeta("stale").warn);
  });

  uji("tanpa tanggal = tidak dinilai", () => harus.sama(freshnessOf(null, kini), null));

  uji("umur dalam bahasa manusia", () => {
    harus.sama(formatAge(kini, kini), "hari ini");
    harus.sama(formatAge(hariLalu(1), kini), "kemarin");
    harus.sama(formatAge(hariLalu(3), kini), "3 hari lalu");
    harus.sama(formatAge(hariLalu(60), kini), "2 bulan lalu");
  });

  uji("tanggal masa depan tidak jadi umur negatif", () => {
    harus.sama(daysSince(new Date(kini.getTime() + 86_400_000), kini), 0);
  });
});
