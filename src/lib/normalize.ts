/**
 * Normalisasi & pencocokan nama produk — logika MURNI, tanpa database.
 *
 * Ada karena pencarian lama memakai `contains` mentah pada `name`/`brand`,
 * sehingga `"mie goreng indomie"` tidak menemukan apa pun padahal produknya ada.
 *
 * Dua aturan yang menentukan seluruh berkas ini:
 *
 *  1. **Kata jenis produk tidak dihapus, tapi dijadikan opsional.** Menghapus
 *     "mie" sebagai substring merusak merek (`indomie` → `indo`); menghapusnya
 *     sebagai token utuh membuang informasi (`Mie Sedaap` → `Sedaap`, bisa
 *     tertukar dengan `Kecap Sedaap`). Lihat KATA_KATEGORI.
 *
 *  2. **Merek & ukuran adalah gerbang keras.** `Indomie Goreng` bukan
 *     `Mie Sedaap Goreng`, dan `Aqua 600ml` bukan `Aqua 19L`. Salah cocok =
 *     menampilkan harga produk lain sebagai "lebih murah" — itu menyesatkan
 *     orang saat belanja, lebih merugikan daripada tidak ketemu sama sekali.
 */

/**
 * Token jenis produk yang boleh tidak ada di sisi produk tanpa menggugurkan
 * pencocokan. Sengaja pendek: tiap tambahan melonggarkan pencarian, jadi
 * tambahkan hanya kalau ada kueri gagal nyata yang menuntutnya.
 */
export const KATA_KATEGORI = new Set([
  "mie",
  "susu",
  "air",
  "minyak",
  "teh",
  "kopi",
  "gula",
]);

/** Frasa multi-kata yang disamakan sebelum dipecah jadi token. */
const FRASA_SINONIM: [RegExp, string][] = [
  [/\bsusu\s+uht\b/g, "susu"],
  [/\bair\s+mineral\b/g, "air"],
];

/**
 * Sinonim token utuh — TIDAK pernah diterapkan sebagai substring.
 * Sengaja sedikit: tiap baris di sini menyatukan dua kata selamanya, jadi
 * hanya masukkan yang benar-benar ejaan berbeda untuk hal yang sama.
 */
const SINONIM: Record<string, string> = {
  mi: "mie",
  cokelat: "coklat",
  chocolate: "coklat",
  kemasan: "pak",
};

// Satuan → pengali ke satuan dasar. Volume dibawa ke ml, massa ke g, supaya
// "1 L" dan "1000 ml" menghasilkan token yang sama persis.
const VOLUME: Record<string, number> = {
  ml: 1,
  cc: 1,
  l: 1000,
  lt: 1000,
  ltr: 1000,
  liter: 1000,
};
const MASSA: Record<string, number> = {
  mg: 0.001,
  g: 1,
  gr: 1,
  gram: 1,
  kg: 1000,
  kilo: 1000,
  kilogram: 1000,
};
// Satuan hitung: digabung dengan angkanya supaya tidak menyisakan token "1"
// yang tak bermakna, tapi TIDAK ikut gerbang ukuran (lihat adalahUkuran).
const HITUNG: Record<string, string> = {
  pc: "pc",
  pcs: "pc",
  pieces: "pc",
  piece: "pc",
  pack: "pak",
  pak: "pak",
  pck: "pak",
  bungkus: "pak",
  sachet: "sachet",
  sct: "sachet",
  renceng: "renceng",
  butir: "butir",
  buah: "buah",
};

// Alternatif panjang lebih dulu supaya "gram" tidak keburu cocok sebagai "g".
const RE_SATUAN =
  /(\d+(?:[.,]\d+)?)\s*(kilogram|kilo|gram|liter|renceng|bungkus|sachet|pieces|piece|butir|pack|buah|pcs|ltr|pck|pak|sct|kg|mg|gr|ml|cc|lt|pc|g|l)\b/g;

/**
 * Angka bergaya Indonesia maupun Inggris.
 * "1,5" & "1.5" = pecahan; "1.500" & "1,500" = ribuan (3 digit di belakang).
 */
function keAngka(raw: string): number {
  const m = raw.match(/^(\d+)[.,](\d+)$/);
  if (!m) return Number(raw);
  return m[2].length === 3 ? Number(m[1] + m[2]) : Number(`${m[1]}.${m[2]}`);
}

function kanonSatuan(angka: string, satuan: string): string {
  const n = keAngka(angka);
  if (!Number.isFinite(n)) return `${angka}${satuan}`;
  if (satuan in VOLUME) return `${Math.round(n * VOLUME[satuan])}ml`;
  if (satuan in MASSA) return `${Math.round(n * MASSA[satuan])}g`;
  if (satuan in HITUNG) return `${Math.round(n)}${HITUNG[satuan]}`;
  return `${Math.round(n)}${satuan}`;
}

