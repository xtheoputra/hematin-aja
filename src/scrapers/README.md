# Scraper Supermarket

Sistem scraper modular: tiap toko = satu adapter yang mengembalikan daftar harga.
Runner menyimpan hasil ke DB sebagai catatan harga baru, sehingga **riwayat/tren
harga otomatis terbangun** setiap kali scraping dijalankan.

## Cara pakai

```bash
npm run scrape
```

Hanya adapter dengan `enabled: true` yang dijalankan.

## Menambah toko baru

1. Buat file di `src/scrapers/adapters/<toko>.ts` mengekspor objek `Scraper`.
2. Isi `run()` untuk mengambil & mem-parse harga → kembalikan `ScrapedPrice[]`.
   - `productSlug` harus cocok dengan `Product.slug` di DB.
   - `supermarketSlug` harus cocok dengan `Supermarket.slug` di DB.
3. Daftarkan di `src/scrapers/registry.ts`.
4. Set `enabled: true`.

Lihat `adapters/alfagift.example.ts` sebagai template dan `adapters/demo.ts`
sebagai contoh kerja (simulasi, tanpa internet).

## ⚠️ Etika & legalitas scraping

- **Patuhi Terms of Service & `robots.txt`** situs target.
- **Rate limit**: beri jeda antar-request (lihat `RATE_LIMIT_MS`).
- Selektor/endpoint situs sering berubah → adapter perlu dirawat berkala.
- Bila tersedia, **utamakan API resmi / kerja sama data** daripada scraping HTML.
- Untuk parsing HTML kompleks, tambahkan dependency seperti `cheerio`.

## Otomatisasi (opsional)

Jadwalkan `npm run scrape` via cron (Linux) atau Task Scheduler (Windows),
mis. sekali sehari, agar tren harga terus diperbarui.
