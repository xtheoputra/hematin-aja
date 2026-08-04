import { getDaftarProduk, PRODUK_PER_HALAMAN, MAKS_PER_HALAMAN } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";
import { batasLaju, pengenalPemanggil } from "@/lib/admin";
import {
  batasi,
  bersihkanKueri,
  detailGalat,
  gagal,
  pesanAman,
  sukses,
  TERLALU_SERING,
} from "@/lib/api";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Pencarian terbuka untuk umum, tapi tidak boleh dipakai menggilas database. */
const MAKS_CARI = 60;
const JENDELA_MS = 60_000;

// GET /api/products?q=...&kategori=...&batas=24&mulai=0
export async function GET(req: Request) {
  const batas = batasLaju(`cari:${pengenalPemanggil(req)}`, MAKS_CARI, JENDELA_MS);
  if (!batas.boleh) return TERLALU_SERING(batas.sisaDetik);

  try {
    const { searchParams } = new URL(req.url);
    const search = bersihkanKueri(searchParams.get("q"));
    const category = searchParams.get("kategori") || undefined;
    const limit = batasi(searchParams.get("batas"), PRODUK_PER_HALAMAN, MAKS_PER_HALAMAN);
    const offset = Math.max(0, Number(searchParams.get("mulai")) || 0);

    const hasil = await getDaftarProduk({
      search,
      category,
      realOnly: isRealOnly(getDisplayMode()),
      limit,
      offset,
    });

    return sukses({
      count: hasil.items.length,
      total: hasil.total,
      limit,
      offset,
      jalur: hasil.jalur,
      saran: hasil.saran,
      products: hasil.items,
    });
  } catch (e) {
    await log.galat("api", "GET /api/products gagal", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
