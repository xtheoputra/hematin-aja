# ✅ Fase 1 — Checklist Eksekusi MVP Inti

Daftar kerja yang bisa langsung dieksekusi, dengan **status nyata** terhadap
kode hari ini (commit `12fe7dc`).

> **Sasaran Fase 1:** pengguna bisa cari produk → melihat harga termurah dari
> **≥ 2 sumber nyata**, dengan pencocokan yang tidak kacau, **tanpa AI**.

**Kaitan dengan [`PETA-JALAN.md`](PETA-JALAN.md):** dokumen ini menggabungkan
*Fase 1 (Bukti & Data Nyata)* dengan bagian penting *Fase 2 (Identitas Produk)*,
dan sengaja **memajukan pencocokan produk** — karena di situlah titik gagalnya.
Peta jalan tetap jadi arah besar; berkas ini adalah rencana kerjanya.

---

## 0. 📊 Baca Ini Dulu — Apa yang Sudah Ada

Sebagian besar "System Requirements" **sudah terpasang**, bahkan lebih kaya dari
yang diminta. Jangan bangun ulang.

| Kebutuhan | Status | Kenyataan di kode |
| --- | --- | --- |
| Tabel Products | ✅ **ada, lebih lengkap** | `Product` — punya `slug`, `brand`, `unit`, `emoji`, `image`, **`barcode` (unique)**, `categoryId`, `createdAt` |
| Tabel Prices | ✅ **ada, lebih lengkap** | `Price` — punya `supermarketId`, `inStock`, `url`, `source`, `recordedAt` (riwayat sudah jalan) |
| API cari produk | ✅ **ada** | `GET /api/products?q=…&kategori=…` |
| Harga urut termurah | ✅ **ada** | `getProductDetail` + `compareCart` sudah mengurutkan menaik |
| Sortir & banding antar sumber | ✅ **ada** | halaman `/bandingkan` + `POST /api/compare` |
| **Kolom `normalized_name`** | ❌ **belum** | — |
| **Tabel Product Alias** | ❌ **belum** | **inti kekurangan Fase 1** |
| **Fungsi normalisasi** | ❌ **belum** | pencarian masih `contains` mentah pada `name`/`brand` |
| **Form input admin** | ❌ **belum** | belum ada halaman admin sama sekali |
| Uji otomatis | ❌ **belum** | belum ada `npm test` |

### 🔬 Bukti kekurangannya

`src/lib/queries.ts` → `getProducts()` menjalankan:

```ts
OR: [ { name: { contains: search } }, { brand: { contains: search } } ]
```

Konsekuensinya, persis seperti dugaan checklist:

| Masukan | Hasil sekarang |
| --- | --- |
| `indomie goreng` | ✅ ketemu |
| `mie goreng indomie` | ❌ **tidak ketemu** — urutan kata berbeda |
| `indomie mi goreng` | ❌ **tidak ketemu** |

**Jadi kerja Fase 1 yang sesungguhnya = normalisasi + alias + admin input.**
Sisanya sudah berdiri.

---

## 1. ⚠️ Koreksi Spesifikasi Sebelum Dikerjakan

### 1.1 Aturan normalisasi "hapus 'mie'/'mi'" — **jangan diterapkan apa adanya**

Spesifikasi asal: *Remove: "mie", "mi", simbol*.

**Masalahnya:**

| Cara | Akibat |
| --- | --- |
| Hapus sebagai **substring** | `"indomie"` → `"indo"` — **merusak nama merek** |
| Hapus sebagai **token utuh** | `"Mie Sedaap"` → `"Sedaap"` — hilang informasi jenis produk; bisa tertukar dengan "Kecap Sedaap" |

**Ganti dengan: samakan sinonim + cocokkan sebagai himpunan token.**

```
normalize(teks):
  1. huruf kecil semua
  2. buang tanda baca & simbol
  3. samakan sinonim TOKEN UTUH (bukan substring):
       mi → mie      ltr → l       gr → g
       susu uht → susu             pcs → pc
  4. seragamkan satuan:  1 liter = 1l = 1000ml
  5. rapatkan spasi berlebih
  6. urutkan token menaik  →  simpan ke normalized_name
```

