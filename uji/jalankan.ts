/**
 * Penjalan uji: memuat semua berkas `*.uji.ts` di folder ini, menjalankannya,
 * lalu melaporkan yang gagal. Keluar dengan kode 1 bila ada yang gagal supaya
 * bisa dipakai sebagai gerbang sebelum commit.
 *
 *   npm test
 */
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { jalankanSemua, type HasilUji } from "./kerangka";

const HIJAU = "\x1b[32m";
const MERAH = "\x1b[31m";
const ABU = "\x1b[90m";
const TEBAL = "\x1b[1m";
const RESET = "\x1b[0m";

async function main() {
  // fileURLToPath, bukan .pathname — jalur Windows bisa mengandung spasi
  // ("Hematin Aja") yang di URL jadi %20 dan bikin readdir gagal.
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const berkas = (await readdir(dir))
    .filter((f) => f.endsWith(".uji.ts"))
    .sort();

  if (berkas.length === 0) {
    console.error("Tidak ada berkas *.uji.ts ditemukan di", dir);
    process.exit(1);
  }

  // Impor berurutan: kelompok() mendaftar saat modul dimuat, jadi urutan
  // laporan mengikuti urutan nama berkas.
  for (const f of berkas) {
    await import(pathToFileURL(path.join(dir, f)).href);
  }

  const mulai = Date.now();
  const hasil = await jalankanSemua();
  const detik = ((Date.now() - mulai) / 1000).toFixed(1);

  laporkan(hasil, berkas.length, detik);

  const gagal = hasil.filter((h) => !h.lulus);
  process.exit(gagal.length > 0 ? 1 : 0);
}

function laporkan(hasil: HasilUji[], jumlahBerkas: number, detik: string) {
  let kelompokTerakhir = "";
  for (const h of hasil) {
    if (h.kelompok !== kelompokTerakhir) {
      kelompokTerakhir = h.kelompok;
      console.log(`\n${TEBAL}${h.kelompok}${RESET}`);
    }
    if (h.lulus) {
      console.log(`  ${HIJAU}✓${RESET} ${ABU}${h.nama}${RESET}`);
    } else {
      console.log(`  ${MERAH}✗ ${h.nama}${RESET}`);
      console.log(`    ${MERAH}${h.pesan}${RESET}`);
    }
  }

  const gagal = hasil.filter((h) => !h.lulus);
  const warna = gagal.length ? MERAH : HIJAU;
  console.log(
    `\n${warna}${TEBAL}${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus${RESET}` +
      ` ${ABU}(${jumlahBerkas} berkas, ${detik} detik)${RESET}`
  );

  if (gagal.length) {
    console.log(`\n${MERAH}${TEBAL}Gagal:${RESET}`);
    for (const g of gagal) console.log(`  ${MERAH}• ${g.kelompok} › ${g.nama}${RESET}`);
  }
}

main().catch((e) => {
  console.error(`${MERAH}Penjalan uji sendiri yang error:${RESET}`, e);
  process.exit(1);
});
