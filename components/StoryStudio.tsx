"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { shareFile, videoMime } from "@/lib/story";
import { MAX_PHOTOS, PHOTO_STYLES, loadPhotos } from "@/lib/story3d";

type Result = { status: "waiting" | "rendering" | "ready" | "error"; progress: number; url?: string; blob?: Blob };
type Photo = { url: string; name: string };
const MAX = MAX_PHOTOS;
const noop = () => () => {};

// Story Studio: pilih 1–5 foto → otomatis jadi 3 video Story 3D. Semua diproses di HP, foto tidak diunggah ke mana pun.
export default function StoryStudio() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");
  // dukungan MP4 hanya bisa dicek di browser; server menganggap didukung supaya HTML awal sama (tanpa hydration mismatch)
  const supported = useSyncExternalStore(noop, () => !!videoMime(), () => true);
  // daftar foto & URL video yang masih hidup, dibaca langsung (bukan dari closure render) supaya batas MAX
  // dan pembebasan blob URL selalu sesuai keadaan terbaru
  const photoList = useRef<Photo[]>([]);
  const videoUrls = useRef<string[]>([]);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    photoList.current.forEach((p) => URL.revokeObjectURL(p.url));
    videoUrls.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const commitPhotos = (next: Photo[]) => { photoList.current = next; setPhotos(next); };
  // video lama dibuang (blob-nya bisa beberapa MB) dan carousel kembali ke slide pertama
  const clearResults = () => {
    videoUrls.current.forEach((u) => URL.revokeObjectURL(u));
    videoUrls.current = [];
    setResults({}); setIndex(0); setMsg("");
  };
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX - photoList.current.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    commitPhotos([...photoList.current, ...picked.map((f) => ({ url: URL.createObjectURL(f), name: f.name }))]);
    clearResults(); setNotice("");
  };
  const remove = (i: number) => {
    URL.revokeObjectURL(photoList.current[i].url);
    commitPhotos(photoList.current.filter((_, k) => k !== i));
    clearResults(); setNotice("");
  };

  const generate = async () => {
    setRunning(true); clearResults(); setNotice("");
    const { imgs, failed } = await loadPhotos(photoList.current.map((p) => p.url));
    if (!imgs.length) {
      setNotice("Fotonya tidak bisa dibaca browser ini. Coba pilih foto JPG atau PNG (foto HEIC dari iPhone kadang tidak didukung).");
      setRunning(false);
      return;
    }
    if (failed) setNotice(`${failed} foto tidak bisa dibaca dan dilewati. Coba ganti dengan JPG atau PNG.`);
    setResults(Object.fromEntries(PHOTO_STYLES.map((s) => [s.id, { status: "waiting", progress: 0 }])));
    let errors = 0;
    for (const s of PHOTO_STYLES) {
      setResults((r) => ({ ...r, [s.id]: { status: "rendering", progress: 0 } }));
      try {
        const blob = await s.render(imgs, (p) => setResults((r) => ({ ...r, [s.id]: { ...r[s.id], progress: p } })));
        const url = URL.createObjectURL(blob);
        videoUrls.current.push(url);
        setResults((r) => ({ ...r, [s.id]: { status: "ready", progress: 1, blob, url } }));
      } catch (err) {
        console.error(`Video ${s.id} gagal dibuat:`, err);
        errors++;
        setResults((r) => ({ ...r, [s.id]: { status: "error", progress: 0 } }));
      }
    }
    if (errors) setNotice("Sebagian video gagal dibuat. Tutup tab atau aplikasi lain yang berat, lalu tekan Buat ulang.");
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
      {notice && <p className="studio-warn" role="status">{notice}</p>}

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
