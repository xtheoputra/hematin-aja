/**
 * Pencatatan kejadian yang TERSIMPAN.
 *
 * `console.log` hilang begitu proses restart, dan kegagalan terburuk di proyek
 * ini adalah adapter yang **mati diam-diam**: tampilan tetap normal sementara
 * harga diam-diam basi. Satu-satunya cara tahu adalah catatan yang bisa dibaca
 * ulang besok.
 *
 * Aturan berkas ini: **mencatat tidak boleh menjatuhkan pekerjaan utama.**
 * Semua kegagalan penulisan ditelan; log adalah pengamat, bukan pemblokir.
 */
import { prisma } from "@/lib/db";

export type TingkatLog = "info" | "warn" | "error";

/** Kanal = bagian sistem mana yang bicara. Sengaja tertutup supaya bisa disaring. */
export type KanalLog =
  | "scrape" // adapter toko
  | "refresh" // Open Prices
  | "admin" // input manual & perubahan data
  | "api" // error rute
  | "harga" // validasi harga
  | "cari" // kegagalan pencocokan
  | "klik"; // pengguna menyeberang ke situs toko

export type BarisLog = {
  id: string;
  level: string;
  channel: string;
  message: string;
  detail: string | null;
  createdAt: Date;
};

function keTeks(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  try {
    return JSON.stringify(detail).slice(0, 4000);
  } catch {
    return String(detail).slice(0, 4000);
  }
}

export async function catat(
  level: TingkatLog,
  channel: KanalLog,
  message: string,
  detail?: unknown
): Promise<void> {
  const teks = keTeks(detail);
  // Tetap tampil di terminal saat dev — log tersimpan untuk diperiksa nanti,
  // terminal untuk yang sedang menonton sekarang.
  if (process.env.NODE_ENV !== "test") {
    const tulis = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    tulis(`[${channel}] ${message}${teks ? " " + teks : ""}`);
  }
  try {
    await prisma.eventLog.create({
      data: { level, channel, message: message.slice(0, 500), detail: teks },
    });
  } catch {
    // Database sedang tidak bisa ditulis. Jangan menggagalkan pemanggil.
  }
}

export const log = {
  info: (channel: KanalLog, message: string, detail?: unknown) =>
    catat("info", channel, message, detail),
  peringatan: (channel: KanalLog, message: string, detail?: unknown) =>
    catat("warn", channel, message, detail),
  galat: (channel: KanalLog, message: string, detail?: unknown) =>
    catat("error", channel, message, detail),
};

export async function bacaLog(opts: {
  channel?: KanalLog;
  level?: TingkatLog;
  limit?: number;
} = {}): Promise<BarisLog[]> {
  const { channel, level, limit = 50 } = opts;
  try {
    return await prisma.eventLog.findMany({
      where: { ...(channel ? { channel } : {}), ...(level ? { level } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(1, limit), 500),
    });
  } catch {
    return [];
  }
}

/**
 * Coba lagi dengan jeda menaik. Dipakai untuk pengambilan data ke situs luar
 * yang gagalnya sering sesaat (jaringan goyang, rate limit sebentar).
 *
 * Sengaja TIDAK dipakai untuk kegagalan yang jelas permanen (404, parser
 * berubah) — mengulang permintaan ke situs orang tanpa alasan bukan sikap
 * yang mau dianut proyek ini.
 */
export async function cobaLagi<T>(
  fn: () => Promise<T>,
  opts: { percobaan?: number; jedaAwalMs?: number; label?: string } = {}
): Promise<T> {
  const { percobaan = 3, jedaAwalMs = 500, label = "permintaan" } = opts;
  let terakhir: unknown;
  for (let i = 0; i < percobaan; i++) {
    try {
      return await fn();
    } catch (e) {
      terakhir = e;
      if (i < percobaan - 1) {
        const jeda = jedaAwalMs * 2 ** i;
        await new Promise((r) => setTimeout(r, jeda));
      }
    }
  }
  await log.peringatan("api", `${label} gagal setelah ${percobaan} percobaan`, {
    error: terakhir instanceof Error ? terakhir.message : String(terakhir),
  });
  throw terakhir;
}
