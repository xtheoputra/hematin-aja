/**
 * Cache dalam proses, di **lapisan data** — bukan lapisan halaman.
 *
 * Kenapa bukan halaman: 12 berkas memakai `export const dynamic = "force-dynamic"`
 * karena mode tampilan (Semua / Hanya Nyata) dibaca dari cookie. Selama itu
 * terpasang, seluruh caching Next.js mati. Jadi cache harus di bawahnya.
 *
 * ⚠️ Aturan yang tidak boleh dilanggar: **kunci cache wajib memuat `realOnly`.**
 * Kalau lupa, pengguna mode "Hanya Nyata" akan disuguhi hasil mode "Semua" dari
 * cache — artinya harga PERKIRAAN tampil sebagai harga NYATA, dan seluruh
 * fitur kejujuran data batal. Karena itu `kunciData()` menerima realOnly
 * sebagai parameter posisi yang wajib, bukan bagian opsional dari objek opsi.
 *
 * Redis belum perlu: satu proses, data kecil, dan tiap penulisan harga
 * membatalkan cache-nya sendiri.
 */

type Entri = { nilai: unknown; kedaluwarsa: number };

const isi = new Map<string, Entri>();

/** Batas kasar supaya cache tak tumbuh selamanya di proses yang hidup lama. */
const MAKS_ENTRI = 500;

export const TTL = {
  /** Hasil pencarian & daftar produk. */
  cari: 10 * 60_000,
  /** Daftar harga & ringkasan toko — lebih pendek, lebih sering berubah. */
  harga: 5 * 60_000,
} as const;

/**
 * Bangun kunci cache. `realOnly` wajib dan selalu ikut — lihat catatan di atas.
 */
export function kunciData(
  nama: string,
  realOnly: boolean,
  ...bagian: (string | number | boolean | null | undefined)[]
): string {
  const ekor = bagian.map((b) => (b === undefined || b === null ? "" : String(b)));
  return [nama, realOnly ? "real" : "all", ...ekor].join("|");
}

/**
 * Kunci untuk data yang memang TIDAK bergantung mode tampilan (mis. stempel
 * waktu harga terbaru). Dibuat terpisah supaya "tidak ada realOnly di sini"
 * jadi keputusan yang terbaca, bukan kelupaan.
 */
export function kunciTakBergantungMode(
  nama: string,
  ...bagian: (string | number | boolean | null | undefined)[]
): string {
  return [nama, "semua-mode", ...bagian.map((b) => String(b ?? ""))].join("|");
}

export function ambilCache<T>(kunci: string): T | undefined {
  const e = isi.get(kunci);
  if (!e) return undefined;
  if (Date.now() > e.kedaluwarsa) {
    isi.delete(kunci);
    return undefined;
  }
  return e.nilai as T;
}

export function simpanCache(kunci: string, nilai: unknown, ttlMs: number): void {
  if (isi.size >= MAKS_ENTRI) {
    // Buang yang paling tua (Map menjaga urutan penyisipan). Cukup untuk skala
    // ini; LRU penuh belum sepadan kerumitannya.
    const tertua = isi.keys().next().value;
    if (tertua !== undefined) isi.delete(tertua);
  }
  isi.set(kunci, { nilai, kedaluwarsa: Date.now() + ttlMs });
}

/** Bungkus sebuah pengambilan data dengan cache. */
export async function denganCache<T>(
  kunci: string,
  ttlMs: number,
  ambil: () => Promise<T>
): Promise<T> {
  const tersimpan = ambilCache<T>(kunci);
  if (tersimpan !== undefined) return tersimpan;
  const hasil = await ambil();
  simpanCache(kunci, hasil, ttlMs);
  return hasil;
}

/**
 * Buang cache. Dipanggil setiap kali harga baru masuk (refresh, scrape, input
 * manual) — data lama yang masih "belum kedaluwarsa" justru yang paling
 * menyesatkan tepat setelah pembaruan.
 */
export function batalkanCache(awalan?: string): number {
  if (!awalan) {
    const n = isi.size;
    isi.clear();
    return n;
  }
  let n = 0;
  for (const k of [...isi.keys()]) {
    if (k.startsWith(awalan)) {
      isi.delete(k);
      n++;
    }
  }
  return n;
}

/** Untuk uji & penelusuran. */
export function statistikCache(): { entri: number; kunci: string[] } {
  return { entri: isi.size, kunci: [...isi.keys()] };
}
