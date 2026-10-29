"use client";

import { useEffect, useState } from "react";
import { since, type Since } from "./config";

// Waktu sejak menikah, diperbarui tiap detik. null di render pertama supaya HTML server & browser sama (tanpa hydration mismatch).
export function useSince(intervalMs = 1000) {
  const [t, setT] = useState<Since | null>(null);
  useEffect(() => {
    const tick = () => setT(since());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [intervalMs]);
  return t;
}
