"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KELAS_ISIAN, KELAS_LABEL, kirimJson } from "./kirim";

/**
 * Form alias. Nilainya paling terasa kalau diisi dari daftar "kueri yang gagal"
 * di bawah halaman ini — tiap kueri gagal adalah nama yang benar-benar diketik
 * orang tapi tidak menemukan apa pun.
 */
export default function FormAlias({
  produk,
  usulan,
}: {
  produk: { slug: string; name: string }[];
  usulan?: string;
}) {
  const router = useRouter();
  const [pilihProduk, setPilihProduk] = useState("");
  const [alias, setAlias] = useState(usulan ?? "");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setPesan(null);

    const r = await kirimJson("/api/admin/aliases", {
      produk: pilihProduk,
      alias,
    });

    setSibuk(false);
    setPesan({ ok: r.ok, teks: r.pesan });
    if (r.ok) {
      setAlias("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={simpan} className="card space-y-3 p-4 md:p-5">
      <div>
        <h3 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
          🏷️ Alias produk
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">
          Nama lain yang dipakai orang atau toko. Satu alias hanya boleh menunjuk
          satu produk.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={KELAS_LABEL} htmlFor="al-produk">
            Produk
          </label>
          <select
            id="al-produk"
            value={pilihProduk}
            onChange={(e) => setPilihProduk(e.target.value)}
            className={KELAS_ISIAN}
            required
          >
            <option value="">— pilih produk —</option>
            {produk.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="al-alias">
            Alias
          </label>
          <input
            id="al-alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className={KELAS_ISIAN}
            placeholder="mi goreng indomie"
            maxLength={120}
            required
          />
        </div>
      </div>

      {pesan && (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-medium ${
            pesan.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <button
        type="submit"
        disabled={sibuk}
        className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
      >
        {sibuk ? "Menyimpan…" : "Simpan alias"}
      </button>
    </form>
  );
}
