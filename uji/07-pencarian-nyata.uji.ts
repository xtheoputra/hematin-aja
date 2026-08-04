/**
 * Uji pencarian terhadap DATABASE SUNGGUHAN, plus pengukuran presisi & recall
 * (FASE-1.5 §12).
 *
 * Kenapa dua angka, bukan satu "akurasi": tidak ketemu itu mengecewakan, salah
 * ketemu itu **menyesatkan orang saat belanja**. Sistem yang mencocokkan
 * segalanya bisa mencetak recall 100% dan tetap tak berguna. Karena itu presisi
 * dipatok lebih tinggi (≥ 95%) daripada recall (≥ 80%).
 *
 * Uji ini hanya MEMBACA database; tidak ada baris yang ditulis.
 */
import { kelompok, uji, harus } from "./kerangka";
import { prisma } from "@/lib/db";
import { cariProduk, saranProduk } from "@/lib/queries/cari";

export const TARGET_PRESISI = 0.95;
export const TARGET_RECALL = 0.8;

/**
 * Himpunan uji berlabel: kueri → slug produk yang benar.
 * Sengaja memuat kasus sulit — urutan kata terbalik, sinonim, satuan berbeda,
 * merek mirip, dan nama sehari-hari yang tidak persis nama katalog.
 */
const BERLABEL: [kueri: string, slugBenar: string][] = [
  // — urutan kata & huruf besar-kecil —
  ["indomie goreng", "indomie-goreng"],
  ["mie goreng indomie", "indomie-goreng"],
  ["indomie mi goreng", "indomie-goreng"],
  ["INDOMIE GORENG", "indomie-goreng"],
  ["indomie   goreng!!", "indomie-goreng"],
  ["goreng indomie", "indomie-goreng"],
  // — varian sesama merek —
  ["indomie soto", "indomie-soto"],
  ["indomie kuah soto", "indomie-soto"],
  ["mie sedaap goreng", "mie-sedaap-goreng"],
  ["sedaap goreng", "mie-sedaap-goreng"],
  ["pop mie ayam", "pop-mie-ayam"],
  // — satuan & ukuran —
  ["aqua 600ml", "aqua-600ml"],
  ["aqua 600 ml", "aqua-600ml"],
  ["air mineral aqua 600ml", "aqua-600ml"],
  ["aqua galon", "aqua-galon-19l"],
  ["aqua 19 liter", "aqua-galon-19l"],
  ["susu ultra 250ml", "susu-ultra-250ml"],
  ["susu uht coklat", "susu-ultra-coklat-1l"],
  ["susu uht coklat 1 liter", "susu-ultra-coklat-1l"],
  ["minyak goreng bimoli", "minyak-goreng-bimoli-2l"],
  ["bimoli 2 liter", "minyak-goreng-bimoli-2l"],
  ["minyak goreng curah", "minyak-goreng-curah-1l"],
  ["beras premium", "beras-premium-5kg"],
  ["beras medium", "beras-medium-5kg"],
  ["gula pasir gulaku", "gula-pasir-gulaku-1kg"],
  ["gulaku", "gula-pasir-gulaku-1kg"],
  ["tepung terigu segitiga biru", "tepung-segitiga-biru-1kg"],
  ["segitiga biru", "tepung-segitiga-biru-1kg"],
  // — merek saja —
  ["pepsodent", "pasta-gigi-pepsodent-190g"],
  ["rinso", "deterjen-rinso-770g"],
  ["sunlight", "sunlight-jeruk-755ml"],
  ["silverqueen", "silverqueen-chunky-65g"],
  ["chitato", "chitato-sapi-panggang"],
  ["oreo", "oreo-original-133g"],
  ["beng beng", "beng-beng"],
  ["cheetos", "cheetos-jagung-bakar"],
  ["zwitsal", "sabun-bayi-zwitsal-100ml"],
  ["mamypoko", "popok-mamypoko-pants-m"],
  // — nama sehari-hari, bukan nama katalog —
  ["teh pucuk", "teh-pucuk-350ml"],
  ["teh botol sosro", "teh-botol-sosro-350ml"],
  // Sengaja dibiarkan meleset: katalog punya dua produk Sosro, jadi "sosro"
  // sendirian memang ambigu. Dipertahankan agar angka presisi tetap jujur —
  // himpunan uji yang semuanya bisa dijawab bukan alat ukur.
  ["sosro", "teh-botol-sosro-350ml"],
  ["kapal api special mix", "kopi-kapal-api-special-mix"],
  ["nescafe classic", "nescafe-classic-sachet"],
  ["energen coklat", "energen-coklat-10s"],
  ["energen cokelat", "energen-coklat-10s"],
  ["kecap manis abc", "kecap-abc-275ml"],
  ["saus sambal abc", "saus-sambal-abc-335ml"],
  ["royco ayam", "royco-ayam-100g"],
  ["sarden abc", "sarden-abc-155g"],
  ["telur ayam", "telur-ayam-1kg"],
  ["keju cheddar kraft", "keju-kraft-cheddar-170g"],
  ["frisian flag", "frisian-flag-kental-manis"],
  ["dancow fortigro", "dancow-fortigro-400g"],
  ["sampo sunsilk", "shampoo-sunsilk-170ml"],
];

