/**
 * Pembacaan sesi admin dari cookie — terpisah dari `admin.ts` karena berkas ini
 * menyentuh `next/headers` dan karenanya hanya bisa hidup di sisi server.
 */
import { cookies } from "next/headers";
import { COOKIE_ADMIN, adminDiaktifkan, tokenSah } from "@/lib/admin";

export function sesiAdminSah(): boolean {
  if (!adminDiaktifkan()) return false;
  try {
    return tokenSah(cookies().get(COOKIE_ADMIN)?.value);
  } catch {
    return false;
  }
}
