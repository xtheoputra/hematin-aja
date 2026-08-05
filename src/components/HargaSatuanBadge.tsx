import { formatRupiah } from "@/lib/format";
import { hargaPerSatuan } from "@/lib/satuan";

/**
 * Label harga per satuan: "Rp 12.400/kg".
 *
 * Ini angka pembanding yang sebenarnya. Tanpa dia, "Rp 62.000" dan
 * "Rp 13.500" berdampingan menuntun orang ke kesimpulan yang salah, karena
 * yang pertama 5 kg dan yang kedua 1 kg.
 *
 * Diam total bila satuannya tak terbaca — 4 dari 100 produk di katalog memang
 * satuannya rusak ("220", "RH. 30"), dan menampilkan angka karangan untuk
 * mereka jauh lebih buruk daripada tidak menampilkan apa-apa.
 */
export default function HargaSatuanBadge({
  harga,
  satuan,
  className = "",
  /** "tenang" untuk teks kecil menyatu, "tegas" untuk pil berlatar. */
  gaya = "tenang",
}: {
  harga: number | null | undefined;
  satuan: string | null | undefined;
  className?: string;
  gaya?: "tenang" | "tegas";
}) {
  const hs = hargaPerSatuan(harga, satuan);
  if (!hs) return null;

  const teks = `${formatRupiah(hs.nilai)}/${hs.satuan}`;
  const judul = `Harga per satuan isi — dasar perbandingan antar-ukuran kemasan`;

  if (gaya === "tegas") {
    return (
      <span
        title={judul}
        className={`inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 ${className}`}
      >
        {teks}
      </span>
    );
  }

  return (
    <span
      title={judul}
      className={`text-[11px] font-medium tabular-nums text-ink-500 dark:text-ink-400 ${className}`}
    >
      {teks}
    </span>
  );
}
