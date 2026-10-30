"use client";

import { useViewport } from "@/lib/useNearViewport";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { sfx } from "@/lib/audio";

// "48 tetes, satu hati": metaball emas cair (medan r²/d² dijumlahkan di shader) yang mengalir satu per satu
// lalu melebur menjadi satu hati. Jari menarik cairannya; ketukan dua kali memecah lalu menyatukannya lagi.
const MAX = 72;

const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const frag = /* glsl */ `
  precision highp float;
  uniform vec3 uBlobs[${MAX}];
  uniform int uCount;
  uniform float uMerge, uTime, uAspect, uScale, uBeat;
  varying vec2 vUv;

  float sdHeart(vec2 p) { // Inigo Quilez
    p.x = abs(p.x);
    if (p.y + p.x > 1.) return sqrt(dot(p - vec2(.25, .75), p - vec2(.25, .75))) - sqrt(2.) / 4.;
    vec2 q = p - .5 * max(p.x + p.y, 0.);
    return sqrt(min(dot(p - vec2(0., 1.), p - vec2(0., 1.)), dot(q, q))) * sign(p.x - p.y);
  }
  float heart(vec2 p) { float s = uScale * (1. + uBeat * .035); return sdHeart((p - vec2(0., -.55 * s)) / s) * s; }

  void main() {
    vec2 p = (vUv - .5) * 2.; p.x *= uAspect;
    float f = 0.; vec2 g = vec2(0.);
    for (int i = 0; i < ${MAX}; i++) {
      if (i >= uCount) break;
      // medan berjangkauan terbatas (Wyvill): (1 - d²/R²)³, jadi tetes yang banyak tidak menyatu jadi satu piringan
      vec3 b = uBlobs[i]; vec2 d = p - b.xy; float R2 = b.z * b.z * 3.4; float x = dot(d, d) / R2;
      if (x < 1.) { float k = 1. - x; f += k * k * k; g += -6. * k * k / R2 * d; }
    }
    float m = smoothstep(.75, 1., uMerge);
    float h = heart(p), e = .004;
    vec2 hg = vec2(heart(p + vec2(e, 0.)) - heart(p - vec2(e, 0.)), heart(p + vec2(0., e)) - heart(p - vec2(0., e))) / (2. * e);
    float dome = clamp(-h * 6., 0., 1.);
    float total = f + m * .9 * smoothstep(.015, -.015, h);
    vec2 n2 = -g * .045 * (1. - m * .6) + m * hg * (1. - dome) * 1.3;
    vec3 N = normalize(vec3(clamp(n2, -3., 3.), 1.));

    // logam cair: pantulan lingkungan emas bergradasi + kilau specular + tepi gelap
    vec3 R = reflect(vec3(0., 0., -1.), N);
    vec3 dark = vec3(.2, .13, .06), mid = vec3(.76, .58, .3), light = vec3(1., .94, .78);
    vec3 col = mix(dark, mid, smoothstep(-.9, .15, R.y));
    col = mix(col, light, smoothstep(.3, .95, R.y) * .85);
    col *= .82 + .3 * (.5 + .5 * sin(R.y * 5. + R.x * 3. + uTime * .6));
    col += pow(max(dot(N, normalize(vec3(-.35, .55, 1.))), 0.), 70.) * vec3(1., .97, .9) * 1.3;
    col = mix(col, dark, pow(1. - N.z, 1.5) * .35);
    float a = smoothstep(.35, .42, total);
    gl_FragColor = vec4(col * a, a);
  }`;

function sdHeart(x: number, y: number) {
  x = Math.abs(x);
  if (y + x > 1) return Math.hypot(x - 0.25, y - 0.75) - Math.SQRT2 / 4;
  const k = 0.5 * Math.max(x + y, 0);
  return Math.sqrt(Math.min(x ** 2 + (y - 1) ** 2, (x - k) ** 2 + (y - k) ** 2)) * Math.sign(x - y);
}

// posisi bebas acak, target di dalam hati (rejection sampling), urutan melebur acak
function createBlobs(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    fx: Math.random() * 2 - 1, fy: Math.random() * 2 - 1, phase: Math.random() * 6.28, speed: 0.25 + Math.random() * 0.35,
    r: 0.07 + Math.random() * 0.035, delay: (i / n) * 0.7 + Math.random() * 0.15, x: 0, y: 0,
  }));
}
function heartTargets(n: number) {
  const pts: [number, number][] = [];
  while (pts.length < n) {
    const x = Math.random() * 1.2 - 0.6, y = Math.random() * 1.15 - 0.05;
    if (sdHeart(x, y) < -0.07) pts.push([x, y - 0.55]);
  }
  return pts;
}

