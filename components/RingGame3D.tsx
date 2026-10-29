"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { arpeggio, sfx } from "@/lib/audio";
import { confettiBurst } from "@/lib/fx";
import { heartGeometry } from "@/lib/geometry";
import Studio from "./Studio";

// "Cincin penangkap cinta": cincin emas digeser jari; hati, mutiara & berlian datang dari kedalaman
// dan harus ditangkap tepat saat melewati lubang cincin. Klimaks: berlian besar menempel → cincin berlian.
type Kind = "heart" | "pearl" | "gem" | "broken";
const KINDS: { k: Kind; v: number; w: number }[] = [
  { k: "heart", v: 1, w: 52 }, { k: "pearl", v: 2, w: 16 }, { k: "gem", v: 5, w: 6 }, { k: "broken", v: -1, w: 0 },
];
const POOL = 18, FAR = -16, HOLE = 0.47, CAM_Z = 5;
const TAN = Math.tan(THREE.MathUtils.degToRad(25));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export type Hud = { score: number; lives: number; mult: number };

function createWorld() {
  const geos: Record<Kind, THREE.BufferGeometry> = {
    heart: heartGeometry({ curveSegments: 14, bevelSegments: 4 }).scale(0.17, 0.17, 0.17),
    broken: heartGeometry({ curveSegments: 14, bevelSegments: 4 }).scale(0.17, 0.17, 0.17),
    pearl: new THREE.SphereGeometry(0.15, 32, 20),
    gem: new THREE.OctahedronGeometry(0.2, 0).scale(1, 1.25, 1),
  };
  const mats: Record<Kind, THREE.Material> = {
    heart: new THREE.MeshStandardMaterial({ color: "#d9b878", metalness: 1, roughness: 0.18 }),
    broken: new THREE.MeshStandardMaterial({ color: "#5a1520", metalness: 0.3, roughness: 0.45, emissive: new THREE.Color("#3a0a10"), emissiveIntensity: 0.6 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: "#f3ece2", roughness: 0.25, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color("#ffe6cf") }),
    gem: new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0, roughness: 0, transmission: 0.9, thickness: 0.6, ior: 2.4, iridescence: 1, clearcoat: 1 }),
  };
  const items = Array.from({ length: POOL }, () => {
    const mesh = new THREE.Mesh(geos.heart, mats.heart);
    mesh.visible = false;
    return { mesh, kind: "heart" as Kind, alive: false, x: 0, y: 0, z: 0, spin: new THREE.Vector3() };
  });

  const ringMat = new THREE.MeshPhysicalMaterial({ color: "#d4b072", metalness: 1, roughness: 0.14, emissive: new THREE.Color("#c8a96b"), emissiveIntensity: 0, clearcoat: 1 });
  const ring = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 32, 128), ringMat);
  const zoneMat = new THREE.MeshBasicMaterial({ color: "#e3cc98", transparent: true, opacity: 0.05, depthWrite: false });
  const zone = new THREE.Mesh(new THREE.CircleGeometry(0.49, 48), zoneMat);
  // berlian besar untuk klimaks (tersembunyi sampai dipakai)
  const bigGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0).scale(1, 1.25, 1), mats.gem);
  bigGem.visible = false;
  ring.add(band, zone);

  // debu emas yang melesat ke arah kamera (sensasi melaju)
  const dustN = 360, dust = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dust[i * 3] = rand(-5, 5); dust[i * 3 + 1] = rand(-4, 4); dust[i * 3 + 2] = rand(FAR, 4); }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const dustMat = new THREE.PointsMaterial({ color: "#e3cc98", size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  const dustPts = new THREE.Points(dustGeo, dustMat);

  return {
    geos, mats, items, ring, ringMat, zoneMat, bigGem, dustPts,
    dispose: () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      [band.geometry, zone.geometry, bigGem.geometry, dustGeo].forEach((g) => g.dispose());
      [ringMat, zoneMat, dustMat].forEach((m) => m.dispose());
    },
  };
}

type Ctl = { tx: number; ty: number; keys: Record<string, boolean> };

/* eslint-disable react-hooks/immutability --
   Posisi, material & kamera three.js serta state engine game memang diubah langsung tiap frame di useFrame
   (pola React Three Fiber); bukan state React dan tidak memicu render ulang. HUD dikirim lewat callback. */