**Pencocokan memakai *keterkandungan token*, bukan kesamaan persis:**

> Bila **semua** token kueri ada di dalam token produk → **cocok**.

Uji dengan kasus dari checklist:

| Kueri | Token kueri | Token produk `Indomie Goreng` | Hasil |
| --- | --- | --- | --- |
| `indomie goreng` | `{goreng, indomie}` | `{goreng, indomie}` | ✅ cocok |
| `mie goreng indomie` | `{goreng, indomie, mie}` | `{goreng, indomie}` | ⚠️ token `mie` berlebih → tangani via §1.2 |
| `indomie mi goreng` | `{goreng, indomie, mie}` | `{goreng, indomie}` | ⚠️ sama seperti di atas |

### 1.2 Kata kategori bersifat opsional

Token generik — `mie`, `susu`, `air`, `minyak`, `teh` — diperlakukan sebagai
**opsional**: kalau ada dianggap bonus, kalau tidak ada tidak menggugurkan.
Dengan aturan ini ketiga kasus di atas **cocok semua** tanpa menghapus apa pun.

Simpan daftarnya sebagai konstanta, mudah ditambah:

```ts
const KATA_KATEGORI = new Set(["mie", "susu", "air", "minyak", "teh", "kopi", "gula"]);
```

### 1.3 Gerbang keras — **tidak boleh dilanggar**

Betapa pun miripnya, **bukan** produk sama bila:

- **Merek berbeda** — `Indomie Goreng` ≠ `Mie Sedaap Goreng`
- **Ukuran/varian berbeda** — `Aqua 600ml` ≠ `Aqua 1500ml`

> Salah cocok = menampilkan harga produk lain sebagai "lebih murah". Itu
> kebohongan, dan lebih merugikan daripada tidak ketemu sama sekali.

### 1.4 `source` vs `Supermarket` — jangan digabung

Spesifikasi asal menaruh `Shopee / Tokopedia / Manual` di satu kolom `source`.
Proyek ini sudah memisahkannya jadi **dua sumbu**, dan pemisahan itu lebih baik:

| Sumbu | Menjawab | Nilainya sekarang |
| --- | --- | --- |
| `Supermarket` (entitas) | **Di toko mana?** | 18 toko: Indomaret, Alfamart, … |
| `Price.source` | **Dari mana kita tahu?** | `seed`, `import-off`, `open-prices`, `scrape` |

**Keputusan:** pertahankan dua sumbu.
- Shopee & Tokopedia → jadi baris **`Supermarket` baru** dengan `type = "Marketplace"`
- Input manual → nilai **`source` baru**: `manual` (dan nanti `receipt`)

Ini penting karena seluruh lapisan kejujuran data (`lib/source.ts`, mode Nyata)
bergantung pada `source` yang bermakna asal-usul, bukan nama toko.

### 1.5 Tumpukan teknologi — tetap Next.js

Spesifikasi asal meminta **FastAPI/Express + PostgreSQL**. Keputusan
[`PETA-JALAN.md` §8](PETA-JALAN.md) tetap berlaku: **bertahan di Next.js +
Prisma sampai Fase 4**, pindah Postgres saat model `User` masuk.

Alasannya: menulis ulang backend sekarang membuang aplikasi yang sudah
*build* hijau dan **tidak menambah satu pun** kemampuan Fase 1 — semua yang
dibutuhkan (API cari, API harga, admin form) bisa dikerjakan di Route Handlers
yang sudah ada. Redis juga belum perlu; belum ada beban yang membenarkannya.

> Kalau Anda tetap mau pindah ke FastAPI, itu keputusan Anda — bilang saja,
> nanti saya susun rencana migrasinya. Tapi jangan dilakukan **sambil**
> mengerjakan Fase 1; dua perubahan besar sekaligus bikin gagalnya sulit
> dilacak.

---

## 2. 🗄️ Perubahan Skema

### 2.1 `Product` — tambah satu kolom

```prisma
normalizedName  String  @default("")
@@index([normalizedName])
```

### 2.2 `ProductAlias` — tabel baru ⭐ *paling krusial*

