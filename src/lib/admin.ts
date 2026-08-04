/**
 * Pelindung sandi untuk rute admin, `/api/refresh`, dan `/api/scrape`.
 *
 * Kenapa refresh & scrape ikut dilindungi: keduanya `POST` tanpa autentikasi
 * dan keduanya **memicu permintaan keluar ke situs pihak ketiga**. Siapa pun
 * yang tahu alamatnya bisa memaksa aplikasi ini membanjiri Klik Indomaret atau
 * Open Prices — atas nama pemiliknya. Ini bukan soal beban server sendiri,
 * tapi soal tidak menjadi sumber gangguan bagi situs orang lain.
 *
 * Berkas ini sengaja TIDAK mengimpor `next/headers` supaya bisa diuji sebagai
 * fungsi biasa. Pembacaan cookie ada di `adminSesi.ts`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_ADMIN = "hematin-admin";
export const HEADER_ADMIN = "x-hematin-sandi";

/** Pembeda supaya token tidak sama dengan hash sandi yang dipakai di tempat lain. */
const KONTEKS = "hematin-aja/admin/v1";

export function sandiAdmin(): string | null {
  const s = process.env.ADMIN_PASSWORD;
  return s && s.length > 0 ? s : null;
}

/**
 * Admin mati total bila `ADMIN_PASSWORD` belum diisi. Sengaja begitu:
 * bawaan yang aman adalah "tertutup", bukan "terbuka untuk semua".
 */
export function adminDiaktifkan(): boolean {
  return sandiAdmin() !== null;
}

/** Token yang disimpan di cookie — bukan sandinya sendiri. */
export function tokenSesi(sandi: string): string {
  return createHmac("sha256", sandi).update(KONTEKS).digest("hex");
}

function bandingAman(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function sandiCocok(sandi: string | null | undefined): boolean {
  const asli = sandiAdmin();
  if (!asli || !sandi) return false;
  return bandingAman(sandi, asli);
}

export function tokenSah(token: string | null | undefined): boolean {
  const asli = sandiAdmin();
  if (!asli || !token) return false;
  return bandingAman(token, tokenSesi(asli));
}

/** Baca satu cookie dari header mentah `Cookie:`. */
export function bacaCookie(headerCookie: string | null, nama: string): string | null {
  if (!headerCookie) return null;
  for (const bagian of headerCookie.split(";")) {
    const idx = bagian.indexOf("=");
    if (idx < 0) continue;
    if (bagian.slice(0, idx).trim() === nama) {
      return decodeURIComponent(bagian.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * Apakah permintaan ini boleh menjalankan aksi admin?
 * Menerima dua cara: cookie sesi (dari form login) atau header sandi
 * (untuk skrip / Task Scheduler yang tidak punya sesi).
 */
export function permintaanAdminSah(req: Request): boolean {
  if (!adminDiaktifkan()) return false;
  const dariHeader = req.headers.get(HEADER_ADMIN);
  if (sandiCocok(dariHeader)) return true;
  return tokenSah(bacaCookie(req.headers.get("cookie"), COOKIE_ADMIN));
}

// ── Pembatas laju sederhana ────────────────────────────────────────────────
//
// Dalam proses, jendela geser. Tujuannya bukan menahan serangan besar (itu
// tugas lapisan di atas kalau kelak di-hosting), tapi memastikan satu klien
// tidak bisa memaksa aplikasi ini menembak situs orang berkali-kali per detik.

const jejak = new Map<string, number[]>();

export type HasilBatas = { boleh: boolean; sisaDetik: number };

export function batasLaju(
  kunci: string,
  maks: number,
  jendelaMs: number,
  sekarang: number = Date.now()
): HasilBatas {
  const riwayat = (jejak.get(kunci) ?? []).filter((t) => sekarang - t < jendelaMs);
  if (riwayat.length >= maks) {
    const tertua = riwayat[0];
    jejak.set(kunci, riwayat);
    return {
      boleh: false,
      sisaDetik: Math.max(1, Math.ceil((jendelaMs - (sekarang - tertua)) / 1000)),
    };
  }
  riwayat.push(sekarang);
  jejak.set(kunci, riwayat);
  return { boleh: true, sisaDetik: 0 };
}

export function lupakanBatasLaju(kunci?: string): void {
  if (kunci) jejak.delete(kunci);
  else jejak.clear();
}

/** Pengenal pemanggil untuk pembatas laju. Di balik proxy pakai X-Forwarded-For. */
export function pengenalPemanggil(req: Request): string {
  const f = req.headers.get("x-forwarded-for");
  if (f) return f.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "lokal";
}
