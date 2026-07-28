export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(date);
}

const MS_PER_DAY = 86_400_000;

/** Umur data dalam hari penuh. Negatif (tanggal masa depan) dianggap 0. */
export function daysSince(d: Date | string, now: Date = new Date()): number {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY));
}

/**
 * Umur data dalam bahasa manusia: "hari ini", "kemarin", "34 hari lalu".
 * Dipakai agar pengguna tahu harga ini dicek kapan — bukan cuma dari mana.
 */
export function formatAge(d: Date | string, now: Date = new Date()): string {
  const days = daysSince(d, now);
  if (days === 0) return "hari ini";
  if (days === 1) return "kemarin";
  if (days < 31) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return "lebih dari setahun";
}

export function formatPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// Angka rupiah ringkas tanpa simbol "Rp" (untuk sel tabel yang sempit).
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}