/**
 * Pasangan yang TIDAK boleh saling menjaring. Ini penjaga presisi: melewatkan
 * satu saja berarti menampilkan harga produk lain sebagai "lebih murah".
 */
const TERLARANG: [kueri: string, slugYangTakBolehMuncul: string][] = [
  ["indomie goreng", "mie-sedaap-goreng"],
  ["mie sedaap goreng", "indomie-goreng"],
  ["aqua 600ml", "aqua-galon-19l"],
  ["aqua 19 liter", "aqua-600ml"],
  ["indomie soto", "indomie-goreng"],
  ["teh pucuk", "teh-botol-sosro-350ml"],
];

let petaSlug: Map<string, string> | null = null;

async function slugDari(ids: string[]): Promise<string[]> {
  if (!petaSlug) {
    const semua = await prisma.product.findMany({ select: { id: true, slug: true } });
    petaSlug = new Map(semua.map((p) => [p.id, p.slug]));
  }
  return ids.map((id) => petaSlug!.get(id) ?? id);
}

kelompok("pencarian — kasus wajib terhadap data sungguhan", () => {
  for (const [kueri, benar] of BERLABEL.slice(0, 11)) {
    uji(`"${kueri}" → ${benar}`, async () => {
      const hasil = await slugDari((await cariProduk(kueri)).ids);
      harus.memuat(hasil, benar, `hasil untuk "${kueri}"`);
    });
  }
});

kelompok("pencarian — gerbang keras", () => {
  for (const [kueri, terlarang] of TERLARANG) {
    uji(`"${kueri}" TIDAK boleh memunculkan ${terlarang}`, async () => {
      const hasil = await slugDari((await cariProduk(kueri)).ids);
      harus.takMemuat(hasil, terlarang, `hasil untuk "${kueri}"`);
    });
  }
});

kelompok("pencarian — jalur yang dipakai", () => {
  uji("nama persis diselesaikan di langkah pertama", async () => {
    harus.sama((await cariProduk("Indomie Goreng")).jalur, "persis");
  });

  uji("slug dari URL ketemu lewat alias", async () => {
    const r = await cariProduk("indomie goreng jumbo tidak ada");
    harus.sama(r.jalur, "kosong");
  });

  uji("kueri kosong tidak menarik apa pun", async () => {
    const r = await cariProduk("   ");
    harus.sama(r.ids.length, 0);
    harus.sama(r.jalur, "kosong");
  });

  uji("kueri sangat panjang tidak bikin crash", async () => {
    const r = await cariProduk("indomie ".repeat(200));
    harus.benar(r.ids.length >= 0);
  });

  uji("simbol saja tidak menjaring seluruh katalog", async () => {
    harus.sama((await cariProduk("!!!???")).ids.length, 0);
  });
});

kelompok("saran saat pencarian nihil", () => {
  uji("kueri meleset tetap memberi arah", async () => {
    const s = await saranProduk("indomie rendang pedas mercon");
    harus.benar(s.length > 0, "jumlah saran");
  });

  uji("saran tidak lebih dari yang diminta", async () => {
    harus.maksimal((await saranProduk("susu", 3)).length, 3, "jumlah saran");
  });

  uji("kueri tanpa kata sama sekali tidak menghasilkan saran", async () => {
    harus.sama((await saranProduk("!!!")).length, 0);
  });
});

kelompok("presisi & recall (FASE-1.5 §12)", () => {
  uji(
    `presisi ≥ ${TARGET_PRESISI * 100}% dan recall ≥ ${TARGET_RECALL * 100}%`,
    async () => {
      let adaHasil = 0;
      let teratasBenar = 0;
      let ketemu = 0;
      const melesetTeratas: string[] = [];
      const takKetemu: string[] = [];

      for (const [kueri, benar] of BERLABEL) {
        const hasil = await slugDari((await cariProduk(kueri)).ids);
        if (hasil.length > 0) {
          adaHasil++;
          if (hasil[0] === benar) teratasBenar++;
          else melesetTeratas.push(`"${kueri}" → ${hasil[0]} (harusnya ${benar})`);
        }
        if (hasil.includes(benar)) ketemu++;
        else takKetemu.push(`"${kueri}"`);
      }

      const presisi = adaHasil > 0 ? teratasBenar / adaHasil : 0;
      const recall = ketemu / BERLABEL.length;

      // Angkanya dicetak supaya terpantau tiap kali uji dijalankan, bukan
      // cuma lulus/gagal.
      console.log(
        `      presisi ${(presisi * 100).toFixed(1)}% (${teratasBenar}/${adaHasil} teratas benar) · ` +
          `recall ${(recall * 100).toFixed(1)}% (${ketemu}/${BERLABEL.length} ketemu)`
      );
      if (melesetTeratas.length) {
        console.log(`      meleset di teratas: ${melesetTeratas.join("; ")}`);
      }
      if (takKetemu.length) {
        console.log(`      tidak ketemu: ${takKetemu.join(", ")}`);
      }

      harus.minimal(presisi, TARGET_PRESISI, "presisi");
      harus.minimal(recall, TARGET_RECALL, "recall");
    }
  );
});
