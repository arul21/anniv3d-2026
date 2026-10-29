import * as THREE from "three";

// Simulasi fluida GPU (stable fluids / Navier–Stokes) dengan render target ping-pong:
// splat → curl & vorticity → divergence → pressure (Jacobi) → gradient subtract → advection.
const vert = /* glsl */ `
  uniform vec2 texel;
  varying vec2 vUv, vL, vR, vT, vB;
  void main() {
    vUv = uv;
    vL = uv - vec2(texel.x, 0.); vR = uv + vec2(texel.x, 0.);
    vT = uv + vec2(0., texel.y); vB = uv - vec2(0., texel.y);
    gl_Position = vec4(position.xy, 0., 1.);
  }`;

const head = "varying vec2 vUv, vL, vR, vT, vB;\n";
const FRAG = {
  splat: `uniform sampler2D uTarget; uniform float aspect, radius; uniform vec3 color; uniform vec2 point;
    void main() { vec2 p = vUv - point; p.x *= aspect; vec3 s = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.); }`,
  advection: `uniform sampler2D uVelocity, uSource; uniform vec2 velTexel; uniform float dt, dissipation;
    void main() { vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * velTexel;
      gl_FragColor = vec4(dissipation * texture2D(uSource, coord).xyz, 1.); }`,
  divergence: `uniform sampler2D uVelocity;
    void main() { float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
      gl_FragColor = vec4(.5 * (R - L + T - B), 0., 0., 1.); }`,
  curl: `uniform sampler2D uVelocity;
    void main() { float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(.5 * (R - L - T + B), 0., 0., 1.); }`,
  vorticity: `uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
    void main() { float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x, T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + .0001; f *= curl * C; f.y *= -1.;
      gl_FragColor = vec4(texture2D(uVelocity, vUv).xy + f * dt, 0., 1.); }`,
  pressure: `uniform sampler2D uPressure, uDivergence;
    void main() { float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
      gl_FragColor = vec4((L + R + B + T - texture2D(uDivergence, vUv).x) * .25, 0., 0., 1.); }`,
  gradient: `uniform sampler2D uPressure, uVelocity;
    void main() { float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
      gl_FragColor = vec4(texture2D(uVelocity, vUv).xy - vec2(R - L, T - B), 0., 1.); }`,
  fade: `uniform sampler2D uTexture; uniform float value;
    void main() { gl_FragColor = value * texture2D(uTexture, vUv); }`,
  // tampilan: tinta emas, warna premultiplied supaya menyatu di canvas transparan
  display: `uniform sampler2D uDye;
    void main() { vec3 c = texture2D(uDye, vUv).rgb; float a = clamp(max(c.r, max(c.g, c.b)), 0., 1.);
      gl_FragColor = vec4(min(c, vec3(a)), a); }`,
};

type Target = THREE.WebGLRenderTarget;
type Double = { read: Target; write: Target; swap: () => void };

function target(w: number, h: number): Target {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  });
}
function double(w: number, h: number): Double {
  const d = { read: target(w, h), write: target(w, h), swap: () => { const t = d.read; d.read = d.write; d.write = t; } };
  return d;
}
function res(base: number, aspect: number) {
  return aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)];
}

export class Fluid {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private mats: Record<keyof typeof FRAG, THREE.ShaderMaterial>;
  private velocity!: Double; private dye!: Double; private pressure!: Double;
  private divergence!: Target; private curlRT!: Target;
  private simTexel = new THREE.Vector2(); private dyeTexel = new THREE.Vector2();
  private aspect = 1;

