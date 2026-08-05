/**
 * Harga per satuan — logika MURNI, tanpa database.
 *
 * Kenapa ini ada: sampai sekarang aplikasi hanya membandingkan **harga
 * mutlak**, dan itu diam-diam salah. "Beras 5 kg Rp 62.000" terlihat jauh lebih
 * mahal daripada "Beras 1 kg Rp 13.500", padahal yang pertama Rp 12.400/kg dan
 * yang kedua Rp 13.500/kg. Aplikasi yang seluruh gunanya menghemat justru
 * menunjuk pilihan yang lebih boros. Tanpa berkas ini, kata "termurah" di
 * seluruh aplikasi cuma berarti "angkanya paling kecil".
 *
 * Aturan yang menentukan seluruh berkas ini:
 *
 *  1. **Tidak menebak.** Satuan di katalog nyata berantakan — ada `"1 pcs"`,
 *     `"500ml"`, `"1 pcs (85 g)"`, `"24 x 6.5g"`, tapi juga `"220"`,
 *     `"RH. 30"`, `"123g g"`, bahkan `"susu uht"`. Yang tak terbaca
 *     mengembalikan `null`, bukan angka asal. Harga per satuan yang salah lebih
 *     berbahaya daripada tidak ada, karena tampil seperti fakta.
 *
 *  2. **Hanya yang sebasis boleh dibandingkan.** Rp/kg tidak pernah diadu
 *     dengan Rp/L. `sebanding()` adalah gerbangnya.
 *
 *  3. **Isi bersih menang atas kemasan.** `"1 pcs (85 g)"` bernilai 85 g, bukan
 *     1 pcs — angka dalam kurung justru isi sebenarnya. Begitu juga
 *     `"24 x 6.5g"` = 156 g, karena yang dibeli orang adalah isinya.
 */

/** Satuan dasar tempat semua ukuran dibawa sebelum dibandingkan. */
export type BasisSatuan = "g" | "ml" | "pcs";

export type Ukuran = {
  /** Jumlah dalam basis: gram, mililiter, atau butir. Selalu > 0. */
  jumlah: number;
  basis: BasisSatuan;
  /** Berasal dari kemasan majemuk ("24 x 6,5 g") — berguna untuk penjelasan. */
  majemuk: boolean;
};

/** Satuan yang ditampilkan ke pengguna untuk tiap basis. */
export const SATUAN_TAMPIL: Record<BasisSatuan, string> = {
  g: "kg",
  ml: "L",
  pcs: "pcs",
};

/** Pengali dari basis ke satuan tampil (1 kg = 1000 g). */
const PENGALI_TAMPIL: Record<BasisSatuan, number> = { g: 1000, ml: 1000, pcs: 1 };

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

/**
 * Satuan hitung. Semuanya bernilai 1 butir — `"10 sachet"` = 10 pcs.
 *
 * `renceng` sengaja TIDAK di sini: satu renceng bisa 10 atau 12 sachet dan
 * katalog tidak menyimpan yang mana. Menebak 10 berarti mengarang harga per
 * satuan untuk seluruh produk berenceng.
 */
const HITUNG = new Set([
  "pcs",
  "pc",
  "piece",
  "pieces",
  "butir",
  "buah",
  "sachet",
  "sct",
  "saset",
  "sheet",
  "lembar",
  "kantong",
  "kaleng",
  "botol",
  "bungkus",
  "batang",
  "keping",
  "tablet",
  "kapsul",
]);

// Alternatif panjang lebih dulu supaya "gram" tidak keburu cocok sebagai "g",
// dan "liter" tidak terbaca sebagai "lt".
const SATUAN_ALT =
  "kilogram|kilo|gram|liter|sachet|saset|lembar|kantong|kaleng|batang|keping|tablet|kapsul|bungkus|pieces|piece|butir|botol|sheet|buah|pcs|ltr|sct|kg|mg|gr|ml|cc|lt|pc|g|l";

