import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupermarketDetail } from "@/lib/queries";
import { getDisplayMode, isRealOnly } from "@/lib/mode";
import { formatRupiah } from "@/lib/format";
import StoreAvatar from "@/components/StoreAvatar";
import ProductThumb from "@/components/ProductThumb";
import PriceSourceBadge from "@/components/PriceSourceBadge";
import HargaSatuanBadge from "@/components/HargaSatuanBadge";
import TautanToko from "@/components/TautanToko";

export const dynamic = "force-dynamic";

export default async function SupermarketDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const s = await getSupermarketDetail(params.slug, isRealOnly(getDisplayMode()));
  if (!s) notFound();

  const cheaper = s.priceIndex < 100;
  const diff = Math.abs(100 - s.priceIndex);

  return (
    <main>
      <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/90 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90 md:top-16">
        <div className="container-app flex h-14 items-center gap-3">
          <Link
            href="/supermarket"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-600 shadow-card dark:bg-ink-800 dark:text-ink-300"
            aria-label="Kembali"
          >
            ←
          </Link>
          <span className="truncate text-sm font-semibold text-ink-700 dark:text-ink-200">
            {s.name}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {/* Profil toko */}
        <section className="card overflow-hidden">
          <div
            className="flex items-center gap-4 px-4 py-5 text-white"
            style={{
              background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
            }}
          >
            <StoreAvatar
              name={s.name}
              color={s.color}
              size="lg"
              className="ring-2 ring-white/50"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-extrabold">{s.name}</p>
              <p className="text-[11px] text-white/85">{s.type}</p>
              {s.tagline && (
                <p className="mt-0.5 text-xs italic text-white/90">
                  “{s.tagline}”
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-ink-200/60 dark:divide-ink-800 sm:grid-cols-4 sm:divide-y-0">
            <Stat value={`${s.productCount}`} label="Produk" />
            <Stat value={`${s.wins}`} label="Kali termurah" />
            <Stat value={`${s.winRate.toFixed(0)}%`} label="Win rate" />
            <Stat
              value={`${s.priceIndex}`}
              label="Indeks harga"
              tone={cheaper ? "good" : "bad"}
            />
          </div>
        </section>

        {/* Ringkasan posisi harga */}
        <div
          className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold ${
            cheaper
              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
              : "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300"
          }`}
        >
          {diff === 0
            ? "Harga setara rata-rata pasar"
            : `Rata-rata ${diff}% ${
                cheaper ? "lebih murah" : "lebih mahal"
              } dari pasar`}
          {s.website && (
            <>
              {" · "}
              <TautanToko
                slug={s.slug}
                href={s.website}
                className="underline underline-offset-2"
              >
                kunjungi situs
              </TautanToko>
            </>
          )}
        </div>

        {/* Daftar produk */}
        <section className="card p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            Produk di {s.name} ({s.products.length})
          </h2>
          {s.products.length === 0 ? (
            <p className="rounded-2xl bg-ink-50 py-8 text-center text-sm text-ink-400 dark:bg-ink-800/60">
              Belum ada harga nyata untuk toko ini. Pilih mode <b>Semua</b> atau
              tekan <b>Refresh</b> untuk menarik data.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {s.products.map((p) => (
                <Link
                  key={p.slug}
                  href={`/produk/${p.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-ink-200/60 p-2.5 transition active:scale-[0.99] hover:border-brand-200 dark:border-ink-800 dark:hover:border-brand-700"
                >
                  <ProductThumb
                    image={p.image}
                    emoji={p.emoji}
                    alt={p.name}
                    className="h-11 w-11 shrink-0 rounded-xl"
                    emojiClassName="text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                        {p.name}
                      </p>
                      <PriceSourceBadge source={p.source} className="shrink-0" />
                    </div>
                    {!p.inStock ? (
                      <p className="text-[11px] font-medium text-rose-400">Stok habis</p>
                    ) : p.isCheapest ? (
                      <p className="text-[11px] font-semibold text-brand-600">
                        ⭐ Termurah di sini
                      </p>
                    ) : (
                      <p className="text-[11px] text-ink-400">
                        +{formatRupiah(p.vsMin)} vs {p.cheapestStore}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block font-display text-base font-extrabold tabular-nums ${
                        !p.inStock
                          ? "text-ink-300 line-through dark:text-ink-600"
                          : p.isCheapest
                          ? "text-brand-700 dark:text-brand-400"
                          : "text-ink-800 dark:text-ink-200"
                      }`}
                    >
                      {formatRupiah(p.price)}
                    </span>
                    {p.inStock && (
                      <HargaSatuanBadge
                        harga={p.price}
                        satuan={p.unit}
                        className="mt-0.5 block"
                      />
                    )}
                  </span>
                </Link>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="px-2 py-3 text-center">
      <p
        className={`font-display text-lg font-extrabold tabular-nums ${
          tone === "good"
            ? "text-brand-600"
            : tone === "bad"
            ? "text-rose-500"
            : "text-ink-800 dark:text-ink-100"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </p>
    </div>
  );
}
