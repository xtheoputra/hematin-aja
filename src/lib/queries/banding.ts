import { prisma } from "@/lib/db";
import { denganCache, kunciData, TTL } from "@/lib/cache";
import type {
  CartCompareStore,
  CartCompareLine,
  CompareMatrix,
  StorePrice,
} from "@/lib/types";
import {
  REAL_SOURCES,
  alignedCells,
  minInStock,
  pickPerStore,
  type PriceWithStore,
} from "./pilih";
import { SM_SELECT, sertakanHarga, stempelTerbaru } from "./muat";
import { cariProduk } from "./cari";
import { getLatestRecordedAt } from "./produk";

// Matriks perbandingan: produk (baris) x semua supermarket (kolom).
export async function getCompareMatrix(opts: {
  search?: string;
  category?: string;
  realOnly?: boolean;
  limit?: number;
}): Promise<CompareMatrix> {
  const { search, category, realOnly = false, limit = 60 } = opts;

  return denganCache(
    kunciData("matriks-banding", realOnly, search ?? "", category ?? "", limit),
    TTL.harga,
    async () => {
      let idCocok: string[] | null = null;
      if (search) {
        const r = await cariProduk(search);
        idCocok = r.ids;
      }

      const where = {
        AND: [
          category ? { category: { slug: category } } : {},
          idCocok ? { id: { in: idCocok } } : {},
        ],
      };

      const stempel = await stempelTerbaru();
      const [supermarkets, products, realPriceCount, latestRecordedAt] =
        await Promise.all([
          prisma.supermarket.findMany({ select: SM_SELECT, orderBy: { name: "asc" } }),
          idCocok && idCocok.length === 0
            ? Promise.resolve([])
            : prisma.product.findMany({
                where,
                include: { category: true, prices: sertakanHarga(stempel) },
                orderBy: { name: "asc" },
                take: limit,
              }),
          prisma.price.count({ where: { source: { in: REAL_SOURCES } } }),
          getLatestRecordedAt(),
        ]);

      const rows = products.map((p) => {
        const perStore = pickPerStore(p.prices as PriceWithStore[], realOnly);
        const cells = alignedCells(perStore, supermarkets);
        const min = minInStock(perStore);
        return {
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          unit: p.unit,
          emoji: p.emoji,
          image: p.image,
          categoryName: p.category.name,
          min,
          cells,
        };
      });

      return {
        stores: supermarkets.map((s) => ({
          slug: s.slug,
          name: s.name,
          color: s.color,
          type: s.type,
        })),
        rows,
        realPriceCount,
        latestRecordedAt,
      };
    }
  );
}

// Bandingkan total belanja keranjang di tiap supermarket → cari yang termurah.
export async function compareCart(
  items: { productId: string; qty: number }[],
  realOnly = false
): Promise<CartCompareStore[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.productId);
  const qtyById = new Map(items.map((i) => [i.productId, i.qty]));

  const stempel = await stempelTerbaru();
  const [supermarkets, products] = await Promise.all([
    prisma.supermarket.findMany({ select: SM_SELECT }),
    prisma.product.findMany({
      where: { id: { in: ids } },
      include: { prices: sertakanHarga(stempel) },
    }),
  ]);

  // productId -> supermarketId -> StorePrice
  const priceMap = new Map<string, Map<string, StorePrice>>();
  for (const p of products) {
    priceMap.set(p.id, pickPerStore(p.prices as PriceWithStore[], realOnly));
  }

  const result: CartCompareStore[] = supermarkets.map((sm) => {
    const lines: CartCompareLine[] = products.map((p) => {
      const qty = qtyById.get(p.id) ?? 1;
      const sp = priceMap.get(p.id)?.get(sm.id);
      const available = !!sp && sp.inStock;
      return {
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        qty,
        price: available ? (sp as StorePrice).price : null,
        available,
        isReal: !!sp && sp.isReal,
        sourceKind: sp ? sp.sourceKind : "none",
      };
    });
    const total = lines.reduce(
      (sum, l) => sum + (l.available ? (l.price as number) * l.qty : 0),
      0
    );
    const availableCount = lines.filter((l) => l.available).length;
    const realCount = lines.filter((l) => l.available && l.isReal).length;
    return {
      supermarketId: sm.id,
      slug: sm.slug,
      name: sm.name,
      color: sm.color,
      total,
      availableCount,
      missingCount: lines.length - availableCount,
      realCount,
      lines,
    };
  });

  // Urutkan: kelengkapan barang dulu, lalu total termurah.
  return result.sort(
    (a, b) => b.availableCount - a.availableCount || a.total - b.total
  );
}
