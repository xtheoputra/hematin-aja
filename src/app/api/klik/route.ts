import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/klik  body: { toko: "<slug>" }
 *
 * Mencatat bahwa pengguna menyeberang ke situs sebuah toko — butir terakhir
 * §6 Analitik. Angka ini menjawab pertanyaan yang tidak bisa dijawab data
 * harga: toko mana yang benar-benar didatangi orang setelah membandingkan.
 *
 * Yang sengaja TIDAK disimpan: apa pun tentang siapa yang mengklik. Tidak ada
 * IP, tidak ada pengenal peramban. Yang dibutuhkan cuma hitungan per toko, dan
 * mengumpulkan lebih dari yang dibutuhkan adalah utang yang harus dijaga
 * selamanya.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = typeof body?.toko === "string" ? body.toko.trim().slice(0, 60) : "";
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

    // Diverifikasi ke database supaya kanal ini tak bisa dipakai menulis teks
    // sembarangan ke dalam log.
    const toko = await prisma.supermarket.findUnique({
      where: { slug },
      select: { slug: true, name: true },
    });
    if (!toko) return NextResponse.json({ ok: false }, { status: 404 });

    await log.info("klik", toko.slug, { nama: toko.name });
    return NextResponse.json({ ok: true });
  } catch {
    // Pencatatan tidak boleh menjatuhkan apa pun, apalagi menahan pengguna
    // yang sedang menuju situs toko.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
