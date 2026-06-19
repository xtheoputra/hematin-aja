"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Cat = { slug: string; name: string; icon: string };

export default function SearchControls({ categories }: { categories: Cat[] }) {
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
      router.replace(`/?${sp.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function selectCat(slug: string) {
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (slug && slug !== activeCat) sp.set("kategori", slug);
    else sp.delete("kategori");
    router.replace(`/?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="search"
          placeholder="Cari produk… (mis. Indomie, minyak)"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-label="Hapus pencarian"
          >
            ✕
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
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
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
