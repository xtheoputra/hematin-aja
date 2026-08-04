import Link from "next/link";
import { prisma } from "@/lib/db";
import { adminDiaktifkan } from "@/lib/admin";
import { sesiAdminSah } from "@/lib/adminSesi";
import { getCategories, kueriGagalTeratas, ringkasanKerja } from "@/lib/queries";
import { bacaLog } from "@/lib/log";
import { formatAge } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import MasukAdmin from "@/components/admin/MasukAdmin";
import KeluarAdmin from "@/components/admin/KeluarAdmin";
import FormHargaManual from "@/components/admin/FormHargaManual";
import FormProduk from "@/components/admin/FormProduk";
import FormAlias from "@/components/admin/FormAlias";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Hematin Aja", robots: { index: false } };

export default async function AdminPage() {
  if (!adminDiaktifkan()) return <BelumDiaktifkan />;
  if (!sesiAdminSah()) {
    return (
      <main>
        <PageHeader title="Admin" emoji="🔐" subtitle="Pengisian data harga nyata" />
        <div className="container-app pt-8">
          <MasukAdmin />
        </div>
      </main>
    );
  }

  const [produk, toko, kategori, kerja, gagal, log] = await Promise.all([
    prisma.product.findMany({
      select: { slug: true, name: true, unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.supermarket.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    getCategories(),
    ringkasanKerja(60),
    kueriGagalTeratas(10),
    bacaLog({ limit: 12 }),
  ]);

  const persen = kerja.totalProduk
    ? Math.round((kerja.denganHargaNyata / kerja.totalProduk) * 100)
    : 0;

  return (
    <main className="pb-16">
      <PageHeader
        title="Admin"
        emoji="🔐"
        subtitle="Pengisian data harga nyata"
        action={<KeluarAdmin />}
      />

      <div className="container-app space-y-6 pt-6">
        {/* Kemajuan pengisian — satu-satunya angka yang menentukan Fase 1 selesai */}
        <section className="card p-4 md:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
              📊 Kemajuan harga nyata
            </h2>
            <p className="text-xs text-ink-400">
              {kerja.denganHargaNyata} dari {kerja.totalProduk} produk sudah punya
              harga nyata ({persen}%)
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all"
              // Batas bawah 1,5% supaya kemajuan yang masih kecil tetap terlihat
              // sebagai garis — 0,x% yang tak kelihatan gampang dikira rusak.
              style={{ width: `${Math.max(persen, persen > 0 ? 1.5 : 0)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Sasaran Fase 1: harga nyata dari <b>≥ 2 sumber</b>, fokus satu
            kategori dulu (mie instan) supaya tuntas, bukan tersebar tipis.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <FormHargaManual produk={produk} toko={toko} />
          <div className="space-y-4">
            <FormProduk kategori={kategori} />
            <FormAlias produk={produk} />
          </div>
        </div>

        {/* Daftar kerja */}
        <section className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
              🎯 Belum punya harga nyata
            </h2>
            <p className="mt-0.5 text-xs text-ink-400">
              {kerja.belumTergarap} produk belum tergarap
              {kerja.baris.length < kerja.belumTergarap &&
                ` — ${kerja.baris.length} teratas ditampilkan`}
              . Yang paling kosong di atas.
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 text-left text-xs text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Produk</th>
                  <th className="px-4 py-2 font-semibold">Kategori</th>
                  <th className="px-4 py-2 text-right font-semibold">Harga nyata</th>
                </tr>
              </thead>
              <tbody>
                {kerja.baris.map((k) => (
                  <tr
                    key={k.slug}
                    className="border-t border-ink-100 dark:border-ink-800"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/produk/${k.slug}`}
                        className="font-medium text-ink-700 hover:text-brand-600 dark:text-ink-200"
                      >
                        {k.name}
                      </Link>
                      <span className="ml-1.5 text-xs text-ink-400">{k.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-400">{k.categoryName}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {k.hargaNyata === 0 ? (
                        <span className="text-rose-500">0</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {k.hargaNyata}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Kueri gagal — bahan alias */}
        <section className="card p-4 md:p-5">
          <h2 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
            🔍 Kueri yang tidak menemukan apa pun
          </h2>
          <p className="mt-0.5 text-xs text-ink-400">
            Ini nama yang benar-benar diketik orang. Tiap baris adalah kandidat
            alias yang layak ditambahkan.
          </p>
          {gagal.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">
              Belum ada pencarian yang gagal tercatat.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {gagal.map((g) => (
                <li
                  key={g.query}
                  className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                >
                  “{g.query}” <span className="text-ink-400">×{g.jumlah}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Log */}
        <section className="card p-4 md:p-5">
          <h2 className="font-display text-base font-bold text-ink-800 dark:text-ink-100">
            📜 Catatan kejadian terakhir
          </h2>
          {log.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Belum ada catatan.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed">
              {log.map((l) => (
                <li key={l.id} className="flex gap-2">
                  <span
                    className={
                      l.level === "error"
                        ? "text-rose-500"
                        : l.level === "warn"
                          ? "text-gold-600 dark:text-gold-400"
                          : "text-ink-400"
                    }
                  >
                    [{l.channel}]
                  </span>
                  <span className="flex-1 text-ink-600 dark:text-ink-300">
                    {l.message}
                  </span>
                  <span className="shrink-0 text-ink-400">
                    {formatAge(l.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function BelumDiaktifkan() {
  return (
    <main>
      <PageHeader title="Admin" emoji="🔐" subtitle="Belum diaktifkan" />
      <div className="container-app pt-8">
        <div className="card mx-auto max-w-xl space-y-3 p-6">
          <h2 className="font-display text-lg font-bold text-ink-800 dark:text-ink-100">
            Setel sandi dulu
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Halaman admin sengaja <b>mati total</b> selama sandinya belum disetel —
            bawaan yang aman adalah tertutup, bukan terbuka untuk semua.
          </p>
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
            <li>
              Buat berkas <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">.env.local</code>{" "}
              di akar proyek.
            </li>
            <li>
              Isi:{" "}
              <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">
                ADMIN_PASSWORD=&quot;sandi-pilihan-anda&quot;
              </code>
            </li>
            <li>Jalankan ulang server.</li>
          </ol>
          <p className="text-xs text-ink-400">
            Pakai <code>.env.local</code>, bukan <code>.env</code> —{" "}
            <code>.env</code> ikut terlacak git, jadi sandinya akan ikut ter-commit.
          </p>
        </div>
      </div>
    </main>
  );
}
