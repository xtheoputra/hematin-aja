"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KELAS_ISIAN, KELAS_LABEL, kirimJson } from "./kirim";

type Pilihan = { slug: string; name: string; unit?: string };

/**
 * Form input harga manual — jalur tercepat menambah harga NYATA, dan satu-satunya
 * yang tidak bergantung pada scraper yang belum terbukti.
 *
 * Setelah tersimpan, form sengaja TIDAK direset seluruhnya: yang lazim adalah
 * memasukkan harga produk yang sama di beberapa toko berturut-turut, jadi
 * produk & tanggal dipertahankan dan hanya toko + harga yang dikosongkan.
 */
export default function FormHargaManual({
  produk,
  toko,
}: {
  produk: Pilihan[];
  toko: Pilihan[];
}) {
  const router = useRouter();
  const hariIni = new Date().toISOString().slice(0, 10);

  const [pilihProduk, setPilihProduk] = useState("");
  const [pilihToko, setPilihToko] = useState("");
  const [harga, setHarga] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [tersedia, setTersedia] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  const produkTerpilih = produk.find((p) => p.slug === pilihProduk);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setPesan(null);

    const r = await kirimJson("/api/admin/prices", {
      produk: pilihProduk,
      toko: pilihToko,
      harga: Number(harga),
      tanggal,
      tersedia,
    });

    setSibuk(false);
    setPesan({ ok: r.ok, teks: r.pesan });
    if (r.ok) {
      setPilihToko("");
      setHarga("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={simpan} className="card space-y-3 p-4 md:p-5">
      <div>
        <h3 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
          💰 Harga manual
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">
          Yang Anda isi di sini tercatat sebagai harga <b>nyata</b> — isi hanya
          angka yang benar-benar Anda lihat di toko atau struk.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={KELAS_LABEL} htmlFor="hm-produk">
            Produk
          </label>
          <select
            id="hm-produk"
            value={pilihProduk}
            onChange={(e) => setPilihProduk(e.target.value)}
            className={KELAS_ISIAN}
            required
          >
            <option value="">— pilih produk —</option>
            {produk.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
                {p.unit ? ` · ${p.unit}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="hm-toko">
            Toko
          </label>
          <select
            id="hm-toko"
            value={pilihToko}
            onChange={(e) => setPilihToko(e.target.value)}
            className={KELAS_ISIAN}
            required
          >
            <option value="">— pilih toko —</option>
            {toko.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="hm-harga">
            Harga (Rp{produkTerpilih?.unit ? ` per ${produkTerpilih.unit}` : ""})
          </label>
          <input
            id="hm-harga"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            className={KELAS_ISIAN}
            placeholder="3300"
            required
          />
        </div>

        <div>
          <label className={KELAS_LABEL} htmlFor="hm-tanggal">
            Tanggal dicek
          </label>
          <input
            id="hm-tanggal"
            type="date"
            max={hariIni}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={KELAS_ISIAN}
            required
          />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
            <input
              type="checkbox"
              checked={tersedia}
              onChange={(e) => setTersedia(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            Barangnya ada di rak
          </label>
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
        {sibuk ? "Menyimpan…" : "Simpan harga nyata"}
      </button>
    </form>
  );
}
