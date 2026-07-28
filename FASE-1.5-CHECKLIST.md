# 🧩 Fase 1.5 — Penguatan Sistem Sebelum Skala

Bukan fitur baru. Ini penguatan supaya sistem **tidak runtuh saat data mulai
banyak**. Dikerjakan **setelah** [`FASE-1-CHECKLIST.md`](FASE-1-CHECKLIST.md),
**sebelum** menambah sumber data.

> **Gerbang keluar:** pencarian stabil, pencocokan ≥ 80% (dengan cara ukur yang
> sah), harga konsisten, API cepat, data tidak kacau, ada pencatatan log.

---

## 0. 🚨 Tiga Temuan dari Pemeriksaan Kode

Diverifikasi langsung di kode hari ini (`df31cff`) — bukan dugaan.

### 🔴 Temuan 1: setiap pencarian memuat **seluruh riwayat harga**

`src/lib/queries.ts`:

```ts
const priceInclude = {
  orderBy: { recordedAt: "desc" },
  include: { supermarket: true },
} as const;          // ← tidak ada `take`
```

`getProducts()` memakai ini **tanpa batas jumlah dan tanpa paginasi produk**.
Artinya satu kali membuka beranda menarik **100 produk × seluruh 16.390 baris
harga**, masing-masing di-*join* dengan tabel supermarket.

**Ini bukan risiko masa depan — ini sudah terjadi sekarang.** Dan sifatnya makin
buruk selamanya: setiap kali scraper jalan, riwayat bertambah, kueri melambat.
Inilah persis butir *"Query lambat → user drop"* di daftar titik gagal §11.

**Prioritas tertinggi di fase ini.**

### 🔴 Temuan 2: caching mustahil selama `force-dynamic` terpasang

**12 berkas** memakai `export const dynamic = "force-dynamic"`. Itu memang
disengaja — mode Nyata/Semua dibaca dari cookie, jadi halaman tak boleh statis.
Tapi konsekuensinya **seluruh caching Next.js mati**.

**Jadi cache tidak boleh dipasang di lapisan halaman.** Pasang di **lapisan
data**, dan kunci cache **wajib memuat mode**:

```
kunci = ["produk", kueri, kategori, realOnly]
```

> ⚠️ Kalau `realOnly` lupa dimasukkan ke kunci, pengguna mode **Hanya Nyata**
> akan disuguhi hasil mode **Semua** dari cache — artinya harga perkiraan tampil
> sebagai harga nyata. Itu membatalkan seluruh fitur kejujuran data.

### 🟠 Temuan 3: `/api/refresh` & `/api/scrape` terbuka tanpa pembatas

Keduanya `POST`, **tanpa autentikasi dan tanpa rate limit**, dan keduanya
**memicu permintaan keluar ke situs pihak ketiga**. Siapa pun yang tahu
alamatnya bisa memaksa aplikasi Anda membanjiri Klik Indomaret / Open Prices —
atas nama Anda.

Ini bukan sekadar soal beban server sendiri; ini soal **tidak menjadi sumber
gangguan bagi situs orang lain**, yang juga jadi sikap etis di README.

---

## 1. 🔒 Kendali Mutu Data

### 1.1 Validasi harga

| Aturan | Status |
| --- | --- |
| Tolak harga ≤ 0 | ✅ **sudah ada** — `runScrapers.ts` menolak `!isFinite \|\| <= 0` |
| Tolak harga tak masuk akal (Indomie = 100.000) | ❌ belum |
| Rentang wajar per kategori | ❌ belum |

- [ ] Tolak harga menyimpang ekstrem dari **median historis** produk itu
      (mis. di luar 0,25×–4× median) — lebih tahan banting daripada rentang tetap
- [ ] Kalau belum ada riwayat, pakai rentang per kategori sebagai jaring pengaman
- [ ] Harga yang ditolak **dicatat**, jangan dibuang diam-diam — itu sinyal
      parser rusak

### 1.2 Cegah harga ganda

- [x] **Sudah ada** — `runScrapers.ts`: satu harga per (produk × toko × sumber)
      per hari
- [ ] Terapkan aturan yang sama pada **input manual** & jalur `api/refresh`
- [ ] Kalau harga sama persis dengan catatan terakhir, cukup perbarui
      `recordedAt` — jangan tumpuk baris identik

### 1.3 Kendali waktu

