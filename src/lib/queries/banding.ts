import { prisma } from "@/lib/db";
import { denganCache, kunciData, TTL } from "@/lib/cache";
import type { CompareMatrix } from "@/lib/types";
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
