/**
 * template.tsx di-mount ulang setiap navigasi (beda dari layout yang persisten),
 * sehingga animasi `page-in` diputar di tiap perpindahan halaman.
 * Animasi dimatikan otomatis bagi pengguna yang memilih reduce-motion (lihat globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in motion-reduce:animate-none">{children}</div>;
}
