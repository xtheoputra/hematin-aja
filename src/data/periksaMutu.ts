/**
 * Audit mutu data dari baris perintah: `npm run db:periksa`.
 *
 * Kembarannya ada di `/admin`, tapi versi terminal ini yang bisa dijalankan
 * cepat sebelum commit — cacat data tidak akan pernah tertangkap `npm test`,
 * karena uji memeriksa kode, bukan isi database.
 */
import { auditMutu } from "@/lib/queries/mutu";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/db";

async function main() {
  const m = await auditMutu(200);

  console.log("— Mutu data Hematin Aja —");
  console.log(`  Produk           : ${m.totalProduk}`);
  console.log(`  Baris harga      : ${m.totalHarga}`);
  console.log(
    `  Satuan terbaca   : ${m.satuanTerbaca}/${m.totalProduk} ` +
      `(${Math.round((m.satuanTerbaca / Math.max(1, m.totalProduk)) * 100)}%)`
  );
  console.log(`  Harga bermasalah : ${m.totalHargaRusak}`);

  if (m.hargaRusak.length > 0) {
    console.log("\n  Harga tidak masuk akal:");
    for (const h of m.hargaRusak) {
      console.log(
        `    ${formatRupiah(h.harga).padStart(12)}  ${h.produkNama} @ ${h.toko}` +
          `${h.nyata ? "  [DITANDAI NYATA]" : ""}`
      );
      console.log(`                  ${h.alasan}`);
    }
  }

  if (m.satuanRusak.length > 0) {
    console.log("\n  Satuan tak terbaca:");
    for (const s of m.satuanRusak) {
      console.log(`    ${JSON.stringify(s.satuan).padStart(14)}  ${s.nama}`);
    }
  }

  const bersih = m.totalHargaRusak === 0 && m.satuanRusak.length === 0;
  console.log(bersih ? "\n  ✓ Bersih." : "\n  Perbaiki lewat /admin.");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
