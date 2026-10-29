"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { renderStoryImage, shareFile, videoMime, type StoryData } from "@/lib/story";
import { VIDEO_STYLES } from "@/lib/story3d";

type Video = { status: "idle" | "rendering" | "ready" | "error"; progress: number; url?: string; blob?: Blob };
type Slide = { id: string; label: string; video: boolean };

// jendela pratinjau Story yang bisa di-slide: slide pertama gambar (langsung dibuat),
// slide berikutnya gaya-gaya video 3D (khusus template "4 tahun", dibuat saat diminta)
function StoryDialog({ data, onClose }: { data: StoryData; onClose: () => void }) {
  const key = JSON.stringify(data);
  const [slides] = useState<Slide[]>(() => [
    { id: "gambar", label: "Gambar", video: false },
    ...(data.kind === "anniversary" && videoMime() ? VIDEO_STYLES.map((s) => ({ id: s.id, label: `Video ${s.label}`, video: true })) : []),
  ]);
  const [index, setIndex] = useState(0);
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const [videos, setVideos] = useState<Record<string, Video>>({});
  const [msg, setMsg] = useState("");
  const track = useRef<HTMLDivElement>(null);
  const shareBtn = useRef<HTMLButtonElement>(null);
  const urls = useRef<string[]>([]);
  const slide = slides[index], video = videos[slide.id] ?? { status: "idle", progress: 0 };
  const busy = Object.values(videos).some((v) => v.status === "rendering");

  useEffect(() => {
    let alive = true;
    renderStoryImage(JSON.parse(key) as StoryData)
      .then((blob) => { if (!alive) return; const url = URL.createObjectURL(blob); urls.current.push(url); setImg({ url, blob }); })
      .catch(() => { if (alive) setMsg("Gambar gagal dibuat. Coba lagi."); });
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    const list = urls.current;
    shareBtn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", esc);
    return () => { removeEventListener("keydown", esc); list.forEach((u) => URL.revokeObjectURL(u)); };
  }, [onClose]);

  const goTo = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" });
  const share = async (blob: Blob, name: string) => {
    const r = await shareFile(blob, name);
    setMsg(r === "downloaded" ? "Tersimpan. Buka Instagram, lalu unggah sebagai Story." : r === "shared" ? "Terkirim." : "");
  };
  const makeVideo = async (id: string) => {
    const style = VIDEO_STYLES.find((s) => s.id === id)!;
    setVideos((v) => ({ ...v, [id]: { status: "rendering", progress: 0 } }));
    try {
      const blob = await style.render((p) => setVideos((v) => ({ ...v, [id]: { ...v[id], progress: p } })));
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      setVideos((v) => ({ ...v, [id]: { status: "ready", progress: 1, blob, url } }));
    } catch {
      setVideos((v) => ({ ...v, [id]: { status: "error", progress: 0 } }));
    }
  };

  return createPortal(
    <div className="story-modal" role="dialog" aria-modal="true" aria-label="Bagikan ke Instagram Story" onClick={onClose}>
      <div className="story-sheet" onClick={(e) => e.stopPropagation()}>
        <div
          ref={track}
          className="story-track"
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {slides.map((s) => {
            const v = videos[s.id];
            return (
              <div key={s.id} className="story-slide">
                <div className="story-preview">
                  {s.video ? (
                    v?.status === "ready" && v.url ? <video src={v.url} autoPlay loop muted playsInline /> : (
                      <div className="story-placeholder">
                        <p>{s.label}</p>
                        <span className="story-loading">{v?.status === "rendering" ? `Merender… ${Math.round(v.progress * 100)}%` : "Belum dibuat"}</span>
                      </div>
                    )
                  ) : img ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pratinjau blob buatan canvas, bukan aset yang perlu dioptimasi
                    <img src={img.url} alt="Pratinjau Instagram Story" />
                  ) : (
                    <span className="story-loading">Menyiapkan…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {slides.length > 1 && (
          <div className="story-dots" role="tablist" aria-label="Pilih versi">
            {slides.map((s, i) => (
              <button key={s.id} role="tab" aria-selected={i === index} className={i === index ? "on" : undefined} onClick={() => goTo(i)}>
                {s.label.replace("Video ", "")}
              </button>
            ))}
          </div>
        )}

        <div className="story-actions">
          {!slide.video && (
            <button ref={shareBtn} className="btn" disabled={!img} onClick={() => img && share(img.blob, "happy-anniversary.jpg")}>Bagikan gambar</button>
          )}
          {slide.video && video.status === "ready" && video.blob && (
            <button className="btn" onClick={() => share(video.blob!, `happy-anniversary-${slide.id}.mp4`)}>Bagikan video</button>
          )}
          {slide.video && (video.status === "idle" || video.status === "error") && (
            <button className="btn" disabled={busy} onClick={() => makeVideo(slide.id)}>Buat video 3D</button>
          )}
          {slide.video && video.status === "rendering" && <button className="btn" disabled>Merender 3D… {Math.round(video.progress * 100)}%</button>}
          <button className="story-close" onClick={onClose}>Tutup</button>
        </div>
        <p className="story-note" aria-live="polite">
          {msg || (video.status === "error" && slide.video ? "Video tidak bisa dibuat di browser ini, pakai versi gambar ya."
            : slides.length > 1 ? "Geser untuk melihat versi video 3D. Di menu bagikan, pilih Instagram → Story." : "Di menu bagikan, pilih Instagram → Story.")}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export default function StoryShare({ data, label = "Bagikan ke Story", className = "btn ghost" }: { data: StoryData; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className={className} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <svg className="share-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".8" fill="currentColor" />
        </svg>
        {label}
      </button>
      {open && <StoryDialog data={data} onClose={close} />}
    </>
  );
}
