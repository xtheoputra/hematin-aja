import { Suspense } from "react";
import { getCategories, getProducts } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";
import SearchControls from "@/components/SearchControls";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; kategori?: string };
}) {
  const search = searchParams.q?.trim() || undefined;
  const category = searchParams.kategori || undefined;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ search, category }),
  ]);

  return (
    <main>
      <header className="sticky top-0 z-30 bg-gradient-to-b from-brand-600 to-brand-500 px-4 pb-4 pt-6 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Hematin Aja 🛒
            </h1>
            <p className="text-xs text-brand-100">
              Banding harga {categories.length} kategori dari banyak supermarket
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        <Suspense fallback={<div className="h-24" />}>
          <SearchControls categories={categories} />
        </Suspense>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {products.length} produk ditemukan
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 text-sm text-slate-500">
              Produk tidak ditemukan.
            </p>
            <p className="text-xs text-slate-400">Coba kata kunci lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
