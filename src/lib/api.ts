/**
 * Bentuk balasan API yang seragam.
 *
 * Sebelumnya `/api/scrape` mengembalikan `e.message` apa adanya ke pengguna —
 * itu membocorkan jalur berkas, nama tabel, dan isi kegagalan internal ke
 * siapa pun yang memanggil. Pesan mentah masuk ke LOG; yang keluar ke pemanggil
 * hanya kalimat yang aman dibaca orang.
 */
import { NextResponse } from "next/server";

export type BalasanGagal = { success: false; message: string };

export function sukses<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function gagal(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message } satisfies BalasanGagal, {
    status,
  });
}

export const TAK_BERWENANG = () =>
  gagal("Perlu sandi admin. Isi ADMIN_PASSWORD di .env.local lalu masuk lewat /admin.", 401);

export const TERLALU_SERING = (sisaDetik: number) =>
  gagal(`Terlalu sering. Coba lagi dalam ${sisaDetik} detik.`, 429);

/**
 * Pesan yang aman ditampilkan. Detail aslinya diserahkan ke pemanggil untuk
 * dicatat ke log, bukan dikirim balik.
 */
export function pesanAman(e: unknown): string {
  if (e instanceof Error && e.name === "AbortError") {
    return "Permintaan ke sumber data kelamaan dan dihentikan.";
  }
  return "Terjadi kesalahan di server. Detailnya tercatat di log.";
}

export function detailGalat(e: unknown): { error: string; stack?: string } {
  if (e instanceof Error) return { error: e.message, stack: e.stack?.slice(0, 1500) };
  return { error: String(e) };
}

/** Ambil string yang benar-benar berisi dari body JSON yang tak dipercaya. */
export function teks(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Batas panjang kueri pencarian — masukan aneh tidak boleh sampai ke database. */
export const MAKS_PANJANG_KUERI = 80;

export function bersihkanKueri(mentah: string | null): string | undefined {
  if (!mentah) return undefined;
  const q = mentah.trim().slice(0, MAKS_PANJANG_KUERI);
  return q.length > 0 ? q : undefined;
}

/** Paginasi: jaga supaya tidak ada yang bisa meminta seluruh tabel sekaligus. */
export function batasi(mentah: string | null, bawaan: number, maks: number): number {
  const n = Number(mentah);
  if (!Number.isFinite(n) || n <= 0) return bawaan;
  return Math.min(Math.floor(n), maks);
}
