# 🧭 Peta Jalan — Hematin Aja

Dokumen arah jangka panjang: dari **pembanding harga supermarket** menjadi
**asisten belanja cerdas**. Berisi visi, arsitektur target, desain data, prompt
AI, dan tahapan pengerjaan.

> **Cara membaca dokumen ini.** Bagian *"Di Mana Kita Sekarang"* adalah fakta
> kode hari ini. Sisanya adalah **target**, belum ada. Setiap fase mencantumkan
> prasyaratnya — urutan itu bukan hiasan, fase belakang mustahil tanpa fase
> depan.

---

## 1. 🎯 Visi & Posisi

**Nama konsep:** *Smart Price Intelligence Platform* — Hematin Aja sebagai
asisten belanja, bukan sekadar daftar harga.

### Masalah

Pengguna Indonesia menghadapi **fragmentasi harga**:

- Harga berbeda antar toko fisik (Indomaret, Alfamart, hypermarket) **dan**
  marketplace (Tokopedia, Shopee)
- Tidak ada agregator yang akurat & terkini
- Promosi sering tidak transparan atau tersembunyi di balik syarat

### Solusi

Platform yang **mengumpulkan** harga multi-sumber (luring + daring),
**menormalkan** identitas produk, lalu **memutuskan** rencana belanja optimal
berdasarkan lokasi, preferensi, dan tren harga historis.

### Proposisi Nilai

| Janji | Artinya secara teknis |
| --- | --- |
| "Belanja lebih hemat tanpa effort" | Rekomendasi otomatis, bukan pekerjaan riset manual pengguna |
| "Harga transparan & terkini" | Setiap harga menyatakan asal-usul dan kapan dicatat |
| "Mesin keputusan, bukan daftar harga" | Keluarannya *rencana belanja*, bukan tabel |

### Posisi Pasar

- ❌ Jangan diposisikan sebagai *"aplikasi banding harga"* — kategori itu ramai
  dan dianggap komoditas.
- ✅ Posisikan sebagai **"Asisten Belanja AI"** / **"hemat otomatis tanpa
  mikir"**.

> ⚠️ **Catatan jujur soal posisi.** Klaim "AI Shopping Assistant" hanya sah bila
> datanya nyata. Saat ini 10 dari 16.390 baris harga yang terverifikasi
> (0,06%). Memasarkan lapisan AI di atas data perkiraan justru merusak
> kepercayaan — dan bertentangan dengan prinsip kejujuran data yang sudah
> dibangun. **Data dulu, AI kemudian.**

---

## 2. 📍 Di Mana Kita Sekarang

Fakta per **28 Juli 2026** (commit `5ef054f`).

### Sudah ada

| Kemampuan | Wujudnya di kode |
| --- | --- |
| Riwayat harga | `Price` = satu baris per pengamatan, ada `recordedAt` → tren sudah terbentuk |
| Klasifikasi asal harga | `src/lib/source.ts` → `real` / `estimate` / `none` |
| Transparansi ke pengguna | Mode **Semua** vs **Hanya Nyata** (`lib/mode.ts`), `DataHonestyNote`, `PriceSourceBadge` |
| Banding antar toko | Halaman `/bandingkan` — matriks produk × supermarket |
| **Rekomendasi Level 1** | Keranjang → `POST /api/compare` → toko dengan total termurah (`CartView`) |
| Kerangka scraper | `scrapers/registry.ts` + adapter per toko, `runScrapers.ts` dipakai CLI & `POST /api/scrape` |
| Sumber harga nyata | `data/openPrices.ts` (Open Prices) + adapter `klikindomaret.ts` |
| **Ladang barcode** | `Product.barcode` sudah ada dan `@unique` — fondasi fitur pindai |
| PWA | manifest + service worker sendiri |

**Penting:** "rekomendasi keranjang termurah" dan "barcode" bukan barang baru —
keduanya **sudah ada embrionya**. Peta jalan ini menumbuhkan, bukan memulai
dari nol.

### Belum ada

- ❌ Konsep **pengguna** (tak ada model `User`) — tanpa ini: tidak ada
  preferensi, riwayat, maupun notifikasi
