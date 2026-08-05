/**
 * Gerbang mutu untuk produk yang masuk dari sumber luar — logika MURNI,
 * tanpa database dan tanpa jaringan.
 *
 * Ada karena `openPrices.ts` pernah memasukkan **buku** ke katalog supermarket.
 * Tiga produk bernama nomor ISBN (`Produk 9786238902507`) berharga Rp 20–80
 * duduk di kategori "snack", lengkap dengan tanda **NYATA**, dan ikut
 * dihitung sebagai bukti kemajuan pengisian data.
 *
 * Empat kebocoran yang ditutup di sini, semuanya dari satu blok kode:
 *
 *  1. **Barcode Bookland diterima.** EAN-13 berawalan 977/978/979 adalah
 *     ISSN/ISBN — majalah dan buku, bukan barang supermarket. Prefiks GS1
 *     Indonesia adalah 899. Ini penolakan yang pasti, bukan tebakan.
 *  2. **Produk tanpa nama tetap dibuat.** Saat Open Food Facts tidak mengenal
 *     sebuah barcode, kodenya jatuh ke `Produk <barcode>` — nama yang tidak
 *     memberi tahu apa pun, dan tak mungkin ditemukan lewat pencarian.
 *  3. **Satuan ditelan mentah-mentah.** `quantity` dari OFF adalah teks bebas,
 *     dan katalog jadi memuat `"RH. 30"`, `"220"`, dan `"susu uht"`.
 *  4. **Urutan terbalik.** Produk dibuat DULU, harganya divalidasi belakangan —
 *     jadi setiap harga yang ditolak tetap meninggalkan produk sampah.
 *
 * Prinsipnya sama dengan sisa proyek ini: yang tidak diketahui dinyatakan
 * tidak diketahui, tidak ditambal dengan nilai karangan.
 */
import { uraiUkuran } from "./satuan";

/**
 * Prefiks EAN-13 yang bukan barang eceran.
 * 977 = ISSN (majalah/terbitan berkala), 978 & 979 = ISBN (buku).
 */
export const PREFIKS_BUKAN_BARANG = ["977", "978", "979"];

/** Apakah barcode ini milik buku/majalah, bukan barang supermarket? */
export function barcodeBukanBarang(barcode: string): boolean {
  const b = barcode.replace(/\D/g, "");
  if (b.length !== 13) return false; // hanya EAN-13 yang punya arti prefiks ini
  return PREFIKS_BUKAN_BARANG.some((p) => b.startsWith(p));
}

/**
 * Apakah namanya benar-benar menamai sesuatu?
 *
 * Yang ditolak: kosong, terlalu pendek, tanpa satu pun huruf, dan nama yang
 * cuma mengulang barcode-nya sendiri.
 */
export function namaProdukLayak(nama: string, barcode = ""): boolean {
  const n = nama.trim();
  if (n.length < 3 || n.length > 70) return false;
  if (!/\p{L}/u.test(n)) return false; // tak ada huruf sama sekali
  const angka = barcode.replace(/\D/g, "");
  if (angka.length >= 8 && n.replace(/\D/g, "").includes(angka)) return false;
  return true;
}

/**
 * Bersihkan satuan dari sumber luar.
 *
 * Yang terbaca dipakai apa adanya; yang tidak terbaca **tidak ditambal**
 * dengan `"1 pcs"`. Menambalnya berarti mengaku tahu isi kemasan padahal
 * tidak — dan `"1 pcs"` akan lolos pemeriksaan mutu, sehingga cacatnya jadi
 * tak terlihat selamanya. String kosong jujur: harga per satuan tidak
 * ditampilkan, dan produknya muncul di panel Mutu data untuk dibereskan.
 */
export function satuanDariSumberLuar(mentah: string | null | undefined): string {
  const s = (mentah ?? "").trim();
  if (!s) return "";
  return uraiUkuran(s) ? s : "";
}

export type AlasanTolak =
  | "barcode-kosong"
  | "barcode-bukan-barang"
  | "nama-tak-layak"
  | "harga-tak-wajar";

export type HasilPeriksaKandidat =
  | { layak: true; nama: string; satuan: string }
  | { layak: false; alasan: AlasanTolak; pesan: string };

/**
 * Periksa calon produk baru SEBELUM apa pun ditulis ke database.
 *
 * `hargaSah` disuntikkan pemanggil (hasil `periksaHarga()`), supaya berkas ini
 * tetap murni dan aturan harga tidak ditulis dua kali di dua tempat.
 */
export function periksaKandidatProduk(k: {
  barcode: string;
  nama: string;
  satuan?: string | null;
  hargaSah: boolean;
}): HasilPeriksaKandidat {
  const barcode = k.barcode.trim();
  if (!barcode) {
    return { layak: false, alasan: "barcode-kosong", pesan: "barcode kosong" };
  }
  if (barcodeBukanBarang(barcode)) {
    return {
      layak: false,
      alasan: "barcode-bukan-barang",
      pesan: `barcode ${barcode} berawalan ${barcode.slice(0, 3)} — itu ISBN/ISSN (buku atau majalah), bukan barang supermarket`,
    };
  }
  if (!namaProdukLayak(k.nama, barcode)) {
    return {
      layak: false,
      alasan: "nama-tak-layak",
      pesan: `nama "${k.nama}" tidak menamai apa pun — produk tanpa nama sungguhan tidak akan pernah ditemukan lewat pencarian`,
    };
  }
  // Diperiksa TERAKHIR supaya pesannya menyebut alasan yang paling spesifik
  // lebih dulu, tapi tetap sebelum apa pun dibuat.
  if (!k.hargaSah) {
    return {
      layak: false,
      alasan: "harga-tak-wajar",
      pesan: "harga tidak lolos pemeriksaan mutu, jadi produknya pun tidak dibuat",
    };
  }
  return {
    layak: true,
    nama: k.nama.trim(),
    satuan: satuanDariSumberLuar(k.satuan),
  };
}
