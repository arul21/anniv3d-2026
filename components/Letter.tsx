"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIG, fill } from "@/lib/config";

const TEXT = fill(CONFIG.surat.trim());

// surat dengan efek mesin ketik; teks lengkap tak terlihat di belakangnya menjaga tinggi kertas supaya halaman tidak loncat
export default function Letter() {
  const paper = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [shown, setShown] = useState(0);
  const done = shown >= TEXT.length;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timer = setTimeout(() => setStarted(true), 800);
    }, { threshold: 0.35 });
    io.observe(paper.current!);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!started || done) return;
    const ch = TEXT[shown - 1];
    const wait = ch === "\n" ? 400 : ch && /[.,!?]/.test(ch) ? 260 : 34;
    const id = setTimeout(() => setShown((s) => s + 1), wait);
    return () => clearTimeout(id);
  }, [started, shown, done]);

  return (
    <section id="letter" className="section">
      <p className="eyebrow reveal"><span className="num">07</span>Sepucuk surat</p>
      <h2 className="sec-title reveal">Untuk<em>mu</em></h2>
      <article
        ref={paper}
        className={`paper reveal${done ? " finished" : ""}`}
        onClick={() => { setStarted(true); setShown(TEXT.length); }}
      >
        <p className="greet">Untuk istriku, {CONFIG.istri}</p>
        <div className="type-wrap">
          <div className="type-ghost" aria-hidden="true">{TEXT}</div>
          <div className={`type-text${done ? " done" : ""}`}>{TEXT.slice(0, shown)}</div>
        </div>
        <p className={`sign${done ? " show" : ""}`}>Selamanya milikmu,<br />{CONFIG.suami}</p>
        <span className="paper-hint">Ketuk untuk membaca sekaligus</span>
      </article>
    </section>
  );
}
