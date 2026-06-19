/**
 * Runner scraping: jalankan semua adapter aktif, lalu simpan hasilnya ke DB
 * sebagai catatan harga BARU (source="scrape", recordedAt=now).
 * Karena tiap run membuat baris baru, riwayat/tren harga otomatis terbangun.
 *
 * Jalankan: npm run scrape
 */
import { PrismaClient } from "@prisma/client";
import { scrapers } from "./registry";

const prisma = new PrismaClient();

async function main() {
  const active = scrapers.filter((s) => s.enabled);
  if (active.length === 0) {
    console.log("Tidak ada scraper aktif. Aktifkan salah satu di src/scrapers/registry.ts");
    return;
  }

  // Cache slug -> id agar tidak query berulang.
  const [products, supermarkets] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.supermarket.findMany({ select: { id: true, slug: true } }),
  ]);
  const productId = new Map(products.map((p) => [p.slug, p.id]));
  const supermarketId = new Map(supermarkets.map((s) => [s.slug, s.id]));

  const now = new Date();
  let totalSaved = 0;

  for (const scraper of active) {
    console.log(`\n🔎 Menjalankan scraper: ${scraper.name} (${scraper.slug})`);
    let results;
    try {
      results = await scraper.run();
    } catch (err) {
      console.error(`  ❌ ${scraper.slug} gagal:`, (err as Error).message);
      continue;
    }

    const rows = [];
    let skipped = 0;
    for (const r of results) {
      const pid = productId.get(r.productSlug);
      const sid = supermarketId.get(r.supermarketSlug);
      if (!pid || !sid) {
        skipped++;
        continue; // produk/toko belum ada di DB
      }
      rows.push({
        productId: pid,
        supermarketId: sid,
        price: r.price,
        inStock: r.inStock ?? true,
        url: r.url ?? null,
        source: "scrape",
        recordedAt: now,
      });
    }

    if (rows.length > 0) {
      await prisma.price.createMany({ data: rows });
    }
    totalSaved += rows.length;
    console.log(
      `  ✅ ${rows.length} harga tersimpan${skipped ? `, ${skipped} dilewati (slug tak cocok)` : ""}`
    );
  }

  console.log(`\n🎉 Selesai. Total ${totalSaved} catatan harga baru tersimpan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
