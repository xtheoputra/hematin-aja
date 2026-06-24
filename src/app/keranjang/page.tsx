"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";
import StoreAvatar from "@/components/StoreAvatar";
import PageHeader from "@/components/PageHeader";
import type { CartCompareStore } from "@/lib/types";

export default function CartPage() {
  const { items, setQty, remove, clear, count } = useCart();
  const [stores, setStores] = useState<CartCompareStore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setStores([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setStores(d.stores ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [items]);

  const best = stores[0];
  const worst = stores.length > 1 ? stores[stores.length - 1] : null;
  const maxTotal = stores.reduce((m, s) => Math.max(m, s.total), 0) || 1;
  const maxSaving =
    best && worst && worst.availableCount === best.availableCount
      ? worst.total - best.total
      : 0;

  return (
    <main>
      <PageHeader
        title="Keranjang"
        emoji="🧺"
        subtitle={`${count} barang · banding total antar-toko`}
        action={
          items.length > 0 ? (
            <button
              onClick={clear}
              className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-xs font-semibold backdrop-blur transition active:scale-95"
            >
              Kosongkan
            </button>
          ) : undefined
        }
      />

      <div className="container-app space-y-4 pt-5">
        {items.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-3xl dark:bg-ink-800">
              🧺
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-700 dark:text-ink-200">
              Keranjang masih kosong
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Tambahkan produk untuk membandingkan total belanja antar-toko.
            </p>
            <Link href="/" className="btn-primary mt-5 px-5 py-3 text-sm">
              Mulai cari produk
            </Link>
          </div>
        ) : (
          <>
            {/* Rekomendasi toko termurah */}
            {best && (
              <section className="card overflow-hidden">
                <div className="flex items-center gap-3 bg-brand-gradient px-4 py-4 text-white">
                  <StoreAvatar
                    name={best.name}
                    color={best.color}
                    size="lg"
                    className="ring-2 ring-white/40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-brand-50/90">
                      🏆 Paling hemat belanja di
                    </p>
                    <p className="truncate font-display text-lg font-extrabold">
                      {best.name}
                    </p>
                    <p className="text-[11px] text-brand-50/80">
                      {best.availableCount} dari {items.length} barang tersedia
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold tabular-nums">
                      {formatRupiah(best.total)}
                    </p>
                    {maxSaving > 0 && (
                      <p className="mt-0.5 inline-block rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold text-ink-900">
                        hemat {formatRupiah(maxSaving)}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {/* Perbandingan semua toko */}
            <section className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
                Total di setiap supermarket
                {loading && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
                )}
              </h2>
              <ul className="space-y-3">
                {stores.map((s, idx) => {
                  const pct = Math.round((s.total / maxTotal) * 100);
                  const isBest = idx === 0;
                  return (
                    <li key={s.supermarketId}>
                      <div className="mb-1 flex items-center gap-2.5">
                        <StoreAvatar name={s.name} color={s.color} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                            {s.name}
                            {isBest && (
                              <span className="ml-1.5 text-[10px] font-bold text-brand-600">
                                TERMURAH
                              </span>
                            )}
                          </p>
                          {s.missingCount > 0 && (
                            <p className="text-[11px] text-rose-400">
                              {s.missingCount} barang tak tersedia
                            </p>
                          )}
                        </div>
                        <span
                          className={`font-display text-sm font-extrabold tabular-nums ${
                            isBest ? "text-brand-700 dark:text-brand-400" : "text-ink-700 dark:text-ink-200"
                          }`}
                        >
                          {formatRupiah(s.total)}
                        </span>
                      </div>
                      {/* bar relatif terhadap total termahal */}
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isBest ? "bg-brand-500" : "bg-ink-300 dark:bg-ink-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Daftar barang */}
            <section className="card p-4">
              <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
                Barang ({items.length})
              </h2>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-2xl dark:bg-ink-800">
                      {i.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                        {i.name}
                      </p>
                      <p className="text-[11px] text-ink-400">{i.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(i.productId, i.qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition active:scale-90 dark:bg-ink-800 dark:text-ink-300"
                        aria-label="Kurangi"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums">
                        {i.qty}
                      </span>
                      <button
                        onClick={() => setQty(i.productId, i.qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition active:scale-90 dark:bg-ink-800 dark:text-ink-300"
                        aria-label="Tambah"
                      >
                        ＋
                      </button>
                      <button
                        onClick={() => remove(i.productId)}
                        className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-300 transition hover:text-rose-500"
                        aria-label="Hapus"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
