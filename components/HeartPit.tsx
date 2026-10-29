"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { cssFont } from "@/lib/config";
import { useSince } from "@/lib/useSince";

const LiquidHeart = dynamic(() => import("./pit/LiquidHeart"), { ssr: false });
const MonthSpiral = dynamic(() => import("./pit/MonthSpiral"), { ssr: false });
const HeartJar = dynamic(() => import("./pit/HeartJar"), { ssr: false });

// Tiga versi bagian "48 bulan" untuk dipilih. Hanya versi yang aktif yang di-render (satu adegan WebGL).
const VARIANTS = [
  { id: "liquid", tab: "Tetes emas", title: <>Satu <em>hati</em></>, sub: (n: number) => `${n} tetes emas, satu untuk setiap bulan kita. Lihat bagaimana semuanya menyatu.` },
  { id: "calendar", tab: "Kalender", title: <>Bulan demi <em>bulan</em></>, sub: (n: number) => `${n} hati, satu untuk setiap bulan. Ketuk sebuah hati untuk melihat bulannya.` },
  { id: "jar", tab: "Toples cinta", title: <>Toples <em>cinta</em></>, sub: (n: number) => `${n} hati yang kukumpulkan, satu setiap bulan, sampai penuh.` },
] as const;
type Variant = (typeof VARIANTS)[number]["id"];

const noop = () => () => {};

export default function HeartPit() {
  const t = useSince(60_000);
  const months = t ? Math.min(72, Math.max(12, t.y * 12 + t.mo)) : 0;
  const shown = months || 48;
  const [variant, setVariant] = useState<Variant>("liquid");
  const v = VARIANTS.find((x) => x.id === variant)!;
  // nama font next/font hanya bisa dibaca di browser
  const fonts = useSyncExternalStore(noop, () => `${cssFont("--font-cormorant")}|${cssFont("--font-montserrat")}`, () => "");
  const [serif, sans] = fonts.split("|");

  return (
    <section id="pit" className="section">
      <p className="eyebrow reveal"><span className="num">02</span>{shown} bulan menikah</p>
      <h2 className="sec-title reveal">{v.title}</h2>
      <p className="sec-sub reveal">{v.sub(shown)}</p>

      <div className="pit-tabs reveal" role="tablist" aria-label="Pilih versi">
        {VARIANTS.map((x) => (
          <button key={x.id} role="tab" aria-selected={variant === x.id} className={variant === x.id ? "on" : undefined} onClick={() => setVariant(x.id)}>
            {x.tab}
          </button>
        ))}
      </div>

      <div className="pit reveal" role="tabpanel">
        {months > 0 && variant === "liquid" && <LiquidHeart count={months} />}
        {months > 0 && variant === "calendar" && <MonthSpiral count={months} />}
        {months > 0 && variant === "jar" && serif && <HeartJar count={months} serif={serif} sans={sans} />}
      </div>
    </section>
  );
}