- [x] Semua harga punya `recordedAt` — **sudah ada**
- [ ] Tandai **"kedaluwarsa"** bila > 7 hari
- [ ] Tampilkan umur data di UI ("dicek 3 hari lalu")

> ⚠️ **Catatan penting.** Harga terakhir tercatat **24 Juni 2026** — sudah
> **34 hari**. Kalau tanda "kedaluwarsa" dipasang hari ini, **100% data akan
> tertandai merah**. Tanda ini baru bermakna setelah Fase 1 mengisi data segar.
> Pasang logikanya sekarang, nyalakan tampilannya setelah ada data baru.

---

## 2. ⚡ Performa

### 2.1 Batasi kueri — **kerjakan duluan** 🔴

- [ ] Beri `take` pada `priceInclude` — cukup **harga terbaru per toko**, bukan
      seluruh riwayat
- [ ] Riwayat lengkap hanya diambil di halaman detail produk (untuk grafik tren)
- [ ] Ukur sebelum & sesudah, catat angkanya

### 2.2 Indeks

| Indeks | Status |
| --- | --- |
| `prices.productId` | ✅ **sudah ada** — `@@index([productId, supermarketId, recordedAt])` |
| `prices.recordedAt` | ✅ **sudah ada** |
| `products.normalizedName` | ⏳ dijadwalkan di Fase 1 |
| `productAlias.normalizedAlias` | ⏳ dijadwalkan di Fase 1 |

### 2.3 Caching

- [ ] Cache di **lapisan data**, bukan halaman (lihat Temuan 2)
- [ ] Kunci cache **wajib memuat `realOnly`**
- [ ] TTL: pencarian **10 menit**, daftar harga **5 menit**
- [ ] Batalkan cache begitu Refresh/scrape memasukkan harga baru
- [ ] Redis **belum perlu** — cache dalam proses sudah cukup untuk skala ini

### 2.4 Paginasi

- [ ] Batasi hasil pencarian (10–20 item)
- [ ] Halaman `/bandingkan` sudah membatasi 50 — samakan polanya
- [ ] Jangan pernah memuat seluruh tabel produk sekaligus

---

## 3. 🧠 Pencocokan Cerdas — ✅ sudah dirancang

Seluruh isi bagian ini **sudah terspesifikasi** di
[`FASE-1-CHECKLIST.md` §1](FASE-1-CHECKLIST.md):

| Diminta | Di mana |
| --- | --- |
| Pencocokan berbasis token | §1.1 — keterkandungan token |
| Merek wajib cocok | §1.3 — gerbang keras |
| Varian/ukuran | §1.3 — gerbang keras |
| Abaikan kata umum (mie/susu/air) | §1.2 — `KATA_KATEGORI` opsional |
| Sistem skor | §3.1 — `cocok()` mengembalikan skor |

**Tidak perlu kerja tambahan.** Cukup pastikan Fase 1 mengerjakannya.

Satu penyesuaian: **ukuran bukan opsional.** Spesifikasi menyebut
*"variant (ukuran) opsional match"* — tapi `Aqua 600ml` dan `Aqua 1500ml` adalah
produk berbeda dengan harga berbeda. Menyamakannya = menampilkan harga salah.
Ukuran tetap **gerbang keras**.

---

## 4. 🧱 Struktur Backend

Struktur sekarang sudah berlapis secara de-facto:

```
app/api/*/route.ts   → lapisan API   (tipis, sudah benar)
lib/queries.ts       → logika + akses DB   ← 640 baris, campur aduk
lib/db.ts            → klien Prisma
```

- [ ] Pecah `queries.ts` per modul: `product.ts`, `price.ts`, `search.ts`
- [ ] Pisahkan **logika** (menentukan termurah, skor) dari **akses DB** — supaya
      logikanya bisa diuji tanpa database
- [ ] Bentuk balasan error yang seragam:
      `{ success: false, message: "..." }`
- [ ] Jangan bocorkan pesan error mentah ke pengguna (`api/scrape` sekarang
      mengembalikan `e.message` apa adanya)

> 💬 **Catatan jujur.** Pola Controller/Service/Repository lengkap **berlebihan**
> untuk ukuran proyek ini — itu pola dunia Java/Spring, dan Next.js Route
> Handlers sudah berperan sebagai controller. Yang benar-benar berharga dari
> butir ini cuma satu: **pecah `queries.ts` yang 640 baris**. Sisanya seremonial
> yang menambah berkas tanpa menambah keandalan.

---

