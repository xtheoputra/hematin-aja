"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Cat = { slug: string; name: string; icon: string };

export default function SearchControls({
  categories,
  basePath = "/",
  placeholder = "Cari produk… (mis. Indomie, minyak goreng)",
}: {
  categories: Cat[];
  basePath?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const activeCat = params.get("kategori") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");

  // Debounce pencarian → update URL query "q".
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(Array.from(params.entries()));
      if (q) sp.set("q", q);
      else sp.delete("q");
      const qs = sp.toString();
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function selectCat(slug: string) {
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (slug && slug !== activeCat) sp.set("kategori", slug);
    else sp.delete("kategori");
    const qs = sp.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">
          <SearchIcon />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="search"
          placeholder={placeholder}
          className="w-full rounded-2xl border border-ink-200/70 bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-ink-800 shadow-card outline-none transition placeholder:font-normal placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:focus:ring-brand-900/40"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink-100 text-xs text-ink-500 dark:bg-ink-700 dark:text-ink-300"
            aria-label="Hapus pencarian"
          >
            ✕
          </button>
        )}
      </div>

      {/* Chip kategori */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
        <Chip active={!activeCat} onClick={() => selectCat("")}>
          🛒 Semua
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.slug}
            active={activeCat === c.slug}
            onClick={() => selectCat(c.slug)}
          >
            {c.icon} {c.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-glow"
          : "border-ink-200/70 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m20 20-3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
