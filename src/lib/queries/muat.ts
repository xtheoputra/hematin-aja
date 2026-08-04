/**
 * Pemuatan harga secukupnya.
 *
 * Masalah yang dijawab: `priceInclude` yang lama tidak punya `take`, sehingga
 * membuka beranda menarik **seluruh 16.390 baris riwayat harga** — dan sifatnya
 * makin buruk selamanya, karena tiap kali scraper jalan riwayatnya bertambah.
 *
 * Kuncinya: yang dibutuhkan halaman daftar cuma **satu harga per toko**, bukan
 * riwayatnya. Tapi tidak bisa asal `take: 20` — mode "Semua" mengutamakan harga
 * NYATA walau tanggalnya lebih tua, jadi memotong berdasarkan tanggal saja bisa
 * membuang justru harga yang paling berharga.
 *
 * Jadi yang ditarik = **gabungan dua himpunan kecil**:
 *   1. semua harga NYATA (jumlahnya sedikit; itu memang barang langka di sini)
 *   2. baris pada stempel waktu terbaru tiap pasangan produk×toko
 *
 * Keduanya bersama dijamin memuat harga terbaru per toko DAN harga nyata per
 * toko — persis dua hal yang dibaca `pickPerStore()`.
 *
 * Terukur: 16.390 → 399 baris, 353 ms → 35 ms (`npm run ukur`).
 */
import { prisma } from "@/lib/db";
import { denganCache, kunciTakBergantungMode, TTL } from "@/lib/cache";
import { REAL_SOURCES } from "./pilih";

/** Kolom toko yang benar-benar dipakai UI — bukan seluruh baris supermarket. */
export const TOKO_RINGKAS = { slug: true, name: true, color: true } as const;

export const SM_SELECT = {
  id: true,
  slug: true,
  name: true,
  color: true,
  type: true,
} as const;

/**
 * Stempel waktu harga terakhir untuk tiap pasangan (produk × toko).
 * Di data sekarang: 1.648 pasangan, tapi hanya **9 stempel unik** — sehingga
 * saringan `recordedAt IN (…)` tetap mungil.
 */
export async function stempelTerbaru(): Promise<Date[]> {
  return denganCache(kunciTakBergantungMode("stempel-terbaru"), TTL.harga, async () => {
    const kelompok = await prisma.price.groupBy({
      by: ["productId", "supermarketId"],
      _max: { recordedAt: true },
    });
    const unik = new Set<number>();
    for (const k of kelompok) {
      const t = k._max.recordedAt;
      if (t) unik.add(t.getTime());
    }
    return [...unik].map((t) => new Date(t));
  });
}

/**
 * `n` stempel waktu terbaru di seluruh tabel. Dipakai halaman insight yang
 * memang butuh beberapa titik riwayat (untuk menghitung penurunan harga),
 * bukan cuma titik terakhir.
 */
export async function stempelTeratas(n: number): Promise<Date[]> {
  return denganCache(kunciTakBergantungMode("stempel-teratas", n), TTL.harga, async () => {
    const kelompok = await prisma.price.groupBy({
      by: ["recordedAt"],
      orderBy: { recordedAt: "desc" },
      take: n,
    });
    return kelompok.map((k) => k.recordedAt);
  });
}

/**
 * Klausa `include` untuk harga yang sudah dibatasi.
 *
 * Sengaja TANPA `as const` di seluruh objek: itu membuat larik `OR` jadi
 * readonly, dan Prisma menolaknya. Yang perlu dikunci hanya nilai `"desc"`,
 * supaya tidak melebar jadi `string` dan inferensi tipe hasilnya tetap utuh.
 */
export function sertakanHarga(stempel: Date[]) {
  return {
    where: {
      OR: [{ source: { in: REAL_SOURCES } }, { recordedAt: { in: stempel } }],
    },
    orderBy: { recordedAt: "desc" as const },
    include: { supermarket: { select: TOKO_RINGKAS } },
  };
}

/**
 * Riwayat penuh — HANYA untuk halaman detail satu produk, tempat grafik trennya
 * memang menampilkan seluruh titik. Satu produk = ~165 baris, bukan 16.390.
 */
export const SERTAKAN_RIWAYAT_PENUH = {
  orderBy: { recordedAt: "desc" },
  include: { supermarket: { select: TOKO_RINGKAS } },
} as const;

/** Berapa stempel riwayat yang cukup untuk menghitung tren di halaman insight. */
export const STEMPEL_UNTUK_TREN = 6;
