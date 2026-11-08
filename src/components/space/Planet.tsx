import * as THREE from 'three';
import type { PLANETS } from '@/lib/sceneConfig';

export type PlanetKind = (typeof PLANETS)[number]['kind'];
export interface PlanetProps {
  kind: PlanetKind;
  radius: number;
  position: [number, number, number];
}
export interface PlanetHandle {
  object: THREE.Group;
  update(dt: number): void;
  dispose(): void;
}

/** Direction towards the sun; SpaceScene's DirectionalLight must use the same vector. */
export const SUN_DIR = new THREE.Vector3(-0.6, 0.45, 0.66).normalize();

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const mix = (a: RGB, b: RGB, t: number): RGB => {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// 3D value noise sampled on the unit-sphere direction: no seam, no pole pinching.
function h3(i: number, j: number, k: number) {
  let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function vnoise3(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
    l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}
function fbm3(x: number, y: number, z: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise3(x, y, z);
    norm += amp;
    amp *= 0.5;
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
  }
  return sum / norm;
}
/** Domain-warped fbm: the warp turns blobs into coastlines and swirls. */
function wfbm(x: number, y: number, z: number, octaves: number, warp: number) {
  const a = (fbm3(x + 5.2, y + 1.3, z + 8.1, 3) - 0.5) * warp;
  const b = (fbm3(x + 9.7, y + 4.1, z + 2.6, 3) - 0.5) * warp;
  const c = (fbm3(x + 3.3, y + 7.7, z + 6.4, 3) - 0.5) * warp;
  return fbm3(x + a, y + b, z + c, octaves);
}
/** One jittered crater per grid cell: negative inside the bowl, positive on the rim. */
function crater(x: number, y: number, z: number, scale: number) {
  const px = x * scale;
  const py = y * scale;
  const pz = z * scale;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const iz = Math.floor(pz);
  if (h3(ix, iy, iz + 91) > 0.45) return 0;
  const cx = ix + 0.3 + 0.4 * h3(ix, iy, iz + 17);
  const cy = iy + 0.3 + 0.4 * h3(ix, iy + 33, iz);
  const cz = iz + 0.3 + 0.4 * h3(ix + 57, iy, iz);
  const r = 0.12 + 0.13 * h3(ix, iy + 5, iz + 5);
  const d = Math.hypot(px - cx, py - cy, pz - cz) / r;
  return d < 1 ? -(1 - d * d) + 0.25 * smooth(0.7, 1, d) : 0.3 * Math.max(0, 1 - (d - 1) * 4);
}

export function canvasFor(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') as CanvasRenderingContext2D };
}

const C = {
  oceanDeep: hex('#04163f'), oceanShallow: hex('#1f6fb5'), sand: hex('#c2b280'), desert: hex('#b58f56'),
  forest: hex('#2f5d2c'), grass: hex('#5a8a3a'), rock: hex('#6e675c'), snow: hex('#f1f5f8'),
  marsDark: hex('#4a1d10'), marsMid: hex('#a4492a'), marsLight: hex('#d98a52'), marsMaria: hex('#2e140c'), marsCap: hex('#f3e9e2'),
  gasCream: hex('#f1dfb4'), gasTan: hex('#b98d55'), gasBrown: hex('#7b5334'),
  iceLight: hex('#f2f8fc'), iceMid: hex('#b9d6e6'), iceCrack: hex('#5f8fb0'), icePatch: hex('#8fb3cc'),
  nepDeep: hex('#081a52'), nepMid: hex('#1d4a9e'), nepLight: hex('#4d86d1'), nepStorm: hex('#050f33'),
};
const BASE: Record<PlanetKind, string> = {
  earth: '#1f4f8f', mars: '#a4492a', ringed: '#c9a46a', ice: '#b9d6e6', nebula: '#1d4a9e',
};
const ATMO: Record<PlanetKind, string> = {
  earth: '#4aa3ff', mars: '#e8a07a', ringed: '#f5d28a', ice: '#bfe6ff', nebula: '#4f8fd9',
};
const BUMP: Record<PlanetKind, number> = { earth: 1.5, mars: 2.5, ringed: 0.2, ice: 1, nebula: 0.15 };
const ROUGH: Record<PlanetKind, number> = { earth: 1, mars: 0.95, ringed: 0.8, ice: 0.3, nebula: 0.7 };

// out: [r, g, b, height 0..1, roughness 0..1]
type Out = [number, number, number, number, number];
type Surface = (x: number, y: number, z: number, o: Out) => void;
const put = (o: Out, c: RGB, h: number, r: number) => {
  o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = h; o[4] = r;
};

const SURFACE: Record<PlanetKind, Surface> = {
  earth: (x, y, z, o) => {
    const c = wfbm(x * 1.6, y * 1.6, z * 1.6, 5, 0.9);
    const a = Math.abs(y);
    if (c < 0.5) {
      const depth = smooth(0.2, 0.5, c);
      const col = mix(C.oceanDeep, C.oceanShallow, depth * depth);
      const icy = a + (fbm3(x * 6, y * 6, z * 6, 3) - 0.5) * 0.18 > 0.88;
      return put(o, icy ? C.snow : col, 0.45, icy ? 0.5 : 0.35);
    }
    const e = (c - 0.5) * 2;
    const m = fbm3(x * 3 + 20, y * 3, z * 3, 4);
    const dryness = clamp01((m < 0.5 ? 0.5 - m : 0) * 4 + (1 - a) * 0.15 - a * 0.4);
    let col = mix(mix(C.forest, C.grass, m), mix(C.sand, C.desert, m), dryness * 1.5);
    col = mix(col, C.sand, 1 - smooth(0, 0.06, e));
    col = mix(col, C.rock, smooth(0.45, 0.75, e));
    const ice = a + (fbm3(x * 7, y * 7, z * 7, 3) - 0.5) * 0.2 + e * 0.25;
    col = mix(col, C.snow, smooth(0.78, 0.86, ice));
    const detail = fbm3(x * 24, y * 24, z * 24, 3);
    put(o, mix(col, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], detail - 0.3), 0.5 + e * 0.5 + detail * 0.08, 0.9);
  },
  mars: (x, y, z, o) => {
    const n = wfbm(x * 2.5, y * 2.5, z * 2.5, 5, 0.7);
    const maria = smooth(0.52, 0.4, fbm3(x * 1.4 + 11, y * 1.4, z * 1.4, 3));
    const cr = crater(x, y, z, 7) + 0.6 * crater(x + 3, y, z, 15);
    let col = mix(mix(C.marsDark, C.marsMid, n * 1.5), C.marsLight, (n - 0.5) * 2);
    col = mix(col, C.marsMaria, maria * 0.6);
    col = mix(col, [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], clamp01(-cr));
    const cap = smooth(0.88, 0.93, Math.abs(y) + (fbm3(x * 6, y * 6, z * 6, 3) - 0.5) * 0.12);
    put(o, mix(col, C.marsCap, cap), 0.5 + 0.35 * (n - 0.5) + cr * 0.25, 0.95);
  },
  ringed: (x, y, z, o) => {
    const t = fbm3(x * 3, y * 14, z * 3, 4) - 0.5;
    const s = Math.sin(y * 22 + t * 6) * 0.5 + 0.5;
    const s2 = Math.sin(y * 9 + 1.7 + t * 3) * 0.5 + 0.5;
    const col = mix(mix(C.gasTan, C.gasCream, s), C.gasBrown, s2 * 0.35 + smooth(0.45, 0.5, Math.abs(t)) * 0.2);
    put(o, col, 0.5 + t * 0.2, 0.8);
  },
  ice: (x, y, z, o) => {
    const n = fbm3(x * 3, y * 3, z * 3, 4);
    const w = wfbm(x * 4 + 30, y * 4, z * 4, 3, 1.2);
    const crack = smooth(0.9, 0.985, 1 - Math.abs(2 * w - 1));
    const patch = smooth(0.55, 0.7, fbm3(x * 1.5 + 50, y * 1.5, z * 1.5, 3));
    let col = mix(C.iceMid, C.iceLight, n);
    col = mix(col, C.icePatch, patch * 0.6);
    put(o, mix(col, C.iceCrack, crack * 0.8), 0.6 - crack * 0.4 + n * 0.1, 0.3);
  },
  nebula: (x, y, z, o) => {
    const t = wfbm(x * 2, y * 7, z * 2, 4, 0.5);
    const band = Math.sin(y * 9 + t * 5) * 0.5 + 0.5;
    let col = mix(mix(C.nepDeep, C.nepMid, band), C.nepLight, smooth(0.62, 0.9, t) * 0.5);
    // storm: a dark oval at about lat -0.3, lon 1.0, ragged edge from noise
    const sx = Math.cos(-0.3) * Math.cos(1.0);
    const sy = Math.sin(-0.3);
    const sz = Math.cos(-0.3) * Math.sin(1.0);
    const d = (1 - (x * sx + y * sy + z * sz)) * 40 + (fbm3(x * 10, y * 10, z * 10, 3) - 0.5) * 0.8;
    col = mix(col, C.nepStorm, 0.55 * (1 - smooth(0.4, 1.0, d)));
    col = mix(col, C.nepLight, 0.3 * smooth(0.9, 1.2, d) * (1 - smooth(1.2, 1.6, d)));
    put(o, col, 0.5 + (t - 0.5) * 0.2, 0.7);
  },
};

