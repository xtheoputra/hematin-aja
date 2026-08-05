/**
 * Analitik pencarian.
 *
 * `SearchLog` sudah mencatat tiap pencarian sejak Sesi 6, tapi isinya belum
 * pernah ditampilkan di mana pun — data yang dikumpulkan tapi tak pernah
 * dibaca sama saja dengan tidak dikumpulkan.
 *
 * Yang dijawab di sini sengaja hanya pertanyaan yang **mengubah keputusan**:
 *
 *  - *Apa yang dicari orang?* → menentukan produk mana yang layak diisi harga
 *    nyatanya lebih dulu. Daftar kerja `/admin` yang lama mengurutkan dari
 *    yang paling kosong; ini mengurutkan dari yang paling dicari, dan yang
 *    kedua jauh lebih berharga.
 *  - *Jalur mana yang menemukan?* → kalau `typo` dan `alias` mendominasi,
 *    artinya pencocokan pokoknya lemah; kalau `persis` mendominasi, kuat.
 *  - *Kapan orang mencari?* → tanpa ini, "6 pencarian tercatat" tak bisa
 *    dibedakan antara 6 hari berturut-turut atau 6 kali dalam satu menit.
 *
 * Bagian yang MURNI (mengubah baris log jadi ringkasan) dipisah ke fungsi
 * sendiri supaya bisa diuji tanpa database.
 */
import { prisma } from "@/lib/db";

/** Jendela waktu analitik, dalam hari. */
export const HARI_ANALITIK = 14;

export type BarisKueri = { query: string; jumlah: number; hasilTerakhir: number };
export type TitikHarian = { tanggal: string; jumlah: number; gagal: number };
export type PorsiJalur = { jalur: string; jumlah: number; persen: number };

export type AnalitikPencarian = {
  totalPencarian: number;
  totalGagal: number;
  /** 0–100. Bagian pencarian yang tidak menemukan apa pun. */
  persenGagal: number;
  kueriTeratas: BarisKueri[];
  harian: TitikHarian[];
  jalur: PorsiJalur[];
  /**
   * Klik menyeberang ke situs toko. Menjawab yang tak bisa dijawab data harga:
   * toko mana yang benar-benar didatangi orang setelah membandingkan.
   */
  klikToko: { toko: string; jumlah: number }[];
  /** Ada data sama sekali? Dipakai UI untuk memilih pesan kosong yang tepat. */
  kosong: boolean;
};

export type BarisLogRingkas = {
  query: string;
  resultCount: number;
  jalur: string | null;
  createdAt: Date;
};

const kunciHari = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Ubah baris log mentah jadi ringkasan. **Murni** — tanpa database, tanpa jam
 * dinding (`sampai` disuntikkan), jadi hasilnya bisa dikunci uji.
 */
export function ringkasPencarian(
  baris: BarisLogRingkas[],
  sampai: Date,
  hari = HARI_ANALITIK,
  batasKueri = 10,
  klik: { toko: string; jumlah: number }[] = []
): AnalitikPencarian {
  const totalPencarian = baris.length;
  const totalGagal = baris.filter((b) => b.resultCount === 0).length;

  // Kueri terpopuler. Disamakan huruf besar-kecilnya, karena "Indomie" dan
  // "indomie" adalah minat yang sama.
  const per = new Map<string, { jumlah: number; hasilTerakhir: number; waktu: Date }>();
  for (const b of baris) {
    const k = b.query.trim().toLowerCase();
    if (!k) continue;
    const a = per.get(k) ?? { jumlah: 0, hasilTerakhir: b.resultCount, waktu: b.createdAt };
    a.jumlah++;
    if (b.createdAt >= a.waktu) {
      a.waktu = b.createdAt;
      a.hasilTerakhir = b.resultCount;
    }
    per.set(k, a);
  }
  const kueriTeratas = [...per.entries()]
    .map(([query, v]) => ({ query, jumlah: v.jumlah, hasilTerakhir: v.hasilTerakhir }))
    .sort((a, b) => b.jumlah - a.jumlah || a.query.localeCompare(b.query))
    .slice(0, batasKueri);

  // Deret harian. Hari tanpa pencarian tetap muncul sebagai nol — kalau
  // dilewati, grafiknya memampatkan waktu dan jeda panjang jadi tak terlihat.
  const hitungan = new Map<string, { jumlah: number; gagal: number }>();
  for (const b of baris) {
    const k = kunciHari(b.createdAt);
    const a = hitungan.get(k) ?? { jumlah: 0, gagal: 0 };
    a.jumlah++;
    if (b.resultCount === 0) a.gagal++;
    hitungan.set(k, a);
  }
  const harian: TitikHarian[] = [];
  for (let i = hari - 1; i >= 0; i--) {
    const d = new Date(sampai);
    d.setDate(d.getDate() - i);
    const k = kunciHari(d);
    harian.push({ tanggal: k, ...(hitungan.get(k) ?? { jumlah: 0, gagal: 0 }) });
  }

  // Sebaran jalur pencocokan.
  const perJalur = new Map<string, number>();
  for (const b of baris) {
    const j = b.jalur ?? "tak tercatat";
    perJalur.set(j, (perJalur.get(j) ?? 0) + 1);
  }
  const jalur = [...perJalur.entries()]
    .map(([jalur, jumlah]) => ({
      jalur,
      jumlah,
      persen: totalPencarian > 0 ? (jumlah / totalPencarian) * 100 : 0,
    }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return {
    totalPencarian,
    totalGagal,
    persenGagal: totalPencarian > 0 ? (totalGagal / totalPencarian) * 100 : 0,
    kueriTeratas,
    harian,
    jalur,
    klikToko: [...klik].sort((a, b) => b.jumlah - a.jumlah),
    // "Kosong" hanya bila tidak ada pencarian MAUPUN klik — kalau tidak,
    // panelnya menyembunyikan data klik yang sebenarnya ada.
    kosong: totalPencarian === 0 && klik.length === 0,
  };
}

export async function analitikPencarian(
  hari = HARI_ANALITIK,
  sekarang = new Date()
): Promise<AnalitikPencarian> {
  const sejak = new Date(sekarang);
  sejak.setDate(sejak.getDate() - (hari - 1));
  sejak.setHours(0, 0, 0, 0);

  const [baris, klikMentah] = await Promise.all([
    prisma.searchLog.findMany({
      where: { createdAt: { gte: sejak } },
      select: { query: true, resultCount: true, jalur: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5_000,
    }),
    // Klik tersimpan di EventLog kanal "klik", dengan `message` = slug toko.
    prisma.eventLog.groupBy({
      by: ["message"],
      where: { channel: "klik", createdAt: { gte: sejak } },
      _count: { _all: true },
    }),
  ]);

  const klik = klikMentah.map((k) => ({ toko: k.message, jumlah: k._count._all }));
  return ringkasPencarian(baris, sekarang, hari, 10, klik);
}