function World({ session, target, ctl, onHud, onEnd }: {
  session: number; target: number; ctl: React.RefObject<Ctl>; onHud: (h: Hud) => void; onEnd: (win: boolean) => void;
}) {
  const { camera, size, gl, scene } = useThree();
  const world = useMemo(() => createWorld(), []);
  const G = useRef({ phase: "idle" as "idle" | "play" | "finale" | "done", score: 0, lives: 3, combo: 0, spawnT: 0, slow: 0, shake: 0, flash: 0, finaleT: 0, attached: false });
  const tmp = useMemo(() => ({ v: new THREE.Vector3() }), []);
  const halfH = CAM_Z * TAN, halfW = halfH * (size.width / size.height);

  useEffect(() => () => world.dispose(), [world]);

  // sesi baru = mulai main
  useEffect(() => {
    if (session === 0) return;
    Object.assign(G.current, { phase: "play", score: 0, lives: 3, combo: 0, spawnT: 0.4, slow: 0, shake: 0, flash: 0, finaleT: 0, attached: false });
    world.items.forEach((it) => { it.alive = false; it.mesh.visible = false; });
    if (world.bigGem.parent === world.ring) { world.ring.remove(world.bigGem); scene.add(world.bigGem); }
    world.bigGem.visible = false;
    world.ring.scale.setScalar(1);
    world.ring.rotation.set(0, 0, 0);
    onHud({ score: 0, lives: 3, mult: 1 });
  }, [session, world, onHud, scene]);

  const burstAt = (x: number, y: number, z: number, n: number) => {
    tmp.v.set(x, y, z).project(camera);
    const r = gl.domElement.getBoundingClientRect();
    confettiBurst(r.left + ((tmp.v.x + 1) / 2) * r.width, r.top + ((1 - tmp.v.y) / 2) * r.height, n);
  };

  const pick = (score: number) => {
    const ws = KINDS.map((k) => (k.v < 0 ? 18 + score * 0.6 : k.w));
    let r = rand(0, ws.reduce((a, b) => a + b));
    for (let i = 0; i < KINDS.length; i++) if ((r -= ws[i]) < 0) return KINDS[i];
    return KINDS[0];
  };

  useFrame((state, delta) => {
    const g = G.current, c = ctl.current, t = state.clock.elapsedTime;
    const real = Math.min(delta, 1 / 30);
    g.slow = Math.max(0, g.slow - real);
    const dt = real * (g.slow > 0 ? 0.35 : 1);
    const prog = Math.min(1, g.score / target);
    const ring = world.ring;

    // gerak cincin: ikut jari / tombol panah (saat klimaks, ke tengah sendiri)
    if (c.keys.ArrowLeft) c.tx -= 3 * real;
    if (c.keys.ArrowRight) c.tx += 3 * real;
    if (c.keys.ArrowUp) c.ty += 3 * real;
    if (c.keys.ArrowDown) c.ty -= 3 * real;
    c.tx = Math.max(-halfW * 0.82, Math.min(halfW * 0.82, c.tx));
    c.ty = Math.max(-halfH * 0.75, Math.min(halfH * 0.75, c.ty));
    const gx = g.phase === "finale" ? 0 : c.tx, gy = g.phase === "finale" ? 0 : c.ty;
    ring.position.x += (gx - ring.position.x) * Math.min(1, real * 12);
    ring.position.y += (gy - ring.position.y) * Math.min(1, real * 12);
    if (g.phase === "play") ring.rotation.z = (gx - ring.position.x) * -0.4;

    // kombo membuat cincin makin menyala; kena hati retak = kilat merah
    const mult = Math.min(3, 1 + Math.floor(g.combo / 5));
    world.ringMat.emissiveIntensity += (((mult - 1) * 0.35 + (g.attached ? 0.3 : 0)) - world.ringMat.emissiveIntensity) * Math.min(1, real * 4);
    g.flash = Math.max(0, g.flash - real * 2.5);
    world.ringMat.emissive.setRGB(0.78 + g.flash * 0.2, 0.66 * (1 - g.flash), 0.42 * (1 - g.flash));
    world.zoneMat.opacity = 0.05 + (mult - 1) * 0.04 + g.flash * 0.25;

    // debu melesat
    const dp = world.dustPts.geometry.attributes.position as THREE.BufferAttribute;
    const speed = g.phase === "play" ? 5 + prog * 5 : 1.2;
    for (let i = 0; i < dp.count; i++) {
      let z = dp.getZ(i) + speed * 1.4 * dt;
      if (z > 4) z = FAR;
      dp.setZ(i, z);
    }
    dp.needsUpdate = true;

    if (g.phase === "play") {
      g.spawnT -= dt;
      if (g.spawnT <= 0) {
        const it = world.items.find((i) => !i.alive);
        if (it) {
          const k = pick(g.score);
          it.alive = true; it.kind = k.k;
          it.x = rand(-halfW * 0.78, halfW * 0.78); it.y = rand(-halfH * 0.7, halfH * 0.7); it.z = FAR;
          it.spin.set(rand(-2, 2), rand(-3, 3), rand(-1, 1));
          it.mesh.geometry = world.geos[k.k]; it.mesh.material = world.mats[k.k]; it.mesh.visible = true;
        }
        g.spawnT = 0.78 - prog * 0.38 + rand(0, 0.25);
      }

      for (const it of world.items) {
        if (!it.alive) continue;
        const prevZ = it.z;
        it.z += speed * dt;
        it.mesh.position.set(it.x, it.y, it.z);
        it.mesh.rotation.x += it.spin.x * dt; it.mesh.rotation.y += it.spin.y * dt; it.mesh.rotation.z += it.spin.z * dt;
        // melewati bidang cincin: tertangkap kalau masuk lubang
        if (prevZ < 0 && it.z >= 0) {
          const hit = Math.hypot(it.x - ring.position.x, it.y - ring.position.y) < HOLE;
          const kind = KINDS.find((k) => k.k === it.kind)!;
          if (hit && kind.v > 0) {
            g.combo++;
            const m = Math.min(3, 1 + Math.floor(g.combo / 5));
            g.score += kind.v * m;
            sfx(kind.v >= 5 ? 96 : 84 + kind.v * 3 + (m - 1) * 2, 0.13, 0.5);
            if (g.combo % 5 === 0 && m > 1) arpeggio([88, 91, 96], 0.07, 0.08, 0.8);
            if (kind.k === "gem") { g.slow = 1.6; sfx(60, 0.12, 1.6); }
            burstAt(it.x, it.y, 0, kind.k === "gem" ? 40 : 12);
            it.alive = false; it.mesh.visible = false;
          } else if (hit) {
            g.lives--; g.combo = 0; g.shake = 0.35; g.flash = 1;
            sfx(48, 0.2, 0.6); navigator.vibrate?.(80);
            it.alive = false; it.mesh.visible = false;
          } else if (kind.v > 0) {
            g.combo = 0; // hati bagus terlewat: kombo putus
          }
          onHud({ score: g.score, lives: g.lives, mult: Math.min(3, 1 + Math.floor(g.combo / 5)) });
        }
        if (it.z > 4) { it.alive = false; it.mesh.visible = false; }
      }

      if (g.lives <= 0) { g.phase = "done"; onEnd(false); }
      else if (g.score >= target) {
        // klimaks: bersihkan layar, berlian besar meluncur ke cincin
        g.phase = "finale"; g.finaleT = 0;
        world.items.forEach((i) => { i.alive = false; i.mesh.visible = false; });
        world.bigGem.visible = true; world.bigGem.position.set(0, 0, FAR); world.bigGem.scale.setScalar(2.2);
        sfx(72, 0.12, 2);
      }
    } else if (g.phase === "finale") {
      g.finaleT += real;
      const gem = world.bigGem;
      if (!g.attached) {
        gem.position.z = Math.min(0, gem.position.z + 7 * real);
        gem.position.x = ring.position.x; gem.position.y = ring.position.y;
        gem.rotation.y += real * 3;
        if (gem.position.z >= 0) {
          g.attached = true; g.finaleT = 0;
          ring.add(gem);
          gem.position.set(0, 0.62, 0); gem.scale.setScalar(1);
          arpeggio([84, 88, 91, 96, 100], 0.1, 0.12, 1.6);
          burstAt(ring.position.x, ring.position.y + 0.6, 0, 90);
        }
      } else {
        ring.rotation.y += real * (4 - Math.min(3.4, g.finaleT * 1.6));
        ring.scale.setScalar(1 + Math.min(0.55, g.finaleT * 0.5));
        if (g.finaleT > 2.6) { g.phase = "done"; onEnd(true); }
      }
    } else {
      ring.rotation.y += real * (g.attached ? 0.6 : 0.25);
      ring.position.y += Math.sin(t * 1.2) * 0.0015;
    }

    // getaran kamera saat kena hati retak
    g.shake = Math.max(0, g.shake - real);
    camera.position.x = g.shake > 0 ? rand(-0.06, 0.06) : 0;
    camera.position.y = g.shake > 0 ? rand(-0.06, 0.06) : 0;
  });

  return (
    <>
      <primitive object={world.dustPts} />
      <primitive object={world.ring} />
      <primitive object={world.bigGem} />
      {world.items.map((it, i) => <primitive key={i} object={it.mesh} />)}
    </>
  );
}
/* eslint-enable react-hooks/immutability */

