import Link from "next/link";
import type { ProductListItem } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({ p }: { p: ProductListItem }) {
  return (
    <Link
      href={`/produk/${p.slug}`}
      className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-3xl">
        {p.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-tight text-slate-800">
          {p.name}
        </h3>
        <p className="text-xs text-slate-400">{p.unit}</p>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-brand-700">
            {formatRupiah(p.minPrice)}
          </span>
          {p.spread > 0 && (
            <span className="text-[11px] text-slate-400 line-through">
              {formatRupiah(p.maxPrice)}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.cheapestStoreColor }}
          />
          <span className="truncate text-[11px] text-slate-500">
            Termurah di <b className="text-slate-700">{p.cheapestStore}</b>
            {p.storeCount > 1 && ` · ${p.storeCount} toko`}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between">
        {p.spread > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
            hemat {formatRupiah(p.spread)}
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
