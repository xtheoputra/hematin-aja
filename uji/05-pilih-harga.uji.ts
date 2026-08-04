/**
 * Uji logika penentu harga — tanpa database, yang memang jadi alasan
 * `queries/pilih.ts` dipisahkan dari lapisan Prisma.
 *
 * Termasuk kasus §7 "uji harga": Toko A 3000 vs Toko B 3200 → A lebih dulu,
 * produk tanpa harga tidak bikin crash, dan mode Hanya Nyata menyembunyikan
 * perkiraan tanpa merusak urutan.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  alignedCells,
  cellComparator,
  cellFor,
  minInStock,
  pickPerStore,
  type PriceWithStore,
  type SupermarketLite,
} from "@/lib/queries/pilih";

const toko = (id: string, nama: string): SupermarketLite => ({
  id,
  slug: id,
  name: nama,
  color: "#000",
  type: "Supermarket",
});

const A = toko("a", "Toko A");
const B = toko("b", "Toko B");
const C = toko("c", "Toko C");

function harga(
  supermarketId: string,
  price: number,
  opts: { source?: string; hari?: number; inStock?: boolean } = {}
): PriceWithStore {
  const { source = "seed", hari = 0, inStock = true } = opts;
  return {
    supermarketId,
    price,
    inStock,
    url: null,
    source,
    recordedAt: new Date(Date.UTC(2026, 7, 4 - hari)),
    supermarket: { slug: supermarketId, name: `Toko ${supermarketId.toUpperCase()}`, color: "#000" },
  };
}

// Daftar harga selalu terurut TERBARU dulu — itu kontrak dari lapisan muat.
const urutTerbaru = (h: PriceWithStore[]) =>
  [...h].sort((x, y) => +y.recordedAt - +x.recordedAt);

kelompok("pickPerStore() — mode Semua", () => {
  uji("mengambil satu harga per toko", () => {
    const per = pickPerStore(urutTerbaru([harga("a", 3000), harga("b", 3200)]), false);
    harus.sama(per.size, 2);
  });

  uji("memilih yang terbaru bila sumbernya sama", () => {
    const per = pickPerStore(
      urutTerbaru([harga("a", 3000, { hari: 5 }), harga("a", 3100, { hari: 0 })]),
      false
    );
    harus.sama(per.get("a")!.price, 3100);
  });

  uji("harga NYATA menang atas perkiraan walau lebih tua", () => {
    // Justru inilah maksudnya: perkiraan yang baru tidak lebih berharga
    // daripada pengamatan sungguhan yang agak lama.
    const per = pickPerStore(
      urutTerbaru([
        harga("a", 3100, { hari: 0, source: "seed" }),
        harga("a", 2950, { hari: 30, source: "open-prices" }),
      ]),
      false
    );
    harus.sama(per.get("a")!.price, 2950);
    harus.benar(per.get("a")!.isReal);
  });

  uji("harga manual dihitung NYATA", () => {
    const per = pickPerStore(
      urutTerbaru([
        harga("a", 3100, { hari: 0, source: "seed" }),
        harga("a", 3000, { hari: 2, source: "manual" }),
      ]),
      false
    );
    harus.benar(per.get("a")!.isReal, "harga manual");
    harus.sama(per.get("a")!.price, 3000);
  });
});

kelompok("pickPerStore() — mode Hanya Nyata", () => {
  const daftar = urutTerbaru([
    harga("a", 3100, { source: "seed" }),
    harga("b", 3200, { source: "open-prices" }),
    harga("c", 2900, { source: "import-off" }),
  ]);

  uji("toko tanpa harga nyata tidak ikut", () => {
    const per = pickPerStore(daftar, true);
    harus.sama(per.size, 1);
    harus.benar(per.has("b"));
    harus.salah(per.has("a"), "toko dengan seed saja");
  });

  uji("harga perkiraan yang lebih murah TIDAK bocor ke mode nyata", () => {
    // Kalau ini gagal, mode "Hanya Nyata" berbohong — persis yang paling
    // dijaga proyek ini.
    const per = pickPerStore(daftar, true);
    harus.sama(minInStock(per), 3200);
  });
});

kelompok("urutan harga", () => {
  uji("Toko A 3000 muncul lebih dulu daripada Toko B 3200", () => {
    const per = pickPerStore(urutTerbaru([harga("a", 3000), harga("b", 3200)]), false);
    const sel = alignedCells(per, [B, A]).sort(cellComparator);
    harus.sama(sel[0].name, "Toko A");
    harus.benar(sel[0].isCheapest, "penanda termurah");
    harus.salah(sel[1].isCheapest, "toko lebih mahal");
  });

  uji("stok habis kalah dari yang tersedia meski lebih murah", () => {
    const per = pickPerStore(
      urutTerbaru([harga("a", 2000, { inStock: false }), harga("b", 3200)]),
      false
    );
    const sel = alignedCells(per, [A, B]).sort(cellComparator);
    harus.sama(sel[0].name, "Toko B");
  });

  uji("toko tanpa harga jatuh paling bawah", () => {
    const per = pickPerStore(urutTerbaru([harga("a", 3000)]), false);
    const sel = alignedCells(per, [A, B, C]).sort(cellComparator);
    harus.sama(sel[0].name, "Toko A");
    harus.salah(sel[1].available, "toko tanpa harga");
    harus.salah(sel[2].available, "toko tanpa harga");
  });

  uji("selisih ke termurah dihitung benar", () => {
    const per = pickPerStore(urutTerbaru([harga("a", 3000), harga("b", 3200)]), false);
    const sel = alignedCells(per, [A, B]);
    harus.sama(sel[0].vsMin, 0);
    harus.sama(sel[1].vsMin, 200);
  });
});

kelompok("produk tanpa harga tidak bikin crash", () => {
  uji("daftar harga kosong", () => {
    const per = pickPerStore([], false);
    harus.sama(per.size, 0);
    harus.sama(minInStock(per), null);
  });

  uji('sel kosong ditandai "tidak tersedia", bukan Rp 0', () => {
    const sel = cellFor(A, undefined, null);
    harus.sama(sel.price, null);
    harus.salah(sel.available);
    harus.sama(sel.sourceKind, "none");
  });

  uji("semua stok habis → tidak ada yang termurah", () => {
    const per = pickPerStore(
      urutTerbaru([harga("a", 3000, { inStock: false })]),
      false
    );
    harus.sama(minInStock(per), null);
    const sel = alignedCells(per, [A]);
    harus.salah(sel[0].isCheapest);
  });
});
