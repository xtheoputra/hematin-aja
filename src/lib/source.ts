import type { SourceKind } from "@/lib/types";

/**
 * Metadata asal-usul sebuah harga. Inti dari prinsip "kejujuran data":
 *  - real     → harga terverifikasi (Open Prices / hasil cek toko).
 *  - estimate → perkiraan (digrounding riset, BUKAN harga live).
 *  - none     → tidak ada data harga di mode tampilan aktif.
 *
 * Sumber dianggap NYATA bila bukan hasil seed/impor simulasi.
 */
export type SourceMeta = {
  kind: SourceKind;
  /** label pendek untuk badge */
  badge: string;
  /** keterangan panjang untuk tooltip */
  label: string;
  /** kanal spesifik untuk harga nyata */
  channel?: "open-prices" | "scrape";
};

export function sourceKindOf(source: string | null | undefined): SourceKind {
  if (!source) return "none";
  if (source === "open-prices" || source === "scrape") return "real";
  return "estimate"; // seed | import-off | lainnya
}

export const isRealSource = (source: string | null | undefined): boolean =>
  sourceKindOf(source) === "real";

export function sourceMeta(source: string | null | undefined): SourceMeta {
  switch (source) {
    case "open-prices":
      return {
        kind: "real",
        channel: "open-prices",
        badge: "Nyata",
        label: "Harga nyata terverifikasi — sumber Open Prices",
      };
    case "scrape":
      return {
        kind: "real",
        channel: "scrape",
        badge: "Nyata · Toko",
        label: "Harga nyata hasil cek langsung situs toko",
      };
    case null:
    case undefined:
      return {
        kind: "none",
        badge: "Tidak tersedia",
        label: "Belum ada data harga untuk toko ini",
      };
    default:
      return {
        kind: "estimate",
        badge: "Perkiraan",
        label:
          "Harga perkiraan — estimasi digrounding riset ritel, BUKAN harga live. Cek harga resmi di toko sebelum belanja.",
      };
  }
}
