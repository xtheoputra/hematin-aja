import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Emerald — warna utama "hemat / hijau"
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // Gold — aksen "saving / promo / hemat"
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        // Ink — neutral teks (sedikit kebiruan, lebih tajam dari slate murni)
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e6ebf1",
          300: "#cdd5df",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#0b1120",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px -8px rgba(15,23,42,0.10)",
        "card-hover": "0 2px 4px rgba(15,23,42,0.06), 0 12px 28px -8px rgba(15,23,42,0.16)",
        glow: "0 10px 30px -10px rgba(5,150,105,0.45)",
        nav: "0 -1px 2px rgba(15,23,42,0.04), 0 -8px 24px -12px rgba(15,23,42,0.12)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #047857 0%, #059669 45%, #10b981 100%)",
        "brand-mesh":
          "radial-gradient(at 0% 0%, rgba(16,185,129,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(245,158,11,0.12) 0px, transparent 45%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pop-in": "pop-in 0.2s ease-out both",
        "page-in": "page-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
