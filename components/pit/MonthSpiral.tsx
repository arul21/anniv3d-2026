"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BULAN, CONFIG, WED, fill } from "@/lib/config";
import { sfx } from "@/lib/audio";
import { heartGeometry } from "@/lib/geometry";
import Studio from "../Studio";

// Kalender 48 bulan: spiral hati dari bulan pertama (tengah) sampai bulan terakhir (luar).
// Bulan penting lebih besar & rose gold. Ketuk hati atau pakai ‹ › untuk melihat bulannya.
const GENERIC = [
  "Satu bulan lagi aku memilihmu.",
  "Bulan biasa, tapi bersamamu jadi tidak biasa.",
  "Ada tawa, ada lelah, ada kamu.",
  "Satu bulan lagi pelukan yang sama, rasa yang tetap.",
  "Hari-hari kecil yang ternyata paling berharga.",
  "Masih kamu. Selalu kamu.",
];
const isSpecial = (m: number) => m in CONFIG.momenBulan;

export function monthInfo(m: number) {
  const d = new Date(WED.getFullYear(), WED.getMonth() + m, 1);
  return { label: `${BULAN[d.getMonth()]} ${d.getFullYear()}`, text: fill(CONFIG.momenBulan[m] ?? GENERIC[m % GENERIC.length]) };
}

function spiral(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = i * 0.33 + 0.4, r = 0.3 + i * 0.043; // ±2.5 putaran, cukup renggang supaya garis spiral terbaca
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (i % 2 ? 0.06 : -0.06));
  });
}

/* eslint-disable react-hooks/immutability --
   Matriks instance, warna & kamera three.js memang diubah langsung tiap frame di useFrame (pola React Three Fiber),
   bukan state React dan tidak memicu render ulang. */
function Spiral({ count, selected, onSelect, started }: { count: number; selected: number | null; onSelect: (i: number) => void; started: React.RefObject<number> }) {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null!);
  const { mesh, pos } = useMemo(() => {
    const m = new THREE.InstancedMesh(heartGeometry(), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.22 }), count);
    m.frustumCulled = false;
    return { mesh: m, pos: spiral(count) };
  }, [count]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => ({ gold: new THREE.Color("#d4b072"), pearl: new THREE.Color("#efe7dc"), rose: new THREE.Color("#c98e7e"), glow: new THREE.Color("#fff3d6") }), []);

  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }, [mesh]);

  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.set(0, 0, Math.max(6.2, 4.9 / (0.828 * aspect)));
    camera.lookAt(0, 0, 0);
  }, [size, camera]);

  useFrame((state) => {
    const t = state.clock.elapsedTime, since = t - (started.current < 0 ? (started.current = t) : started.current);
    group.current.rotation.z = -t * 0.04;
    group.current.rotation.x = Math.sin(t * 0.3) * 0.12;
    group.current.rotation.y = Math.sin(t * 0.25) * 0.15;
    for (let i = 0; i < count; i++) {
      const m = i + 1, special = isSpecial(m), sel = selected === i;
      const appear = Math.min(1, Math.max(0, (since - i * 0.06) / 0.5)); // muncul satu per satu dari tengah
      const base = (special ? 0.21 : 0.14) * appear;
      const pulse = sel ? 1.55 + 0.12 * Math.sin(t * 5) : 1;
      tmp.position.copy(pos[i]);
      tmp.rotation.set(0, Math.sin(t * 0.8 + i) * 0.4, 0);
      tmp.scale.setScalar(base * pulse);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, sel ? colors.glow : special ? colors.rose : i % 3 === 2 ? colors.pearl : colors.gold);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <primitive
        object={mesh}
        onClick={(e: { stopPropagation: () => void; instanceId?: number }) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) onSelect(e.instanceId);
        }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
      />
    </group>
  );
}
/* eslint-enable react-hooks/immutability */

export default function MonthSpiral({ count }: { count: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const started = useRef(-1);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(wrap.current!);
    return () => io.disconnect();
  }, []);

  const select = (i: number) => {
    const k = (i + count) % count;
    setSelected(k);
    sfx(isSpecial(k + 1) ? 91 : 79 + (k % 5) * 2, 0.1, 1.2);
  };
  const info = selected === null ? null : monthInfo(selected + 1);

  return (
    <div ref={wrap} className="pit-3d">
      <Canvas
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 45, near: 0.1, far: 40, position: [0, 0, 7] }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
      >
        <Studio intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.5} color="#fff1dc" />
        <Spiral count={count} selected={selected} onSelect={select} started={started} />
      </Canvas>
      <div className="month-card" aria-live="polite">
        {info ? (
          <>
            <span className="month-no">Bulan ke-{selected! + 1} · {info.label}</span>
            <p className="month-text">{info.text}</p>
          </>
        ) : (
          <p className="month-text muted">Ketuk satu hati untuk melihat bulannya.</p>
        )}
        <div className="month-nav">
          <button className="btn ghost" onClick={() => select((selected ?? 0) - 1)} aria-label="Bulan sebelumnya">‹</button>
          <button className="btn ghost" onClick={() => select(selected === null ? 0 : selected + 1)} aria-label="Bulan berikutnya">›</button>
        </div>
      </div>
    </div>
  );
}
