import { NextResponse } from "next/server";
import {
  COOKIE_ADMIN,
  adminDiaktifkan,
  batasLaju,
  pengenalPemanggil,
  sandiAdmin,
  sandiCocok,
  tokenSesi,
} from "@/lib/admin";
import { gagal } from "@/lib/api";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Tebakan sandi dibatasi keras — ini satu-satunya gerbang ke penulisan data. */
const MAKS_COBA = 5;
const JENDELA_MS = 10 * 60_000;

export async function POST(req: Request) {
  if (!adminDiaktifkan()) {
    return gagal(
      "Admin belum diaktifkan. Isi ADMIN_PASSWORD di berkas .env.local lalu jalankan ulang server.",
      503
    );
  }

  const kunci = `login:${pengenalPemanggil(req)}`;
  const batas = batasLaju(kunci, MAKS_COBA, JENDELA_MS);
  if (!batas.boleh) {
    return gagal(
      `Terlalu banyak percobaan. Coba lagi dalam ${batas.sisaDetik} detik.`,
      429
    );
  }

  let sandi: string | undefined;
  try {
    const body = (await req.json()) as { sandi?: unknown };
    sandi = typeof body.sandi === "string" ? body.sandi : undefined;
  } catch {
    return gagal("Bentuk permintaan tidak sah.", 400);
  }

  if (!sandiCocok(sandi)) {
    await log.peringatan("admin", "Percobaan masuk admin gagal", {
      dari: pengenalPemanggil(req),
    });
    return gagal("Sandi salah.", 401);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_ADMIN, tokenSesi(sandiAdmin()!), {
    httpOnly: true, // tak terbaca JavaScript halaman
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  await log.info("admin", "Masuk admin berhasil");
  return res;
}
