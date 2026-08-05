# 📝 Catatan Sesi — Hematin Aja

Riwayat pekerjaan per sesi, ditulis agar sesi berikutnya bisa langsung nyambung
tanpa membaca ulang seluruh kode.

---

## 🌅 BESOK MULAI DARI SINI

**Kondisi tinggal:** `npx tsc --noEmit` nol error, `npm run build` hijau,
**`npm test` 369/369 lulus**, `npm run db:periksa` **0 harga bermasalah**,
aplikasi dijalankan & diperiksa (5 halaman `200`, panel admin & endpoint klik
terverifikasi).

### ✅ Pembersihan data SUDAH dikerjakan (jangan diulang)

Sesi 7 menemukan lalu **membereskan** sampah katalog. Yang terhapus:
4 produk tanpa nama sungguhan (3 di antaranya nomor ISBN — buku yang ikut
terimpor) + 6 baris harga tak masuk akal (Rp 20 – Rp 200), plus satuan
`Buavita Juice Jambu 245ml` diperbaiki dari `"RH. 30"` → `"245ml"`.

Cadangan sebelum penghapusan: **`prisma/dev.db.cadangan-sebelum-bersih`**.

**Akibatnya angka "harga nyata" TURUN dari 11 → 5, dan itu memang angka yang
benar.** Yang 6 tadi tidak pernah layak dihitung.

Lubangnya juga sudah ditutup di `src/lib/impor.ts`, jadi impor berikutnya tidak
akan mengulanginya.

### Yang masih menunggu orang (tidak bisa ditebak program)

3 satuan rusak yang jawabannya memang tidak diketahui — perbaiki lewat
`/admin` kalau Anda tahu kemasannya:

```
Cleo                  "220"        (kemungkinan 220 ml, tapi jangan ditebak)
Greensand lime apple  "1"
Milku                 "susu uht"
```

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
   **5 baris harga nyata** dari 96 produk, setelah pembersihan.
3. Tabel "Belum punya harga nyata" adalah antreannya, yang paling kosong di
   atas. **Tapi urutan yang lebih baik ada di panel 📊 Analitik pencarian:
   isi dulu produk yang benar-benar dicari orang.**
4. Fokus **satu kategori dulu: mie instan**. 15 produk × 5 toko = 75 harga nyata,
   selesai dalam hitungan hari. Tersebar tipis ke 100 produk tidak akan pernah
   terasa selesai.
5. Ukur kapan saja: `npm run db:statistik`, dan periksa mutunya dengan
   `npm run db:periksa`.

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

## Sesi 7 — 5 Agustus 2026 · "Agen Belanja & Harga Per Satuan"

**Status akhir:** `tsc` nol error, `npm run build` hijau, **`npm test` 304/304**
(dari 166), agen diuji terhadap database sungguhan lewat HTTP.

Sesi ini menambah dua hal yang sebelumnya tidak ada, dan keduanya saling
bergantung: **harga per satuan** dan **mesin keputusan belanja**.

### 1. Harga per satuan — `src/lib/satuan.ts`

Sampai sesi ini, seluruh aplikasi hanya membandingkan **harga mutlak**, dan itu
diam-diam salah: "Beras 5 kg Rp 62.000" terlihat jauh lebih mahal daripada
"Beras 1 kg Rp 13.500", padahal Rp 12.400/kg vs Rp 13.500/kg. Aplikasi yang
seluruh gunanya menghemat justru menunjuk pilihan yang lebih boros.

Parsernya dibangun dari satuan yang **benar-benar ada di katalog**, bukan
contoh rapi buatan sendiri: `"1 pcs (85 g)"` → 85 g (isi bersih menang atas
kemasan), `"24 x 6.5g"` → 156 g (kemasan majemuk), `"500ml"`, `"84gr"`,
`"1.5 L"`, `"isi 30"`. **Terbaca 96 dari 100 produk.** Yang tak terbaca
mengembalikan `null`, tidak pernah menebak.

Sekarang tampil di kartu produk, detail produk, tabel banding, halaman toko,
dan seluruh keluaran agen.

### 2. Agen belanja — `src/lib/agen/`

Mesin keputusan **deterministik**: tanpa model bahasa, tanpa API berbayar,
jalan luring, dan tiap angkanya bisa ditelusuri sampai ke barisnya.