/** Token ukuran (massa/volume) — inilah yang dipakai gerbang ukuran §1.3. */
export function adalahUkuran(token: string): boolean {
  return /^\d+(ml|g)$/.test(token);
}

/**
 * Pecah teks jadi token yang sudah diseragamkan. Urutan token DIPERTAHANKAN
 * di sini; yang mengurutkan hanya normalize().
 */
export function tokenize(teks: string | null | undefined): string[] {
  if (!teks) return [];

  let s = teks
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // buang diakritik hasil NFKD
    .replace(/[^\p{L}\p{N}.,]+/gu, " ");

  // Gabungkan angka + satuan lebih dulu; langkah ini sekalian menyerap
  // pemisah desimalnya sebelum semua tanda baca dibuang.
  s = s.replace(RE_SATUAN, (_, n: string, u: string) => ` ${kanonSatuan(n, u)} `);

  // Sisa pemisah ribuan yang tidak bersatuan: "1.500" → "1500".
  s = s.replace(/(\d)[.,](\d{3})\b/g, "$1$2").replace(/[.,]/g, " ");

  for (const [re, ganti] of FRASA_SINONIM) s = s.replace(re, ganti);

  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SINONIM[t] ?? t);
}

/**
 * Bentuk baku sebuah nama: token diseragamkan, di-dedup, lalu **diurutkan**.
 * Urutan kata jadi tidak berpengaruh — inilah yang membuat
 * "mie goreng indomie" dan "indomie goreng" bertemu di satu nilai.
 */
export function normalize(teks: string | null | undefined): string {
  return [...new Set(tokenize(teks))].sort().join(" ");
}

export type ProdukUntukCocok = {
  name: string;
  brand?: string | null;
  unit?: string | null;
};

/**
 * Token yang mewakili sebuah produk: nama + merek + satuan.
 * Satuan ikut karena di data ini ukuran justru tinggal di sana
 * ("Air Mineral Aqua" + unit "600 ml"), dan ukuran adalah gerbang keras.
 */
export function tokenProduk(p: ProdukUntukCocok): string[] {
  return [
    ...new Set([
      ...tokenize(p.name),
      ...tokenize(p.brand),
      ...tokenize(p.unit),
    ]),
  ];
}

/**
 * Gabungan token yang bersebelahan: `["mamy","poko"]` → `"mamypoko"`.
 *
 * Merek Indonesia lazim ditulis dua cara — "Mamy Poko"/"mamypoko",
 * "Coca-Cola"/"cocacola", "Silver Queen"/"silverqueen" — dan pengguna mengetik
 * yang mana saja. Ini pola umum, bukan tambalan untuk satu produk; menanganinya
 * di sini jauh lebih murah daripada menuntut satu alias per merek.
 */
export function gabunganBersebelahan(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    // Angka tidak digabung: "1 pcs" tidak boleh jadi "1pcs" yang menyaru ukuran.
    if (/\d/.test(a) || /\d/.test(b)) continue;
    out.push(a + b);
  }
  return out;
}

/**
 * Token produk untuk keperluan PENCOCOKAN — lebih luas daripada `tokenProduk()`
 * karena memuat gabungan token bersebelahan. Sengaja dipisah supaya tambahan
 * ini tidak ikut menghitung "seberapa banyak isi produk yang tak tersentuh
 * kueri" saat memberi skor.
 */
export function tokenCocokProduk(p: ProdukUntukCocok): string[] {
  const nama = tokenize(p.name);
  const merek = tokenize(p.brand);
  return [
    ...new Set([
      ...nama,
      ...merek,
      ...tokenize(p.unit),
      ...gabunganBersebelahan(nama),
      ...gabunganBersebelahan(merek),
    ]),
  ];
}

/** Jarak sunting dengan ambang: berhenti begitu melewati `batas`. */
export function jarakSunting(a: string, b: string, batas = 1): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > batas) return batas + 1;
  let sebelum = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const kini = [i];
    let minBaris = i;
    for (let j = 1; j <= b.length; j++) {
      const biaya = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(kini[j - 1] + 1, sebelum[j] + 1, sebelum[j - 1] + biaya);
      kini.push(v);
      if (v < minBaris) minBaris = v;
    }
    if (minBaris > batas) return batas + 1;
    sebelum = kini;
  }
  return sebelum[b.length];
}

const PANJANG_MIN_TYPO = 5; // di bawah ini, salah 1 huruf sudah kata lain

type Kecocokan = "persis" | "terkandung" | "typo" | "tidak";

function nilaiToken(
  token: string,
  produk: Set<string>,
  toleransiTypo: boolean
): Kecocokan {
  if (produk.has(token)) return "persis";
  // "mie" harus tetap menemukan "indomie" — kata majemuk lazim di bahasa
  // Indonesia, dan tanpa ini pencarian jadi lebih buruk dari versi lama.
  if (token.length >= 3) {
    for (const t of produk) if (t.length > token.length && t.includes(token)) return "terkandung";
  }
  if (toleransiTypo && token.length >= PANJANG_MIN_TYPO) {
    for (const t of produk) if (jarakSunting(token, t, 1) <= 1) return "typo";
  }
  return "tidak";
}

