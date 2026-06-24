import type { ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";

/**
 * Header gradien brand yang dipakai konsisten (Keranjang, Insight).
 * Punya pola dekoratif lembut & area aksi opsional di kanan.
 */
export default function PageHeader({
  title,
  subtitle,
  emoji,
  action,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-brand-gradient pb-6 pt-7 text-white md:pb-9 md:pt-10">
      {/* lingkaran dekoratif */}
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-sm md:h-60 md:w-60" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-black/5 md:h-56 md:w-56" />
      <div className="container-app relative flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            {emoji && <span className="mr-1.5">{emoji}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-brand-50/90 md:text-base">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <span className="md:hidden">
            <ThemeToggle light />
          </span>
        </div>
      </div>
    </header>
  );
}
