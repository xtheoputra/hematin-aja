import { getHargaProduk } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";
import { detailGalat, gagal, pesanAman, sukses } from "@/lib/api";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/{id}/prices — harga sebuah produk di semua toko, termurah
 * dulu. `{id}` menerima id maupun slug, karena keduanya sama-sama dipakai di
 * aplikasi ini dan memaksa pemanggil menebak yang mana hanya menambah gesekan.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const hasil = await getHargaProduk(params.id, isRealOnly(getDisplayMode()));
    if (!hasil) return gagal("Produk tidak ditemukan.", 404);
    return sukses({
      product: hasil.product,
      count: hasil.prices.length,
      prices: hasil.prices,
    });
  } catch (e) {
    await log.galat("api", "GET /api/products/[id]/prices gagal", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
