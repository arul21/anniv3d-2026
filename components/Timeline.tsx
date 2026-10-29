"use client";

import Image from "next/image";
import { useState } from "react";
import { CONFIG, fill, roman } from "@/lib/config";

type Item = (typeof CONFIG.perjalanan)[number];

// foto dioptimasi otomatis oleh next/image; kalau fotonya belum ada, tampil angka Romawi
function Photo({ item, index }: { item: Item; index: number }) {
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  return (
    <div className="t-photo">
      {state !== "ok" && <span className="numeral" aria-hidden="true">{roman(index + 1)}</span>}
      {item.foto && state !== "missing" && (
        <Image
          src={item.foto}
          alt={fill(item.judul)}
          fill
          sizes="(max-width: 760px) 100vw, 420px"
          style={{ objectFit: "cover", opacity: state === "ok" ? 1 : 0, transition: "opacity .8s" }}
          onLoad={() => setState("ok")}
          onError={() => setState("missing")}
        />
      )}
    </div>
  );
}

export default function Timeline() {
  return (
    <section id="journey" className="section">
      <p className="eyebrow reveal"><span className="num">03</span>Perjalanan kita</p>
      <h2 className="sec-title reveal">Cerita <em>kita</em></h2>
      <p className="sec-sub reveal">Setiap babnya punya kamu di dalamnya.</p>
      <div className="timeline">
        {CONFIG.perjalanan.map((p, i) => (
          <div className="t-item reveal" key={p.judul}>
            <div className="t-dot" />
            <div className="t-card">
              <Photo item={p} index={i} />
              <div className="t-body">
                <div className="t-date">{fill(p.tanggal)}</div>
                <h3 className="t-title">{fill(p.judul)}</h3>
                <p className="t-text">{fill(p.cerita)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
