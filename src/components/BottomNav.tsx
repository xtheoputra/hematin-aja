"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

type Item = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  badge?: boolean;
};

const items: Item[] = [
  {
    href: "/",
    label: "Beranda",
    icon: (a) => (
      <Icon active={a}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      </Icon>
    ),
  },
  {
    href: "/supermarket",
    label: "Toko",
    icon: (a) => (
      <Icon active={a}>
        <path d="M4 9h16l-1-4H5L4 9Z" />
        <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
        <path d="M9 20v-5h6v5" />
      </Icon>
    ),
  },
  {
    href: "/keranjang",
    label: "Keranjang",
    badge: true,
    icon: (a) => (
      <Icon active={a}>
        <path d="M4 5h2l1.5 11.5a1 1 0 0 0 1 .9h8.2a1 1 0 0 0 1-.8L20 8H6.5" />
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17.5" cy="20" r="1.3" />
      </Icon>
    ),
  },
  {
    href: "/insight",
    label: "Insight",
    icon: (a) => (
      <Icon active={a}>
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4.9 1 .9 1.7V16h5.2v-.4c0-.7.3-1.3.9-1.7A6 6 0 0 0 12 3Z" />
      </Icon>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-lg dark:border-ink-800 dark:bg-ink-900/90 md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-brand-600" : "text-ink-400"
              }`}
            >
              <span className="relative">
                {it.icon(active)}
                {it.badge && count > 0 && (
                  <span className="absolute -right-2.5 -top-2 min-w-[1.1rem] rounded-full bg-gold-500 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white shadow-sm">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              {it.label}
              {active && (
                <span className="absolute -top-px h-1 w-8 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Icon({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
