/**
 * Audit mutu data katalog.
 *
 * Ada karena agen belanja menemukan dua hal saat pertama kali dijalankan pada
 * data sungguhan: kopi seharga **Rp 20**, dan 4 produk yang kolom satuannya
 * berisi `"220"`, `"RH. 30"`, `"1"`, dan `"susu uht"`. Keduanya lolos seluruh
 * uji, karena uji memeriksa kode — bukan isi database.
 *
 * Agen sudah menolak memakai data seperti itu, tapi menolak saja tidak cukup:
 * halaman katalog tetap memajangnya, dan tak ada satu pun tempat di aplikasi
 * yang bisa ditanyai "apa saja yang rusak?". Berkas ini jawabannya, dan
 * hasilnya jadi antrean kerja di `/admin` — sama seperti daftar produk yang
 * belum punya harga nyata.
 */
import { prisma } from "@/lib/db";
import { periksaHarga } from "@/lib/harga";
import { uraiUkuran } from "@/lib/satuan";
import { sourceKindOf } from "@/lib/source";

export type HargaBermasalah = {
  priceId: string;
  produkSlug: string;
  produkNama: string;
  toko: string;
  harga: number;
  sumber: string;
  nyata: boolean;
  alasan: string;
};

export type SatuanBermasalah = {
  slug: string;
  nama: string;
  satuan: string;
};

export type AuditMutu = {
  totalProduk: number;
  totalHarga: number;
  /** Produk yang satuannya tak terbaca → harga per satuan tak bisa dihitung. */
  satuanRusak: SatuanBermasalah[];
  /** Berapa produk yang satuannya terbaca — dasar perbandingan per satuan. */
  satuanTerbaca: number;
  /** Harga yang tidak lolos `periksaHarga()`. */
  hargaRusak: HargaBermasalah[];
  totalHargaRusak: number;
};

/**
 * `batas` hanya memotong DAFTAR-nya, tidak pernah angkanya — pelajaran yang
 * sama dengan `ringkasanKerja()`: angka kemajuan yang diturunkan dari daftar
 * terpotong pernah membuat bar kemajuan berbohong.
 */
export async function auditMutu(batas = 50): Promise<AuditMutu> {
  const [produk, totalHarga] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        unit: true,
        category: { select: { slug: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.price.count(),
  ]);

  const satuanRusak: SatuanBermasalah[] = [];
  for (const p of produk) {
    if (!uraiUkuran(p.unit)) {
      satuanRusak.push({ slug: p.slug, nama: p.name, satuan: p.unit });
    }
  }

  const kategoriProduk = new Map(produk.map((p) => [p.id, p.category.slug]));
  const infoProduk = new Map(produk.map((p) => [p.id, { slug: p.slug, nama: p.name }]));

  // Harga terbaru per (produk × toko) saja: riwayat lama tidak perlu diperbaiki,
  // yang menyesatkan pengguna adalah angka yang sedang tampil.
  const harga = await prisma.price.findMany({
    select: {
      id: true,
      price: true,
      source: true,
      productId: true,
      recordedAt: true,
      supermarket: { select: { name: true } },
    },
    orderBy: { recordedAt: "desc" },
  });

  const terlihat = new Set<string>();
  const hargaRusak: HargaBermasalah[] = [];
  for (const h of harga) {
    const kunci = `${h.productId}|${h.supermarket.name}`;
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);

    const cek = periksaHarga(h.price, { kategori: kategoriProduk.get(h.productId) });
    if (cek.sah) continue;
    const info = infoProduk.get(h.productId);
    hargaRusak.push({
      priceId: h.id,
      produkSlug: info?.slug ?? "",
      produkNama: info?.nama ?? "(tidak dikenal)",
      toko: h.supermarket.name,
      harga: h.price,
      sumber: h.source,
      nyata: sourceKindOf(h.source) === "real",
      alasan: cek.alasan ?? "di luar rentang wajar",
    });
  }

  hargaRusak.sort((a, b) => a.harga - b.harga);

  return {
    totalProduk: produk.length,
    totalHarga,
    satuanRusak: satuanRusak.slice(0, batas),
    satuanTerbaca: produk.length - satuanRusak.length,
    hargaRusak: hargaRusak.slice(0, batas),
    totalHargaRusak: hargaRusak.length,
  };
}
