"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KELAS_ISIAN, KELAS_LABEL, kirimJson } from "./kirim";

export default function MasukAdmin() {
  const router = useRouter();
  const [sandi, setSandi] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setGalat(null);
    const r = await kirimJson("/api/admin/login", { sandi });
    setSibuk(false);
    if (r.ok) {
      setSandi("");
      router.refresh();
    } else {
      setGalat(r.pesan);
    }
  }

  return (
    <form onSubmit={masuk} className="card mx-auto max-w-sm space-y-3 p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-ink-800 dark:text-ink-100">
          Masuk admin
        </h2>
        <p className="mt-1 text-xs text-ink-400">
          Halaman ini bisa mengubah harga yang dilihat orang. Karena itu bersandi.
        </p>
      </div>

      <div>
        <label className={KELAS_LABEL} htmlFor="sandi">
          Sandi admin
        </label>
        <input
          id="sandi"
          type="password"
          autoComplete="current-password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          className={KELAS_ISIAN}
          placeholder="••••••••"
          required
        />
      </div>

      {galat && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          {galat}
        </p>
      )}

      <button
        type="submit"
        disabled={sibuk}
        className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
      >
        {sibuk ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
