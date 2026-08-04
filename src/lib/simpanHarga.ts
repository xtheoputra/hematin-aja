/**
 * Satu-satunya pintu masuk penulisan harga.
 *
 * Sebelumnya tiap jalur punya aturannya sendiri: `runScrapers` men-dedup per
 * hari, `openPrices` men-dedup per tanggal, dan input manual belum ada sama
 * sekali. Aturan yang tersebar begitu pasti menyimpang satu sama lain begitu
 * ada jalur keempat.
 *
 * Yang dijamin di sini:
 *  - harga divalidasi terhadap median riwayat produknya (atau rentang kategori
 *    bila belum ada riwayat)
 *  - tidak ada dua baris untuk (produk × toko × sumber) di hari yang sama
 *  - harga yang sama persis dengan catatan terakhir hanya memperbarui
 *    `recordedAt`, tidak menumpuk baris identik
 *  - penolakan DICATAT, tidak dibuang diam-diam — penolakan yang menumpuk
 *    adalah tanda parser rusak
 *  - cache dibatalkan begitu ada harga baru
 */
import type { PrismaClient } from "@prisma/client";
import { batalkanCache } from "@/lib/cache";
import { log } from "@/lib/log";
import { akhirHari, awalHari, median, periksaHarga } from "@/lib/harga";

export type PermintaanHarga = {
  productId: string;
  supermarketId: string;
  price: number;
  inStock?: boolean;
  url?: string | null;
  source: string;
  recordedAt?: Date;
};

export type StatusSimpan = "disimpan" | "diperbarui" | "duplikat" | "ditolak";

export type HasilSimpan = {
  status: StatusSimpan;
  alasan?: string;
  id?: string;
};

export async function simpanHarga(
  prisma: PrismaClient,
  req: PermintaanHarga
): Promise<HasilSimpan> {
  const price = Math.round(Number(req.price));
  const recordedAt = req.recordedAt ?? new Date();

  const produk = await prisma.product.findUnique({
    where: { id: req.productId },
    select: { id: true, name: true, category: { select: { slug: true } } },
  });
  if (!produk) return { status: "ditolak", alasan: "produk tidak ditemukan" };

  const toko = await prisma.supermarket.findUnique({
    where: { id: req.supermarketId },
    select: { id: true, name: true },
  });
  if (!toko) return { status: "ditolak", alasan: "supermarket tidak ditemukan" };

  // Median riwayat produk ini — lebih tahan banting daripada rentang tetap,
  // karena ikut bergerak saat harga pasar memang berubah.
  const riwayat = await prisma.price.findMany({
    where: { productId: produk.id },
    select: { price: true },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });
  const med = median(riwayat.map((r) => r.price));

  const periksa = periksaHarga(price, {
    median: med,
    kategori: produk.category.slug,
  });
  if (!periksa.sah) {
    await log.peringatan("harga", `Harga ditolak: ${produk.name} @ ${toko.name}`, {
      harga: price,
      sumber: req.source,
      alasan: periksa.alasan,
      median: med,
    });
    return { status: "ditolak", alasan: periksa.alasan };
  }

  // Sudah ada catatan untuk kombinasi ini di hari yang sama?
  const hariIni = await prisma.price.findFirst({
    where: {
      productId: produk.id,
      supermarketId: toko.id,
      source: req.source,
      recordedAt: { gte: awalHari(recordedAt), lte: akhirHari(recordedAt) },
    },
    orderBy: { recordedAt: "desc" },
  });

  if (hariIni) {
    if (hariIni.price === price && hariIni.inStock === (req.inStock ?? true)) {
      return { status: "duplikat", id: hariIni.id };
    }
    // Angka yang sama harinya tapi berbeda nilainya = koreksi, bukan riwayat.
    const diperbarui = await prisma.price.update({
      where: { id: hariIni.id },
      data: {
        price,
        inStock: req.inStock ?? true,
        url: req.url ?? hariIni.url,
        recordedAt,
      },
    });
    batalkanCache();
    return { status: "diperbarui", id: diperbarui.id };
  }

  // Sama persis dengan catatan TERAKHIR (hari lain) → cukup segarkan tanggalnya.
  const terakhir = await prisma.price.findFirst({
    where: { productId: produk.id, supermarketId: toko.id, source: req.source },
    orderBy: { recordedAt: "desc" },
  });
  if (
    terakhir &&
    terakhir.price === price &&
    terakhir.inStock === (req.inStock ?? true)
  ) {
    const disegarkan = await prisma.price.update({
      where: { id: terakhir.id },
      data: { recordedAt, url: req.url ?? terakhir.url },
    });
    batalkanCache();
    return { status: "diperbarui", id: disegarkan.id };
  }

  const baru = await prisma.price.create({
    data: {
      productId: produk.id,
      supermarketId: toko.id,
      price,
      inStock: req.inStock ?? true,
      url: req.url ?? null,
      source: req.source,
      recordedAt,
    },
  });
  batalkanCache();
  return { status: "disimpan", id: baru.id };
}

export type RingkasanSimpan = {
  disimpan: number;
  diperbarui: number;
  duplikat: number;
  ditolak: number;
  alasanPenolakan: string[];
};

export function ringkasanKosong(): RingkasanSimpan {
  return { disimpan: 0, diperbarui: 0, duplikat: 0, ditolak: 0, alasanPenolakan: [] };
}

export function catatKeRingkasan(r: RingkasanSimpan, h: HasilSimpan): void {
  if (h.status === "disimpan") r.disimpan++;
  else if (h.status === "diperbarui") r.diperbarui++;
  else if (h.status === "duplikat") r.duplikat++;
  else {
    r.ditolak++;
    if (h.alasan && r.alasanPenolakan.length < 10) r.alasanPenolakan.push(h.alasan);
  }
}
