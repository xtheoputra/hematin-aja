# 🧠 Fase 2 — Pencocokan Produk dengan Embedding

Mengganti pencocokan berbasis aturan dengan **kemiripan semantik**, supaya
sistem tahan terhadap variasi penamaan produk.

> **Prasyarat mutlak:** [`FASE-1`](FASE-1-CHECKLIST.md) dan
> [`FASE-1.5`](FASE-1.5-CHECKLIST.md) selesai. Bagian §0 menjelaskan kenapa
> urutan itu tidak boleh dilompati.

---

## 0. 🛑 Gerbang Masuk — Baca Sebelum Menulis Kode

Ada satu hal yang harus jujur disampaikan sebelum fase ini dikerjakan.

### Ketiga kasus uji wajib §7 **sudah terjawab oleh Fase 1**

| Kasus uji | Diselesaikan embedding? | Diselesaikan aturan Fase 1? |
| --- | --- | --- |
| `"mie goreng indomie"` → *Indomie Goreng* | ya | ✅ **ya** — keterkandungan token |
| `"indomie soto"` **tidak** ke *Goreng* | ya | ✅ **ya** — token `soto` ≠ `goreng` |
| `"aqua 600ml"` → varian benar | ⚠️ **buruk** | ✅ **ya** — gerbang ukuran |

Kasus ketiga justru **mundur** kalau diserahkan ke embedding: bagi model,
`"aqua 600ml"` dan `"aqua 1500ml"` nyaris identik secara semantik — keduanya air
minum kemasan merek sama. Angka adalah hal yang **paling lemah** ditangkap
embedding, dan **paling mudah** ditangkap aturan.

### Kenapa ini penting

Nama produk **bukan kalimat**. Nama produk adalah string pendek dan formulaik
(`"Indomie Goreng 85g"`). Variasinya sebagian besar berupa **urutan kata,
singkatan, dan token yang hilang** — dan itu ranah pencocokan token, bukan
semantik.

Embedding baru benar-benar berguna untuk kasus yang **kata-katanya berbeda tapi
maknanya sama**:

| Kasus | Aturan token | Embedding |
| --- | --- | --- |
| `"Sabun Cair Lifebuoy"` vs `"Lifebuoy Body Wash"` | ❌ gagal | ✅ **berhasil** |
| `"Minyak Goreng"` vs `"Cooking Oil"` | ❌ gagal | ✅ **berhasil** |
| `"Susu Kental Manis"` vs `"SKM"` | ❌ gagal | ⚠️ mungkin |

**Itulah target sesungguhnya Fase 2** — bukan ketiga kasus uji di atas.

### ✅ Syarat memulai Fase 2

- [ ] Fase 1 & 1.5 selesai, presisi/recall sudah terukur
- [ ] **Ada bukti kegagalan nyata** — minimal **30 kueri gagal** dari log
      pencarian ([`FASE-1.5` §6](FASE-1.5-CHECKLIST.md)) yang **tidak** bisa
      diselesaikan aturan token maupun alias
- [ ] Kegagalan itu bersifat semantik (kata beda, makna sama), bukan sekadar
      urutan kata

> Tanpa bukti itu, Fase 2 menambah model, latensi, ukuran, dan kerumitan untuk
> memecahkan masalah yang sudah terpecahkan. Kumpulkan kegagalan nyatanya
> dulu — daftar itu sekaligus jadi himpunan uji Fase 2.

---

## 1. 📚 Konsep Dasar

**Embedding** = teks diubah jadi vektor angka, sehingga kemiripan makna bisa
dihitung secara matematis.

```
"indomie goreng"       → [0.21, -0.44, 0.88, ...]
"mie goreng indomie"   → [0.20, -0.45, 0.87, ...]
                          ↑ berdekatan → dianggap mirip
```

**Cosine similarity** — mengukur sudut antar-vektor:

| Nilai | Tafsiran kasar |
| --- | --- |
| `1.0` | identik |
| `0.8+` | sangat mirip |
| `0.5` | agak mirip |
| `< 0.3` | berbeda |

> ⚠️ Angka-angka ini **hanya ancar-ancar umum**. Ambang yang benar berbeda per
> model dan per jenis data — lihat §7.

---

## 2. ⚙️ Keputusan Teknis Terbesar: Python atau TypeScript?

Spesifikasi asal seluruhnya Python (`sentence-transformers`, `sklearn`,
`pip install`). Proyek ini **TypeScript/Next.js**. Ini harus diputuskan lebih
dulu karena memengaruhi semua langkah berikutnya.

