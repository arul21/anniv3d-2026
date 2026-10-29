"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { shareFile, videoMime } from "@/lib/story";
import { PHOTO_STYLES } from "@/lib/story3d";

type Result = { status: "waiting" | "rendering" | "ready" | "error"; progress: number; url?: string; blob?: Blob };
const MAX = 5;
const noop = () => () => {};

// Story Studio: pilih 1–5 foto → otomatis jadi 3 video Story 3D. Semua diproses di HP, foto tidak diunggah ke mana pun.
export default function StoryStudio() {
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [msg, setMsg] = useState("");
  // dukungan MP4 hanya bisa dicek di browser; server menganggap didukung supaya HTML awal sama (tanpa hydration mismatch)
  const supported = useSyncExternalStore(noop, () => !!videoMime(), () => true);
  const urls = useRef<string[]>([]);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => { const list = urls.current; return () => list.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const keep = (u: string) => { urls.current.push(u); return u; };
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, MAX - photos.length);
    setPhotos((p) => [...p, ...picked.map((f) => ({ url: keep(URL.createObjectURL(f)), name: f.name }))]);
    setResults({});
  };
  const remove = (i: number) => { setPhotos((p) => p.filter((_, k) => k !== i)); setResults({}); };

  const generate = async () => {
    setRunning(true); setMsg("");
    setResults(Object.fromEntries(PHOTO_STYLES.map((s) => [s.id, { status: "waiting", progress: 0 }])));
    const srcs = photos.map((p) => p.url);
    for (const s of PHOTO_STYLES) {
      setResults((r) => ({ ...r, [s.id]: { status: "rendering", progress: 0 } }));
      try {
        const blob = await s.render(srcs, (p) => setResults((r) => ({ ...r, [s.id]: { ...r[s.id], progress: p } })));
        setResults((r) => ({ ...r, [s.id]: { status: "ready", progress: 1, blob, url: keep(URL.createObjectURL(blob)) } }));
      } catch {
        setResults((r) => ({ ...r, [s.id]: { status: "error", progress: 0 } }));
      }
    }
    setRunning(false);
  };
  const share = async (blob: Blob, id: string) => {
    const r = await shareFile(blob, `story-${id}.mp4`);
    setMsg(r === "downloaded" ? "Tersimpan. Buka Instagram, lalu unggah sebagai Story." : r === "shared" ? "Terkirim." : "");
  };
  const goTo = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" });
  const hasResults = Object.keys(results).length > 0;
  const current = PHOTO_STYLES[index], cur = results[current.id];

  return (
    <main className="studio">
      <p className="eyebrow">Story Studio</p>
      <h1 className="sec-title">Video <em>3D</em> dari fotomu</h1>
      <p className="sec-sub">Pilih 1–{MAX} foto, lalu buat tiga versi video Story sekaligus. Semua diproses di HP ini, fotonya tidak diunggah ke mana pun.</p>

      {!supported && <p className="studio-warn">Browser ini belum bisa membuat video MP4. Coba buka di Chrome terbaru atau Safari iPhone.</p>}

      <div className="studio-photos">
        {photos.map((p, i) => (
          <figure key={p.url} className="studio-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau foto lokal (blob URL) */}
            <img src={p.url} alt={`Foto ${i + 1}`} />
            <button onClick={() => remove(i)} disabled={running} aria-label={`Hapus foto ${i + 1}`}>×</button>
          </figure>
        ))}
        {photos.length < MAX && (
          <label className="studio-add">
            <input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} disabled={running} />
            <span aria-hidden="true">+</span>
            <small>Tambah foto</small>
          </label>
        )}
      </div>

      <button className="btn" disabled={!photos.length || running || !supported} onClick={generate}>
        {running ? "Membuat video…" : hasResults ? "Buat ulang" : `Buat ${PHOTO_STYLES.length} video`}
      </button>

      {hasResults && (
        <section className="studio-results" aria-label="Hasil video">
          <div ref={track} className="story-track" onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
            {PHOTO_STYLES.map((s) => {
              const r = results[s.id];
              return (
                <div key={s.id} className="story-slide">
                  <div className="story-preview">
                    {r?.status === "ready" && r.url ? <video src={r.url} autoPlay loop muted playsInline /> : (
                      <div className="story-placeholder">
                        <p>{s.label}</p>
                        <span className="story-loading">
                          {r?.status === "rendering" ? `Merender… ${Math.round(r.progress * 100)}%` : r?.status === "error" ? "Gagal dibuat" : "Menunggu giliran"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="story-dots" role="tablist" aria-label="Pilih versi">
            {PHOTO_STYLES.map((s, i) => (
              <button key={s.id} role="tab" aria-selected={i === index} className={i === index ? "on" : undefined} onClick={() => goTo(i)}>{s.label}</button>
            ))}
          </div>
          {cur?.status === "ready" && cur.blob
            ? <button className="btn" onClick={() => share(cur.blob!, current.id)}>Bagikan video {current.label}</button>
            : <button className="btn" disabled>{cur?.status === "rendering" ? `Merender ${current.label}…` : "Belum siap"}</button>}
          <p className="story-note" aria-live="polite">{msg || "Geser untuk melihat ketiga versi. Di menu bagikan, pilih Instagram → Story."}</p>
        </section>
      )}
    </main>
  );
}
