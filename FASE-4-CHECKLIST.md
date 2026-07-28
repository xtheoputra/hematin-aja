# 🎯 Fase 4 — Mesin Rekomendasi

Rekomendasi otomatis berbasis hasil OCR, kemiripan produk, riwayat, dan konteks.

> **Padanan di [`PETA-JALAN.md`](PETA-JALAN.md):** Fase 5 (Rekomendasi Cerdas),
> bagian §4.4.

---

## 0. ⚖️ Konflik Nilai — Baca Sebelum Apa Pun

Ada satu hal mendasar yang harus diselesaikan dulu, dan sifatnya bukan teknis.

### Sebagian daftar ini berasal dari pola *e-commerce*, bukan pola *hemat*

| Jenis rekomendasi | Asal pola | Melayani "belanja lebih hemat"? |
| --- | --- | --- |
| **Alternatif lebih murah** | pembanding harga | ✅ **inti misi** |
| Toko termurah untuk keranjang | pembanding harga | ✅ sudah ada |
| Insight pengeluaran | keuangan pribadi | ✅ ya |
| Harga sedang turun / waktu terbaik beli | pembanding harga | ✅ ya |
| Produk serupa | netral | ✅ berguna untuk cari pengganti |
| **Bundle / cross-sell** | toko daring | ❌ **berlawanan** |
| **"Sering dibeli bersama"** | toko daring | ⚠️ tergantung penyajian |
| `IF kategori = makanan → rekomendasikan minuman` | toko daring | ❌ **berlawanan** |

### Kenapa ini masalah

Proposisi nilai proyek ini, tertulis di [`PETA-JALAN` §1](PETA-JALAN.md):

> *"Belanja lebih hemat tanpa effort"*

**Cross-sell dirancang untuk membuat orang membeli lebih banyak.** Aturan
*"kalau beli makanan, tawarkan minuman"* adalah teknik menaikkan nilai
keranjang — persis kebalikan dari menghemat.

Aplikasi hemat yang menyodorkan barang tambahan sedang **bekerja melawan
penggunanya sendiri**. Dan begitu pengguna menyadarinya, seluruh kepercayaan
yang dibangun lewat fitur kejujuran data ikut hilang.

### ✅ Keputusan yang disarankan

- [ ] **Buang cross-sell & aturan "makanan → minuman"**
- [ ] **Pertahankan "sering dibeli bersama", tapi ubah maksudnya**

Data yang sama bisa dipakai dengan niat berlawanan:

| Penyajian | Maksud | Sikap |
| --- | --- | --- |
| *"Tambahkan juga: Teh Botol"* | menambah belanjaan | ❌ tolak |
| *"Biasanya Anda beli Teh Botol juga — kelupaan?"* | melengkapi daftar | ✅ terima |

Yang kedua **melayani pengguna**: mencegah lupa berarti mencegah perjalanan
kedua ke toko. Itu penghematan nyata — waktu dan ongkos.

> 💬 Ini keputusan Anda, bukan saya. Kalau Anda memang ingin arah *e-commerce*,
> katakan — nanti saya susun ulang. Tapi itu perubahan posisi produk, dan
> sebaiknya diambil sadar-sadar, bukan menyelinap lewat satu baris aturan.

---

## 1. 📍 Yang Sudah Ada

**Rekomendasi Level 1 sudah berjalan** — jangan dibangun ulang.

| Kemampuan | Di kode |
| --- | --- |
| Toko termurah untuk satu keranjang | `compareCart()` → `POST /api/compare` → `CartView` |
| Peringkat semua toko + potensi hemat | `CartView` — sudah menampilkan "hemat Rp X" |
| Termurah per produk | `StoreCell.isCheapest`, `vsMin` |
| Insight dasar | `getInsights()` → halaman `/insight` |

Fase ini **memperluas** yang sudah ada, bukan memulai dari kosong.

---

## 2. ✂️ Pemisahan Fase: 4A dan 4B

Daftar asal mencampur dua hal dengan prasyarat yang sangat berbeda.

### 4A — Berbasis aturan & harga *(bisa dikerjakan relatif awal)*

