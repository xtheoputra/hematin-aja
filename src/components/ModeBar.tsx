import DisplayModeToggle from "./DisplayModeToggle";
import type { DisplayMode } from "@/lib/mode";

/**
 * Bilah tipis "mode tampilan harga" untuk layar < lg (HP & tablet).
 * Di layar lg+, pengalih ada di TopNav. Memastikan kontrol kejujuran data
 * selalu terjangkau di setiap halaman tanpa menyesaki navigasi.
 */
export default function ModeBar({ mode }: { mode: DisplayMode }) {
  return (
    <div className="border-b border-ink-200/70 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-900/85 lg:hidden">
      <div className="container-app flex items-center justify-between gap-2 py-2">
        <span className="truncate text-[11px] font-medium text-ink-500 dark:text-ink-400">
          Tampilkan harga
        </span>
        <DisplayModeToggle mode={mode} />
      </div>
    </div>
  );
}