const BOBOT: Record<Exclude<Kecocokan, "tidak">, number> = {
  persis: 1,
  terkandung: 0.6,
  typo: 0.4,
};

export type HasilCocok = {
  cocok: boolean;
  skor: number; // 0..1 — 1 hanya untuk nama yang identik setelah normalisasi
  alasan?: string; // kenapa TIDAK cocok; berguna untuk menelusuri kueri gagal
};

export type OpsiCocok = {
  /**
   * Seluruh token merek yang dikenal katalog. Tanpa ini gerbang merek tidak
   * bisa membedakan "token merek yang salah" dari "token biasa yang tak ada".
   */
  merekDikenal?: Set<string>;
  /** Toleransi salah ketik ringan — sengaja mati secara bawaan (jaga presisi). */
  toleransiTypo?: boolean;
};

/**
 * Apakah `kueri` menunjuk `produk`? Mengembalikan skor untuk pengurutan.
 *
 * Urutan pemeriksaan sengaja: gerbang keras dulu (murah & menggugurkan), baru
 * keterkandungan token.
 */
export function cocok(
  kueri: string,
  produk: ProdukUntukCocok,
  opsi: OpsiCocok = {}
): HasilCocok {
  const q = [...new Set(tokenize(kueri))];
  if (q.length === 0) return { cocok: false, skor: 0, alasan: "kueri kosong" };

  const tp = tokenProduk(produk);
  // Pencocokan memakai himpunan yang lebih luas; penilaian skor memakai yang
  // sempit, supaya token bantu tidak menggeser peringkat.
  const p = new Set(tokenCocokProduk(produk));
  const pSempit = new Set(tp);

  // Gerbang 1 — ukuran. "aqua 600ml" tidak boleh menjaring "Aqua 19 L".
  const ukuranQ = q.filter(adalahUkuran);
  if (ukuranQ.length > 0) {
    const ukuranP = tp.filter(adalahUkuran);
    if (!ukuranQ.every((u) => ukuranP.includes(u))) {
      return { cocok: false, skor: 0, alasan: "ukuran berbeda" };
    }
  }

  // Gerbang 2 — merek. Bila kueri menyebut merek yang dikenal katalog, merek
  // produk WAJIB memuatnya.
  //
  // Kata kategori DIKECUALIKAN, dan itu bukan detail kecil: "mie" adalah token
  // merek yang sah (dari "Mie Sedaap"), jadi tanpa pengecualian ini kueri
  // "mie goreng indomie" digugurkan sebagai "merek berbeda" — persis kasus
  // yang jadi alasan seluruh pencocokan ini ditulis ulang.
  if (opsi.merekDikenal && opsi.merekDikenal.size > 0) {
    const merekQ = q.filter(
      (t) => opsi.merekDikenal!.has(t) && !KATA_KATEGORI.has(t)
    );
    if (merekQ.length > 0) {
      const merekP = new Set(tokenize(produk.brand));
      if (!merekQ.every((t) => merekP.has(t))) {
        return { cocok: false, skor: 0, alasan: "merek berbeda" };
      }
    }
  }

  // Keterkandungan token: semua token WAJIB (non-kategori) harus terwakili.
  const nilai = new Map<string, Kecocokan>();
  for (const t of q) nilai.set(t, nilaiToken(t, p, opsi.toleransiTypo ?? false));

  const wajib = q.filter((t) => !KATA_KATEGORI.has(t));
  const kurang = wajib.filter((t) => nilai.get(t) === "tidak");
  if (kurang.length > 0) {
    return {
      cocok: false,
      skor: 0,
      alasan: `token tidak ditemukan: ${kurang.join(", ")}`,
    };
  }

  // Kueri yang isinya kata kategori semua ("mie") tetap harus menyentuh produk,
  // kalau tidak semua produk akan cocok.
  if (wajib.length === 0 && q.every((t) => nilai.get(t) === "tidak")) {
    return { cocok: false, skor: 0, alasan: "tidak ada token yang menyentuh produk" };
  }

  if (normalize(kueri) === normalize(produk.name)) return { cocok: true, skor: 1 };

  let bobot = 0;
  for (const t of q) {
    const k = nilai.get(t)!;
    if (k !== "tidak") bobot += BOBOT[k];
  }
  // Token produk yang tak tersentuh kueri menurunkan skor sedikit, supaya
  // "Indomie Goreng" menang atas "Indomie Goreng Jumbo" untuk kueri pendek.
  const sisa = Math.max(0, pSempit.size - q.length);
  const skor = Math.max(0.05, Math.min(0.99, bobot / q.length - sisa * 0.03));

  return { cocok: true, skor };
}
