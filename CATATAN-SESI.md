# 📝 Catatan Sesi — Hematin Aja

Riwayat pekerjaan per sesi, ditulis agar sesi berikutnya bisa langsung nyambung
tanpa membaca ulang seluruh kode.

---

## 🌅 BESOK MULAI DARI SINI

**Kondisi tinggal:** `npx tsc --noEmit` nol error, `npm run build` hijau,
**`npm test` 166/166 lulus**, aplikasi sudah dijalankan & diperiksa
(9 halaman `200`, log bersih).

### ⚠️ Pertama: setel sandi admin Anda sendiri

Sesi ini membuat `.env.local` berisi sandi sementara **`hematin-dev-2026`**.
Berkas itu **tidak** dilacak git, tapi tetap **ganti nilainya** sebelum
aplikasinya dipakai serius:

```
ADMIN_PASSWORD="sandi-pilihan-anda"
```

### Langkah pertama: **isi harga nyata**

Seluruh pekerjaan **kode** Fase 1 & 1.5 sudah selesai. Yang tersisa sekarang
murni **pekerjaan data**, dan alatnya sudah ada:

1. Buka `/admin`, masuk pakai sandi.
2. Bar "Kemajuan harga nyata" menunjukkan angka sesungguhnya — sekarang
   **10 dari 100 produk (10%)**, 11 baris harga nyata.
3. Tabel "Belum punya harga nyata" adalah antreannya, yang paling kosong di atas.
4. Fokus **satu kategori dulu: mie instan**. 15 produk × 5 toko = 75 harga nyata,
   selesai dalam hitungan hari. Tersebar tipis ke 100 produk tidak akan pernah
   terasa selesai.
5. Ukur kapan saja: `npm run db:statistik`.

Setelah ada ≥ 75 harga nyata, mode **Hanya Nyata** akhirnya berisi sesuatu, dan
Definisi Selesai Fase 1 (`FASE-1-CHECKLIST.md` §8) tinggal satu baris lagi.

### ✅ Keputusan yang SUDAH diambil — jangan dibahas ulang

| Keputusan | Isinya |
| --- | --- |
| **Cakupan** | Tetap penuh (18 toko × 100 produk). Kejujurannya lewat **label**, bukan mengecilkan katalog |
| **Tumpukan** | Tetap Next.js + Prisma. FastAPI/Flutter/Elasticsearch/MongoDB/Redis **ditolak** untuk sekarang |
| **Urutan AI** | Embedding & LLM = fase **paling akhir**, bergerbang bukti kegagalan nyata |
| **OCR** | Tidak menunggu embedding — boleh dinaikkan lebih awal |
| **Rekomendasi** | Konflik cross-sell vs hemat di `FASE-4` §0 **masih menunggu keputusan Anda** |

### ⛔ Jangan dikerjakan dulu

- **Fase 2 (embedding)** — gerbang masuknya adalah **bukti kegagalan nyata**
  dari log kueri gagal. Log-nya baru saja mulai terisi; belum ada buktinya.
- **Adapter scraper baru** — `klikindomaret` masih belum terbukti jalan.
  Input manual lebih cepat berbuah.
- **Menulis dokumen rencana baru** — rasionya sudah berat ke rencana.

---

## Sesi 6 — 4 Agustus 2026 · "Semua PR Dikerjakan"

**Status akhir:** `tsc` nol error, `npm run build` hijau, **`npm test` 166/166**,
aplikasi dijalankan & diperiksa langsung.

Sesi ini menutup **seluruh** butir terbuka Fase 1 **dan** Fase 1.5 sekaligus.

### Yang dikerjakan