Prasyarat: **harga nyata** + **harga per satuan** (§3). Tidak butuh pengguna,
tidak butuh AI.

- Alternatif lebih murah
- Produk serupa
- Insight pengeluaran
- Sinyal harga turun

### 4B — Personalisasi *(prasyaratnya jauh)*

Prasyarat: model `User` ([PETA-JALAN Fase 5](PETA-JALAN.md)) + riwayat
transaksi ([Fase 3 OCR](FASE-3-CHECKLIST.md)) + **basis pengguna nyata**.

- Rekomendasi dari riwayat pribadi
- "Sering dibeli bersama"
- Collaborative filtering

> Sama seperti pola di fase-fase sebelumnya: **bagian bernilai tertinggi justru
> punya ketergantungan paling dangkal.** "Alternatif lebih murah" adalah fitur
> paling sesuai misi, dan ia tidak butuh AI maupun pengguna — hanya butuh harga
> nyata dan satuan yang bisa dibandingkan.

---

## 3. 🔴 Prasyarat Data yang Hilang: Harga per Satuan

Ini penghalang teknis terbesar fase ini, dan tidak disebut di daftar asal.

### Masalahnya

`Product.unit` saat ini **teks bebas**: `"1 L"`, `"5 kg"`, `"1 renceng"`,
`"85 g"`. Dengan itu, pertanyaan paling dasar dari sebuah aplikasi hemat tidak
bisa dijawab:

```
Bimoli 2 L   → Rp 40.000
Bimoli 1 L   → Rp 22.000
```

Mana yang lebih hemat? Per liter: **Rp 20.000** vs **Rp 22.000**. Tanpa satuan
terurai, sistem hanya melihat "40.000 lebih mahal dari 22.000" — dan akan
merekomendasikan yang **justru lebih boros**.

### Yang dibutuhkan

```prisma
model Product {
  // ...
  unitQuantity  Float?    // 2, 5, 85
  unitMeasure   String?   // "ml" | "g" | "pcs"
}
```

- [ ] Uraikan `unit` teks bebas jadi angka + satuan
- [ ] Seragamkan: liter→ml, kg→g (satu satuan dasar per jenis)
- [ ] Hitung **harga per satuan dasar** saat menampilkan
- [ ] Tandai produk yang satuannya gagal diurai — jangan diam-diam dianggap 1
- [ ] Tampilkan harga per satuan di UI (`"Rp 20.000/L"`) — berguna bahkan tanpa
      rekomendasi apa pun

> Ini juga menyelesaikan gerbang ukuran di [`FASE-1` §1.3](FASE-1-CHECKLIST.md)
> secara lebih rapi: `600ml` vs `1500ml` jadi perbandingan angka, bukan
> pencocokan teks.

---

## 4. 💰 4A.1 — Alternatif Lebih Murah *(fitur utama)*

Rekomendasi paling sesuai misi. Kerjakan ini duluan.

- [ ] Kandidat = kategori sama + jenis satuan sama
- [ ] Bandingkan **harga per satuan**, bukan harga tempel (§3)
- [ ] Tampilkan penghematan dalam Rupiah **dan** persen
- [ ] Sertakan pembanding jujur: `"Rp 20.000/L vs Rp 22.000/L"`
- [ ] Jangan sarankan penggantian bila selisihnya remeh (mis. < 5%)
- [ ] **Hormati mode Nyata/Semua** — jangan menyarankan penggantian berdasarkan
      harga perkiraan

> ⚠️ Butir terakhir penting. Merekomendasikan "ganti ke merek X, lebih hemat
> Rp 5.000" berdasarkan harga **perkiraan** adalah bentuk paling langsung dari
> pelanggaran prinsip kejujuran data — sistem menyuruh orang bertindak
> berdasarkan tebakan.

---

## 5. 🔍 4A.2 — Produk Serupa

- [ ] Pakai rangkaian pencocokan yang sudah ada
      ([`FASE-2` §6](FASE-2-CHECKLIST.md)) — kategori + token, embedding bila ada
