"use client";

import { useRouter } from "next/navigation";

export default function KeluarAdmin() {
  const router = useRouter();

  async function keluar() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      onClick={keluar}
      className="rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
    >
      Keluar
    </button>
  );
}
