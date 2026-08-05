import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import type { HasilVarian } from "@/lib/varian";

/**
 * Perbandingan varian ukuran di halaman produk.
 *
 * Yang ditonjolkan adalah **Rp per satuan**, bukan harga label — karena itulah
 * satu-satunya angka yang membuat kemasan berbeda bisa diadu. Harga labelnya
 * tetap ada, tapi sengaja kecil dan sekunder: dialah yang selama ini
 * menyesatkan orang.
 */
export default function BandingVarian({ v }: { v: HasilVarian | null }) {
  if (!v) return null;

  const hemat = v.hematPersen >= 1;

  return (
    <section className="card p-4">
      <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
        📦 Kemasan mana yang paling hemat?
      </h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
        Dibandingkan per {v.satuanTampil} isi, bukan per harga label — selisih
        antar-kemasan biasanya jauh lebih besar daripada selisih antar-toko.
      </p>

      {hemat ? (
        <p className="mt-2.5 rounded-xl bg-gold-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-gold-800 dark:bg-gold-500/10 dark:text-gold-300">
          💰 <b>{v.targetHemat}</b> {v.hematPersen.toFixed(0)}% lebih murah per{" "}
          {v.satuanTampil} daripada yang sedang Anda lihat.
        </p>
      ) : (
        <p className="mt-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          ✓ Ini sudah kemasan paling hemat per {v.satuanTampil} di antara ukuran
          yang sekelas.
        </p>
      )}

      <ul className="mt-3 space-y-1.5">
        {v.baris.map((b) => (
          <li key={b.slug}>
            <Baris b={b} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Baris({ b }: { b: HasilVarian["baris"][number] }) {
  const isi = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-lg dark:bg-ink-800">
        {b.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink-800 dark:text-ink-100">
            {b.nama}
          </span>
          {b.paling && (
            <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
              PALING HEMAT
            </span>
          )}
          {b.iniYangDibuka && (
            <span className="shrink-0 rounded-full bg-ink-200 px-1.5 py-0.5 text-[9px] font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-300">
              SEDANG DILIHAT
            </span>
          )}
          {b.ukuranBedaKelas && (
            <span
              className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold text-ink-500 dark:bg-ink-800 dark:text-ink-400"
              title="Ukurannya jauh berbeda — tetap ditampilkan sebagai pembanding, tapi tidak dihitung sebagai pilihan pengganti"
            >
              BEDA KELAS
            </span>
          )}
        </span>
        <span className="block text-[11px] text-ink-400">
          {b.satuan || "ukuran tak diketahui"} · {formatRupiah(b.harga)} di {b.toko}
          {!b.nyata && <span className="text-ink-400"> · perkiraan</span>}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={`block font-display text-sm font-extrabold tabular-nums ${
            b.paling
              ? "text-brand-700 dark:text-brand-400"
              : "text-ink-700 dark:text-ink-200"
          }`}
        >
          {formatRupiah(b.perSatuan)}
          <span className="text-[10px] font-semibold text-ink-400">
            /{b.satuanTampil}
          </span>
        </span>
        {!b.paling && (
          <span className="block text-[10px] tabular-nums text-rose-500">
            +{b.lebihMahalPersen.toFixed(0)}%
          </span>
        )}
      </span>
    </>
  );

  const kelas = `flex items-center gap-3 rounded-2xl border p-2.5 transition ${
    b.paling
      ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
      : "border-ink-200/60 dark:border-ink-800"
  }`;

  // Produk yang sedang dibuka tidak ditautkan ke dirinya sendiri.
  return b.iniYangDibuka ? (
    <div className={kelas}>{isi}</div>
  ) : (
    <Link href={`/produk/${b.slug}`} className={`${kelas} active:scale-[0.99]`}>
      {isi}
    </Link>
  );
}
