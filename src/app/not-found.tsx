import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <LogoMark className="h-16 w-16 drop-shadow" />
      <h1 className="mt-2 font-display text-lg font-extrabold text-ink-800 dark:text-ink-100">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-xs text-sm text-ink-400">
        Produk atau halaman yang Anda cari tidak tersedia.
      </p>
      <Link href="/" className="btn-primary mt-3 px-5 py-3 text-sm">
        Kembali ke beranda
      </Link>
    </main>
  );
}
