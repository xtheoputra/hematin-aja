import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import ModeBar from "@/components/ModeBar";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getDisplayMode } from "@/lib/mode";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hematin Aja — Banding Harga Supermarket Indonesia",
  description:
    "Bandingkan harga produk konsumsi dari berbagai supermarket di Indonesia, lihat tren harga, dan temukan tempat belanja termurah.",
  manifest: "/manifest.webmanifest",
  applicationName: "Hematin Aja",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hematin Aja",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = getDisplayMode();
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Setel tema sebelum paint agar tidak ada kedip (FOUC). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hematin-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <CartProvider>
          <div className="pb-nav flex min-h-screen flex-col bg-ink-50 dark:bg-ink-950 md:pb-0">
            <TopNav mode={mode} />
            <ModeBar mode={mode} />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <BottomNav />
          <ServiceWorkerRegister />
        </CartProvider>
      </body>
    </html>
  );
}
