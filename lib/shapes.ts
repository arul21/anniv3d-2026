// Generator bentuk partikel untuk hero 3D. Semua mengembalikan posisi xyz untuk n partikel, kira-kira dalam kotak [-1.3, 1.3].
const rnd = Math.random;

export type Shape = { pos: Float32Array; col?: Float32Array; hold: number };

export function heartShape(n: number) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = rnd() * Math.PI * 2;
    const r = rnd() < 0.45 ? 1 + (rnd() - 0.5) * 0.04 : Math.sqrt(rnd()); // sebagian di garis tepi biar bentuknya tegas
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    a[i * 3] = (x * r) / 16;
    a[i * 3 + 1] = (y * r + 2.5) / 16;
    a[i * 3 + 2] = (rnd() * 2 - 1) * 0.38 * Math.sqrt(Math.max(0, 1 - r * r));
  }
  return a;
}

export function infinityShape(n: number) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = rnd() * Math.PI * 2, s = Math.sin(t), c = Math.cos(t), den = 1 + s * s;
    const ang = rnd() * Math.PI * 2, rr = 0.09 * Math.sqrt(rnd());
    a[i * 3] = (c / den) * 1.25 + Math.cos(ang) * rr;
    a[i * 3 + 1] = ((s * c) / den) * 1.25 + Math.sin(ang) * rr * 0.6;
    a[i * 3 + 2] = Math.sin(ang) * rr;
  }
  return a;
}

// teks (boleh multi-baris dengan \n) digambar ke canvas 2D, lalu piksel yang terisi jadi posisi partikel
export function textShape(n: number, txt: string, font: { family: string; weight: string }, size = 1.1) {
  const w = 512, h = 512, cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const x = cv.getContext("2d", { willReadFrequently: true })!;
  const lines = txt.split("\n");
  let px = 420;
  x.font = `${font.weight} ${px}px ${font.family}`;
  const widest = Math.max(...lines.map((l) => x.measureText(l).width));
  px = Math.min((px * w * 0.92) / widest, (h * 0.9) / (lines.length * 1.1));
  x.font = `${font.weight} ${px}px ${font.family}`;
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * px * 1.1));
  const d = x.getImageData(0, 0, w, h).data, pts: number[] = [];
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y += 2) for (let xx = 0; xx < w; xx += 2) if (d[(y * w + xx) * 4 + 3] > 128) {
    pts.push(xx, y);
    minX = Math.min(minX, xx); maxX = Math.max(maxX, xx); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, sc = (size * 2) / Math.max(maxX - minX, maxY - minY);
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = Math.floor((rnd() * pts.length) / 2) * 2;
    a[i * 3] = (pts[k] - cx + rnd() * 2) * sc;
    a[i * 3 + 1] = -(pts[k + 1] - cy + rnd() * 2) * sc;
    a[i * 3 + 2] = (rnd() - 0.5) * 0.3;
  }
  return a;
}

export function shellShape(n: number, r0: number, r1: number) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = r0 + rnd() * (r1 - r0), q = Math.sqrt(1 - u * u);
    a[i * 3] = q * Math.cos(th) * r; a[i * 3 + 1] = u * r; a[i * 3 + 2] = q * Math.sin(th) * r;
  }
  return a;
}

// foto → partikel: tiap partikel ambil warna 1 piksel, terang-gelapnya jadi relief 3D
export async function photoShape(n: number, src: string): Promise<Shape> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return imageShape(n, img);
}

// versi sinkron untuk gambar yang sudah di-decode (Story Studio memuat fotonya sekali untuk semua gaya video)
export function imageShape(n: number, img: HTMLImageElement): Shape {
  const G = Math.round(Math.sqrt((4 * n) / Math.PI)), cv = document.createElement("canvas");
  cv.width = cv.height = G;
  const x = cv.getContext("2d", { willReadFrequently: true })!;
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, G, G);
  const d = x.getImageData(0, 0, G, G).data;
  const cells: number[] = [];
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const u = (gx / (G - 1)) * 2 - 1, v = 1 - (gy / (G - 1)) * 2;
    if (u * u + v * v <= 1) cells.push(u, v, (gy * G + gx) * 4);
  }
  const cellCount = cells.length / 3, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = (i < cellCount ? i : Math.floor(rnd() * cellCount)) * 3, k = cells[c + 2];
    const r = d[k] / 255, g = d[k + 1] / 255, b = d[k + 2] / 255;
    pos[i * 3] = cells[c] * 1.1;
    pos[i * 3 + 1] = cells[c + 1] * 1.1;
    pos[i * 3 + 2] = (0.3 * r + 0.59 * g + 0.11 * b - 0.5) * 0.4;
    col[i * 3] = Math.max(r * 0.6, 0.03); col[i * 3 + 1] = Math.max(g * 0.6, 0.03); col[i * 3 + 2] = Math.max(b * 0.6, 0.03);
  }
  return { pos, col, hold: 8000 };
}
