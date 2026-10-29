"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIG, cssFont, fill } from "@/lib/config";
import { sfx } from "@/lib/audio";
import { confettiBurst } from "@/lib/fx";
import { useExperience } from "./ExperienceProvider";
import StoryShare from "./StoryShare";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// kupon gosok: lapisan emas di canvas, digosok dengan destination-out; terbuka kalau > 50% terhapus
function Coupon({ k, idx }: { k: (typeof CONFIG.kupon)[number]; idx: number }) {
  const card = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = card.current!, cv = cvRef.current!, c = cv.getContext("2d", { willReadFrequently: true })!;
    let done = false, down = false, last = { x: 0, y: 0 }, moves = 0, lastW = 0;

    const paint = () => {
      const r = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const sans = cssFont("--font-montserrat"), serif = cssFont("--font-cormorant");
      if (done || !r.width) return;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = "source-over";
      // lapisan foil champagne yang halus
      const g = c.createLinearGradient(0, 0, r.width, r.height);
      g.addColorStop(0, "#d9c08d"); g.addColorStop(0.5, "#c3a46a"); g.addColorStop(1, "#d7bd88");
      c.fillStyle = g; c.fillRect(0, 0, r.width, r.height);
      c.fillStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < 260; i++) c.fillRect(rand(0, r.width), rand(0, r.height), 1, 1);
      c.strokeStyle = "rgba(13,11,10,.25)"; c.lineWidth = 1; c.strokeRect(10.5, 10.5, r.width - 21, r.height - 21);
      c.fillStyle = "#2a2118"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `italic 400 26px ${serif}`; c.fillText(`No. ${String(idx + 1).padStart(2, "0")}`, r.width / 2, r.height / 2 - 10);
      c.font = `500 11px ${sans}`;
      c.letterSpacing = "3px";
      c.fillText("GOSOK UNTUK MEMBUKA", r.width / 2, r.height / 2 + 22);
      c.letterSpacing = "0px";
      c.globalCompositeOperation = "destination-out";
      c.lineWidth = 36; c.lineCap = "round"; c.strokeStyle = "#000";
    };

    const pos = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    const scratch = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x + 0.1, b.y); c.stroke();
    };
    const check = () => {
      const d = c.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, tot = 0;
      for (let i = 3; i < d.length; i += 64) { tot++; if (d[i] === 0) clear++; }
      if (clear / tot > 0.5 && !done) {
        done = true;
        setRevealed(true);
        cv.style.opacity = "0";
        cv.style.pointerEvents = "none";
        const b = el.getBoundingClientRect();
        confettiBurst(b.left + b.width / 2, b.top + b.height / 2, 50);
        sfx(91, 0.12, 0.8);
      }
    };
    const onDown = (e: PointerEvent) => { if (done) return; down = true; last = pos(e); cv.setPointerCapture(e.pointerId); scratch(last, last); };
    const onMove = (e: PointerEvent) => { if (!down) return; const p = pos(e); scratch(last, p); last = p; if (++moves % 8 === 0) check(); };
    const onUp = () => { if (!down) return; down = false; check(); };

    // gambar ulang hanya kalau lebar berubah (bukan saat address bar HP muncul/hilang)
    const ro = new ResizeObserver(([e]) => { if (e.contentRect.width !== lastW) { lastW = e.contentRect.width; paint(); } });
    ro.observe(el);
    document.fonts.ready.then(paint);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    return () => {
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
    };
  }, [idx]);

  return (
    <div className="coupon" ref={card}>
      <span className="no">No. {String(idx + 1).padStart(2, "0")}</span>
      <h3>{fill(k.judul)}</h3>
      <p>{fill(k.isi)}</p>
      <small>Berlaku selamanya</small>
      {revealed && (
        <StoryShare
          className="coupon-share"
          label="Bagikan"
          data={{ kind: "coupon", no: `No. ${String(idx + 1).padStart(2, "0")}`, title: fill(k.judul), text: fill(k.isi) }}
        />
      )}
      <canvas ref={cvRef} />
    </div>
  );
}

export default function Coupons() {
  const { giftUnlocked, scrollTo } = useExperience();
  return (
    <section id="gift" className="section">
      <p className="eyebrow reveal"><span className="num">06</span>Kado rahasia</p>
      <h2 className="sec-title reveal">Kupon <em>cinta</em></h2>
      <p className="sec-sub reveal">Gosok setiap kupon untuk melihat isinya. Simpan, lalu tukarkan kapan pun kamu mau. Berlaku seumur hidup.</p>
      <div className={`gift-wrap reveal${giftUnlocked ? "" : " locked"}`}>
        <div className="coupons" inert={!giftUnlocked}>
          {CONFIG.kupon.map((k, i) => <Coupon key={k.judul} k={k} idx={i} />)}
        </div>
        {!giftUnlocked && (
          <div className="lock-msg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <p>Selesaikan <em>Tangkap cintaku</em> untuk membuka kado ini.</p>
            <button className="btn ghost" onClick={() => scrollTo("#game")}>Ke permainan</button>
          </div>
        )}
      </div>
    </section>
  );
}
