import type { PrismaClient } from "@prisma/client";
import { scrapers } from "../scrapers/registry";
import { log } from "../lib/log";
import {
  catatKeRingkasan,
  ringkasanKosong,
  simpanHarga,
  type RingkasanSimpan,
} from "../lib/simpanHarga";

/**
 * Menjalankan semua scraper AKTIF lalu menyimpan hasilnya ke DB.
 * Dipakai oleh CLI (`npm run scrape`) maupun route on-demand (/api/scrape).
 * Memakai instance prisma yang diberikan (tidak membuat koneksi baru).
 *
 * Tiap adapter di-bungkus try/catch → satu adapter gagal tidak menggagalkan
 * yang lain, dan tidak pernah melempar error ke pemanggil.
 *
 * Penyimpanan diserahkan ke `simpanHarga()` supaya validasi & aturan dedup-nya
 * sama persis dengan jalur Open Prices dan input manual.
 */
export type ScrapeResult = {
  ran: string[];
  inserted: number;
  skipped: number;
  /** Ditolak validasi harga — dibedakan dari "dilewati", karena artinya beda. */
  rejected: number;
  failed: string[];
  byStore: Record<string, number>;
};

export async function runScrapers(
  prisma: PrismaClient,
  opts: { only?: string[] } = {}
): Promise<ScrapeResult> {
  const active = scrapers.filter(
    (s) => s.enabled && (!opts.only || opts.only.includes(s.slug))
  );
  const result: ScrapeResult = {
    ran: [],
    inserted: 0,
    skipped: 0,
    rejected: 0,
    failed: [],
    byStore: {},
  };
  if (active.length === 0) {
    await log.info("scrape", "Tidak ada adapter aktif — tidak ada yang dijalankan");
    return result;
  }

  const [products, supermarkets] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.supermarket.findMany({ select: { id: true, slug: true } }),
  ]);
  const productId = new Map(products.map((p) => [p.slug, p.id]));
  const supermarketId = new Map(supermarkets.map((s) => [s.slug, s.id]));

  const now = new Date();

  for (const scraper of active) {
    let rows;
    try {
      rows = await scraper.run();
    } catch (e) {
      result.failed.push(scraper.slug);
      // Adapter yang mati DIAM-DIAM adalah kegagalan terburuk: tampilan tetap
      // normal sementara harga diam-diam basi. Karena itu dicatat, bukan cuma
      // ditandai di objek balasan yang hilang begitu request selesai.
      await log.galat("scrape", `Adapter "${scraper.slug}" gagal dijalankan`, {
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }
    result.ran.push(scraper.slug);
    const source = scraper.source ?? "scrape";
    const ringkas: RingkasanSimpan = ringkasanKosong();

    for (const r of rows) {
      const pid = productId.get(r.productSlug);
      const sid = supermarketId.get(r.supermarketSlug);
      if (!pid || !sid) {
        result.skipped++;
        continue;
      }
      const hasil = await simpanHarga(prisma, {
        productId: pid,
        supermarketId: sid,
        price: Number(r.price),
        inStock: r.inStock ?? true,
        url: r.url ?? null,
        source,
        recordedAt: now,
      });
      catatKeRingkasan(ringkas, hasil);

      if (hasil.status === "disimpan" || hasil.status === "diperbarui") {
        result.inserted++;
        result.byStore[r.supermarketSlug] = (result.byStore[r.supermarketSlug] ?? 0) + 1;
      } else if (hasil.status === "ditolak") {
        result.rejected++;
      } else {
        result.skipped++;
      }
    }

    await log.info(
      "scrape",
      `Adapter "${scraper.slug}": ${rows.length} baris dibaca`,
      ringkas
    );
  }

  await log.info("scrape", "Selesai", {
    dijalankan: result.ran,
    gagal: result.failed,
    masuk: result.inserted,
    dilewati: result.skipped,
    ditolak: result.rejected,
  });

  return result;
}