| Bagian | Isinya |
| --- | --- |
| `rencana.ts` | total setara antar-toko, pemecahan 2 toko, keyakinan, penyaring harga mustahil |
| `peringatan.ts` | 6 jenis peringatan mutu data |
| `substitusi.ts` | saran pengganti berbasis Rp/satuan |
| `tipe.ts` | bentuk yang dipakai bersama API & UI |

Tiga keputusan yang menentukan seluruh rancangannya:

1. **Total yang benar-benar sebanding.** Cara lama (`compareCart`) hanya
   menjumlahkan barang yang tersedia, sehingga toko yang punya 2 dari 8 barang
   selalu "termurah". Sekarang barang yang kurang tetap dihitung dengan harga
   pasar termurah **plus satu ongkos perjalanan**, karena sisanya memang
   menuntut mampir ke tempat lain. Satu aturan untuk semuanya: *tiap kunjungan
   toko setelah yang pertama berongkos*.
2. **Pecah belanja hanya kalau sepadan.** Hemat harus melampaui ongkos
   perjalanan **dan** ambang 3%. Ongkosnya bisa disetel pengguna (Gratis –
   Rp 35.000) dan diingat, karena orang yang jalan kaki ke minimarket sebelah
   dan orang yang naik motor 20 menit tidak boleh dapat saran yang sama.
3. **Keyakinan dinyatakan, bukan disembunyikan.** Dihitung dari porsi harga
   nyata × kesegaran × kelengkapan, lengkap dengan kalimat alasannya.

`compareCart()` dan `/api/compare` **dihapus** — dua mesin yang sama-sama
menghitung "total per toko" pasti menyimpang. Penggantinya `/api/agen`.

### 🐞 Bug lama yang diperbaiki

| Bug | Kenapa berbahaya |
| --- | --- |
| **"Harga lagi turun" palsu** di `/insight` | Harga NYATA terbaru diadu dengan PERKIRAAN lama di toko yang sama. Itu bukan penurunan harga — itu pergantian sumber data |
| **Rekomendasi hemat lintas ukuran** | Gula 1 kg dinyatakan "lebih hemat" daripada beras 5 kg. Angka hematnya karangan. Sekarang per satuan, pembanding median, minimal 3 produk sebanding |
| **Badge hemat hilang di keranjang** | `maxSaving` membandingkan toko terbaik dengan toko yang barangnya paling sedikit, lalu digugurkan sendiri oleh penjaganya |
| **Total keranjang tak sebanding** | Lihat keputusan 1 di atas |

Ketiganya dikunci uji regresi di `uji/10-agen.uji.ts` & `uji/11-tren.uji.ts`.

### 🔬 Dua cacat yang HANYA ketahuan setelah agen dijalankan pada data nyata

Uji hijau tidak menangkap satu pun dari keduanya — sama seperti pelajaran
Sesi 6, dan kali ini pun uji yang menemukan cuma yang ditulis **setelah**
melihat hasilnya.

1. **Saran pengganti yang absurd.** Agen dengan yakin menyuruh mengganti
   **Adem Sari dengan air mineral**, dan **oatmeal dengan kopi sachet** —
   semuanya sekategori "minuman". Kategori ternyata terlalu kasar untuk
   dipakai sebagai penanda "barang sejenis". Sekarang pengganti wajib berbagi
   kata jenis ("air mineral" dengan "air mineral").
2. **Kopi seharga Rp 20.** Harga itu masuk sebelum `periksaHarga()` ada, dan
   ikut menarik total sebuah toko ke bawah. Sekarang `saringHargaMustahil()`
   membuangnya sebelum apa pun dihitung, dan melaporkannya sebagai peringatan
   — bukan menghilangkannya diam-diam.

### 3. `npm run db:periksa` + panel 🩺 Mutu data di `/admin`

Lahir dari temuan di atas: cacat **isi database** tidak akan pernah tertangkap
`npm test`, karena uji memeriksa kode. Sekarang ada satu tempat yang bisa
ditanyai "apa saja yang rusak?" — dan jawabannya jadi antrean kerja.

### Berkas baru

