/**
 * Tren harga & rekomendasi hemat — logika MURNI, tanpa database.
 *
 * Dipisahkan dari `insight.ts` dengan alasan yang sama seperti `pilih.ts`:
 * "apakah ini benar-benar penurunan harga" dan "apa yang layak
 * direkomendasikan" adalah aturan bisnis, dan aturan bisnis yang cuma bisa
 * dijalankan lewat Prisma tidak pernah benar-benar diuji.
 */
import { isRealSource } from "@/lib/source";
import { median } from "@/lib/harga";
import { hargaPerSatuan } from "@/lib/satuan";
import type { Insights } from "@/lib/types";
import type { PriceWithStore } from "./pilih";

/**
 * Berapa produk sebanding yang harus ada sebelum "termurah di kategori ini"
 * boleh diucapkan. Dua produk bukan pasar — itu kebetulan.
 */
export const MIN_PEMBANDING = 3;

/** Penurunan di bawah ini dianggap gerak harga biasa, bukan kabar. */
export const AMBANG_TURUN_PERSEN = -2;

/** Sejauh mana ke belakang riwayat ditengok untuk mencari pembanding. */
export const LANGKAH_KE_BELAKANG = 4;

export type PilihanKategori = {
  slug: string;
  name: string;
  emoji: string;
  unit: string;
  price: number;
  store: string;
};

/**
 * Penurunan harga per toko untuk satu produk.
 *
 * ⚠️ Aturan yang membuat seluruh fungsi ini ada: **hanya bandingkan harga dari
 * jenis sumber yang sama.** Sebelumnya harga NYATA terbaru diadu dengan harga
 * PERKIRAAN lama di toko yang sama, dan selisih di antara keduanya dilaporkan
 * sebagai "harga lagi turun 14%". Itu bukan penurunan harga — itu pergantian
 * sumber data. Di aplikasi yang seluruh gunanya kejujuran data, kabar hemat
 * yang lahir dari salah banding adalah kegagalan yang paling merugikan.
 */
export function penurunanPerToko(
  p: { slug: string; name: string; emoji: string },
  prices: PriceWithStore[]
): Insights["topDrops"] {
  const out: Insights["topDrops"] = [];
  const byStore = new Map<string, PriceWithStore[]>();
  for (const pr of prices) {
    const arr = byStore.get(pr.supermarketId) ?? [];
    arr.push(pr);
    byStore.set(pr.supermarketId, arr);
  }

  for (const [, arr] of byStore) {
    const latest = arr[0];
    if (!latest || !latest.inStock) continue;

    const sejenis = arr.filter(
      (pr) => isRealSource(pr.source) === isRealSource(latest.source)
    );
    if (sejenis.length < 2) continue; // tak ada pembanding yang sah

    const past = sejenis[Math.min(LANGKAH_KE_BELAKANG, sejenis.length - 1)];
    if (!past || past === latest || past.price <= 0) continue;

    const changePct = ((latest.price - past.price) / past.price) * 100;
    if (changePct >= AMBANG_TURUN_PERSEN) continue;

    out.push({
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      store: latest.supermarket.name,
      oldPrice: past.price,
      newPrice: latest.price,
      changePct,
      isReal: isRealSource(latest.source),
    });
  }
  return out;
}

/**
 * Rekomendasi hemat, dihitung dari **harga per satuan**.
 *
 * Versi lama mengadu harga label di dalam satu kategori, lalu menyebut yang
 * angkanya terkecil sebagai "lebih hemat". Di kategori sembako itu berarti
 * gula 1 kg dinyatakan lebih hemat daripada beras 5 kg — perbandingan yang
 * tidak berarti apa-apa, dan angka hematnya karangan.
 *
 * Sekarang: hanya produk dengan basis satuan yang sama yang diadu (Rp/kg
 * dengan Rp/kg), pembandingnya median (tahan terhadap satu harga nyeleneh),
 * dan hematnya dinyatakan per satuan — bukan rupiah yang seolah-olah langsung
 * masuk kantong.
 */
export function rekomendasiPerSatuan(
  byCategory: Map<string, { categoryName: string; picks: PilihanKategori[] }>
): Insights["recommendations"] {
  const out: Insights["recommendations"] = [];

  for (const [, cat] of byCategory) {
    const perBasis = new Map<
      string,
      (PilihanKategori & { perSatuan: number; satuanTampil: string })[]
    >();

    for (const pick of cat.picks) {
      const hs = hargaPerSatuan(pick.price, pick.unit);
      if (!hs) continue; // satuannya tak terbaca — tidak ada dasar membandingkan
      const arr = perBasis.get(hs.basis) ?? [];
      arr.push({ ...pick, perSatuan: hs.nilai, satuanTampil: hs.satuan });
      perBasis.set(hs.basis, arr);
    }

    for (const [, grup] of perBasis) {
      if (grup.length < MIN_PEMBANDING) continue;
      const med = median(grup.map((g) => g.perSatuan));
      if (med === null || med <= 0) continue;

      const termurah = grup.reduce((a, c) => (c.perSatuan < a.perSatuan ? c : a));
      const hematPerSatuan = med - termurah.perSatuan;
      if (hematPerSatuan <= 0) continue;

      out.push({
        categoryName: cat.categoryName,
        pickName: termurah.name,
        pickSlug: termurah.slug,
        pickEmoji: termurah.emoji,
        pickPrice: termurah.price,
        pickUnit: termurah.unit,
        pickStore: termurah.store,
        perSatuan: termurah.perSatuan,
        satuanTampil: termurah.satuanTampil,
        medianPerSatuan: med,
        hematPerSatuan,
        hematPersen: (hematPerSatuan / med) * 100,
        jumlahPembanding: grup.length,
      });
    }
  }

  // Diurutkan dengan PERSEN, bukan rupiah: hemat Rp 5.000/kg di kategori mahal
  // belum tentu lebih berarti daripada Rp 900/L di kategori murah.
  return out.sort((a, b) => b.hematPersen - a.hematPersen).slice(0, 6);
}
