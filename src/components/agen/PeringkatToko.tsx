import Link from "next/link";
import StoreAvatar from "@/components/StoreAvatar";
import { formatRupiah } from "@/lib/format";
import type { OpsiToko } from "@/lib/agen";

/**
 * Peringkat toko untuk satu keranjang.
 *
 * Yang ditampilkan adalah **totalSetara** — total yang sudah memperhitungkan
 * barang yang tidak dijual toko itu, plus ongkos perjalanan kedua. Angka
 * "total barang yang ada di sini" tetap diperlihatkan sebagai rincian, karena
 * itu yang benar-benar dibayar di kasir; tapi bukan itu yang boleh dipakai
 * membandingkan toko, dan bedanya harus terlihat, bukan dijelaskan belakangan.
 */
export default function PeringkatToko({
  toko,
  batasAwal = 6,
}: {
  toko: OpsiToko[];
  batasAwal?: number;
}) {
  if (toko.length === 0) return null;

  const maks = toko.reduce((m, t) => Math.max(m, t.totalSetara), 0) || 1;
  const terbaik = toko[0];

  return (
    <section className="card p-4">
      <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
        Kalau belanja di satu toko
      </h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
        Barang yang tidak dijual sebuah toko tetap ikut dihitung dengan harga pasar
        termurah, plus satu ongkos perjalanan — kalau tidak, toko yang paling sedikit
        barangnya akan selalu terlihat paling murah.
      </p>

      <ul className="mt-3 space-y-3">
        {toko.slice(0, batasAwal).map((t) => {
          const juara = t.supermarketId === terbaik.supermarketId;
          const lebar = Math.round((t.totalSetara / maks) * 100);
          return (
            <li key={t.supermarketId}>
              <div className="mb-1 flex items-center gap-2.5">
                <StoreAvatar name={t.nama} color={t.warna} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                    <Link href={`/supermarket/${t.slug}`} className="hover:underline">
                      {t.nama}
                    </Link>
                    {juara && (
                      <span className="ml-1.5 text-[10px] font-bold text-brand-600">
                        PILIHAN
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {t.jumlahAda} barang di sini
                    {t.jumlahDiasumsikan > 0 && (
                      <span className="text-gold-600 dark:text-gold-400">
                        {" "}
                        · {t.jumlahDiasumsikan} harus dibeli di tempat lain
                      </span>
                    )}
                    {t.jumlahNyata > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {" "}
                        · {t.jumlahNyata} harga nyata
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-sm font-extrabold tabular-nums ${
                      juara
                        ? "text-brand-700 dark:text-brand-400"
                        : "text-ink-700 dark:text-ink-200"
                    }`}
                  >
                    {formatRupiah(t.totalSetara)}
                  </p>
                  {t.biayaPerjalananTambahan > 0 && (
                    <p className="text-[10px] tabular-nums text-ink-400">
                      {formatRupiah(t.totalBarang)} + ongkos{" "}
                      {formatRupiah(t.biayaPerjalananTambahan)}
                    </p>
                  )}
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    juara ? "bg-brand-500" : "bg-ink-300 dark:bg-ink-600"
                  }`}
                  style={{ width: `${lebar}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {toko.length > batasAwal && (
        <p className="mt-3 text-[11px] text-ink-400">
          {toko.length - batasAwal} toko lain punya total lebih mahal.
        </p>
      )}
    </section>
  );
}
