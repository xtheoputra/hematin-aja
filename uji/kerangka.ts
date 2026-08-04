/**
 * Kerangka uji seadanya — tanpa dependensi baru.
 *
 * Sengaja tidak memakai Jest/Vitest: proyek ini cuma butuh "jalankan, hitung,
 * laporkan yang gagal". Menambah 200 paket demi itu tidak sepadan, dan `tsx`
 * sudah terpasang untuk menjalankan TypeScript langsung.
 *
 * Pemakaian di berkas `*.uji.ts`:
 *
 *   kelompok("normalisasi", () => {
 *     uji("huruf besar disamakan", () => harus.sama(normalize("AQUA"), "aqua"));
 *   });
 */

export type HasilUji = {
  kelompok: string;
  nama: string;
  lulus: boolean;
  pesan?: string;
};

type Kasus = { nama: string; fn: () => void | Promise<void> };

const daftar: { nama: string; kasus: Kasus[] }[] = [];
let kelompokBerjalan: { nama: string; kasus: Kasus[] } | null = null;

export function kelompok(nama: string, fn: () => void): void {
  const k = { nama, kasus: [] as Kasus[] };
  daftar.push(k);
  kelompokBerjalan = k;
  fn();
  kelompokBerjalan = null;
}

export function uji(nama: string, fn: () => void | Promise<void>): void {
  if (!kelompokBerjalan) throw new Error(`uji("${nama}") di luar kelompok()`);
  kelompokBerjalan.kasus.push({ nama, fn });
}

export async function jalankanSemua(): Promise<HasilUji[]> {
  const hasil: HasilUji[] = [];
  for (const k of daftar) {
    for (const kasus of k.kasus) {
      try {
        await kasus.fn();
        hasil.push({ kelompok: k.nama, nama: kasus.nama, lulus: true });
      } catch (e) {
        hasil.push({
          kelompok: k.nama,
          nama: kasus.nama,
          lulus: false,
          pesan: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
  return hasil;
}

class GagalUji extends Error {}

function tampil(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (v instanceof Set) return `Set(${[...v].map(tampil).join(", ")})`;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const harus = {
  sama(nyata: unknown, harapan: unknown, catatan = ""): void {
    const a = tampil(nyata);
    const b = tampil(harapan);
    if (a !== b) {
      throw new GagalUji(
        `${catatan ? catatan + " — " : ""}dapat ${a}, seharusnya ${b}`
      );
    }
  },

  benar(nilai: unknown, catatan = "nilai"): void {
    if (!nilai) throw new GagalUji(`${catatan} seharusnya benar, dapat ${tampil(nilai)}`);
  },

  salah(nilai: unknown, catatan = "nilai"): void {
    if (nilai) throw new GagalUji(`${catatan} seharusnya salah, dapat ${tampil(nilai)}`);
  },

  /** Untuk angka pecahan yang tak pernah sama persis. */
  dekat(nyata: number, harapan: number, toleransi = 1e-9, catatan = ""): void {
    if (Math.abs(nyata - harapan) > toleransi) {
      throw new GagalUji(
        `${catatan ? catatan + " — " : ""}dapat ${nyata}, seharusnya ±${toleransi} dari ${harapan}`
      );
    }
  },

  memuat(kumpulan: readonly unknown[], nilai: unknown, catatan = "daftar"): void {
    if (!kumpulan.some((x) => tampil(x) === tampil(nilai))) {
      throw new GagalUji(`${catatan} seharusnya memuat ${tampil(nilai)}`);
    }
  },

  takMemuat(kumpulan: readonly unknown[], nilai: unknown, catatan = "daftar"): void {
    if (kumpulan.some((x) => tampil(x) === tampil(nilai))) {
      throw new GagalUji(`${catatan} seharusnya TIDAK memuat ${tampil(nilai)}`);
    }
  },

  /** Fungsi harus melempar error — dipakai menguji validasi masukan. */
  async melempar(fn: () => unknown, catatan = "pemanggilan"): Promise<void> {
    try {
      await fn();
    } catch {
      return;
    }
    throw new GagalUji(`${catatan} seharusnya melempar error, tapi sukses`);
  },

  minimal(nyata: number, batas: number, catatan = "nilai"): void {
    if (!(nyata >= batas)) {
      throw new GagalUji(`${catatan} = ${nyata}, seharusnya minimal ${batas}`);
    }
  },

  maksimal(nyata: number, batas: number, catatan = "nilai"): void {
    if (!(nyata <= batas)) {
      throw new GagalUji(`${catatan} = ${nyata}, seharusnya maksimal ${batas}`);
    }
  },
};
