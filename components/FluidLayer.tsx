"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Fluid } from "@/lib/fluid";
import { useViewport } from "@/lib/useNearViewport";

// tinta emas cair di belakang hero: jejak jari/kursor mengalir dan berpusar, plus aliran pelan saat tidak disentuh
const INK = [new THREE.Vector3(0.62, 0.48, 0.26), new THREE.Vector3(0.56, 0.38, 0.3), new THREE.Vector3(0.66, 0.58, 0.44)];

// canvas dibuat baru setiap efek berjalan: konteks yang sudah dilepas (forceContextLoss) tidak bisa dipakai ulang,
// dan React dev menjalankan efek dua kali
function FluidCanvas({ probe }: { probe: RefObject<HTMLSpanElement | null> }) {
  useEffect(() => {
    const host = probe.current!.parentElement!, canvas = document.createElement("canvas");
    canvas.className = "fluid";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false });
    } catch {
      canvas.remove();
      return; // tanpa WebGL: hero tetap tampil tanpa efek cairan
    }
    renderer.setPixelRatio(1);
    const fluid = new Fluid(renderer, innerWidth < 700 ? 96 : 128, innerWidth < 700 ? 384 : 512);
    let raf = 0, visible = true, last = performance.now(), nextDrift = 0, w = 0;
    let prev: { x: number; y: number } | null = null;

    const resize = () => {
      if (host.clientWidth === w) return;
      w = host.clientWidth;
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      fluid.resize(host.clientWidth, host.clientHeight);
    };
    const stir = (cx: number, cy: number) => {
      const r = host.getBoundingClientRect();
      const x = (cx - r.left) / r.width, y = 1 - (cy - r.top) / r.height;
      if (prev) {
        const dx = (x - prev.x) * 3000, dy = (y - prev.y) * 3000;
        if (Math.abs(dx) + Math.abs(dy) > 1) fluid.splat(x, y, dx, dy, INK[Math.floor(Math.random() * INK.length)], 0.004);
      }
      prev = { x, y };
    };
    const move = (e: PointerEvent) => stir(e.clientX, e.clientY);
    // di HP pointermove berhenti begitu browser mulai scroll; touchmove tetap jalan selama jari menyapu
    const touch = (e: TouchEvent) => { const p = e.touches[0]; if (p) stir(p.clientX, p.clientY); };
    const leave = () => { prev = null; };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (now > nextDrift) { // aliran pelan otomatis supaya tetap hidup tanpa disentuh
        const x = 0.2 + Math.random() * 0.6, a = Math.random() * Math.PI * 2;
        fluid.splat(x, 0.15 + Math.random() * 0.7, Math.cos(a) * 320, Math.sin(a) * 320, INK[0].clone().multiplyScalar(0.5), 0.008);
        nextDrift = now + 1400 + Math.random() * 1200;
      }
      fluid.step(dt);
      fluid.render();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(host);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("pointerup", leave);
    host.addEventListener("touchmove", touch, { passive: true });
    host.addEventListener("touchend", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointerup", leave);
      host.removeEventListener("touchmove", touch);
      host.removeEventListener("touchend", leave);
      fluid.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // lepaskan konteks WebGL segera (batas konteks di browser HP)
      canvas.remove();
    };
  }, [probe]);

  return null;
}

// renderer cairan hanya dibuat saat hero dekat layar (batas konteks WebGL di browser HP)
export default function FluidLayer() {
  const probe = useRef<HTMLSpanElement>(null);
  const { near } = useViewport(probe);
  return (
    <>
      <span ref={probe} className="fluid" aria-hidden="true" />
      {near && <FluidCanvas probe={probe} />}
    </>
  );
}
