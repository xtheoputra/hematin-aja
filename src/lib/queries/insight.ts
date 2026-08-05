import { prisma } from "@/lib/db";
import { isRealSource } from "@/lib/source";
import { denganCache, kunciData, TTL } from "@/lib/cache";
import type { Insights } from "@/lib/types";
import { REAL_SOURCES, pickPerStore, type PriceWithStore } from "./pilih";
import { STEMPEL_UNTUK_TREN, sertakanHarga, stempelTeratas } from "./muat";
import { penurunanPerToko, rekomendasiPerSatuan, type PilihanKategori } from "./tren";

export async function getInsights(realOnly = false): Promise<Insights> {
  return denganCache(kunciData("insight", realOnly), TTL.harga, async () => {
    // Halaman ini butuh BEBERAPA titik riwayat (untuk menghitung penurunan
    // harga), bukan cuma titik terakhir — jadi batasnya beberapa stempel waktu
    // terbaru, bukan satu. 16.390 → ~4.900 baris, dan hasilnya di-cache.
    const stempel = await stempelTeratas(STEMPEL_UNTUK_TREN);
    const [products, realPriceCount] = await Promise.all([
      prisma.product.findMany({
        include: { category: true, prices: sertakanHarga(stempel) },
      }),
      prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
    ]);

    const drops: Insights["topDrops"] = [];
    const winCount = new Map<string, { name: string; color: string; wins: number }>();
    const byCategory = new Map<string, { categoryName: string; picks: PilihanKategori[] }>();

    for (const p of products) {
      const allPrices = p.prices as PriceWithStore[];
      // Di mode "real" hanya pertimbangkan harga nyata.
      const prices = realOnly
        ? allPrices.filter((pr) => isRealSource(pr.source))
        : allPrices;
      const stores = [...pickPerStore(prices, false).values()].filter((s) => s.inStock);
      if (stores.length === 0) continue;
      const cheapest = [...stores].sort((a, b) => a.price - b.price)[0];

      const w = winCount.get(cheapest.supermarketSlug) ?? {
        name: cheapest.supermarketName,
        color: cheapest.color,
        wins: 0,
      };
      w.wins += 1;
      winCount.set(cheapest.supermarketSlug, w);

      const cat = byCategory.get(p.categoryId) ?? {
        categoryName: p.category.name,
        picks: [],
      };
      cat.picks.push({
        slug: p.slug,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        price: cheapest.price,
        store: cheapest.supermarketName,
      });
      byCategory.set(p.categoryId, cat);

      drops.push(...penurunanPerToko(p, prices));
    }

    drops.sort((a, b) => a.changePct - b.changePct);

    let cheapestStoreOverall: Insights["cheapestStoreOverall"] = null;
    const totalWins = [...winCount.values()].reduce((s, w) => s + w.wins, 0);
    if (totalWins > 0) {
      const best = [...winCount.values()].sort((a, b) => b.wins - a.wins)[0];
      cheapestStoreOverall = {
        name: best.name,
        color: best.color,
        winRate: (best.wins / totalWins) * 100,
      };
    }

    return {
      topDrops: drops.slice(0, 6),
      cheapestStoreOverall,
      recommendations: rekomendasiPerSatuan(byCategory),
      realPriceCount,
    };
  });
}
