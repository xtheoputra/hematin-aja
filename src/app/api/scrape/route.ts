import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runScrapers } from "@/data/runScrapers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Jalankan scraper toko on-demand (dipicu tombol Refresh di UI).
 * Menyimpan harga NYATA (source="scrape"). Degradasi anggun: bila endpoint
 * toko memblokir/berubah, mengembalikan inserted: 0 tanpa error.
 */
export async function POST() {
  try {
    const result = await runScrapers(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
