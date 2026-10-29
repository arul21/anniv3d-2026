/* =====================================================================
   ✏️  EDIT DI SINI: nama, tanggal, foto, alasan, kupon, dan surat
   Di semua teks, tulis {anak} / {istri} / {suami} dan otomatis diganti nama.
   Foto & lagu taruh di folder public/ (contoh: public/foto/1.jpg → "/foto/1.jpg").
   ===================================================================== */
export const CONFIG = {
  suami: "Arul",
  istri: "Ica",
  anak: "Kai",
  tanggalNikah: "2022-10-29T00:00:00",
  lahirAnak: "2023-07-29T00:00:00",
  fotoPartikel: "/foto/kita.jpg", // foto Arul, Ica & Kai yang tersusun dari partikel 3D (paling bagus close-up, wajah terang)
  lagu: "/lagu.mp3", // kalau tidak ada, pakai musik kotak musik bawaan
  targetSkor: 40,

  // kalau fotonya tidak ada, tampil angka Romawi sebagai pengganti
  perjalanan: [
    {
      tanggal: "Awal Cerita",
      judul: "Pertama Kali Ketemu",
      foto: "/foto/1.jpg",
      cerita:
        "Siapa sangka, pertemuan yang kelihatannya biasa itu ternyata jadi awal dari cerita terbaik dalam hidupku.",
    },
    {
      tanggal: "Masa PDKT",
      judul: "Saling Mengenal",
      foto: "/foto/2.jpg",
      cerita:
        "Obrolan panjang, salah tingkah, dan perasaan yang makin lama makin susah disembunyikan.",
    },
    {
      tanggal: "29 Oktober 2022",
      judul: "Hari Kita Menikah",
      foto: "/foto/3.jpeg",
      cerita:
        "Hari aku resmi jadi suamimu. Deg-degan, bahagia, dan bersyukur, semuanya campur jadi satu.",
    },
    {
      tanggal: "29 Juli 2023",
      judul: "Kita Jadi Bertiga",
      foto: "/foto/4.jpg",
      cerita:
        "Hari {anak} lahir. Melihat kamu berjuang lalu memeluk {anak} untuk pertama kali adalah momen paling luar biasa yang pernah aku saksikan.",
    },
    {
      tanggal: "2024 – 2025",
      judul: "Rumah yang Makin Ramai",
      foto: "/foto/5.jpg",
      cerita:
        "Begadang, tangisan tengah malam, langkah pertama, kata pertama {anak}. Capek, tapi kita lewati berdua, dan rumah kita jadi penuh tawa.",
    },
    {
      tanggal: "29 Oktober 2026",
      judul: "Hari Ini, 4 Tahun",
      foto: "/foto/6.jpg",
      cerita:
        "Empat tahun menikah, satu {anak} yang menggemaskan, dan aku masih jatuh cinta sama orang yang sama. Terima kasih sudah tumbuh bersamaku.",
    },
  ],

  alasan: [
    "Senyummu bisa bikin hari terburukku jadi baik-baik aja.",
    "Caramu ketawa sampai matamu hilang.",
    "Kamu selalu ingat hal-hal kecil yang aku sendiri lupa.",
    "Pelukanmu adalah tempat paling nyaman di dunia.",
    "Kamu sabar banget sama aku. (Iya, aku tahu aku kadang nyebelin.)",
    "Kamu selalu tahu kapan aku butuh dipeluk, tanpa aku bilang.",
    "Kamu selalu doain aku, bahkan saat aku nggak minta.",
    "Omelanmu itu sebenarnya tanda sayang. Aku tahu kok.",
    "Kamu bikin rumah benar-benar terasa seperti rumah.",
    "Caramu jadi ibu untuk {anak}: sabar, hangat, dan penuh cinta.",
    "Lihat kamu dan {anak} ketawa bareng itu pemandangan favoritku.",
    "Kamu kuat, jauh lebih kuat dari yang kamu kira.",
    "Kamu cantik. Baru bangun tidur pun tetap cantik.",
    "Kamu sahabat terbaikku, bukan cuma istriku.",
    "Kamu percaya sama aku, bahkan saat aku ragu sama diriku sendiri.",
    "Obrolan random kita sebelum tidur.",
    "Kamu nggak pernah nyerah sama kita.",
    "Caramu peduli sama orang-orang di sekitarmu.",
    "Kamu bikin aku pengen jadi orang yang lebih baik setiap hari.",
    "Ceritaku yang nggak penting pun tetap kamu dengerin.",
    "Sama kamu, hal biasa jadi petualangan.",
    "Karena kamu adalah kamu. Dan itu sudah lebih dari cukup.",
  ],

  // surat istimewa: amplop paling terakhir, terbuka setelah semua alasan di atas
  suratTerakhir: `Dan alasan yang paling besar,

Kamu rela melepas pekerjaanmu, karier yang kamu bangun dengan susah payah, supaya {anak} bisa tumbuh dalam pelukan ibunya setiap hari.

Itu bukan keputusan kecil. Aku tahu ada hari-hari kamu merindukan duniamu yang dulu, dan kamu jarang sekali mengeluh. Kamu memilih kami, di atas dirimu sendiri.

Aku melihat semua pengorbanan itu, Sayang. Setiap langkah kecil {anak}, setiap tawanya, ada kamu di sana.

Terima kasih. {anak} beruntung punya ibu sepertimu, dan aku jauh lebih beruntung lagi punya istri sepertimu.`,

  // kalender 48 bulan: cerita untuk bulan-bulan tertentu (bulan ke-n setelah menikah). Bulan lain pakai kalimat umum.
  momenBulan: {
    1: "Bulan pertama kita sebagai suami istri.",
    9: "{anak} lahir. Hari paling ajaib dalam hidup kita.",
    12: "Ulang tahun pernikahan pertama.",
    24: "Dua tahun, dan kamu tetap rumahku.",
    36: "Tiga tahun. {anak} sudah pintar memanggil namamu.",
    48: "Hari ini. Empat tahun, dan aku masih memilihmu.",
  } as Record<number, string>,

  kupon: [
    {
      judul: "Dinner Berdua",
      isi: "Kamu pilih tempatnya, aku yang traktir dan aku yang atur titip {anak}. Dandan yang cantik ya.",
    },
    {
      judul: "Kado Pilihanmu",
      isi: "Satu kado apa pun yang kamu mau. Kamu yang pilih, aku yang bayar.",
    },
    {
      judul: "Me Time Seharian",
      isi: "Aku jaga {anak} seharian. Kamu bebas tidur, nyalon, atau jalan sama teman. Tanpa rasa bersalah.",
    },
    {
      judul: "Pijat 30 Menit",
      isi: "Pijat punggung dan kaki, tanpa ngeluh dan tanpa minta gantian.",
    },
    {
      judul: "Kencan Kuliner",
      isi: "Kita jelajahi tempat makan baru yang selama ini cuma kamu simpan di Instagram. Kamu yang pilih, aku yang bayar.",
    },
    {
      judul: "Kartu Menang Debat",
      isi: "Pakai kartu ini dan kamu otomatis benar. Tanpa banding, tanpa protes.",
    },
  ],

  surat: `Empat tahun lalu, di tanggal yang sama dengan hari ini, aku memegang tanganmu dan berjanji untuk selalu ada. Sejak hari itu, hidupku jadi jauh lebih berwarna.

Terima kasih sudah sabar menghadapi aku yang kadang keras kepala, kadang pelupa, dan sering lupa naruh barang sendiri. Terima kasih untuk setiap pelukan, setiap tawa, dan setiap doa yang mungkin nggak pernah aku dengar, tapi selalu aku rasakan.

Dan terima kasih sudah jadi ibu yang luar biasa untuk {anak}. Aku tahu banyak malam kamu kurang tidur, banyak lelah yang nggak kamu ceritakan. Setiap kali lihat kalian berdua, aku sadar betapa beruntungnya aku.

Tahun ini aku nggak kasih kado biasa. Aku pengen kasih sesuatu yang bisa kamu buka kapan aja, di mana aja: sebuah tempat kecil yang isinya cuma tentang kita.

Aku nggak janji semuanya akan selalu mudah. Tapi aku janji, bahkan di hari yang paling sulit sekalipun, aku akan tetap memilih kamu. Lagi, lagi, dan lagi.

Selamat ulang tahun pernikahan, istriku.
Aku sayang kamu, hari ini dan seterusnya.`,
};
/* ===================================================================== */

