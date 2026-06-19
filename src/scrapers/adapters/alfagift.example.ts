import type { Scraper, ScrapedPrice } from "../types";

/**
 * CONTOH adapter untuk toko sungguhan (mis. Alfagift).
 * Status: NONAKTIF (enabled: false). Ini template untuk Anda lengkapi.
 *
 * ⚠️ PENTING sebelum mengaktifkan:
 *  - Patuhi Terms of Service & robots.txt situs target.
 *  - Beri jeda antar-request (rate limit) agar tidak membebani server.
 *  - Selektor/endpoint situs SERING berubah → adapter harus dirawat.
 *  - Pertimbangkan memakai API resmi / kemitraan data jika tersedia.
 *
 * Pola umum:
 *  1) Tentukan pemetaan productSlug (DB kita) -> ID/URL produk di situs toko.
 *  2) Ambil data (JSON API lebih stabil daripada parsing HTML).
 *  3) Kembalikan ScrapedPrice[]. Runner yang akan menyimpannya ke DB.
 */

// Pemetaan produk DB kita -> URL/endpoint produk di situs toko.
const PRODUCT_MAP: { productSlug: string; productUrl: string }[] = [
  // { productSlug: "indomie-goreng", productUrl: "https://alfagift.id/api/products/indomie-goreng" },
];

const SUPERMARKET_SLUG = "alfamart";
const RATE_LIMIT_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const alfagiftScraper: Scraper = {
  slug: "alfagift",
  name: "Alfagift",
  enabled: false, // ← ubah ke true setelah PRODUCT_MAP & parser diisi
  async run(): Promise<ScrapedPrice[]> {
    const out: ScrapedPrice[] = [];

    for (const item of PRODUCT_MAP) {
      try {
        const res = await fetch(item.productUrl, {
          headers: {
            "User-Agent":
              "HematinAja/0.1 (+riset harga; hormati robots.txt & ToS)",
            Accept: "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // --- SESUAIKAN parsing dengan struktur respons situs target ---
        const data: any = await res.json();
        const price: number = Number(data?.price ?? data?.finalPrice);
        const inStock: boolean = Boolean(data?.available ?? true);
        // -------------------------------------------------------------

        if (Number.isFinite(price) && price > 0) {
          out.push({
            productSlug: item.productSlug,
            supermarketSlug: SUPERMARKET_SLUG,
            price: Math.round(price),
            inStock,
            url: item.productUrl,
          });
        }
      } catch (err) {
        console.warn(`  ⚠️  gagal ambil ${item.productSlug}:`, (err as Error).message);
      }
      await sleep(RATE_LIMIT_MS); // sopan: jeda antar-request
    }

    return out;
  },
};
