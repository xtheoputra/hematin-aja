/**
 * Seed data realistis untuk Hematin Aja.
 * Membuat supermarket, kategori, produk, dan RIWAYAT harga (~10 minggu)
 * sehingga grafik tren & insight langsung bisa ditampilkan.
 *
 * Catatan: harga di sini adalah contoh ilustratif, bukan harga resmi toko.
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

const supermarkets = [
  { slug: "alfamart", name: "Alfamart", color: "#e3000f", website: "https://alfagift.id" },
  { slug: "indomaret", name: "Indomaret", color: "#0a4ea2", website: "https://klikindomaret.com" },
  { slug: "superindo", name: "Super Indo", color: "#e2001a", website: "https://superindo.co.id" },
  { slug: "hypermart", name: "Hypermart", color: "#00a0e3", website: "https://hypermart.co.id" },
  { slug: "transmart", name: "Transmart", color: "#0046ad", website: "https://transmart.co.id" },
  { slug: "ranchmarket", name: "Ranch Market", color: "#00833e", website: "https://ranchmarket.co.id" },
];

const categories = [
  { slug: "sembako", name: "Sembako", icon: "🍚" },
  { slug: "minuman", name: "Minuman", icon: "🥤" },
  { slug: "makanan-instan", name: "Makanan Instan", icon: "🍜" },
  { slug: "susu-telur", name: "Susu & Telur", icon: "🥛" },
  { slug: "kebersihan", name: "Kebersihan", icon: "🧼" },
  { slug: "snack", name: "Snack", icon: "🍪" },
];

// basePrice = harga acuan (Rupiah). volatility = seberapa besar variasi antar toko/waktu.
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
  { slug: "indomie-goreng", name: "Indomie Goreng", brand: "Indomie", unit: "1 pcs (85 g)", emoji: "🍜", category: "makanan-instan", basePrice: 3300, volatility: 0.08 },
  { slug: "indomie-soto", name: "Indomie Kuah Soto", brand: "Indomie", unit: "1 pcs (75 g)", emoji: "🍜", category: "makanan-instan", basePrice: 3100, volatility: 0.08 },
  { slug: "beras-pandan-wangi-5kg", name: "Beras Pandan Wangi", brand: "Cap Bunga", unit: "5 kg", emoji: "🍚", category: "sembako", basePrice: 72000, volatility: 0.06 },
  { slug: "minyak-goreng-bimoli-2l", name: "Minyak Goreng Bimoli", brand: "Bimoli", unit: "2 L", emoji: "🛢️", category: "sembako", basePrice: 38000, volatility: 0.1 },
  { slug: "gula-pasir-gulaku-1kg", name: "Gula Pasir Gulaku", brand: "Gulaku", unit: "1 kg", emoji: "🧂", category: "sembako", basePrice: 17500, volatility: 0.07 },
  { slug: "tepung-segitiga-biru-1kg", name: "Tepung Terigu Segitiga Biru", brand: "Bogasari", unit: "1 kg", emoji: "🌾", category: "sembako", basePrice: 12500, volatility: 0.05 },
  { slug: "telur-ayam-1kg", name: "Telur Ayam Negeri", unit: "1 kg", emoji: "🥚", category: "susu-telur", basePrice: 28000, volatility: 0.12 },
  { slug: "susu-ultra-coklat-1l", name: "Susu UHT Coklat", brand: "Ultra Milk", unit: "1 L", emoji: "🥛", category: "susu-telur", basePrice: 19500, volatility: 0.06 },
  { slug: "susu-frisian-flag-kental-manis", name: "Kental Manis", brand: "Frisian Flag", unit: "370 g", emoji: "🥛", category: "susu-telur", basePrice: 11500, volatility: 0.05 },
  { slug: "aqua-600ml", name: "Air Mineral", brand: "Aqua", unit: "600 ml", emoji: "💧", category: "minuman", basePrice: 3500, volatility: 0.09 },
  { slug: "teh-pucuk-350ml", name: "Teh Pucuk Harum", brand: "Mayora", unit: "350 ml", emoji: "🧃", category: "minuman", basePrice: 4000, volatility: 0.08 },
  { slug: "kopi-kapal-api-special-mix", name: "Kopi Kapal Api Special Mix", brand: "Kapal Api", unit: "10 sachet", emoji: "☕", category: "minuman", basePrice: 12000, volatility: 0.07 },
  { slug: "sabun-lifebuoy-merah", name: "Sabun Mandi Lifebuoy", brand: "Lifebuoy", unit: "85 g", emoji: "🧼", category: "kebersihan", basePrice: 4200, volatility: 0.06 },
  { slug: "pasta-gigi-pepsodent-190g", name: "Pasta Gigi Pepsodent", brand: "Pepsodent", unit: "190 g", emoji: "🪥", category: "kebersihan", basePrice: 16000, volatility: 0.07 },
  { slug: "deterjen-rinso-770g", name: "Deterjen Rinso", brand: "Rinso", unit: "770 g", emoji: "🧴", category: "kebersihan", basePrice: 21000, volatility: 0.08 },
  { slug: "chitato-sapi-panggang", name: "Chitato Sapi Panggang", brand: "Indofood", unit: "68 g", emoji: "🍟", category: "snack", basePrice: 11000, volatility: 0.06 },
  { slug: "biskuit-roma-kelapa", name: "Biskuit Roma Kelapa", brand: "Mayora", unit: "300 g", emoji: "🍪", category: "snack", basePrice: 9500, volatility: 0.05 },
  { slug: "silverqueen-chunky-65g", name: "SilverQueen Chunky", brand: "SilverQueen", unit: "65 g", emoji: "🍫", category: "snack", basePrice: 16500, volatility: 0.07 },
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
    supermarkets.map((s) => prisma.supermarket.create({ data: s }))
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

    // Tiap supermarket punya "bias" harga tetap (ada yang konsisten lebih murah/mahal).
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
      const storeBias = 1 + (rng() - 0.5) * p.volatility * 1.6; // bias toko
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
