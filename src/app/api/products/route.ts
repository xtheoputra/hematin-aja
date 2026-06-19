import { NextResponse } from "next/server";
import { getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET /api/products?q=...&kategori=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q")?.trim() || undefined;
  const category = searchParams.get("kategori") || undefined;
  const products = await getProducts({ search, category });
  return NextResponse.json({ count: products.length, products });
}