## 5. 🔄 Pipeline Pembaruan Data

Sekarang: `npm run scrape` manual + tombol Refresh. Tidak ada penjadwalan,
tidak ada percobaan ulang, tidak ada log.

- [ ] **Penjadwalan** — perbarui harga tiap X jam
  - Di PC Windows: **Task Scheduler** memanggil `npm run scrape`
  - Bila kelak di-*hosting*: cron platform
  - `setInterval` di dalam Next.js **bukan** solusi — mati saat proses restart
- [ ] **Percobaan ulang** 2–3 kali dengan jeda menaik saat gagal ambil
- [ ] **Pencatatan log**:
  - [ ] scraper berhasil/gagal, berapa baris masuk
  - [ ] error API
  - [ ] kegagalan pencocokan
  - [ ] harga ditolak validasi (§1.1)
- [ ] Log tersimpan (berkas/tabel), bukan cuma `console.log` yang hilang

> Adapter yang **mati diam-diam** adalah kegagalan terburuk: tampilan tetap
> normal, harga diam-diam basi. Log yang bisa dibaca ulang adalah satu-satunya
> cara tahu.

---

## 6. 📊 Analitik

- [ ] Tabel `SearchLog`: kueri, jumlah hasil, produk yang diklik, waktu
- [ ] Produk paling sering dicari
- [ ] **Kueri yang gagal** — ini paling berharga: langsung jadi daftar alias
      yang perlu ditambahkan
- [ ] Jumlah pencarian harian
- [ ] Klik ke tautan toko

> 💡 **Gabungkan dengan §10.** "Analitik" dan "data latih untuk AI" adalah
> **tabel yang sama** — kueri mentah + hasil pencocokan. Jangan bikin dua.

> 🔐 Kueri pencarian adalah data pengguna. Kalau nanti ada model `User`, ini
> jadi data pribadi — rencanakan retensi & anonimisasi sejak sekarang.

---

## 7. 🧪 Penanganan Kasus Tepi

| Kasus | Status |
| --- | --- |
| Produk tidak ditemukan | ✅ **sudah ada** — tampilan kosong di beranda & `/bandingkan` |
| Harga kosong → "Tidak tersedia" | ✅ **sudah ada** — `sourceKind: "none"` |
| Nama ambigu (`"Aqua"` → banyak ukuran) | ✅ **sudah jalan** — tiap ukuran adalah baris produk sendiri |

Sisa kerja:

- [ ] Saran saat pencarian nihil ("maksud Anda…?") — pakai kueri gagal dari §6
- [ ] Saat harga kosong, tampilkan **data lama + umurnya**, jangan kosong total
- [ ] Urutkan varian ambigu berdasarkan ukuran, bukan abjad

---

## 8. 🛡️ Keamanan

### 8.1 Sanitasi masukan

- [x] **SQL injection sudah tertangani** — Prisma memakai kueri berparameter di
      semua jalur; proyek ini tidak punya satu pun SQL mentah

> ⚠️ **Jangan tulis escaping manual.** Menambahkan escaping buatan sendiri di
> atas ORM tidak menambah keamanan dan justru sering **merusak** data yang sah
> (nama produk bertanda kutip, misalnya). Butir ini boleh dicoret.

Yang **benar-benar** perlu:

- [ ] Validasi bentuk & batas masukan (panjang kueri, tipe, rentang angka)
- [ ] Escape saat **menampilkan** — React sudah otomatis; jangan pakai
      `dangerouslySetInnerHTML`

### 8.2 Pembatasan laju & akses

- [ ] 🔴 **Lindungi `POST /api/refresh` & `POST /api/scrape`** (Temuan 3)
- [ ] Rate limit per IP untuk pencarian
- [ ] Rute admin (Fase 1 §4) wajib bersandi
- [ ] Jangan kembalikan pesan error internal ke publik

---

## 9. 🧩 Frontend — hampir semuanya sudah ada

| Diminta | Status |
| --- | --- |
| Input pencarian | ✅ `SearchControls` |
| Daftar hasil: sumber, harga, tautan | ✅ `ProductCard`, `CompareTable` |
| Penanda "Termurah" | ✅ ada di `CompareTable` & `CartView` |
| Saran otomatis saat mengetik | ❌ opsional |

- [ ] Tambahkan **umur data** di kartu harga ("dicek 3 hari lalu")
- [ ] Saran otomatis *(opsional, kerjakan terakhir)*

---

