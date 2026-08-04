"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KELAS_ISIAN, KELAS_LABEL, kirimJson } from "./kirim";

export default function FormProduk({
  kategori,
}: {
  kategori: { slug: string; name: string; icon: string }[];
}) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [merek, setMerek] = useState("");
  const [satuan, setSatuan] = useState("");
  const [kat, setKat] = useState("");
  const [emoji, setEmoji] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setPesan(null);

    const r = await kirimJson("/api/admin/products", {
      nama,
      merek,
      satuan,
      kategori: kat,
      emoji,
    });

    setSibuk(false);
    setPesan({ ok: r.ok, teks: r.pesan });
    if (r.ok) {
      setNama("");
      setMerek("");
      setSatuan("");
      setEmoji("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={simpan} className="card space-y-3 p-4 md:p-5">
      <div>
        <h3 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
          📦 Produk baru
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">
          Ukuran ditulis di <b>satuan</b> (mis. “600 ml”) — di situlah pencarian
          membaca ukuran, dan ukuran adalah pembeda yang keras.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={KELAS_LABEL} htmlFor="pr-nama">
            Nama produk
          </label>
          <input
            id="pr-nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className={KELAS_ISIAN}
            placeholder="Indomie Goreng"
            maxLength={120}
            required
          />
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="pr-merek">
            Merek
          </label>
          <input
            id="pr-merek"
            value={merek}
            onChange={(e) => setMerek(e.target.value)}
            className={KELAS_ISIAN}
            placeholder="Indomie"
          />
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="pr-satuan">
            Satuan / ukuran
          </label>
          <input
            id="pr-satuan"
            value={satuan}
            onChange={(e) => setSatuan(e.target.value)}
            className={KELAS_ISIAN}
            placeholder="600 ml"
          />
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="pr-kategori">
            Kategori
          </label>
          <select
            id="pr-kategori"
            value={kat}
            onChange={(e) => setKat(e.target.value)}
            className={KELAS_ISIAN}
            required
          >
            <option value="">— pilih kategori —</option>
            {kategori.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.icon} {k.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="pr-emoji">
            Emoji
          </label>
          <input
            id="pr-emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className={KELAS_ISIAN}
            placeholder="🍜"
            maxLength={4}
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
        {sibuk ? "Menyimpan…" : "Simpan produk"}
      </button>
    </form>
  );
}
