"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CONFIG } from "@/lib/config";
import { sfx } from "@/lib/audio";
import { heartGeometry } from "@/lib/geometry";
import Studio from "../Studio";

// Toples cinta: toples kaca bening (material transmisi) terisi 48 hati emas satu per satu dengan gravitasi & tabrakan.
// Setelah penuh, tutup emas turun. Ketuk toples (atau guncang HP) untuk mengocok isinya.
const R = 0.22;            // jari-jari tabrakan hati (cukup besar supaya 48 hati memenuhi toples)
const WALL = 0.93 - R;     // batas radial bagian dalam toples
const FLOOR = -1.18 + R;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function jarGeometry() {
  const p = [[0, -1.25], [0.95, -1.25], [1.0, -1.17], [1.02, 0.95], [0.92, 1.18], [0.8, 1.3], [0.82, 1.42], [0.8, 1.48]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(p, 96);
}

function labelTexture(title: string, sub: string, serif: string, sans: string) {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 360;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#f3ece2"; c.fillRect(0, 0, 1024, 360);
  c.strokeStyle = "rgba(138,109,59,.6)"; c.lineWidth = 3; c.strokeRect(22, 22, 980, 316);
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#2a241f";
  c.font = `italic 400 130px ${serif}`; c.fillText(title, 512, 160);
  c.fillStyle = "#8a6d3b"; c.font = `500 34px ${sans}`; c.letterSpacing = "10px"; c.fillText(sub.toUpperCase(), 512, 270);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createJar(count: number, label: THREE.Texture) {
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", transmission: 1, thickness: 0.18, roughness: 0.03, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.05,
    transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
  const jar = new THREE.Mesh(jarGeometry(), glass);
  const labelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.035, 1.035, 0.62, 48, 1, true, -0.62, 1.24),
    new THREE.MeshStandardMaterial({ map: label, roughness: 0.9, side: THREE.FrontSide }),
  );
  labelMesh.position.y = 0.1;
  const gold = new THREE.MeshStandardMaterial({ color: "#d4b072", metalness: 1, roughness: 0.25 });
  const lid = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.16, 64), gold);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), gold);
  knob.position.y = 0.14;
  lid.add(cap, knob);

  const hearts = new THREE.InstancedMesh(heartGeometry(), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.25 }), count);
  hearts.frustumCulled = false;
  const cols = ["#d4b072", "#e3cc98", "#c98e7e", "#efe7dc"].map((c) => new THREE.Color(c));
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < count; i++) { hearts.setColorAt(i, cols[i % 4]); hearts.setMatrixAt(i, hidden); }

  const body = {
    P: new Float32Array(count * 3), V: new Float32Array(count * 3), rot: new Float32Array(count * 3), spin: new Float32Array(count * 3),
    born: new Float32Array(count).fill(-1),
  };
  for (let i = 0; i < count; i++) for (let a = 0; a < 3; a++) body.rot[i * 3 + a] = rand(0, 6.28);

  return {
    jar, labelMesh, lid, hearts, body,
    dispose: () => {
      [jar, labelMesh, cap, knob, hearts].forEach((m) => m.geometry.dispose());
      [glass, labelMesh.material as THREE.Material, gold, hearts.material as THREE.Material].forEach((m) => m.dispose());
      label.dispose();
    },
  };
}

type Input = { shake: number; drag: number };

/* eslint-disable react-hooks/immutability --
   Simulasi fisika & objek three.js (posisi, matriks instance, kamera) memang diubah langsung tiap frame di useFrame.
   Itu pola resmi React Three Fiber; nilai-nilai ini bukan state React dan tidak memicu render ulang. */
