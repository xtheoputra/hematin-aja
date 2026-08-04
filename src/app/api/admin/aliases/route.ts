import { prisma } from "@/lib/db";
import { permintaanAdminSah } from "@/lib/admin";
import { detailGalat, gagal, pesanAman, sukses, teks, TAK_BERWENANG } from "@/lib/api";
import { batalkanCache } from "@/lib/cache";
import { log } from "@/lib/log";
import { normalize } from "@/lib/normalize";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/aliases — daftarkan nama lain untuk sebuah produk.
 *
 * Ini katup pengaman pencocokan: nama tak lazim dari toko atau marketplace bisa
 * ditutup di sini tanpa menyentuh kode. Sekaligus dataset Fase 2 — tiap alias
 * yang diketik manusia adalah label buatan manusia untuk pelatihan nanti.
 */
export async function POST(req: Request) {
  if (!permintaanAdminSah(req)) return TAK_BERWENANG();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return gagal("Bentuk permintaan tidak sah.", 400);
  }

  const produkKunci = teks(body.produk);
  const alias = teks(body.alias);
  if (!produkKunci) return gagal("Produk wajib diisi.", 400);
  if (!alias) return gagal("Alias wajib diisi.", 400);
  if (alias.length > 120) return gagal("Alias terlalu panjang.", 400);

  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) {
    return gagal("Alias tidak menghasilkan satu pun kata yang bisa dicari.", 400);
  }

  try {
    const produk = await prisma.product.findFirst({
      where: { OR: [{ id: produkKunci }, { slug: produkKunci }] },
      select: { id: true, name: true },
    });
    if (!produk) return gagal(`Produk "${produkKunci}" tidak ditemukan.`, 404);

    const bentrok = await prisma.productAlias.findFirst({
      where: { normalizedAlias, NOT: { productId: produk.id } },
      select: { product: { select: { name: true } } },
    });
    if (bentrok) {
      // Satu alias untuk dua produk = pencarian yang menampilkan barang salah.
      return gagal(
        `Alias itu sudah menunjuk produk lain ("${bentrok.product.name}"). ` +
          `Satu alias hanya boleh menunjuk satu produk.`,
        409
      );
    }

    const sudahAda = await prisma.productAlias.findFirst({
      where: { productId: produk.id, normalizedAlias },
      select: { id: true },
    });
    if (sudahAda) {
      return sukses({ pesan: "Alias itu sudah terdaftar.", produk: produk.name });
    }

    await prisma.productAlias.create({
      data: {
        productId: produk.id,
        alias,
        normalizedAlias,
        source: teks(body.sumber) ?? "manual",
      },
    });

    batalkanCache();
    await log.info("admin", `Alias baru untuk ${produk.name}: "${alias}"`);
    return sukses({ pesan: "Alias tersimpan.", produk: produk.name, alias }, 201);
  } catch (e) {
    await log.galat("admin", "POST /api/admin/aliases gagal", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