// Job queue: one job is serviced per tick and each tick is time-boxed (BUDGET_MS), so the main thread yields.
interface Job { cancelled: boolean; step(): boolean }
const queue: Job[] = [];
let pumping = false;
const BUDGET_MS = 5; // per tick: leaves most of a 16 ms frame free for scrolling
function pump() {
  if (pumping) return;
  pumping = true;
  const tick = () => {
    const job = queue[0];
    if (!job) { pumping = false; return; }
    if (job.cancelled || job.step()) queue.shift();
    setTimeout(tick, 0);
  };
  setTimeout(tick, 0);
}
function enqueue(job: Job) {
  queue.push(job);
  pump();
}

type Paint = (x: number, y: number, z: number, i: number, data: Uint8ClampedArray[]) => void;
/** Row-chunked sphere painter; paint gets the unit direction and the pixel offset in each layer. */
function rowJob(w: number, h: number, layers: number, paint: Paint, done: (canvases: HTMLCanvasElement[]) => void): Job {
  let row = 0;
  const ctxs: CanvasRenderingContext2D[] = [];
  const imgs: ImageData[] = [];
  return {
    cancelled: false,
    step() {
      if (ctxs.length === 0) {
        for (let k = 0; k < layers; k++) {
          const { ctx } = canvasFor(w, h);
          ctxs.push(ctx);
          imgs.push(ctx.createImageData(w, h));
        }
      }
      const datas = imgs.map((im) => im.data);
      const t0 = performance.now();
      for (; row < h && performance.now() - t0 < BUDGET_MS; row++) {
        const lat = (0.5 - (row + 0.5) / h) * Math.PI;
        const cl = Math.cos(lat);
        const y = Math.sin(lat);
        for (let col = 0; col < w; col++) {
          const lon = ((col + 0.5) / w) * Math.PI * 2;
          paint(cl * Math.cos(lon), y, cl * Math.sin(lon), (row * w + col) * 4, datas);
        }
      }
      if (row < h) return false;
      ctxs.forEach((ctx, k) => ctx.putImageData(imgs[k], 0, 0));
      done(ctxs.map((c) => c.canvas));
      return true;
    },
  };
}