function Jar({ count, label, input, onFull }: { count: number; label: THREE.Texture; input: React.RefObject<Input>; onFull: () => void }) {
  const { camera, size } = useThree();
  const world = useMemo(() => createJar(count, label), [count, label]);
  const group = useRef<THREE.Group>(null!);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const clock = useRef({ start: -1, lastClink: 0, full: false });

  useEffect(() => () => world.dispose(), [world]);

  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.set(0, 0.35, Math.max(6, 3.4 / (0.828 * aspect)));
    camera.lookAt(0, 0.05, 0);
  }, [size, camera]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime, dt = Math.min(delta, 1 / 30), c = clock.current, inp = input.current;
    const { P, V, rot, spin, born } = world.body;
    if (c.start < 0) c.start = t;

    // hati dijatuhkan satu per satu dari mulut toples
    for (let i = 0; i < count; i++) {
      if (born[i] < 0 && t - c.start > i * 0.14) {
        born[i] = t;
        P[i * 3] = rand(-0.25, 0.25); P[i * 3 + 1] = 2.2; P[i * 3 + 2] = rand(-0.25, 0.25);
        V[i * 3 + 1] = -1;
        for (let a = 0; a < 3; a++) spin[i * 3 + a] = rand(-4, 4);
      }
    }
    if (inp.shake > 0) {
      for (let i = 0; i < count; i++) if (born[i] >= 0) {
        V[i * 3] += rand(-1.5, 1.5) * inp.shake; V[i * 3 + 1] += rand(2, 4) * inp.shake; V[i * 3 + 2] += rand(-1.5, 1.5) * inp.shake;
        for (let a = 0; a < 3; a++) spin[i * 3 + a] += rand(-6, 6) * inp.shake;
      }
      inp.shake = 0;
    }

    let impact = 0;
    const steps = 3, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < count; i++) {
        if (born[i] < 0) continue;
        const o = i * 3;
        V[o + 1] -= 6 * h;
        P[o] += V[o] * h; P[o + 1] += V[o + 1] * h; P[o + 2] += V[o + 2] * h;
        if (P[o + 1] < FLOOR) { impact = Math.max(impact, -V[o + 1]); P[o + 1] = FLOOR; V[o + 1] *= -0.25; V[o] *= 0.85; V[o + 2] *= 0.85; }
        const r = Math.hypot(P[o], P[o + 2]);
        if (r > WALL && P[o + 1] < 1.0) {
          const nx = P[o] / r, nz = P[o + 2] / r;
          P[o] = nx * WALL; P[o + 2] = nz * WALL;
          const vn = V[o] * nx + V[o + 2] * nz;
          if (vn > 0) { V[o] -= 1.4 * vn * nx; V[o + 2] -= 1.4 * vn * nz; }
        }
      }
      for (let i = 0; i < count; i++) {
        if (born[i] < 0) continue;
        for (let j = i + 1; j < count; j++) {
          if (born[j] < 0) continue;
          const a = i * 3, b = j * 3;
          const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], d2 = dx * dx + dy * dy + dz * dz, m = 2 * R;
          if (d2 >= m * m || d2 < 1e-8) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, ov = (m - d) * 0.5;
          P[a] -= nx * ov; P[a + 1] -= ny * ov; P[a + 2] -= nz * ov;
          P[b] += nx * ov; P[b + 1] += ny * ov; P[b + 2] += nz * ov;
          const rv = (V[b] - V[a]) * nx + (V[b + 1] - V[a + 1]) * ny + (V[b + 2] - V[a + 2]) * nz;
          if (rv < 0) {
            impact = Math.max(impact, -rv);
            const k = rv * 0.65;
            V[a] += nx * k; V[a + 1] += ny * k; V[a + 2] += nz * k;
            V[b] -= nx * k; V[b + 1] -= ny * k; V[b + 2] -= nz * k;
          }
        }
      }
    }
    // bunyi berdenting saat tabrakan cukup keras (dibatasi supaya tidak berisik)
    if (impact > 1.6 && t - c.lastClink > 0.07) { c.lastClink = t; sfx(94 + Math.floor(rand(0, 6)), Math.min(0.08, impact * 0.02), 0.3); }

    for (let i = 0; i < count; i++) {
      if (born[i] < 0) continue;
      const o = i * 3;
      for (let a = 0; a < 3; a++) { spin[o + a] *= 0.97; rot[o + a] += spin[o + a] * dt; }
      tmp.position.set(P[o], P[o + 1], P[o + 2]);
      tmp.rotation.set(rot[o], rot[o + 1], rot[o + 2]);
      tmp.scale.setScalar(R * 0.88);
      tmp.updateMatrix();
      world.hearts.setMatrixAt(i, tmp.matrix);
    }
    world.hearts.instanceMatrix.needsUpdate = true;

    // tutup turun setelah semua hati masuk
    const allIn = t - c.start > count * 0.14 + 1.8;
    if (allIn && !c.full) { c.full = true; onFull(); }
    const ly = allIn ? Math.max(1.56, world.lid.position.y - dt * 2.2) : 3;
    world.lid.position.y = ly;
    world.lid.visible = allIn;

    inp.drag *= 0.94;
    group.current.rotation.y = Math.sin(t * 0.3) * 0.35 + inp.drag;
  });

  return (
    <group ref={group} onClick={(e) => { e.stopPropagation(); input.current.shake = 1; sfx(96, 0.06, 0.3); }}>
      <primitive object={world.hearts} />
      <primitive object={world.jar} />
      <primitive object={world.labelMesh} />
      <primitive object={world.lid} />
    </group>
  );
}
/* eslint-enable react-hooks/immutability */

export default function HeartJar({ count, serif, sans }: { count: number; serif: string; sans: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<Input>({ shake: 0, drag: 0 });
  const [visible, setVisible] = useState(false);
  const [full, setFull] = useState(false);
  const label = useMemo(() => labelTexture(`${count} bulan`, `${CONFIG.suami} & ${CONFIG.istri}`, serif, sans), [count, serif, sans]);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(wrap.current!);
    // guncang HP (Android; iOS butuh izin, jadi dilewati)
    const motion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (Math.hypot(a.x, a.y, a.z) > 22) input.current.shake = 0.8;
    };
    addEventListener("devicemotion", motion);
    return () => { io.disconnect(); removeEventListener("devicemotion", motion); };
  }, []);

  return (
    <div
      ref={wrap}
      className="pit-3d"
      onPointerDown={(e) => { last.current = e.clientX; }}
      onPointerMove={(e) => { if (last.current !== null) { input.current.drag += (e.clientX - last.current) * 0.01; last.current = e.clientX; } }}
      onPointerUp={() => { last.current = null; }}
      onPointerLeave={() => { last.current = null; }}
    >
      {visible && (
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.1, far: 40, position: [0, 0.35, 6] }}
          gl={{ alpha: true, antialias: true }}
          style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
        >
          <Studio intensity={1.1} />
          <directionalLight position={[3, 4, 5]} intensity={1.6} color="#fff1dc" />
          <pointLight position={[-3, 1, 2]} intensity={6} color="#e8c48a" />
          <Jar count={count} label={label} input={input} onFull={() => setFull(true)} />
        </Canvas>
      )}
      <p className={`pit-caption${full ? " on" : ""}`}>Penuh, <em>seperti hatiku.</em></p>
      <span className="pit-hint">Ketuk untuk mengocok</span>
    </div>
  );
}
