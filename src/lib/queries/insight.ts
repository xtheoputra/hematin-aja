import { prisma } from "@/lib/db";
import { isRealSource } from "@/lib/source";
import { denganCache, kunciData, TTL } from "@/lib/cache";
import type { Insights } from "@/lib/types";
import { REAL_SOURCES, pickPerStore, type PriceWithStore } from "./pilih";
import { STEMPEL_UNTUK_TREN, sertakanHarga, stempelTeratas } from "./muat";

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
    const byCategory = new Map<
      string,
      {
        categoryName: string;
        picks: { slug: string; name: string; emoji: string; price: number; store: string }[];
      }
    >();

    for (const p of products) {
      const allPrices = p.prices as PriceWithStore[];
      // Di mode "real" hanya pertimbangkan harga nyata.
      const prices = realOnly
        ? allPrices.filter((pr) => isRealSource(pr.source))
        : allPrices;
      const stores = [...pickPerStore(prices, false).values()].filter((s) => s.inStock);
      if (stores.length === 0) continue;
      const sorted = [...stores].sort((a, b) => a.price - b.price);
      const cheapest = sorted[0];

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
        price: cheapest.price,
        store: cheapest.supermarketName,
      });
      byCategory.set(p.categoryId, cat);

      // drop terbesar per toko: harga terbaru vs beberapa titik lalu
      const byStore = new Map<string, PriceWithStore[]>();
      for (const pr of prices) {
        const arr = byStore.get(pr.supermarketId) ?? [];
        arr.push(pr);
        byStore.set(pr.supermarketId, arr);
      }
      for (const [, arr] of byStore) {
        const latest = arr[0];
        const past = arr[Math.min(4, arr.length - 1)];
        if (!latest || !past || past.price <= 0) continue;
        const changePct = ((latest.price - past.price) / past.price) * 100;
        if (changePct < -2 && latest.inStock) {
          drops.push({
            slug: p.slug,
            name: p.name,
            emoji: p.emoji,
            store: latest.supermarket.name,
            oldPrice: past.price,
            newPrice: latest.price,
            changePct,
          });
        }
      }
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

    const recommendations: Insights["recommendations"] = [];
    for (const [, cat] of byCategory) {
      if (cat.picks.length < 2) continue;
      const avg = cat.picks.reduce((s, p) => s + p.price, 0) / cat.picks.length;
      const cheapest = [...cat.picks].sort((a, b) => a.price - b.price)[0];
      const saving = Math.round(avg - cheapest.price);
      if (saving <= 0) continue;
      recommendations.push({
        categoryName: cat.categoryName,
        pickName: cheapest.name,
        pickSlug: cheapest.slug,
        pickEmoji: cheapest.emoji,
        pickPrice: cheapest.price,
        pickStore: cheapest.store,
        comparedTo: `rata-rata ${cat.categoryName.toLowerCase()}`,
        saving,
      });
    }
    recommendations.sort((a, b) => b.saving - a.saving);

    return {
      topDrops: drops.slice(0, 6),
      cheapestStoreOverall,
      recommendations: recommendations.slice(0, 6),
      realPriceCount,
    };
  });
}
