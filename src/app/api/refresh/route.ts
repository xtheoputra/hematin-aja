import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshRealPrices } from "@/data/openPrices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refresh harga NYATA on-demand (dipicu tombol Refresh di UI).
 * Menarik dari Open Prices, lalu menyimpannya ke DB. Tidak berjalan di background.
 */
export async function POST() {
  try {
    const result = await refreshRealPrices(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
