import { prisma } from "@/lib/db";
import { runScrapers } from "@/data/runScrapers";
import { batasLaju, permintaanAdminSah, pengenalPemanggil } from "@/lib/admin";
import { detailGalat, gagal, pesanAman, sukses, TAK_BERWENANG, TERLALU_SERING } from "@/lib/api";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAKS = 3;
const JENDELA_MS = 5 * 60_000;

/**
 * Jalankan scraper toko on-demand (dipicu tombol Refresh di UI).
 * Menyimpan harga NYATA (source="scrape"). Degradasi anggun: bila endpoint
 * toko memblokir/berubah, mengembalikan inserted: 0 tanpa error.
 *
 * BERSANDI & berpembatas laju — alasannya sama dengan /api/refresh: rute ini
 * menembak situs toko orang lain, bukan cuma memakai sumber daya sendiri.
 */
export async function POST(req: Request) {
  if (!permintaanAdminSah(req)) return TAK_BERWENANG();

  const batas = batasLaju(`scrape:${pengenalPemanggil(req)}`, MAKS, JENDELA_MS);
  if (!batas.boleh) return TERLALU_SERING(batas.sisaDetik);

  try {
    const result = await runScrapers(prisma);
    return sukses({ ok: true, ...result });
  } catch (e) {
    // Pesan mentah masuk ke LOG, bukan ke pemanggil: `e.message` bisa memuat
    // jalur berkas dan nama tabel.
    await log.galat("scrape", "Scraper gagal dijalankan", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
