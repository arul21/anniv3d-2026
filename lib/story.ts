// Pembuat Instagram Story (1080×1920) di browser: gambar JPEG dari canvas 2D (video 3D ada di story3d.ts). Hasilnya dibagikan dengan menu bagikan bawaan HP (Web Share) atau diunduh.
import { CONFIG, WED, cssFont, fmt, roman, since, tgl } from "./config";

const W = 1080, H = 1920;
const C = {
  ink: "#0d0b0a", ivory: "#f3ece2", paper: "#f6f0e6", champ: "#c8a96b", champ2: "#e3cc98",
  bronze: "#8a6d3b", muted: "#a79e92", oxblood: "#5e1a24",
};

export type StoryData =
  | { kind: "anniversary" }
  | { kind: "reason"; no: string; text: string }
  | { kind: "coupon"; no: string; title: string; text: string };

type Ctx = CanvasRenderingContext2D;
type Fonts = { serif: string; sans: string };

function fonts(): Fonts {
  return { serif: cssFont("--font-cormorant"), sans: cssFont("--font-montserrat") };
}
async function fontsReady(f: Fonts) {
  await Promise.all([
    document.fonts.load(`300 100px ${f.serif}`), document.fonts.load(`italic 300 100px ${f.serif}`),
    document.fonts.load(`italic 400 100px ${f.serif}`), document.fonts.load(`500 30px ${f.sans}`),
  ]);
}
export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// teks dengan jarak huruf; canvas menambah jarak setelah huruf terakhir, jadi geser setengahnya supaya tetap di tengah
function spaced(c: Ctx, text: string, x: number, y: number, spacing: number) {
  c.letterSpacing = `${spacing}px`;
  c.fillText(text, x + spacing / 2, y);
  c.letterSpacing = "0px";
}
function wrap(c: Ctx, text: string, maxW: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (c.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

const dust = Array.from({ length: 260 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 2.2, a: 0.08 + Math.random() * 0.4 }));
function background(c: Ctx) {
  const g = c.createRadialGradient(W / 2, H * 0.32, 60, W / 2, H * 0.45, H * 0.8);
  g.addColorStop(0, "#2a231c"); g.addColorStop(1, C.ink);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = C.champ2;
  for (const d of dust) { c.globalAlpha = d.a; c.beginPath(); c.arc(d.x, d.y, d.r, 0, 6.283); c.fill(); }
  c.globalAlpha = 1;
}
function photoCircle(c: Ctx, img: HTMLImageElement | null, cx: number, cy: number, r: number, f: Fonts) {
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, 6.283); c.clip();
  if (img) {
    const s = Math.max((2 * r) / img.naturalWidth, (2 * r) / img.naturalHeight);
    c.drawImage(img, cx - (img.naturalWidth * s) / 2, cy - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  } else {
    c.fillStyle = "#1a1613"; c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    c.fillStyle = C.champ2; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `italic 300 ${r * 0.6}px ${f.serif}`; c.fillText(`${CONFIG.suami[0]} & ${CONFIG.istri[0]}`, cx, cy);
    c.textBaseline = "alphabetic";
  }
  c.restore();
  c.strokeStyle = C.champ; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, r + 3, 0, 6.283); c.stroke();
  c.strokeStyle = "rgba(200,169,107,.35)"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, r + 26, 0, 6.283); c.stroke();
}
function footer(c: Ctx, f: Fonts) {
  c.fillStyle = C.muted; c.font = `500 26px ${f.sans}`; c.textAlign = "center";
  spaced(c, `HAPPY ${roman(Math.max(1, since().y))} ANNIVERSARY`, W / 2, H - 110, 10);
}

function drawAnniversary(c: Ctx, img: HTMLImageElement | null, f: Fonts) {
  const t = since();
  background(c);
  c.textAlign = "center"; c.textBaseline = "alphabetic";
  c.fillStyle = C.champ; c.font = `500 34px ${f.sans}`; spaced(c, "HAPPY ANNIVERSARY", W / 2, 240, 14);
  c.fillStyle = C.champ2; c.font = `300 250px ${f.serif}`; c.fillText(roman(Math.max(1, t.y)), W / 2, 500);
  photoCircle(c, img, W / 2, 960, 330, f);
  c.fillStyle = C.ivory; c.font = `italic 400 104px ${f.serif}`; c.fillText(`${CONFIG.suami} & ${CONFIG.istri}`, W / 2, 1450);
  c.fillStyle = C.muted; c.font = `500 30px ${f.sans}`; spaced(c, `SEJAK ${tgl(WED).toUpperCase()}`, W / 2, 1540, 8);
  c.fillStyle = C.champ2; c.font = `italic 300 64px ${f.serif}`; c.fillText(`${fmt(t.days)} hari bersama`, W / 2, 1660);
  c.fillStyle = C.muted; c.font = `500 24px ${f.sans}`; spaced(c, "DENGAN CINTA", W / 2, H - 110, 10);
}

