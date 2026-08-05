/**
 * Mesin keputusan belanja — logika MURNI, tanpa database.
 *
 * Ini bukan chatbot. Tidak ada model bahasa, tidak ada API berbayar, tidak ada
 * tebakan: masukan yang sama selalu menghasilkan keputusan yang sama, dan tiap
 * angkanya bisa ditelusuri sampai ke barisnya. Itu syarat mutlak untuk saran
 * yang menyangkut uang orang.
 *
 * Tiga keputusan yang diambil di sini:
 *
 *  1. **Total yang benar-benar sebanding.** Ini koreksi terhadap cara lama.
 *     Dulu total tiap toko hanya menjumlahkan barang yang tersedia, sehingga
 *     toko yang cuma punya 2 dari 8 barang selalu "termurah" — padahal 6
 *     sisanya tetap harus dibeli. Sekarang barang yang tak ada di sebuah toko
 *     tetap dihitung, memakai harga pasar termurah, dan ditandai
 *     "diasumsikan". Barulah angka antar-toko boleh diadu.
 *
 *  2. **Pecah belanja ke dua toko — hanya kalau sepadan.** Menyuruh orang
 *     mampir ke toko kedua demi hemat Rp 800 adalah saran yang buruk, karena
 *     perjalanan itu sendiri berongkos. Jadi hemat dari pemecahan harus
 *     melampaui satu ongkos perjalanan tambahan DAN ambang persentase.
 *
 *  3. **Keyakinan dinyatakan, bukan disembunyikan.** Rencana yang seluruhnya
 *     ditopang harga perkiraan tetap dihitung, tapi harus mengaku begitu.
 */
import { daysSince, formatRupiah } from "@/lib/format";
import { AGING_MAX_DAYS, FRESH_MAX_DAYS } from "@/lib/freshness";
import { periksaHarga } from "@/lib/harga";
import { hargaPerSatuan } from "@/lib/satuan";
import type {
  BarisMasuk,
  BarisRencana,
  HargaToko,
  Keputusan,
  Keyakinan,
  OpsiAgen,
  OpsiToko,
  RencanaPecah,
} from "./tipe";

/**
 * Ongkos satu perjalanan tambahan, dalam Rupiah. Angka bawaan ini sengaja
 * konservatif — kira-kira bensin pulang-pergi ditambah waktu yang terpakai.
 * Bisa diganti pengguna; yang penting angkanya EKSPLISIT, bukan tersembunyi
 * sebagai nol seperti pada perbandingan total yang polos.
 */
export const BIAYA_PERJALANAN_BAWAAN = 10_000;

/**
 * Selain harus melampaui ongkos perjalanan, hemat dari pemecahan juga harus
 * melampaui ambang ini terhadap total belanja. Hemat 0,5% tidak sebanding
 * dengan repotnya mendatangi dua toko, berapa pun rupiahnya.
 */
export const AMBANG_PECAH_PERSEN = 3;

// ───────────────────────── Penyaring harga mustahil ─────────────────────────

export type HargaDibuang = {
  slug: string;
  nama: string;
  toko: string;
  harga: number;
  alasan: string;
};

/**
 * Buang harga yang bahkan tidak lolos aturan mutu yang berlaku sekarang.
 *
 * Katalog ini memuat harga yang masuk sebelum `periksaHarga()` ada — antara
 * lain kopi seharga **Rp 20**, yang ditemukan saat agen dicoba pada data
 * sungguhan. Harga seperti itu bukan cuma aneh dilihat: ia menarik total
 * sebuah toko ke bawah dan bisa memenangkannya tanpa alasan.
 *
 * Kenapa dibuang, bukan sekadar diberi tanda: prinsip yang sudah dianut
 * proyek ini adalah **harga salah lebih berbahaya daripada harga kosong** —
 * yang kosong terlihat kosong, yang salah terlihat seperti fakta. Yang dibuang
 * tetap dilaporkan sebagai peringatan, jadi tidak ada yang hilang diam-diam.
 *
 * Rentangnya sengaja sangat longgar (lihat `RENTANG_KATEGORI`): tugasnya
 * menolak yang mustahil, bukan menebak harga wajar.
 */
