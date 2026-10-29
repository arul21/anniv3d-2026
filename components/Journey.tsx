"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { CONFIG, fill, roman } from "@/lib/config";
import Timeline from "./Timeline";

const Journey3D = dynamic(() => import("./Journey3D"), { ssr: false });

const N = CONFIG.perjalanan.length;
const STOPS = N + 2; // pembuka + tiap bab + penutup; satu layar scroll per perhentian

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = matchMedia(REDUCE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

// Cerita kita sebagai perjalanan 3D yang digerakkan scroll. Kalau HP minta "kurangi gerakan", tampilkan timeline biasa.
export default function Journey() {
  const reduce = useSyncExternalStore(subscribe, () => matchMedia(REDUCE).matches, () => false);
  const section = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const onActive = useCallback((i: number) => setActive(i), []);

  if (reduce) return <Timeline />;
  const chapter = active - 1;

  return (
    <section id="journey" ref={section} className="journey" style={{ height: `${STOPS * 100}vh` }} aria-label="Perjalanan kita">
      <div className="journey-stage">
        <Journey3D section={section} bar={bar} onActive={onActive} />

        <div className={`j-intro${active === 0 ? " on" : ""}`}>
          <p className="eyebrow"><span className="num">03</span>Perjalanan kita</p>
          <h2 className="sec-title">Cerita <em>kita</em></h2>
          <p className="j-hint">Scroll untuk menelusuri</p>
        </div>

        {CONFIG.perjalanan.map((p, i) => (
          <article key={p.judul} className={`j-card${chapter === i ? " on" : ""}`}>
            <span className="t-date">{roman(i + 1)} · {fill(p.tanggal)}</span>
            <h3 className="t-title">{fill(p.judul)}</h3>
            <p className="t-text">{fill(p.cerita)}</p>
          </article>
        ))}

        <div className={`j-outro${active === N + 1 ? " on" : ""}`}>
          <p className="sec-title">Dan cerita kita, <em>masih berlanjut.</em></p>
        </div>

        <div className="j-progress" aria-hidden="true"><i ref={bar} /></div>
      </div>
    </section>
  );
}