```
src/lib/satuan.ts              parser satuan + harga per satuan
src/lib/agen/{index,rencana,peringatan,substitusi,tipe}.ts
src/lib/queries/agen.ts        pengumpul data untuk agen
src/lib/queries/tren.ts        penurunan harga & rekomendasi (murni)
src/lib/queries/mutu.ts        audit mutu data
src/data/periksaMutu.ts        npm run db:periksa
src/app/api/agen/route.ts      POST /api/agen
src/components/HargaSatuanBadge.tsx
src/components/agen/{KartuKeputusan,DaftarPeringatan,PeringkatToko,
                     DaftarBelanja,SaranPengganti,AturOngkos}.tsx
uji/09-satuan.uji.ts  uji/10-agen.uji.ts  uji/11-tren.uji.ts
```

---

## Sesi 7b — 5 Agustus 2026 · "Menutup lubang, membersihkan, mengukur"

Lanjutan langsung dari Sesi 7. **`npm test` 304 → 369.**

### 1. Lubang importir ditutup — `src/lib/impor.ts` (murni)

Penyelidikan menemukan **empat** kebocoran, semuanya di satu blok
`openPrices.ts`:

| Kebocoran | Akibatnya di katalog |
| --- | --- |
| Barcode Bookland diterima | Buku (`978…`) & majalah (`977…`) jadi "produk snack" |
| `\`Produk ${barcode}\`` sebagai nama cadangan | 4 produk yang namanya tidak menamai apa pun |
| `quantity` OFF ditelan mentah | Satuan `"RH. 30"`, `"220"`, `"susu uht"` |
| **Urutan terbalik** | Produk dibuat DULU, harga divalidasi belakangan → tiap harga yang ditolak meninggalkan produk sampah |

Yang terakhir paling merusak dan paling tak terlihat. Sekarang harga diperiksa
**sebelum** produknya dibuat, memakai `periksaHarga()` yang sama — bukan aturan
kedua yang bisa menyimpang.

Satuan tak terbaca kini disimpan **kosong**, bukan ditambal `"1 pcs"`.
Menambalnya berarti mengaku tahu isi kemasan padahal tidak, DAN membuat
cacatnya lolos panel Mutu data selamanya.

### 2. `npm run db:bersihkan` — pratinjau adalah bawaan

Menghapus 4 produk + 6 harga, memperbaiki 1 satuan. **Tidak menghapus apa pun
sampai diberi `--terapkan`**; skrip yang menghapus begitu dijalankan cepat atau
lambat menghapus sesuatu yang tidak diniatkan.

Aturannya bukan daftar nama yang ditulis tangan, melainkan `namaProdukLayak()`
yang sama dengan gerbang impor — karena itu ia menemukan satu produk yang
sebelumnya tidak terhitung (`Produk 6931068501151`, barcode Cina, bukan ISBN).

### 3. Analitik pencarian — `SearchLog` akhirnya dibaca

Tabelnya terisi sejak Sesi 6 tapi isinya tak pernah ditampilkan di mana pun.
Panel baru di `/admin`: kueri terpopuler, deret 14 hari (hari kosong tetap
digambar — kalau dilewati, jeda panjang jadi tak terlihat), sebaran jalur
pencocokan, dan klik ke situs toko.

**Ini mengubah urutan kerja pengisian data:** daftar "paling kosong" kalah
berguna dibanding daftar "paling dicari".

### 4. Sisa Fase 1.5 — dari 9 butir terbuka jadi 2

- **§7 harga kosong → data lama + umurnya.** `StoreCell.bayanganHarga`. Aturan
  kerasnya: bayangan **tidak pernah ikut menentukan mana yang termurah** —
  begitu ikut, mode "Hanya Nyata" kehilangan artinya. Dikunci uji.
- **§6 klik ke tautan toko.** `POST /api/klik` + `sendBeacon` (fetch biasa
  sering dibatalkan navigasi — persis saat pencatatan dibutuhkan). Tidak
  menyimpan apa pun tentang siapa yang mengklik.
- **§10 label emas.** `ProductAlias.dariKueriGagal` — terisi otomatis saat
  alias yang didaftarkan ternyata cocok dengan kueri yang pernah nihil.
  `source: "manual"` cuma berarti "diketik orang"; yang berharga adalah
  pasangan *kalimat pengguna sungguhan → produk yang benar*.