| Pilihan | Untung | Rugi |
| --- | --- | --- |
| **A. Transformers.js** (`@xenova/transformers`) | Satu bahasa, satu proses, tanpa Python. Model ONNX jalan langsung di Node | Pilihan model lebih terbatas; perlu cek ketersediaan port ONNX |
| **B. Layanan Python terpisah** | Ekosistem penuh, model apa pun | **Dua runtime & dua penyebaran**. Berat untuk proyek satu orang |
| **C. Pra-hitung luring dgn Python, sajikan dari TS** | Skrip Python sekali jalan | ❌ **Tidak cukup** — vektor kueri pengguna tetap harus dihitung saat itu juga |

### ✅ Rekomendasi: **Pilihan A — Transformers.js**

Alasannya: vektor produk memang bisa dipra-hitung, tapi **vektor kueri pengguna
tidak bisa** — harus dihitung setiap pencarian. Jadi runtime inferensi tetap
dibutuhkan. Menaruhnya di Node menghindari runtime kedua sepenuhnya.

- [ ] Verifikasi port ONNX model pilihan tersedia sebelum berkomitmen
- [ ] Muat model **sekali** sebagai singleton — jangan per permintaan
- [ ] Waspadai *hot reload* Next.js dev yang bisa memuat ulang model

> 💻 **Catatan perangkat.** PC tanpa GPU diskret. Model kelas MiniLM berukuran
> kecil dan dirancang untuk CPU — memadai. Model besar tidak realistis di sini.
> Ukuran & waktu muat pastikan diukur sendiri saat implementasi.

---

## 3. 🤖 Pemilihan Model

### ⚠️ Dua jebakan di spesifikasi asal

**Jebakan 1 — `all-MiniLM-L6-v2` dilatih untuk bahasa Inggris.**
Spesifikasi sendiri mencatat *"model tidak paham bahasa Indonesia sempurna"* —
itu bukan kekurangan kecil, itu konsekuensi langsung dari data latihnya.

**Jebakan 2 — `indobenchmark/indobert` bukan model kalimat.**
IndoBERT adalah model **dasar**, bukan *sentence-transformer*. Mengambil
vektornya begitu saja untuk kemiripan kalimat memberi hasil **buruk** — ini
kesalahan yang sangat umum. Ia perlu penyetelan khusus dulu.

### ✅ Rekomendasi

| Prioritas | Model | Catatan |
| --- | --- | --- |
| 1 | **`paraphrase-multilingual-MiniLM-L12-v2`** | Multibahasa termasuk Indonesia, tetap kelas MiniLM |
| 2 | `all-MiniLM-L6-v2` | Paling kecil & cepat; uji dulu apakah cukup untuk nama produk Indonesia |
| 3 | IndoBERT yang **sudah** disetel jadi sentence-transformer | Bukan IndoBERT mentah |

- [ ] Uji kandidat model pada **himpunan uji nyata Anda** (§0), bukan pada
      contoh dari internet
- [ ] Catat: ukuran berkas, waktu muat, waktu embed per kueri, skor akurasi
- [ ] Pilih yang **paling kecil** yang lolos ambang — bukan yang terbesar

### 🔒 Wajib: catat identitas model

```prisma
embeddingModel  String?   // mis. "paraphrase-multilingual-MiniLM-L12-v2"
```

> **Vektor dari model berbeda tidak boleh dibandingkan** — ruang vektornya lain
> sama sekali. Ganti model = **seluruh embedding wajib dihitung ulang**. Tanpa
> kolom ini, campur-aduk vektor lama & baru menghasilkan kemiripan yang
> ngawur tanpa error apa pun. Ini kegagalan senyap yang mahal.

---

## 4. 🗄️ Skema

```prisma
model Product {
  // ... yang sudah ada
  embedding          Bytes?     // vektor (Float32Array diserialkan)
  embeddingModel     String?    // §3 — wajib
  embeddingUpdatedAt DateTime?
}
```

### Kenapa bukan pgvector

Spesifikasi menyarankan **pgvector** atau **ElasticSearch**. Keduanya belum
perlu:

- Proyek masih **SQLite**; pindah ke Postgres baru dijadwalkan di
  [Fase 5](PETA-JALAN.md)
- Dengan **100 produk × 384 dimensi**, mencari kemiripan secara langsung hanya
  puluhan ribu operasi — hitungan **mikrodetik**
- Indeks vektor baru berguna saat jumlah item sangat besar; di skala ini ia
  hanya menambah ketergantungan

- [ ] Simpan vektor apa adanya, hitung kemiripan di memori
- [ ] Tinjau ulang **hanya** kalau jumlah produk sudah puluhan ribu

