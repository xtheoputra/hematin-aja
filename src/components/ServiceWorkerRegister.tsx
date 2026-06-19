"use client";

import { useEffect } from "react";

// Daftarkan service worker untuk kemampuan PWA (install + cache offline).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* abaikan kegagalan registrasi */
      });
    }
  }, []);
  return null;
}
