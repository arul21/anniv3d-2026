"use client";

import { useNearViewport } from "@/lib/useNearViewport";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CONFIG, cssFont } from "@/lib/config";
import { makePoints, morphTo } from "@/lib/particles";
import { heartShape, infinityShape, photoShape, shellShape, textShape, type Shape } from "@/lib/shapes";

type Input = { x: number; y: number; over: boolean; lastX: number | null; lastY: number; drag: number; tilt: number; gyX: number; gyY: number };

/* eslint-disable react-hooks/immutability --
   Objek three.js (uniform shader, kamera, vektor) memang diubah langsung tiap frame di useFrame/useEffect.
   Itu pola resmi React Three Fiber untuk animasi; objek ini bukan state React dan tidak memicu render ulang. */
function Particles({ shapes, active, input, stage }: {
  shapes: React.RefObject<Shape[]>; active: boolean; input: React.RefObject<Input>; stage: React.RefObject<HTMLDivElement | null>;
}) {
  const { camera, size, gl, raycaster } = useThree();
  const dpr = gl.getPixelRatio();
  const group = useRef<THREE.Group>(null!);
  const n = shapes.current[0].pos.length / 3;

  const { main, dust } = useMemo(() => {
    const scatter = shellShape(n, 2.2, 4);
    return { main: makePoints(scatter, scatter.slice(), 15), dust: makePoints(shellShape(500, 1.6, 3.2), shellShape(500, 1.6, 3.2), 7) };
  }, [n]);
  const U = main.pts.material.uniforms;
  const mixStart = useRef(0);
  const smooth = useRef({ gx: 0, gy: 0 });
  const tmp = useMemo(() => ({ ndc: new THREE.Vector2(), plane: new THREE.Plane(), hit: new THREE.Vector3() }), []);

  useEffect(() => {
    U.uSize.value = 15 * dpr;
    dust.pts.material.uniforms.uSize.value = 7 * dpr;
  }, [dpr, U, dust]);

  useEffect(() => () => {
    for (const p of [main.pts, dust.pts]) { p.geometry.dispose(); p.material.dispose(); }
  }, [main, dust]);

  // jarak kamera menyesuaikan rasio layar supaya bentuk selalu muat (HP portrait vs desktop)
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.z = Math.max(2.7 / 0.828, 2.9 / (0.828 * aspect));
    camera.updateProjectionMatrix();
  }, [size, camera]);

  // siklus bentuk: hati → 4 → ∞ → nama → foto → ...
  useEffect(() => {
    if (!active) return;
    let step = 0, timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      const list = shapes.current;
      const s = list[step++ % list.length];
      morphTo(main, s);
      mixStart.current = performance.now();
      timer = setTimeout(cycle, s.hold);
    };
    timer = setTimeout(cycle, 400);
    return () => clearTimeout(timer);
  }, [active, main, shapes]);

  useFrame((state) => {
    const t = state.clock.elapsedTime, inp = input.current, g = group.current;
    U.uTime.value = dust.pts.material.uniforms.uTime.value = t;
    U.uMix.value = Math.min(1, (performance.now() - mixStart.current) / 2400);

    // titik jari diproyeksikan (raycast) ke bidang partikel → shader menyibak partikel di sekitarnya
    if (inp.over) {
      const r = gl.domElement.getBoundingClientRect();
      tmp.ndc.set(((inp.x - r.left) / r.width) * 2 - 1, -((inp.y - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(tmp.ndc, camera);
      tmp.plane.normal.set(0, 0, 1).applyQuaternion(g.quaternion);
      tmp.plane.constant = 0;
      if (raycaster.ray.intersectPlane(tmp.plane, tmp.hit)) U.uPointer.value.copy(g.worldToLocal(tmp.hit));
    }
    U.uPointerOn.value += ((inp.over ? 1 : 0) - U.uPointerOn.value) * 0.12;

    const sr = stage.current?.getBoundingClientRect();
    if (sr) U.uScatter.value = Math.min(1, Math.max(0, (innerHeight * 0.1 - sr.top) / (sr.height * 0.9)));

    if (inp.lastX === null) { inp.drag *= 0.96; inp.tilt *= 0.94; }
    const sm = smooth.current;
    sm.gx += (inp.gyX - sm.gx) * 0.05; sm.gy += (inp.gyY - sm.gy) * 0.05;
    g.rotation.y = Math.sin(t * 0.5) * 0.45 + inp.drag + sm.gy;
    g.rotation.x = Math.sin(t * 0.3) * 0.08 + inp.tilt + sm.gx;
    dust.pts.rotation.y = t * 0.03;
  });

  return (
    <>
      <group ref={group}><primitive object={main.pts} /></group>
      <primitive object={dust.pts} />
    </>
  );
}
/* eslint-enable react-hooks/immutability */

export default function Hero3D({ active, numeral, onReady }: { active: boolean; numeral: string; onReady: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const near = useNearViewport(wrap); // pasang WebGL hanya saat dekat layar
  const visible = useNearViewport(wrap, "0px");
  const shapes = useRef<Shape[]>([]);
  const input = useRef<Input>({ x: 0, y: 0, over: false, lastX: null, lastY: 0, drag: 0, tilt: 0, gyX: 0, gyY: 0 });
  const [ready, setReady] = useState(false);

  // bangun semua bentuk setelah font siap (teks digambar pakai font dari next/font)
  useEffect(() => {
    let cancelled = false;
    const n = innerWidth < 700 ? 10000 : 16000;
    const family = cssFont("--font-cormorant");
    Promise.all([document.fonts.load(`600 100px ${family}`), document.fonts.load(`italic 500 100px ${family}`)]).then(() => {
      if (cancelled) return;
      shapes.current = [
        { pos: heartShape(n), hold: 6500 },
        { pos: textShape(n, numeral || "IV", { family, weight: "600" }, 1.1), hold: 5000 },
        { pos: infinityShape(n), hold: 5000 },
        { pos: textShape(n, `${CONFIG.suami} & ${CONFIG.istri}\n& ${CONFIG.anak}`, { family, weight: "italic 500" }, 1.2), hold: 5500 },
      ];
      if (CONFIG.fotoPartikel) {
        photoShape(n, CONFIG.fotoPartikel)
          .then((s) => { if (!cancelled) shapes.current.push(s); })
          .catch((err: Error) => console.info("Foto partikel dilewati:", err.message));
      }
      setReady(true);
      onReady();
    });
    return () => { cancelled = true; };
  }, [numeral, onReady]);

  // geser untuk memutar (dilepas → pelan-pelan kembali) & miringkan HP (Android; iOS butuh izin, jadi dilewati)
  useEffect(() => {
    const inp = input.current;
    const move = (e: PointerEvent) => {
      if (inp.lastX === null) return;
      inp.drag += (e.clientX - inp.lastX) * 0.012; inp.tilt += (e.clientY - inp.lastY) * 0.004;
      inp.lastX = e.clientX; inp.lastY = e.clientY;
    };
    const release = (e: PointerEvent) => { inp.lastX = null; if (e.pointerType !== "mouse") inp.over = false; };
    const orient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      inp.gyY = Math.max(-1, Math.min(1, e.gamma / 35)) * 0.6;
      inp.gyX = Math.max(-1, Math.min(1, (e.beta - 45) / 35)) * 0.25;
    };
    // di HP geser vertikal diambil browser untuk scroll (pointercancel), tapi touchmove tetap jalan:
    // jari yang menyapu hero tetap menyibak partikel sambil halaman ter-scroll
    const el = wrap.current!;
    const touch = (e: TouchEvent) => { const p = e.touches[0]; if (p) { inp.x = p.clientX; inp.y = p.clientY; inp.over = true; } };
    const untouch = () => { inp.over = false; };
    el.addEventListener("touchstart", touch, { passive: true });
    el.addEventListener("touchmove", touch, { passive: true });
    el.addEventListener("touchend", untouch);
    el.addEventListener("touchcancel", untouch);
    addEventListener("pointermove", move);
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
    addEventListener("deviceorientation", orient);
    return () => {
      el.removeEventListener("touchstart", touch);
      el.removeEventListener("touchmove", touch);
      el.removeEventListener("touchend", untouch);
      el.removeEventListener("touchcancel", untouch);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", release);
      removeEventListener("pointercancel", release);
      removeEventListener("deviceorientation", orient);
    };
  }, []);

  const aim = (e: React.PointerEvent) => { input.current.x = e.clientX; input.current.y = e.clientY; input.current.over = true; };

  return (
    <div
      ref={wrap}
      className="hero3d"
      onPointerMove={aim}
      onPointerDown={(e) => { aim(e); input.current.lastX = e.clientX; input.current.lastY = e.clientY; navigator.vibrate?.(10); }}
      onPointerLeave={() => { input.current.over = false; }}
    >
      {ready && near && (
        <Canvas
          flat
          linear
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ fov: 45, near: 0.1, far: 50, position: [0, 0, 3.4] }}
          gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        >
          <Particles shapes={shapes} active={active} input={input} stage={wrap} />
        </Canvas>
      )}
    </div>
  );
}
