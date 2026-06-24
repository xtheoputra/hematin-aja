"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Tombol Refresh on-demand: menarik harga NYATA terbaru dari Open Prices
 * lewat /api/refresh, lalu memuat ulang data halaman. Tidak jalan di background.
 */
export default function RefreshButton({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/refresh", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        setMsg(
          d.inserted > 0
            ? `+${d.inserted} harga nyata diperbarui`
            : "Belum ada harga nyata baru"
        );
        router.refresh();
      } else {
        setMsg("Gagal memperbarui");
      }
    } catch {
      setMsg("Gagal memperbarui");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4500);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={run}
        disabled={loading}
        title="Tarik harga nyata terbaru (Open Prices)"
        className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-70 ${
          light
            ? "bg-white/15 text-white backdrop-blur hover:bg-white/25"
            : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        }`}
      >
        <span className={loading ? "animate-spin" : ""}>🔄</span>
        <span className="hidden sm:inline">
          {loading ? "Memperbarui…" : "Refresh harga"}
        </span>
      </button>
      {msg && (
        <span className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg dark:bg-ink-700">
          {msg}
        </span>
      )}
    </div>
  );
}
