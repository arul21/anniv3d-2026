// Musik & efek suara. initAudio() wajib dipanggil di dalam klik user (aturan autoplay browser).
let actx: AudioContext | null = null;
let master: GainNode | null = null;
let audioEl: HTMLAudioElement | null = null;
let musicOn = false;
let synthTimer: ReturnType<typeof setInterval> | null = null;

export function initAudio() {
  if (actx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  actx.resume();
  master = actx.createGain();
  master.gain.value = 0.55;
  const delay = actx.createDelay(), fb = actx.createGain(), lp = actx.createBiquadFilter();
  delay.delayTime.value = 0.33; fb.gain.value = 0.3; lp.frequency.value = 2600;
  master.connect(actx.destination); master.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(actx.destination);
}

export function note(m: number, t: number, vol: number, len = 1.6) {
  if (!actx || !master) return;
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const g = actx.createGain(), o = actx.createOscillator(), o2 = actx.createOscillator(), g2 = actx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.frequency.value = f; o2.frequency.value = f * 4; g2.gain.value = 0.12;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
  o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
}

// suara kertas dibuka: derau pendek yang difilter (disintesis, tanpa file audio)
export function paper() {
  if (!actx || !master) return;
  const len = 0.45, buf = actx.createBuffer(1, Math.floor(actx.sampleRate * len), actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const k = i / d.length;
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2) * (0.4 + 0.6 * Math.abs(Math.sin(k * 38)));
  }
  const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = buf; f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 0.6; g.gain.value = 0.5;
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
}

export const sfx =(m: number, vol = 0.12, len = 0.4) => actx && note(m, actx.currentTime, vol, len);
export const arpeggio = (notes: number[], gap = 0.1, vol = 0.1, len = 1.6) =>
  actx && notes.forEach((m, i) => note(m, actx!.currentTime + i * gap, vol, len));

// kotak musik: progresi C – Am – F – G + melodi sederhana
const PROG = [[72, 76, 79, 84, 88], [69, 72, 76, 81, 84], [65, 69, 72, 77, 81], [67, 71, 74, 79, 83]];
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];
const MEL = [84,0,0,0,83,0,81,0, 81,0,0,0,79,0,76,0, 77,0,0,0,79,0,81,0, 79,0,0,0,0,0,0,0];
const STEP = 0.36;

function startSynth() {
  if (!actx || synthTimer) return;
  const ctx = actx;
  let step = 0, nextT = ctx.currentTime + 0.1;
  synthTimer = setInterval(() => {
    if (nextT < ctx.currentTime - 0.1) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) {
      const i = step % 8, ch = PROG[Math.floor(step / 8) % 4];
      note(ch[ARP[i]], nextT, 0.07);
      if (i === 0) note(ch[0] - 24, nextT, 0.09, 2.6);
      const m = MEL[step % 32];
      if (step >= 32 && m) note(m + 12, nextT, 0.06, 2.2);
      nextT += STEP; step++;
    }
  }, 60);
}

export function startMusic(src: string) {
  if (!actx) return;
  musicOn = true;
  if (!src) return startSynth();
  audioEl = new Audio(src);
  audioEl.loop = true;
  audioEl.play().catch(() => { audioEl = null; startSynth(); });
}

export function toggleMusic() {
  musicOn = !musicOn;
  if (audioEl) void (musicOn ? audioEl.play() : audioEl.pause());
  if (master && actx) master.gain.setTargetAtTime(musicOn ? 0.55 : 0, actx.currentTime, 0.1);
  return musicOn;
}
