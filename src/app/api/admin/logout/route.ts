import { NextResponse } from "next/server";
import { COOKIE_ADMIN } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_ADMIN, "", { path: "/", maxAge: 0 });
  return res;
}