export function saringHargaMustahil(keranjang: BarisMasuk[]): {
  bersih: BarisMasuk[];
  dibuang: HargaDibuang[];
} {
  const dibuang: HargaDibuang[] = [];
  const bersih = keranjang.map((b) => {
    const lolos = b.harga.filter((h) => {
      const p = periksaHarga(h.harga, { kategori: b.categorySlug });
      if (p.sah) return true;
      dibuang.push({
        slug: b.slug,
        nama: b.nama,
        toko: h.nama,
        harga: h.harga,
        alasan: p.alasan ?? "di luar rentang wajar",
      });
      return false;
    });
    return lolos.length === b.harga.length ? b : { ...b, harga: lolos };
  });
  return { bersih, dibuang };
}

// ───────────────────────── Harga pasar per produk ─────────────────────────

/** Harga termurah yang tersedia (in stock) untuk sebuah produk di pasar. */
function hargaPasarTermurah(b: BarisMasuk): HargaToko | null {
  const ada = b.harga.filter((h) => h.adaStok);
  if (ada.length === 0) return null;
  return ada.reduce((a, c) => (c.harga < a.harga ? c : a));
}

function perSatuanDari(harga: number | null, satuan: string) {
  const ps = harga === null ? null : hargaPerSatuan(harga, satuan);
  return { perSatuan: ps?.nilai ?? null, satuanTampil: ps?.satuan ?? null };
}

function barisNihil(b: BarisMasuk): BarisRencana {
  return {
    productId: b.productId,
    slug: b.slug,
    nama: b.nama,
    emoji: b.emoji,
    satuan: b.satuan,
    qty: b.qty,
    status: "nihil",
    harga: null,
    subtotal: 0,
    tokoNama: null,
    tokoSlug: null,
    nyata: false,
    perSatuan: null,
    satuanTampil: null,
  };
}

function barisDari(
  b: BarisMasuk,
  h: HargaToko,
  status: "ada" | "diasumsikan"
): BarisRencana {
  const { perSatuan, satuanTampil } = perSatuanDari(h.harga, b.satuan);
  return {
    productId: b.productId,
    slug: b.slug,
    nama: b.nama,
    emoji: b.emoji,
    satuan: b.satuan,
    qty: b.qty,
    status,
    harga: h.harga,
    subtotal: h.harga * b.qty,
    // Barang "diasumsikan" tidak dibeli di toko yang sedang dinilai, jadi
    // menampilkan nama toko di situ hanya akan menyesatkan.
    tokoNama: status === "ada" ? h.nama : null,
    tokoSlug: status === "ada" ? h.slug : null,
    nyata: h.nyata,
    perSatuan,
    satuanTampil,
  };
}

// ───────────────────────────── Toko tunggal ─────────────────────────────

/**
 * Nilai setiap toko seakan-akan seluruh belanja dilakukan di sana.
 *
 * Dua aturan yang membuat angkanya jujur:
 *
 *  - Barang yang tidak dijual toko itu tetap masuk hitungan dengan harga pasar
 *    termurah, karena tetap harus dibeli.
 *  - **Toko yang tidak lengkap membayar satu ongkos perjalanan tambahan.**
 *    Tanpa ini, toko yang cuma punya satu barang murah selalu menang: ia
 *    meminjam harga terbaik seluruh toko lain tanpa biaya, padahal di
 *    kenyataannya sisanya menuntut mampir ke tempat lain — persis ongkos yang
 *    sudah dihitung pada rencana pecah. Satu aturan untuk keduanya:
 *    **tiap kunjungan toko setelah yang pertama berongkos.**
 *
 * Batas yang diakui: ongkosnya dihitung SEKALI, walau barang yang kurang bisa
 * saja tersebar di beberapa toko. Jadi angka toko yang tidak lengkap adalah
 * batas bawah — perkiraan yang menguntungkan toko itu, bukan mengarang.
 *
 * Toko yang tidak punya satu pun barang keranjang sengaja tidak diperingkat:
 * "belanja di sana" bukan pilihan yang bisa dijalankan.
 */
