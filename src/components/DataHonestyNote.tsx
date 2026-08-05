import Link from "next/link";
import type { DisplayMode } from "@/lib/mode";
import { formatAge, formatDateShort } from "@/lib/format";
import { freshnessOf, freshnessMeta } from "@/lib/freshness";

/**
 * Catatan transparansi data, dipakai konsisten di beberapa halaman.
 *
 * Menjelaskan dua hal yang sama pentingnya:
 *   1. ASAL harga  — "Nyata" (terverifikasi) vs "Perkiraan" (estimasi)
 *   2. UMUR harga  — kapan terakhir dicek
 *
 * Poin kedua sengaja ditonjolkan: harga "Nyata" yang sudah sebulan tidak
 * dicek bisa lebih menyesatkan daripada perkiraan, karena labelnya terbaca
 * sebagai layak dipercaya.
 */
export default function DataHonestyNote({
  realPriceCount,
  mode,
  latestRecordedAt,
  className = "",
}: {
  realPriceCount: number;
  mode: DisplayMode;
  /** catatan harga terbaru di DB — untuk melabeli umur data */
  latestRecordedAt?: string | null;
  className?: string;
}) {
  const fresh = freshnessOf(latestRecordedAt);
  const stale = fresh === "stale";

  return (
    <div className={`space-y-2 ${className}`}>
      {mode === "real" ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="shrink-0">✓</span>
          <span>
            Mode <b>Hanya Harga Nyata</b> aktif. Hanya menampilkan{" "}
            <b>{realPriceCount} harga terverifikasi</b>; harga lain ditandai{" "}
            <b>Tidak tersedia</b>. Tekan <b>Refresh</b> untuk menarik data nyata
            terbaru, atau pilih <b>Semua</b> untuk melihat perkiraan.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs leading-relaxed text-gold-800 dark:border-gold-500/30 dark:bg-gold-500/10 dark:text-gold-300">
          <span className="shrink-0">ℹ️</span>
          <span>
            Harga ditandai jujur: <b>✓ Nyata</b> = terverifikasi (
            {realPriceCount} harga, sumber Open Prices), <b>Perkiraan</b> =
            estimasi digrounding riset (bukan harga live). Pilih{" "}
            <b>Hanya Nyata</b> untuk menyembunyikan perkiraan, atau tekan{" "}
            <b>Refresh</b> untuk menarik data nyata terbaru. Tetap cek harga
            resmi di toko sebelum belanja.{" "}
            <Link href="/data" className="font-bold underline underline-offset-2">
              Lihat kondisi data selengkapnya →
            </Link>
          </span>
        </div>
      )}

      {/* Umur data — ditampilkan terpisah agar tidak tenggelam */}
      {latestRecordedAt && fresh && (
        <div
          title={freshnessMeta(fresh).label}
          className={`flex items-start gap-2 rounded-2xl border px-4 py-2.5 text-xs leading-relaxed ${
            stale
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-ink-200/70 bg-ink-50 text-ink-500 dark:border-ink-800 dark:bg-ink-800/50 dark:text-ink-400"
          }`}
        >
          <span className="shrink-0">{stale ? "⚠️" : "🕒"}</span>
          <span>
            Data harga terakhir diperbarui{" "}
            <b>{formatAge(latestRecordedAt)}</b> ({formatDateShort(latestRecordedAt)}
            ).{" "}
            {stale ? (
              <>
                Sudah lebih dari sebulan — <b>harga kemungkinan sudah berubah</b>.
                Tekan <b>Refresh</b> untuk menarik data terbaru.
              </>
            ) : (
              <>Setiap harga juga menampilkan umurnya masing-masing.</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
