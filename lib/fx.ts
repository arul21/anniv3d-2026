// Kembang api & confetti di satu canvas layar penuh (didaftarkan oleh <FxCanvas/>).
const COLORS = ["#c8a96b", "#e3cc98", "#f3ece2", "#ffffff", "#b8925a"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

type Particle =
  | { k: "rocket"; x: number; y: number; vx: number; vy: number; ty: number; color: string; heart: boolean }
  | { k: "spark"; x: number; y: number; vx: number; vy: number; g: number; life: number; decay: number; color: string; size: number }
  | { k: "conf"; x: number; y: number; vx: number; vy: number; g: number; rot: number; vr: number; w: number; h: number; color: string };

let ctx: CanvasRenderingContext2D | null = null;
let W = 0, H = 0;
let parts: Particle[] = [];
let running = false;
let fireworksOn = false;
let fwTimer: ReturnType<typeof setInterval> | null = null;

export function registerFx(canvas: HTMLCanvasElement) {
  ctx = canvas.getContext("2d");
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);
  return () => { removeEventListener("resize", resize); ctx = null; parts = []; };
}

function explode(x: number, y: number, heart: boolean) {
  const color = pick(COLORS), n = heart ? 90 : 80, sc = rand(0.22, 0.3);
  for (let i = 0; i < n; i++) {
    let vx, vy;
    if (heart) {
      const t = (i / n) * Math.PI * 2;
      vx = 16 * Math.pow(Math.sin(t), 3) * sc;
      vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * sc;
    } else {
      const a = rand(0, 6.283), sp = rand(1, 6);
      vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
    }
    parts.push({ k: "spark", x, y, vx, vy, g: 0.035, life: 1, decay: rand(0.01, 0.018), color: Math.random() < 0.2 ? "#fff" : color, size: rand(1.5, 2.6) });
  }
}

export function launch() {
  parts.push({ k: "rocket", x: rand(W * 0.15, W * 0.85), y: H + 10, vx: rand(-1, 1), vy: -rand(H / 70, H / 55), ty: rand(H * 0.12, H * 0.45), color: pick(COLORS), heart: Math.random() < 0.45 });
  kick();
}

export function confettiBurst(x: number, y: number, n = 120) {
  for (let i = 0; i < n; i++)
    // potongan foil emas tipis, bukan confetti warna-warni
    parts.push({ k: "conf", x, y, vx: rand(-8, 8), vy: rand(-14, -4), g: 0.28, rot: rand(0, 6.28), vr: rand(-0.25, 0.25), w: rand(2.5, 4), h: rand(9, 15), color: pick(COLORS) });
  kick();
}

export function setFireworks(on: boolean) {
  fireworksOn = on;
  if (fwTimer) clearInterval(fwTimer);
  fwTimer = null;
  if (on) {
    launch(); launch();
    fwTimer = setInterval(() => { launch(); if (Math.random() < 0.5) setTimeout(launch, 250); }, 750);
  }
}

function kick() {
  if (!running && ctx) { running = true; requestAnimationFrame(loop); }
}

function loop() {
  const c = ctx;
  if (!c) { running = false; return; }
  c.globalCompositeOperation = "destination-out";
  c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, 0, W, H);
  const next: Particle[] = [];
  for (const p of parts) {
    if (p.k === "rocket") {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      next.push({ k: "spark", x: p.x, y: p.y, vx: rand(-0.3, 0.3), vy: rand(0.5, 1.5), g: 0, life: 0.6, decay: 0.04, color: "#ffe7b0", size: 1.4 });
      if (p.y <= p.ty || p.vy >= -1) { explode(p.x, p.y, p.heart); continue; }
      c.globalCompositeOperation = "lighter"; c.globalAlpha = 1; c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, 2.4, 0, 6.283); c.fill();
    } else if (p.k === "spark") {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) continue;
      c.globalCompositeOperation = "lighter"; c.globalAlpha = p.life; c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.283); c.fill();
    } else {
      p.vx *= 0.98; p.vy = Math.min(p.vy + p.g, 4); p.x += p.vx + Math.sin(p.rot) * 0.6; p.y += p.vy; p.rot += p.vr;
      if (p.y > H + 30) continue;
      c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.fillStyle = p.color;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.cos(p.rot)) * p.h + 1); c.restore();
    }
    next.push(p);
  }
  parts = next;
  c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  if (parts.length || fireworksOn) requestAnimationFrame(loop);
  else { c.clearRect(0, 0, W, H); running = false; }
}
