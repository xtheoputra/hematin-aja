import { PrismaClient } from "@prisma/client";
import type { Scraper, ScrapedPrice } from "../types";

/**
 * Scraper DEMO — TIDAK mengakses internet & BUKAN harga nyata.
 * Mengambil harga terakhir di DB lalu menggesernya sedikit untuk menguji
 * pipeline `npm run scrape` end-to-end tanpa situs nyata.
 *
 * PENTING (kejujuran data): hasilnya disimpan dengan source "scrape-demo"
 * sehingga DITANDAI "Perkiraan", BUKAN "Nyata". Nonaktif secara default —
 * hanya untuk pengembangan. Ganti dengan adapter toko sungguhan.
 */
export const demoScraper: Scraper = {
  slug: "demo",
  name: "Demo (simulasi)",
  enabled: false,
  source: "scrape-demo",
  async run(): Promise<ScrapedPrice[]> {
    const prisma = new PrismaClient();
    try {
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
      return out;
    } finally {
      await prisma.$disconnect();
    }
  },
};
