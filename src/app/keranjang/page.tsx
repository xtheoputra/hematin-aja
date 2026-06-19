"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";
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
  const maxSaving =
    best && worst && worst.availableCount === best.availableCount
      ? worst.total - best.total
      : 0;

  return (
    <main>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-b from-brand-600 to-brand-500 px-4 pb-4 pt-6 text-white">
        <div>
          <h1 className="text-xl font-extrabold">Keranjang 🧺</h1>
          <p className="text-xs text-brand-100">
            {count} barang · banding total antar-toko
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium"
          >
            Kosongkan
          </button>
        )}
      </header>

      <div className="space-y-4 px-4 pt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="text-4xl">🧺</p>
            <p className="mt-2 text-sm text-slate-500">Keranjang masih kosong.</p>
            <Link
              href="/"
              className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Cari produk
            </Link>
          </div>
        ) : (
          <>
            {/* Rekomendasi toko termurah */}
            {best && (
              <section className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">Belanja paling hemat di</p>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: best.color }}
                  >
                    {best.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-800">
                      {best.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {best.availableCount} dari {items.length} barang tersedia
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-brand-700">
                      {formatRupiah(best.total)}
                    </p>
                    {maxSaving > 0 && (
                      <p className="text-[11px] font-medium text-amber-600">
                        hemat {formatRupiah(maxSaving)}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Perbandingan semua toko */}
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Total di setiap supermarket {loading && "…"}
              </h2>
              <ul className="space-y-2">
                {stores.map((s, idx) => (
                  <li
                    key={s.supermarketId}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      idx === 0
                        ? "border-brand-200 bg-brand-50"
                        : "border-slate-100"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {s.name}
                      </p>
                      {s.missingCount > 0 && (
                        <p className="text-[11px] text-rose-400">
                          {s.missingCount} barang tak tersedia
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {formatRupiah(s.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Daftar barang */}
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Barang ({items.length})
              </h2>
              <ul className="divide-y divide-slate-100">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-2">
                    <span className="text-2xl">{i.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {i.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{i.unit}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQty(i.productId, i.qty - 1)}
                        className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600"
                        aria-label="Kurangi"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {i.qty}
                      </span>
                      <button
                        onClick={() => setQty(i.productId, i.qty + 1)}
                        className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600"
                        aria-label="Tambah"
                      >
                        ＋
                      </button>
                      <button
                        onClick={() => remove(i.productId)}
                        className="ml-1 h-7 w-7 rounded-lg text-rose-400"
                        aria-label="Hapus"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
