"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";
import type { Substitusi } from "@/lib/agen";

/**
 * Saran pengganti yang **bisa ditindaklanjuti** — bukan sekadar diberitahu.
 *
 * Tombol "Ganti" langsung menukar barang di keranjang, dan rencananya dihitung
 * ulang. Saran yang menuntut pengguna mencari sendiri produknya, menghapus
 * yang lama, lalu menambah yang baru, pada praktiknya tidak pernah dijalankan.
 *
 * Jumlahnya sengaja dibawa apa adanya: mengganti 2 bungkus kecil dengan
 * 2 bungkus besar adalah keputusan pengguna, bukan tempat kami mengarang
 * jumlah baru.
 */
export default function SaranPengganti({ saran }: { saran: Substitusi[] }) {
  const { items, add, remove } = useCart();
  if (saran.length === 0) return null;

  return (
    <section className="card p-4">
      <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
        💡 Bisa lebih hemat
      </h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
        Dihitung dari harga per satuan isi, bukan harga label — jadi kemasan besar
        yang harganya terlihat lebih mahal tetap ketahuan kalau sebenarnya lebih murah.
      </p>

      <ul className="mt-3 space-y-2.5">
        {saran.map((s) => {
          const qty = items.find((i) => i.productId === s.dari.productId)?.qty ?? 1;
          return (
            <li
              key={`${s.dari.productId}-${s.ke.productId}`}
              className="rounded-2xl border border-ink-200/70 p-3 dark:border-ink-800"
            >
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-lg">{s.dari.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-ink-500 line-through dark:text-ink-400">
                  {s.dari.nama}
                </span>
                <span className="shrink-0 text-ink-300">→</span>
                <span className="text-lg">{s.ke.emoji}</span>
                <Link
                  href={`/produk/${s.ke.slug}`}
                  className="min-w-0 flex-1 truncate font-semibold text-ink-800 hover:underline dark:text-ink-100"
                >
                  {s.ke.nama}
                </Link>
              </div>

              <p className="mt-1.5 text-[11px] tabular-nums text-ink-500 dark:text-ink-400">
                {formatRupiah(s.perSatuanDari)}/{s.satuanTampil} →{" "}
                <b className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(s.perSatuanKe)}/{s.satuanTampil}
                </b>{" "}
                <span className="text-ink-400">
                  ({s.hematPersen.toFixed(0)}% lebih murah · {s.ke.harga > 0 && (
                    <>
                      {formatRupiah(s.ke.harga)} di {s.ke.toko}
                    </>
                  )})
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{s.alasan}</p>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="rounded-full bg-gold-50 px-2.5 py-1 text-[11px] font-bold text-gold-700 dark:bg-gold-500/10 dark:text-gold-400">
                  hemat ~{formatRupiah(s.hematRupiah)}
                </span>
                <button
                  onClick={() => {
                    remove(s.dari.productId);
                    add(
                      {
                        productId: s.ke.productId,
                        slug: s.ke.slug,
                        name: s.ke.nama,
                        emoji: s.ke.emoji,
                        unit: s.ke.satuan,
                      },
                      qty
                    );
                  }}
                  className="btn-primary px-3.5 py-1.5 text-xs"
                >
                  Ganti
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
