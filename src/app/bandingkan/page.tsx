import { Suspense } from "react";
import { getCategories, getCompareMatrix } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";
import PageHeader from "@/components/PageHeader";
import SearchControls from "@/components/SearchControls";
import CompareTable from "@/components/CompareTable";
import DataHonestyNote from "@/components/DataHonestyNote";

export const dynamic = "force-dynamic";

const LIMIT = 50;

export default async function BandingkanPage({
  searchParams,
}: {
  searchParams: { q?: string; kategori?: string };
}) {
  const search = searchParams.q?.trim() || undefined;
  const category = searchParams.kategori || undefined;
  const mode = getDisplayMode();

  const [categories, matrix] = await Promise.all([
    getCategories(),
    getCompareMatrix({
      search,
      category,
      realOnly: isRealOnly(mode),
      limit: LIMIT,
    }),
  ]);

  const truncated = matrix.rows.length >= LIMIT;

  return (
    <main>
      <PageHeader
        title="Bandingkan Harga"
        emoji="📊"
        subtitle={`${matrix.rows.length} produk × ${matrix.stores.length} supermarket`}
      />

      <div className="container-app space-y-4 pt-5">
        <Suspense fallback={<div className="h-12 rounded-2xl bg-white shadow-card" />}>
          <SearchControls
            categories={categories}
            basePath="/bandingkan"
            placeholder="Cari produk untuk dibandingkan…"
          />
        </Suspense>

        <DataHonestyNote
          realPriceCount={matrix.realPriceCount}
          mode={mode}
          latestRecordedAt={matrix.latestRecordedAt}
        />

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-900/25 dark:ring-brand-800" />
            Termurah
          </span>
          <span className="flex items-center gap-1">
            <span className="text-emerald-500">✓</span> Harga nyata
          </span>
          <span className="flex items-center gap-1">
            <span className="text-ink-400">angka abu</span> = perkiraan
          </span>
          <span className="flex items-center gap-1">
            <span className="text-ink-300 dark:text-ink-600">—</span> Tidak tersedia
          </span>
          <span className="flex items-center gap-1">
            <span className="text-rose-400">⚠</span> Data kedaluwarsa (&gt; 30 hari)
          </span>
          <span className="ml-auto text-ink-400">harga dalam Rupiah · geser ↔</span>
        </div>

        {matrix.rows.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-3xl dark:bg-ink-800">
              🔍
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-700 dark:text-ink-200">
              Tidak ada produk untuk dibandingkan
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Coba kata kunci atau kategori lain
              {mode === "real" && ", atau pilih mode Semua"}.
            </p>
          </div>
        ) : (
          <CompareTable matrix={matrix} />
        )}

        {truncated && (
          <p className="px-1 text-center text-[11px] text-ink-400">
            Menampilkan {LIMIT} produk pertama. Persempit dengan kategori atau
            pencarian untuk melihat sisanya.
          </p>
        )}
      </div>
    </main>
  );
}
