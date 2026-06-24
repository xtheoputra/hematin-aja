import Link from "next/link";
import { getSupermarkets } from "@/lib/queries";
import StoreAvatar from "@/components/StoreAvatar";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function SupermarketListPage() {
  const stores = await getSupermarkets();

  return (
    <main>
      <PageHeader
        title="Supermarket"
        emoji="🏪"
        subtitle={`${stores.length} toko diperingkat dari termurah`}
      />

      <div className="container-app space-y-4 pt-5">
        <p className="px-1 text-xs text-ink-400 dark:text-ink-500 md:text-sm">
          Indeks harga: <b className="text-ink-600 dark:text-ink-300">100</b> = rata-rata
          pasar. Makin kecil makin murah.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s, idx) => {
          const cheaper = s.priceIndex < 100;
          const diff = Math.abs(100 - s.priceIndex);
          return (
            <Link
              key={s.slug}
              href={`/supermarket/${s.slug}`}
              className="card block p-4 transition active:scale-[0.99] hover:border-brand-200 hover:shadow-card-hover dark:hover:border-brand-700"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <StoreAvatar name={s.name} color={s.color} size="lg" />
                  {idx < 3 && (
                    <span className="absolute -bottom-1.5 -right-1.5 text-base">
                      {MEDAL[idx]}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-base font-bold text-ink-800 dark:text-ink-100">
                      {s.name}
                    </p>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                      {s.type}
                    </span>
                  </div>
                  {s.tagline && (
                    <p className="truncate text-[11px] text-ink-400 dark:text-ink-500">
                      {s.tagline}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-lg font-extrabold leading-none tabular-nums ${
                      cheaper ? "text-brand-600" : "text-rose-500"
                    }`}
                  >
                    {s.priceIndex}
                  </p>
                  <p className="text-[10px] text-ink-400">indeks</p>
                </div>
              </div>

              {/* Bar indeks relatif terhadap 100 */}
              <div className="mt-3 flex items-center gap-2">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className={`h-full rounded-full ${
                      cheaper ? "bg-brand-500" : "bg-rose-400"
                    }`}
                    style={{ width: `${Math.min(100, s.priceIndex)}%` }}
                  />
                </div>
                <span
                  className={`shrink-0 text-[10px] font-semibold ${
                    cheaper ? "text-brand-600" : "text-rose-500"
                  }`}
                >
                  {diff === 0
                    ? "rata-rata"
                    : `${diff}% ${cheaper ? "lebih murah" : "lebih mahal"}`}
                </span>
              </div>

              {/* Statistik */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat value={`${s.productCount}`} label="produk" />
                <MiniStat value={`${s.wins}`} label="kali termurah" />
                <MiniStat value={`${s.winRate.toFixed(0)}%`} label="win rate" />
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </main>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-ink-50 py-2 dark:bg-ink-800/60">
      <p className="font-display text-sm font-bold tabular-nums text-ink-700 dark:text-ink-200">
        {value}
      </p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  );
}
