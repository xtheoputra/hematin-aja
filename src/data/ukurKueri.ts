/**
 * Mengukur biaya kueri harga — sebelum & sesudah pembatasan.
 *
 * FASE-1.5 §2.1 meminta angkanya dicatat, bukan diklaim. Skrip ini menjawab
 * satu pertanyaan: berapa baris harga yang benar-benar ditarik untuk menampilkan
 * satu halaman daftar produk, dan berapa lama.
 *
 *   npm run ukur
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUMBER_NYATA = ["open-prices", "scrape", "manual"];

async function ukur<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  const hasil = await fn();
  const ms = performance.now() - t0;
  console.log(`  ${label.padEnd(46)} ${ms.toFixed(0).padStart(5)} ms`);
  return hasil;
}

async function main() {
  console.log("— Bentuk data —");
  const [produk, toko, harga] = await Promise.all([
    prisma.product.count(),
    prisma.supermarket.count(),
    prisma.price.count(),
  ]);
  console.log(`  produk=${produk} toko=${toko} baris harga=${harga}`);

  const kelompok = await prisma.price.groupBy({
    by: ["productId", "supermarketId"],
    _max: { recordedAt: true },
  });
  const stempel = [
    ...new Set(kelompok.map((k) => k._max.recordedAt!.getTime())),
  ];
  console.log(
    `  pasangan produk×toko=${kelompok.length}, stempel waktu terbaru unik=${stempel.length}`
  );

  console.log("\n— CARA LAMA: seluruh riwayat ikut ditarik —");
  const lama = await ukur("findMany produk + SEMUA harga", () =>
    prisma.product.findMany({
      include: {
        category: true,
        prices: { orderBy: { recordedAt: "desc" }, include: { supermarket: true } },
      },
      orderBy: { name: "asc" },
    })
  );
  const barisLama = lama.reduce((n, p) => n + p.prices.length, 0);
  console.log(`  baris harga terbawa: ${barisLama}`);

  console.log("\n— CARA BARU: hanya potret terbaru + semua harga nyata —");
  const baru = await ukur("findMany produk + harga terbatas", () =>
    prisma.product.findMany({
      where: {},
      include: {
        category: true,
        prices: {
          where: {
            OR: [
              { source: { in: SUMBER_NYATA } },
              { recordedAt: { in: stempel.map((t) => new Date(t)) } },
            ],
          },
          orderBy: { recordedAt: "desc" },
          include: { supermarket: { select: { slug: true, name: true, color: true } } },
        },
      },
      orderBy: { name: "asc" },
      take: 24,
    })
  );
  const barisBaru = baru.reduce((n, p) => n + p.prices.length, 0);
  console.log(`  baris harga terbawa: ${barisBaru} (untuk ${baru.length} produk halaman pertama)`);

  console.log(
    `\n  Ringkas: ${barisLama} → ${barisBaru} baris ` +
      `(${barisLama > 0 ? ((1 - barisBaru / barisLama) * 100).toFixed(1) : "0"}% lebih sedikit)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
