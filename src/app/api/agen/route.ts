import { NextResponse } from "next/server";
import { rencanaBelanja } from "@/lib/queries/agen";
import { getDisplayMode, isRealOnly } from "@/lib/mode";
import { BIAYA_PERJALANAN_BAWAAN } from "@/lib/agen";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/agen
 * body: { items: [{ productId, qty }], biayaPerjalanan?: number }
 *
 * Mengembalikan rencana belanja lengkap beserta alasannya. Menggantikan
 * `/api/compare` yang lama, yang hanya mengembalikan total per toko tanpa
 * memperhitungkan barang yang tidak dijual di toko itu.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    const biayaMentah = Number(body?.biayaPerjalanan);
    const biayaPerjalanan = Number.isFinite(biayaMentah)
      ? Math.min(Math.max(0, Math.round(biayaMentah)), 1_000_000)
      : BIAYA_PERJALANAN_BAWAAN;

    const rencana = await rencanaBelanja({
      items,
      realOnly: isRealOnly(getDisplayMode()),
      biayaPerjalanan,
    });

    return NextResponse.json(rencana);
  } catch (err) {
    // Kegagalan di sini pernah tak terlihat sama sekali karena `catch` yang
    // langsung mengembalikan 500 tanpa jejak. Yang tersimpan yang bisa ditelusuri.
    await log.galat("api", "Gagal menyusun rencana belanja", {
      pesan: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Gagal menyusun rencana belanja" },
      { status: 500 }
    );
  }
}
