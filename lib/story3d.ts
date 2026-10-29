// Video Story 3D: direkam langsung dari adegan WebGL (three.js), disusun bersama teks di canvas 2D,
// lalu direkam dengan MediaRecorder menjadi MP4. Ada beberapa gaya yang bisa dipilih (di-slide) oleh pengguna.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CONFIG, WED, cssFont, roman, since, tgl } from "./config";
import { heartGeometry } from "./geometry";
import { makePoints, morphTo } from "./particles";
import { heartShape, infinityShape, photoShape, shellShape, textShape, type Shape } from "./shapes";
import { videoMime } from "./story";

const VW = 720, VH = 1280;
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const inOut = (t: number, a: number, b: number) => Math.min(span(t, a, a + 0.6), 1 - span(t, b - 0.5, b)); // muncul lalu hilang

type Fonts = { serif: string; sans: string };
type Stage = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; gl: HTMLCanvasElement };
type Overlay = (c: CanvasRenderingContext2D, t: number, txt: TextKit) => void;
type TextKit = {
  title: (a: number, big: string, small: string) => void;
  end: (a: number) => void;
  spaced: (text: string, x: number, y: number, s: number) => void;
  f: Fonts;
};

async function loadFonts(): Promise<Fonts> {
  const f = { serif: cssFont("--font-cormorant"), sans: cssFont("--font-montserrat") };
  await Promise.all([
    document.fonts.load(`600 100px ${f.serif}`), document.fonts.load(`italic 500 100px ${f.serif}`),
    document.fonts.load(`italic 300 100px ${f.serif}`), document.fonts.load(`300 100px ${f.serif}`), document.fonts.load(`500 30px ${f.sans}`),
  ]);
  return f;
}

function createStage(pbr: boolean): Stage {
  const gl = document.createElement("canvas");
  gl.width = VW; gl.height = VH;
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor("#0d0b0a", 1);
  const scene = new THREE.Scene();
  if (pbr) scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(45, VW / VH, 0.1, 60);
  camera.position.set(0, 0, 6.4);
  return { renderer, scene, camera, gl };
}

// komposisi (WebGL + vignette + teks) → MP4. Dipakai semua gaya video.
function record(stage: Stage, dur: number, f: Fonts, update: (t: number) => void, overlay: Overlay, onProgress: (p: number) => void, dispose: () => void) {
  const mime = videoMime()!;
  const out = document.createElement("canvas");
  out.width = VW; out.height = VH;
  const c = out.getContext("2d")!;
  const k = VW / 1080; // teks didesain di skala 1080×1920
  const spaced = (text: string, x: number, y: number, s: number) => { c.letterSpacing = `${s}px`; c.fillText(text, x + s / 2, y); c.letterSpacing = "0px"; };
  const fade = (a: number, paint: () => void) => {
    if (a <= 0) return;
    c.save(); c.globalAlpha = Math.min(1, a); c.translate(0, (1 - Math.min(1, a)) * 24); paint(); c.restore();
  };
  const txt: TextKit = {
    f, spaced,
    title: (a, big, small) => fade(a, () => {
      c.fillStyle = "#f3ece2"; c.font = `italic 300 64px ${f.serif}`; c.fillText(big, 540, 1600);
      c.fillStyle = "#a79e92"; c.font = `500 26px ${f.sans}`; spaced(small.toUpperCase(), 540, 1680, 9);
    }),
    end: (a) => fade(a, () => {
      c.fillStyle = "#e3cc98"; c.font = `500 30px ${f.sans}`; spaced("HAPPY ANNIVERSARY", 540, 1640, 13);
    }),
  };
  const draw = (t: number) => {
    update(t);
    stage.renderer.render(stage.scene, stage.camera);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(stage.gl, 0, 0);
    const g = c.createRadialGradient(VW / 2, VH / 2, VW * 0.35, VW / 2, VH / 2, VH * 0.75);
    g.addColorStop(0, "rgba(13,11,10,0)"); g.addColorStop(1, "rgba(13,11,10,.75)");
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    c.setTransform(k, 0, 0, k, 0, 0);
    c.textAlign = "center";
    overlay(c, t, txt);
  };

  draw(0);
  const stream = out.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  const cleanup = () => {
    stream.getTracks().forEach((tr) => tr.stop());
    dispose();
    stage.scene.environment?.dispose();
    stage.renderer.dispose();
    stage.renderer.forceContextLoss();
  };
  return new Promise<Blob>((resolve, reject) => {
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { cleanup(); resolve(new Blob(chunks, { type: "video/mp4" })); };
    rec.onerror = () => { cleanup(); reject(new Error("Gagal merekam video")); };
    rec.start(250);
    const t0 = performance.now();
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      draw(t);
      onProgress(Math.min(1, t / dur));
      if (t < dur) requestAnimationFrame(frame);
      else rec.stop();
    };
    requestAnimationFrame(frame);
  });
}

