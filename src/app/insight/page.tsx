import Link from "next/link";
import { getInsights } from "@/lib/queries";
import { formatRupiah, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InsightPage() {
  const { topDrops, cheapestStoreOverall, recommendations } =
    await getInsights();

  return (
    <main>
      <header className="sticky top-0 z-30 bg-gradient-to-b from-brand-600 to-brand-500 px-4 pb-4 pt-6 text-white">
        <h1 className="text-xl font-extrabold">Insight 💡</h1>
        <p className="text-xs text-brand-100">
          Ringkasan harga & peluang hemat
        </p>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {/* Toko termurah keseluruhan */}
        {cheapestStoreOverall && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">
              Supermarket paling sering termurah
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold text-white"
                style={{ backgroundColor: cheapestStoreOverall.color }}
              >
                {cheapestStoreOverall.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-800">
                  {cheapestStoreOverall.name}
                </p>
                <p className="text-xs text-slate-400">
                  Termurah untuk{" "}
                  <b className="text-brand-600">
                    {cheapestStoreOverall.winRate.toFixed(0)}%
                  </b>{" "}
                  produk
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Penurunan harga terbesar */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            📉 Harga lagi turun
          </h2>
          {topDrops.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Belum ada penurunan harga signifikan.
            </p>
          ) : (
            <ul className="space-y-2">
              {topDrops.map((d) => (
                <Link
                  key={`${d.slug}-${d.store}`}
                  href={`/produk/${d.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5"
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {d.name}
                    </p>
                    <p className="text-[11px] text-slate-400">di {d.store}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-700">
                      {formatRupiah(d.newPrice)}
                    </p>
                    <p className="text-[11px] font-semibold text-rose-500">
                      {formatPercent(d.changePct)}
                    </p>
                  </div>
                </Link>
              ))}
            </ul>
          )}
        </section>

        {/* Rekomendasi hemat per kategori */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            🤑 Rekomendasi hemat
          </h2>
          {recommendations.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Belum ada rekomendasi.
            </p>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((r) => (
                <Link
                  key={r.pickSlug}
                  href={`/produk/${r.pickSlug}`}
                  className="block rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.pickEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {r.pickName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Pilihan termurah di {r.categoryName} · {r.pickStore}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-700">
                        {formatRupiah(r.pickPrice)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                    💰 Bisa lebih hemat ~{formatRupiah(r.saving)} vs {r.comparedTo}
                  </p>
                </Link>
              ))}
            </ul>
          )}
        </section>

        <p className="px-2 pb-2 text-center text-[11px] text-slate-300">
          Harga bersifat ilustratif & dapat berubah. Selalu cek harga resmi di
          toko.
        </p>
      </div>
    </main>
  );
}
