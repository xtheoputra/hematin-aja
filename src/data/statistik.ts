/**
 * Potret isi database dalam satu perintah: berapa produk, berapa harga, dan
 * — yang paling penting untuk proyek ini — berapa yang NYATA vs perkiraan.
 *
 * Ada karena angka itu satu-satunya ukuran kemajuan Fase 1, dan sebelumnya
 * tidak ada cara melihatnya selain membuka Prisma Studio.
 *
 *   npm run db:statistik
 */
import { PrismaClient } from "@prisma/client";
import { isRealSource } from "../lib/source";
import { formatAge } from "../lib/format";

const prisma = new PrismaClient();

async function main() {
  const [produk, toko, harga, alias, perSumber, kosong, terbaru] =
    await Promise.all([
      prisma.product.count(),
      prisma.supermarket.count(),
      prisma.price.count(),
      prisma.productAlias.count(),
      prisma.price.groupBy({ by: ["source"], _count: { _all: true } }),
      prisma.product.count({ where: { normalizedName: "" } }),
      prisma.price.findFirst({
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      }),
    ]);

  const nyata = perSumber
    .filter((s) => isRealSource(s.source))
    .reduce((n, s) => n + s._count._all, 0);

  console.log("— Isi database —");
  console.log(`  Produk            : ${produk}`);
  console.log(`  Supermarket       : ${toko}`);
  console.log(`  Alias produk      : ${alias}`);
  console.log(`  Baris harga       : ${harga}`);
  console.log(
    `  Harga NYATA       : ${nyata}` +
      (harga > 0 ? ` (${((nyata / harga) * 100).toFixed(2)}% dari total)` : "")
  );
  console.log("\n— Per sumber —");
  for (const s of [...perSumber].sort((a, b) => b._count._all - a._count._all)) {
    const tanda = isRealSource(s.source) ? "NYATA    " : "perkiraan";
    console.log(`  ${tanda} ${s.source.padEnd(12)} ${s._count._all}`);
  }

  if (terbaru) {
    console.log(
      `\n  Harga terakhir dicatat: ${terbaru.recordedAt.toISOString().slice(0, 10)} (${formatAge(terbaru.recordedAt)})`
    );
  }
  if (kosong > 0) {
    console.log(
      `\n⚠️  ${kosong} produk belum punya normalizedName — jalankan: npm run db:normalisasi`
    );
  }

  const gagal = await prisma.searchLog.count({ where: { resultCount: 0 } });
  const totalCari = await prisma.searchLog.count();
  if (totalCari > 0) {
    console.log(
      `\n  Pencarian tercatat: ${totalCari}, di antaranya GAGAL (0 hasil): ${gagal}`
    );
    const teratas = await prisma.searchLog.findMany({
      where: { resultCount: 0 },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { query: true },
    });
    if (teratas.length) {
      console.log("  Kueri gagal terakhir:", teratas.map((t) => `"${t.query}"`).join(", "));
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
