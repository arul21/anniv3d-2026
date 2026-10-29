import * as THREE from "three";
import type { Shape } from "./shapes";

// Partikel cahaya 3D yang bisa berubah bentuk (hati → angka → foto → nama). Dipakai hero 3D & video Story 3D.
const vertexShader = /* glsl */ `
  uniform float uMix, uTime, uSize, uScatter, uPointerOn;
  uniform vec3 uPointer;
  attribute vec3 aFrom, aTo, aColA, aColB;
  attribute float aRand;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float m = clamp(uMix * 1.5 - aRand * .5, 0., 1.);
    m = m * m * (3. - 2. * m);
    vec3 dir = normalize(vec3(sin(aRand * 91.), cos(aRand * 57.), sin(aRand * 33.) + .01));
    vec3 p = mix(aFrom, aTo, m);
    p += dir * sin(m * 3.14159) * .45;
    p += .012 * vec3(sin(uTime * 1.7 + aRand * 50.), cos(uTime * 1.3 + aRand * 80.), sin(uTime * 1.1 + aRand * 20.));
    vec3 d = p - uPointer;
    float f = smoothstep(.5, 0., length(d)) * uPointerOn;   // jari menyibak partikel
    p += normalize(d + vec3(0., 0., .001)) * f * .32;
    p = mix(p, p * 2. + dir * 2.2, uScatter);              // scroll: meledak jadi debu bintang
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    float tw = .7 + .3 * sin(uTime * 3. + aRand * 100.);
    gl_PointSize = uSize * (.5 + aRand) * tw / -mv.z;
    vColor = mix(aColA, aColB, m) * (1. + f * 1.2);
    vAlpha = tw * (1. - uScatter * .7);
  }`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = smoothstep(.5, 0., length(gl_PointCoord - .5));
    a = a * a * vAlpha * .65;
    gl_FragColor = vec4(vColor * a, a);
  }`;

// champagne, emas muda, ivory, rose gold (sedikit)
const PALETTE = [[0.86, 0.72, 0.47], [0.95, 0.84, 0.62], [0.98, 0.94, 0.88], [0.84, 0.62, 0.56]];

export type ParticlePoints = { pts: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>; palette: Float32Array };

export function makePoints(from: Float32Array, to: Float32Array, size: number): ParticlePoints {
  const n = from.length / 3, geo = new THREE.BufferGeometry();
  const col = new Float32Array(n * 3), rand = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    col.set(PALETTE[r < 0.45 ? 0 : r < 0.75 ? 1 : r < 0.93 ? 2 : 3], i * 3);
    rand[i] = Math.random();
  }
  geo.setAttribute("position", new THREE.BufferAttribute(to.slice(), 3));
  geo.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
  geo.setAttribute("aTo", new THREE.BufferAttribute(to, 3));
  geo.setAttribute("aColA", new THREE.BufferAttribute(col.slice(), 3));
  geo.setAttribute("aColB", new THREE.BufferAttribute(col.slice(), 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
  // CustomBlending One/One + warna premultiplied: berpendar seperti additive tapi tetap valid di canvas transparan
  const mat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: {
      uMix: { value: 1 }, uTime: { value: 0 }, uSize: { value: size }, uScatter: { value: 0 },
      uPointerOn: { value: 0 }, uPointer: { value: new THREE.Vector3(99, 99, 99) },
    },
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, palette: col };
}

// mulai berubah ke bentuk baru: posisi & warna sekarang jadi titik awal, bentuk baru jadi tujuan (uMix 0 → 1)
export function morphTo(p: ParticlePoints, { pos, col }: Shape) {
  const a = p.pts.geometry.attributes as Record<string, THREE.BufferAttribute>;
  (a.aFrom.array as Float32Array).set(a.aTo.array);
  (a.aTo.array as Float32Array).set(pos);
  (a.aColA.array as Float32Array).set(a.aColB.array);
  (a.aColB.array as Float32Array).set(col ?? p.palette);
  a.aFrom.needsUpdate = a.aTo.needsUpdate = a.aColA.needsUpdate = a.aColB.needsUpdate = true;
  p.pts.material.uniforms.uMix.value = 0;
}
