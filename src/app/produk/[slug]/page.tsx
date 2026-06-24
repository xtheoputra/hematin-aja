import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/queries";
import { formatRupiah, formatPercent } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import AddToCartButton from "@/components/AddToCartButton";
import StoreAvatar from "@/components/StoreAvatar";
import ProductThumb from "@/components/ProductThumb";
import ThemeToggle from "@/components/ThemeToggle";
import PriceSourceBadge from "@/components/PriceSourceBadge";

export const dynamic = "force-dynamic";

const RANK_BADGE = ["🥇", "🥈", "🥉"];

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
  const spread = p.stats.max - p.stats.min;

  return (
    <main>
      <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/90 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90 md:top-16">
        <div className="container-app flex h-14 items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-600 shadow-card dark:bg-ink-800 dark:text-ink-300"
            aria-label="Kembali"
          >
            ←
          </Link>
          <span className="truncate text-sm font-semibold text-ink-700 dark:text-ink-200">
            {p.name}
          </span>
          <span className="ml-auto md:hidden">
            <ThemeToggle />
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {/* Ringkasan produk */}
        <section className="card flex gap-4 p-4">
          <ProductThumb
            image={p.image}
            emoji={p.emoji}
            alt={p.name}
            className="h-24 w-24 shrink-0 rounded-2xl"
            emojiClassName="text-5xl"
          />
          <div className="min-w-0 self-center">
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {p.categoryName}
            </span>
            <h1 className="mt-1.5 font-display text-xl font-extrabold leading-tight text-ink-900 dark:text-white">
              {p.name}
            </h1>
            {p.brand && (
              <p className="mt-0.5 text-xs font-medium text-ink-500 dark:text-ink-400">{p.brand}</p>
            )}
            <p className="text-xs text-ink-400">{p.unit}</p>
          </div>
        </section>

        {/* Highlight harga termurah */}
        <section className="card overflow-hidden">
          <div className="bg-brand-gradient px-4 py-4 text-white">
            <p className="text-xs font-medium text-brand-50/90">
              Harga termurah saat ini
            </p>
            <div className="mt-1 flex items-end justify-between">
              <p className="font-display text-3xl font-extrabold tabular-nums">
                {formatRupiah(p.stats.min)}
              </p>
              <p className="text-right text-xs text-brand-50/90">
                di{" "}
                <b className="font-semibold text-white">
                  {p.stats.cheapestStore}
                </b>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-ink-200/60 dark:divide-ink-800">
            <MiniStat label="Rata-rata" value={formatRupiah(p.stats.avg)} />
            <MiniStat label="Termahal" value={formatRupiah(p.stats.max)} />
            <MiniStat
              label="Selisih"
              value={formatRupiah(spread)}
              highlight
            />
          </div>
        </section>

        {change !== null && (
          <div
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold ${
              change < 0
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : change > 0
                ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300"
                : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
            }`}
          >
            <span>{change < 0 ? "📉" : change > 0 ? "📈" : "➖"}</span>
            {change < 0 ? "Turun" : change > 0 ? "Naik" : "Stabil"}{" "}
            {formatPercent(change)} sejak awal periode
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Grafik tren */}
        <section className="card p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            📈 Tren Harga
          </h2>
          <PriceChart history={p.history} series={series} />
        </section>

        {/* Daftar harga per toko */}
        <section className="card p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            Harga per Supermarket
          </h2>
          <ul className="space-y-2">
            {p.stores.map((s, idx) => {
              const isBest = idx === 0 && s.inStock;
              return (
                <li
                  key={s.supermarketId}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                    isBest
                      ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
                      : "border-ink-200/60 bg-white dark:border-ink-800 dark:bg-ink-900"
                  }`}
                >
                  <div className="relative">
                    <StoreAvatar name={s.supermarketName} color={s.color} size="md" />
                    {s.inStock && idx < 3 && (
                      <span className="absolute -bottom-1.5 -right-1.5 text-sm">
                        {RANK_BADGE[idx]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                        {s.supermarketName}
                      </p>
                      <PriceSourceBadge
                        isReal={s.isReal}
                        date={s.recordedAt}
                        className="shrink-0"
                      />
                    </div>
                    {!s.inStock ? (
                      <p className="text-[11px] font-medium text-rose-400">
                        Stok habis
                      </p>
                    ) : isBest ? (
                      <p className="text-[11px] font-semibold text-brand-600">
                        ⭐ Pilihan termurah
                      </p>
                    ) : (
                      <p className="text-[11px] text-ink-400">
                        +{formatRupiah(s.price - p.stats.min)} dari termurah
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-display text-base font-extrabold tabular-nums ${
                      s.inStock
                        ? isBest
                          ? "text-brand-700 dark:text-brand-400"
                          : "text-ink-800 dark:text-ink-200"
                        : "text-ink-300 line-through dark:text-ink-600"
                    }`}
                  >
                    {formatRupiah(s.price)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        </div>

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

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-2 py-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-bold tabular-nums ${
          highlight ? "text-gold-600 dark:text-gold-400" : "text-ink-700 dark:text-ink-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
