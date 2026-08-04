/**
 * Alur pencarian produk.
 *
 * Yang lama menjalankan `contains` mentah pada `name`/`brand`, sehingga
 * `"mie goreng indomie"` tidak menemukan apa pun padahal produknya jelas ada —
 * cukup dengan menukar urutan kata. Yang ini bertingkat, dari paling ketat ke
 * paling longgar, dan **berhenti di tingkat pertama yang membuahkan hasil**:
 *
 *   1. cocok PERSIS pada `Product.normalizedName`
 *   2. cocok PERSIS pada `ProductAlias.normalizedAlias`
 *   3. keterkandungan token (gerbang merek & ukuran tetap berlaku)
 *   4. toleransi salah ketik ringan — hanya kalau tiga langkah di atas nihil
 *
 * Urutannya penting: langkah longgar tidak boleh mengotori hasil langkah ketat.
 * Prinsipnya "nama lebih baik tidak ketemu daripada salah ketemu" — salah cocok
 * berarti menampilkan harga produk lain sebagai lebih murah, dan itu
 * menyesatkan orang yang sedang belanja.
 */
import { prisma } from "@/lib/db";
import { denganCache, kunciTakBergantungMode, TTL } from "@/lib/cache";
import { log } from "@/lib/log";
import {
  adalahUkuran,
  cocok,
  normalize,
  tokenize,
  type ProdukUntukCocok,
} from "@/lib/normalize";

export type JalurCari = "persis" | "alias" | "token" | "typo" | "kosong";

export type HasilCari = {
  /** id produk, sudah terurut dari paling relevan. */
  ids: string[];
  skor: Map<string, number>;
  jalur: JalurCari;
};

type Kandidat = ProdukUntukCocok & {
  id: string;
  slug: string;
  normalizedName: string;
};

/** Batas kasar; kalau katalog melewatinya, sisanya dilaporkan — bukan dipotong diam-diam. */
const MAKS_KANDIDAT = 5000;

type Katalog = { produk: Kandidat[]; merek: Set<string>; terpotong: boolean };

async function katalog(): Promise<Katalog> {
  return denganCache(kunciTakBergantungMode("katalog-cari"), TTL.cari, async () => {
    const [produk, total] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          brand: true,
          unit: true,
          normalizedName: true,
        },
        orderBy: { name: "asc" },
        take: MAKS_KANDIDAT,
      }),
      prisma.product.count(),
    ]);

    const terpotong = total > produk.length;
    if (terpotong) {
      await log.peringatan(
        "cari",
        `Katalog pencarian dipotong di ${MAKS_KANDIDAT} dari ${total} produk — pencocokan token tidak lagi menjangkau semuanya`
      );
    }

    const merek = new Set<string>();
    for (const p of produk) for (const t of tokenize(p.brand)) merek.add(t);

    return { produk, merek, terpotong };
  });
}

/** Ukuran produk dalam satuan dasar, untuk mengurutkan varian yang seukuran nama. */
function ukuranDari(p: Kandidat): number {
  for (const t of [...tokenize(p.unit), ...tokenize(p.name)]) {
    if (adalahUkuran(t)) return parseInt(t, 10);
  }
  return Number.POSITIVE_INFINITY;
}

function urut(ids: string[], skor: Map<string, number>, per: Map<string, Kandidat>): string[] {
  return [...ids].sort((a, b) => {
    const pa = per.get(a);
    const pb = per.get(b);
    const bedaSkor = (skor.get(b) ?? 0) - (skor.get(a) ?? 0);
    if (bedaSkor !== 0) return bedaSkor;
    // Varian ambigu ("aqua" → beberapa ukuran) diurutkan dari yang terkecil,
    // bukan menurut abjad: ukuran adalah urutan yang punya arti bagi pembeli,
    // sedangkan abjad tidak.
    const ua = pa ? ukuranDari(pa) : Number.POSITIVE_INFINITY;
    const ub = pb ? ukuranDari(pb) : Number.POSITIVE_INFINITY;
    if (ua !== ub) return ua - ub;
    return (pa?.name ?? "").localeCompare(pb?.name ?? "");
  });
}

