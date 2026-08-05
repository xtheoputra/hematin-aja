import Link from "next/link";
import type { Peringatan } from "@/lib/agen";

/**
 * Peringatan mutu data.
 *
 * Sengaja ditaruh DI ATAS daftar toko, bukan di kaki halaman: peringatan yang
 * harus dicari-cari sama saja dengan tidak ada. Kalau rencananya berdiri di
 * atas data yang meragukan, itu hal pertama yang perlu dilihat orang.
 */

const NADA = {
  serius: {
    kotak: "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30",
    teks: "text-rose-700 dark:text-rose-300",
    ikon: "⛔",
  },
  waspada: {
    kotak: "border-gold-200 bg-gold-50 dark:border-gold-900/60 dark:bg-gold-950/30",
    teks: "text-gold-800 dark:text-gold-300",
    ikon: "⚠️",
  },
  info: {
    kotak: "border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-800/60",
    teks: "text-ink-600 dark:text-ink-300",
    ikon: "ℹ️",
  },
} as const;

/** Berapa nama produk yang disebut sebelum sisanya diringkas. */
const MAKS_PRODUK_DISEBUT = 4;

export default function DaftarPeringatan({ peringatan }: { peringatan: Peringatan[] }) {
  if (peringatan.length === 0) return null;

  return (
    <section className="space-y-2">
      {peringatan.map((p, i) => {
        const nada = NADA[p.tingkat];
        const disebut = p.produk?.slice(0, MAKS_PRODUK_DISEBUT) ?? [];
        const sisa = (p.produk?.length ?? 0) - disebut.length;
        return (
          <div key={`${p.jenis}-${i}`} className={`rounded-2xl border p-3 ${nada.kotak}`}>
            <p className={`text-[13px] font-semibold leading-relaxed ${nada.teks}`}>
              <span className="mr-1.5">{nada.ikon}</span>
              {p.pesan}
            </p>
            {disebut.length > 0 && (
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {disebut.map((d) => (
                  <Link
                    key={d.slug}
                    href={`/produk/${d.slug}`}
                    className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-ink-600 underline-offset-2 hover:underline dark:bg-ink-900/60 dark:text-ink-300"
                  >
                    {d.nama}
                  </Link>
                ))}
                {sisa > 0 && (
                  <span className="px-1 py-0.5 text-[11px] text-ink-400">
                    +{sisa} lagi
                  </span>
                )}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
