"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { CONFIG, WED, pad2, roman, tgl } from "@/lib/config";
import { useSince } from "@/lib/useSince";
import { useExperience } from "./ExperienceProvider";
import FluidLayer from "./FluidLayer";

// three.js hanya jalan di browser, jadi dimuat terpisah tanpa SSR (halaman tetap ringan saat pertama dibuka)
const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

const delay = (d: string) => ({ "--d": d }) as React.CSSProperties;

export default function Hero() {
  const { opened } = useExperience();
  const t = useSince();
  const [glReady, setGlReady] = useState(false);
  const onReady = useCallback(() => setGlReady(true), []);
  const numeral = t ? roman(Math.max(1, t.y)) : "";

  const cells: [string, string][] = t
    ? [[String(t.y), "Tahun"], [pad2(t.mo), "Bulan"], [pad2(t.d), "Hari"], [pad2(t.h), "Jam"], [pad2(t.mi), "Menit"], [pad2(t.s), "Detik"]]
    : ["Tahun", "Bulan", "Hari", "Jam", "Menit", "Detik"].map((l) => ["00", l]);

  return (
    <section id="hero" className="section hero">
      <FluidLayer />
      <p className="eyebrow h-anim" style={delay(".2s")}>Sejak {tgl(WED)}</p>
      <div className={`stage3d${glReady && opened ? " gl" : ""}`}>
        <div className="big-four h-anim" style={delay(".5s")}>{numeral}</div>
        {t && <Hero3D active={opened} numeral={numeral} onReady={onReady} />}
      </div>
      <p className="stage-hint">Sentuh &amp; geser</p>
      <h1 className="h-anim" style={delay("1s")}>Happy <em>Anniversary</em></h1>
      <p className="names h-anim" style={delay("1.3s")}>{CONFIG.suami} &amp; {CONFIG.istri}</p>
      <div className="counter h-anim" style={delay("1.6s")}>
        {cells.map(([v, l]) => (
          <div className="cell" key={l}><b>{v}</b><span>{l}</span></div>
        ))}
      </div>
      <p className="counter-cap h-anim" style={delay("1.9s")}>dan akan terus bertambah, selamanya.</p>
      <div className="scroll-hint h-anim" style={delay("2.4s")}>Scroll<i /></div>
    </section>
  );
}
