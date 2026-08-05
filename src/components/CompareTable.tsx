import Link from "next/link";
import { formatNumber, formatAge } from "@/lib/format";
import { freshnessOf } from "@/lib/freshness";
import { sourceMeta } from "@/lib/source";
import ProductThumb from "./ProductThumb";
import HargaSatuanBadge from "./HargaSatuanBadge";
import type { CompareMatrix, StoreCell } from "@/lib/types";

/**
 * Tabel matriks perbandingan: produk (baris) × semua supermarket (kolom).
 * Kolom produk "lengket" (sticky) saat tabel digeser horizontal.
 * Sel: harga (termurah disorot hijau), ✓ untuk harga nyata, "—" = tidak tersedia.
 */
export default function CompareTable({ matrix }: { matrix: CompareMatrix }) {
  const { stores, rows } = matrix;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200/70 dark:border-ink-800">
              <th className="sticky left-0 z-20 border-r border-ink-200/70 bg-ink-50 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500 dark:border-ink-800 dark:bg-ink-800/80 dark:text-ink-300">
                Produk
              </th>
              {stores.map((s) => (
                <th
                  key={s.slug}
                  className="min-w-[88px] px-2 py-2.5 text-center align-bottom"
                >
                  <span className="flex flex-col items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[10px] font-semibold leading-tight text-ink-500 dark:text-ink-400">
                      {s.name}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.slug}
                className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60 dark:border-ink-800/70 dark:hover:bg-ink-800/30"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-ink-200/70 bg-white px-3 py-2 text-left dark:border-ink-800 dark:bg-ink-900"
                >
                  <Link
                    href={`/produk/${row.slug}`}
                    className="flex items-center gap-2"
                  >
                    <ProductThumb
                      image={row.image}
                      emoji={row.emoji}
                      alt={row.name}
                      className="h-8 w-8 shrink-0 rounded-lg"
                      emojiClassName="text-base"
                    />
                    <span className="min-w-0">
                      <span className="block max-w-[9.5rem] truncate text-xs font-semibold text-ink-800 dark:text-ink-100">
                        {row.name}
                      </span>
                      <span className="block text-[10px] text-ink-400">
                        {row.unit}
                      </span>
                      {/* Harga per satuan dari harga termurah baris ini. Tanpa
                          angka ini, kolom-kolom di kanan hanya bisa
                          dibandingkan sesama produk berukuran sama. */}
                      <HargaSatuanBadge
                        harga={row.min}
                        satuan={row.unit}
                        className="block"
                      />
                    </span>
                  </Link>
                </th>
                {row.cells.map((c) => (
                  <Cell key={c.slug} c={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ c }: { c: StoreCell }) {
  if (!c.available || c.price === null) {
    return (
      <td className="px-2 py-2 text-center">
        <span
          className="text-ink-300 dark:text-ink-600"
          title="Tidak tersedia"
        >
          —
        </span>
      </td>
    );
  }
  const stale = freshnessOf(c.recordedAt) === "stale";
  const title = [
    sourceMeta(c.source).badge,
    c.recordedAt ? `dicek ${formatAge(c.recordedAt)}` : null,
    stale ? "data kedaluwarsa — harga kemungkinan sudah berubah" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <td
      className={`px-2 py-2 text-center ${
        c.isCheapest ? "bg-brand-50 dark:bg-brand-900/25" : ""
      }`}
    >
      <span
        title={title}
        className="inline-flex items-center gap-0.5 whitespace-nowrap"
      >
        <span
          className={`tabular-nums ${
            !c.inStock
              ? "text-ink-300 line-through dark:text-ink-600"
              : c.isCheapest
              ? "font-extrabold text-brand-700 dark:text-brand-300"
              : c.isReal
              ? "font-semibold text-ink-800 dark:text-ink-100"
              : "text-ink-400 dark:text-ink-500"
          }`}
        >
          {formatNumber(c.price)}
        </span>
        {c.isReal && c.inStock && (
          <span className="text-[9px] text-emerald-500" title="Harga nyata">
            ✓
          </span>
        )}
        {stale && c.inStock && (
          <span
            className="text-[9px] leading-none text-rose-400"
            aria-label="data kedaluwarsa"
          >
            ⚠
          </span>
        )}
      </span>
    </td>
  );
}
