// Konstanta & tipe mode tampilan yang AMAN dipakai di Client Component
// (tanpa next/headers). Logika server ada di mode.ts.

export const MODE_COOKIE = "hematin-mode";

export type DisplayMode = "all" | "real";

export const isRealOnly = (mode: DisplayMode): boolean => mode === "real";
