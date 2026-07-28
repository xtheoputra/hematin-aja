import type { Scraper } from "./types";
import { klikindomaretScraper } from "./adapters/klikindomaret";
import { demoScraper } from "./adapters/demo";
import { alfagiftScraper } from "./adapters/alfagift.example";

// Daftarkan semua adapter di sini. Runner hanya menjalankan yang `enabled: true`.
// - klikindomaret : adapter NYATA (source "scrape"); aktif tapi defensif.
// - demo          : simulasi (source "scrape-demo"); NONAKTIF, hanya untuk dev.
// - alfagift      : template NONAKTIF untuk dilengkapi.
export const scrapers: Scraper[] = [
  klikindomaretScraper,
  demoScraper,
  alfagiftScraper,
];
