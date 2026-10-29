"use client";

import { useNearViewport } from "@/lib/useNearViewport";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cssFont } from "@/lib/config";
import { textShape } from "@/lib/shapes";
import Studio from "./Studio";

// Amplop-amplop melayang pelan. Amplop yang diketuk terbang ke depan (segel pecah); setelah suratnya ditutup,
// amplop berubah jadi kelopak emas yang jatuh dan menumpuk membentuk nama.
const PER = 36; // kelopak per amplop
const CAM_Z = 6;
const TAN = Math.tan(THREE.MathUtils.degToRad(22.5));
const FRONT = new THREE.Vector3(0, 0.35, CAM_Z - 2.6);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function createWorld(count: number, targets: Float32Array) {
  // amplop: badan ivory, tutup segitiga, segel lilin merah marun
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.54, 0.015);
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-0.4, 0.27); flapShape.lineTo(0.4, 0.27); flapShape.lineTo(0, -0.04); flapShape.closePath();
  const flapGeo = new THREE.ShapeGeometry(flapShape);
  const sealGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 32).rotateX(Math.PI / 2);
  const paperMat = new THREE.MeshStandardMaterial({ color: "#efe6d8", roughness: 0.85 });
  const flapMat = new THREE.MeshStandardMaterial({ color: "#e2d4bf", roughness: 0.85, side: THREE.DoubleSide });
  const sealMat = new THREE.MeshStandardMaterial({ color: "#6a1d29", roughness: 0.35, metalness: 0.1 });

  const envelopes = Array.from({ length: count }, (_, i) => {
    const group = new THREE.Group();
    const flap = new THREE.Mesh(flapGeo, flapMat);
    flap.position.z = 0.009;
    const seal = new THREE.Mesh(sealGeo, sealMat);
    seal.position.set(0, -0.03, 0.019);
    group.add(new THREE.Mesh(bodyGeo, paperMat), flap, seal);
    group.userData.index = i;
    return {
      group, seal,
      hx: rand(-1, 1), hy: Math.random(), hz: rand(-4, 0.4), speed: rand(0.05, 0.11), phase: rand(0, 6.28),
      rot: new THREE.Euler(rand(-0.5, 0.5), rand(-0.8, 0.8), rand(-0.4, 0.4)), spin: rand(0.3, 0.7),
      fly: 0, fade: 1, burst: false,
    };
  });

  // kelopak: instanced, warna perhiasan
  const n = count * PER;
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, -0.05); petalShape.quadraticCurveTo(0.036, 0, 0, 0.05); petalShape.quadraticCurveTo(-0.036, 0, 0, -0.05);
  const petalGeo = new THREE.ShapeGeometry(petalShape, 6);
  const petalMat = new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide, emissive: new THREE.Color("#c8a96b"), emissiveIntensity: 0 });
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, n);
  petals.frustumCulled = false;
  const cols = ["#d4b072", "#e3cc98", "#c98e7e", "#f3ece2"].map((c) => new THREE.Color(c));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < n; i++) { petals.setColorAt(i, cols[i % 4]); petals.setMatrixAt(i, zero); }
  const petal = {
    start: new Float32Array(n * 3), t0: new Float32Array(n).fill(-1),
    dur: Float32Array.from({ length: n }, () => rand(1.6, 2.8)), spin: Float32Array.from({ length: n }, () => rand(3, 8)),
    rest: Float32Array.from({ length: n }, () => rand(0, Math.PI * 2)), targets,
  };

  return {
    envelopes, petals, petalMat, petal,
    dispose: () => {
      [bodyGeo, flapGeo, sealGeo, petalGeo].forEach((g) => g.dispose());
      [paperMat, flapMat, sealMat, petalMat].forEach((m) => m.dispose());
    },
  };
}

/* eslint-disable react-hooks/immutability --
   Posisi, rotasi, matriks instance & material objek three.js memang diubah langsung tiap frame di useFrame.
   Itu pola resmi React Three Fiber; nilai-nilai ini bukan state React dan tidak memicu render ulang. */
