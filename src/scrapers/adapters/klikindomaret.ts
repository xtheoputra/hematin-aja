import type { Scraper, ScrapedPrice } from "../types";

/**
 * Adapter NYATA untuk Indomaret (Klik Indomaret).
 * Hasilnya disimpan source="scrape" → ditandai "✓ Nyata · Toko" di UI.
 *
 * Catatan jujur: situs klikindomaret kini berupa SPA yang memuat produk lewat
 * API internal ber-proteksi (sering ber-geo-restriction ke IP Indonesia & bisa
 * berubah sewaktu-waktu). Adapter ini ditulis defensif:
 *   - timeout pendek per-permintaan,
 *   - berhenti cepat bila permintaan pertama gagal (agar tombol Refresh tetap responsif),
 *   - mengembalikan [] (bukan error) bila endpoint memblokir / berubah.
 * Saat dijalankan dari lingkungan yang BISA mengakses API (mis. server di ID),
 * adapter ini menghasilkan harga nyata. Sesuaikan SEARCH_API/parser bila perlu.
 *
 * ⚠️ Patuhi Terms of Service & robots.txt situs target sebelum mengaktifkan di produksi.
 */

const SUPERMARKET_SLUG = "indomaret";
const SEARCH_API = "https://www.klikindomaret.com/webapi/api/product/getproducts";
const TIMEOUT_MS = 6000;
const RATE_LIMIT_MS = 1200;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

// Pemetaan produk DB kita → kata kunci pencarian di Klik Indomaret.
const PRODUCT_MAP: { productSlug: string; query: string }[] = [
  { productSlug: "indomie-goreng", query: "indomie goreng 85" },
  { productSlug: "minyak-goreng-bimoli-2l", query: "bimoli 2 liter" },
  { productSlug: "gula-pasir-gulaku-1kg", query: "gulaku tebu 1kg" },
  { productSlug: "teh-botol-sosro-350ml", query: "teh botol sosro 350" },
  { productSlug: "kecap-abc-275ml", query: "kecap manis abc 275" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null; // SPA mengembalikan HTML → bukan JSON
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractPrice(item: any): number | null {
  const cands = [
    item?.finalPrice,
    item?.price,
    item?.pricePlu,
    item?.pluPrice,
    item?.priceFormatted,
    item?.productPrice,
  ];
  for (const c of cands) {
    const n = Number(String(c ?? "").replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export const klikindomaretScraper: Scraper = {
  slug: "klikindomaret",
  name: "Indomaret (Klik Indomaret)",
  enabled: true,
  source: "scrape",
  async run(): Promise<ScrapedPrice[]> {
    const out: ScrapedPrice[] = [];
    let firstTried = false;

    for (const item of PRODUCT_MAP) {
      const url = `${SEARCH_API}?search=${encodeURIComponent(
        item.query
      )}&pagesize=5&pageno=1`;
      const data = await fetchJson(url);

      if (!firstTried) {
        firstTried = true;
        // Jika permintaan pertama gagal, hentikan agar tidak memperlambat UI.
        if (!data) return out;
      }

      const list =
        data?.Data ?? data?.data ?? data?.products ?? data?.items ?? [];
      const first = Array.isArray(list) ? list[0] : null;
      const price = first ? extractPrice(first) : null;
      if (price) {
        out.push({
          productSlug: item.productSlug,
          supermarketSlug: SUPERMARKET_SLUG,
          price,
          inStock: true,
          url: `https://www.klikindomaret.com/search?key=${encodeURIComponent(
            item.query
          )}`,
        });
      }
      await sleep(RATE_LIMIT_MS);
    }
    return out;
  },
};