- ❌ **Lokasi** — tak ada koordinat toko/pengguna, jadi tidak ada trade-off
  jarak vs harga
- ❌ **Normalisasi produk / pencocokan SKU** — produk hanya cocok kalau
  `slug`-nya persis sama
- ❌ **OCR struk**, **notifikasi**, **sumber marketplace**, **lapisan AI apa pun**

### Kendala yang mengikat

1. **Harga nyata hanya 10 baris.** Ini gerbang untuk semuanya.
2. **Catatan terakhir 24 Juni 2026** — data basi lebih dari sebulan.
3. **Scraper Indomaret belum terbukti** menghasilkan harga.
4. **Belum ada uji otomatis**; verifikasi hanya `tsc` + `build`.

---

## 3. ⚙️ Arsitektur Target

```
            [ PWA / Aplikasi Mobile ]
                       │
                [ API Gateway ]
                       │
        ┌──────────────┴──────────────┐
        │      Lapisan Layanan Inti    │
        ├──────────────────────────────┤
        │  Pencocokan Produk  (AI)     │
        │  Agregasi Harga              │
        │  Mesin Rekomendasi           │
        │  Notifikasi                  │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │        Lapisan Data          │
        ├──────────────────────────────┤
        │  DB Produk                   │
        │  DB Riwayat Harga            │
        │  DB Perilaku Pengguna        │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │      Sumber Eksternal        │
        ├──────────────────────────────┤
        │  API Marketplace / Scraper   │
        │  OCR struk dari pengguna     │
        │  Urun-daya (crowdsourcing)   │
        └──────────────────────────────┘
```

> Diagram ini **arsitektur logis**, bukan perintah memecah aplikasi jadi
> microservice. Untuk skala sekarang setiap "layanan" cukup berupa modul di
> dalam Next.js. Lihat §8 Keputusan Terbuka.

---

## 4. 🧩 Modul Inti

### 4.1 Pencocokan Produk — **paling krusial**

Ini titik gagal paling umum di produk sejenis. Produk yang sama muncul dengan
nama berbeda di tiap sumber, dan SKU tidak konsisten antar toko.

**Pendekatan berlapis, dari murah ke mahal:**

| Lapis | Teknik | Kapan dipakai |
| --- | --- | --- |
| 1 | **Barcode (EAN/UPC)** — sudah ada di `Product.barcode` | Paling akurat; pakai duluan bila tersedia |
| 2 | **Normalisasi berbasis aturan** — huruf kecil, buang tanda baca, seragamkan satuan (`1L` = `1 liter` = `1000ml`) | Selalu, sebagai pra-proses |
| 3 | **Fuzzy matching** (Levenshtein / trigram) | Nama mirip, tanpa barcode |
| 4 | **Kemiripan embedding** (IndoBERT / MiniLM) | Kasus sulit yang lolos lapis 1–3 |

**Aturan wajib** (kesalahan di sini lebih merugikan daripada tidak mencocokkan):

- **Merek bersifat kritis** — beda merek = **bukan** produk sama
- **Ukuran/varian bersifat kritis** — 500ml ≠ 1L
- Perbedaan kecil boleh diabaikan — *"Indomie Goreng"* = *"Indomie Mi Goreng"*

> 💡 **Prinsip:** lebih baik menolak mencocokkan daripada salah mencocokkan.
> Salah cocok = menampilkan harga produk lain sebagai "lebih murah" — itu
> kebohongan, dan langsung membatalkan seluruh proposisi nilai.

### 4.2 Agregasi Harga

**Sumber:** scraper toko → API marketplace → urun-daya pengguna → OCR struk.

**Tantangan:** anti-scraping, format data tidak konsisten, geo-restriction.

**Penanganan:**
- Lapisan **cache** agar tidak menembak sumber berulang kali
- **Penjadwalan** crawler (cron / antrean), bukan hanya on-demand
- **Pipeline validasi**: buang harga yang mustahil (nol, negatif, menyimpang
  ekstrem dari median historis)
- **Dedup** — sudah diterapkan di `runScrapers.ts` (satu harga per produk × toko
  × sumber per hari)