- [ ] Saring: kategori, ketersediaan, rentang harga
- [ ] Ambil N teratas
- [ ] ~~FAISS / Pinecone / Weaviate~~ — **belum perlu**

> Alasan penolakan sama seperti [`FASE-2` §4](FASE-2-CHECKLIST.md): pada skala
> ratusan produk, pencarian penuh sudah cepat **dan** akurat. Pinecone &
> Weaviate juga layanan berbayar — menambah biaya bulanan untuk masalah yang
> belum ada.

---

## 6. 📊 4A.3 — Insight Pengeluaran

Sudah ada embrionya di `getInsights()` + halaman `/insight`.

- [ ] Pengeluaran per kategori (butuh riwayat transaksi dari OCR)
- [ ] Kategori yang naik dibanding bulan lalu
- [ ] "Anda bisa hemat Rp X bila belanja di toko Y"
- [ ] Sinyal harga turun untuk produk yang biasa dibeli

> ⚠️ Sinyal "harga turun" butuh **riwayat harga yang segar**. Catatan terakhir
> proyek ini 24 Juni 2026 — dengan data sebasi itu, setiap sinyal adalah sinyal
> palsu. Fitur ini menunggu [Fase 1](FASE-1-CHECKLIST.md) beres.

---

## 7. 🤖 4B — Personalisasi & Collaborative Filtering

### Pemeriksaan kenyataan

Daftar asal menyebut collaborative filtering sebagai *"opsional advanced"*.
Sebenarnya lebih jauh dari itu:

| Yang dibutuhkan CF | Kondisi proyek |
| --- | --- |
| Model `User` | ❌ belum ada (dijadwalkan PETA-JALAN Fase 5) |
| Riwayat transaksi | ❌ belum ada (butuh Fase 3 OCR) |
| **Banyak pengguna dengan riwayat bertumpang-tindih** | ❌ **nol pengguna** |

Collaborative filtering bekerja dengan mencari *"orang yang mirip Anda juga
membeli…"*. Dengan satu pengguna, tidak ada "orang lain" — keluarannya kosong.
Ini bukan masalah penyetelan, ini sifat metodenya.

- [ ] **Tandai sebagai jauh di masa depan**, bukan opsional
- [ ] Content-based filtering (berbasis atribut produk) **bisa** jalan tanpa
      banyak pengguna — kalau ingin ke arah ML, mulai dari sini
- [ ] Jangan pasang pustaka rekomendasi sebelum ada data nyata untuk dilatih

---

## 8. 🔌 API

- [ ] `GET /api/recommendations?productId=…` — alternatif & serupa
- [ ] `GET /api/recommendations?cart=…` — perluasan `/api/compare` yang sudah ada
- [ ] Keluaran: daftar + skor + **alasan**
- [ ] Hormati mode Nyata/Semua (baca cookie, seperti rute lain)

### Wajib: sertakan alasannya

```json
{
  "productId": "...",
  "score": 0.82,
  "reason": "Rp 2.000/L lebih murah, kategori & ukuran sama"
}
```

> Rekomendasi tanpa alasan adalah kotak hitam. Di aplikasi yang menjual
> transparansi harga, pengguna berhak tahu **kenapa** sesuatu disodorkan
> kepadanya. Ini juga alat *debug* terbaik saat rekomendasinya ngawur.

---

## 9. 🔄 Umpan Balik & Evaluasi

### ⚠️ Jangan optimalkan klik

Daftar asal menyebut *"track klik rekomendasi, konversi"*. Untuk aplikasi ini
itu ukuran yang keliru — dan berbahaya.

Mengoptimalkan **klik** menghasilkan rekomendasi yang **memancing klik**:
mencolok, mengejutkan, agak clickbait. Mengoptimalkan **penghematan**
menghasilkan rekomendasi yang **membuat orang hemat**. Keduanya menarik sistem
ke arah yang berbeda.

| Metrik | Pakai? |
| --- | --- |
| **Rupiah yang dihemat** (perkiraan) | ✅ **metrik utama** |
| Penggantian diterima / disarankan | ✅ ya |
| 👍 / 👎 dari pengguna | ✅ ya |
| Rasio klik | ⚠️ pantau saja, **jangan dioptimalkan** |
| "Konversi" | ❌ tak bermakna — aplikasi ini bukan toko |

