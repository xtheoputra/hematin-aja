import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import type { BarisRencana } from "@/lib/agen";

/**
 * Daftar belanja yang sudah jadi — tiap barang beserta di mana diambil,
 * berapa, dan berapa harga per satuannya.
 *
 * Harga per satuan ikut di sini karena inilah satu-satunya angka yang membuat
 * dua ukuran berbeda bisa dinilai: tanpa "Rp 12.400/kg" di sebelahnya, orang
 * membandingkan Rp 62.000 dengan Rp 13.500 dan menyimpulkan yang salah.
 */

const NADA_STATUS = {
  ada: { label: "", kelas: "" },
  diasumsikan: {
    label: "beli di tempat lain",
    kelas: "text-gold-600 dark:text-gold-400",
  },
  nihil: { label: "tidak ada harganya", kelas: "text-rose-500 dark:text-rose-400" },
} as const;

export default function DaftarBelanja({
  baris,
  judul = "Daftar belanja",
  /** Kelompokkan per toko — dipakai saat rencananya pecah dua toko. */
  kelompokkanPerToko = false,
}: {
  baris: BarisRencana[];
  judul?: string;
  kelompokkanPerToko?: boolean;
}) {
  if (baris.length === 0) return null;

  const total = baris.reduce((s, l) => s + l.subtotal, 0);
  const kelompok = kelompokkanPerToko ? perToko(baris) : [{ toko: null, baris }];

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
          {judul}
        </h2>
        <p className="font-display text-sm font-extrabold tabular-nums text-brand-700 dark:text-brand-400">
          {formatRupiah(total)}
        </p>
      </div>

      <div className="mt-3 space-y-4">
        {kelompok.map((k, i) => (
          <div key={k.toko ?? `lain-${i}`}>
            {k.toko && (
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                🛒 {k.toko}
                <span className="font-medium normal-case tracking-normal text-ink-400">
                  · {k.baris.length} barang ·{" "}
                  {formatRupiah(k.baris.reduce((s, l) => s + l.subtotal, 0))}
                </span>
              </p>
            )}
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {k.baris.map((l) => (
                <li key={l.productId} className="flex items-center gap-3 py-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-xl dark:bg-ink-800">
                    {l.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800 dark:text-ink-100">
                      <Link href={`/produk/${l.slug}`} className="hover:underline">
                        {l.nama}
                      </Link>
                      {l.qty > 1 && (
                        <span className="ml-1 text-ink-400">×{l.qty}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      {l.satuan}
                      {l.perSatuan !== null && (
                        <span className="text-ink-500 dark:text-ink-300">
                          {" · "}
                          {formatRupiah(l.perSatuan)}/{l.satuanTampil}
                        </span>
                      )}
                      {l.status !== "ada" && (
                        <span className={NADA_STATUS[l.status].kelas}>
                          {" · "}
                          {NADA_STATUS[l.status].label}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-[13px] font-bold tabular-nums text-ink-700 dark:text-ink-200">
                    {l.harga === null ? "—" : formatRupiah(l.subtotal)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Kelompokkan baris per toko; yang tidak diambil di toko mana pun ditaruh terakhir. */
function perToko(baris: BarisRencana[]): { toko: string | null; baris: BarisRencana[] }[] {
  const map = new Map<string, BarisRencana[]>();
  const lain: BarisRencana[] = [];
  for (const l of baris) {
    if (!l.tokoNama) {
      lain.push(l);
      continue;
    }
    const arr = map.get(l.tokoNama) ?? [];
    arr.push(l);
    map.set(l.tokoNama, arr);
  }
  const out: { toko: string | null; baris: BarisRencana[] }[] = [...map.entries()]
    .sort((a, b) => nilai(b[1]) - nilai(a[1]))
    .map(([toko, baris]) => ({ toko, baris }));
  if (lain.length > 0) out.push({ toko: null, baris: lain });
  return out;
}

const nilai = (b: BarisRencana[]) => b.reduce((s, l) => s + l.subtotal, 0);
