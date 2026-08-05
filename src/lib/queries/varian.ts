/**
 * Lapisan data untuk perbandingan varian ukuran.
 *
 * Seperti `queries/agen.ts`: mengambil secukupnya, lalu menyerahkan seluruh
 * penilaian ke logika murni (`@/lib/varian`). Tidak ada aturan keputusan di
 * berkas ini.
 */
import { prisma } from "@/lib/db";
import { denganCache, kunciData, TTL } from "@/lib/cache";
import { bandingVarian, type HasilVarian, type ProdukVarian } from "@/lib/varian";
import { pickPerStore, type PriceWithStore } from "./pilih";
import { sertakanHarga, stempelTerbaru } from "./muat";

export async function varianProduk(
  slug: string,
  realOnly = false
): Promise<HasilVarian | null> {
  return denganCache(kunciData("varian", realOnly, slug), TTL.harga, async () => {
    const ini = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true },
    });
    if (!ini) return null;

    const stempel = await stempelTerbaru();
    // Hanya sekategori — gerbang "sejenis" yang lebih ketat dikerjakan logika
    // murni, tapi menyaring kategori di database menghindari menarik seluruh
    // katalog hanya untuk dibuang.
    const sekategori = await prisma.product.findMany({
      where: { categoryId: ini.categoryId },
      include: { category: true, prices: sertakanHarga(stempel) },
    });

    const keVarian = (p: (typeof sekategori)[number]): ProdukVarian | null => {
      const adaStok = [
        ...pickPerStore(p.prices as PriceWithStore[], realOnly).values(),
      ].filter((s) => s.inStock);
      if (adaStok.length === 0) return null;
      const termurah = adaStok.reduce((a, c) => (c.price < a.price ? c : a));
      return {
        slug: p.slug,
        nama: p.name,
        emoji: p.emoji,
        satuan: p.unit,
        categorySlug: p.category.slug,
        harga: termurah.price,
        toko: termurah.supermarketName,
        nyata: termurah.isReal,
      };
    };

    const semua = sekategori
      .map(keVarian)
      .filter((v): v is ProdukVarian => v !== null);
    const dibuka = semua.find((v) => v.slug === slug);
    if (!dibuka) return null;

    return bandingVarian(dibuka, semua);
  });
}
