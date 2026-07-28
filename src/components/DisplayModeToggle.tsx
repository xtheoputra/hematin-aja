"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MODE_COOKIE, type DisplayMode } from "@/lib/modeShared";

/**
 * Pengalih mode tampilan harga (segmented control):
 *   "Semua"      → tampilkan semua harga (estimasi ditandai "Perkiraan")
 *   "Hanya Nyata" → hanya harga nyata; sisanya "Tidak tersedia"
 *
 * Menyimpan pilihan ke cookie lalu me-refresh data dari server.
 */
export default function DisplayModeToggle({
  mode,
  light = false,
  className = "",
}: {
  mode: DisplayMode;
  light?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: DisplayMode) {
    if (next === mode || pending) return;
    document.cookie = `${MODE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  const track = light
    ? "bg-white/15 ring-1 ring-white/20"
    : "bg-ink-100 ring-1 ring-ink-200/70 dark:bg-ink-800 dark:ring-ink-700";

  return (
    <div
      role="group"
      aria-label="Mode tampilan harga"
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 text-xs font-semibold ${track} ${
        pending ? "opacity-70" : ""
      } ${className}`}
    >
      <Segment
        active={mode === "all"}
        light={light}
        onClick={() => set("all")}
        title="Tampilkan semua harga (estimasi ditandai jelas)"
      >
        Semua
      </Segment>
      <Segment
        active={mode === "real"}
        light={light}
        onClick={() => set("real")}
        title="Hanya tampilkan harga nyata; sisanya 'Tidak tersedia'"
      >
        <span aria-hidden>✓</span> Nyata
      </Segment>
    </div>
  );
}

function Segment({
  active,
  light,
  onClick,
  title,
  children,
}: {
  active: boolean;
  light: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const activeCls = light
    ? "bg-white text-brand-700 shadow-sm"
    : "bg-white text-brand-700 shadow-sm dark:bg-brand-600 dark:text-white";
  const idleCls = light
    ? "text-white/90 hover:text-white"
    : "text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 transition ${active ? activeCls : idleCls}`}
    >
      {children}
    </button>
  );
}