export default function RingGame3D({ session, target, playing, onHud, onEnd }: {
  session: number; target: number; playing: boolean; onHud: (h: Hud) => void; onEnd: (win: boolean) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const ctl = useRef<Ctl>({ tx: 0, ty: -0.6, keys: {} });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(wrap.current!);
    const down = (e: KeyboardEvent) => {
      if (playing && e.key.startsWith("Arrow")) { ctl.current.keys[e.key] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { ctl.current.keys[e.key] = false; };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => { io.disconnect(); removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, [playing]);

  // posisi jari → titik di bidang cincin (z = 0)
  const aim = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect(), halfH = CAM_Z * TAN, halfW = halfH * (r.width / r.height);
    ctl.current.tx = (((e.clientX - r.left) / r.width) * 2 - 1) * halfW;
    ctl.current.ty = -(((e.clientY - r.top) / r.height) * 2 - 1) * halfH + 0.35; // sedikit di atas jari supaya tidak tertutup
  };

  return (
    <div
      ref={wrap}
      className="ring-game"
      style={{ touchAction: playing ? "none" : "pan-y" }}
      onPointerMove={aim}
      onPointerDown={aim}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 50, near: 0.1, far: 40, position: [0, 0, CAM_Z] }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Studio intensity={1} />
        <directionalLight position={[2, 3, 4]} intensity={1.4} color="#fff1dc" />
        <pointLight position={[0, 0, 2]} intensity={4} color="#e8c48a" />
        <World session={session} target={target} ctl={ctl} onHud={onHud} onEnd={onEnd} />
      </Canvas>
    </div>
  );
}
