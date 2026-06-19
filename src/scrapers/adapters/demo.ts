import { PrismaClient } from "@prisma/client";
import type { Scraper, ScrapedPrice } from "../types";

/**
 * Scraper DEMO — TIDAK mengakses internet.
 * Mengambil harga terakhir di DB lalu menggesernya sedikit (naik/turun)
 * untuk mensimulasikan hasil scraping baru. Berguna untuk:
 *   - menguji pipeline `npm run scrape` end-to-end
 *   - menumbuhkan riwayat harga (grafik tren) tanpa situs nyata
 *
 * Ganti / nonaktifkan ini begitu adapter toko sungguhan sudah jalan.
 */

const prisma = new PrismaClient();

export const demoScraper: Scraper = {
  slug: "demo",
  name: "Demo (simulasi)",
  enabled: true,
  async run(): Promise<ScrapedPrice[]> {
    const products = await prisma.product.findMany({
      include: {
        prices: {
          orderBy: { recordedAt: "desc" },
          include: { supermarket: true },
        },
      },
    });

    const out: ScrapedPrice[] = [];
    let i = 0;
    for (const p of products) {
      const seen = new Set<string>();
      for (const pr of p.prices) {
        if (seen.has(pr.supermarketId)) continue; // hanya harga terbaru per toko
        seen.add(pr.supermarketId);
        // pergeseran -6%..+6% deterministik (tanpa Math.random agar reproducible)
        const wobble = ((((i++ * 2654435761) >>> 0) % 1200) - 600) / 10000;
        const next = Math.max(500, Math.round((pr.price * (1 + wobble)) / 100) * 100);
        out.push({
          productSlug: p.slug,
          supermarketSlug: pr.supermarket.slug,
          price: next,
          inStock: true,
        });
      }
    }
    await prisma.$disconnect();
    return out;
  },
};