| # | Pekerjaan | Hasil |
| --- | --- | --- |
| 1 | **Kerangka uji** | `npm test` — kerangka sendiri di `uji/`, **nol dependensi baru** (pakai `tsx` yang sudah ada) |
| 2 | **Normalisasi & pencocokan** | `src/lib/normalize.ts` — murni, tanpa DB. Token diseragamkan & diurutkan; gerbang keras merek + ukuran |
| 3 | **Skema** | `normalizedName` + `ProductAlias` + `SearchLog` + `EventLog`. 100 produk dinormalisasi, 45 alias dari slug |
| 4 | **Alur pencarian** | persis → alias → token → typo, berhenti di tingkat pertama yang berhasil |
| 5 | **Batas kueri harga** | **16.390 → 399 baris, 353 ms → 35 ms** (`npm run ukur`) + paginasi 24/halaman |
| 6 | **Log tersimpan** | tabel `EventLog` + percobaan ulang berjeda menaik; terbaca di `/admin` |
| 7 | **Keamanan** | `/api/refresh` & `/api/scrape` **bersandi + rate limit**; error mentah tak lagi bocor |
| 8 | **Validasi harga** | median historis 0,25×–4× + jaring pengaman kategori; penolakan dicatat |
| 9 | **Halaman `/admin`** | login, 3 form, daftar kerja, kueri gagal, catatan kejadian |
| 10 | **Pecah `queries.ts`** | 718 baris → 7 modul; logika murni terpisah dari Prisma |
| 11 | **Caching** | lapisan data, kunci **wajib** memuat `realOnly`, batal tiap harga baru |
| 12 | **Presisi & recall** | 54 pasang berlabel → **presisi 98,1%, recall 100%** (target 95% / 80%) |
| 13 | **Penjadwalan** | `jadwalkan.ps1` → Windows Task Scheduler |

### 🐞 Dua bug yang uji hijau TIDAK tangkap

**1. Gerbang merek menggugurkan kasus andalannya sendiri.**
`"mie"` adalah token merek yang sah (dari **Mie** Sedaap), jadi
`"mie goreng indomie"` ditolak sebagai *"merek berbeda"* — persis kueri yang
jadi alasan seluruh pencocokan ini ditulis ulang. Uji logika murni **lolos**;
yang menangkapnya uji terhadap **database sungguhan**.
→ Kata kategori sekarang dikecualikan dari gerbang merek.

**2. Bar kemajuan di `/admin` berbohong.**
Angka "sudah punya harga nyata" diturunkan dari panjang daftar yang **sudah
dipotong** 60 baris, jadi ia mengaku **40 dari 100** padahal harga nyata baru
ada 11. Seluruh uji hijau saat itu; ketahuan setelah halamannya **benar-benar
dibuka**. Di aplikasi yang seluruh gunanya adalah kejujuran data, angka hiasan
begitu lebih buruk daripada tidak ada angka.
→ Dihitung utuh lewat `ringkasanKerja()`, dikunci uji di
`uji/08-kemajuan-admin.uji.ts`.

> **Pelajaran yang sama untuk kedua-duanya:** uji hijau bukan bukti benar.
> Yang satu butuh uji terhadap data sungguhan, yang satu lagi butuh mata
> melihat halamannya.

### Catatan teknis yang mahal kalau lupa

- **`npm run db:normalisasi` wajib diulang** setiap kali aturan di
  `normalize.ts` berubah — kalau tidak, jalur "cocok persis" membandingkan
  dengan bentuk baku yang basi.
- **Sandi di `.env.local`, bukan `.env`** — `.env` dilacak git.
- **`as const` pada klausa `include` Prisma merusak dua hal**: larik `OR` jadi
  readonly (ditolak) *dan* inferensi tipe hasilnya hilang. Kunci hanya nilai
  `"desc"`-nya.
- **Satu `PrismaClient` untuk seluruh proses** — CLI sekarang memakai
  `lib/db.ts`; dua koneksi ke satu berkas SQLite mengundang *database is locked*.

---

## Sesi 4 — 28 Juli 2026 · "Kejujuran Data"

**Status akhir:** build produksi **hijau**, `npx tsc --noEmit` **nol error**,
di-commit & di-push ke `origin/main`.

### Masalah yang dijawab

Basis data punya **16.390 baris harga**, tetapi hanya **10** yang benar-benar
harga nyata (`source = "open-prices"`). Sisanya perkiraan:

| Sumber        | Baris | Sifat                                  |
| ------------- | ----- | -------------------------------------- |
| `seed`        | 9.180 | data contoh                            |
| `import-off`  | 7.200 | impor Open Food Facts (produk, bukan harga toko) |
| `open-prices` | 10    | **nyata, terverifikasi**               |

