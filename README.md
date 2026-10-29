# Happy Anniversary, Ica 💛

Next.js 16 (App Router) + React Three Fiber. Butuh Node 24 (`nvm use`).

```bash
npm install
npm run dev     # buka alamat yang muncul di terminal
npm run build   # cek sebelum deploy
```

## Yang bisa diubah

Semua teks, nama, tanggal, kupon, dan surat ada di `lib/config.ts`.

| Taruh file di | Untuk |
| --- | --- |
| `public/foto/1.jpg` … `6.jpg` | foto timeline (urut sesuai cerita) |
| `public/foto/kita.jpg` | foto Arul, Ica & Kai yang tersusun dari partikel 3D |
| `public/lagu.mp3` | lagu kalian (kalau tidak ada, pakai musik kotak musik bawaan) |

## Struktur

- `app/`: layout (font, metadata), halaman, dan `opengraph-image.tsx` (gambar preview saat link dibagikan)
- `components/`: satu file per bagian halaman; `Hero3D.tsx` berisi adegan partikel WebGL + shader GLSL
- `lib/`: config, engine audio, kembang api/confetti, dan generator bentuk partikel
- `legacy/index.html`: versi lama satu file (tanpa build), sebagai cadangan

## Deploy

Push ke GitHub lalu import di [vercel.com/new](https://vercel.com/new), atau jalankan `npx vercel`.
Domain produksi Vercel otomatis dipakai untuk link preview WhatsApp.
# anniv3d-2026