## 10. 🚀 Persiapan Fase 2 (siap-AI)

- [ ] Simpan **kueri mentah pengguna** + hasil pencocokan (tabel §6)
- [ ] Kumpulkan **alias produk** & variasi nama — tabel `ProductAlias` dari
      Fase 1 **sudah menjadi dataset itu sendiri**
- [ ] Tandai pencocokan yang dikoreksi manusia → ini label emas untuk pelatihan

> Setiap alias yang Anda masukkan manual di Fase 1 sekarang, otomatis jadi data
> latih di Fase 2. Kerja itu tidak terbuang.

---

## 11. ⚠️ Titik Gagal Nyata — pemeriksaan jujur

| Titik gagal | Kondisi kita |
| --- | --- |
| **Data awal tidak cukup** | 🔴 **BENAR TERJADI** — 10 harga nyata dari 16.390 |
| **Pencocokan terlalu naif** | 🔴 **BENAR TERJADI** — masih `contains` mentah |
| **Scraping tidak stabil** | 🟠 belum terbukti jalan sama sekali |
| **Tidak ada log → tak tahu error** | 🔴 **BENAR TERJADI** — tidak ada pencatatan |
| **Kueri lambat** | 🔴 **BENAR TERJADI** — Temuan 1 |

**Lima dari lima sudah terjadi.** Daftar ini bukan peringatan buat nanti — ini
deskripsi keadaan sekarang. Justru bagus: semuanya sudah punya rencana perbaikan
di Fase 1 & 1.5.

---

## 12. 🎯 Checklist Akhir Sebelum Fase 2

- [ ] Pencarian stabil
- [ ] Pencocokan akurat **≥ 80%** — *lihat cara ukur di bawah*
- [ ] Harga konsisten
- [ ] API cepat
- [ ] Data tidak kacau
- [ ] Ada pencatatan log

### Cara mengukur "≥ 80%" supaya bukan sekadar klaim

Angka akurasi tanpa cara ukur cuma hiasan. Yang bisa dibuktikan:

- [ ] Susun **himpunan uji berlabel**: 50 pasang `kueri → produk yang benar`
  - ambil dari kueri gagal nyata (§6), bukan karangan sendiri
  - sertakan kasus sulit: urutan kata terbalik, salah ketik, merek mirip,
    ukuran berbeda
- [ ] Ukur dua angka **terpisah** — keduanya wajib dilaporkan:

| Angka | Arti | Target |
| --- | --- | --- |
| **Presisi** | dari yang dicocokkan, berapa persen benar | **≥ 95%** |
| **Recall** | dari yang seharusnya ketemu, berapa persen ketemu | **≥ 80%** |

> Presisi dipatok lebih tinggi **dengan sengaja**. Tidak ketemu itu
> mengecewakan; salah ketemu itu **menyesatkan orang saat belanja**. Sistem
> yang mencocokkan segalanya bisa mencetak recall 100% dan tetap tak berguna.

- [ ] Jalankan himpunan uji ini di `npm test` — jadi angkanya terpantau tiap
      perubahan, bukan diukur sekali lalu dilupakan

---

## 📋 Urutan Kerja

| # | Langkah | Kenapa urutannya begitu |
| --- | --- | --- |
| 1 | Batasi `priceInclude` + paginasi (§2.1, §2.4) | Masalah nyata, sedang berlangsung |
| 2 | Pencatatan log (§5) | Tanpa ini, perbaikan berikutnya tak terukur |
| 3 | Lindungi `/api/refresh` & `/api/scrape` (§8.2) | Celah terbuka, perbaikannya kecil |
| 4 | Validasi harga (§1.1) | Jaga data tetap bersih sejak awal pengisian |
| 5 | Pecah `queries.ts` (§4) | Lebih mudah dilakukan sebelum berkasnya makin besar |
| 6 | Caching berkunci-mode (§2.3) | Setelah kuerinya benar; percuma men-cache kueri buruk |
| 7 | Tabel log pencarian (§6 + §10) | Butuh trafik nyata dulu supaya berguna |
| 8 | Himpunan uji + ukur presisi/recall (§12) | Gerbang keluar |

---

*Riwayat per sesi: [`CATATAN-SESI.md`](CATATAN-SESI.md) ·
Fase sebelumnya: [`FASE-1-CHECKLIST.md`](FASE-1-CHECKLIST.md) ·
Arah besar: [`PETA-JALAN.md`](PETA-JALAN.md)*