export function nilaiTiapToko(
  keranjang: BarisMasuk[],
  toko: { supermarketId: string; slug: string; nama: string; warna: string }[],
  biayaPerjalanan: number = BIAYA_PERJALANAN_BAWAAN
): OpsiToko[] {
  const pasar = new Map(keranjang.map((b) => [b.productId, hargaPasarTermurah(b)]));

  return toko
    .map((t) => {
      const baris: BarisRencana[] = keranjang.map((b) => {
        const diSini = b.harga.find((h) => h.supermarketId === t.supermarketId && h.adaStok);
        if (diSini) return barisDari(b, diSini, "ada");
        const termurah = pasar.get(b.productId) ?? null;
        if (termurah) return barisDari(b, termurah, "diasumsikan");
        return barisNihil(b);
      });

      const totalTersedia = baris
        .filter((l) => l.status === "ada")
        .reduce((s, l) => s + l.subtotal, 0);
      const totalBarang = baris.reduce((s, l) => s + l.subtotal, 0);
      const jumlahDiasumsikan = baris.filter((l) => l.status === "diasumsikan").length;
      const biayaPerjalananTambahan = jumlahDiasumsikan > 0 ? biayaPerjalanan : 0;

      return {
        ...t,
        totalTersedia,
        totalBarang,
        biayaPerjalananTambahan,
        totalSetara: totalBarang + biayaPerjalananTambahan,
        jumlahAda: baris.filter((l) => l.status === "ada").length,
        jumlahDiasumsikan,
        jumlahNihil: baris.filter((l) => l.status === "nihil").length,
        jumlahNyata: baris.filter((l) => l.status === "ada" && l.nyata).length,
        baris,
      };
    })
    .filter((t) => t.jumlahAda > 0)
    // Yang paling murah SETARA dulu; seri diputus oleh kelengkapan barang,
    // karena rencana yang tidak menuntut mampir ke toko lain lebih berharga.
    .sort(
      (a, b) =>
        a.totalSetara - b.totalSetara ||
        b.jumlahAda - a.jumlahAda ||
        a.nama.localeCompare(b.nama)
    );
}

// ────────────────────────── Pecah ke dua toko ──────────────────────────

/**
 * Cari pasangan toko terbaik bila belanja dipecah dua.
 *
 * Jumlah toko di aplikasi ini kecil (18), jadi seluruh pasangan diperiksa
 * satu per satu — 153 pasangan, hasilnya optimal dan tak perlu heuristik.
 */
export function cariPecahTerbaik(
  keranjang: BarisMasuk[],
  toko: { supermarketId: string; slug: string; nama: string; warna: string }[],
  totalTokoTunggalTerbaik: number,
  biayaPerjalanan: number
): RencanaPecah | null {
  if (keranjang.length < 2 || toko.length < 2) return null;

  const pasar = new Map(keranjang.map((b) => [b.productId, hargaPasarTermurah(b)]));
  let terbaik: RencanaPecah | null = null;

  for (let i = 0; i < toko.length; i++) {
    for (let j = i + 1; j < toko.length; j++) {
      const a = toko[i];
      const b = toko[j];
      const baris: BarisRencana[] = [];
      let totalA = 0;
      let totalB = 0;
      let jumlahA = 0;
      let jumlahB = 0;

      for (const item of keranjang) {
        const hA = item.harga.find((h) => h.supermarketId === a.supermarketId && h.adaStok);
        const hB = item.harga.find((h) => h.supermarketId === b.supermarketId && h.adaStok);
        const pilih = pilihTermurah(hA, hB);

        if (!pilih) {
          const termurah = pasar.get(item.productId) ?? null;
          baris.push(termurah ? barisDari(item, termurah, "diasumsikan") : barisNihil(item));
          continue;
        }

        const l = barisDari(item, pilih, "ada");
        baris.push(l);
        if (pilih.supermarketId === a.supermarketId) {
          totalA += l.subtotal;
          jumlahA++;
        } else {
          totalB += l.subtotal;
          jumlahB++;
        }
      }

      // Kalau salah satu toko tidak kebagian apa pun, ini bukan pemecahan —
      // itu belanja di satu toko, dan sudah dinilai di tempat lain.
      if (jumlahA === 0 || jumlahB === 0) continue;

      const totalBarang = baris.reduce((s, l) => s + l.subtotal, 0);
      const totalAkhir = totalBarang + biayaPerjalanan;
      if (terbaik && totalAkhir >= terbaik.totalAkhir) continue;

      // Toko "utama" = yang menanggung belanja terbesar, supaya penyajiannya
      // masuk akal ("belanja utama di A, mampir ke B untuk 2 barang").
      const aUtama = totalA >= totalB;
      terbaik = {
        utama: aUtama
          ? { slug: a.slug, nama: a.nama, warna: a.warna, total: totalA, jumlah: jumlahA }
          : { slug: b.slug, nama: b.nama, warna: b.warna, total: totalB, jumlah: jumlahB },
        kedua: aUtama
          ? { slug: b.slug, nama: b.nama, warna: b.warna, total: totalB, jumlah: jumlahB }
          : { slug: a.slug, nama: a.nama, warna: a.warna, total: totalA, jumlah: jumlahA },
        totalBarang,
        biayaPerjalanan,
        totalAkhir,
        hemat: totalTokoTunggalTerbaik - totalAkhir,
        baris,
      };
    }
  }

  return terbaik;
}

