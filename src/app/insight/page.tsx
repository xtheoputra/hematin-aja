import Link from "next/link";
import { getInsights, getLatestRecordedAt } from "@/lib/queries";
import { getDisplayMode } from "@/lib/mode";
import { formatRupiah, formatPercent } from "@/lib/format";
import StoreAvatar from "@/components/StoreAvatar";
import PageHeader from "@/components/PageHeader";
import DataHonestyNote from "@/components/DataHonestyNote";

export const dynamic = "force-dynamic";

export default async function InsightPage() {
  const mode = getDisplayMode();
  const [
    { topDrops, cheapestStoreOverall, recommendations, realPriceCount },
    latestRecordedAt,
  ] = await Promise.all([getInsights(mode === "real"), getLatestRecordedAt()]);

  return (
    <main>
      <PageHeader
        title="Insight"
        emoji="💡"
        subtitle="Ringkasan harga & peluang hemat"
      />

      <div className="container-app space-y-4 pt-5">
        <DataHonestyNote
          realPriceCount={realPriceCount}
          mode={mode}
          latestRecordedAt={latestRecordedAt}
        />

        {/* Toko termurah keseluruhan */}
        {cheapestStoreOverall && (
          <section className="card overflow-hidden">
            <div className="flex items-center gap-4 bg-brand-gradient px-4 py-5 text-white">
              <StoreAvatar
                name={cheapestStoreOverall.name}
                color={cheapestStoreOverall.color}
                size="lg"
                className="ring-2 ring-white/40"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-brand-50/90">
                  👑 Supermarket paling sering termurah
                </p>
                <p className="truncate font-display text-xl font-extrabold">
                  {cheapestStoreOverall.name}
                </p>
                <p className="text-[11px] text-brand-50/80">
                  Termurah untuk{" "}
                  <b className="font-bold text-white">
                    {cheapestStoreOverall.winRate.toFixed(0)}%
                  </b>{" "}
                  produk yang dipantau
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
        {/* Penurunan harga terbesar */}
        <section className="card p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            📉 Harga lagi turun
          </h2>
          {topDrops.length === 0 ? (
            <EmptyHint text="Belum ada penurunan harga signifikan." />
          ) : (
            <ul className="space-y-2">
              {topDrops.map((d) => (
                <Link
                  key={`${d.slug}-${d.store}`}
                  href={`/produk/${d.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-ink-200/60 p-2.5 transition active:scale-[0.99] hover:border-brand-200 dark:border-ink-800 dark:hover:border-brand-700"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-2xl dark:bg-ink-800">
                    {d.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                      {d.name}
                    </p>
                    <p className="text-[11px] text-ink-400">di {d.store}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-extrabold tabular-nums text-brand-700">
                      {formatRupiah(d.newPrice)}
                    </p>
                    <p className="inline-block rounded-full bg-rose-50 px-1.5 text-[10px] font-bold text-rose-500">
                      {formatPercent(d.changePct)}
                    </p>
                    {!d.isReal && (
                      <p className="mt-0.5 text-[10px] text-ink-400">dari perkiraan</p>
                    )}
                  </div>
                </Link>
              ))}
            </ul>
          )}
        </section>

        {/* Rekomendasi hemat per kategori */}
        <section className="card p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            🤑 Rekomendasi hemat
          </h2>
          {recommendations.length === 0 ? (
            <EmptyHint text="Belum ada rekomendasi." />
          ) : (
            <ul className="space-y-2.5">
              {recommendations.map((r) => (
                <Link
                  key={r.pickSlug}
                  href={`/produk/${r.pickSlug}`}
                  className="block rounded-2xl border border-ink-200/60 p-3 transition active:scale-[0.99] hover:border-brand-200 dark:border-ink-800 dark:hover:border-brand-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-2xl dark:bg-ink-800">
                      {r.pickEmoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                        {r.pickName}
                      </p>
                      <p className="text-[11px] text-ink-400">
                        {r.pickUnit} · {r.pickStore}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-extrabold tabular-nums text-brand-700">
                        {formatRupiah(r.perSatuan)}
                        <span className="text-[11px] font-semibold text-ink-400">
                          /{r.satuanTampil}
                        </span>
                      </p>
                      <p className="text-[10px] tabular-nums text-ink-400">
                        label {formatRupiah(r.pickPrice)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 rounded-xl bg-gold-50 px-2.5 py-1.5 text-[11px] font-semibold leading-relaxed text-gold-700 dark:bg-gold-500/10 dark:text-gold-400">
                    💰 {r.hematPersen.toFixed(0)}% lebih murah per {r.satuanTampil} —
                    hemat {formatRupiah(r.hematPerSatuan)}/{r.satuanTampil} dibanding
                    median {formatRupiah(r.medianPerSatuan)} dari{" "}
                    {r.jumlahPembanding} produk sebanding di {r.categoryName}.
                  </p>
                </Link>
              ))}
            </ul>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-ink-50 py-6 text-center text-sm text-ink-400 dark:bg-ink-800/60">
      {text}
    </p>
  );
}
