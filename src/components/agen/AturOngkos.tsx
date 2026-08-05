"use client";

import { formatRupiah } from "@/lib/format";

/**
 * Pengatur ongkos perjalanan.
 *
 * Ini bukan hiasan: angka inilah yang menentukan apakah agen menyarankan
 * mampir ke toko kedua. Orang yang jalan kaki ke minimarket sebelah dan orang
 * yang harus naik motor 20 menit tidak seharusnya mendapat saran yang sama,
 * dan hanya mereka yang tahu angkanya. Menyembunyikannya sebagai konstanta
 * berarti diam-diam memutuskan untuk mereka.
 */
export const PILIHAN_ONGKOS = [0, 5_000, 10_000, 20_000, 35_000];

export default function AturOngkos({
  nilai,
  onGanti,
}: {
  nilai: number;
  onGanti: (n: number) => void;
}) {
  return (
    <section className="card p-4">
      <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
        Ongkos ke toko kedua
      </h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
        Bensin, ongkir, atau waktu yang terpakai untuk mampir ke satu toko lagi.
        Makin besar angkanya, makin jarang saya menyarankan belanja dipecah.
      </p>
      <div
        role="radiogroup"
        aria-label="Ongkos ke toko kedua"
        className="mt-3 flex flex-wrap gap-2"
      >
        {PILIHAN_ONGKOS.map((n) => {
          const aktif = n === nilai;
          return (
            <button
              key={n}
              role="radio"
              aria-checked={aktif}
              onClick={() => onGanti(n)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                aktif
                  ? "bg-brand-600 text-white shadow-glow"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
              }`}
            >
              {n === 0 ? "Gratis" : formatRupiah(n)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