### 4.3 OCR & Intelijen Struk

**Alur:** pengguna unggah struk → OCR → parsing → dipetakan ke produk → jadi
harga bersumber `receipt`.

Nilai gandanya: memberi **data nyata** sekaligus menyelesaikan masalah
"tidak bisa scrape toko fisik". Struk adalah bukti harga terkuat yang ada.

**Teknologi:** Tesseract (lokal, gratis) atau Google Vision (akurat, berbayar),
lalu regex + AI untuk parsing.

### 4.4 Mesin Rekomendasi

| Level | Kemampuan | Status |
| --- | --- | --- |
| 1 | Keranjang termurah di satu toko | ✅ **sudah ada** (`/api/compare`) |
| 2 | Optimasi lintas-toko (pecah belanja) | ❌ |
| 3 | Trade-off jarak vs harga vs promo | ❌ (butuh data lokasi) |

**Rumus penilaian** (skor rendah = lebih baik):

```
skor = w_harga × harga_ternormalisasi
     + w_jarak × jarak_ternormalisasi
     − w_promo × nilai_diskon
```

> ⚠️ **Koreksi terhadap rumus asal.** Versi awal menuliskan
> `+ promo_weight * diskon`. Bila skor bermakna "biaya" (rendah = baik), diskon
> harus **dikurangkan** — kalau ditambahkan, toko berdiskon justru dihukum.
> Selain itu ketiga suku wajib **dinormalkan ke 0–1** dulu; menjumlahkan Rupiah
> (puluhan ribu) dengan kilometer (satuan digit) membuat bobot jarak tak pernah
> berpengaruh.

### 4.5 Notifikasi

- Peringatan **harga turun** untuk produk yang dipantau
- **"Waktu terbaik membeli"** dari pola harga historis
- **Deteksi promo**

Prasyarat: model `User` + langganan produk. Butuh riwayat harga yang cukup
panjang agar "turun" bermakna — dengan data sekarang, semua sinyal palsu.

---

## 5. 🗄️ Desain Data

Perluasan dari skema yang ada (`Supermarket`, `Category`, `Product`, `Price`).

### Produk — tambahan

| Ladang | Guna |
| --- | --- |
| `normalizedName` | hasil normalisasi aturan, untuk pencocokan cepat |
| `embedding` | vektor kemiripan semantik |
| `barcode` | ✅ **sudah ada** |
| `brand`, `unit`, `category` | ✅ **sudah ada** |

### Harga — tambahan

| Ladang | Guna |
| --- | --- |
| `location` / `outletId` | harga bisa beda antar gerai di kota berbeda |
| `promoType`, `promoEnd` | bedakan harga normal vs promo |
| `confidence` | keyakinan, khusus untuk hasil OCR & urun-daya |
| `source`, `url`, `recordedAt` | ✅ **sudah ada** |

### Pengguna — model baru

```
User
  id
  preferences     (bobot: harga vs jarak vs merek)
  location        (koordinat / kota)
  searchHistory
  watchlist       → produk yang dipantau untuk notifikasi
```

> 🔐 Begitu model `User` ada, proyek ini mulai memegang **data pribadi**
> (lokasi + riwayat belanja = profil yang sensitif). Itu memunculkan kewajiban
> baru: persetujuan eksplisit, enkripsi, kebijakan privasi, dan aturan retensi.
> Rencanakan sejak awal, jangan ditambal belakangan.

---

## 6. 🤖 Prompt AI

Disimpan sebagai templat; `{{...}}` adalah slot yang diisi saat runtime.

### 6.1 Pencocokan Produk

```
You are an AI product matching system.

Task:
Determine whether two product names refer to the same product.

Rules:
- Ignore minor differences (e.g., "Indomie Goreng" vs "Indomie Mi Goreng")
- Consider size/variant (e.g., 500ml vs 1L = different)
- Consider brand as critical

Input:
Product A: "{{name1}}"
Product B: "{{name2}}"

Output:
{
  "is_match": true/false,
  "confidence": 0-1,
  "reason": "short explanation"
}
```