export async function cariProduk(kueri: string): Promise<HasilCari> {
  const norm = normalize(kueri);
  const kosong: HasilCari = { ids: [], skor: new Map(), jalur: "kosong" };
  if (!norm) return kosong;

  // 1 — cocok persis pada bentuk baku nama.
  const persis = await prisma.product.findMany({
    where: { normalizedName: norm },
    select: { id: true },
  });
  if (persis.length > 0) {
    return {
      ids: persis.map((p) => p.id),
      skor: new Map(persis.map((p) => [p.id, 1])),
      jalur: "persis",
    };
  }

  // 2 — cocok persis pada alias. Inilah jalan keluar untuk nama tak lazim
  //     tanpa mengubah kode.
  const alias = await prisma.productAlias.findMany({
    where: { normalizedAlias: norm },
    select: { productId: true },
  });
  if (alias.length > 0) {
    const ids = [...new Set(alias.map((a) => a.productId))];
    return { ids, skor: new Map(ids.map((id) => [id, 0.95])), jalur: "alias" };
  }

  const { produk, merek } = await katalog();
  const per = new Map(produk.map((p) => [p.id, p]));

  // 3 — keterkandungan token, dengan gerbang merek & ukuran.
  const skorToken = new Map<string, number>();
  for (const p of produk) {
    const r = cocok(kueri, p, { merekDikenal: merek });
    if (r.cocok) skorToken.set(p.id, r.skor);
  }
  if (skorToken.size > 0) {
    return {
      ids: urut([...skorToken.keys()], skorToken, per),
      skor: skorToken,
      jalur: "token",
    };
  }

  // 4 — baru sekarang salah ketik ditoleransi. Dinyalakan lebih awal, presisi
  //     turun tanpa perlu.
  const skorTypo = new Map<string, number>();
  for (const p of produk) {
    const r = cocok(kueri, p, { merekDikenal: merek, toleransiTypo: true });
    if (r.cocok) skorTypo.set(p.id, r.skor);
  }
  if (skorTypo.size > 0) {
    return {
      ids: urut([...skorTypo.keys()], skorTypo, per),
      skor: skorTypo,
      jalur: "typo",
    };
  }

  return kosong;
}

/**
 * Saran "maksud Anda…?" saat pencarian nihil. Sengaja dihitung dengan ambang
 * yang jauh lebih longgar daripada pencocokan — di sini salah tebak cuma bikin
 * saran meleset, tidak menampilkan harga yang keliru.
 */
export async function saranProduk(
  kueri: string,
  jumlah = 3
): Promise<{ slug: string; name: string }[]> {
  const q = tokenize(kueri);
  if (q.length === 0) return [];
  const { produk } = await katalog();

  const bernilai: { slug: string; name: string; skor: number }[] = [];
  for (const p of produk) {
    const tokenP = new Set([...tokenize(p.name), ...tokenize(p.brand)]);
    let kena = 0;
    for (const t of q) {
      for (const tp of tokenP) {
        if (tp === t || (t.length >= 3 && tp.includes(t)) || (tp.length >= 3 && t.includes(tp))) {
          kena++;
          break;
        }
      }
    }
    if (kena > 0) bernilai.push({ slug: p.slug, name: p.name, skor: kena / q.length });
  }

  return bernilai
    .sort((a, b) => b.skor - a.skor || a.name.localeCompare(b.name))
    .slice(0, jumlah)
    .map(({ slug, name }) => ({ slug, name }));
}

// Halaman bisa dirender ulang beberapa kali untuk satu kueri yang sama
// (navigasi, refresh, mode berganti). Tanpa peredam ini, log pencarian jadi
// penuh duplikat dan angka "kueri terpopuler" jadi bohong.
const PEREDAM_MS = 60_000;
const terakhirDicatat = new Map<string, number>();

export async function catatPencarian(opts: {
  kueri: string;
  jumlahHasil: number;
  realOnly: boolean;
  jalur: JalurCari;
}): Promise<void> {
  const { kueri, jumlahHasil, realOnly, jalur } = opts;
  const kunci = `${kueri}|${realOnly}`;
  const kini = Date.now();
  const lalu = terakhirDicatat.get(kunci);
  if (lalu && kini - lalu < PEREDAM_MS) return;
  terakhirDicatat.set(kunci, kini);

  try {
    await prisma.searchLog.create({
      data: {
        query: kueri.slice(0, 200),
        normalized: normalize(kueri),
        resultCount: jumlahHasil,
        realOnly,
        jalur,
      },
    });
  } catch {
    // Analitik tidak boleh menjatuhkan pencarian.
  }

  if (jumlahHasil === 0) {
    // Kueri gagal adalah isi paling berharga dari log ini: tiap satu langsung
    // jadi kandidat alias yang perlu ditambahkan lewat /admin.
    await log.info("cari", `Kueri tanpa hasil: "${kueri}"`, { realOnly });
  }
}

/** Kueri yang paling sering gagal — daftar kerja untuk halaman admin. */
export async function kueriGagalTeratas(batas = 20): Promise<
  { query: string; jumlah: number; terakhir: Date }[]
> {
  const baris = await prisma.searchLog.findMany({
    where: { resultCount: 0 },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { query: true, createdAt: true },
  });
  const per = new Map<string, { jumlah: number; terakhir: Date }>();
  for (const b of baris) {
    const k = b.query.toLowerCase();
    const a = per.get(k) ?? { jumlah: 0, terakhir: b.createdAt };
    a.jumlah++;
    if (b.createdAt > a.terakhir) a.terakhir = b.createdAt;
    per.set(k, a);
  }
  return [...per.entries()]
    .map(([query, v]) => ({ query, ...v }))
    .sort((a, b) => b.jumlah - a.jumlah || +b.terakhir - +a.terakhir)
    .slice(0, batas);
}