function pilihTermurah(
  a: HargaToko | undefined,
  b: HargaToko | undefined
): HargaToko | null {
  if (a && b) return a.harga <= b.harga ? a : b;
  return a ?? b ?? null;
}

/** Apakah pemecahan cukup sepadan untuk disarankan? */
export function pecahSepadan(
  pecah: RencanaPecah | null,
  totalTokoTunggalTerbaik: number
): boolean {
  if (!pecah || pecah.hemat <= 0 || totalTokoTunggalTerbaik <= 0) return false;
  const persen = (pecah.hemat / totalTokoTunggalTerbaik) * 100;
  return persen >= AMBANG_PECAH_PERSEN;
}

// ───────────────────────────── Keyakinan ─────────────────────────────

/**
 * Seberapa layak rencana ini dipercaya.
 *
 * Tiga hal yang menurunkannya, dan semuanya harus dinyatakan ke pengguna:
 * berapa banyak yang cuma perkiraan, seberapa tua datanya, dan berapa barang
 * yang sebenarnya tak ketemu di mana pun.
 */
export function hitungKeyakinan(
  baris: BarisRencana[],
  sumberHarga: BarisMasuk[],
  sekarang: Date
): Keyakinan {
  const alasan: string[] = [];
  const berharga = baris.filter((l) => l.harga !== null);
  const nilaiTotal = berharga.reduce((s, l) => s + l.subtotal, 0);

  const porsiNyata =
    nilaiTotal > 0
      ? berharga.filter((l) => l.nyata).reduce((s, l) => s + l.subtotal, 0) / nilaiTotal
      : 0;

  // Umur rata-rata harga yang BENAR-BENAR dipakai rencana ini.
  const umur: number[] = [];
  for (const l of berharga) {
    const asal = sumberHarga.find((b) => b.productId === l.productId);
    const h = asal?.harga.find((x) => x.harga === l.harga && x.adaStok);
    if (h?.dicatatPada) umur.push(daysSince(h.dicatatPada, sekarang));
  }
  const umurRerataHari =
    umur.length > 0 ? Math.round(umur.reduce((a, b) => a + b, 0) / umur.length) : null;

  let faktorSegar = 1;
  if (umurRerataHari !== null) {
    if (umurRerataHari > AGING_MAX_DAYS) faktorSegar = 0.5;
    else if (umurRerataHari > FRESH_MAX_DAYS) faktorSegar = 0.8;
  }

  const kelengkapan =
    baris.length > 0 ? baris.filter((l) => l.status !== "nihil").length / baris.length : 0;

  const nilai = Math.max(0, Math.min(1, porsiNyata * faktorSegar * kelengkapan));

  if (porsiNyata === 0) {
    alasan.push("Seluruh angka di rencana ini masih harga perkiraan, bukan harga yang pernah dicek langsung.");
  } else if (porsiNyata < 0.5) {
    alasan.push(
      `Baru ${Math.round(porsiNyata * 100)}% dari nilai belanja yang ditopang harga nyata; sisanya perkiraan.`
    );
  } else {
    alasan.push(`${Math.round(porsiNyata * 100)}% dari nilai belanja ditopang harga nyata.`);
  }

  if (umurRerataHari !== null && umurRerataHari > AGING_MAX_DAYS) {
    alasan.push(`Harga yang dipakai rata-rata berumur ${umurRerataHari} hari — kemungkinan sudah berubah.`);
  } else if (umurRerataHari !== null && umurRerataHari > FRESH_MAX_DAYS) {
    alasan.push(`Harga yang dipakai rata-rata berumur ${umurRerataHari} hari.`);
  }

  if (kelengkapan < 1) {
    const nihil = baris.filter((l) => l.status === "nihil").length;
    alasan.push(`${nihil} barang tidak punya harga di toko mana pun, jadi tidak ikut dihitung.`);
  }

  const tingkat = nilai >= 0.7 ? "tinggi" : nilai >= 0.35 ? "sedang" : "rendah";
  return { nilai, tingkat, porsiNyata, umurRerataHari, alasan };
}

