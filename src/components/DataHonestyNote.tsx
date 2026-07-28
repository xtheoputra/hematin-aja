import type { DisplayMode } from "@/lib/mode";

/**
 * Catatan transparansi data, dipakai konsisten di beberapa halaman.
 * Menjelaskan beda harga "Nyata" vs "Perkiraan" dan cara melihat hanya yang nyata.
 */
export default function DataHonestyNote({
  realPriceCount,
  mode,
  className = "",
}: {
  realPriceCount: number;
  mode: DisplayMode;
  className?: string;
}) {
  if (mode === "real") {
    return (
      <div
        className={`flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 ${className}`}
      >
        <span className="shrink-0">✓</span>
        <span>
          Mode <b>Hanya Harga Nyata</b> aktif. Hanya menampilkan{" "}
          <b>{realPriceCount} harga terverifikasi</b>; harga lain ditandai{" "}
          <b>Tidak tersedia</b>. Tekan <b>Refresh</b> untuk menarik data nyata
          terbaru, atau pilih <b>Semua</b> untuk melihat perkiraan.
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs leading-relaxed text-gold-800 dark:border-gold-500/30 dark:bg-gold-500/10 dark:text-gold-300 ${className}`}
    >
      <span className="shrink-0">ℹ️</span>
      <span>
        Harga ditandai jujur: <b>✓ Nyata</b> = terverifikasi (
        {realPriceCount} harga, sumber Open Prices), <b>Perkiraan</b> = estimasi
        digrounding riset (bukan harga live). Pilih <b>Hanya Nyata</b> untuk
        menyembunyikan perkiraan, atau tekan <b>Refresh</b> untuk menarik data
        nyata terbaru. Tetap cek harga resmi di toko sebelum belanja.
      </span>
    </div>
  );
}
