/**
 * Uji angka kemajuan di halaman admin.
 *
 * Ada karena pernah salah: angka "sudah punya harga nyata" dihitung dari
 * panjang daftar kerja yang SUDAH dipotong, sehingga bar kemajuan mengaku
 * 40 dari 100 padahal harga nyata baru ada 11. Uji lain semuanya hijau saat
 * itu — bug ini baru ketahuan setelah halamannya benar-benar dibuka.
 *
 * Inti yang dijaga: angka kemajuan TIDAK BOLEH bergantung pada batas tampilan.
 */
import { kelompok, uji, harus } from "./kerangka";
import { prisma } from "@/lib/db";
import { produkTanpaHargaNyata, ringkasanKerja } from "@/lib/queries/produk";
import { REAL_SOURCES } from "@/lib/queries/pilih";

async function jumlahProdukBerhargaNyataSebenarnya(): Promise<number> {
  const baris = await prisma.price.findMany({
    where: { source: { in: REAL_SOURCES } },
    select: { productId: true },
  });
  return new Set(baris.map((b) => b.productId)).size;
}

kelompok("ringkasanKerja()", () => {
  uji("jumlah produk berharga nyata sama dengan kenyataan di database", async () => {
    const r = await ringkasanKerja(60);
    harus.sama(r.denganHargaNyata, await jumlahProdukBerhargaNyataSebenarnya());
  });

  uji("angka kemajuan TIDAK berubah saat batas tampilan berubah", async () => {
    const kecil = await ringkasanKerja(5);
    const besar = await ringkasanKerja(100);
    harus.sama(kecil.denganHargaNyata, besar.denganHargaNyata, "denganHargaNyata");
    harus.sama(kecil.totalProduk, besar.totalProduk, "totalProduk");
    harus.sama(kecil.belumTergarap, besar.belumTergarap, "belumTergarap");
  });

  uji("tergarap + belum tergarap = seluruh katalog", async () => {
    const r = await ringkasanKerja(60);
    harus.sama(r.denganHargaNyata + r.belumTergarap, r.totalProduk);
  });

  uji("batas hanya memotong daftar, bukan angkanya", async () => {
    const r = await ringkasanKerja(5);
    harus.maksimal(r.baris.length, 5, "panjang daftar");
    harus.minimal(r.totalProduk, r.baris.length, "total produk");
  });
});

kelompok("produkTanpaHargaNyata()", () => {
  uji("yang paling kosong muncul lebih dulu", async () => {
    const baris = await produkTanpaHargaNyata(30);
    for (let i = 1; i < baris.length; i++) {
      harus.minimal(
        baris[i].hargaNyata,
        baris[i - 1].hargaNyata,
        `urutan baris ${i}`
      );
    }
  });

  uji("hitungan harga nyata per produk cocok dengan database", async () => {
    const baris = await produkTanpaHargaNyata(100);
    const contoh = baris.find((b) => b.hargaNyata > 0) ?? baris[0];
    const sebenarnya = await prisma.price.count({
      where: { productId: contoh.id, source: { in: REAL_SOURCES } },
    });
    harus.sama(contoh.hargaNyata, sebenarnya, `hitungan untuk ${contoh.name}`);
  });

  uji("harga perkiraan tidak pernah dihitung sebagai nyata", async () => {
    // Produk seed punya ratusan baris perkiraan; kalau ikut terhitung, daftar
    // kerja jadi kosong dan pengisian data terlihat selesai padahal belum.
    const baris = await produkTanpaHargaNyata(100);
    harus.benar(
      baris.some((b) => b.hargaNyata === 0),
      "masih ada produk tanpa harga nyata"
    );
  });
});
