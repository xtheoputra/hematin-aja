import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/queries";
import { formatRupiah, formatPercent } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const p = await getProductDetail(params.slug);
  if (!p) notFound();

  const series = p.stores.map((s) => ({
    slug: s.supermarketSlug,
    name: s.supermarketName,
    color: s.color,
  }));
  const change = p.stats.changePct;

  return (
    <main>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-white/95 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          aria-label="Kembali"
        >
          ←
        </Link>
        <span className="truncate text-sm font-semibold text-slate-700">
          {p.name}
        </span>
      </header>

      <div className="space-y-4 px-4 pb-4">
        {/* Ringkasan produk */}
        <section className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-5xl">
            {p.emoji}
          </div>
          <div className="min-w-0">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
              {p.categoryName}
            </span>
            <h1 className="mt-1 text-lg font-bold leading-tight text-slate-800">
              {p.name}
            </h1>
            {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
            <p className="text-xs text-slate-400">{p.unit}</p>
          </div>
        </section>

        {/* Statistik harga */}
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Termurah" value={formatRupiah(p.stats.min)} accent />
          <Stat label="Rata-rata" value={formatRupiah(p.stats.avg)} />
          <Stat label="Termahal" value={formatRupiah(p.stats.max)} />
        </section>

        {change !== null && (
          <p
            className={`text-center text-xs font-medium ${
              change < 0 ? "text-brand-600" : change > 0 ? "text-rose-500" : "text-slate-400"
            }`}
          >
            {change < 0 ? "📉 Turun" : change > 0 ? "📈 Naik" : "Stabil"}{" "}
            {formatPercent(change)} sejak awal periode (harga termurah)
          </p>
        )}

        {/* Grafik tren */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Tren Harga
          </h2>
          <PriceChart history={p.history} series={series} />
        </section>

        {/* Daftar harga per toko */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Harga per Supermarket
          </h2>
          <ul className="space-y-2">
            {p.stores.map((s, idx) => (
              <li
                key={s.supermarketId}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  idx === 0 && s.inStock
                    ? "border-brand-200 bg-brand-50"
                    : "border-slate-100"
                }`}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: s.color }}
                >
                  {s.supermarketName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {s.supermarketName}
                  </p>
                  {!s.inStock ? (
                    <p className="text-[11px] text-rose-400">Stok habis</p>
                  ) : idx === 0 ? (
                    <p className="text-[11px] font-medium text-brand-600">
                      ⭐ Termurah
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      +{formatRupiah(s.price - p.stats.min)} dari termurah
                    </p>
                  )}
                </div>
                <span
                  className={`text-base font-bold ${
                    s.inStock ? "text-slate-800" : "text-slate-300 line-through"
                  }`}
                >
                  {formatRupiah(s.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <AddToCartButton
          size="lg"
          item={{
            productId: p.id,
            slug: p.slug,
            name: p.name,
            emoji: p.emoji,
            unit: p.unit,
          }}
        />
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${
        accent ? "bg-brand-600 text-white" : "bg-white text-slate-700 shadow-sm"
      }`}
    >
      <p
        className={`text-[11px] ${accent ? "text-brand-100" : "text-slate-400"}`}
      >
        {label}
      </p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
