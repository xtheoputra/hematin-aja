/**
 * Uji pelindung sandi & pembatas laju.
 *
 * Yang dijaga di sini: rute yang menembak situs pihak ketiga tidak boleh
 * terbuka, dan cookie sesi tidak boleh bisa dipalsukan tanpa tahu sandinya.
 */
import { kelompok, uji, harus } from "./kerangka";
import {
  COOKIE_ADMIN,
  HEADER_ADMIN,
  adminDiaktifkan,
  bacaCookie,
  batasLaju,
  lupakanBatasLaju,
  pengenalPemanggil,
  permintaanAdminSah,
  sandiCocok,
  tokenSah,
  tokenSesi,
} from "@/lib/admin";

const SANDI = "sandi-uji-yang-panjang";

function denganSandi<T>(fn: () => T): T {
  const sebelum = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = SANDI;
  try {
    return fn();
  } finally {
    if (sebelum === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = sebelum;
  }
}

function tanpaSandi<T>(fn: () => T): T {
  const sebelum = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;
  try {
    return fn();
  } finally {
    if (sebelum !== undefined) process.env.ADMIN_PASSWORD = sebelum;
  }
}

const permintaan = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/scrape", { method: "POST", headers });

kelompok("admin — bawaan tertutup", () => {
  uji("mati total selama ADMIN_PASSWORD belum diisi", () => {
    tanpaSandi(() => {
      harus.salah(adminDiaktifkan(), "adminDiaktifkan");
      harus.salah(sandiCocok("apa pun"), "sandiCocok");
      harus.salah(tokenSah("apa pun"), "tokenSah");
    });
  });

  uji("permintaan tanpa kredensial ditolak walau sandi sudah disetel", () => {
    denganSandi(() => harus.salah(permintaanAdminSah(permintaan())));
  });

  uji("saat sandi belum disetel, tidak ada cara masuk sama sekali", () => {
    tanpaSandi(() =>
      harus.salah(permintaanAdminSah(permintaan({ [HEADER_ADMIN]: "" })))
    );
  });
});

kelompok("admin — token sesi", () => {
  uji("cookie berisi token, bukan sandinya", () => {
    denganSandi(() => harus.benar(tokenSesi(SANDI) !== SANDI));
  });

  uji("token yang benar diterima", () => {
    denganSandi(() => harus.benar(tokenSah(tokenSesi(SANDI))));
  });

  uji("token dari sandi lain ditolak", () => {
    denganSandi(() => harus.salah(tokenSah(tokenSesi("sandi-yang-salah"))));
  });

  uji("token asal-asalan ditolak", () => {
    denganSandi(() => {
      harus.salah(tokenSah("kosong"), "teks pendek");
      harus.salah(tokenSah("0".repeat(64)), "panjang benar tapi isi salah");
      harus.salah(tokenSah(""), "kosong");
      harus.salah(tokenSah(null), "null");
    });
  });

  uji("sandi salah ditolak, sandi benar diterima", () => {
    denganSandi(() => {
      harus.salah(sandiCocok("bukan-ini"));
      harus.benar(sandiCocok(SANDI));
    });
  });
});

kelompok("admin — jalur masuk yang sah", () => {
  uji("cookie sesi diterima", () => {
    denganSandi(() =>
      harus.benar(
        permintaanAdminSah(
          permintaan({ cookie: `${COOKIE_ADMIN}=${tokenSesi(SANDI)}` })
        )
      )
    );
  });

  uji("header sandi diterima (untuk skrip & penjadwal)", () => {
    denganSandi(() =>
      harus.benar(permintaanAdminSah(permintaan({ [HEADER_ADMIN]: SANDI })))
    );
  });

  uji("cookie palsu ditolak", () => {
    denganSandi(() =>
      harus.salah(
        permintaanAdminSah(permintaan({ cookie: `${COOKIE_ADMIN}=palsu` }))
      )
    );
  });
});

kelompok("bacaCookie()", () => {
  uji("mengambil cookie yang benar dari beberapa cookie", () => {
    harus.sama(bacaCookie("a=1; hematin-admin=xyz; b=2", COOKIE_ADMIN), "xyz");
  });
  uji("nama yang tidak ada = null", () =>
    harus.sama(bacaCookie("a=1", COOKIE_ADMIN), null));
  uji("header kosong = null", () => harus.sama(bacaCookie(null, COOKIE_ADMIN), null));
  uji("tidak tertukar dengan nama yang mirip", () =>
    harus.sama(bacaCookie("xhematin-admin=palsu", COOKIE_ADMIN), null));
});

kelompok("batasLaju()", () => {
  uji("melewatkan sampai batas, lalu menahan", () => {
    lupakanBatasLaju("uji");
    const t = 1_000_000;
    harus.benar(batasLaju("uji", 3, 60_000, t).boleh, "ke-1");
    harus.benar(batasLaju("uji", 3, 60_000, t).boleh, "ke-2");
    harus.benar(batasLaju("uji", 3, 60_000, t).boleh, "ke-3");
    harus.salah(batasLaju("uji", 3, 60_000, t).boleh, "ke-4");
  });

  uji("memberi tahu berapa detik lagi", () => {
    lupakanBatasLaju("uji2");
    const t = 2_000_000;
    batasLaju("uji2", 1, 60_000, t);
    const r = batasLaju("uji2", 1, 60_000, t + 10_000);
    harus.salah(r.boleh);
    harus.minimal(r.sisaDetik, 1, "sisaDetik");
    harus.maksimal(r.sisaDetik, 60, "sisaDetik");
  });

  uji("membuka lagi setelah jendelanya lewat", () => {
    lupakanBatasLaju("uji3");
    const t = 3_000_000;
    batasLaju("uji3", 1, 60_000, t);
    harus.salah(batasLaju("uji3", 1, 60_000, t + 1000).boleh, "masih di jendela");
    harus.benar(batasLaju("uji3", 1, 60_000, t + 61_000).boleh, "sesudah jendela");
  });

  uji("pemanggil berbeda dihitung terpisah", () => {
    lupakanBatasLaju();
    const t = 4_000_000;
    batasLaju("a", 1, 60_000, t);
    harus.benar(batasLaju("b", 1, 60_000, t).boleh);
  });
});

kelompok("pengenalPemanggil()", () => {
  uji("memakai X-Forwarded-For pertama bila ada", () => {
    harus.sama(
      pengenalPemanggil(permintaan({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })),
      "1.2.3.4"
    );
  });
  uji("jatuh ke penanda lokal bila tak ada header", () => {
    harus.sama(pengenalPemanggil(permintaan()), "lokal");
  });
});
