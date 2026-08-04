/**
 * CLI untuk menarik harga NYATA dari Open Prices.
 * Jalankan: npm run refresh
 * (Versi tombol di UI memanggil /api/refresh dengan logika yang sama.)
 */
// Klien bersama — lihat catatan di src/scrapers/run.ts.
import { prisma } from "../lib/db";
import { refreshRealPrices } from "./openPrices";

async function main() {
  console.log("🔄 Menarik harga NYATA dari Open Prices (IDR)...");
  const r = await refreshRealPrices(prisma);
  console.log("\n— Hasil —");
  console.log(`  Data harga diperiksa : ${r.fetched}`);
  console.log(`  Cocok dengan toko    : ${r.matchedStore}`);
  console.log(`  Produk baru dibuat   : ${r.newProducts}`);
  console.log(`  Harga nyata disimpan : ${r.inserted}`);
  console.log(`  Dilewati (duplikat)  : ${r.skipped}`);
  console.log(`  Ditolak validasi     : ${r.rejected}`);
  if (Object.keys(r.byStore).length) {
    console.log("  Per toko:", r.byStore);
  }
  if (r.inserted === 0) {
    console.log(
      "\nℹ️  Belum ada harga nyata baru yang cocok. Data publik Open Prices untuk Indonesia masih sedikit & bertambah seiring waktu."
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
