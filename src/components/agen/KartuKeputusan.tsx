import { formatRupiah } from "@/lib/format";
import type { Keputusan, Keyakinan } from "@/lib/agen";

/**
 * Kartu keputusan agen.
 *
 * Aturan tampilannya: **alasan selalu ikut, keyakinan selalu ikut.** Angka
 * hemat yang berdiri sendiri terbaca sebagai janji; angka hemat yang datang
 * bersama "kenapa" dan "seberapa yakin" terbaca sebagai pertimbangan — dan
 * pertimbangan itulah yang sebenarnya dibeli pengguna di sini.
 */

const NADA_KEYAKINAN = {
  tinggi: {
    teks: "text-emerald-700 dark:text-emerald-400",
    latar: "bg-emerald-500",
    label: "Keyakinan tinggi",
  },
  sedang: {
    teks: "text-gold-700 dark:text-gold-400",
    latar: "bg-gold-500",
    label: "Keyakinan sedang",
  },
  rendah: {
    teks: "text-rose-600 dark:text-rose-400",
    latar: "bg-rose-500",
    label: "Keyakinan rendah",
  },
} as const;

export default function KartuKeputusan({
  keputusan,
  keyakinan,
}: {
  keputusan: Keputusan;
  keyakinan: Keyakinan;
}) {
  const nada = NADA_KEYAKINAN[keyakinan.tingkat];
  const persen = Math.round(keyakinan.nilai * 100);

  return (
    <section className="card overflow-hidden">
      <div className="bg-brand-gradient px-4 py-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-50/90">
          {keputusan.jenis === "pecah-dua-toko"
            ? "🧭 Rencana belanja · dua toko"
            : keputusan.jenis === "satu-toko"
            ? "🧭 Rencana belanja"
            : "🧭 Belum ada rencana"}
        </p>
        <h2 className="mt-1 font-display text-xl font-extrabold leading-tight md:text-2xl">
          {keputusan.judul}
        </h2>
        {keputusan.hemat > 0 && (
          <p className="mt-2 inline-block rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-bold text-ink-900">
            hemat {formatRupiah(keputusan.hemat)}
          </p>
        )}
      </div>

      <div className="space-y-4 px-4 py-4">
        <ol className="space-y-2">
          {keputusan.alasan.map((a, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[13px] leading-relaxed text-ink-600 dark:text-ink-300"
            >
              <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                {i + 1}
              </span>
              {a}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl bg-ink-50 p-3 dark:bg-ink-800/60">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-bold ${nada.teks}`}>{nada.label}</p>
            <p className="text-xs font-bold tabular-nums text-ink-500 dark:text-ink-400">
              {persen}%
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
            <div
              className={`h-full rounded-full transition-all ${nada.latar}`}
              style={{ width: `${Math.max(persen, 2)}%` }}
            />
          </div>
          <ul className="mt-2 space-y-1">
            {keyakinan.alasan.map((a, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