function World({ opened, current, onPick, targets }: {
  opened: boolean[]; current: number | null; onPick: (i: number, x: number, y: number) => void; targets: Float32Array;
}) {
  const { size } = useThree();
  const world = useMemo(() => createWorld(opened.length, targets), [opened.length, targets]);
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), q: new THREE.Quaternion(), qFront: new THREE.Quaternion(), v: new THREE.Vector3() }), []);
  const halfH = CAM_Z * TAN, halfW = halfH * (size.width / size.height);
  const complete = opened.every(Boolean);

  useEffect(() => () => world.dispose(), [world]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime, dt = Math.min(delta, 1 / 30);
    const { petal, petals } = world;
    const nameW = Math.min(halfW * 0.85, 2.6), nameY = -halfH * 0.62;

    world.envelopes.forEach((e, i) => {
      const g = e.group;
      if (opened[i]) {
        // amplop berubah jadi kelopak
        if (!e.burst) {
          e.burst = true;
          for (let j = 0; j < PER; j++) {
            const p = i * PER + j;
            petal.start[p * 3] = g.position.x + rand(-0.35, 0.35);
            petal.start[p * 3 + 1] = g.position.y + rand(-0.25, 0.25);
            petal.start[p * 3 + 2] = g.position.z + rand(-0.1, 0.1);
            petal.t0[p] = t + j * 0.015;
          }
        }
        e.fade = Math.max(0, e.fade - dt * 4);
        g.scale.setScalar(e.fade * 1.9);
        g.visible = e.fade > 0.001;
        return;
      }
      e.fly += ((current === i ? 1 : 0) - e.fly) * Math.min(1, dt * 3.2);
      const f = easeInOut(Math.min(1, e.fly));

      // melayang turun pelan, lalu muncul lagi dari atas
      const top = halfH * 0.95, range = halfH * 1.45;
      const y = top - ((((e.hy * range + t * e.speed) % range) + range) % range);
      const edge = Math.min(1, (top - y) / 0.4, (y - (top - range)) / 0.4);
      // makin jauh (z negatif), makin lebar sebarannya supaya tetap memenuhi layar
      tmp.v.set(e.hx * halfW * (0.95 + -e.hz * 0.25) + Math.sin(t * 0.5 + e.phase) * 0.12, y, e.hz);
      g.position.lerpVectors(tmp.v, FRONT, f);
      tmp.o.rotation.set(e.rot.x + Math.sin(t * e.spin + e.phase) * 0.35, e.rot.y + Math.sin(t * e.spin * 0.8) * 0.5, e.rot.z + Math.sin(t * 0.4 + e.phase) * 0.2);
      tmp.q.setFromEuler(tmp.o.rotation);
      g.quaternion.copy(tmp.q).slerp(tmp.qFront, f);
      g.scale.setScalar(Math.max(0.001, edge) * (0.72 + f * 1.18));
      // segel "pecah" saat amplop tiba di depan
      e.seal.scale.setScalar(Math.max(0.001, 1 - Math.max(0, f - 0.75) * 4));
    });

    // kelopak: terbang dari amplop, berkibar, lalu mendarat di posisinya dalam nama
    for (let p = 0; p < petal.t0.length; p++) {
      if (petal.t0[p] < 0 || t < petal.t0[p]) continue;
      const u = Math.min(1, (t - petal.t0[p]) / petal.dur[p]), e = easeOut(u);
      const tx = petal.targets[p * 3] * nameW, ty = petal.targets[p * 3 + 1] * nameW + nameY, tz = 0.4 + petal.targets[p * 3 + 2] * 0.3;
      const o = tmp.o;
      o.position.set(
        petal.start[p * 3] + (tx - petal.start[p * 3]) * e + Math.sin(u * Math.PI * 3 + p) * 0.3 * (1 - u),
        petal.start[p * 3 + 1] + (ty - petal.start[p * 3 + 1]) * e + Math.sin(u * Math.PI) * 0.5,
        petal.start[p * 3 + 2] + (tz - petal.start[p * 3 + 2]) * e,
      );
      const s = petal.spin[p] * (1 - e);
      o.rotation.set(Math.sin(t * s) * (1 - u) + 0.2, t * s * (1 - u) + Math.sin(t + p) * 0.15 * u, petal.rest[p] + t * s * (1 - u));
      o.scale.setScalar(0.9 + 0.3 * Math.sin(p));
      o.updateMatrix();
      petals.setMatrixAt(p, o.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    world.petalMat.emissiveIntensity += ((complete ? 0.35 + 0.25 * Math.sin(t * 2) : 0) - world.petalMat.emissiveIntensity) * Math.min(1, dt * 3);
  });

  return (
    <>
      {world.envelopes.map((e, i) => (
        <primitive
          key={i}
          object={e.group}
          onClick={(ev: { stopPropagation: () => void; nativeEvent: MouseEvent }) => {
            ev.stopPropagation();
            onPick(i, ev.nativeEvent.clientX, ev.nativeEvent.clientY);
          }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = ""; }}
        />
      ))}
      <primitive object={world.petals} />
    </>
  );
}
/* eslint-enable react-hooks/immutability */

export default function Letters3D({ opened, current, onPick, name }: {
  opened: boolean[]; current: number | null; onPick: (i: number, x: number, y: number) => void; name: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const near = useNearViewport(wrap); // pasang WebGL hanya saat dekat layar
  const visible = useNearViewport(wrap, "0px");
  const [targets, setTargets] = useState<Float32Array | null>(null);
  const count = opened.length;

  // posisi kelopak dalam nama dihitung dari font (next/font), jadi tunggu fontnya siap
  useEffect(() => {
    let cancelled = false;
    const family = cssFont("--font-cormorant");
    document.fonts.load(`italic 500 100px ${family}`).then(() => {
      if (!cancelled) setTargets(textShape(count * PER, name, { family, weight: "italic 500" }, 1));
    });
    return () => { cancelled = true; };
  }, [name, count]);

  return (
    <div ref={wrap} className="letters-3d">
      {targets && near && (
        <Canvas
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ fov: 45, near: 0.1, far: 40, position: [0, 0, CAM_Z] }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
        >
          <Studio intensity={0.8} />
          <directionalLight position={[2, 4, 5]} intensity={1.6} color="#fff1dc" />
          <pointLight position={[-3, -1, 3]} intensity={8} color="#e8c48a" />
          <World opened={opened} current={current} onPick={onPick} targets={targets} />
        </Canvas>
      )}
    </div>
  );
}
