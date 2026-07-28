# 📝 Catatan Sesi — Hematin Aja

Riwayat pekerjaan per sesi, ditulis agar sesi berikutnya bisa langsung nyambung
tanpa membaca ulang seluruh kode.

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

## Sesi 1–3 (ringkas, dari riwayat git)

- `07957d2` — MVP: PWA banding harga supermarket Indonesia
- `e97ba05` — redesign UI profesional, web responsif, dark mode & perkaya data
- `ce01271` — harga nyata (Open Prices) + tombol Refresh on-demand (hybrid)