```prisma
model ProductAlias {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  alias          String              // nama apa adanya dari sumber
  normalizedAlias String             // hasil normalize(alias)
  source         String?             // asal alias: toko/marketplace mana
  createdAt      DateTime @default(now())

  @@index([normalizedAlias])
  @@index([productId])
}
```

Alias adalah **jalan keluar** untuk kasus yang tak tertangani algoritma —
tanpa ini, setiap nama tak lazim butuh perubahan kode.

- [ ] Tambah `normalizedName` ke `Product`
- [ ] Tambah model `ProductAlias`
- [ ] `npx prisma db push`
- [ ] Skrip pengisi ulang: hitung `normalizedName` untuk 100 produk yang ada

---

## 3. ⚙️ Logika Inti

### 3.1 `src/lib/normalize.ts` — berkas baru

- [ ] `normalize(teks): string` — sesuai langkah §1.1
- [ ] `tokenize(teks): string[]`
- [ ] `KATA_KATEGORI` — daftar token opsional
- [ ] `cocok(kueri, produk): { cocok: boolean; skor: number }` — keterkandungan token
- [ ] Gerbang merek & ukuran (§1.3)

### 3.2 Alur pencarian

- [ ] Masukan pengguna → `normalize()`
- [ ] Cari **persis** di `Product.normalizedName`
- [ ] Bila kosong → cari di `ProductAlias.normalizedAlias`
- [ ] Bila masih kosong → keterkandungan token
- [ ] Bila masih kosong → *(opsional)* fuzzy toleransi salah ketik ringan
- [ ] Kembalikan terurut berdasarkan skor

### 3.3 Pengurutan harga

- [x] Ambil semua harga, urutkan menaik — **sudah ada**
- [ ] Pastikan urutan tetap benar saat mode **Hanya Nyata** aktif

---

## 4. 🔌 API

| Endpoint | Status | Kerja |
| --- | --- | --- |
| `GET /api/products?q=` | ✅ ada | ganti `contains` → alur §3.2 |
| `GET /api/products/{id}/prices` | ❌ | rute baru; logikanya sudah ada di `getProductDetail` |
| `POST /api/admin/products` | ❌ | tambah produk |
| `POST /api/admin/prices` | ❌ | tambah harga manual (`source = "manual"`) |
| `POST /api/admin/aliases` | ❌ | tambah alias |

- [ ] Semua rute admin **wajib berpelindung sandi** — jangan biarkan terbuka
- [ ] Validasi masukan: harga > 0, produk & toko wajib ada

---

## 5. 🖥️ Halaman Admin

- [ ] `/admin` — terlindung sandi
- [ ] Form tambah/sunting produk
- [ ] Form **input harga manual** (produk × toko × harga × tanggal)
- [ ] Form tambah alias
- [ ] Tabel produk tanpa harga nyata → daftar kerja yang kelihatan

---

## 6. 📦 Strategi Data

### 6.1 Fokus satu kategori — **mie instan**

Saran fokus ini **menyelesaikan kebuntuan utama** proyek. Membuat 100 produk ×
18 toko punya harga nyata mustahil; **15 produk mie instan × 5 toko = 75 harga
nyata** bisa selesai dalam hitungan hari.

> **Jangan hapus data lain.** 100 produk tetap bisa dijelajahi. Yang difokuskan
> adalah **usaha pengumpulan harga nyata**, bukan cakupan katalog. Mode
> **Hanya Nyata** yang sudah ada otomatis menampilkan hasil fokus ini dengan
> rapi.

- [ ] Tandai ~15 produk mie instan sebagai kumpulan fokus
- [ ] Isi harga nyata untuk ≥ 5 toko × 15 produk

### 6.2 Manual dulu, scraping belakangan

Perubahan sikap dari sesi sebelumnya — dan **saya setuju**: scraper
`klikindomaret` belum terbukti dan diduga terkunci geo-restriction. Input manual
menghasilkan harga nyata dalam hitungan hari, bukan minggu.

- [ ] Input manual jadi jalur utama Fase 1
- [ ] `klikindomaret` **tetap ada**, tapi turun status jadi eksperimen
- [ ] Jangan tambah adapter scraper baru sampai Fase 1 selesai

---

## 7. 🧪 Uji

Belum ada `npm test`. Pasang kerangka uji sekalian di fase ini.

