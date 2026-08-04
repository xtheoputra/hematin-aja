/**
 * Kendali mutu harga — logika MURNI, tanpa database.
 *
 * Sebelumnya satu-satunya aturan adalah "harga > 0", sehingga Indomie seharga
 * Rp 100.000 akan masuk tanpa perlawanan. Harga salah lebih berbahaya daripada
 * harga kosong: yang kosong terlihat kosong, yang salah terlihat seperti fakta.
 *
 * Dua lapis:
 *  1. **Median historis produk itu sendiri** — tahan banting, karena ikut
 *     bergerak saat harga pasar benar-benar berubah.
 *  2. **Rentang per kategori** — jaring pengaman saat produk belum punya
 *     riwayat sama sekali (harga pertamanya tidak punya pembanding).
 *
 * Harga yang ditolak WAJIB dicatat, jangan dibuang diam-diam: penolakan yang
 * menumpuk adalah tanda parser rusak, bukan tanda sistem bekerja.
 */

/** Sekali harga menyimpang lebih dari ini dari median, hampir pasti salah baca. */
export const BATAS_BAWAH_MEDIAN = 0.25;
export const BATAS_ATAS_MEDIAN = 4;

/**
 * Jaring pengaman per kategori, dalam Rupiah. Sengaja LEBAR — tugasnya menolak
 * yang mustahil (Rp 12 atau Rp 90 juta), bukan menebak harga wajar.
 */
export const RENTANG_KATEGORI: Record<string, [number, number]> = {
  sembako: [2_000, 500_000],
  "bumbu-dapur": [1_000, 200_000],
  "makanan-instan": [1_000, 100_000],
  minuman: [1_000, 200_000],
  "susu-telur": [2_000, 500_000],
  kebersihan: [1_000, 300_000],
  "ibu-bayi": [5_000, 1_000_000],
  snack: [500, 200_000],
};

/** Dipakai saat kategorinya tak dikenal. Hanya menyaring yang benar-benar mustahil. */
export const RENTANG_BAWAAN: [number, number] = [100, 5_000_000];

export type HasilPeriksaHarga = {
  sah: boolean;
  /** Alasan penolakan — masuk ke log, dan ke pesan galat form admin. */
  alasan?: string;
};

export function median(angka: number[]): number | null {
  const bersih = angka.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (bersih.length === 0) return null;
  const t = Math.floor(bersih.length / 2);
  return bersih.length % 2 ? bersih[t] : Math.round((bersih[t - 1] + bersih[t]) / 2);
}

export function periksaHarga(
  harga: number,
  konteks: { median?: number | null; kategori?: string | null } = {}
): HasilPeriksaHarga {
  if (!Number.isFinite(harga)) return { sah: false, alasan: "harga bukan angka" };
  if (!Number.isInteger(harga)) {
    return { sah: false, alasan: "harga harus bilangan bulat Rupiah" };
  }
  if (harga <= 0) return { sah: false, alasan: "harga harus lebih dari 0" };

  const { median: med, kategori } = konteks;

  if (med && med > 0) {
    const bawah = med * BATAS_BAWAH_MEDIAN;
    const atas = med * BATAS_ATAS_MEDIAN;
    if (harga < bawah || harga > atas) {
      return {
        sah: false,
        alasan:
          `harga ${harga} menyimpang jauh dari median riwayat produk ini (${med}); ` +
          `yang wajar ${Math.round(bawah)}–${Math.round(atas)}`,
      };
    }
    return { sah: true };
  }

  // Belum ada riwayat → pakai jaring pengaman kategori.
  const [min, maks] = (kategori && RENTANG_KATEGORI[kategori]) || RENTANG_BAWAAN;
  if (harga < min || harga > maks) {
    return {
      sah: false,
      alasan:
        `harga ${harga} di luar rentang wajar kategori ` +
        `${kategori ?? "(tak dikenal)"} (${min}–${maks})`,
    };
  }
  return { sah: true };
}

/**
 * Apakah dua catatan harga jatuh di hari yang sama? Dipakai untuk aturan
 * "satu harga per produk × toko × sumber per hari" — tanpa itu, menekan tombol
 * Refresh lima kali menghasilkan lima baris identik yang mengotori riwayat.
 */
export function hariSama(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function awalHari(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function akhirHari(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