---

## 5. 🔄 Pipeline

### 5.1 Saat produk dibuat/diubah

- [ ] Normalisasi nama (fungsi Fase 1)
- [ ] Hasilkan embedding
- [ ] Simpan vektor + nama model + waktu
- [ ] Skrip isi-ulang massal untuk produk yang sudah ada

### 5.2 Saat pengguna mencari

```
kueri pengguna
  → normalisasi (Fase 1)
  → embedding kueri
  → bandingkan dengan seluruh vektor produk
  → ambil N teratas
```

- [ ] Muat vektor produk ke memori sekali, segarkan saat ada perubahan
- [ ] Cache embedding **kueri yang sering muncul** — hemat inferensi berulang

---

## 6. 🎯 Pencocokan Hybrid — jangan 100% AI

Alur berjenjang, dari termurah ke termahal:

```
1. Cocok persis          (paling cepat)     ← Fase 1
2. Cocok alias                              ← Fase 1
3. Keterkandungan token                     ← Fase 1
4. Embedding             (cadangan terakhir) ← Fase 2
```

- [ ] Embedding **hanya** dipanggil bila tahap 1–3 kosong
- [ ] **Gerbang keras tetap berlaku setelah embedding** — merek & ukuran
      diperiksa ulang terhadap kandidat, berapa pun skor kemiripannya

> 🔑 **Ini aturan paling penting di seluruh dokumen.** Embedding **mengusulkan**
> kandidat; aturan **memutuskan**. Skor 0,97 antara `Aqua 600ml` dan
> `Aqua 1500ml` tetap **ditolak** karena ukurannya berbeda.

---

## 7. 📏 Ambang Batas — kalibrasi, bukan hafalan

Spesifikasi menyebut `> 0.75 terima`, `0.6–0.75 saran`, `< 0.6 tolak`.

> ⚠️ **Angka itu tidak bisa dipakai langsung.** Ambang cosine bersifat
> **spesifik per model**. Model berbeda menghasilkan sebaran skor berbeda; pada
> string pendek seperti nama produk, skor cenderung **menumpuk tinggi** —
> sehingga 0,75 bisa jadi jauh terlalu longgar dan meloloskan produk yang salah.

- [ ] Ambil ambang dari **himpunan uji berlabel Anda sendiri** (§0)
- [ ] Pilih ambang yang memenuhi **presisi ≥ 95%** lebih dulu, baru maksimalkan
      recall
- [ ] Simpan sebagai konstanta bernama + komentar berisi tanggal & data
      kalibrasinya
- [ ] **Kalibrasi ulang setiap ganti model**

---

## 8. ⚠️ Masalah yang Pasti Muncul

| Masalah | Penanganan |
| --- | --- |
| Model kurang paham bahasa Indonesia | Model multibahasa (§3) + alias sebagai jaring pengaman |
| **Varian salah cocok** (600ml vs 1500ml) | Ekstraksi angka + satuan berbasis aturan, **diperiksa sebelum menerima** |
| Kemiripan tinggi tapi salah | Merek jadi gerbang keras, bukan sekadar bobot |
| Nama sangat pendek (`"Aqua"`) | Kembalikan **beberapa varian**, jangan tebak satu |
| Model diganti | Kolom `embeddingModel` + hitung ulang menyeluruh (§3) |
| Model lambat dimuat | Singleton, dipanaskan saat proses mulai |

> Perhatikan polanya: **hampir semua penanganan di atas berbasis aturan.**
> Embedding memperluas jangkauan; aturanlah yang menjaga kebenarannya.

---

## 9. 🤖 Validator LLM untuk Kasus Tepi

Templat prompt dari spesifikasi, dipertahankan apa adanya:

```
You are a product matching validator.

Determine if these two products are the same.

Rules:
- Brand must match
- Size difference = different product
- Minor wording difference = same

Product A: {{A}}
Product B: {{B}}

Output:
{
  "is_match": true/false,
  "confidence": 0-1
}
```

### 💡 Tulis balik hasilnya sebagai alias

Keputusan "apakah dua nama ini produk sama" **tidak pernah berubah**. Jadi:

- [ ] Setiap putusan `is_match: true` → **simpan sebagai baris `ProductAlias`**
- [ ] Setiap putusan `false` → simpan di daftar-tolak

Dengan begitu setiap pasangan nama **dinilai sekali seumur hidup**, dan hasilnya
turun ke tahap 2 (cocok alias) yang gratis dan instan. Sistem jadi makin pintar
tanpa biaya berulang.

