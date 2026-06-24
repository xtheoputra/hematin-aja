"use client";

import { useState } from "react";

/**
 * Thumbnail produk: tampilkan gambar (mis. dari Open Food Facts) bila ada,
 * fallback ke emoji bila kosong atau gagal dimuat.
 */
export default function ProductThumb({
  image,
  emoji,
  alt,
  className = "",
  imgClassName = "",
  emojiClassName = "text-3xl",
}: {
  image?: string | null;
  emoji: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = image && !failed;

  return (
    <span
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-ink-100 to-ink-50 dark:from-ink-800 dark:to-ink-700 ${className}`}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image as string}
          alt={alt || ""}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain p-1 ${imgClassName}`}
        />
      ) : (
        <span className={emojiClassName}>{emoji}</span>
      )}
    </span>
  );
}
