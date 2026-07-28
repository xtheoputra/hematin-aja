import type { PrismaClient } from "@prisma/client";
import { scrapers } from "../scrapers/registry";

/**
 * Menjalankan semua scraper AKTIF lalu menyimpan hasilnya ke DB.
 * Dipakai oleh CLI (`npm run scrape`) maupun route on-demand (/api/scrape).
 * Memakai instance prisma yang diberikan (tidak membuat koneksi baru).
 *
 * Tiap adapter di-bungkus try/catch → satu adapter gagal tidak menggagalkan
 * yang lain, dan tidak pernah melempar error ke pemanggil.
 */
export type ScrapeResult = {
  ran: string[];
  inserted: number;
  skipped: number;
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
    failed: [],
    byStore: {},
  };
  if (active.length === 0) return result;

  const [products, supermarkets] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.supermarket.findMany({ select: { id: true, slug: true } }),
  ]);
  const productId = new Map(products.map((p) => [p.slug, p.id]));
  const supermarketId = new Map(supermarkets.map((s) => [s.slug, s.id]));

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  for (const scraper of active) {
    let rows;
    try {
      rows = await scraper.run();
    } catch {
      result.failed.push(scraper.slug);
      continue;
    }
    result.ran.push(scraper.slug);
    const source = scraper.source ?? "scrape";

    for (const r of rows) {
      const pid = productId.get(r.productSlug);
      const sid = supermarketId.get(r.supermarketSlug);
      const price = Math.round(Number(r.price));
      if (!pid || !sid || !Number.isFinite(price) || price <= 0) {
        result.skipped++;
        continue;
      }
      // Dedup: satu harga per produk+toko+source per hari.
      const exists = await prisma.price.findFirst({
        where: {
          productId: pid,
          supermarketId: sid,
          source,
          recordedAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (exists) {
        result.skipped++;
        continue;
      }
      await prisma.price.create({
        data: {
          productId: pid,
          supermarketId: sid,
          price,
          inStock: r.inStock ?? true,
          url: r.url ?? null,
          source,
          recordedAt: now,
        },
      });
      result.inserted++;
      result.byStore[r.supermarketSlug] =
        (result.byStore[r.supermarketSlug] ?? 0) + 1;
    }
  }

  return result;
}