### Uji pencarian

- [ ] `"indomie goreng"` → cocok
- [ ] `"mie goreng indomie"` → **tetap cocok** (urutan kata berbeda)
- [ ] `"indomie mi goreng"` → **tetap cocok** (sinonim `mi`/`mie`)
- [ ] `"INDOMIE GORENG"` → cocok (tak peduli huruf besar-kecil)
- [ ] `"indomie   goreng!!"` → cocok (simbol & spasi berlebih)
- [ ] `"indomie goreng"` **tidak** cocok dengan `"Mie Sedaap Goreng"` (gerbang merek)
- [ ] `"aqua 600ml"` **tidak** cocok dengan `"Aqua 1500ml"` (gerbang ukuran)
- [ ] Salah ketik ringan `"indomi goreng"` → *(opsional)*

### Uji harga

- [ ] Toko A `3000`, Toko B `3200` → **A muncul lebih dulu**
- [ ] Produk tanpa harga → tidak *crash*, tampil "tidak tersedia"
- [ ] Mode Hanya Nyata → harga perkiraan tersembunyi, urutan tetap benar

### Uji kestabilan

- [ ] API tidak melempar error pada kueri kosong / aneh / sangat panjang
- [ ] Bentuk balasan konsisten
- [ ] `npx tsc --noEmit` nol error
- [ ] `npm run build` hijau

---

## 8. 🚨 Definisi Selesai

Fase 1 dinyatakan selesai **hanya bila semuanya tercentang**:

- [ ] Bisa mencari produk dengan urutan kata bebas
- [ ] Bisa melihat harga dari **≥ 2 sumber nyata**
- [ ] Pencocokan tidak kacau — semua uji §7 lulus
- [ ] **Tidak bergantung AI sama sekali**
- [ ] API tidak *crash*
- [ ] **Aplikasi sudah benar-benar dibuka di browser** ⚠️ *utang dari sesi lalu*
- [ ] Harga nyata naik dari **10** → **≥ 75** baris

## ⛔ Aturan Berhenti

**JANGAN lanjut ke Fase 2** selama masih ada satu pun yang benar:

- [ ] Data masih berantakan
- [ ] Pencocokan masih sering salah
- [ ] API belum stabil
- [ ] Fitur belum pernah dilihat pengguna nyata

---

## 9. 🔜 Fase 2 (pratinjau — jangan dikerjakan sekarang)

- OCR struk
- Pencocokan produk berbasis AI (embedding)
- Alur data otomatis

---

## 10. 🎯 Prinsip Kerja

1. **Fokus satu kategori** — mie instan dulu, selesaikan tuntas
2. **Jangan kejar banyak fitur** — Fase 1 hanya cari + harga + admin
3. **Validasi ke pengguna nyata** sebelum menambah apa pun
4. **Nama lebih baik tidak ketemu daripada salah ketemu**

---

## 📋 Urutan Kerja yang Disarankan

Diurutkan supaya setiap langkah bisa diverifikasi sebelum lanjut:

| # | Langkah | Kenapa duluan |
| --- | --- | --- |
| 1 | Buka aplikasi di browser, buktikan fitur sesi lalu | Utang verifikasi; jangan menumpuk di atas yang belum terbukti |
| 2 | Pasang kerangka uji | Semua langkah berikutnya butuh bukti otomatis |
| 3 | `normalize.ts` + ujinya | Murni logika, bisa diuji tanpa DB |
| 4 | Skema: `normalizedName` + `ProductAlias` | Perubahan data, sekali jalan |
| 5 | Sambungkan pencarian ke alur baru | Baru bermakna setelah 3 & 4 |
| 6 | Halaman admin + rute berpelindung sandi | Alat untuk mengisi data |
| 7 | Isi 15 produk mie instan × 5 toko | Pekerjaan data, pakai alat dari 6 |
| 8 | Jalankan seluruh uji §7 + Definisi Selesai §8 | Gerbang keluar Fase 1 |

---

*Perbarui centangnya sambil jalan. Riwayat per sesi:
[`CATATAN-SESI.md`](CATATAN-SESI.md) · Arah besar: [`PETA-JALAN.md`](PETA-JALAN.md)*