- **§12 "Harga konsisten" & "Data tidak kacau"** dicentang dengan bukti:
  `npm run db:periksa` = 0 harga bermasalah.

**Dua yang sengaja dibiarkan terbuka:**

- §1.3 tanda "kedaluwarsa > 7 hari" — checklist-nya sendiri bilang tunggu
  sampai ada data segar; kalau dinyalakan sekarang 100% data merah.
- §9 saran otomatis saat mengetik — ditandai opsional & "kerjakan terakhir".

---

## Sesi 7c — 5 Agustus 2026 · "Kemasan mana yang hemat, dan seberapa boleh dipercaya"

**`npm test` 369 → 398.**

### 1. Perbandingan varian ukuran di halaman produk

Halaman produk selama ini cuma menjawab setengah pertanyaan: *"di toko mana
barang INI paling murah"*. Setengah lainnya — apakah barang ini sendiri
pilihan yang masuk akal dibanding kemasan lain — tak pernah ditanyakan,
padahal selisihnya biasanya **jauh lebih besar** daripada selisih antar-toko.

`src/lib/varian.ts` (murni) menyusun tabel varian sejenis, diurut Rp per
satuan, dengan gerbang yang sama seperti agen: harus **sejenis** (kataJenis,
bukan sekadar sekategori) dan **sebasis satuan**.

### 🔬 Cacat ketiga yang lolos uji dan hanya ketahuan setelah dibuka

Judulnya sempat berbunyi **"ada kemasan 92% lebih murah"** — dengan
membandingkan botol 700 ml terhadap **galon 19 L**. Benar secara Rp/L, tapi
galon menuntut dispenser dan bukan pilihan kemasan bagi orang yang sedang
memilih botol.

Yang menarik: rem untuk kasus ini **sudah ada** di `agen/substitusi.ts`
(`BATAS_LIPAT_UKURAN`), dan saya sengaja tidak memasangnya di sini dengan
alasan "ini menyajikan perbandingan, bukan menyarankan tindakan". Alasannya
setengah benar — dan setengah yang salah persis ada di judulnya.

Pemecahannya membedakan dua hal yang tadinya tercampur:

- **Tabelnya tetap memuat semua ukuran**, termasuk galon. Itu informasi sah,
  persis seperti label harga per satuan di rak supermarket.
- **Klaim hematnya hanya dari kemasan sekelas**, dan yang di luar kelas diberi
  tanda `BEDA KELAS`.

*Menampilkan angka* adalah satu hal; *menyuruh orang pindah ke sana* hal lain,
dan cuma yang kedua perlu menahan diri. `BATAS_LIPAT_UKURAN` sekarang tinggal
di `lib/satuan.ts` dan dipakai bersama, supaya kedua tempat tak pernah memakai
batas berbeda.

Hasilnya sekarang: *"Air Mineral Aqua 47% lebih murah per L"* (600 ml vs
700 ml) — perbandingan yang benar-benar bisa ditindaklanjuti.

### 2. Halaman publik `/data` — Kondisi Data

Seluruh aplikasi ini berdiri di atas satu klaim: harga perkiraan tidak pernah
disamarkan sebagai harga nyata. Klaim itu selama ini cuma diucapkan lewat
label kecil di kartu harga, dan **tak ada satu pun tempat yang bisa ditanyai
"sebenarnya seberapa jauh aplikasi ini boleh dipercaya?"**.

Sengaja **publik**, bukan disembunyikan di `/admin`: angka cakupan yang cuma
dilihat pemiliknya adalah angka yang lambat laun dibiarkan buruk.

Isinya: nyata vs perkiraan (5 dari 16.385), cakupan per kategori & per toko,
sebaran kesegaran, dan berapa satuan yang terbaca. Angkanya saling
tercocokkan — 9.180 + 7.200 + 4 + 1 = 16.385.

Satu perbaikan penyajian setelah dilihat: "95 kedaluwarsa" tepat di atas
"catatan harga terbaru: kemarin" terbaca bertentangan padahal keduanya benar.
Sekarang dijelaskan bahwa yang dihitung adalah umur **harga yang benar-benar
ditampilkan** per produk — satu catatan baru tidak menyegarkan 96 produk.

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
