/**
 * Runner scraping (CLI): jalankan semua adapter aktif, simpan hasil ke DB.
 * Jalankan: npm run scrape
 * (Versi tombol di UI memakai /api/scrape dengan logika yang sama.)
 */
// Memakai klien bersama, bukan `new PrismaClient()`: pencatatan log menulis
// lewat klien yang sama, dan dua koneksi ke satu berkas SQLite mengundang
// "database is locked".
import { prisma } from "../lib/db";
import { runScrapers } from "../data/runScrapers";

async function main() {
  console.log("🔎 Menjalankan scraper aktif...");
  const r = await runScrapers(prisma);
  console.log("\n— Hasil —");
  console.log(`  Adapter dijalankan : ${r.ran.join(", ") || "(tidak ada aktif)"}`);
  if (r.failed.length) console.log(`  Adapter gagal      : ${r.failed.join(", ")}`);
  console.log(`  Harga disimpan     : ${r.inserted}`);
  console.log(`  Dilewati (duplikat): ${r.skipped}`);
  console.log(`  Ditolak validasi   : ${r.rejected}`);
  if (Object.keys(r.byStore).length) console.log("  Per toko:", r.byStore);
  if (r.inserted === 0) {
    console.log(
      "\nℹ️  Belum ada harga baru. Endpoint toko mungkin diblokir/berubah atau " +
        "tak ada adapter nyata yang aktif. Lihat src/scrapers/adapters/."
    );
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
