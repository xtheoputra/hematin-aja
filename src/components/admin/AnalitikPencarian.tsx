import type { AnalitikPencarian } from "@/lib/queries/analitik";

/**
 * Tampilan analitik pencarian di `/admin`.
 *
 * Grafik hariannya sengaja digambar dengan div biasa, bukan Recharts: ini
 * halaman server, dan menarik pustaka grafik 100 kB demi 14 batang adalah
 * ongkos yang tidak dibayar apa pun.
 */
export default function AnalitikPencarianPanel({ a }: { a: AnalitikPencarian }) {
  const maks = Math.max(1, ...a.harian.map((h) => h.jumlah));

  return (
    <section className="card p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
          📊 Analitik pencarian
        </h2>
        <p className="text-xs text-ink-400">{a.harian.length} hari terakhir</p>
      </div>

      {a.kosong ? (
        <p className="mt-3 rounded-2xl bg-ink-50 py-6 text-center text-sm text-ink-400 dark:bg-ink-800/60">
          Belum ada pencarian tercatat dalam rentang ini.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Angka label="Pencarian" nilai={String(a.totalPencarian)} />
            <Angka label="Nihil hasil" nilai={String(a.totalGagal)} />
            <Angka
              label="Rasio nihil"
              nilai={`${a.persenGagal.toFixed(0)}%`}
              waspada={a.persenGagal >= 20}
            />
          </div>

          {/* Deret harian */}
          <div className="mt-4">
            <p className="text-xs font-bold text-ink-700 dark:text-ink-200">
              Pencarian per hari
            </p>
            <div className="mt-2 flex h-20 items-end gap-1">
              {a.harian.map((h) => {
                const tinggi = Math.round((h.jumlah / maks) * 100);
                const tinggiGagal = h.jumlah > 0 ? Math.round((h.gagal / h.jumlah) * tinggi) : 0;
                return (
                  <div
                    key={h.tanggal}
                    className="flex flex-1 flex-col justify-end"
                    title={`${h.tanggal}: ${h.jumlah} pencarian, ${h.gagal} nihil`}
                  >
                    <div
                      className="w-full rounded-t bg-rose-400"
                      style={{ height: `${tinggiGagal}%` }}
                    />
                    <div
                      className="w-full rounded-t bg-brand-400 dark:bg-brand-600"
                      style={{ height: `${Math.max(tinggi - tinggiGagal, h.jumlah > 0 ? 4 : 0)}%` }}
                    />
                    <div className="mt-1 h-px w-full bg-ink-200 dark:bg-ink-700" />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-ink-400">
              <span>{a.harian[0]?.tanggal}</span>
              <span className="flex items-center gap-2">
                <Legenda warna="bg-brand-400 dark:bg-brand-600" teks="ketemu" />
                <Legenda warna="bg-rose-400" teks="nihil" />
              </span>
              <span>{a.harian[a.harian.length - 1]?.tanggal}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Kueri terpopuler */}
            <div>
              <p className="text-xs font-bold text-ink-700 dark:text-ink-200">
                Paling sering dicari
              </p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                Urutan pengisian harga nyata sebaiknya mengikuti daftar ini, bukan
                sekadar produk yang paling kosong.
              </p>
              <ul className="mt-2 space-y-1">
                {a.kueriTeratas.map((k) => (
                  <li
                    key={k.query}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <span className="min-w-0 truncate text-ink-700 dark:text-ink-200">
                      “{k.query}”
                      {k.hasilTerakhir === 0 && (
                        <span className="ml-1.5 text-[10px] font-bold text-rose-500">
                          NIHIL
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-400">
                      ×{k.jumlah}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Jalur pencocokan */}
            <div>
              <p className="text-xs font-bold text-ink-700 dark:text-ink-200">
                Jalur yang menemukan
              </p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                Kalau <b>typo</b> dan <b>alias</b> mendominasi, pencocokan pokoknya
                lemah dan perlu diperbaiki — bukan ditambal alias terus-menerus.
              </p>
              <ul className="mt-2 space-y-1.5">
                {a.jalur.map((j) => (
                  <li key={j.jalur}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-ink-700 dark:text-ink-200">{j.jalur}</span>
                      <span className="tabular-nums text-ink-400">
                        {j.jumlah} · {j.persen.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${j.persen}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Klik menyeberang ke situs toko */}
          <div className="mt-4">
            <p className="text-xs font-bold text-ink-700 dark:text-ink-200">
              Klik ke situs toko
            </p>
            {a.klikToko.length === 0 ? (
              <p className="mt-1 text-[11px] text-ink-400">
                Belum ada yang menyeberang ke situs toko dari sini.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {a.klikToko.map((k) => (
                  <li
                    key={k.toko}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  >
                    {k.toko} <span className="tabular-nums opacity-70">×{k.jumlah}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Angka({
  label,
  nilai,
  waspada = false,
}: {
  label: string;
  nilai: string;
  waspada?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-ink-50 p-3 dark:bg-ink-800/60">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p
        className={`font-display text-xl font-extrabold tabular-nums ${
          waspada ? "text-rose-600 dark:text-rose-400" : "text-ink-800 dark:text-ink-100"
        }`}
      >
        {nilai}
      </p>
    </div>
  );
}

function Legenda({ warna, teks }: { warna: string; teks: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${warna}`} />
      {teks}
    </span>
  );
}
