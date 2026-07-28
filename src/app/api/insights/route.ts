import { NextResponse } from "next/server";
import { getInsights } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";

export const dynamic = "force-dynamic";

// GET /api/insights
export async function GET() {
  const insights = await getInsights(isRealOnly(getDisplayMode()));
  return NextResponse.json(insights);
}
