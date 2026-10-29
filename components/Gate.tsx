"use client";

import { useState } from "react";
import { CONFIG } from "@/lib/config";
import { initAudio, startMusic } from "@/lib/audio";
import { confettiBurst, launch } from "@/lib/fx";
import { useExperience } from "./ExperienceProvider";

export default function Gate() {
  const { opened, open } = useExperience();
  const [opening, setOpening] = useState(false);

  const onOpen = () => {
    if (opening) return;
    setOpening(true);
    initAudio(); // harus di dalam klik, aturan autoplay browser
    startMusic(CONFIG.lagu);
    setTimeout(() => {
      open();
      confettiBurst(innerWidth / 2, innerHeight * 0.45, 90);
      setTimeout(launch, 900);
    }, 1900);
  };

  return (
    <div id="gate" className={opened ? "gone" : undefined} inert={opened}>
      <div className="gate-inner">
        <p className="gate-kicker">Happy Anniversary</p>
        <p className="gate-to">Untuk {CONFIG.istri}</p>
        <button className={`envelope${opening ? " open" : ""}`} onClick={onOpen} aria-label="Buka amplop">
          <span className="env-back" />
          <span className="env-letter">dengan cinta</span>
          <span className="env-front" />
          <span className="env-flap" />
          <span className="env-seal" aria-hidden="true">{CONFIG.suami[0]}&amp;{CONFIG.istri[0]}</span>
        </button>
        <p className="gate-hint">Ketuk untuk membuka<br />Nyalakan suara</p>
      </div>
    </div>
  );
}
