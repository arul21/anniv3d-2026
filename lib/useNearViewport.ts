"use client";

import { useEffect, useState, type RefObject } from "react";

// true kalau elemen sedang di/dekat layar. Margin bawaan dipakai untuk memasang adegan WebGL hanya saat dibutuhkan:
// browser HP (terutama Safari iPhone) membatasi jumlah konteks WebGL aktif, dan konteks lama dimatikan diam-diam.
// Dengan margin "0px" hasilnya "benar-benar terlihat", dipakai untuk menjeda render loop.
export function useNearViewport(ref: RefObject<Element | null>, margin = "60% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}
