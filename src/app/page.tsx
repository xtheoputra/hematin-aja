import { Suspense } from "react";
import Link from "next/link";
import { getCategories, getProducts, getHomeStats } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";
import ProductCard from "@/components/ProductCard";
import SearchControls from "@/components/SearchControls";
import DataHonestyNote from "@/components/DataHonestyNote";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; kategori?: string };
}) {
  const search = searchParams.q?.trim() || undefined;
  const category = searchParams.kategori || undefined;
  const mode = getDisplayMode();
  const realOnly = isRealOnly(mode);

  const [categories, products, stats] = await Promise.all([
    getCategories(),
    getProducts({ search, category, realOnly }),
    getHomeStats(realOnly),
  ]);

  // Tampilkan yang ada harganya lebih dulu (relevan di mode "Hanya Nyata").
  const sorted = [...products].sort(
    (a, b) => Number(b.available) - Number(a.available)
  );

  const isFiltering = Boolean(search || category);
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <main>
      {/* ===== Hero ===== */}
      <header className="relative overflow-hidden bg-brand-gradient text-white">
        <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 md:h-72 md:w-72" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/5 md:h-64 md:w-64" />

        <div className="container-app relative pb-20 pt-7 md:pb-28 md:pt-16 md:text-center">
          {/* Logo + aksi hanya di mobile (desktop pakai TopNav) */}
          <div className="flex items-start justify-between md:hidden">
            <Logo light />
            <div className="flex items-center gap-2">
              <RefreshButton light />
              <ThemeToggle light />
            </div>
          </div>

          <h1 className="mt-6 font-display text-2xl font-extrabold leading-tight tracking-tight md:mt-0 md:text-5xl">
            Belanja pintar, harga selalu termurah.
          </h1>
          <p className="mt-2 max-w-[18rem] text-sm text-brand-50/90 md:mx-auto md:mt-4 md:max-w-xl md:text-base">
            Bandingkan harga produk konsumsi dari {stats.storeCount} supermarket
            di Indonesia dalam sekali lihat.
          </p>

          {/* Stat strip */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 md:mx-auto md:mt-8 md:max-w-2xl md:gap-4">
            <HeroStat value={`${stats.storeCount}`} label="Supermarket" />
            <HeroStat value={`${stats.productCount}`} label="Produk" />
            <HeroStat
              value={`±${Math.round(stats.totalSaving / 1000)}rb`}
              label="Potensi hemat"
              accent
            />
          </div>
        </div>
      </header>

      {/* ===== Pencarian (mengambang di atas hero) ===== */}
      <div className="container-app relative z-20 -mt-10 md:-mt-12 md:max-w-3xl">
        <Suspense fallback={<div className="h-12 rounded-2xl bg-white shadow-card" />}>
          <SearchControls categories={categories} />
        </Suspense>
      </div>

      {/* ===== Catatan kejujuran data + CTA banding ===== */}
      <div className="container-app space-y-3 pt-6 md:pt-8">
        <DataHonestyNote
          realPriceCount={stats.realPriceCount}
          mode={mode}
          latestRecordedAt={stats.latestRecordedAt}
        />
        <Link
          href="/bandingkan"
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:border-brand-700"
        >
          <span className="flex items-center gap-2">
            <span>📊</span> Lihat tabel banding harga semua supermarket
          </span>
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* ===== Hasil ===== */}
      <div className="container-app space-y-4 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink-800 dark:text-ink-100 md:text-xl">
            {isFiltering
              ? activeCategory
                ? activeCategory.name
                : "Hasil pencarian"
              : "Produk populer"}
          </h2>
          <p className="text-xs font-medium text-ink-400 md:text-sm">
            {sorted.length} produk
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-3xl dark:bg-ink-800">
              🔍
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-700 dark:text-ink-200">
              Produk tidak ditemukan
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Coba kata kunci lain atau pilih kategori berbeda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
              >
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function HeroStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-3 py-2.5 backdrop-blur md:py-4 ${
        accent ? "bg-gold-400/95 text-ink-900" : "bg-white/15 text-white"
      }`}
    >
      <p className="font-display text-lg font-extrabold leading-none tabular-nums md:text-3xl">
        {value}
      </p>
      <p
        className={`mt-1 text-[10px] font-medium md:mt-1.5 md:text-xs ${
          accent ? "text-ink-800/80" : "text-brand-50/80"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
