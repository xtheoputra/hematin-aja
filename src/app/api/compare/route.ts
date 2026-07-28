import { NextResponse } from "next/server";
import { compareCart } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";

export const dynamic = "force-dynamic";

// POST /api/compare  body: { items: [{ productId, qty }] }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const clean = items
      .filter(
        (i: any) => typeof i?.productId === "string" && Number.isFinite(i?.qty)
      )
      .map((i: any) => ({
        productId: i.productId as string,
        qty: Math.max(1, Math.floor(i.qty)),
      }));

    const result = await compareCart(clean, isRealOnly(getDisplayMode()));
    return NextResponse.json({ stores: result });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal membandingkan keranjang" },
      { status: 500 }
    );
  }
}