Menampilkan semuanya sebagai "harga" tanpa pembeda = menyesatkan pengguna yang
mau belanja. Sesi ini menambahkan lapisan **kejujuran data**: setiap harga
menyatakan asal-usulnya, dan pengguna bisa menyembunyikan yang bukan nyata.

### Yang dikerjakan

**1. Klasifikasi asal harga — `src/lib/source.ts`**

Satu sumber kebenaran untuk memetakan `Price.source` → tiga kelas:

- `real` → `open-prices` (badge "Nyata") atau `scrape` (badge "Nyata · Toko")
- `estimate` → `seed`, `import-off`, lainnya (badge "Perkiraan")
- `none` → tidak ada data (badge "Tidak tersedia")

**2. Mode tampilan harga — `src/lib/mode.ts` + `modeShared.ts`**

Pilihan pengguna disimpan di cookie `MODE_COOKIE` (setahun), dibaca di server:

- **Semua** (`all`) → semua harga tampil, estimasi ditandai jelas
- **Hanya Nyata** (`real`) → hanya harga terverifikasi; sisanya jadi "Tidak tersedia"

Sengaja dipecah dua berkas: `mode.ts` server-only (memakai `next/headers`),
`modeShared.ts` berisi konstanta/tipe yang aman diimpor Client Component.

**3. UI kejujuran data**

- `DisplayModeToggle` — segmented control Semua/Nyata, set cookie lalu `router.refresh()`
- `ModeBar` — bilah tipis untuk layar < `lg`; di `lg+` pengalih menempel di `TopNav`
- `DataHonestyNote` — catatan transparansi, berubah teks mengikuti mode aktif
- `PriceSourceBadge` — diperluas untuk tiga kelas asal harga

**4. Halaman baru: Bandingkan — `src/app/bandingkan/`**

Matriks **produk (baris) × supermarket (kolom)**, kolom produk *sticky* saat
digeser horizontal. Sel: termurah disorot hijau, `✓` untuk harga nyata, angka
abu untuk perkiraan, `—` untuk tidak tersedia. Dibatasi 50 produk per tampilan
dengan pemberitahuan bila terpotong.

**5. Scraper toko nyata — `src/scrapers/adapters/klikindomaret.ts`**

Adapter pertama untuk toko sungguhan (Indomaret), menghasilkan `source="scrape"`.
Ditulis defensif: timeout 6 detik, jeda 1,2 detik antar-permintaan, **berhenti
cepat** bila permintaan pertama gagal, dan mengembalikan `[]` alih-alih melempar
error bila endpoint memblokir.

Eksekusinya dipindah ke `src/data/runScrapers.ts` supaya dipakai bersama oleh CLI
(`npm run scrape`) dan rute on-demand `POST /api/scrape` (dipicu tombol Refresh).
Ada **dedup**: satu harga per (produk, toko, sumber) per hari.

**6. Rombakan query — `src/lib/queries.ts` (+523 baris)**

Semua jalur data sekarang sadar-mode lewat parameter `realOnly`:
`getHomeStats`, `getCompareMatrix`, `getSupermarkets`, `getInsights`.

**7. Keranjang dipecah**

`app/keranjang/page.tsx` (225 baris) → tinggal 6 baris; seluruh UI pindah ke
`components/CartView.tsx`. Server membaca mode lalu meneruskannya sebagai prop,
dan `mode` masuk ke `deps` `useEffect` agar `/api/compare` dihitung ulang saat
mode berganti. Kartu toko kini juga menampilkan jumlah harga nyata.

### ⚠️ Yang MASIH terbuka (baca ini dulu sesi depan)

1. **Belum pernah dijalankan di browser.** Build hijau ≠ fitur benar. Mode
   toggle, halaman `/bandingkan`, dan tombol Refresh belum dibuktikan secara
   visual. **Buktikan dulu sebelum menambah fitur.**
