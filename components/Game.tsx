"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { CONFIG } from "@/lib/config";
import { useExperience } from "./ExperienceProvider";
import type { Hud } from "./RingGame3D";

const RingGame3D = dynamic(() => import("./RingGame3D"), { ssr: false });

type Overlay = "start" | "win" | "lose" | "giveup" | null;

export default function Game() {
  const { unlockGift, scrollTo } = useExperience();
  const [overlay, setOverlay] = useState<Overlay>("start");
  const [hud, setHud] = useState<Hud>({ score: 0, lives: 3, mult: 1 });
  const [losses, setLosses] = useState(0);
  const [session, setSession] = useState(0);
  const target = CONFIG.targetSkor;

  const start = () => { setSession((s) => s + 1); setOverlay(null); };
  const onEnd = useCallback((win: boolean) => {
    if (win) { unlockGift(); setTimeout(() => setOverlay("win"), 400); }
    else { setLosses((l) => l + 1); setOverlay("lose"); }
  }, [unlockGift]);
  const giveUp = () => { unlockGift(); setOverlay("giveup"); scrollTo("#gift"); };
  const lives = Math.max(0, hud.lives);

  return (
    <section id="game" className="section">
      <p className="eyebrow reveal"><span className="num">05</span>Sebuah permainan kecil</p>
      <h2 className="sec-title reveal">Cincin <em>penangkap cinta</em></h2>
      <p className="sec-sub reveal">Tangkap cinta yang datang lewat lubang cincin. Kumpulkan <b>{target} poin</b> untuk membuka kado rahasiamu.</p>
      <div className="game-box reveal">
        <div className="hud">
          <span><b>{Math.min(hud.score, target)}</b>/ {target}</span>
          {hud.mult > 1 && <span className="combo">Kombo ×{hud.mult}</span>}
          <span className="lives" aria-label={`Nyawa ${lives} dari 3`}>{[0, 1, 2].map((i) => <i key={i} className={i < lives ? "on" : ""} />)}</span>
        </div>
        <div className="gbar"><i style={{ width: `${Math.min(100, (hud.score / target) * 100)}%` }} /></div>
        <RingGame3D session={session} target={target} playing={overlay === null} onHud={setHud} onEnd={onEnd} />
        <div className={`g-overlay${overlay ? "" : " hide"}`}>
          {overlay === "start" && (<>
            <h3>Siap, <em>{CONFIG.istri}</em>?</h3>
            <ul className="legend">
              <li>Hati emas <b>+1</b></li><li>Mutiara <b>+2</b></li>
              <li>Berlian <b>+5</b></li><li>5 berturut <b>×2</b></li>
            </ul>
            <p>Geser cincin supaya cintanya lewat di tengahnya. Hindari hati merah yang retak.</p>
            <button className="btn" onClick={start}>Mulai</button>
          </>)}
          {overlay === "win" && (<>
            <h3>Kamu <em>berhasil</em></h3>
            <p>Tentu saja. Hatiku memang sudah kamu tangkap sejak dulu. Kado rahasiamu kini terbuka.</p>
            <button className="btn" onClick={() => scrollTo("#gift")}>Buka kado</button>
            <button className="btn ghost" onClick={start}>Main lagi</button>
          </>)}
          {overlay === "lose" && (<>
            <h3>Hampir <em>saja</em></h3>
            <p>Skor kamu {hud.score}. Tenang, cintaku tidak mengenal game over.</p>
            <button className="btn" onClick={start}>Coba lagi</button>
            {losses >= 2 && <button className="btn ghost" onClick={giveUp}>Buka kadonya saja</button>}
          </>)}
          {overlay === "giveup" && (<>
            <h3>Khusus untuk <em>kamu</em></h3>
            <p>Untukmu, selalu ada jalan pintas.</p>
            <button className="btn" onClick={() => scrollTo("#gift")}>Buka kado</button>
            <button className="btn ghost" onClick={start}>Main lagi</button>
          </>)}
        </div>
      </div>
      <p className="hint reveal">Geser untuk menggerakkan cincin</p>
    </section>
  );
}
