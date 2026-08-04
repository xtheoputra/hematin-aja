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
- **[`FASE-1.5-CHECKLIST.md`](FASE-1.5-CHECKLIST.md)** — penguatan sebelum
  skala: batas kueri, validasi harga, caching, log, keamanan, dan cara mengukur
  akurasi pencocokan.
- **[`FASE-2-CHECKLIST.md`](FASE-2-CHECKLIST.md)** — pencocokan produk dengan
  embedding. **Baca §0 dulu**: ada gerbang masuk yang harus dilewati sebelum
  fase ini layak dikerjakan.
- **[`FASE-3-CHECKLIST.md`](FASE-3-CHECKLIST.md)** — pipeline OCR struk. Tidak
  bergantung pada Fase 2, dan bisa dinaikkan lebih awal karena struk adalah
  sumber harga nyata terkuat untuk toko fisik.
- **[`FASE-4-CHECKLIST.md`](FASE-4-CHECKLIST.md)** — mesin rekomendasi. **Baca
  §0 dulu**: ada keputusan posisi produk (cross-sell vs hemat) yang harus
  diambil sebelum apa pun dikerjakan.
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
- 🔐 **Halaman admin** (`/admin`): input harga nyata manual, produk baru, alias,
  daftar kerja pengisian data, kueri yang gagal, dan catatan kejadian

### Pencarian yang tidak bergantung urutan kata

Nama produk dibawa ke **bentuk baku** (token diseragamkan lalu diurutkan), jadi
`"mie goreng indomie"`, `"indomie mi goreng"`, dan `"INDOMIE GORENG"` sama-sama
menemukan Indomie Goreng. Pencocokannya bertingkat — persis → alias → token →
toleransi salah ketik — dan berhenti di tingkat pertama yang berhasil.

Dua hal **tidak pernah** dilonggarkan: **merek** dan **ukuran**. `Aqua 600ml`
bukan `Aqua 19L`, dan `Indomie Goreng` bukan `Mie Sedaap Goreng`. Salah cocok
berarti menampilkan harga barang lain sebagai "lebih murah" — lebih merugikan
daripada tidak ketemu sama sekali.

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
npm test             # 166 pemeriksaan, ±1 detik — pakai ini, jangan verifikasi manual
npm run db:seed      # isi ulang data contoh
npm run db:reset     # reset DB + seed ulang
npm run db:studio    # buka Prisma Studio (lihat/ubah data)
npm run db:normalisasi # isi ulang Product.normalizedName + alias dari slug
npm run db:statistik # berapa produk, berapa harga, berapa yang NYATA
npm run ukur         # ukur biaya kueri harga (sebelum vs sesudah pembatasan)
npm run import:off    # impor produk Indonesia ASLI dari Open Food Facts (mis. `npm run import:off -- 40`)
npm run scrape       # jalankan scraper aktif (lihat di bawah)
npm run build        # build produksi
```

> `npm run db:normalisasi` **wajib** dijalankan ulang setiap kali aturan di
> `src/lib/normalize.ts` berubah. Kalau tidak, pencarian "cocok persis"
> membandingkan dengan bentuk baku yang sudah basi.

### 🔐 Mengaktifkan halaman admin

Halaman `/admin` dan rute `POST /api/refresh` & `POST /api/scrape` **mati total**
sampai sandinya disetel — bawaan yang aman adalah tertutup, bukan terbuka.

Buat berkas **`.env.local`** (bukan `.env` — `.env` ikut ter-commit):

```
ADMIN_PASSWORD="sandi-pilihan-anda"
```

lalu jalankan ulang server. Untuk skrip/penjadwal yang tidak punya sesi, sandi
bisa dikirim lewat header `x-hematin-sandi`.

Kenapa refresh & scrape ikut dikunci: keduanya **memicu permintaan keluar ke
situs pihak ketiga**. Kalau dibiarkan terbuka, siapa pun yang tahu alamatnya
bisa memakai aplikasi ini untuk membanjiri Klik Indomaret atau Open Prices atas
nama pemiliknya.

### ⏰ Pembaruan harga terjadwal (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File jadwalkan.ps1            # harian 07:00
powershell -ExecutionPolicy Bypass -File jadwalkan.ps1 -Jam 19:30
powershell -ExecutionPolicy Bypass -File jadwalkan.ps1 -Hapus
```

Memakai Task Scheduler, bukan `setInterval` di dalam Next.js: penjadwalan di
dalam proses aplikasi ikut mati begitu prosesnya restart. Hasil & kegagalan tiap
jalan tercatat ke tabel `EventLog`, bisa dibaca di `/admin`.

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
  schema.prisma        # Supermarket, Category, Product, Price (history),
                       # ProductAlias, SearchLog, EventLog
  seed.ts              # data contoh + riwayat harga
src/
  app/
    page.tsx           # beranda: cari + daftar produk
    produk/[slug]/     # detail produk: harga per toko + grafik tren
    keranjang/         # banding total belanja → toko termurah
    insight/           # insight & rekomendasi hemat
    admin/             # 🔐 input harga nyata, produk, alias + daftar kerja
    api/               # /products, /insights, /compare, /admin/*
  components/          # UI: kartu produk, grafik, navigasi, keranjang
  lib/
    normalize.ts       # normalisasi & pencocokan nama (MURNI, tanpa DB)
    harga.ts           # validasi harga (MURNI, tanpa DB)
    simpanHarga.ts     # satu-satunya pintu penulisan harga
    cache.ts           # cache lapisan data — kunci WAJIB memuat realOnly
    log.ts             # catatan kejadian tersimpan + percobaan ulang
    admin.ts           # sandi & pembatas laju (MURNI, tanpa next/headers)
    queries/
      pilih.ts         #   aturan "mana yang termurah" (MURNI, tanpa DB)
      muat.ts          #   pemuatan harga secukupnya
      cari.ts          #   alur pencarian bertingkat
      produk.ts toko.ts banding.ts insight.ts
  scrapers/            # framework scraper + adapter per toko
uji/                   # `npm test` — kerangka sendiri, tanpa dependensi baru
public/                # manifest, service worker, ikon (PWA)
```

## 🔄 Ganti ke database produksi

Ubah `provider` di `prisma/schema.prisma` ke `postgresql` dan set `DATABASE_URL`
di `.env`, lalu `npm run db:push && npm run db:seed`.

## ⚖️ Catatan

Harga bersifat ilustratif dan dapat berbeda dari harga resmi toko. Selalu
verifikasi di gerai/aplikasi resmi sebelum berbelanja.