function dust(scene: THREE.Scene) {
  const d = makePoints(shellShape(900, 2, 5), shellShape(900, 2, 5), 12);
  scene.add(d.pts);
  return d;
}

// ---------- gaya 1: partikel (hati → angka → foto relief 3D → nama) ----------
async function particles(onProgress: (p: number) => void) {
  const f = await loadFonts(), years = Math.max(1, since().y), N = 18000, DUR = 9.5;
  const heart: Shape = { pos: heartShape(N), hold: 0 };
  const numeral: Shape = { pos: textShape(N, roman(years), { family: f.serif, weight: "600" }, 1.1), hold: 0 };
  const family: Shape = await photoShape(N, CONFIG.fotoPartikel).catch(() => ({ pos: infinityShape(N), hold: 0 }));
  // photoShape meredupkan warna untuk hero; di video foto harus terbaca jelas, jadi dicerahkan lagi
  if (family.col) for (let i = 0; i < family.col.length; i++) family.col[i] = Math.min(1, family.col[i] * 2.6);
  const names: Shape = { pos: textShape(N, `${CONFIG.suami} & ${CONFIG.istri}`, { family: f.serif, weight: "italic 500" }, 1.25), hold: 0 };
  const timeline: [number, Shape][] = [[0.3, heart], [2.6, numeral], [4.6, family], [7.4, names]];

  const stage = createStage(false), group = new THREE.Group();
  const scatter = shellShape(N, 2.4, 4.5);
  const main = makePoints(scatter, scatter.slice(), 30);
  const d = dust(stage.scene);
  group.add(main.pts);
  stage.scene.add(group);
  let next = 0, mixStart = 0;

  return record(stage, DUR, f, (t) => {
    while (next < timeline.length && t >= timeline[next][0]) { morphTo(main, timeline[next][1]); mixStart = t; next++; }
    const U = main.pts.material.uniforms;
    U.uMix.value = Math.min(1, (t - mixStart) / 1.7);
    U.uTime.value = d.pts.material.uniforms.uTime.value = t;
    // saat foto: partikel diperbesar supaya saling menumpuk jadi foto yang terang, kamera mengorbit memperlihatkan relief 3D
    const photo = span(t, 5.0, 5.9) * (1 - span(t, 7.2, 7.6));
    U.uSize.value = 30 + 34 * photo;
    group.rotation.y = Math.sin(t * 0.7) * 0.32 * (1 - photo) + Math.sin((t - 5.0) * 1.1) * 0.42 * photo;
    group.rotation.x = Math.sin(t * 0.45) * 0.1 * (1 - photo) + photo * 0.12;
    stage.camera.position.z = 6.4 - span(t, 0, 2.2) * 0.6 + photo * 0.2;
    d.pts.rotation.y = t * 0.05;
  }, (c, t, x) => {
    x.title(inOut(t, 0.6, 2.5), "Ribuan cahaya,", "satu hati");
    x.title(inOut(t, 2.9, 4.5), `${years} tahun bersama.`, `sejak ${tgl(WED)}`);
    x.title(inOut(t, 5.2, 7.3), "Satu keluarga.", `${CONFIG.suami} · ${CONFIG.istri} · ${CONFIG.anak}`);
    x.end(span(t, 8.0, 8.7));
  }, onProgress, () => { for (const p of [main, d]) { p.pts.geometry.dispose(); p.pts.material.dispose(); } });
}

