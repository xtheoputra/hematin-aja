/**
 * Seed data realistis untuk Hematin Aja.
 * Membuat supermarket, kategori, produk, dan RIWAYAT harga (~10 minggu)
 * sehingga grafik tren & insight langsung bisa ditampilkan.
 *
 * Harga acuan (basePrice) digrounding dari riset harga ritel Indonesia
 * 2025–2026 (Indomaret/Alfamart, Hemat.id, hargapangan, Blibli) — tetap
 * ilustratif, bukan harga resmi toko. Tiap supermarket punya "level harga"
 * berbeda agar perbandingan & insight terasa nyata.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PRNG deterministik (mulberry32) supaya hasil seed konsisten tiap run.
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// level = pengali harga rata-rata toko (minimarket cenderung lebih mahal per unit,
// hypermarket/grosir lebih murah, premium paling mahal).
// Catatan: hanya jaringan yang MASIH beroperasi di Indonesia (per 2025).
// Giant, GS Supermarket, Carrefour, dan Lulu Hypermarket TIDAK disertakan (sudah tutup).
const supermarkets = [
  // Minimarket
  { slug: "alfamart", name: "Alfamart", color: "#e3000f", website: "https://alfagift.id", type: "Minimarket", tagline: "Belanja Puas, Harga Pas", outlets: 19000, level: 1.02 },
  { slug: "indomaret", name: "Indomaret", color: "#0a4ea2", website: "https://klikindomaret.com", type: "Minimarket", tagline: "Mudah & Hemat", outlets: 21000, level: 1.01 },
  { slug: "alfamidi", name: "Alfamidi", color: "#f47b20", website: "https://alfamidiku.com", type: "Minimarket", tagline: "Belanja Hemat Lebih Lengkap", outlets: 2200, level: 1.01 },
  // Supermarket
  { slug: "superindo", name: "Super Indo", color: "#e2001a", website: "https://superindo.co.id", type: "Supermarket", tagline: "Lebih Segar, Lebih Hemat", outlets: 200, level: 0.99 },
  { slug: "foodmart", name: "Foodmart", color: "#e2231a", website: "https://foodmart.co.id", type: "Supermarket", tagline: "Belanja Lengkap Sekeluarga", outlets: 60, level: 0.99 },
  { slug: "yogya", name: "Yogya / Griya", color: "#e30613", website: "https://yogyagroup.com", type: "Supermarket", tagline: "Pilihan Keluarga Jawa Barat", outlets: 100, level: 0.98 },
  { slug: "tiptop", name: "Tip Top", color: "#00843d", website: "https://tiptop.co.id", type: "Supermarket", tagline: "Swalayan Halal Keluarga", outlets: 10, level: 0.98 },
  { slug: "harihari", name: "Hari Hari", color: "#0f8a3c", website: "https://haripasarswalayan.com", type: "Supermarket", tagline: "Pasar Swalayan Hemat", outlets: 20, level: 0.97 },
  { slug: "borma", name: "Borma", color: "#1565c0", website: "https://borma.co.id", type: "Supermarket", tagline: "Toserba Hemat Bandung", outlets: 30, level: 0.96 },
  { slug: "diamond", name: "Diamond", color: "#0e4c92", website: "https://diamond.co.id", type: "Supermarket", tagline: "Belanja Segar & Lengkap", outlets: 15, level: 1.0 },
  // Hypermarket
  { slug: "hypermart", name: "Hypermart", color: "#00a0e3", website: "https://hypermart.co.id", type: "Hypermarket", tagline: "Low Price & More", outlets: 100, level: 0.97 },
  { slug: "transmart", name: "Transmart", color: "#0046ad", website: "https://transmart.co.id", type: "Hypermarket", tagline: "Belanja Murah Banget", outlets: 90, level: 0.95 },
  { slug: "lottemart", name: "Lotte Mart", color: "#da291c", website: "https://lottemart.co.id", type: "Hypermarket", tagline: "Belanja Grosir Lebih Hemat", outlets: 50, level: 0.94 },
  { slug: "aeon", name: "AEON", color: "#e6007e", website: "https://aeonstore.id", type: "Hypermarket", tagline: "Quality & Trust dari Jepang", outlets: 12, level: 1.06 },
  // Premium
  { slug: "ranchmarket", name: "Ranch Market", color: "#00833e", website: "https://ranchmarket.co.id", type: "Supermarket Premium", tagline: "Fresh & Healthy", outlets: 16, level: 1.12 },
  { slug: "farmersmarket", name: "Farmers Market", color: "#5c9e31", website: "https://farmers-market.co.id", type: "Supermarket Premium", tagline: "Fresh Organic & Gourmet", outlets: 27, level: 1.13 },
  { slug: "grandlucky", name: "Grand Lucky", color: "#c8102e", website: "https://grandlucky.co.id", type: "Supermarket Premium", tagline: "Superstore Pilihan Keluarga", outlets: 10, level: 1.09 },
  { slug: "foodhall", name: "The FoodHall", color: "#111827", website: "https://thefoodhall.co.id", type: "Supermarket Premium", tagline: "A Taste of the World", outlets: 30, level: 1.16 },
];

const categories = [
  { slug: "sembako", name: "Sembako", icon: "🍚" },
  { slug: "bumbu-dapur", name: "Bumbu Dapur", icon: "🧂" },
  { slug: "makanan-instan", name: "Makanan Instan", icon: "🍜" },
  { slug: "minuman", name: "Minuman", icon: "🥤" },
  { slug: "susu-telur", name: "Susu & Telur", icon: "🥛" },
  { slug: "kebersihan", name: "Kebersihan", icon: "🧼" },
  { slug: "ibu-bayi", name: "Ibu & Bayi", icon: "🍼" },
  { slug: "snack", name: "Snack", icon: "🍪" },
];

// basePrice = harga acuan (Rupiah). volatility = besar variasi antar toko/waktu.
const products: {
  slug: string;
  name: string;
  brand?: string;
  unit: string;
  emoji: string;
  category: string;
  basePrice: number;
  volatility: number;
}[] = [
  // ── Sembako ──
  { slug: "beras-premium-5kg", name: "Beras Premium", brand: "Cap Bunga", unit: "5 kg", emoji: "🍚", category: "sembako", basePrice: 75000, volatility: 0.06 },
  { slug: "beras-medium-5kg", name: "Beras Medium", brand: "Raja Lele", unit: "5 kg", emoji: "🍚", category: "sembako", basePrice: 62000, volatility: 0.06 },
  { slug: "minyak-goreng-bimoli-2l", name: "Minyak Goreng Bimoli", brand: "Bimoli", unit: "2 L", emoji: "🛢️", category: "sembako", basePrice: 39000, volatility: 0.1 },
  { slug: "minyak-goreng-curah-1l", name: "Minyak Goreng Curah", unit: "1 L", emoji: "🛢️", category: "sembako", basePrice: 16000, volatility: 0.12 },
  { slug: "gula-pasir-gulaku-1kg", name: "Gula Pasir Gulaku", brand: "Gulaku", unit: "1 kg", emoji: "🍬", category: "sembako", basePrice: 18500, volatility: 0.07 },
  { slug: "tepung-segitiga-biru-1kg", name: "Tepung Terigu Segitiga Biru", brand: "Bogasari", unit: "1 kg", emoji: "🌾", category: "sembako", basePrice: 13000, volatility: 0.05 },

  // ── Bumbu Dapur ──
  { slug: "garam-dapur-250g", name: "Garam Beryodium", brand: "Cap Kapal", unit: "250 g", emoji: "🧂", category: "bumbu-dapur", basePrice: 4000, volatility: 0.05 },
  { slug: "kecap-abc-275ml", name: "Kecap Manis ABC", brand: "ABC", unit: "275 ml", emoji: "🍶", category: "bumbu-dapur", basePrice: 13500, volatility: 0.06 },
  { slug: "saus-sambal-abc-335ml", name: "Saus Sambal ABC", brand: "ABC", unit: "335 ml", emoji: "🌶️", category: "bumbu-dapur", basePrice: 16000, volatility: 0.06 },
  { slug: "royco-ayam-100g", name: "Royco Kaldu Ayam", brand: "Royco", unit: "100 g", emoji: "🧂", category: "bumbu-dapur", basePrice: 6500, volatility: 0.05 },
  { slug: "saus-tiram-saori-133ml", name: "Saus Tiram Saori", brand: "Saori", unit: "133 ml", emoji: "🍶", category: "bumbu-dapur", basePrice: 14000, volatility: 0.06 },
  { slug: "margarin-blueband-200g", name: "Margarin Blue Band", brand: "Blue Band", unit: "200 g", emoji: "🧈", category: "bumbu-dapur", basePrice: 9500, volatility: 0.05 },

  // ── Makanan Instan ──
  { slug: "indomie-goreng", name: "Indomie Goreng", brand: "Indomie", unit: "1 pcs (85 g)", emoji: "🍜", category: "makanan-instan", basePrice: 3300, volatility: 0.08 },
  { slug: "indomie-soto", name: "Indomie Kuah Soto", brand: "Indomie", unit: "1 pcs (75 g)", emoji: "🍜", category: "makanan-instan", basePrice: 3000, volatility: 0.08 },
  { slug: "mie-sedaap-goreng", name: "Mie Sedaap Goreng", brand: "Mie Sedaap", unit: "1 pcs (88 g)", emoji: "🍜", category: "makanan-instan", basePrice: 3000, volatility: 0.08 },
  { slug: "pop-mie-ayam", name: "Pop Mie Ayam", brand: "Pop Mie", unit: "1 cup (75 g)", emoji: "🍜", category: "makanan-instan", basePrice: 7500, volatility: 0.07 },
  { slug: "kornet-pronas-198g", name: "Kornet Sapi Pronas", brand: "Pronas", unit: "198 g", emoji: "🥫", category: "makanan-instan", basePrice: 22000, volatility: 0.07 },
  { slug: "sarden-abc-155g", name: "Sarden ABC Saus Tomat", brand: "ABC", unit: "155 g", emoji: "🥫", category: "makanan-instan", basePrice: 11000, volatility: 0.07 },

  // ── Minuman ──
  { slug: "aqua-600ml", name: "Air Mineral Aqua", brand: "Aqua", unit: "600 ml", emoji: "💧", category: "minuman", basePrice: 4000, volatility: 0.09 },
  { slug: "aqua-galon-19l", name: "Air Mineral Galon Aqua", brand: "Aqua", unit: "19 L", emoji: "🪣", category: "minuman", basePrice: 22000, volatility: 0.08 },
  { slug: "teh-pucuk-350ml", name: "Teh Pucuk Harum", brand: "Mayora", unit: "350 ml", emoji: "🧃", category: "minuman", basePrice: 3500, volatility: 0.08 },
  { slug: "teh-botol-sosro-350ml", name: "Teh Botol Sosro", brand: "Sosro", unit: "350 ml", emoji: "🧃", category: "minuman", basePrice: 4500, volatility: 0.07 },
  { slug: "coca-cola-390ml", name: "Coca-Cola", brand: "Coca-Cola", unit: "390 ml", emoji: "🥤", category: "minuman", basePrice: 6500, volatility: 0.07 },
  { slug: "kopi-kapal-api-special-mix", name: "Kopi Kapal Api Special Mix", brand: "Kapal Api", unit: "10 sachet", emoji: "☕", category: "minuman", basePrice: 12500, volatility: 0.07 },
  { slug: "nescafe-classic-sachet", name: "Nescafé Classic Sachet", brand: "Nescafé", unit: "1 sachet", emoji: "☕", category: "minuman", basePrice: 2000, volatility: 0.06 },
  { slug: "energen-coklat-10s", name: "Energen Coklat", brand: "Energen", unit: "10 sachet", emoji: "🥣", category: "minuman", basePrice: 14000, volatility: 0.06 },

  // ── Susu & Telur ──
  { slug: "telur-ayam-1kg", name: "Telur Ayam Negeri", unit: "1 kg", emoji: "🥚", category: "susu-telur", basePrice: 30000, volatility: 0.12 },
  { slug: "susu-ultra-coklat-1l", name: "Susu UHT Coklat", brand: "Ultra Milk", unit: "1 L", emoji: "🥛", category: "susu-telur", basePrice: 21000, volatility: 0.06 },
  { slug: "susu-ultra-250ml", name: "Susu UHT Ultra", brand: "Ultra Milk", unit: "250 ml", emoji: "🥛", category: "susu-telur", basePrice: 6000, volatility: 0.06 },
  { slug: "frisian-flag-kental-manis", name: "Kental Manis Frisian Flag", brand: "Frisian Flag", unit: "370 g", emoji: "🥛", category: "susu-telur", basePrice: 13000, volatility: 0.05 },
  { slug: "dancow-fortigro-400g", name: "Dancow FortiGro", brand: "Dancow", unit: "400 g", emoji: "🥛", category: "susu-telur", basePrice: 47000, volatility: 0.05 },
  { slug: "keju-kraft-cheddar-170g", name: "Keju Cheddar Kraft", brand: "Kraft", unit: "170 g", emoji: "🧀", category: "susu-telur", basePrice: 23000, volatility: 0.05 },

  // ── Kebersihan ──
  { slug: "sabun-lifebuoy-merah", name: "Sabun Mandi Lifebuoy", brand: "Lifebuoy", unit: "85 g", emoji: "🧼", category: "kebersihan", basePrice: 4000, volatility: 0.06 },
  { slug: "pasta-gigi-pepsodent-190g", name: "Pasta Gigi Pepsodent", brand: "Pepsodent", unit: "190 g", emoji: "🪥", category: "kebersihan", basePrice: 21000, volatility: 0.07 },
  { slug: "shampoo-sunsilk-170ml", name: "Sampo Sunsilk", brand: "Sunsilk", unit: "170 ml", emoji: "🧴", category: "kebersihan", basePrice: 22000, volatility: 0.07 },
  { slug: "deterjen-rinso-770g", name: "Deterjen Rinso", brand: "Rinso", unit: "770 g", emoji: "🧴", category: "kebersihan", basePrice: 23000, volatility: 0.08 },
  { slug: "sunlight-jeruk-755ml", name: "Sabun Cuci Piring Sunlight", brand: "Sunlight", unit: "755 ml", emoji: "🧽", category: "kebersihan", basePrice: 18000, volatility: 0.07 },
  { slug: "wipol-karbol-800ml", name: "Pembersih Lantai Wipol", brand: "Wipol", unit: "800 ml", emoji: "🧹", category: "kebersihan", basePrice: 15000, volatility: 0.07 },
  { slug: "tisu-paseo-250s", name: "Tisu Wajah Paseo", brand: "Paseo", unit: "250 sheet", emoji: "🧻", category: "kebersihan", basePrice: 13000, volatility: 0.06 },
  { slug: "pembalut-laurier-isi10", name: "Pembalut Laurier", brand: "Laurier", unit: "isi 10", emoji: "🧷", category: "kebersihan", basePrice: 16000, volatility: 0.06 },

  // ── Ibu & Bayi ──
  { slug: "popok-mamypoko-pants-m", name: "Popok Mamy Poko Pants M", brand: "Mamy Poko", unit: "isi 30", emoji: "👶", category: "ibu-bayi", basePrice: 60000, volatility: 0.06 },
  { slug: "bedak-bayi-cussons-100g", name: "Bedak Bayi Cussons", brand: "Cussons", unit: "100 g", emoji: "👶", category: "ibu-bayi", basePrice: 12000, volatility: 0.05 },
  { slug: "sabun-bayi-zwitsal-100ml", name: "Sabun Bayi Zwitsal", brand: "Zwitsal", unit: "100 ml", emoji: "🍼", category: "ibu-bayi", basePrice: 16000, volatility: 0.05 },

  // ── Snack ──
  { slug: "chitato-sapi-panggang", name: "Chitato Sapi Panggang", brand: "Indofood", unit: "68 g", emoji: "🍟", category: "snack", basePrice: 11500, volatility: 0.06 },
  { slug: "cheetos-jagung-bakar", name: "Cheetos Jagung Bakar", brand: "Cheetos", unit: "65 g", emoji: "🧀", category: "snack", basePrice: 9000, volatility: 0.06 },
  { slug: "biskuit-roma-kelapa", name: "Biskuit Roma Kelapa", brand: "Mayora", unit: "300 g", emoji: "🍪", category: "snack", basePrice: 13000, volatility: 0.05 },
  { slug: "silverqueen-chunky-65g", name: "SilverQueen Chunky", brand: "SilverQueen", unit: "65 g", emoji: "🍫", category: "snack", basePrice: 17000, volatility: 0.07 },
  { slug: "oreo-original-133g", name: "Biskuit Oreo Original", brand: "Oreo", unit: "133 g", emoji: "🍪", category: "snack", basePrice: 9000, volatility: 0.05 },
  { slug: "beng-beng", name: "Wafer Beng Beng", brand: "Mayora", unit: "1 pcs", emoji: "🍫", category: "snack", basePrice: 2500, volatility: 0.06 },
  { slug: "tango-wafer-coklat-130g", name: "Wafer Tango Coklat", brand: "Tango", unit: "130 g", emoji: "🍫", category: "snack", basePrice: 11000, volatility: 0.05 },
  { slug: "taro-net-rumput-laut", name: "Taro Net Rumput Laut", brand: "Taro", unit: "70 g", emoji: "🍘", category: "snack", basePrice: 9000, volatility: 0.06 },
];

const WEEKS = 10; // jumlah titik riwayat per produk per toko

function round100(n: number) {
  return Math.round(n / 100) * 100;
}

async function main() {
  console.log("🧹 Membersihkan data lama...");
  await prisma.price.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supermarket.deleteMany();

  console.log("🏪 Membuat supermarket...");
  const smRecords = await Promise.all(
    supermarkets.map(({ level, ...data }) => prisma.supermarket.create({ data }))
  );
  const levelBySlug = Object.fromEntries(
    supermarkets.map((s) => [s.slug, s.level])
  );

  console.log("🗂️  Membuat kategori...");
  const catRecords = await Promise.all(
    categories.map((c) => prisma.category.create({ data: c }))
  );
  const catBySlug = Object.fromEntries(catRecords.map((c) => [c.slug, c]));

  console.log("📦 Membuat produk + riwayat harga...");
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  let priceCount = 0;
  let pi = 0;
  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        unit: p.unit,
        emoji: p.emoji,
        categoryId: catBySlug[p.category].id,
      },
    });

    const priceRows: {
      productId: string;
      supermarketId: string;
      price: number;
      inStock: boolean;
      source: string;
      recordedAt: Date;
    }[] = [];

    let si = 0;
    for (const sm of smRecords) {
      const rng = makeRng(1000 * (pi + 1) + (si + 1));
      const level = levelBySlug[sm.slug] ?? 1;
      // bias toko: level harga tetap + sedikit variasi acak per produk
      const storeBias = level * (1 + (rng() - 0.5) * p.volatility * 1.1);
      // tren musiman ringan + noise mingguan
      for (let w = WEEKS - 1; w >= 0; w--) {
        const trend = 1 + Math.sin((w / WEEKS) * Math.PI) * p.volatility * 0.5;
        const noise = 1 + (rng() - 0.5) * p.volatility;
        let price = round100(p.basePrice * storeBias * trend * noise);
        // sesekali ada promo (harga turun tajam) di minggu terbaru
        const promo = w <= 1 && rng() < 0.18 ? 0.85 : 1;
        price = round100(price * promo);

        priceRows.push({
          productId: product.id,
          supermarketId: sm.id,
          price,
          inStock: rng() > 0.05, // 5% kemungkinan stok habis
          source: "seed",
          recordedAt: new Date(now - w * WEEK_MS),
        });
      }
      si++;
    }

    await prisma.price.createMany({ data: priceRows });
    priceCount += priceRows.length;
    pi++;
  }

  console.log(
    `✅ Selesai: ${smRecords.length} supermarket, ${catRecords.length} kategori, ${products.length} produk, ${priceCount} catatan harga.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