**Penerapan:** jangan panggil model untuk setiap pasang produk — mahal dan
lambat. Saring dulu dengan barcode + fuzzy matching, kirim ke model **hanya**
kandidat yang meragukan. Tetapkan ambang `confidence`; di bawah ambang →
perlakukan sebagai **tidak cocok**.

### 6.2 Pembersihan OCR Struk

```
You are an AI that extracts structured data from Indonesian shopping receipts.

Input:
Raw OCR text:
{{text}}

Output:
[
  {
    "product_name": "",
    "price": number,
    "quantity": number
  }
]

Rules:
- Ignore non-product text
- Normalize product names
- Fix OCR errors if obvious
```

**Penerapan:** "Fix OCR errors if obvious" berisiko — model bisa *mengarang*
harga yang terbaca buram. Simpan selalu teks OCR mentah di samping hasil
parsing, dan tandai baris hasil perbaikan agar bisa diaudit.

### 6.3 Rekomendasi Belanja

```
You are a smart shopping assistant.

User data:
- Location: {{location}}
- Product list: {{products}}

Available prices:
{{price_data}}

Task:
Recommend the cheapest and most efficient shopping plan.

Output:
{
  "total_cost": number,
  "recommended_store": "",
  "items": [],
  "reasoning": ""
}
```

**Penerapan:** perhitungan **total harga wajib dilakukan di kode**, bukan oleh
model — model bisa salah aritmetika. Pakai model untuk *penjelasan* dan
*penyusunan strategi*; angkanya dihitung dan diverifikasi program.

---

## 7. 🗺️ Tahapan Pengerjaan

Diurutkan berdasarkan ketergantungan, bukan kemudahan.

### Fase 0 — Fondasi Kejujuran Data — ✅ sebagian

- [x] Klasifikasi asal harga (`source.ts`)
- [x] Mode Semua vs Hanya Nyata
- [x] Halaman Bandingkan
- [x] Kerangka scraper + rute on-demand
- [ ] **Verifikasi di browser** — belum sekali pun dibuka

### Fase 1 — Bukti & Data Nyata 🔴 *gerbang untuk semua fase lain*

> 📋 **Rencana kerja rincinya ada di [`FASE-1-CHECKLIST.md`](FASE-1-CHECKLIST.md)** —
> termasuk normalisasi nama produk & tabel alias yang **dimajukan dari Fase 2**,
> karena pencocokan produk adalah titik gagal yang sesungguhnya.

- [ ] Jalankan aplikasi, buktikan fitur Fase 0 benar-benar bekerja
- [ ] Buktikan scraper `klikindomaret` menghasilkan harga; cocokkan nama field
      dengan respons asli
- [ ] Tambah minimal 2 adapter toko lagi
- [ ] Jadwalkan pengambilan berkala (bukan hanya on-demand)
- [ ] Uji otomatis untuk parser & logika penilaian
- **Target keluar:** harga nyata dari 10 → **500+ baris**, tak lebih tua dari 7 hari

### Fase 2 — Identitas Produk

*Prasyarat: Fase 1.* Multi-sumber tak ada gunanya bila produk tak bisa disatukan.

- [ ] Normalisasi berbasis aturan + `normalizedName`
- [ ] Pindai barcode di PWA (`BarcodeDetector` / pustaka kamera)
- [ ] Fuzzy matching untuk produk tanpa barcode
- [ ] Antrean tinjauan manual untuk pencocokan berkeyakinan rendah

### Fase 3 — Multi-Sumber

*Prasyarat: Fase 2.*

- [ ] API marketplace resmi bila tersedia — **utamakan di atas scraping**
- [ ] Urun-daya: pengguna melaporkan harga (butuh anti-penyalahgunaan)
- [ ] Pipeline validasi harga menyimpang

### Fase 4 — OCR Struk

*Prasyarat: Fase 2.* Sumber harga nyata terkuat untuk toko fisik.

- [ ] Unggah + OCR
- [ ] Parsing → pemetaan produk
- [ ] Konfirmasi pengguna sebelum disimpan

### Fase 5 — Pengguna, Lokasi & Rekomendasi Cerdas

