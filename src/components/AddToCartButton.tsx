"use client";

import { useCart, type CartItem } from "./CartProvider";

export default function AddToCartButton({
  item,
  className = "",
  size = "sm",
}: {
  item: Omit<CartItem, "qty">;
  className?: string;
  size?: "sm" | "lg";
}) {
  const { add, has } = useCart();
  const added = has(item.productId);

  const base =
    size === "lg"
      ? "h-12 px-5 text-base rounded-xl w-full"
      : "h-9 w-9 rounded-lg text-lg";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(item);
      }}
      aria-label={added ? "Sudah di keranjang" : "Tambah ke keranjang"}
      className={`flex items-center justify-center gap-2 font-semibold transition active:scale-95 ${base} ${
        added
          ? "bg-brand-100 text-brand-700"
          : "bg-brand-600 text-white hover:bg-brand-700"
      } ${className}`}
    >
      {size === "lg" ? (
        <>
          <span>{added ? "✓" : "＋"}</span>
          {added ? "Ditambahkan ke keranjang" : "Tambah ke keranjang"}
        </>
      ) : (
        <span>{added ? "✓" : "＋"}</span>
      )}
    </button>
  );
}
