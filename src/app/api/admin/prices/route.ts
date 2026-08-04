import { prisma } from "@/lib/db";
import { permintaanAdminSah } from "@/lib/admin";
import { detailGalat, gagal, pesanAman, sukses, teks, TAK_BERWENANG } from "@/lib/api";
import { log } from "@/lib/log";
import { simpanHarga } from "@/lib/simpanHarga";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/prices — memasukkan harga NYATA hasil pengamatan manusia.
 *
 * Ini jalur tercepat menambah harga nyata, dan tidak bergantung pada scraper
 * yang belum terbukti. Harga yang masuk lewat sini bersumber `manual`, yang
 * di `lib/source.ts` dihitung sebagai NYATA — jadi langsung muncul di mode
 * "Hanya Nyata".
 *
 * Menerima id maupun slug untuk produk & toko: yang mengisi form adalah
 * manusia, dan slug jauh lebih mudah dibaca daripada cuid.
 */
export async function POST(req: Request) {
  if (!permintaanAdminSah(req)) return TAK_BERWENANG();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return gagal("Bentuk permintaan tidak sah.", 400);
  }

  const produkKunci = teks(body.produk);
  const tokoKunci = teks(body.toko);
  const hargaMentah = body.harga;
  const tanggal = teks(body.tanggal);
  const inStock = body.tersedia === undefined ? true : Boolean(body.tersedia);
  const url = teks(body.url);

  if (!produkKunci) return gagal("Produk wajib diisi.", 400);
  if (!tokoKunci) return gagal("Toko wajib diisi.", 400);

  const harga = Math.round(Number(hargaMentah));
  if (!Number.isFinite(harga) || harga <= 0) {
    return gagal("Harga harus angka lebih dari 0.", 400);
  }

  let recordedAt = new Date();
  if (tanggal) {
    const d = new Date(tanggal.length <= 10 ? `${tanggal}T00:00:00` : tanggal);
    if (Number.isNaN(d.getTime())) return gagal("Tanggal tidak sah.", 400);
    // Tanggal masa depan berarti salah ketik; harga tidak bisa dicek besok.
    if (d.getTime() > Date.now() + 86_400_000) {
      return gagal("Tanggal tidak boleh di masa depan.", 400);
    }
    recordedAt = d;
  }

  try {
    const [produk, toko] = await Promise.all([
      prisma.product.findFirst({
        where: { OR: [{ id: produkKunci }, { slug: produkKunci }] },
        select: { id: true, name: true },
      }),
      prisma.supermarket.findFirst({
        where: { OR: [{ id: tokoKunci }, { slug: tokoKunci }] },
        select: { id: true, name: true },
      }),
    ]);
    if (!produk) return gagal(`Produk "${produkKunci}" tidak ditemukan.`, 404);
    if (!toko) return gagal(`Toko "${tokoKunci}" tidak ditemukan.`, 404);

    const hasil = await simpanHarga(prisma, {
      productId: produk.id,
      supermarketId: toko.id,
      price: harga,
      inStock,
      url: url ?? null,
      source: "manual",
      recordedAt,
    });

    if (hasil.status === "ditolak") {
      return gagal(`Harga ditolak: ${hasil.alasan}`, 422);
    }

    await log.info("admin", `Harga manual: ${produk.name} @ ${toko.name}`, {
      harga,
      status: hasil.status,
      tanggal: recordedAt.toISOString().slice(0, 10),
    });

    return sukses({
      status: hasil.status,
      pesan:
        hasil.status === "duplikat"
          ? "Harga itu sudah tercatat untuk hari yang sama — tidak ada yang berubah."
          : hasil.status === "diperbarui"
            ? "Catatan harga diperbarui."
            : "Harga nyata tersimpan.",
      produk: produk.name,
      toko: toko.name,
      harga,
    });
  } catch (e) {
    await log.galat("admin", "POST /api/admin/prices gagal", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
