"use client";

import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Experience = {
  opened: boolean;
  open: () => void;
  giftUnlocked: boolean;
  unlockGift: () => void;
  scrollTo: (selector: string) => void;
};

const ExperienceContext = createContext<Experience | null>(null);

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience harus dipakai di dalam <ExperienceProvider>");
  return ctx;
}

// State bersama (amplop sudah dibuka? kado sudah terbuka?), smooth scroll Lenis, dan animasi muncul saat scroll.
export default function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  const [giftUnlocked, setGiftUnlocked] = useState(false);
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    const l = new Lenis({ autoRaf: true, anchors: { offset: -20 } });
    l.stop();
    lenis.current = l;
    return () => { l.destroy(); lenis.current = null; };
  }, []);

  useEffect(() => {
    if (opened) lenis.current?.start(); // kunci scroll native sebelum dibuka diatur CSS (body:has(#gate:not(.gone)))
  }, [opened]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        // pakai atribut, bukan class: React menimpa className saat state berubah dan class "in" bisa ikut hilang
        if (e.isIntersecting) { e.target.setAttribute("data-in", ""); io.unobserve(e.target); }
      }),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = useCallback((selector: string) => {
    if (lenis.current) lenis.current.scrollTo(selector, { offset: -20 });
    else document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const open = useCallback(() => { window.scrollTo(0, 0); setOpened(true); }, []);
  const unlockGift = useCallback(() => setGiftUnlocked(true), []);

  const value = useMemo<Experience>(
    () => ({ opened, open, giftUnlocked, unlockGift, scrollTo }),
    [opened, open, giftUnlocked, unlockGift, scrollTo],
  );

  return (
    <ExperienceContext.Provider value={value}>
      <div className={opened ? "started" : undefined}>{children}</div>
    </ExperienceContext.Provider>
  );
}