const NAMES: Record<string, string> = {
  suami: CONFIG.suami,
  istri: CONFIG.istri,
  anak: CONFIG.anak,
};
export const fill = (s: string) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => NAMES[k] ?? m);

export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const tgl = (d: Date) =>
  `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
export const fmt = (n: number) => Math.floor(n).toLocaleString("id-ID");
export const pad2 = (n: number) => String(n).padStart(2, "0");

export function roman(n: number) {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}

export const WED = new Date(CONFIG.tanggalNikah);
const BORN = new Date(CONFIG.lahirAnak);
const addMonths = (d: Date, n: number) =>
  new Date(
    d.getFullYear(),
    d.getMonth() + n,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  );

export type Since = ReturnType<typeof since>;
export function since(now = new Date()) {
  let months =
    (now.getFullYear() - WED.getFullYear()) * 12 +
    now.getMonth() -
    WED.getMonth();
  let anchor = addMonths(WED, months);
  if (anchor > now) anchor = addMonths(WED, --months);
  const rest = Math.max(0, +now - +anchor) / 1000;
  const total = Math.max(0, +now - +WED) / 1000;
  return {
    y: Math.floor(months / 12),
    mo: months % 12,
    d: Math.floor(rest / 86400),
    h: Math.floor((rest % 86400) / 3600),
    mi: Math.floor((rest % 3600) / 60),
    s: Math.floor(rest % 60),
    days: total / 86400,
    beats: total * 1.25,
    momDays: Math.max(0, +now - +BORN) / 864e5,
  };
}

// nama font dari next/font di-hash, jadi canvas membaca nama aslinya dari CSS variable
export const cssFont = (variable: string) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim() || "serif";
