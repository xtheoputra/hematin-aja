/**
 * Mengisi ulang `Product.normalizedName` untuk seluruh produk yang sudah ada.
 *
 * Wajib dijalankan sekali setelah kolomnya ditambahkan (nilai bawaannya ""),
 * dan aman diulang kapan saja — hanya menulis baris yang nilainya berubah.
 * Jalankan lagi setiap kali aturan di lib/normalize.ts berubah, kalau tidak
 * pencarian "cocok persis" akan membandingkan dengan bentuk baku yang basi.
 *
 *   npm run db:normalisasi
 */
import { PrismaClient } from "@prisma/client";
import { normalize } from "../lib/normalize";

const prisma = new PrismaClient();

async function main() {
  const produk = await prisma.product.findMany({
    select: { id: true, name: true, normalizedName: true },
  });

  let diperbarui = 0;
  for (const p of produk) {
    const baru = normalize(p.name);
    if (baru === p.normalizedName) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { normalizedName: baru },
    });
    diperbarui++;
  }

  // Alias dari slug: "indomie-goreng" → "indomie goreng". Gratis, dan langsung
  // menutup kasus pengguna yang menempelkan slug dari URL ke kotak pencarian.
  let alias = 0;
  const semua = await prisma.product.findMany({ select: { id: true, slug: true, name: true } });
  for (const p of semua) {
    const teks = p.slug.replace(/-/g, " ");
    const norm = normalize(teks);
    if (!norm || norm === normalize(p.name)) continue;
    const ada = await prisma.productAlias.findFirst({
      where: { productId: p.id, normalizedAlias: norm },
      select: { id: true },
    });
    if (ada) continue;
    await prisma.productAlias.create({
      data: { productId: p.id, alias: teks, normalizedAlias: norm, source: "slug" },
    });
    alias++;
  }

  console.log("— Hasil —");
  console.log(`  Produk diperiksa      : ${produk.length}`);
  console.log(`  normalizedName ditulis: ${diperbarui}`);
  console.log(`  Alias dari slug dibuat: ${alias}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
