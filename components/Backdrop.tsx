"use client";

import { useEffect, useRef } from "react";
import { registerFx } from "@/lib/fx";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Latar: debu emas halus yang berkelip pelan. Plus canvas FX (kembang api/confetti) di atas semuanya.
export default function Backdrop() {
  const skyRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => registerFx(fxRef.current!), []);

  useEffect(() => {
    const sky = skyRef.current!, c = sky.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    type Mote = { x: number; y: number; r: number; p: number; s: number; vy: number };
    let motes: Mote[] = [];

    const resize = () => {
      const widthChanged = innerWidth !== W;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      sky.width = W * dpr; sky.height = H * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!widthChanged) return; // HP: address bar muncul/hilang saat scroll, jangan diacak ulang
      motes = Array.from({ length: Math.round((W * H) / 9000) }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(0.3, 1.1), p: rand(0, 6.28), s: rand(0.004, 0.012), vy: rand(0.02, 0.08),
      }));
    };

    const loop = () => {
      c.clearRect(0, 0, W, H);
      c.fillStyle = "#e3cc98";
      for (const m of motes) {
        m.p += m.s; m.y -= m.vy;
        if (m.y < -4) m.y = H + 4;
        c.globalAlpha = 0.12 + 0.4 * Math.abs(Math.sin(m.p));
        c.beginPath(); c.arc(m.x, m.y, m.r, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };

    resize();
    addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);

  return (
    <>
      <canvas id="sky" ref={skyRef} />
      <canvas id="fx" ref={fxRef} />
    </>
  );
}
