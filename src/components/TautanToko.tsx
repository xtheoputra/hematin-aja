"use client";

import type { ReactNode } from "react";

/**
 * Tautan keluar ke situs toko yang kliknya ikut tercatat (§6 Analitik).
 *
 * Memakai `sendBeacon`: permintaannya dititipkan ke peramban dan tetap terkirim
 * walau tab langsung berpindah. `fetch` biasa di `onClick` sering dibatalkan
 * di tengah jalan oleh navigasi — yaitu persis saat pencatatan ini dibutuhkan.
 *
 * Kalau pencatatan gagal, tautannya tetap jalan. Analitik tidak pernah boleh
 * berdiri di antara pengguna dan tujuannya.
 */
export default function TautanToko({
  slug,
  href,
  className,
  children,
}: {
  slug: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        try {
          const data = JSON.stringify({ toko: slug });
          if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            navigator.sendBeacon(
              "/api/klik",
              new Blob([data], { type: "application/json" })
            );
          } else {
            void fetch("/api/klik", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: data,
              keepalive: true,
            }).catch(() => {});
          }
        } catch {
          /* pencatatan gagal tidak boleh menahan tautannya */
        }
      }}
    >
      {children}
    </a>
  );
}
