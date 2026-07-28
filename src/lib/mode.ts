import { cookies } from "next/headers";
import { MODE_COOKIE, type DisplayMode } from "./modeShared";

/**
 * Mode tampilan harga (prinsip kejujuran data):
 *  - "all"  → tampilkan semua harga; estimasi ditandai jelas "Perkiraan".
 *  - "real" → HANYA harga nyata; sisanya ditandai "Tidak tersedia".
 *
 * Server-only (memakai next/headers). Konstanta/tipe yang aman untuk Client
 * Component ada di modeShared.ts.
 */
export { MODE_COOKIE, isRealOnly } from "./modeShared";
export type { DisplayMode } from "./modeShared";

export function getDisplayMode(): DisplayMode {
  try {
    return cookies().get(MODE_COOKIE)?.value === "real" ? "real" : "all";
  } catch {
    return "all";
  }
}
