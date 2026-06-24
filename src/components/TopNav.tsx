"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useCart } from "./CartProvider";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/supermarket", label: "Supermarket" },
  { href: "/insight", label: "Insight" },
];

/**
 * Navbar atas untuk tampilan desktop/tablet (≥ md).
 * Di layar HP disembunyikan — navigasi memakai BottomNav.
 */
export default function TopNav() {
  const pathname = usePathname();
  const { count } = useCart();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-ink-200/70 bg-white/80 backdrop-blur-lg dark:border-ink-800 dark:bg-ink-900/80 md:block">
      <div className="container-app flex h-16 items-center gap-6">
        <Link href="/" aria-label="Hematin Aja — beranda">
          <Logo />
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/keranjang"
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive("/keranjang")
                ? "bg-brand-600 text-white shadow-glow"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
            }`}
          >
            <span>🧺</span>
            Keranjang
            {count > 0 && (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 text-center text-xs font-bold leading-5 ${
                  isActive("/keranjang")
                    ? "bg-white text-brand-700"
                    : "bg-gold-500 text-white"
                }`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
