import { daysSince } from "./format";

/**
 * Kesegaran data harga — pelengkap `source.ts`.
 *
 * `source.ts` menjawab "harga ini dari mana?" (nyata / perkiraan).
 * Berkas ini menjawab "harga ini kapan dicek?".
 *
 * Keduanya dibutuhkan bersama: harga berlabel "✓ Nyata" yang berumur sebulan
 * justru bisa lebih menyesatkan daripada perkiraan, karena label "Nyata"
 * terbaca sebagai layak dipercaya. Tanggal harus terlihat, bukan disembunyikan
 * di tooltip.
 */
export type Freshness = "fresh" | "aging" | "stale";

/** Batas hari untuk tiap tingkat kesegaran. */
export const FRESH_MAX_DAYS = 7;
export const AGING_MAX_DAYS = 30;

export function freshnessOf(
  date: Date | string | null | undefined,
  now: Date = new Date()
): Freshness | null {
  if (!date) return null;
  const days = daysSince(date, now);
  if (days <= FRESH_MAX_DAYS) return "fresh";
  if (days <= AGING_MAX_DAYS) return "aging";
  return "stale";
}

type FreshnessMeta = {
  /** kelas warna teks untuk label umur */
  tone: string;
  /** keterangan panjang untuk tooltip */
  label: string;
  /** perlu ditonjolkan? (data sudah terlalu tua untuk dipercaya) */
  warn: boolean;
};

export function freshnessMeta(f: Freshness): FreshnessMeta {
  switch (f) {
    case "fresh":
      return {
        tone: "text-emerald-600 dark:text-emerald-400",
        label: `Data segar — dicek dalam ${FRESH_MAX_DAYS} hari terakhir`,
        warn: false,
      };
    case "aging":
      return {
        tone: "text-gold-600 dark:text-gold-400",
        label: `Data mulai lawas — lebih dari ${FRESH_MAX_DAYS} hari sejak dicek`,
        warn: false,
      };
    case "stale":
      return {
        tone: "text-rose-500 dark:text-rose-400",
        label: `Data kedaluwarsa — lebih dari ${AGING_MAX_DAYS} hari sejak dicek. Harga kemungkinan sudah berubah`,
        warn: true,
      };
  }
}
