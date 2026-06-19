"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const items = [
  { href: "/", label: "Beranda", icon: "🏠" },
  { href: "/keranjang", label: "Keranjang", icon: "🧺", badge: true },
  { href: "/insight", label: "Insight", icon: "💡" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active ? "text-brand-600" : "text-slate-400"
              }`}
            >
              <span className="text-xl leading-none">{it.icon}</span>
              {it.label}
              {it.badge && count > 0 && (
                <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold leading-4 text-white">
                  {count}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
