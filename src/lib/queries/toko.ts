import { prisma } from "@/lib/db";
import { denganCache, kunciData, TTL } from "@/lib/cache";
import type {
  SupermarketSummary,
  SupermarketDetail,
  SupermarketProductRow,
} from "@/lib/types";
import { pickPerStore, type PriceWithStore } from "./pilih";
import { sertakanHarga, stempelTerbaru } from "./muat";

// Ringkasan semua supermarket + statistik posisi harga.
export async function getSupermarkets(
  realOnly = false
): Promise<SupermarketSummary[]> {
  return denganCache(kunciData("ringkasan-toko", realOnly), TTL.harga, async () => {
    const stempel = await stempelTerbaru();
    const [supermarkets, products] = await Promise.all([
      prisma.supermarket.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ select: { id: true, prices: sertakanHarga(stempel) } }),
    ]);

    type Acc = {
      stocked: number;
      real: number;
      wins: number;
      ratioSum: number;
      ratioN: number;
    };
    const acc = new Map<string, Acc>();
    const get = (id: string) =>
      acc.get(id) ?? { stocked: 0, real: 0, wins: 0, ratioSum: 0, ratioN: 0 };

    for (const p of products) {
      const stores = [
        ...pickPerStore(p.prices as PriceWithStore[], realOnly).values(),
      ].filter((s) => s.inStock);
      if (stores.length === 0) continue;
      const min = Math.min(...stores.map((s) => s.price));
      const cheapest = [...stores].sort((a, b) => a.price - b.price)[0];

      for (const s of stores) {
        const a = get(s.supermarketId);
        a.stocked += 1;
        if (s.isReal) a.real += 1;
        if (min > 0) {
          a.ratioSum += s.price / min;
          a.ratioN += 1;
        }
        acc.set(s.supermarketId, a);
      }
      const w = get(cheapest.supermarketId);
      w.wins += 1;
      acc.set(cheapest.supermarketId, w);
    }

    return supermarkets
      .map((sm) => {
        const a = get(sm.id);
        return {
          slug: sm.slug,
          name: sm.name,
          color: sm.color,
          type: sm.type,
          tagline: sm.tagline,
          outlets: sm.outlets,
          website: sm.website,
          productCount: a.stocked,
          realProductCount: a.real,
          wins: a.wins,
          winRate: a.stocked > 0 ? (a.wins / a.stocked) * 100 : 0,
          priceIndex: a.ratioN > 0 ? Math.round((a.ratioSum / a.ratioN) * 100) : 100,
        };
      })
      .sort((a, b) => a.priceIndex - b.priceIndex); // termurah dulu
  });
}

// Profil satu supermarket + daftar produk yang dijualnya.
export async function getSupermarketDetail(
  slug: string,
  realOnly = false
): Promise<SupermarketDetail | null> {
  return denganCache(kunciData("detail-toko", realOnly, slug), TTL.harga, async () => {
    const summaries = await getSupermarkets(realOnly);
    const summary = summaries.find((s) => s.slug === slug);
    if (!summary) return null;

    const stempel = await stempelTerbaru();
    const products = await prisma.product.findMany({
      include: { category: true, prices: sertakanHarga(stempel) },
    });

    const rows: SupermarketProductRow[] = [];
    for (const p of products) {
      const perStore = pickPerStore(p.prices as PriceWithStore[], realOnly);
      const here = [...perStore.values()].find((s) => s.supermarketSlug === slug);
      if (!here) continue; // toko ini tidak punya harga produk tsb (di mode aktif)
      const inStock = [...perStore.values()].filter((s) => s.inStock);
      const min = inStock.length ? Math.min(...inStock.map((s) => s.price)) : here.price;
      const cheapest = [...inStock].sort((a, b) => a.price - b.price)[0];
      rows.push({
        slug: p.slug,
        name: p.name,
        emoji: p.emoji,
        image: p.image,
        unit: p.unit,
        categoryName: p.category.name,
        price: here.price,
        inStock: here.inStock,
        isCheapest: here.inStock && here.price === min,
        vsMin: here.price - min,
        cheapestStore: cheapest?.supermarketName ?? here.supermarketName,
        isReal: here.isReal,
        source: here.source,
        sourceKind: here.sourceKind,
      });
    }

    rows.sort(
      (a, b) => Number(b.isCheapest) - Number(a.isCheapest) || a.vsMin - b.vsMin
    );

    return { ...summary, products: rows };
  });
}