const RE_MAJEMUK = new RegExp(
  `(\\d+(?:[.,]\\d+)?)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(${SATUAN_ALT})\\b`,
  "i"
);
const RE_UKURAN = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${SATUAN_ALT})\\b`, "gi");
/** "isi 10", "isi 30" — lazim di katalog dan tidak punya satuan tertulis. */
const RE_ISI = /\bisi\s+(\d+(?:[.,]\d+)?)\b/i;

/**
 * Angka bergaya Indonesia maupun Inggris.
 * "1,5" & "1.5" = pecahan; "1.500" & "1,500" = ribuan (tepat 3 digit di belakang).
 * Aturannya sengaja sama persis dengan `normalize.ts` supaya satu nama satuan
 * tidak pernah berarti dua angka berbeda di dua tempat.
 */
function keAngka(raw: string): number {
  const m = raw.match(/^(\d+)[.,](\d+)$/);
  if (!m) return Number(raw);
  return m[2].length === 3 ? Number(m[1] + m[2]) : Number(`${m[1]}.${m[2]}`);
}

function basisDari(satuan: string): { basis: BasisSatuan; pengali: number } | null {
  const s = satuan.toLowerCase();
  if (s in VOLUME) return { basis: "ml", pengali: VOLUME[s] };
  if (s in MASSA) return { basis: "g", pengali: MASSA[s] };
  if (HITUNG.has(s)) return { basis: "pcs", pengali: 1 };
  return null;
}

/** Isi bersih (massa/volume) lebih bermakna daripada jumlah kemasan. */
const PRIORITAS: Record<BasisSatuan, number> = { g: 2, ml: 2, pcs: 1 };

/**
 * Baca satuan produk jadi ukuran yang bisa dibandingkan.
 * Mengembalikan `null` bila teksnya tidak memuat ukuran yang bisa dipercaya.
 */
export function uraiUkuran(teks: string | null | undefined): Ukuran | null {
  if (!teks) return null;
  const s = teks.toLowerCase().trim();
  if (!s) return null;

  // 1. Kemasan majemuk lebih dulu — "24 x 6.5g" harus dibaca sebagai 156 g,
  //    bukan 24 (yang akan terbaca sebagai jumlah) atau 6,5 (isi satu bungkus).
  const maj = s.match(RE_MAJEMUK);
  if (maj) {
    const n = keAngka(maj[1]);
    const isi = keAngka(maj[2]);
    const b = basisDari(maj[3]);
    if (b && Number.isFinite(n) && Number.isFinite(isi) && n > 0 && isi > 0) {
      return { jumlah: n * isi * b.pengali, basis: b.basis, majemuk: true };
    }
  }

  // 2. Semua ukuran yang tertulis; yang berbasis isi bersih menang.
  //    Itulah yang membuat "1 pcs (85 g)" bernilai 85 g.
  let terbaik: Ukuran | null = null;
  let prioritasTerbaik = 0;
  for (const m of s.matchAll(RE_UKURAN)) {
    const n = keAngka(m[1]);
    const b = basisDari(m[2]);
    if (!b || !Number.isFinite(n) || n <= 0) continue;
    const p = PRIORITAS[b.basis];
    if (p > prioritasTerbaik) {
      prioritasTerbaik = p;
      terbaik = { jumlah: n * b.pengali, basis: b.basis, majemuk: false };
    }
  }
  if (terbaik) return terbaik;

  // 3. "isi 10" — tanpa satuan, tapi maksudnya jelas jumlah butir.
  const isi = s.match(RE_ISI);
  if (isi) {
    const n = keAngka(isi[1]);
    if (Number.isFinite(n) && n > 0) {
      return { jumlah: n, basis: "pcs", majemuk: false };
    }
  }

  // 4. Angka telanjang ("220", "1", "RH. 30") dan teks tanpa angka
  //    ("susu uht") sengaja menyerah. Lihat aturan 1 di kepala berkas.
  return null;
}

export type HargaSatuan = {
  /** Rupiah per satuan tampil (per kg / per L / per pcs). Dibulatkan. */
  nilai: number;
  basis: BasisSatuan;
  /** "kg" | "L" | "pcs" */
  satuan: string;
  /** Ukuran yang berhasil dibaca — untuk menjelaskan asal angkanya. */
  ukuran: Ukuran;
};

/**
 * Harga per satuan sebuah produk. `null` bila satuannya tak terbaca — dan itu
 * memang jawaban yang benar, bukan kegagalan.
 */
export function hargaPerSatuan(
  harga: number | null | undefined,
  satuanProduk: string | null | undefined
): HargaSatuan | null {
  if (typeof harga !== "number" || !Number.isFinite(harga) || harga <= 0) return null;
  const u = uraiUkuran(satuanProduk);
  if (!u || u.jumlah <= 0) return null;
  const nilai = Math.round((harga / u.jumlah) * PENGALI_TAMPIL[u.basis]);
  if (!Number.isFinite(nilai) || nilai <= 0) return null;
  return { nilai, basis: u.basis, satuan: SATUAN_TAMPIL[u.basis], ukuran: u };
}

/** Dua ukuran hanya boleh diadu kalau basisnya sama. Rp/kg bukan Rp/L. */
export function sebanding(
  a: Ukuran | HargaSatuan | null,
  b: Ukuran | HargaSatuan | null
): boolean {
  return !!a && !!b && a.basis === b.basis;
}

/**
 * Label ukuran yang enak dibaca: 5000 g → "5 kg", 600 ml → "600 ml".
 * Dipakai saat satuan asli dari katalog terlalu berantakan untuk ditampilkan.
 */
export function labelUkuran(u: Ukuran): string {
  if (u.basis === "pcs") return `${bulatRapi(u.jumlah)} pcs`;
  if (u.jumlah >= 1000) {
    return `${bulatRapi(u.jumlah / 1000)} ${SATUAN_TAMPIL[u.basis]}`;
  }
  return `${bulatRapi(u.jumlah)} ${u.basis}`;
}

function bulatRapi(n: number): string {
  const dibulatkan = Math.round(n * 100) / 100;
  return String(dibulatkan).replace(".", ",");
}