2. **Scraper `klikindomaret` belum terverifikasi menghasilkan harga.** Endpoint
   `webapi/api/product/getproducts` diduga ber-geo-restriction ke IP Indonesia
   dan bisa berubah sewaktu-waktu. Nama field harga (`finalPrice`, `pricePlu`,
   dst.) masih tebakan defensif — perlu dicocokkan dengan respons asli.
3. **Harga nyata masih 10 baris.** Ini akar masalahnya. Tanpa tambahan sumber
   nyata, mode "Hanya Nyata" nyaris kosong.
4. **Catatan harga terakhir 24 Juni 2026** — data sudah basi lebih dari sebulan.
5. **Belum ada uji otomatis.** Verifikasi saat ini hanya `npx tsc --noEmit` +
   `npm run build`.

### Cara verifikasi

```bash
npx tsc --noEmit     # typecheck
npm run build        # build produksi
npm run dev          # jalankan di http://localhost:3000
```

---

## Sesi 5 — 28 Juli 2026 · "Label Umur Data"

**Status akhir:** tsc nol error, build hijau, **aplikasi dijalankan & diperiksa
langsung**, di-commit & di-push (`77ccb3e`).

### Keputusan: cakupan tetap penuh, kekuatannya di label

Sempat diusulkan mengecilkan cakupan (18 toko × 100 produk = 1.800 sel harga,
terisi nyata cuma 10). **Ditolak** — katalog tetap penuh, kejujurannya
diperkuat lewat pelabelan.

### Celah yang ditutup

Label **asal** harga sudah ada sejak Sesi 4, tapi **umur**-nya cuma tersimpan di
atribut `title` alias tooltip — tak bisa disentuh di HP.

> Harga berlabel **"✓ Nyata" yang berumur sebulan** justru lebih menyesatkan
> daripada yang berlabel "Perkiraan", karena "Nyata" terbaca sebagai layak
> dipercaya.

### Yang ditambahkan

- `lib/format.ts` — `daysSince()`, `formatAge()` → *"hari ini"*, *"kemarin"*,
  *"34 hari lalu"*, *"8 bulan lalu"*
- `lib/freshness.ts` — tiga tingkat: **segar** (≤7 hari), **lawas** (≤30),
  **kedaluwarsa** (>30). Melengkapi `source.ts`: *source* menjawab "dari mana",
  *freshness* menjawab "kapan"
- `DataAgeBadge` — label umur yang terlihat langsung, ⚠ saat kedaluwarsa
- `ProductCard` + halaman detail — umur per harga (`cheapestRecordedAt`)
- `DataHonestyNote` — dipecah dua kotak: asal harga + **kotak umur data** yang
  berubah merah & menyarankan Refresh bila lewat sebulan
- `CompareTable` — sel ber-⚠, tooltip memuat asal & umur, plus legenda

### 🔬 Temuan dari MENJALANKAN aplikasinya

Ini pertama kalinya aplikasi benar-benar dibuka (melunasi utang Sesi 4):

| Temuan | Angka |
| --- | --- |
| Harga berlabel **"Nyata" ternyata berumur 2–8 bulan** | kelemahan datanya bukan cuma jumlah, tapi umur |
| Sel kedaluwarsa di `/bandingkan` | **790** — praktis seluruh harga yang tampil |
| Waktu muat beranda (setelah kompilasi) | 0,45–0,53 detik |
| Waktu muat `/bandingkan` | 0,23–0,25 detik |

Angka terakhir mengonfirmasi penilaian ulang prioritas: `priceInclude` tanpa
`take` memang **belum terasa** di skala sekarang.

### ⚠️ Yang MASIH terbuka

1. **Harga nyata tetap 10 baris**, dan kini terbukti berumur 2–8 bulan
2. Scraper `klikindomaret` belum terbukti menghasilkan harga
3. Belum ada uji otomatis
4. Form admin belum ada — jalur tercepat menambah harga nyata

---

## Sesi 1–3 (ringkas, dari riwayat git)

- `07957d2` — MVP: PWA banding harga supermarket Indonesia
- `e97ba05` — redesign UI profesional, web responsif, dark mode & perkaya data
- `ce01271` — harga nyata (Open Prices) + tombol Refresh on-demand (hybrid)
