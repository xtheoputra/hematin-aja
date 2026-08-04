import { prisma } from "@/lib/db";
import { refreshRealPrices } from "@/data/openPrices";
import { batasLaju, permintaanAdminSah, pengenalPemanggil } from "@/lib/admin";
import { detailGalat, gagal, pesanAman, sukses, TAK_BERWENANG, TERLALU_SERING } from "@/lib/api";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 3 tarikan per 5 menit sudah jauh lebih sering daripada yang berguna. */
const MAKS = 3;
const JENDELA_MS = 5 * 60_000;

/**
 * Refresh harga NYATA on-demand (dipicu tombol Refresh di UI).
 *
 * BERSANDI. Rute ini memicu puluhan permintaan keluar ke Open Prices; kalau
 * dibiarkan terbuka, siapa pun yang tahu alamatnya bisa memakai aplikasi ini
 * untuk membanjiri server orang lain atas nama pemiliknya.
 */
export async function POST(req: Request) {
  if (!permintaanAdminSah(req)) return TAK_BERWENANG();

  const batas = batasLaju(`refresh:${pengenalPemanggil(req)}`, MAKS, JENDELA_MS);
  if (!batas.boleh) return TERLALU_SERING(batas.sisaDetik);

  try {
    const result = await refreshRealPrices(prisma);
    return sukses({ ok: true, ...result });
  } catch (e) {
    await log.galat("refresh", "Gagal menarik harga dari Open Prices", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
