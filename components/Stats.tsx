"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIG, fmt, since } from "@/lib/config";
import { useSince } from "@/lib/useSince";

type Counts = { days: number; momDays: number; beats: number };

// angka naik dari 0 saat terlihat, lalu terus bertambah live
export default function Stats() {
  const t = useSince();
  const ref = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<Counts>({ days: 0, momDays: 0, beats: 0 });

  useEffect(() => {
    let raf = 0, live: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 2200;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - k, 3), s = since();
        setCounts({ days: s.days * ease, momDays: s.momDays * ease, beats: s.beats * ease });
        if (k < 1) raf = requestAnimationFrame(step);
        else live = setInterval(() => setCounts(since()), 1000);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.3 });
    io.observe(ref.current!);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearInterval(live); };
  }, []);

  return (
    <section id="stats" className="section">
      <p className="eyebrow reveal"><span className="num">01</span>{t?.y ?? 4} tahun dalam angka</p>
      <h2 className="sec-title reveal">Kita, kalau <em>dihitung</em></h2>
      <div className="stats wrap" ref={ref}>
        <div className="stat reveal"><b>{fmt(counts.days)}</b><span>hari kita lalui bersama</span></div>
        <div className="stat reveal"><b>{fmt(counts.momDays)}</b><span>hari kamu jadi ibu terhebat untuk {CONFIG.anak}</span></div>
        <div className="stat reveal"><b>{fmt(counts.beats)}</b><span>detak jantung, semuanya untukmu*</span></div>
        <div className="stat reveal"><b>∞</b><span>sisa waktu yang mau aku habiskan sama kamu</span></div>
      </div>
      <p className="note reveal">*kira-kira. Tapi perasaannya nggak pernah kira-kira.</p>
    </section>
  );
}
