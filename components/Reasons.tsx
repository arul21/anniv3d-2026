"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG, fill, pad2 } from "@/lib/config";
import { paper, sfx } from "@/lib/audio";
import { confettiBurst } from "@/lib/fx";
import StoryShare from "./StoryShare";

const Letters3D = dynamic(() => import("./Letters3D"), { ssr: false });

const REASONS = CONFIG.alasan.length;
const ENVELOPES = REASONS + 1; // + satu surat istimewa yang selalu dibuka paling akhir
const LAST = fill(CONFIG.suratTerakhir.trim());

// 22 surat cinta yang melayang; urutan alasan mengikuti urutan amplop dibuka, surat istimewa selalu terakhir
export default function Reasons() {
  const [opened, setOpened] = useState<boolean[]>(() => Array(ENVELOPES).fill(false));
  const [order, setOrder] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [showPaper, setShowPaper] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const count = opened.filter(Boolean).length;
  const complete = count === ENVELOPES;

  const reading = current === null ? -1 : order.indexOf(current); // urutan surat yang sedang dibaca
  const isLast = reading === REASONS;

  const pick = useCallback((i: number, x?: number, y?: number) => {
    if (current !== null || opened[i]) return;
    setCurrent(i);
    setOrder((o) => [...o, i]);
    setTimeout(() => {
      paper();
      if (x !== undefined && y !== undefined) confettiBurst(innerWidth / 2, innerHeight * 0.42, 40); // serpihan segel
      setShowPaper(true);
    }, 650);
  }, [current, opened]);

  const close = useCallback(() => {
    if (current === null) return;
    setShowPaper(false);
    sfx(84, 0.08, 1.2);
    const i = current;
    setTimeout(() => {
      setOpened((o) => o.map((v, k) => v || k === i));
      setCurrent(null);
    }, 350);
  }, [current]);

  useEffect(() => {
    if (!showPaper) return;
    closeBtn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [showPaper, close]);

  const nextUnopened = opened.findIndex((o) => !o);

  return (
    <section id="reasons" className="section">
      <p className="eyebrow reveal"><span className="num">04</span>Kenapa harus kamu</p>
      <h2 className="sec-title reveal">Surat-surat <em>untukmu</em></h2>
      <p className="sec-sub reveal">Ada {ENVELOPES} surat yang melayang di sini, masing-masing berisi satu alasan aku jatuh cinta. Ketuk amplopnya untuk membuka.</p>

      <div className="letters-stage reveal">
        <Letters3D opened={opened} current={current} onPick={pick} name={CONFIG.istri} />
      </div>

      <p className="l-status"><b>{count}</b> / {ENVELOPES} surat dibuka</p>
      <p className={`l-done${complete ? " on" : ""}`}>Dan itu baru sebagian kecil.</p>
      {!complete && (
        <button className="btn ghost l-next" onClick={() => pick(nextUnopened)} disabled={current !== null}>
          Buka surat berikutnya
        </button>
      )}

      <div
        className={`letter-modal${showPaper ? " on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={isLast ? "Surat terakhir" : `Surat nomor ${reading + 1}`}
        inert={!showPaper}
        onClick={close}
      >
        <article className={`letter-paper${isLast ? " last" : ""}`} onClick={(e) => e.stopPropagation()}>
          {isLast ? (
            <>
              <span className="lp-no">Surat terakhir</span>
              <div className="lp-long">{LAST.split(/\n\s*\n/).map((para) => <p key={para.slice(0, 24)}>{para}</p>)}</div>
            </>
          ) : (
            <>
              <span className="lp-no">No. {pad2(reading + 1)}</span>
              <p className="lp-text">{reading >= 0 && fill(CONFIG.alasan[reading])}</p>
            </>
          )}
          <p className="lp-sign">— {CONFIG.suami}</p>
          <button ref={closeBtn} className="btn" onClick={close}>Simpan di hati</button>
          {reading >= 0 && (
            <StoryShare
              className="btn-paper"
              label="Bagikan ke Story"
              data={isLast
                ? { kind: "reason", no: "Surat terakhir", text: LAST.split(/\n\s*\n/)[1] ?? LAST }
                : { kind: "reason", no: `Alasan No. ${pad2(reading + 1)}`, text: fill(CONFIG.alasan[reading]) }}
            />
          )}
        </article>
      </div>
    </section>
  );
}
