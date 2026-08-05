/**
 * Pembersih data katalog: `npm run db:bersihkan` (pratinjau, TIDAK menghapus)
 *                         `npm run db:bersihkan -- --terapkan` (menghapus)
 *
 * Membersihkan sampah yang masuk lewat lubang di `openPrices.ts` sebelum
 * gerbang mutu ada — lihat `src/lib/impor.ts` untuk kisah lengkapnya.
 *
 * **Pratinjau adalah bawaan, dan itu disengaja.** Skrip yang menghapus data
 * begitu dijalankan adalah skrip yang cepat atau lambat menghapus sesuatu yang
 * tidak diniatkan. Di sini penghapusan selalu keputusan yang diketik ulang.
 *
 * Yang dibereskan:
 *  1. Produk yang namanya tidak menamai apa pun (`Produk <ISBN>`) → dihapus
 *     berikut harganya. Aturannya sama persis dengan gerbang impor, bukan
 *     daftar nama yang ditulis tangan.
 *  2. Harga yang tidak lolos `periksaHarga()` pada produk yang SAH → hanya
 *     harganya yang dihapus, produknya dibiarkan.
 *  3. Satuan rusak yang jawabannya bisa dibaca dari nama produk itu sendiri
 *     (mis. "Buavita Juice Jambu 245ml" bersatuan "RH. 30").
 *
 * Yang sengaja TIDAK disentuh: satuan rusak yang jawabannya tidak diketahui
 * (`"220"`, `"1"`, `"susu uht"`). Menebaknya berarti mengarang isi kemasan.
 * Nilai aslinya justru petunjuk bagi yang memperbaikinya lewat `/admin`.
 */
import { prisma } from "../lib/db";
import { periksaHarga } from "../lib/harga";
import { namaProdukLayak } from "../lib/impor";
import { uraiUkuran } from "../lib/satuan";
import { formatRupiah } from "../lib/format";
import { sourceKindOf } from "../lib/source";

const TERAPKAN = process.argv.includes("--terapkan");

/** Ukuran yang tertulis di NAMA produk — satu-satunya sumber yang sah di sini. */
function satuanDariNama(nama: string): string | null {
  const m = nama.match(/(\d+(?:[.,]\d+)?\s*(?:ml|l|liter|g|gr|gram|kg))\b/i);
  if (!m) return null;
  const calon = m[1].trim();
  return uraiUkuran(calon) ? calon : null;
}

async function main() {
  console.log(
    TERAPKAN
      ? "🧹 MENERAPKAN pembersihan data — perubahan ini permanen.\n"
      : "👀 PRATINJAU (tidak ada yang dihapus). Tambahkan --terapkan untuk mengeksekusi.\n"
  );

  const produk = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      unit: true,
      barcode: true,
      category: { select: { slug: true } },
      _count: { select: { prices: true } },
    },
    orderBy: { name: "asc" },
  });

  // ── 1. Produk tanpa nama sungguhan ──────────────────────────────────────
  const produkSampah = produk.filter((p) => !namaProdukLayak(p.name, p.barcode ?? ""));
  console.log(`1. Produk yang namanya tidak menamai apa pun: ${produkSampah.length}`);
  for (const p of produkSampah) {
    console.log(
      `   ✗ "${p.name}"  barcode ${p.barcode ?? "-"}  · ${p._count.prices} baris harga ikut terhapus`
    );
  }
  if (produkSampah.length === 0) console.log("   (tidak ada)");

  const idSampah = new Set(produkSampah.map((p) => p.id));

  // ── 2. Harga tak masuk akal pada produk yang SAH ─────────────────────────
  const kategoriProduk = new Map(produk.map((p) => [p.id, p.category.slug]));
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));

  const semuaHarga = await prisma.price.findMany({
    select: {
      id: true,
      price: true,
      source: true,
      productId: true,
      supermarket: { select: { name: true } },
    },
  });

  const hargaSampah = semuaHarga.filter(
    (h) =>
      !idSampah.has(h.productId) && // produknya sudah ikut terhapus di langkah 1
      !periksaHarga(h.price, { kategori: kategoriProduk.get(h.productId) }).sah
  );

  console.log(`\n2. Harga tidak masuk akal pada produk yang sah: ${hargaSampah.length}`);
  for (const h of hargaSampah) {
    console.log(
      `   ✗ ${formatRupiah(h.price).padStart(10)}  ${namaProduk.get(h.productId)} @ ${h.supermarket.name}` +
        `  [${h.source}${sourceKindOf(h.source) === "real" ? " · DITANDAI NYATA" : ""}]`
    );
  }
  if (hargaSampah.length === 0) console.log("   (tidak ada)");

  // ── 3. Satuan yang jawabannya ada di nama produknya sendiri ──────────────
  const perbaikanSatuan = produk
    .filter((p) => !idSampah.has(p.id) && !uraiUkuran(p.unit))
    .map((p) => ({ p, baru: satuanDariNama(p.name) }))
    .filter((x): x is { p: (typeof produk)[number]; baru: string } => x.baru !== null);

  const takTerpecahkan = produk.filter(
    (p) => !idSampah.has(p.id) && !uraiUkuran(p.unit) && !satuanDariNama(p.name)
  );

  console.log(`\n3. Satuan rusak yang bisa dipastikan dari nama produk: ${perbaikanSatuan.length}`);
  for (const x of perbaikanSatuan) {
    console.log(`   ✎ ${x.p.name}: "${x.p.unit}" → "${x.baru}"`);
  }
  if (perbaikanSatuan.length === 0) console.log("   (tidak ada)");

  console.log(`\n   Dibiarkan (jawabannya tidak diketahui — jangan ditebak): ${takTerpecahkan.length}`);
  for (const p of takTerpecahkan) {
    console.log(`   • ${p.name}: "${p.unit}"  → perbaiki manual lewat /admin`);
  }

  // ── Eksekusi ─────────────────────────────────────────────────────────────
  if (!TERAPKAN) {
    console.log(
      `\n👀 Tidak ada yang diubah. Jalankan ulang dengan --terapkan bila daftar di atas sudah benar.`
    );
    await prisma.$disconnect();
    return;
  }

  let hapusProduk = 0;
  let hapusHarga = 0;
  let ubahSatuan = 0;

  if (idSampah.size > 0) {
    const h = await prisma.price.deleteMany({ where: { productId: { in: [...idSampah] } } });
    const p = await prisma.product.deleteMany({ where: { id: { in: [...idSampah] } } });
    hapusHarga += h.count;
    hapusProduk = p.count;
  }
  if (hargaSampah.length > 0) {
    const h = await prisma.price.deleteMany({
      where: { id: { in: hargaSampah.map((x) => x.id) } },
    });
    hapusHarga += h.count;
  }
  for (const x of perbaikanSatuan) {
    await prisma.product.update({ where: { id: x.p.id }, data: { unit: x.baru } });
    ubahSatuan++;
  }

  console.log("\n— Selesai —");
  console.log(`  Produk dihapus  : ${hapusProduk}`);
  console.log(`  Harga dihapus   : ${hapusHarga}`);
  console.log(`  Satuan diperbaiki: ${ubahSatuan}`);
  console.log("\n  Periksa ulang: npm run db:periksa && npm run db:statistik");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
