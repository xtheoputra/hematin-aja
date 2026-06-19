import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl">🛒</p>
      <h1 className="text-lg font-bold text-slate-700">Halaman tidak ditemukan</h1>
      <p className="text-sm text-slate-400">
        Produk atau halaman yang Anda cari tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
