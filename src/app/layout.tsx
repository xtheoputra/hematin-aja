import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Hematin Aja — Banding Harga Supermarket",
  description:
    "Bandingkan harga produk dari berbagai supermarket di Indonesia, lihat tren harga, dan temukan tempat belanja termurah.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
  return (
    <html lang="id">
      <body>
        <CartProvider>
          <div className="app-shell mx-auto min-h-screen max-w-md bg-slate-50">
            {children}
          </div>
          <BottomNav />
          <ServiceWorkerRegister />
        </CartProvider>
      </body>
    </html>
  );
}
