/**
 * Kondisi data — bahan untuk halaman publik `/data`.
 *
 * Seluruh aplikasi ini berdiri di atas satu klaim: **harga perkiraan tidak
 * pernah disamarkan sebagai harga nyata.** Sampai sekarang klaim itu cuma
 * diucapkan lewat label kecil di kartu harga, dan tidak ada satu pun tempat
 * yang bisa ditanyai "sebenarnya seberapa jauh aplikasi ini boleh dipercaya?".
 *
 * Berkas ini jawabannya, dan sengaja dibuat **publik**, bukan disembunyikan di
 * `/admin`. Angka cakupan yang cuma dilihat pemiliknya adalah angka yang
 * lambat laun dibiarkan buruk.
 *
 * Bagian yang murni hitungan dipisah ke `ringkasKesegaran()` supaya bisa
 * diuji tanpa database.
 */
import { prisma } from "@/lib/db";
import { denganCache, kunciTakBergantungMode, TTL } from "@/lib/cache";
import { daysSince } from "@/lib/format";
import { AGING_MAX_DAYS, FRESH_MAX_DAYS } from "@/lib/freshness";
import { uraiUkuran } from "@/lib/satuan";
import { REAL_SOURCES, pickPerStore, type PriceWithStore } from "./pilih";
import { sertakanHarga, stempelTerbaru } from "./muat";

export type SebaranKesegaran = {
  segar: number;
  lawas: number;
  kedaluwarsa: number;
  total: number;
};

export type BarisCakupan = {
  nama: string;
  slug: string;
  /** Produk yang punya minimal satu harga (mode apa pun). */
  berharga: number;
  /** Produk yang punya minimal satu harga NYATA. */
  nyata: number;
  total: number;
};

export type KondisiData = {
  totalProduk: number;
  totalToko: number;
  totalBarisHarga: number;
  hargaNyata: number;
  /** Produk yang punya ≥ 1 harga nyata. */
  produkBerhargaNyata: number;
  perSumber: { sumber: string; jumlah: number; nyata: boolean }[];
  kesegaran: SebaranKesegaran;
  perKategori: BarisCakupan[];
  perToko: BarisCakupan[];
  satuanTerbaca: number;
  terakhirDicatat: string | null;
};

/**
 * Sebaran umur data. Batasnya sama persis dengan `freshness.ts` — kalau
 * halaman ini memakai batas sendiri, angkanya akan bertentangan dengan label
 * yang tampil di kartu harga.
 */
export function ringkasKesegaran(
  tanggal: (string | Date | null | undefined)[],
  sekarang: Date = new Date()
): SebaranKesegaran {
  let segar = 0;
  let lawas = 0;
  let kedaluwarsa = 0;
  for (const t of tanggal) {
    if (!t) continue;
    const hari = daysSince(t, sekarang);
    if (hari <= FRESH_MAX_DAYS) segar++;
    else if (hari <= AGING_MAX_DAYS) lawas++;
    else kedaluwarsa++;
  }
  return { segar, lawas, kedaluwarsa, total: segar + lawas + kedaluwarsa };
}

export async function kondisiData(sekarang = new Date()): Promise<KondisiData> {
  return denganCache(kunciTakBergantungMode("kondisi-data"), TTL.harga, async () => {
    const stempel = await stempelTerbaru();

    const [toko, kategori, totalBarisHarga, hargaNyata, perSumberMentah, produk] =
      await Promise.all([
        prisma.supermarket.findMany({
          select: { id: true, slug: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.category.findMany({
          select: { id: true, slug: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.price.count(),
        prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
        prisma.price.groupBy({ by: ["source"], _count: { _all: true } }),
        prisma.product.findMany({
          select: {
            id: true,
            unit: true,
            categoryId: true,
            prices: sertakanHarga(stempel),
          },
        }),
      ]);

    // Akumulator cakupan per kategori & per toko.
    const kosong = () => ({ berharga: 0, nyata: 0, total: 0 });
    const perKat = new Map(kategori.map((k) => [k.id, kosong()]));
    const perTok = new Map(toko.map((t) => [t.id, kosong()]));
    for (const t of perTok.values()) t.total = produk.length;

    const tanggalDipakai: string[] = [];
    let produkBerhargaNyata = 0;
    let satuanTerbaca = 0;

    for (const p of produk) {
      if (uraiUkuran(p.unit)) satuanTerbaca++;

      const kat = perKat.get(p.categoryId);
      if (kat) kat.total++;

      const harga = p.prices as PriceWithStore[];
      const perToko = [...pickPerStore(harga, false).values()];
      const adaStok = perToko.filter((s) => s.inStock);
      const punyaNyata = perToko.some((s) => s.isReal);

      if (adaStok.length > 0) {
        if (kat) kat.berharga++;
        // Umur yang dipakai = harga termurah yang benar-benar ditampilkan.
        const termurah = adaStok.reduce((a, c) => (c.price < a.price ? c : a));
        tanggalDipakai.push(termurah.recordedAt);
      }
      if (punyaNyata) {
        produkBerhargaNyata++;
        if (kat) kat.nyata++;
      }

      for (const s of perToko) {
        const t = perTok.get(s.supermarketId);
        if (!t) continue;
        t.berharga++;
        if (s.isReal) t.nyata++;
      }
    }

    const perKategori: BarisCakupan[] = kategori
      .map((k) => ({ nama: k.name, slug: k.slug, ...(perKat.get(k.id) ?? kosong()) }))
      .sort((a, b) => b.nyata - a.nyata || b.berharga - a.berharga);

    const perToko: BarisCakupan[] = toko
      .map((t) => ({ nama: t.name, slug: t.slug, ...(perTok.get(t.id) ?? kosong()) }))
      .sort((a, b) => b.nyata - a.nyata || b.berharga - a.berharga);

    const terbaru = await prisma.price.findFirst({
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true },
    });

    return {
      totalProduk: produk.length,
      totalToko: toko.length,
      totalBarisHarga,
      hargaNyata,
      produkBerhargaNyata,
      perSumber: perSumberMentah
        .map((s) => ({
          sumber: s.source,
          jumlah: s._count._all,
          nyata: REAL_SOURCES.includes(s.source),
        }))
        .sort((a, b) => b.jumlah - a.jumlah),
      kesegaran: ringkasKesegaran(tanggalDipakai, sekarang),
      perKategori,
      perToko,
      satuanTerbaca,
      terakhirDicatat: terbaru?.recordedAt.toISOString() ?? null,
    };
  });
}