type Input = { x: number; y: number; down: boolean; burst: boolean; visible: boolean };

/* eslint-disable react-hooks/immutability --
   Uniform shader & posisi tetes memang diubah langsung tiap frame di useFrame (pola React Three Fiber),
   bukan state React dan tidak memicu render ulang. */
function Liquid({ count, input, onMerged }: { count: number; input: React.RefObject<Input>; onMerged: (v: boolean) => void }) {
  const { size } = useThree();
  const aspect = size.width / size.height;
  const scale = Math.min(0.95, aspect * 0.78);
  const blobs = useMemo(() => createBlobs(count), [count]);
  const targets = useMemo(() => heartTargets(count), [count]);
  const merged = useRef(false);
  const merge = useRef(0);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, premultipliedAlpha: true, depthTest: false,
    uniforms: {
      uBlobs: { value: Array.from({ length: MAX }, () => new THREE.Vector3()) }, uCount: { value: Math.min(count, MAX) },
      uMerge: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 }, uScale: { value: 1 }, uBeat: { value: 0 },
    },
  }), [count]);
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  useEffect(() => () => { mat.dispose(); geo.dispose(); }, [mat, geo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime, dt = Math.min(delta, 1 / 30), inp = input.current, U = mat.uniforms;
    if (inp.burst) { inp.burst = false; merge.current = Math.min(merge.current, 0.3); sfx(67, 0.12, 1.4); }
    if (inp.visible) merge.current = Math.min(1, merge.current + dt / 7);
    const m = merge.current;
    if ((m > 0.98) !== merged.current) { merged.current = m > 0.98; onMerged(merged.current); }

    U.uTime.value = t; U.uMerge.value = m; U.uAspect.value = aspect; U.uScale.value = scale;
    U.uBeat.value = m > 0.98 ? Math.pow(Math.max(0, Math.sin(t * 2.4)), 12) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 2.4 - 0.5)), 12) : 0;

    blobs.forEach((b, i) => {
      if (i >= MAX) return;
      const k = Math.min(1, Math.max(0, (m * 1.5 - b.delay) / 0.55)), e = k * k * (3 - 2 * k);
      const fx = b.fx * aspect * 0.82 + Math.sin(t * b.speed + b.phase) * 0.12;
      const fy = b.fy * 0.82 + Math.cos(t * b.speed * 0.8 + b.phase) * 0.12;
      const tx = targets[i][0] * scale + Math.sin(t * 1.3 + b.phase) * 0.012;
      const ty = targets[i][1] * scale + Math.cos(t * 1.1 + b.phase) * 0.012;
      let x = fx + (tx - fx) * e, y = fy + (ty - fy) * e;
      // jari menarik cairan ke arahnya
      if (inp.down) {
        const dx = inp.x * aspect - x, dy = inp.y - y, d = Math.hypot(dx, dy);
        if (d < 0.75) { const pull = (1 - d / 0.75) * 0.55; x += dx * pull; y += dy * pull; }
      }
      b.x += (x - b.x) * Math.min(1, dt * 6); b.y += (y - b.y) * Math.min(1, dt * 6);
      U.uBlobs.value[i].set(b.x, b.y, b.r * (1 - e * 0.15));
    });
  });

  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}
/* eslint-enable react-hooks/immutability */

export default function LiquidHeart({ count }: { count: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { near } = useViewport(wrap); // pasang WebGL hanya saat dekat layar
  const input = useRef<Input>({ x: 0, y: 0, down: false, burst: false, visible: false });
  const [visible, setVisible] = useState(false);
  const [merged, setMerged] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); input.current.visible = e.intersectionRatio > 0.5; }, { threshold: [0, 0.5] });
    io.observe(wrap.current!);
    return () => io.disconnect();
  }, []);

  const aim = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    input.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    input.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  return (
    <div
      ref={wrap}
      className="pit-3d"
      onPointerDown={(e) => { aim(e); input.current.down = true; }}
      onPointerMove={aim}
      onPointerUp={() => { input.current.down = false; }}
      onPointerLeave={() => { input.current.down = false; }}
      onDoubleClick={() => { input.current.burst = true; }}
    >
      {near && (<Canvas dpr={[1, 1.5]} frameloop={visible ? "always" : "demand"} gl={{ alpha: true, antialias: false }} style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}>
        <Liquid count={count} input={input} onMerged={setMerged} />
      </Canvas>)}
      <p className={`pit-caption${merged ? " on" : ""}`}>{count} bulan. <em>Satu hati.</em></p>
      <span className="pit-hint">Tahan &amp; geser · ketuk 2× untuk memisahkan</span>
    </div>
  );
}
