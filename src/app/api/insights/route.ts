import { NextResponse } from "next/server";
import { getInsights } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET /api/insights
export async function GET() {
  const insights = await getInsights();
  return NextResponse.json(insights);
}
