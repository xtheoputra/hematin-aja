import { formatAge, formatDateShort } from "@/lib/format";
import { freshnessOf, freshnessMeta } from "@/lib/freshness";

/**
 * Label umur data — pendamping <PriceSourceBadge/>.
 *
 * Asal harga saja belum cukup jujur: harga "✓ Nyata" berumur sebulan tetap
 * menyesatkan. Komponen ini membuat umurnya terlihat, tidak cuma di tooltip
 * (yang tak bisa disentuh di HP).
 */
export default function DataAgeBadge({
  date,
  className = "",
  showIcon = true,
}: {
  date: string | Date | null | undefined;
  className?: string;
  /** tampilkan ⚠ saat data kedaluwarsa */
  showIcon?: boolean;
}) {
  const fresh = freshnessOf(date);
  if (!date || !fresh) return null;

  const meta = freshnessMeta(fresh);

  return (
    <span
      title={`${meta.label} · dicek ${formatDateShort(date)}`}
      className={`inline-flex items-center gap-0.5 whitespace-nowrap text-[10px] font-medium ${meta.tone} ${className}`}
    >
      {showIcon && meta.warn && <span aria-hidden>⚠</span>}
      {formatAge(date)}
    </span>
  );
}