- [ ] Model `User` + autentikasi + kebijakan privasi
- [ ] Lokasi gerai & pengguna
- [ ] Rekomendasi Level 2 & 3 dengan rumus §4.4

### Fase 6 — Notifikasi

*Prasyarat: Fase 5 + riwayat harga panjang.*

- [ ] Daftar pantau, peringatan harga turun, deteksi promo

### Fase 7 — Lapisan AI

*Prasyarat: Fase 2–5.* Sengaja **paling akhir** — AI memperbesar nilai data
yang bagus, dan sama-sama memperbesar kerusakan dari data yang buruk.

- [ ] Embedding untuk pencocokan sulit
- [ ] Penjelasan rekomendasi berbasis model

---

## 8. 🛠️ Keputusan Terbuka

Usulan tumpukan teknologi berbeda jauh dari kode yang ada. **Belum ada yang
diputuskan** — dicatat di sini supaya jadi pilihan sadar, bukan pergeseran diam-diam.

| Hal | Sekarang | Usulan | Pertimbangan |
| --- | --- | --- | --- |
| Backend | Next.js API Routes | FastAPI / Node terpisah | Pisah backend = dua basis kode. Route Handlers masih cukup sampai Fase 4 |
| Database | SQLite | PostgreSQL | **Perlu pindah** sebelum multi-pengguna. Prisma bikin migrasinya murah |
| Cache | tidak ada | Redis | Baru perlu saat crawler terjadwal jalan (Fase 1–3) |
| Pencarian | query Prisma | ElasticSearch | Kemungkinan berlebihan untuk 100 produk; tinjau ulang di ribuan SKU |
| Klien | PWA | Flutter | PWA sudah lintas-platform. Flutter menang untuk kamera/notifikasi native — pertimbangkan di Fase 2/6, bukan sekarang |
| AI | tidak ada | OpenAI / IndoBERT lokal | **Keputusan biaya.** Model lokal = gratis, jalan luring, tapi butuh RAM. Tinjau bersama batas perangkat |

**Rekomendasi:** pertahankan Next.js + Prisma sampai Fase 4. Pindah ke Postgres
saat model `User` masuk (Fase 5). Tunda semua yang lain sampai ada beban nyata
yang membenarkannya.

---

## 9. ⚠️ Risiko & Batas

| Risiko | Dampak | Sikap |
| --- | --- | --- |
| **Legal/ToS scraping marketplace** | Pemblokiran, tuntutan | Utamakan API resmi & kerja sama data. Patuhi `robots.txt` & ToS, beri rate limit. Sikap ini sudah tertulis di README — jangan dilanggar demi kecepatan |
| **Anti-scraping & geo-restriction** | Adapter mati diam-diam | Adapter defensif (sudah diterapkan), plus pemantauan "adapter ini berhenti menghasilkan data" |
| **Salah cocok produk** | Menampilkan harga produk lain sebagai lebih murah | Ambang keyakinan ketat; lebih baik tak mencocokkan |
| **Data basi** | Rekomendasi menyesatkan | Selalu tampilkan umur data; kedaluwarsakan harga terlalu tua |
| **Penyalahgunaan urun-daya** | Harga palsu | Reputasi pelapor + deteksi pencilan + butuh beberapa konfirmasi |
| **Halusinasi AI** | Angka karangan | Aritmetika di kode, bukan di model; simpan masukan mentah |
| **Privasi** | Lokasi + riwayat belanja = data sensitif | Persetujuan eksplisit, minimalkan data, aturan retensi |

---

## 10. 📌 Satu Kalimat Penutup

> Nilai produk ini bukan pada kecanggihan AI-nya, melainkan pada **apakah harga
> yang ditampilkan benar**. Setiap fase di atas disusun untuk melindungi hal
> itu — karena satu harga yang salah merusak kepercayaan lebih cepat daripada
> sepuluh fitur pintar membangunnya.

---

*Dokumen hidup — perbarui saat fase selesai atau keputusan §8 diambil.
Riwayat pengerjaan per sesi ada di [`CATATAN-SESI.md`](CATATAN-SESI.md).*
