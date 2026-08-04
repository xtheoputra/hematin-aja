/**
 * Pengirim permintaan admin. Satu tempat supaya semua form memperlakukan
 * balasan gagal dengan cara yang sama — termasuk 401, yang di halaman admin
 * artinya sesi habis, bukan "ada yang rusak".
 */
export type Balasan = { ok: boolean; pesan: string };

export async function kirimJson(url: string, body: unknown): Promise<Balasan> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      pesan?: string;
    };
    if (!res.ok || data.success === false) {
      return {
        ok: false,
        pesan:
          data.message ??
          (res.status === 401
            ? "Sesi admin habis. Muat ulang halaman lalu masuk lagi."
            : `Gagal (kode ${res.status}).`),
      };
    }
    return { ok: true, pesan: data.pesan ?? "Tersimpan." };
  } catch {
    return { ok: false, pesan: "Tidak bisa menghubungi server." };
  }
}

/** Kelas Tailwind yang dipakai ulang oleh semua isian form admin. */
export const KELAS_ISIAN =
  "w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:placeholder:text-ink-600 dark:focus:ring-brand-900";

export const KELAS_LABEL =
  "mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300";
