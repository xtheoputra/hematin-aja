/**
 * Lambang & wordmark Hematin Aja.
 * Mark = label harga (price tag) dengan tanda centang → "harga terbaik, terverifikasi".
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="url(#hm-grad)" />
      {/* Price tag */}
      <path
        d="M20.5 9.5h6.2a3 3 0 0 1 3 3v6.2a3 3 0 0 1-.88 2.12l-7.9 7.9a3 3 0 0 1-4.24 0l-6.2-6.2a3 3 0 0 1 0-4.24l7.9-7.9A3 3 0 0 1 20.5 9.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="24.4" cy="15.6" r="2.1" fill="#059669" />
      {/* Centang harga */}
      <path
        d="m16.8 21.2 2.3 2.3 4.6-4.6"
        stroke="#059669"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="hm-grad"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#047857" />
          <stop offset="0.5" stopColor="#059669" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 drop-shadow-sm" />
      <div className="leading-none">
        <span
          className={`block font-display text-lg font-extrabold tracking-tight ${
            light ? "text-white" : "text-ink-900"
          }`}
        >
          Hematin<span className={light ? "text-brand-200" : "text-brand-600"}>Aja</span>
        </span>
        <span
          className={`block text-[10px] font-medium tracking-wide ${
            light ? "text-brand-100" : "text-ink-400"
          }`}
        >
          banding harga · belanja hemat
        </span>
      </div>
    </div>
  );
}
