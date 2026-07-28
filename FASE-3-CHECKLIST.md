# 🧾 Fase 3 — Pipeline OCR Struk

Mengubah foto struk belanja jadi data harga terstruktur yang langsung masuk ke
sistem.

> **Padanan di [`PETA-JALAN.md`](PETA-JALAN.md):** Fase 4 (OCR & Intelijen Struk).

---

## 0. 📍 Posisi Fase Ini — dan satu koreksi urutan

### OCR **tidak** bergantung pada embedding

Spesifikasi menulis alur *"Match ke database **(embedding)**"*. Padahal yang
dibutuhkan OCR hanyalah **sebuah pencocok**, bukan pencocok embedding.

Rangkaian hybrid dari [`FASE-2` §6](FASE-2-CHECKLIST.md) berlapis:

```
1. Cocok persis   ← Fase 1
2. Cocok alias    ← Fase 1
3. Token          ← Fase 1
4. Embedding      ← Fase 2  (opsional, bergerbang)
```

OCR cukup menyambung ke **ujung rangkaian ini, apa pun isinya**. Kalau Fase 2
belum ada, tahap 1–3 sudah bisa dipakai.

> ⚠️ **Ini penting.** [Fase 2 punya gerbang masuk](FASE-2-CHECKLIST.md#0--gerbang-masuk--baca-sebelum-menulis-kode)
> yang mungkin **tidak pernah terbuka** — kalau aturan token ternyata sudah
> cukup, embedding tak perlu dibangun. Merantai OCR di belakang embedding berarti
> menyandera OCR pada fase yang boleh jadi tidak akan pernah dikerjakan.

### Kenapa fase ini justru berharga lebih awal

Masalah nomor satu proyek ini: **hanya 10 harga nyata dari 16.390**. Toko fisik
tidak punya API dan scraping-nya belum terbukti.

**Struk adalah bukti harga terkuat yang bisa didapat** — nyata, bertanggal,
per gerai, dan tidak bisa diblokir siapa pun. Untuk toko fisik, ini bahkan
**satu-satunya** sumber yang benar-benar bisa diandalkan.

- [ ] Pertimbangkan menaikkan fase ini ke atas Fase 2 bila pengumpulan harga
      nyata masih jadi hambatan utama

---

## 1. 🔄 Alur Ujung-ke-Ujung

```
Unggah gambar
  → Pra-proses citra
  → OCR (ekstraksi teks)
  → Pembersihan teks
  → Parsing per baris
  → Keluaran terstruktur
  → 🧑 KONFIRMASI PENGGUNA        ← wajib, lihat §9
  → Pencocokan produk
  → Simpan ke DB
```

Satu langkah ditambahkan dari spesifikasi asal: **konfirmasi pengguna**.
Alasannya di §9 — bukan soal kehati-hatian, tapi soal aritmetika.

---

## 2. ⚙️ Keputusan Runtime

Spesifikasi seluruhnya Python (OpenCV + pytesseract). Proyek ini TypeScript.

| Pilihan | Untung | Rugi |
| --- | --- | --- |
| **A. Di peramban** — Tesseract.js + Canvas | **Foto tak pernah meninggalkan perangkat.** Tanpa beban server, tanpa unggahan | Lebih lambat di HP; perlu unduh model sekali |
| **B. Di server Node** — Tesseract.js + `sharp` | Konsisten & lebih cepat | Harus menerima & menangani berkas foto |
| C. Layanan Python terpisah | Ekosistem OpenCV penuh | Runtime kedua — ditolak dengan alasan sama seperti Fase 2 |

### ✅ Rekomendasi: **Pilihan A — proses di peramban**

Selain hemat server, ini menyelesaikan §3 sekaligus: kalau gambar tidak pernah
diunggah, tidak ada data pribadi yang perlu dijaga.

- [ ] Uji kecepatannya di HP kelas menengah, bukan cuma di PC
- [ ] Sediakan cadangan pemrosesan di server bila perangkat terlalu lambat

---

## 3. 🔐 Privasi Struk — bagian yang hilang dari spesifikasi

Struk belanja **bukan sekadar daftar harga**. Satu lembar struk bisa memuat:

- apa yang dibeli seseorang, **kapan**, dan **di gerai mana**
- nomor kartu anggota / loyalitas
- **empat digit terakhir kartu pembayaran**
- nama kasir, nomor transaksi, alamat gerai

Menyimpan foto struk = **menyimpan data pribadi**, dengan segala kewajiban yang
menyertainya.

- [ ] **Jangan simpan gambar struknya.** Ekstrak → pakai → buang
- [ ] Kalau harus disimpan: persetujuan eksplisit + batas waktu retensi
- [ ] Jangan pernah simpan digit kartu / nomor anggota — saring saat pembersihan
      teks (§6)
- [ ] Yang disimpan cukup: nama produk, harga, jumlah, toko, tanggal
- [ ] Katakan terus terang di UI apa yang diambil dan apa yang dibuang

> Ini bukan formalitas hukum semata. Proyek yang seluruh nilainya dibangun di
> atas **kejujuran data** tidak boleh diam-diam mengumpulkan riwayat belanja
> pribadi.

---

## 4. 🖼️ Pra-proses Citra

Tanpa ini hasil OCR jelek. Tapi tiga langkah di spesifikasi perlu dikoreksi.

### ⚠️ 4.1 Ambang tetap `150` terlalu rapuh

```python
thresh = cv2.threshold(blur, 150, 255, cv2.THRESH_BINARY)[1]   # ← rapuh
```

Angka tetap mengasumsikan pencahayaan merata. Foto struk dari HP hampir tidak
pernah begitu — ada bayangan tangan, kilau lampu, satu sisi lebih gelap.
Dengan ambang tetap, separuh struk bisa jadi hitam pekat seluruhnya.

- [ ] Pakai **ambang adaptif** (per wilayah) atau **Otsu** (ambang dihitung dari
      citranya sendiri)

### ⚠️ 4.2 "Resize max 1024px" bisa merusak

Menyusutkan gambar mempercepat OCR, tapi **yang paling dibutuhkan OCR justru
resolusi teks**. Struk memakai huruf kecil di kertas termal; menyusutkan foto
bisa membuat teksnya tak terbaca.

- [ ] **Potong ke area struk dulu**, baru sesuaikan ukuran
- [ ] Patokannya **tinggi huruf**, bukan lebar gambar — jaga tinggi huruf tetap
      memadai, perbesar bila perlu
- [ ] Jangan pernah menyusutkan sampai teks kecil hilang

### 4.3 Yang lebih penting tapi tak disebut

Kertas termal itu kontrasnya rendah, mudah pudar, dan selalu melengkung. Foto HP
hampir selalu miring.

- [ ] **Koreksi kemiringan & perspektif** — dampaknya lebih besar daripada
      peredaman derau
- [ ] Deteksi tepi struk, luruskan jadi persegi
- [ ] Grayscale ✅ (dari spesifikasi, sudah benar)
- [ ] Peredaman derau ✅ (dari spesifikasi, sudah benar)

---

## 5. 🔍 Mesin OCR

- [ ] Mulai dari **Tesseract** (gratis) — saran spesifikasi ini tepat
- [ ] Pasang data bahasa **Indonesia** (`ind`), bukan hanya Inggris
- [ ] Naikkan ke layanan berbayar **hanya** bila akurasi terukur tidak memadai
- [ ] Simpan **teks mentah** hasil OCR bersama hasil parsing

> Menyimpan teks mentah bukan sekadar untuk audit — itu satu-satunya cara
> memperbaiki parser tanpa meminta pengguna memotret ulang struknya.

---

## 6. 🧹 Pembersihan Teks

- [ ] Buang kop & kaki struk (nama toko, "TOTAL", "KEMBALI", NPWP, alamat)
- [ ] **Saring data sensitif** (§3) — digit kartu, nomor anggota
- [ ] Rapikan spasi, buang simbol aneh
- [ ] **Simpan nama toko sebelum dibuang** — itu justru menentukan baris harga
      ini milik supermarket mana

> Spesifikasi menyuruh membuang `"INDOMARET"` sebagai kop. Padahal itu satu-satunya
> penanda **toko mana** yang harus diisi ke `Price.supermarketId`. Ambil dulu,
> baru buang.

---

## 7. 📐 Parsing Baris — dua bug yang wajib dihindari

### 🔴 7.1 `3.000` bukan tiga koma nol

Indonesia memakai **titik sebagai pemisah ribuan**. Struk menulis `Rp 3.000`
untuk tiga ribu rupiah.

Parser angka bawaan mana pun akan membaca `"3.000"` sebagai **3,0** — lalu
menyimpan harga **Rp 3** untuk Indomie.

- [ ] Buang pemisah ribuan **sebelum** mengubah teks jadi angka
- [ ] Perlakukan koma & titik sesuai kaidah Indonesia, bukan bawaan bahasa
      pemrograman
- [ ] Uji khusus: `"3.000"` → `3000`, `"12.500"` → `12500`, `"1.234.567"` → `1234567`

> 🛟 [`FASE-1.5` §1.1](FASE-1.5-CHECKLIST.md) menolak harga tak masuk akal —
> jaring pengaman itu **akan** menangkap bug ini. Tapi jangan mengandalkannya;
> perbaiki di sumbernya.

### 🔴 7.2 Harga satuan atau harga baris?

Struk Indonesia lazim menulis:

```
INDOMIE GORENG
  2 X 3.000            6.000
```

Aturan spesifikasi *"ambil angka terakhir = price"* menghasilkan **6.000** —
padahal itu **total baris**, bukan harga satuan.

Kolom `Price.price` di basis data ini berisi **harga satuan**. Salah ambil =
seluruh harga tercatat **dua kali lipat**.

- [ ] Tetapkan sejak awal: `price` = **harga satuan**
- [ ] Bila terbaca `qty × satuan = total`, ambil **satuan**
- [ ] Bila hanya ada satu angka dan `qty > 1`, angka itu kemungkinan total →
      **bagi dengan qty**
- [ ] Verifikasi silang: `satuan × qty` harus sama dengan `total` bila keduanya ada
- [ ] Kalau tidak cocok → tandai keyakinan rendah, minta konfirmasi (§9)

### 7.3 Aturan parsing lainnya

- [ ] Pisah per baris, saring baris yang memuat angka *(sesuai spesifikasi)*
- [ ] Cari penanda jumlah: `X`, `x`, `@`, `*`
- [ ] Sisa teks = nama produk
- [ ] `quantity` bawaan = **1** bila tak ditemukan
- [ ] Tangani **baris menyatu**: `INDOMIE GORENG2X3000`
- [ ] Tangani **nama melipat ke baris berikutnya** (lazim di struk sempit)

---

## 8. 🔗 Pencocokan Produk

- [ ] Normalisasi nama (fungsi Fase 1)
- [ ] Masukkan ke rangkaian hybrid — tahap 1–3, plus tahap 4 bila sudah ada
- [ ] Nama tak dikenal → **jangan tebak**; tawarkan pilihan ke pengguna (§9)
- [ ] Setiap koreksi pengguna → **simpan sebagai `ProductAlias`**

> 💡 Nama produk di struk itu **singkatan kasir** (`"IDM GRG 85G"`) — justru
> jenis nama yang paling sulit dicocokkan, dan paling berharga dikumpulkan
> sebagai alias. Setiap struk yang dikoreksi membuat struk berikutnya lebih
> mudah.

---

## 9. 🧑 Layar Konfirmasi — **wajib, bukan opsional**

### Aritmetikanya

Spesifikasi menargetkan: OCR ≥ 80%, parsing ≥ 85%, pencocokan ≥ 85%. Ketiganya
berurutan, jadi **peluangnya berkalian**:

```
0,80 × 0,85 × 0,85 ≈ 0,58
```

**Hanya ~58% baris yang benar dari ujung ke ujung.** Artinya sekitar **4 dari
10 baris salah** — padahal semua target per tahap tercapai.

Menyimpan langsung tanpa konfirmasi = memasukkan harga salah ke basis data yang
seluruh nilainya bertumpu pada kebenaran harga.

- [ ] Tampilkan hasil parsing untuk **ditinjau sebelum disimpan**
- [ ] Pengguna bisa memperbaiki nama, harga, jumlah
- [ ] Tandai baris berkeyakinan rendah lebih dulu
- [ ] Baris yang tak yakin bisa dilewati, tidak harus diperbaiki

### Layar ini bekerja ganda

Setiap koreksi menghasilkan **pasangan berlabel** — teks struk → produk benar.
Itu tepat:

- alias baru untuk [`FASE-1`](FASE-1-CHECKLIST.md)
- himpunan uji berlabel untuk [`FASE-1.5` §12](FASE-1.5-CHECKLIST.md)
- data latih untuk [`FASE-2`](FASE-2-CHECKLIST.md)

> Jadi langkah yang terasa seperti beban tambahan justru **satu-satunya
> mekanisme** yang membuat ketiga fase lain membaik sendiri seiring pemakaian.

---

## 10. 💾 Simpan ke Basis Data

| Kolom | Isi |
| --- | --- |
| `productId` | hasil pencocokan (§8) |
| `supermarketId` | dari kop struk (§6) |
| `price` | **harga satuan** (§7.2) |
| `source` | `"receipt"` |
| `recordedAt` | **tanggal di struk**, bukan waktu unggah |
| `confidence` | keyakinan parsing |

### 🔧 Perubahan kode yang dibutuhkan

`src/lib/source.ts` sekarang berbunyi:

```ts
if (source === "open-prices" || source === "scrape") return "real";
return "estimate";   // ← "receipt" akan jatuh ke sini
```

Tanpa perubahan, harga dari struk — **bukti terkuat yang ada** — akan
ditampilkan sebagai *"Perkiraan"*.

- [ ] Tambahkan `"receipt"` ke `sourceKindOf()` sebagai **`real`**
- [ ] Tambahkan `sourceMeta()`: badge `"Nyata · Struk"`
- [ ] Tambahkan `confidence` ke model `Price`

### 🛡️ Anti-penyalahgunaan

Berbeda dari `open-prices` dan `scrape`, sumber ini **dikirim pengguna**. Tidak
ada yang memverifikasi bahwa fotonya struk sungguhan.

- [ ] Harga dari struk tunggal **belum** memengaruhi peringkat "termurah"
- [ ] Butuh dukungan struk lain, atau tetap sejalan dengan harga historis
- [ ] Terapkan deteksi pencilan dari [`FASE-1.5` §1.1](FASE-1.5-CHECKLIST.md)

---

## 11. ⚠️ Masalah Dunia Nyata

| Masalah | Penanganan |
| --- | --- |
| OCR salah baca (`IND0MIE`) | Daftar koreksi umum (`0`↔`O`, `1`↔`I`, `5`↔`S`) + alias + toleransi salah ketik |
| Format struk beda antar toko | Parser umum + aturan khusus per toko bila perlu; **jangan** bikin parser terpisah per toko sejak awal |
| Baris menyatu | Regex lebih longgar (§7.3) |
| Struk pudar / termal usang | Terima kegagalan dengan anggun; minta foto ulang, jangan tebak |
| Struk panjang / terpotong | Dukung beberapa foto untuk satu transaksi |
| Nama melipat dua baris | Gabungkan baris tanpa angka dengan baris berikutnya |

---

## 12. 🚀 Optimasi

- [ ] Simpan **keyakinan parsing**; rendah → tinjau manual *(sesuai spesifikasi)*
- [ ] Kalau OCR di peramban (§2), pemrosesan **sudah** asinkron secara alami
- [ ] ~~Antrean latar belakang~~ — **belum perlu**; satu struk = hitungan detik,
      dan proyek ini belum punya infrastruktur antrean

---

## 13. 📊 Metrik Keberhasilan

| Tahap | Target spesifikasi | Cara ukur |
| --- | --- | --- |
| Akurasi OCR | ≥ 80% | kemiripan karakter terhadap transkrip manual |
| Parsing benar | ≥ 85% | baris terurai benar / total baris produk |
| Pencocokan produk | ≥ 85% | pakai presisi & recall dari [`FASE-1.5` §12](FASE-1.5-CHECKLIST.md) |
| **Ujung-ke-ujung** | **wajib diukur terpisah** | baris benar sempurna / total baris |

- [ ] Susun himpunan uji: **20–30 foto struk nyata** + transkrip manualnya
- [ ] Sertakan struk susah: pudar, miring, terlipat, cahaya kurang
- [ ] **Metrik ujung-ke-ujung adalah yang menentukan.** Angka per tahap enak
      dilihat tapi berkalian jadi jauh lebih kecil (§9)
- [ ] Ukur juga **berapa persen baris yang dikoreksi pengguna** — itu ukuran
      kualitas sesungguhnya menurut orang yang memakainya

---

## 📋 Urutan Kerja

| # | Langkah | Alasan urutan |
| --- | --- | --- |
| 1 | Kumpulkan 20–30 struk nyata + transkrip manual | Tanpa data uji, semua langkah lain buta |
| 2 | Putuskan runtime & kebijakan privasi (§2, §3) | Menentukan bentuk seluruh sistem |
| 3 | Pra-proses + OCR, ukur akurasi mentah | Batas atas kualitas ditentukan di sini |
| 4 | Parser + uji `3.000` dan satuan-vs-total (§7) | Dua bug ini merusak data secara senyap |
| 5 | Layar konfirmasi (§9) | Jangan simpan apa pun sebelum ini ada |
| 6 | Sambungkan ke rangkaian pencocokan (§8) | Pakai yang sudah ada, jangan tunggu Fase 2 |
| 7 | `source: "receipt"` + `lib/source.ts` (§10) | Perubahan kecil, dampaknya besar di UI |
| 8 | Anti-penyalahgunaan (§10) | Sebelum dibuka ke pengguna lain |
| 9 | Ukur ujung-ke-ujung (§13) | Gerbang keluar |

---

*Prasyarat: [`FASE-1`](FASE-1-CHECKLIST.md) · [`FASE-1.5`](FASE-1.5-CHECKLIST.md) ·
Terkait: [`FASE-2`](FASE-2-CHECKLIST.md) ·
Arah besar: [`PETA-JALAN.md`](PETA-JALAN.md) ·
Riwayat: [`CATATAN-SESI.md`](CATATAN-SESI.md)*