// ───────────────────────────── Keputusan ─────────────────────────────

export function susunKeputusan(
  tokoTunggal: OpsiToko[],
  pecah: RencanaPecah | null,
  pakaiPecah: boolean,
  biayaPerjalanan: number
): Keputusan {
  if (tokoTunggal.length === 0) {
    return {
      jenis: "tak-bisa-memutuskan",
      judul: "Belum bisa memutuskan",
      alasan: ["Tidak ada satu pun harga untuk barang di keranjang."],
      hemat: 0,
      toko: [],
    };
  }

  const terbaik = tokoTunggal[0];
  const terburuk = tokoTunggal[tokoTunggal.length - 1];
  const hematTunggal = Math.max(0, terburuk.totalSetara - terbaik.totalSetara);

  if (pakaiPecah && pecah) {
    const alasan = [
      `Belanja utama di ${pecah.utama.nama} (${pecah.utama.jumlah} barang), lalu ambil ${pecah.kedua.jumlah} barang di ${pecah.kedua.nama}.`,
      `Hemat ${formatRupiah(pecah.hemat)} dibanding belanja semuanya di ${terbaik.nama}, setelah ongkos perjalanan tambahan ${formatRupiah(biayaPerjalanan)} diperhitungkan.`,
    ];
    return {
      jenis: "pecah-dua-toko",
      judul: `Pecah: ${pecah.utama.nama} + ${pecah.kedua.nama}`,
      alasan,
      hemat: pecah.hemat,
      toko: [pecah.utama.nama, pecah.kedua.nama],
    };
  }

  const alasan: string[] = [];
  if (terbaik.jumlahDiasumsikan === 0 && terbaik.jumlahNihil === 0) {
    alasan.push(`Seluruh ${terbaik.jumlahAda} barang tersedia di ${terbaik.nama}, dan totalnya paling murah.`);
  } else {
    alasan.push(
      `${terbaik.jumlahAda} dari ${terbaik.baris.length} barang tersedia di ${terbaik.nama}; total termurah setelah barang yang kurang ikut dihitung dengan harga pasar.`
    );
  }
  if (hematTunggal > 0) {
    alasan.push(`Hemat ${formatRupiah(hematTunggal)} dibanding toko termahal untuk keranjang yang sama.`);
  }
  // Pemecahan yang ditolak tetap dilaporkan. Pengguna berhak tahu bahwa
  // kemungkinan itu sudah dihitung dan kenapa ia kalah — bukan tidak terpikir.
  if (pecah) {
    alasan.push(
      pecah.hemat > 0
        ? `Pecah belanja ke ${pecah.kedua.nama} cuma hemat ${formatRupiah(pecah.hemat)} — belum sepadan dengan ongkos perjalanan tambahan ${formatRupiah(biayaPerjalanan)}.`
        : `Pecah belanja ke dua toko malah lebih mahal ${formatRupiah(-pecah.hemat)} setelah ongkos perjalanan ${formatRupiah(biayaPerjalanan)} dihitung — belum sepadan.`
    );
  }

  return {
    jenis: "satu-toko",
    judul: `Belanja di ${terbaik.nama}`,
    alasan,
    hemat: hematTunggal,
    toko: [terbaik.nama],
  };
}

/** Opsi yang sudah dilengkapi nilai bawaan. */
export function bakuOpsi(o: OpsiAgen = {}) {
  return {
    biayaPerjalanan: Math.max(0, Math.round(o.biayaPerjalanan ?? BIAYA_PERJALANAN_BAWAAN)),
    hanyaNyata: o.hanyaNyata ?? false,
    sekarang: o.sekarang ?? new Date(),
  };
}
