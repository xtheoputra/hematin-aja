import Link from "next/link";
import { kondisiData } from "@/lib/queries/kondisi";
import { formatAge, formatNumber } from "@/lib/format";
import { AGING_MAX_DAYS, FRESH_MAX_DAYS } from "@/lib/freshness";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kondisi Data · Hematin Aja",
  description:
    "Berapa banyak harga di aplikasi ini yang benar-benar dicek, dan berapa yang masih perkiraan.",
};

/**
 * Halaman **publik** kondisi data.
 *
 * Sengaja publik, bukan disembunyikan di `/admin`: angka cakupan yang cuma
 * dilihat pemiliknya adalah angka yang lambat laun dibiarkan buruk. Dan
 * pengguna yang memutuskan belanja berdasarkan aplikasi ini berhak tahu
 * seberapa tipis dasarnya — terutama saat dasarnya memang masih tipis.
 */
export default async function DataPage() {
  const d = await kondisiData();
  const persenNyata =
    d.totalBarisHarga > 0 ? (d.hargaNyata / d.totalBarisHarga) * 100 : 0;
  const persenProduk =
    d.totalProduk > 0 ? (d.produkBerhargaNyata / d.totalProduk) * 100 : 0;

  return (
    <main>
      <PageHeader
        title="Kondisi Data"
        emoji="🔍"
        subtitle="Seberapa jauh angka di aplikasi ini boleh dipercaya"
      />

      <div className="container-app space-y-4 pb-10 pt-5">
        {/* Pernyataan pokok — tidak dihaluskan */}
        <section className="card overflow-hidden">
          <div className="bg-brand-gradient px-4 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-50/90">
              Yang perlu Anda tahu lebih dulu
            </p>
            <p className="mt-1.5 font-display text-lg font-extrabold leading-snug md:text-xl">
              {d.hargaNyata === 0 ? (
                <>Belum ada satu pun harga di sini yang pernah dicek langsung.</>
              ) : (
                <>
                  Dari {formatNumber(d.totalBarisHarga)} catatan harga, baru{" "}
                  <span className="text-gold-300">{formatNumber(d.hargaNyata)}</span>{" "}
                  yang benar-benar dicek.
                </>
              )}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-50/90">
              Sisanya <b>perkiraan</b> — angka yang digrounding riset ritel, bukan
              harga yang pernah dilihat di rak toko. Perkiraan berguna untuk
              gambaran kasar, tapi <b>jangan dipakai sebagai patokan belanja</b>.
              Di seluruh aplikasi, keduanya selalu diberi label berbeda, dan
              tombol <b>Hanya Nyata</b> menyembunyikan yang perkiraan.
            </p>
          </div>

          <div className="grid grid-cols-2 divide-x divide-ink-200/60 dark:divide-ink-800 sm:grid-cols-4">
            <Angka label="Produk" nilai={formatNumber(d.totalProduk)} />
            <Angka label="Supermarket" nilai={formatNumber(d.totalToko)} />
            <Angka label="Catatan harga" nilai={formatNumber(d.totalBarisHarga)} />
            <Angka
              label="Harga nyata"
              nilai={formatNumber(d.hargaNyata)}
              nada={d.hargaNyata > 0 ? "baik" : "buruk"}
            />
          </div>
        </section>

        {/* Nyata vs perkiraan */}
        <section className="card p-4">
          <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            Nyata vs perkiraan
          </h2>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div
              className="bg-emerald-500"
              style={{ width: `${Math.max(persenNyata, persenNyata > 0 ? 0.6 : 0)}%` }}
            />
            <div className="flex-1 bg-ink-300 dark:bg-ink-600" />
          </div>
          <p className="mt-2 text-[12px] text-ink-500 dark:text-ink-400">
            <b className="text-emerald-600 dark:text-emerald-400">
              {persenNyata.toFixed(persenNyata < 1 ? 2 : 0)}% nyata
            </b>{" "}
            · {formatNumber(d.produkBerhargaNyata)} dari {d.totalProduk} produk (
            {persenProduk.toFixed(0)}%) sudah punya minimal satu harga nyata.
          </p>

          <ul className="mt-3 flex flex-wrap gap-2">
            {d.perSumber.map((s) => (
              <li
                key={s.sumber}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  s.nyata
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
                }`}
              >
                {s.nyata ? "✓ " : "≈ "}
                {s.sumber} <span className="tabular-nums">{formatNumber(s.jumlah)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Kesegaran */}
        <section className="card p-4">
          <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            Kapan terakhir dicek
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
            Harga berlabel nyata yang berumur sebulan bisa lebih menyesatkan
            daripada perkiraan, karena label &ldquo;nyata&rdquo; terbaca sebagai
            layak dipercaya. Karena itu umurnya selalu ikut ditampilkan. Yang
            dihitung di bawah adalah umur <b>harga termurah yang benar-benar
            ditampilkan</b> untuk tiap produk — bukan catatan terbaru di
            database, karena satu catatan baru tidak menyegarkan 96 produk.
          </p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <Pita n={d.kesegaran.segar} total={d.kesegaran.total} kelas="bg-emerald-500" />
            <Pita n={d.kesegaran.lawas} total={d.kesegaran.total} kelas="bg-gold-500" />
            <Pita
              n={d.kesegaran.kedaluwarsa}
              total={d.kesegaran.total}
              kelas="bg-rose-500"
            />
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <Legenda
              kelas="bg-emerald-500"
              teks={`segar (≤ ${FRESH_MAX_DAYS} hari)`}
              n={d.kesegaran.segar}
            />
            <Legenda
              kelas="bg-gold-500"
              teks={`mulai lawas (≤ ${AGING_MAX_DAYS} hari)`}
              n={d.kesegaran.lawas}
            />
            <Legenda
              kelas="bg-rose-500"
              teks={`kedaluwarsa (> ${AGING_MAX_DAYS} hari)`}
              n={d.kesegaran.kedaluwarsa}
            />
          </ul>
          {d.terakhirDicatat && (
            <p className="mt-2 text-[11px] text-ink-400">
              Catatan harga terbaru: {formatAge(d.terakhirDicatat)}.
            </p>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Cakupan
            judul="Cakupan per kategori"
            keterangan="Berapa produk di tiap kategori yang sudah punya harga nyata."
            baris={d.perKategori}
          />
          <Cakupan
            judul="Cakupan per supermarket"
            keterangan="Berapa produk yang harganya diketahui di tiap toko."
            baris={d.perToko}
          />
        </div>

        {/* Satuan */}
        <section className="card p-4">
          <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
            Satuan yang bisa dibandingkan
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">
            <b>
              {d.satuanTerbaca} dari {d.totalProduk}
            </b>{" "}
            produk punya satuan yang terbaca, sehingga harga per kg / L / pcs-nya
            bisa dihitung. Sisanya sengaja tidak ditampilkan harga per satuannya —
            menebak isi kemasan lebih berbahaya daripada mengaku tidak tahu.
          </p>
        </section>

        <p className="px-1 pb-2 text-center text-[11px] leading-relaxed text-ink-400">
          Halaman ini dihitung ulang dari database setiap kali dibuka.{" "}
          <Link href="/" className="underline underline-offset-2">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </main>
  );
}

function Angka({
  label,
  nilai,
  nada = "netral",
}: {
  label: string;
  nilai: string;
  nada?: "netral" | "baik" | "buruk";
}) {
  const warna =
    nada === "baik"
      ? "text-emerald-600 dark:text-emerald-400"
      : nada === "buruk"
      ? "text-rose-600 dark:text-rose-400"
      : "text-ink-800 dark:text-ink-100";
  return (
    <div className="px-3 py-3 text-center">
      <p className={`font-display text-xl font-extrabold tabular-nums ${warna}`}>
        {nilai}
      </p>
      <p className="text-[11px] text-ink-400">{label}</p>
    </div>
  );
}

function Pita({ n, total, kelas }: { n: number; total: number; kelas: string }) {
  if (n <= 0 || total <= 0) return null;
  return <div className={kelas} style={{ width: `${(n / total) * 100}%` }} />;
}

function Legenda({ kelas, teks, n }: { kelas: string; teks: string; n: number }) {
  return (
    <li className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400">
      <span className={`inline-block h-2 w-2 rounded-full ${kelas}`} />
      {teks} <span className="font-bold tabular-nums text-ink-700 dark:text-ink-200">{n}</span>
    </li>
  );
}

function Cakupan({
  judul,
  keterangan,
  baris,
}: {
  judul: string;
  keterangan: string;
  baris: { nama: string; slug: string; berharga: number; nyata: number; total: number }[];
}) {
  const maks = Math.max(1, ...baris.map((b) => b.berharga));
  return (
    <section className="card p-4">
      <h2 className="font-display text-sm font-bold text-ink-800 dark:text-ink-100">
        {judul}
      </h2>
      <p className="mt-0.5 text-[11px] text-ink-400">{keterangan}</p>
      <ul className="mt-3 space-y-2">
        {baris.map((b) => (
          <li key={b.slug}>
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="truncate text-ink-700 dark:text-ink-200">{b.nama}</span>
              <span className="shrink-0 tabular-nums text-ink-400">
                {b.nyata > 0 && (
                  <b className="text-emerald-600 dark:text-emerald-400">
                    {b.nyata} nyata
                  </b>
                )}
                {b.nyata > 0 && " · "}
                {b.berharga} berharga
              </span>
            </div>
            <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className="bg-emerald-500"
                style={{ width: `${(b.nyata / maks) * 100}%` }}
              />
              <div
                className="bg-ink-300 dark:bg-ink-600"
                style={{ width: `${((b.berharga - b.nyata) / maks) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
