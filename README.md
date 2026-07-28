# 🛒 Hematin Aja

Aplikasi **PWA** untuk membandingkan harga produk dari berbagai **supermarket di
Indonesia**, melihat **tren harga**, dan menemukan **tempat belanja termurah** —
lengkap dengan **insight** & rekomendasi hemat.

> Data harga saat ini berupa **contoh ilustratif** (seed). Sistem **scraper**
> modular sudah disiapkan untuk mengisi data dari situs toko sungguhan (lihat
> bagian Scraper). Harga di seed **bukan** harga resmi toko.

## 📚 Dokumen

- **[`FASE-1-CHECKLIST.md`](FASE-1-CHECKLIST.md)** — rencana kerja yang sedang
  berjalan: normalisasi nama produk, tabel alias, input admin, dan uji.
- **[`PETA-JALAN.md`](PETA-JALAN.md)** — arah jangka panjang: visi, arsitektur
  target, desain data, prompt AI, dan tahapan pengerjaan.
- **[`CATATAN-SESI.md`](CATATAN-SESI.md)** — riwayat pengerjaan per sesi &
  daftar pekerjaan yang masih terbuka.

## ✨ Fitur

- 🔎 **Cari & filter** produk per kategori
- 🏷️ **Banding harga** antar supermarket, tahu yang **termurah**
- 📈 **Grafik tren harga** dari waktu ke waktu per toko
- 🧺 **Keranjang pintar**: hitung total belanja di tiap toko → toko paling hemat
- 💡 **Insight**: toko paling sering termurah, harga lagi turun, rekomendasi hemat
- 📱 **PWA**: bisa di-install di HP & punya cache offline

## 🧱 Teknologi

| Lapisan    | Teknologi                          |
| ---------- | ---------------------------------- |
| Framework  | Next.js 14 (App Router) + React 18 |
| Bahasa     | TypeScript                         |
| Database   | Prisma + SQLite (mudah ganti ke Postgres) |
| UI         | Tailwind CSS                       |
| Grafik     | Recharts                           |
| PWA        | Web App Manifest + Service Worker  |

## 🚀 Menjalankan (lokal)

### Cara cepat (Windows) — sekali klik

Klik dua kali salah satu file ini di folder proyek:

- **`start.bat`** → mode pengembangan (otomatis `npm install` + `npm run setup` bila perlu, lalu buka `http://localhost:3000`).
- **`start-prod.bat`** → mode produksi (build teroptimasi lalu jalankan).
- **`start.ps1`** → versi PowerShell dari `start.bat`.

Skrip akan memasang dependensi & menyiapkan database secara otomatis bila belum ada, lalu membuka browser.

### Cara manual

```bash
npm install          # pasang dependency
npm run setup        # buat tabel DB + isi data contoh (db push + seed)
npm run dev          # jalankan di http://localhost:3000
```

Skrip lain:

```bash
npm run db:seed      # isi ulang data contoh
npm run db:reset     # reset DB + seed ulang
npm run db:studio    # buka Prisma Studio (lihat/ubah data)
npm run import:off    # impor produk Indonesia ASLI dari Open Food Facts (mis. `npm run import:off -- 40`)
npm run scrape       # jalankan scraper aktif (lihat di bawah)
npm run build        # build produksi
```

## 🕷️ Scraper (mengisi harga dari toko sungguhan)

Sistem scraper bersifat **modular** — satu toko = satu adapter. Jalankan:

```bash
npm run scrape
```

Setiap run menyimpan harga sebagai **catatan baru** sehingga riwayat/tren harga
otomatis terbangun. Saat ini adapter **demo** (simulasi, tanpa internet) aktif
agar pipeline bisa langsung dicoba.

Untuk menambah toko sungguhan, lihat **`src/scrapers/README.md`** dan template
**`src/scrapers/adapters/alfagift.example.ts`**.

> ⚠️ **Etika scraping:** patuhi Terms of Service & `robots.txt` situs target,
> beri rate limit, dan utamakan API resmi/kerja sama data bila tersedia.

## 📂 Struktur

```
prisma/
  schema.prisma        # model: Supermarket, Category, Product, Price (history)
  seed.ts              # data contoh + riwayat harga
src/
  app/
    page.tsx           # beranda: cari + daftar produk
    produk/[slug]/     # detail produk: harga per toko + grafik tren
    keranjang/         # banding total belanja → toko termurah
    insight/           # insight & rekomendasi hemat
    api/               # /products, /insights, /compare
  components/          # UI: kartu produk, grafik, navigasi, keranjang
  lib/                 # db, query, format, tipe
  scrapers/            # framework scraper + adapter per toko
public/                # manifest, service worker, ikon (PWA)
```

## 🔄 Ganti ke database produksi

Ubah `provider` di `prisma/schema.prisma` ke `postgresql` dan set `DATABASE_URL`
di `.env`, lalu `npm run db:push && npm run db:seed`.

## ⚖️ Catatan

Harga bersifat ilustratif dan dapat berbeda dari harga resmi toko. Selalu
verifikasi di gerai/aplikasi resmi sebelum berbelanja.
