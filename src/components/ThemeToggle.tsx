"use client";

import { useEffect, useState } from "react";

/**
 * Tombol ganti tema terang/gelap.
 * Sinkron dengan localStorage + preferensi sistem. Skrip di <head>
 * (lihat layout.tsx) sudah menyetel kelas `dark` sebelum hidrasi → tanpa kedip.
 */
export default function ThemeToggle({ light = false }: { light?: boolean }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("hematin-theme", next ? "dark" : "light");
    } catch {
      /* abaikan */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Mode terang" : "Mode gelap"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base backdrop-blur transition active:scale-90 ${
        light
          ? "bg-white/15 text-white hover:bg-white/25"
          : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200"
      }`}
    >
      <span className="leading-none">{mounted && dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
