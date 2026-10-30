"use client";

import { useViewport } from "@/lib/useNearViewport";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CONFIG, cssFont, fill, roman } from "@/lib/config";
import Studio from "./Studio";

// Perjalanan 3D yang digerakkan scroll: kamera melaju melewati bingkai-bingkai kenangan, berakhir di dua cincin yang saling mengait.
const ITEMS = CONFIG.perjalanan;
const N = ITEMS.length;
const GAP = 6;
const FRAME_W = 1.6, FRAME_H = 2;
const RING_Z = -N * GAP - 2;
const INK = "#0d0b0a";
const TAN = Math.tan(THREE.MathUtils.degToRad(25)); // setengah fov 50°

const ease = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2); // berhenti sejenak di tiap bab
const side = (i: number) => (i % 2 ? 1 : -1);
const frameZ = (i: number) => -i * GAP;

type Key = { pos: THREE.Vector3; look: THREE.Vector3; swerve: number };

// HP (portrait): bingkai di tengah & agak ke atas (teks di bawah). Desktop: bingkai di kiri, teks di kanan.
function layout(aspect: number) {
  const narrow = aspect < 0.9;
  const dist = Math.max(3.4 / (2 * TAN), 2.3 / (2 * TAN * aspect));
  const fx = (i: number) => (narrow ? side(i) * 0.18 : -1.1 + side(i) * 0.3);
  const lift = narrow ? 0.55 : 0.1;
  const keys: Key[] = [{ pos: new THREE.Vector3(0, 0.3, frameZ(0) + dist + 5), look: new THREE.Vector3(0, 0, frameZ(1)), swerve: 0 }];
  for (let i = 0; i < N; i++) {
    keys.push({ pos: new THREE.Vector3(fx(i) * 0.4, 0, frameZ(i) + dist), look: new THREE.Vector3(fx(i), -lift, frameZ(i)), swerve: -side(i) * 1.2 });
  }
  keys.push({ pos: new THREE.Vector3(0, 0.2, RING_Z + dist + 1), look: new THREE.Vector3(0, -lift * 0.6, RING_Z), swerve: 0 });
  return { keys, dist, fx };
}

// kartu pengganti foto: ivory-gold dengan angka Romawi
function cardTexture(i: number, serif: string, sans: string) {
  const cv = document.createElement("canvas");
  cv.width = 640; cv.height = 800;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#151210"; c.fillRect(0, 0, 640, 800);
  const g = c.createRadialGradient(320, 340, 10, 320, 340, 420);
  g.addColorStop(0, "rgba(200,169,107,.16)"); g.addColorStop(1, "rgba(200,169,107,0)");
  c.fillStyle = g; c.fillRect(0, 0, 640, 800);
  c.strokeStyle = "rgba(200,169,107,.45)"; c.lineWidth = 2; c.strokeRect(30, 30, 580, 740);
  c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = "#e3cc98"; c.font = `italic 300 230px ${serif}`; c.fillText(roman(i + 1), 320, 360);
  c.fillStyle = "#a79e92"; c.font = `500 22px ${sans}`; c.letterSpacing = "8px";
  c.fillText(fill(ITEMS[i].tanggal).toUpperCase(), 320, 590);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Shader foto: melengkung & RGB-split mengikuti kecepatan scroll, beriak seperti air di titik sentuhan, memudar ke kabut.
const photoVert = /* glsl */ `
  uniform float uVel, uTime;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    // selalu melengkung ke arah kamera supaya tidak tenggelam di balik lis emas
    p.z += sin(uv.y * 3.14159) * abs(uVel) * 0.35 + (sin(uv.x * 6. + uTime * 1.5) + 1.) * 0.008;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const photoFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uRepeat, uOffset, uHover;
  uniform float uOpacity, uVel, uTime, uHoverAmt, uFogNear, uFogFar;
  uniform vec3 uFog;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec2 uv = vUv;
    vec2 d = vUv - uHover;
    float r = length(d * vec2(1., 1.25));
    uv += normalize(d + 1e-4) * sin(r * 42. - uTime * 6.) * 0.006 * uHoverAmt * smoothstep(.4, 0., r);
    uv.x += sin(vUv.y * 18. + uTime * 2.) * 0.012 * abs(uVel);
    uv = uv * uRepeat + uOffset;
    float s = uVel * 0.012;
    vec3 c = vec3(texture2D(uMap, uv + vec2(s, 0.)).r, texture2D(uMap, uv).g, texture2D(uMap, uv - vec2(s, 0.)).b);
    c = mix(c, uFog, smoothstep(uFogNear, uFogFar, vDepth));
    gl_FragColor = vec4(c, uOpacity);
    #include <colorspace_fragment>
  }`;

type Shared = { uVel: { value: number }; uTime: { value: number }; uFogNear: { value: number }; uFogFar: { value: number }; uFog: { value: THREE.Color } };

function createFrames(serif: string, sans: string, shared: Shared) {
  const photoGeo = new THREE.PlaneGeometry(FRAME_W, FRAME_H, 32, 40), borderGeo = new THREE.PlaneGeometry(FRAME_W + 0.1, FRAME_H + 0.1);
  const loader = new THREE.TextureLoader();
  const frames = ITEMS.map((item, i) => {
    const photo = new THREE.ShaderMaterial({
      vertexShader: photoVert, fragmentShader: photoFrag, transparent: true,
      uniforms: {
        ...shared,
        uMap: { value: cardTexture(i, serif, sans) }, uOpacity: { value: 1 },
        uRepeat: { value: new THREE.Vector2(1, 1) }, uOffset: { value: new THREE.Vector2(0, 0) },
        uHover: { value: new THREE.Vector2(0.5, 0.5) }, uHoverAmt: { value: 0 },
      },
    });
    const border = new THREE.MeshStandardMaterial({ color: "#c8a96b", metalness: 1, roughness: 0.28, transparent: true });
    const group = new THREE.Group();
    const back = new THREE.Mesh(borderGeo, border);
    back.position.z = -0.03;
    const mesh = new THREE.Mesh(photoGeo, photo);
    group.add(back, mesh);
    // kalau fotonya ada, ganti kartu dengan foto (dipotong "cover" ke rasio bingkai 4:5)
    if (item.foto) {
      loader.load(item.foto, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image as HTMLImageElement, ia = img.width / img.height, fa = FRAME_W / FRAME_H, u = photo.uniforms;
        if (ia > fa) { u.uRepeat.value.set(fa / ia, 1); u.uOffset.value.set((1 - fa / ia) / 2, 0); }
        else { u.uRepeat.value.set(1, ia / fa); u.uOffset.value.set(0, (1 - ia / fa) / 2); }
        (u.uMap.value as THREE.Texture).dispose();
        u.uMap.value = tex;
      }, undefined, () => { /* foto belum ada: tetap pakai kartu angka Romawi */ });
    }
    return { group, mesh, photo, border };
  });
  return { frames, dispose: () => {
    photoGeo.dispose(); borderGeo.dispose();
    frames.forEach((f) => { (f.photo.uniforms.uMap.value as THREE.Texture).dispose(); f.photo.dispose(); f.border.dispose(); });
  } };
}

