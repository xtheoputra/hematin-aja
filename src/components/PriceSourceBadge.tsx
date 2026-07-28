import { sourceMeta } from "@/lib/source";
import { formatDateShort } from "@/lib/format";

/**
 * Penanda asal harga — inti prinsip kejujuran data:
 *   ✓ Nyata        → harga terverifikasi (Open Prices)
 *   ✓ Nyata · Toko → harga nyata hasil cek situs toko
 *   Perkiraan      → estimasi (simulasi), bukan harga live
 *   Tidak tersedia → belum ada data harga
 *
 * Beri `source` (string DB) — komponen menentukan tampilannya.
 */
export default function PriceSourceBadge({
  source,
  date,
  className = "",
  showEstimate = true,
}: {
  source: string | null | undefined;
  date?: string | null;
  className?: string;
  /** sembunyikan badge "Perkiraan" (mis. agar UI tak ramai) */
  showEstimate?: boolean;
}) {
  const meta = sourceMeta(source);
  const title = date ? `${meta.label} · ${formatDateShort(date)}` : meta.label;
  const base =
    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap";

  if (meta.kind === "real") {
    return (
      <span
        title={title}
        className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ${className}`}
      >
        ✓ {meta.badge}
      </span>
    );
  }

  if (meta.kind === "none") {
    return (
      <span
        title={title}
        className={`${base} bg-gold-100 font-semibold text-gold-700 dark:bg-gold-500/15 dark:text-gold-300 ${className}`}
      >
        {meta.badge}
      </span>
    );
  }

  // estimate
  if (!showEstimate) return null;
  return (
    <span
      title={title}
      className={`${base} bg-ink-100 font-semibold text-ink-400 dark:bg-ink-800 dark:text-ink-500 ${className}`}
    >
      {meta.badge}
    </span>
  );
}
