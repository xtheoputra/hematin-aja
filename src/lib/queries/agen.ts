/**
 * Lapisan data untuk agen belanja.
 *
 * Tugasnya cuma satu: mengambil data seperlunya dari database dan
 * menyerahkannya ke mesin keputusan yang murni (`@/lib/agen`). Tidak ada satu
 * pun aturan keputusan di berkas ini — begitu ada, aturannya jadi tak bisa
 * diuji tanpa database, dan itulah cara logika bisnis diam-diam pindah ke
 * tempat yang salah.
 *
 * Ini juga menggantikan `compareCart()` yang lama. Dua mesin yang sama-sama
 * menghitung "total belanja per toko" pasti menyimpang satu sama lain; yang
 * lama menjumlahkan barang yang tersedia saja, sehingga toko yang paling
 * sedikit barangnya justru terlihat paling murah.
 */
import { prisma } from "@/lib/db";
import {
  rencanaKosong,
  susunRencana,
  type BarisMasuk,
  type HargaToko,
  type KandidatSubstitusi,
  type Rencana,
} from "@/lib/agen";
import { bakuOpsi } from "@/lib/agen/rencana";
import type { StorePrice } from "@/lib/types";
import { pickPerStore, type PriceWithStore } from "./pilih";
import { SM_SELECT, sertakanHarga, stempelTerbaru } from "./muat";

export type PermintaanRencana = {
  items: { productId: string; qty: number }[];
  realOnly?: boolean;
  biayaPerjalanan?: number;
};

function keHargaToko(sp: StorePrice, warnaCadangan: string): HargaToko {
  return {
    supermarketId: sp.supermarketId,
    slug: sp.supermarketSlug,
    nama: sp.supermarketName,
    warna: sp.color || warnaCadangan,
    harga: sp.price,
    adaStok: sp.inStock,
    nyata: sp.isReal,
    sourceKind: sp.sourceKind,
    dicatatPada: sp.recordedAt,
  };
}

export async function rencanaBelanja(req: PermintaanRencana): Promise<Rencana> {
  const { biayaPerjalanan } = bakuOpsi({ biayaPerjalanan: req.biayaPerjalanan });
  const realOnly = req.realOnly ?? false;

  // Gabungkan baris kembar dari klien; kalau tidak, satu produk yang terkirim
  // dua kali akan dihitung dua kali sebagai dua baris berbeda.
  const qty = new Map<string, number>();
  for (const i of req.items) {
    if (typeof i?.productId !== "string" || !Number.isFinite(i?.qty)) continue;
    const n = Math.max(1, Math.floor(i.qty));
    qty.set(i.productId, (qty.get(i.productId) ?? 0) + n);
  }
  if (qty.size === 0) return rencanaKosong(biayaPerjalanan);

  const stempel = await stempelTerbaru();
  const [supermarkets, produk] = await Promise.all([
    prisma.supermarket.findMany({ select: SM_SELECT, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { id: { in: [...qty.keys()] } },
      include: { category: true, prices: sertakanHarga(stempel) },
    }),
  ]);

  const keranjang: BarisMasuk[] = produk.map((p) => {
    const perToko = pickPerStore(p.prices as PriceWithStore[], realOnly);
    return {
      productId: p.id,
      slug: p.slug,
      nama: p.name,
      emoji: p.emoji,
      satuan: p.unit,
      categorySlug: p.category.slug,
      qty: qty.get(p.id) ?? 1,
      harga: [...perToko.values()].map((sp) => keHargaToko(sp, "#10b981")),
    };
  });

  const kandidat = await kandidatPengganti(
    [...new Set(produk.map((p) => p.categoryId))],
    stempel,
    realOnly
  );

  const toko = supermarkets.map((s) => ({
    supermarketId: s.id,
    slug: s.slug,
    nama: s.name,
    warna: s.color,
  }));

  return susunRencana(keranjang, toko, kandidat, { biayaPerjalanan, hanyaNyata: realOnly });
}

/**
 * Calon pengganti = produk lain di kategori yang sama, beserta harga
 * termurahnya yang benar-benar ada stoknya.
 */
async function kandidatPengganti(
  categoryIds: string[],
  stempel: Date[],
  realOnly: boolean
): Promise<KandidatSubstitusi[]> {
  if (categoryIds.length === 0) return [];

  const produk = await prisma.product.findMany({
    where: { categoryId: { in: categoryIds } },
    include: { category: true, prices: sertakanHarga(stempel) },
  });

  const out: KandidatSubstitusi[] = [];
  for (const p of produk) {
    const adaStok = [...pickPerStore(p.prices as PriceWithStore[], realOnly).values()].filter(
      (s) => s.inStock
    );
    if (adaStok.length === 0) continue;
    const termurah = adaStok.reduce((a, c) => (c.price < a.price ? c : a));
    out.push({
      productId: p.id,
      slug: p.slug,
      nama: p.name,
      emoji: p.emoji,
      satuan: p.unit,
      categorySlug: p.category.slug,
      hargaTermurah: termurah.price,
      tokoTermurah: termurah.supermarketName,
      nyata: termurah.isReal,
    });
  }
  return out;
}