// 1D radial strip: u runs inner->outer edge (ring UVs are remapped to match).
function ringTexture() {
  const W = 512;
  const { c, ctx } = canvasFor(W, 4);
  const img = ctx.createImageData(W, 4);
  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);
    const band = 0.5 + 0.3 * Math.sin(t * 70) + 0.2 * Math.sin(t * 23 + 1);
    const gap = t > 0.62 && t < 0.68 ? 0.05 : 1;
    const edge = Math.min(1, t * 12, (1 - t) * 12);
    const a = clamp01(band * gap * edge * (0.55 + 0.45 * vnoise3(t * 40, 0.5, 0.5)));
    const [r, g, b] = mix(hex('#a98a5c'), hex('#efdcb2'), band);
    for (let y = 0; y < 4; y++) img.data.set([r, g, b, a * 230], (y * W + x) * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Frees every geometry, material and texture under root. Call on unmount. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const key of ['map', 'bumpMap', 'alphaMap', 'roughnessMap'] as const) {
        (mat as THREE.MeshStandardMaterial)[key]?.dispose();
      }
      mat.dispose();
    }
  });
}

const tex = (c: HTMLCanvasElement, srgb: boolean) => {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
};

/** Builds a planet group. Returns at once with a flat-coloured body; maps are generated later in queued, row-chunked jobs. */
export function createPlanet({ kind, radius, position }: PlanetProps): PlanetHandle {
  const mat = new THREE.MeshStandardMaterial({
    color: BASE[kind],
    bumpScale: BUMP[kind],
    roughness: ROUGH[kind],
    metalness: 0.02,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), mat);
  const tilt = new THREE.Group(); // axial tilt; body spins inside it
  tilt.rotation.z = 0.3;
  tilt.add(body);

  const jobs: Job[] = [];
  let disposed = false;

  const out: Out = [0, 0, 0, 0, 0];
  const surface = SURFACE[kind];
  const roughLayer = kind === 'earth';
  jobs.push(
    rowJob(1024, 512, roughLayer ? 3 : 2, (x, y, z, i, d) => {
      surface(x, y, z, out);
      d[0].set([out[0], out[1], out[2], 255], i);
      const g = out[3] * 255;
      d[1].set([g, g, g, 255], i);
      if (roughLayer) d[2].set([0, out[4] * 255, 0, 255], i); // three reads roughness from G
    }, (cv) => {
      if (disposed) return;
      mat.color.set('#ffffff');
      mat.map = tex(cv[0], true);
      mat.bumpMap = tex(cv[1], false);
      if (cv[2]) mat.roughnessMap = tex(cv[2], false);
      mat.needsUpdate = true;
    }),
  );

  let clouds: THREE.Mesh | undefined;
  if (kind === 'earth') {
    const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, depthWrite: false, roughness: 1, metalness: 0 });
    clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.015, 64, 48), cm);
    clouds.visible = false;
    tilt.add(clouds);
    jobs.push(
      rowJob(512, 256, 1, (x, y, z, i, d) => {
        const c = wfbm(x * 3 + 70, y * 3.6, z * 3 + 70, 5, 1.1);
        const a = smooth(0.5, 0.75, c) * (1 - 0.3 * smooth(0.85, 1, Math.abs(y)));
        d[0].set([255, 255, 255, a * 235], i);
      }, (cv) => {
        if (disposed || !clouds) return;
        cm.map = tex(cv[0], true);
        cm.needsUpdate = true;
        clouds.visible = true;
      }),
    );
  }

  tilt.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.12, 48, 32),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(ATMO[kind]) }, uStrength: { value: kind === 'mars' ? 0.18 : 0.35 }, uSun: { value: SUN_DIR } },
        vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
          void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
            vW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uStrength; uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vW;
          void main() { float d = max(dot(normalize(vN), normalize(vV)), 0.0);
            float f = pow(1.0 - d, 3.5) * smoothstep(0.0, 0.32, d) * uStrength * 1.8; // fades to 0 at the shell edge: a glow, not a ring
            f *= (0.35 + 0.65 * max(dot(normalize(vW), uSun), 0.0));
            gl_FragColor = vec4(uColor, f); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );

  if (kind === 'ringed') {
    const ringGeo = new THREE.RingGeometry(radius * 1.35, radius * 2.3, 128);
    const p = ringGeo.attributes.position as THREE.BufferAttribute;
    const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - radius * 1.35) / (radius * 0.95), 0.5);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({
        map: ringTexture(),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.9,
        metalness: 0,
      }),
    );
    ring.rotation.x = -1.1;
    tilt.add(ring);
  }

  jobs.forEach(enqueue);

  const object = new THREE.Group();
  object.add(tilt);
  object.position.set(...position);

  return {
    object,
    update(dt) {
      body.rotation.y += dt * 0.05; // slow spin
      if (clouds) clouds.rotation.y += dt * 0.065;
    },
    dispose() {
      disposed = true;
      for (const j of jobs) {
        j.cancelled = true;
        const k = queue.indexOf(j);
        if (k >= 0) queue.splice(k, 1);
      }
      object.removeFromParent();
      disposeTree(object);
    },
  };
}
