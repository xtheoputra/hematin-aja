/**
 * Avatar supermarket: kotak berwarna dengan inisial nama toko.
 * Dipakai konsisten di halaman detail, keranjang, dan insight.
 */
const SIZES = {
  sm: "h-8 w-8 text-[11px] rounded-lg",
  md: "h-10 w-10 text-xs rounded-xl",
  lg: "h-12 w-12 text-sm rounded-2xl",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function StoreAvatar({
  name,
  color,
  size = "md",
  className = "",
}: {
  name: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-bold text-white shadow-sm ring-1 ring-black/5 ${SIZES[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      }}
    >
      {initials(name)}
    </span>
  );
}
