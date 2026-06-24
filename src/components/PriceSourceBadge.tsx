import { formatDateShort } from "@/lib/format";

/**
 * Penanda asal harga: "NYATA" (dari Open Prices) atau "ilustrasi" (simulasi).
 * Membuat jelas data mana yang bisa dipercaya.
 */
export default function PriceSourceBadge({
  isReal,
  date,
  className = "",
}: {
  isReal: boolean;
  date?: string;
  className?: string;
}) {
  if (isReal) {
    return (
      <span
        title={date ? `Harga nyata · ${formatDateShort(date)} · Open Prices` : "Harga nyata"}
        className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ${className}`}
      >
        ✓ Nyata
      </span>
    );
  }
  return (
    <span
      title="Harga ilustrasi (simulasi), bukan harga live"
      className={`inline-flex items-center rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-400 dark:bg-ink-800 dark:text-ink-500 ${className}`}
    >
      ilustrasi
    </span>
  );
}
