"use client";

import { useEffect, useState, type RefObject } from "react";

// Dua status dari satu elemen, untuk adegan WebGL:
// - near: di/dekat layar (margin 60%) → adegan dipasang. Browser HP (terutama Safari iPhone) membatasi jumlah
//   konteks WebGL aktif dan mematikan yang lama diam-diam, jadi adegan di luar jangkauan dilepas.
// - visible: benar-benar terlihat → render loop berjalan, selain itu dijeda.
export function useViewport(ref: RefObject<Element | null>) {
  const [state, setState] = useState({ near: false, visible: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => setState((s) => ({ ...s, near: e.isIntersecting })), { rootMargin: "60% 0px" });
    const visible = new IntersectionObserver(([e]) => setState((s) => ({ ...s, visible: e.isIntersecting })));
    near.observe(el); visible.observe(el);
    return () => { near.disconnect(); visible.disconnect(); };
  }, [ref]);
  return state;
}
