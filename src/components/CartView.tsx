"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import KartuKeputusan from "@/components/agen/KartuKeputusan";
import DaftarPeringatan from "@/components/agen/DaftarPeringatan";
import PeringkatToko from "@/components/agen/PeringkatToko";
import DaftarBelanja from "@/components/agen/DaftarBelanja";
import SaranPengganti from "@/components/agen/SaranPengganti";
import AturOngkos from "@/components/agen/AturOngkos";
import { BIAYA_PERJALANAN_BAWAAN, type Rencana } from "@/lib/agen";
import type { DisplayMode } from "@/lib/modeShared";

const KUNCI_ONGKOS = "hematin-ongkos-v1";

export default function CartView({ mode }: { mode: DisplayMode }) {
  const { items, setQty, remove, clear, count } = useCart();
  const [rencana, setRencana] = useState<Rencana | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [gagal, setGagal] = useState(false);
  const [ongkos, setOngkos] = useState(BIAYA_PERJALANAN_BAWAAN);
  const [siap, setSiap] = useState(false);

  // Ongkos perjalanan diingat: menyetelnya ulang tiap membuka halaman akan
  // membuat sarannya berubah-ubah tanpa sebab yang terlihat pengguna.
  useEffect(() => {
    const simpanan = Number(localStorage.getItem(KUNCI_ONGKOS));
    if (Number.isFinite(simpanan) && simpanan >= 0) setOngkos(simpanan);
    setSiap(true);
  }, []);

  useEffect(() => {
    if (siap) localStorage.setItem(KUNCI_ONGKOS, String(ongkos));
  }, [ongkos, siap]);

  useEffect(() => {
    if (!siap) return;
    if (items.length === 0) {
      setRencana(null);
      return;
    }
    const ctrl = new AbortController();
    setMemuat(true);
    setGagal(false);
    fetch("/api/agen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        biayaPerjalanan: ongkos,
      }),
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: Rencana) => setRencana(d))
      .catch((e) => {
        // Pembatalan karena keranjang berubah bukan kegagalan; menampilkannya
        // sebagai error justru membuat halaman berkedip merah saat dipakai.
        if (e?.name !== "AbortError") setGagal(true);
      })
      .finally(() => setMemuat(false));
    return () => ctrl.abort();
    // `mode` ikut: ganti mode tampilan → rencana dihitung ulang di server.
  }, [items, ongkos, mode, siap]);

  const pecah = rencana?.keputusan.jenis === "pecah-dua-toko" ? rencana.pecah : null;
  const barisRencana = pecah?.baris ?? rencana?.tokoTunggal[0]?.baris ?? [];

  return (
    <main>
      <PageHeader
        title="Keranjang"
        emoji="🧺"
        subtitle={`${count} barang · rencana belanja dihitung otomatis`}
        action={
          items.length > 0 ? (
            <button
              onClick={clear}
              className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-xs font-semibold backdrop-blur transition active:scale-95"
            >
              Kosongkan
            </button>
          ) : undefined
        }
      />

      <div className="container-app space-y-4 pt-5">
        {items.length === 0 ? (
          <KeranjangKosong />
        ) : (
          <>
            {memuat && !rencana && <RangkaMuat />}

            {gagal && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                Gagal menyusun rencana belanja. Coba ubah jumlah barang untuk menghitung ulang.
              </div>
            )}

            {rencana && (
              <>
                <KartuKeputusan
                  keputusan={rencana.keputusan}
                  keyakinan={rencana.keyakinan}
                />

                <DaftarPeringatan peringatan={rencana.peringatan} />

                {pecah && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RincianPecah
                      label="Belanja utama"
                      nama={pecah.utama.nama}
                      jumlah={pecah.utama.jumlah}
                      total={pecah.utama.total}
                    />
                    <RincianPecah
                      label="Mampir sebentar"
                      nama={pecah.kedua.nama}
                      jumlah={pecah.kedua.jumlah}
                      total={pecah.kedua.total}
                    />
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  <div className="space-y-4">
                    <DaftarBelanja
                      baris={barisRencana}
                      judul={pecah ? "Daftar belanja per toko" : "Daftar belanja"}
                      kelompokkanPerToko={!!pecah}
                    />
                    <SaranPengganti saran={rencana.substitusi} />
                  </div>

                  <div className="space-y-4">
                    <PeringkatToko toko={rencana.tokoTunggal} />
                    <AturOngkos nilai={ongkos} onGanti={setOngkos} />
                  </div>
                </div>
              </>
            )}

            <section className="card p-4">
              <h2 className="mb-3 font-display text-sm font-bold text-ink-800 dark:text-ink-100">
                Ubah keranjang ({items.length})
              </h2>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-2xl dark:bg-ink-800">
                      {i.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                        <Link href={`/produk/${i.slug}`} className="hover:underline">
                          {i.name}
                        </Link>
                      </p>
                      <p className="text-[11px] text-ink-400">{i.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(i.productId, i.qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition active:scale-90 dark:bg-ink-800 dark:text-ink-300"
                        aria-label={`Kurangi ${i.name}`}
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums">
                        {i.qty}
                      </span>
                      <button
                        onClick={() => setQty(i.productId, i.qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition active:scale-90 dark:bg-ink-800 dark:text-ink-300"
                        aria-label={`Tambah ${i.name}`}
                      >
                        ＋
                      </button>
                      <button
                        onClick={() => remove(i.productId)}
                        className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-300 transition hover:text-rose-500"
                        aria-label={`Hapus ${i.name}`}
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function RincianPecah({
  label,
  nama,
  jumlah,
  total,
}: {
  label: string;
  nama: string;
  jumlah: number;
  total: number;
}) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className="mt-0.5 truncate font-display text-lg font-extrabold text-ink-800 dark:text-ink-100">
        {nama}
      </p>
      <p className="text-[11px] text-ink-400">
        {jumlah} barang · {formatRupiah(total)}
      </p>
    </div>
  );
}

function KeranjangKosong() {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-3xl dark:bg-ink-800">
        🧺
      </div>
      <p className="mt-4 text-sm font-semibold text-ink-700 dark:text-ink-200">
        Keranjang masih kosong
      </p>
      <p className="mt-1 text-xs text-ink-400">
        Tambahkan produk, nanti saya susunkan mau belanja ke mana dan kenapa.
      </p>
      <Link href="/" className="btn-primary mt-5 px-5 py-3 text-sm">
        Mulai cari produk
      </Link>
    </div>
  );
}

function RangkaMuat() {
  return (
    <div className="space-y-3" aria-label="Menyusun rencana" role="status">
      <div className="skeleton h-36 w-full" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}