// ---------- gaya 2: dua cincin yang saling mengait ----------
async function rings(onProgress: (p: number) => void) {
  const f = await loadFonts(), years = Math.max(1, since().y), DUR = 8.5;
  const stage = createStage(true);
  const geo = new THREE.TorusGeometry(1, 0.075, 64, 220);
  const gold = new THREE.MeshPhysicalMaterial({ color: "#d4b072", metalness: 1, roughness: 0.14, clearcoat: 1 });
  const rose = new THREE.MeshPhysicalMaterial({ color: "#c98e7e", metalness: 1, roughness: 0.16, clearcoat: 1 });
  const a = new THREE.Mesh(geo, gold), b = new THREE.Mesh(geo, rose);
  b.rotation.x = Math.PI / 2;
  const group = new THREE.Group();
  group.add(a, b);
  stage.scene.add(group);
  const light = new THREE.DirectionalLight("#fff1dc", 1.4);
  light.position.set(2, 3, 4);
  stage.scene.add(light);
  const d = dust(stage.scene);

  return record(stage, DUR, f, (t) => {
    // kedua cincin datang dari kiri-kanan lalu mengait di tengah
    const join = span(t, 0.2, 2.6);
    a.position.x = -0.5 - (1 - join) * 2.4; b.position.x = 0.5 + (1 - join) * 2.4;
    group.rotation.y = t * 0.55;
    group.rotation.x = Math.sin(t * 0.6) * 0.3 + 0.2;
    group.position.y = 0.15 + Math.sin(t * 1.2) * 0.05;
    stage.camera.position.z = 9 - span(t, 0, 3) * 1.4; // berakhir di jarak yang memuat kedua cincin di layar vertikal
    d.pts.material.uniforms.uTime.value = t;
    d.pts.rotation.y = t * 0.06;
  }, (c, t, x) => {
    x.title(inOut(t, 1.6, 3.8), "Dua cincin,", "satu janji");
    fade2(c, span(t, 3.9, 4.8), () => {
      c.fillStyle = "#e3cc98"; c.font = `300 220px ${f.serif}`; c.fillText(roman(years), 540, 470);
    });
    x.title(inOut(t, 4.2, 6.6), `${CONFIG.suami} & ${CONFIG.istri}`, `sejak ${tgl(WED)}`);
    x.end(span(t, 7.0, 7.7));
  }, onProgress, () => { geo.dispose(); gold.dispose(); rose.dispose(); d.pts.geometry.dispose(); d.pts.material.dispose(); });
}

// ---------- gaya 3: 48 hati emas yang berpusar lalu membentuk satu hati besar ----------
async function hearts(onProgress: (p: number) => void) {
  const f = await loadFonts(), t0 = since(), months = Math.max(12, t0.y * 12 + t0.mo), DUR = 8.5;
  const stage = createStage(true);
  const geo = heartGeometry({ curveSegments: 14, bevelSegments: 4 });
  const mat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.2, clearcoat: 1 });
  const mesh = new THREE.InstancedMesh(geo, mat, months);
  const cols = ["#d4b072", "#e3cc98", "#c98e7e", "#efe7dc"].map((x) => new THREE.Color(x));
  for (let i = 0; i < months; i++) mesh.setColorAt(i, cols[i % 4]);
  stage.scene.add(mesh);
  const light = new THREE.DirectionalLight("#fff1dc", 1.4);
  light.position.set(2, 3, 4);
  stage.scene.add(light);
  const d = dust(stage.scene);
  // posisi akhir: di sepanjang garis hati besar
  const target = Array.from({ length: months }, (_, i) => {
    const s = (i / months) * Math.PI * 2;
    // 0.075: hati besar muat di layar vertikal 9:16
    return new THREE.Vector3(16 * Math.sin(s) ** 3 * 0.075, (13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s)) * 0.075 + 0.3, 0);
  });
  const o = new THREE.Object3D(), v = new THREE.Vector3();

  return record(stage, DUR, f, (t) => {
    const gather = span(t, 3.0, 5.2);
    for (let i = 0; i < months; i++) {
      // pusaran heliks yang naik, lalu tiap hati terbang ke posisinya di hati besar
      const a = i * 0.5 + t * 1.4, r = 1.1 + (i % 7) * 0.12, y = ((i / months) * 4 - 2) + Math.sin(t + i) * 0.1;
      v.set(Math.cos(a) * r, y, Math.sin(a) * r);
      o.position.lerpVectors(v, target[i], gather);
      o.rotation.set(t * 1.3 + i, t * 0.9 + i * 0.5, 0);
      o.rotation.x *= 1 - gather; o.rotation.y *= 1 - gather * 0.8;
      o.scale.setScalar(0.13 - gather * 0.025 +(gather > 0.99 ? Math.pow(Math.max(0, Math.sin(t * 3)), 10) * 0.03 : 0));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.rotation.y = Math.sin(t * 0.5) * 0.35 * gather + t * 0.25 * (1 - gather);
    stage.camera.position.z = 7 - span(t, 0, 3) * 0.8;
    d.pts.material.uniforms.uTime.value = t;
  }, (c, t, x) => {
    x.title(inOut(t, 0.8, 3.0), `${months} bulan,`, `${months} hati`);
    x.title(inOut(t, 5.0, 7.0), "Semuanya untukmu.", `${CONFIG.suami} & ${CONFIG.istri}`);
    x.end(span(t, 7.1, 7.8));
  }, onProgress, () => { geo.dispose(); mat.dispose(); d.pts.geometry.dispose(); d.pts.material.dispose(); });
}

function fade2(c: CanvasRenderingContext2D, a: number, paint: () => void) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = Math.min(1, a); paint(); c.restore();
}

export const VIDEO_STYLES = [
  { id: "partikel", label: "Partikel", render: particles },
  { id: "cincin", label: "Cincin", render: rings },
  { id: "hati", label: "Hati emas", render: hearts },
] as const;
