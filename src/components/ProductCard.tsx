import Link from "next/link";
import type { ProductListItem } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import AddToCartButton from "./AddToCartButton";
import ProductThumb from "./ProductThumb";
import PriceSourceBadge from "./PriceSourceBadge";
import DataAgeBadge from "./DataAgeBadge";

export default function ProductCard({ p }: { p: ProductListItem }) {
  const hasSpread = p.available && p.spread > 0;

  return (
    <Link
      href={`/produk/${p.slug}`}
      className="group flex gap-3.5 rounded-3xl border border-ink-200/70 bg-white p-3 shadow-card transition active:scale-[0.99] hover:border-brand-200 hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-700"
    >
      {/* Thumbnail */}
      <div className="relative shrink-0">
        <ProductThumb
          image={p.image}
          emoji={p.emoji}
          alt={p.name}
          className="h-[4.5rem] w-[4.5rem] rounded-2xl"
          emojiClassName="text-3xl"
        />
        {hasSpread && (
          <span className="absolute -right-1.5 -top-1.5 rounded-full bg-gold-400 px-1.5 py-0.5 text-[9px] font-bold text-ink-900 shadow-sm">
            HEMAT
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-tight text-ink-800 dark:text-ink-100">
          {p.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-ink-400">{p.unit}</p>

        {p.available ? (
          <>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="font-display text-lg font-extrabold leading-none tabular-nums text-ink-900 dark:text-white">
                {formatRupiah(p.minPrice)}
              </span>
              {hasSpread && (
                <span className="text-[11px] text-ink-400 line-through tabular-nums">
                  {formatRupiah(p.maxPrice)}
                </span>
              )}
              <PriceSourceBadge source={p.cheapestSource} className="ml-0.5" />
            </div>

            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
                style={{ backgroundColor: p.cheapestStoreColor }}
              />
              <span className="truncate text-[11px] text-ink-500 dark:text-ink-400">
                Termurah di{" "}
                <b className="font-semibold text-ink-700 dark:text-ink-200">
                  {p.cheapestStore}
                </b>
                {p.storeCount > 1 && (
                  <span className="text-ink-400"> · {p.storeCount} toko</span>
                )}
              </span>
              <DataAgeBadge
                date={p.cheapestRecordedAt}
                className="ml-auto shrink-0"
              />
            </div>
          </>
        ) : (
          <div className="mt-2">
            <PriceSourceBadge source={null} />
            <p className="mt-1 text-[11px] text-ink-400">
              Belum ada harga nyata untuk produk ini.
            </p>
          </div>
        )}
      </div>

      {/* Aksi */}
      <div className="flex flex-col items-end justify-between">
        {hasSpread ? (
          <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold-700">
            −{formatRupiah(p.spread)}
          </span>
        ) : (
          <span className="text-ink-300 transition group-hover:text-brand-500">
            →
          </span>
        )}
        <AddToCartButton
          item={{
            productId: p.id,
            slug: p.slug,
            name: p.name,
            emoji: p.emoji,
            unit: p.unit,
          }}
          className="mt-auto"
        />
      </div>
    </Link>
  );
}
