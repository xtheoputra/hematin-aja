import type { Scraper } from "./types";
import { demoScraper } from "./adapters/demo";
import { alfagiftScraper } from "./adapters/alfagift.example";

// Daftarkan semua adapter di sini. Runner hanya menjalankan yang `enabled: true`.
export const scrapers: Scraper[] = [demoScraper, alfagiftScraper];