- [ ] Catat rekomendasi ditampilkan / diterima / ditolak
- [ ] Tombol 👍 / 👎
- [ ] Perkirakan penghematan dari penggantian yang diterima
- [ ] **Pakai tabel log dari [`FASE-1.5` §6](FASE-1.5-CHECKLIST.md)** — jangan
      bikin tabel analitik ketiga

---

## 10. 🖥️ Integrasi UI

- [ ] Halaman produk → *"Alternatif lebih hemat"*
- [ ] Keranjang → *"Ganti 3 barang, hemat Rp 12.000"*
- [ ] Halaman insight → ringkasan pengeluaran
- [ ] Tampilkan alasan di setiap kartu rekomendasi (§8)
- [ ] Tandai jelas bila rekomendasi bersandar pada harga perkiraan
- [ ] ~~Aplikasi React/mobile terpisah~~ — PWA yang ada sudah cukup
      ([PETA-JALAN §8](PETA-JALAN.md))

---

## 11. 🛠️ Tumpukan Teknologi

Tiga usulan baru muncul di daftar ini. Semuanya ditolak, dengan alasan yang
konsisten dengan keputusan sebelumnya:

| Usulan | Sikap | Alasan |
| --- | --- | --- |
| **MongoDB** | ❌ tolak | Proyek pakai Prisma; menambah Mongo = **dua basis data** untuk data yang relasional |
| **FAISS / Pinecone / Weaviate** | ❌ belum perlu | Skala ratusan produk; dua terakhir berbayar |
| **Layanan Python** (sklearn/numpy/Surprise) | ❌ tolak | Alasan sama seperti Fase 2 & 3 — runtime kedua |
| **ETL pipeline** | ⚠️ berlebihan | Yang dibutuhkan cuma penjadwalan dari [`FASE-1.5` §5](FASE-1.5-CHECKLIST.md) |
| Aturan dalam JSON/DB | ✅ terima | Berguna — aturan bisa disetel tanpa ubah kode |

---

## 12. 📋 Urutan Kerja

| # | Langkah | Alasan urutan |
| --- | --- | --- |
| 1 | **Putuskan §0** — cross-sell masuk atau tidak | Menentukan produk ini melayani siapa |
| 2 | Urai satuan + harga per satuan (§3) | Penghalang untuk semua rekomendasi harga |
| 3 | Tampilkan harga per satuan di UI | Berguna langsung, walau belum ada rekomendasi |
| 4 | Alternatif lebih murah (§4) | Fitur paling sesuai misi, prasyarat paling dangkal |
| 5 | Produk serupa (§5) | Pakai pencocok yang sudah ada |
| 6 | Catatan umpan balik (§9) | Perlu ada sebelum menilai kualitas rekomendasi |
| 7 | Insight pengeluaran (§6) | Butuh riwayat transaksi dari Fase 3 |
| 8 | 4B personalisasi (§7) | Butuh model `User` & pengguna nyata |

---

## 🧠 Tiga Prinsip

1. **Aturan + kemiripan dulu, ML belakangan** — sesuai catatan penutup daftar
   asal, dan saya setuju sepenuhnya
2. **Setiap rekomendasi harus bisa menjelaskan dirinya** — transparansi adalah
   produknya, bukan hiasannya
3. **Ukur penghematan, bukan keterlibatan** — begitu Anda mengoptimalkan
   perhatian, Anda berhenti membuat aplikasi hemat

---

*Prasyarat: [`FASE-1`](FASE-1-CHECKLIST.md) · [`FASE-1.5`](FASE-1.5-CHECKLIST.md) ·
Terkait: [`FASE-2`](FASE-2-CHECKLIST.md) · [`FASE-3`](FASE-3-CHECKLIST.md) ·
Arah besar: [`PETA-JALAN.md`](PETA-JALAN.md) ·
Riwayat: [`CATATAN-SESI.md`](CATATAN-SESI.md)*