  constructor(private renderer: THREE.WebGLRenderer, private simRes = 128, private dyeRes = 512) {
    this.mats = Object.fromEntries(
      Object.entries(FRAG).map(([k, f]) => [k, new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: head + f, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
        uniforms: {
          texel: { value: new THREE.Vector2() }, velTexel: { value: new THREE.Vector2() },
          uTarget: { value: null }, uVelocity: { value: null }, uSource: { value: null }, uCurl: { value: null },
          uPressure: { value: null }, uDivergence: { value: null }, uTexture: { value: null }, uDye: { value: null },
          aspect: { value: 1 }, radius: { value: 0.002 }, color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() },
          dt: { value: 0.016 }, dissipation: { value: 1 }, curl: { value: 22 }, value: { value: 0.8 },
        },
      })]),
    ) as Record<keyof typeof FRAG, THREE.ShaderMaterial>;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mats.display);
    this.scene.add(this.quad);
  }

  resize(width: number, height: number) {
    this.disposeTargets();
    this.aspect = width / height;
    const [sw, sh] = res(this.simRes, this.aspect), [dw, dh] = res(this.dyeRes, this.aspect);
    this.velocity = double(sw, sh); this.pressure = double(sw, sh); this.dye = double(dw, dh);
    this.divergence = target(sw, sh); this.curlRT = target(sw, sh);
    this.simTexel.set(1 / sw, 1 / sh); this.dyeTexel.set(1 / dw, 1 / dh);
  }

  private pass(name: keyof typeof FRAG, out: Target | null, u: Record<string, unknown>, texel = this.simTexel) {
    const m = this.mats[name];
    m.uniforms.texel.value.copy(texel);
    for (const k in u) {
      const v = u[k];
      if (v instanceof THREE.Vector2 || v instanceof THREE.Vector3) m.uniforms[k].value.copy(v);
      else m.uniforms[k].value = v;
    }
    this.quad.material = m;
    this.renderer.setRenderTarget(out);
    this.renderer.render(this.scene, this.camera);
  }

  // x, y dalam 0..1 (y ke atas); dx, dy = kecepatan dorongan; color = warna tinta
  splat(x: number, y: number, dx: number, dy: number, color: THREE.Vector3, radius = 0.0025) {
    const point = new THREE.Vector2(x, y);
    this.pass("splat", this.velocity.write, { uTarget: this.velocity.read.texture, aspect: this.aspect, point, radius, color: new THREE.Vector3(dx, dy, 0) });
    this.velocity.swap();
    this.pass("splat", this.dye.write, { uTarget: this.dye.read.texture, aspect: this.aspect, point, radius, color }, this.dyeTexel);
    this.dye.swap();
  }

  step(dt: number) {
    this.pass("curl", this.curlRT, { uVelocity: this.velocity.read.texture });
    this.pass("vorticity", this.velocity.write, { uVelocity: this.velocity.read.texture, uCurl: this.curlRT.texture, dt });
    this.velocity.swap();
    this.pass("divergence", this.divergence, { uVelocity: this.velocity.read.texture });
    this.pass("fade", this.pressure.write, { uTexture: this.pressure.read.texture, value: 0.8 });
    this.pressure.swap();
    for (let i = 0; i < 20; i++) {
      this.pass("pressure", this.pressure.write, { uPressure: this.pressure.read.texture, uDivergence: this.divergence.texture });
      this.pressure.swap();
    }
    this.pass("gradient", this.velocity.write, { uPressure: this.pressure.read.texture, uVelocity: this.velocity.read.texture });
    this.velocity.swap();
    this.pass("advection", this.velocity.write, { uVelocity: this.velocity.read.texture, uSource: this.velocity.read.texture, velTexel: this.simTexel, dt, dissipation: 0.985 });
    this.velocity.swap();
    this.pass("advection", this.dye.write, { uVelocity: this.velocity.read.texture, uSource: this.dye.read.texture, velTexel: this.simTexel, dt, dissipation: 0.988 }, this.dyeTexel);
    this.dye.swap();
  }

  render() {
    this.pass("display", null, { uDye: this.dye.read.texture }, this.dyeTexel);
  }

  private disposeTargets() {
    if (!this.velocity) return;
    for (const d of [this.velocity, this.pressure, this.dye]) { d.read.dispose(); d.write.dispose(); }
    this.divergence.dispose(); this.curlRT.dispose();
  }

  dispose() {
    this.disposeTargets();
    Object.values(this.mats).forEach((m) => m.dispose());
    this.quad.geometry.dispose();
  }
}
