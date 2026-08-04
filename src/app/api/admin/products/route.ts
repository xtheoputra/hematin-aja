import { prisma } from "@/lib/db";
import { permintaanAdminSah } from "@/lib/admin";
import { detailGalat, gagal, pesanAman, sukses, teks, TAK_BERWENANG } from "@/lib/api";
import { batalkanCache } from "@/lib/cache";
import { log } from "@/lib/log";
import { normalize } from "@/lib/normalize";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** POST /api/admin/products — tambah produk baru. */
export async function POST(req: Request) {
  if (!permintaanAdminSah(req)) return TAK_BERWENANG();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return gagal("Bentuk permintaan tidak sah.", 400);
  }

  const nama = teks(body.nama);
  const kategori = teks(body.kategori);
  if (!nama) return gagal("Nama produk wajib diisi.", 400);
  if (nama.length > 120) return gagal("Nama produk terlalu panjang.", 400);
  if (!kategori) return gagal("Kategori wajib dipilih.", 400);

  try {
    const cat = await prisma.category.findFirst({
      where: { OR: [{ id: kategori }, { slug: kategori }] },
      select: { id: true, name: true },
    });
    if (!cat) return gagal(`Kategori "${kategori}" tidak ditemukan.`, 404);

    const slugDiminta = teks(body.slug);
    let slug = slugify(slugDiminta ?? nama);
    if (!slug) return gagal("Nama produk tidak menghasilkan slug yang sah.", 400);
    if (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      return gagal(`Slug "${slug}" sudah dipakai produk lain.`, 409);
    }

    const produk = await prisma.product.create({
      data: {
        slug,
        name: nama,
        // Diisi di sini juga, bukan cuma lewat skrip: produk yang lahir tanpa
        // normalizedName tidak akan pernah ketemu lewat pencocokan persis.
        normalizedName: normalize(nama),
        brand: teks(body.merek) ?? null,
        unit: teks(body.satuan) ?? "1 pcs",
        emoji: teks(body.emoji) ?? "📦",
        barcode: teks(body.barcode) ?? null,
        categoryId: cat.id,
      },
    });

    batalkanCache();
    await log.info("admin", `Produk baru: ${produk.name}`, { slug: produk.slug });
    return sukses(
      {
        pesan: "Produk tersimpan.",
        produk: { id: produk.id, slug: produk.slug, name: produk.name },
      },
      201
    );
  } catch (e) {
    await log.galat("admin", "POST /api/admin/products gagal", detailGalat(e));
    return gagal(pesanAman(e), 500);
  }
}