function drawReason(c: Ctx, d: Extract<StoryData, { kind: "reason" }>, f: Fonts) {
  background(c);
  c.textAlign = "center";
  c.fillStyle = C.champ; c.font = `500 32px ${f.sans}`; spaced(c, "KENAPA HARUS KAMU", W / 2, 300, 12);
  // kertas surat
  const x = 110, y = 400, w = W - 220, h = 1120;
  c.fillStyle = C.paper; c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 60; c.shadowOffsetY = 30;
  c.fillRect(x, y, w, h);
  c.shadowColor = "transparent";
  c.strokeStyle = "rgba(138,109,59,.4)"; c.lineWidth = 2; c.strokeRect(x + 22, y + 22, w - 44, h - 44);
  c.fillStyle = C.bronze; c.font = `500 28px ${f.sans}`; spaced(c, d.no.toUpperCase(), W / 2, y + 120, 10);
  // kutipan: ukuran font menyesuaikan panjang teks
  let size = 78, lines: string[] = [];
  for (; size >= 40; size -= 4) {
    c.font = `italic 400 ${size}px ${f.serif}`;
    lines = wrap(c, d.text, w - 160);
    if (lines.length * size * 1.42 <= h - 360) break;
  }
  c.fillStyle = "#2a241f";
  const top = y + 200 + (h - 360 - lines.length * size * 1.42) / 2 + size;
  lines.forEach((l, i) => c.fillText(l, W / 2, top + i * size * 1.42));
  c.fillStyle = "#6b5330"; c.font = `italic 400 52px ${f.serif}`; c.fillText(`— ${CONFIG.suami}`, W / 2, y + h - 90);
  // segel lilin
  const sx = W / 2, sy = y + h + 10;
  const g = c.createRadialGradient(sx - 20, sy - 22, 6, sx, sy, 78);
  g.addColorStop(0, "#8a2a37"); g.addColorStop(0.6, C.oxblood); g.addColorStop(1, "#45121a");
  c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 76, 0, 6.283); c.fill();
  c.fillStyle = C.champ2; c.font = `italic 500 52px ${f.serif}`; c.textBaseline = "middle";
  c.fillText(`${CONFIG.suami[0]}&${CONFIG.istri[0]}`, sx, sy + 2);
  c.textBaseline = "alphabetic";
  footer(c, f);
}

function drawCoupon(c: Ctx, d: Extract<StoryData, { kind: "coupon" }>, f: Fonts) {
  background(c);
  c.textAlign = "center";
  c.fillStyle = C.ivory; c.font = `italic 300 80px ${f.serif}`; c.fillText("Kado dari suamiku", W / 2, 520);
  c.fillStyle = C.champ; c.font = `500 30px ${f.sans}`; spaced(c, "KUPON CINTA", W / 2, 600, 12);
  const x = 110, y = 700, w = W - 220, h = 620;
  c.fillStyle = C.paper; c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 60; c.shadowOffsetY = 30;
  c.fillRect(x, y, w, h);
  c.shadowColor = "transparent";
  c.strokeStyle = "rgba(138,109,59,.45)"; c.lineWidth = 2; c.strokeRect(x + 22, y + 22, w - 44, h - 44);
  c.strokeStyle = "rgba(138,109,59,.25)"; c.strokeRect(x + 34, y + 34, w - 68, h - 68);
  c.textAlign = "left";
  c.fillStyle = C.bronze; c.font = `500 28px ${f.sans}`; c.letterSpacing = "9px"; c.fillText(d.no.toUpperCase(), x + 90, y + 140); c.letterSpacing = "0px";
  c.fillStyle = "#2a241f"; c.font = `400 92px ${f.serif}`; c.fillText(d.title, x + 90, y + 260);
  c.fillStyle = "#5c544b"; c.font = `400 36px ${f.sans}`;
  wrap(c, d.text, w - 180).slice(0, 4).forEach((l, i) => c.fillText(l, x + 90, y + 350 + i * 54));
  c.fillStyle = "#8a7f70"; c.font = `500 24px ${f.sans}`; c.letterSpacing = "8px"; c.fillText("BERLAKU SELAMANYA", x + 90, y + h - 70); c.letterSpacing = "0px";
  c.textAlign = "center";
  c.fillStyle = C.muted; c.font = `italic 300 54px ${f.serif}`; c.fillText(`dari ${CONFIG.suami}, untuk ${CONFIG.istri}`, W / 2, 1480);
  footer(c, f);
}

export async function renderStoryImage(d: StoryData): Promise<Blob> {
  const f = fonts();
  await fontsReady(f);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!;
  if (d.kind === "anniversary") drawAnniversary(c, await loadImage(CONFIG.fotoPartikel).catch(() => null), f);
  else if (d.kind === "reason") drawReason(c, d, f);
  else drawCoupon(c, d, f);
  return new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar"))), "image/jpeg", 0.92));
}

// ---------- video ----------
// Instagram menerima MP4; kalau browser hanya bisa membuat WebM, fitur video disembunyikan.
export function videoMime() {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  return ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

// bagikan lewat menu HP (pilih Instagram → Story); kalau tidak didukung (mis. laptop), unduh filenya
export async function shareFile(blob: Blob, name: string): Promise<"shared" | "cancelled" | "downloaded"> {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Happy Anniversary" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