- [ ] Panggil LLM **hanya** untuk zona ragu (§7), tidak pernah pada jalur utama
- [ ] Beri batas jumlah panggilan per hari

> ⚖️ **Keputusan biaya belum diambil.** [`PETA-JALAN` §8](PETA-JALAN.md) masih
> mencatat "API berbayar vs model lokal" sebagai pilihan terbuka. Butir ini
> memperkenalkan ketergantungan API berbayar — putuskan sadar-sadar, jangan
> masuk diam-diam lewat pintu belakang.

---

## 10. 🚀 Optimasi

- [x] **Pra-hitung embedding** — sudah jadi rancangan §5.1, bukan tambahan
- [ ] Muat vektor ke memori, jangan baca DB tiap permintaan
- [ ] Cache embedding kueri populer
- [ ] ~~FAISS / pgvector IVFFlat~~ — **belum perlu** (§4)

> Pencarian aproksimasi menukar akurasi demi kecepatan. Di skala ratusan produk,
> pencarian penuh sudah cepat **dan** akurat — menukar akurasi di sini rugi
> tanpa untung.

---

## 11. 📊 Metrik Keberhasilan

Spesifikasi: *akurasi ≥ 85%, respons < 1 detik, salah-cocok rendah.*
Dipertajam memakai kerangka [`FASE-1.5` §12](FASE-1.5-CHECKLIST.md):

| Metrik | Target | Cara ukur |
| --- | --- | --- |
| **Presisi** | **≥ 95%** | dari yang dicocokkan, berapa persen benar |
| **Recall** | **≥ 85%** | dari yang seharusnya ketemu, berapa persen ketemu |
| **Salah cocok** | **< 5%** | ini sisi lain presisi — satu angka, bukan dua |
| Waktu respons | **< 1 detik** | ukur **p95**, bukan rata-rata |
| Peningkatan atas Fase 1 | **wajib positif** | recall Fase 2 **harus** melebihi Fase 1 |

- [ ] Baris terakhir adalah **gerbang keluar sesungguhnya**. Kalau embedding
      tidak mengalahkan aturan pada himpunan uji Anda sendiri, **jangan
      dipasang** — Anda hanya menambah beban tanpa manfaat.
- [ ] Ukur "< 1 detik" **termasuk** waktu embedding kueri, bukan hanya
      pencariannya

---

## 📋 Urutan Kerja

| # | Langkah | Alasan urutan |
| --- | --- | --- |
| 1 | Kumpulkan ≥ 30 kegagalan nyata dari log (§0) | Gerbang masuk. Tanpa ini fase ini mungkin tak perlu |
| 2 | Jadikan himpunan uji berlabel | Semua langkah berikut butuh alat ukur |
| 3 | Ukur skor Fase 1 pada himpunan itu | Garis dasar pembanding |
| 4 | Putuskan runtime (§2) | Menentukan bentuk semua kode berikutnya |
| 5 | Uji 2–3 model pada himpunan uji (§3) | Pilih berdasarkan data, bukan reputasi |
| 6 | Skema + pipeline pra-hitung (§4, §5) | Sesudah model final — ganti model = hitung ulang |
| 7 | Sambungkan sebagai **tahap 4** alur hybrid (§6) | Jangan pernah menggantikan tahap 1–3 |
| 8 | Kalibrasi ambang (§7) | Butuh sistem berjalan |
| 9 | Bandingkan dengan garis dasar langkah 3 (§11) | Gerbang keluar |
| 10 | *(Opsional)* validator LLM + tulis-balik alias (§9) | Terakhir, dan hanya bila zona ragu masih besar |

---

## 🔜 Berikutnya

[`FASE-3-CHECKLIST.md`](FASE-3-CHECKLIST.md) — pipeline OCR struk.

⚠️ **Fase 3 tidak menunggu fase ini.** OCR cukup menyambung ke ujung rangkaian
hybrid §6 apa pun isinya — tahap 1–3 dari Fase 1 sudah memadai. Karena gerbang
masuk §0 mungkin tidak pernah terbuka, jangan merantai Fase 3 di belakang fase
ini.

---

*Prasyarat: [`FASE-1`](FASE-1-CHECKLIST.md) · [`FASE-1.5`](FASE-1.5-CHECKLIST.md) ·
Berikutnya: [`FASE-3`](FASE-3-CHECKLIST.md) ·
Arah besar: [`PETA-JALAN.md`](PETA-JALAN.md) ·
Riwayat: [`CATATAN-SESI.md`](CATATAN-SESI.md)*
