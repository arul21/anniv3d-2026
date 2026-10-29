"use client";

import { useRef, useState } from "react";
import { CONFIG, tgl } from "@/lib/config";
import { arpeggio } from "@/lib/audio";
import { confettiBurst, setFireworks } from "@/lib/fx";
import { useSince } from "@/lib/useSince";
import StoryShare from "./StoryShare";

const NO_TEXT = ["Nggak", "Yakin?", "Coba pikir lagi", "Tidak bisa dipilih", "Pilih yang satunya", "Hehe"];

export default function Final() {
  const t = useSince(60_000);
  const noBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [no, setNo] = useState({ count: 0, x: 0, y: 0 });
  const [finale, setFinale] = useState(false);

  // tombol "Nggak" kabur ke posisi acak (tetap di dalam layar)
  const dodge = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const r = noBtn.current!.getBoundingClientRect();
    const baseL = r.left - no.x, baseT = r.top - no.y, W = innerWidth, H = innerHeight;
    let x = 0, y = 0, tries = 0;
    do {
      x = (Math.random() * 2 - 1) * Math.min(170, W / 2);
      y = (Math.random() * 2 - 1) * 110;
    } while (++tries < 12 && Math.hypot(x - no.x, y - no.y) < 80);
    setNo({
      count: no.count + 1,
      x: Math.max(12 - baseL, Math.min(W - 12 - r.width - baseL, x)),
      y: Math.max(12 - baseT, Math.min(H - 12 - r.height - baseT, y)),
    });
  };

  const yes = () => {
    setFinale(true);
    setFireworks(true);
    confettiBurst(innerWidth / 2, innerHeight * 0.6, 200);
    arpeggio([72, 76, 79, 84, 88, 91, 96]);
    setTimeout(() => closeBtn.current?.focus(), 100);
  };

  const close = () => { setFinale(false); setFireworks(false); };

  return (
    <>
      <section id="final" className="section">
        <p className="eyebrow reveal"><span className="num">08</span>Satu pertanyaan terakhir</p>
        <h2 className="question reveal">
          Mau nggak, nemenin aku sampai tua, melihat {CONFIG.anak} tumbuh besar, sampai rambut kita <em>sama-sama putih?</em>
        </h2>
        <div className="answers reveal">
          <button className="btn yes-btn" style={{ transform: `scale(${1 + Math.min(no.count, 6) * 0.06})` }} onClick={yes}>Mau</button>
          <button
            ref={noBtn}
            className="btn ghost no-btn"
            style={{ transform: `translate(${no.x}px, ${no.y}px)` }}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") dodge(e); }}
            onPointerDown={dodge}
            onClick={dodge}
          >
            {NO_TEXT[Math.min(no.count, NO_TEXT.length - 1)]}
          </button>
        </div>
      </section>

      <div id="finale" className={finale ? "show" : undefined} role="dialog" aria-modal="true" aria-label="Pesan terakhir" inert={!finale}>
        <p className="eyebrow">{t && tgl(new Date())}</p>
        <h2 className="fin-big">I love you</h2>
        <p className="fin-names">{CONFIG.istri}, terima kasih sudah memilihku</p>
        <p className="fin-sub">
          Selamat ulang tahun pernikahan yang ke-{t?.y ?? 4}. Ini baru permulaan, dan aku mau semua bab berikutnya tetap bersamamu dan {CONFIG.anak}.
        </p>
        <div className="fin-actions">
          <StoryShare data={{ kind: "anniversary" }} className="btn" />
          <button ref={closeBtn} className="btn ghost" onClick={close}>Tutup</button>
        </div>
      </div>
    </>
  );
}