function createDust() {
  const n = 2400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 2] = 12 - Math.random() * (12 - RING_Z + 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const c = sprite.getContext("2d")!, g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,244,220,1)"); g.addColorStop(0.35, "rgba(227,204,152,.55)"); g.addColorStop(1, "rgba(227,204,152,0)");
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(sprite);
  const mat = new THREE.PointsMaterial({ size: 0.06, map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#e3cc98" });
  return { points: new THREE.Points(geo, mat), dispose: () => { geo.dispose(); mat.dispose(); map.dispose(); } };
}

// dua cincin (emas & rose gold) yang saling mengait
function createRings() {
  const geo = new THREE.TorusGeometry(1, 0.06, 48, 200);
  const gold = new THREE.MeshStandardMaterial({ color: "#d4b072", metalness: 1, roughness: 0.16 });
  const rose = new THREE.MeshStandardMaterial({ color: "#c98e7e", metalness: 1, roughness: 0.2 });
  const a = new THREE.Mesh(geo, gold), b = new THREE.Mesh(geo, rose);
  a.position.x = -0.5;
  b.position.x = 0.5; b.rotation.x = Math.PI / 2;
  const group = new THREE.Group();
  group.add(a, b);
  group.position.z = RING_Z;
  return { group, dispose: () => { geo.dispose(); gold.dispose(); rose.dispose(); } };
}

/* eslint-disable react-hooks/immutability --
   Kamera, fog, opasitas material & rotasi objek three.js memang diubah langsung tiap frame di useEffect/useFrame.
   Itu pola resmi React Three Fiber; nilai-nilai ini bukan state React dan tidak memicu render ulang. */
function Scene({ section, bar, onActive, fonts }: {
  section: React.RefObject<HTMLElement | null>; bar: React.RefObject<HTMLElement | null>;
  onActive: (i: number) => void; fonts: { serif: string; sans: string };
}) {
  const { camera, size, scene } = useThree();
  const aspect = size.width / size.height;
  const { keys, dist, fx } = useMemo(() => layout(aspect), [aspect]);
  const shared = useMemo<Shared>(() => ({
    uVel: { value: 0 }, uTime: { value: 0 }, uFogNear: { value: 5 }, uFogFar: { value: 18 }, uFog: { value: new THREE.Color(INK) },
  }), []);
  const world = useMemo(() => ({ ...createFrames(fonts.serif, fonts.sans, shared), dust: createDust(), rings: createRings() }), [fonts, shared]);
  const prog = useRef(0), active = useRef(-1), hovered = useRef(-1);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => { world.dispose(); world.dust.dispose(); world.rings.dispose(); }, [world]);

  useEffect(() => {
    world.frames.forEach((f, i) => { f.group.position.set(fx(i), 0, frameZ(i)); f.group.rotation.y = fx(i) < 0 ? 0.18 : -0.18; });
    // cincin muat di layar HP portrait & sedikit naik supaya tidak menabrak teks penutup
    world.rings.group.scale.setScalar(Math.min(1, aspect * 1.25));
    world.rings.group.position.y = aspect < 0.9 ? 0.45 : 0;
    scene.background = new THREE.Color(INK);
    scene.fog = new THREE.Fog(INK, dist * 0.9, dist + 13);
    shared.uFogNear.value = dist * 0.9;
    shared.uFogFar.value = dist + 13;
    return () => { scene.fog = null; };
  }, [world, fx, dist, scene, shared, aspect]);

  useFrame((_, delta) => {
    const el = section.current;
    if (!el) return;
    const r = el.getBoundingClientRect(), total = r.height - innerHeight;
    const target = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    const step = (target - prog.current) * Math.min(1, delta * 5);
    prog.current += step;
    // kecepatan scroll → kekuatan distorsi foto (dihaluskan, dibatasi)
    const vel = Math.max(-1, Math.min(1, (step / Math.max(delta, 1e-3)) * 6));
    shared.uVel.value += (vel - shared.uVel.value) * Math.min(1, delta * 6);
    shared.uTime.value += delta;

    const u = prog.current * (keys.length - 1), k = Math.min(keys.length - 2, Math.floor(u)), e = ease(u - k);
    camera.position.lerpVectors(keys[k].pos, keys[k + 1].pos, e);
    camera.position.x += Math.sin(Math.PI * e) * keys[k].swerve; // menyamping saat melewati bingkai
    look.lerpVectors(keys[k].look, keys[k + 1].look, e);
    camera.lookAt(look);

    const idx = e < 0.5 ? k : k + 1;
    if (idx !== active.current) { active.current = idx; onActive(idx); }
    if (bar.current) bar.current.style.transform = `scaleY(${prog.current})`;

    // bingkai yang sudah dilewati memudar
    world.frames.forEach((f, i) => {
      const dz = camera.position.z - frameZ(i);
      const op = Math.min(1, Math.max(0, (dz - 0.3) / 1.3));
      f.photo.uniforms.uOpacity.value = f.border.opacity = op;
      f.group.visible = op > 0.01;
      const amt = f.photo.uniforms.uHoverAmt;
      amt.value += ((hovered.current === i ? 1 : 0) - amt.value) * Math.min(1, delta * 4);
    });
    world.rings.group.rotation.y += delta * 0.35;
    world.rings.group.rotation.x = Math.sin(performance.now() / 2400) * 0.25;
  });

  return (
    <>
      <Studio intensity={1.1} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} color="#fff1dc" />
      {/* riak air di titik sentuh/kursor pada foto (raycast bawaan React Three Fiber) */}
      {world.frames.map((f, i) => (
        <primitive
          key={i}
          object={f.group}
          onPointerMove={(e: { object: THREE.Object3D; uv?: THREE.Vector2 }) => {
            if (e.object === f.mesh && e.uv) { f.photo.uniforms.uHover.value.copy(e.uv); hovered.current = i; }
          }}
          onPointerOut={() => { if (hovered.current === i) hovered.current = -1; }}
        />
      ))}
      <primitive object={world.dust.points} />
      <primitive object={world.rings.group} />
    </>
  );
}
/* eslint-enable react-hooks/immutability */

export default function Journey3D({ section, bar, onActive }: {
  section: React.RefObject<HTMLElement | null>; bar: React.RefObject<HTMLElement | null>; onActive: (i: number) => void;
}) {
  const [fonts, setFonts] = useState<{ serif: string; sans: string } | null>(null);
  const { near, visible } = useViewport(section); // near: pasang WebGL, visible: jalankan render loop

  // kartu pengganti foto digambar dengan font dari next/font, jadi tunggu fontnya siap
  useEffect(() => {
    let cancelled = false;
    const serif = cssFont("--font-cormorant"), sans = cssFont("--font-montserrat");
    Promise.all([document.fonts.load(`italic 300 100px ${serif}`), document.fonts.load(`500 20px ${sans}`)])
      .then(() => { if (!cancelled) setFonts({ serif, sans }); });
    return () => { cancelled = true; };
  }, []);

  if (!fonts || !near) return null;
  return (
    <Canvas
      className="journey-canvas"
      dpr={[1, 2]}
      frameloop={visible ? "always" : "demand"}
      camera={{ fov: 50, near: 0.1, far: 60, position: [0, 0, 12] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
    >
      <Scene section={section} bar={bar} onActive={onActive} fonts={fonts} />
    </Canvas>
  );
}
