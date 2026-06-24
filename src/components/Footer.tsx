import Link from "next/link";
import { Logo } from "./Logo";

export default function Footer() {
  const year = 2026;
  return (
    <footer className="mt-10 border-t border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-900">
      <div className="container-app py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Bandingkan harga produk konsumsi dari berbagai supermarket di
              Indonesia, pantau tren harga, dan temukan tempat belanja termurah.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol title="Jelajah">
              <FooterLink href="/">Beranda</FooterLink>
              <FooterLink href="/supermarket">Supermarket</FooterLink>
              <FooterLink href="/insight">Insight</FooterLink>
              <FooterLink href="/keranjang">Keranjang</FooterLink>
            </FooterCol>
            <FooterCol title="Kategori">
              <FooterLink href="/?kategori=sembako">Sembako</FooterLink>
              <FooterLink href="/?kategori=minuman">Minuman</FooterLink>
              <FooterLink href="/?kategori=makanan-instan">Makanan Instan</FooterLink>
              <FooterLink href="/?kategori=snack">Snack</FooterLink>
            </FooterCol>
            <FooterCol title="Tentang">
              <li className="text-sm text-ink-500 dark:text-ink-400">
                Data harga ilustratif
              </li>
              <li className="text-sm text-ink-500 dark:text-ink-400">
                Produk via Open Food Facts
              </li>
            </FooterCol>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-200/70 pt-6 text-xs text-ink-400 dark:border-ink-800">
          © {year} Hematin Aja. Harga bersifat ilustratif & dapat berubah —
          selalu cek harga resmi di toko sebelum berbelanja.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">
        {title}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-ink-500 transition hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
      >
        {children}
      </Link>
    </li>
  );
}
