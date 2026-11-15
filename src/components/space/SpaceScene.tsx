'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { PLANETS } from '@/lib/sceneConfig';
import { planetPose, dimBehindCopy } from '@/lib/planetPath';
import { boxAt, freeSpot, overlaps, visibleTextBoxes } from '@/lib/robotLane';
import { patrol } from '@/lib/robotFlight';
import { createPlanet, SUN_DIR, type PlanetHandle } from '@/components/space/Planet';
import { createSkyObject } from '@/components/space/SkyObjects';
import { Starfield } from '@/components/space/Starfield';
import { ShootingStars } from '@/components/space/ShootingStars';
import { RobotShip, MOP_HEAD, WIPE, type Action } from '@/components/space/RobotShip';

const N = PLANETS.length;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const theme = (): 'light' | 'dark' => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const watchTheme = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => o.disconnect();
};
const vw = () => document.documentElement.clientWidth; // innerWidth can exceed the layout width on mobile (zoom, scrollbar)
const vh = () => window.innerHeight;
// Robot layout height: the smallest innerHeight since the last real resize, so the mobile URL bar showing/hiding never moves the targets.
let stableH = 0;
let stableW = 0;
const syncH = () => {
  const w = vw();
  const h = window.innerHeight;
  if (!stableH || w !== stableW || Math.abs(h - stableH) >= 150) stableH = h; // real resize or rotation
  else stableH = Math.min(stableH, h);
  stableW = w;
};
const rh = () => stableH || window.innerHeight;
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
type Pt = { x: number; y: number };
type Rep = { grip: Pt; tip: Pt; torch: number; stage: 'hold' | 'thrown' | 'weld' | 'seal'; rel?: Pt; dir?: number };

/** Repair overlay: the held rock, the thrown rock, the torch-tip arc + sparks, and the seam weld bead. Page px. */
function RepairOverlay({ r }: { r: Rep }) {
  return (
    <>
      {r.stage === 'hold' && <span className="rock-held" style={{ left: r.grip.x, top: r.grip.y }} aria-hidden="true" />}
      {r.stage === 'thrown' && r.rel && <span className="rock-thrown" style={{ left: r.rel.x, top: r.rel.y, '--dx': `${(r.dir ?? 1) * 280}px`, '--dy': '-340px' } as React.CSSProperties} aria-hidden="true" />}
      {r.torch > 0.05 && (
        <span className="weld-tip" style={{ left: r.tip.x, top: r.tip.y, opacity: r.torch }} aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
      )}
    </>
  );
}
const botSize = () => (vw() < 768 ? { w: 96, h: 132 } : { w: 150, h: 206 });

/** Fixed sky behind the page: one WebGL canvas (planets, sun/moon), a star layer, and the robot in a free lane. */
export function SpaceScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const botEl = useRef<HTMLDivElement>(null);
  const pLive = useRef(0); // scroll progress 0..1, written by journey:progress
  const [webgl, setWebgl] = useState(true);
  const [pose, setPose] = useState({ tilt: 0, thrust: 0.35, facing: 1 as 1 | -1, arrived: true, action: 'idle' as Action, entering: true });
  const [mark, setMark] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // repair overlay, in page px: the held rock follows the grip point; the torch tip drives the weld sparks and seam progress
  const [rep, setRep] = useState<Rep | null>(null);
  const repRef = useRef<typeof rep>(null);
  const onHandRef = useRef<(g: Pt, t: Pt, o: number) => void>(() => {});
  // stable: RobotShip calls this every frame; it forwards to whatever the scene effect registered (no ref read during render)
  const handHook = useCallback((g: Pt, t: Pt, o: number) => onHandRef.current(g, t, o), []);
  const markEl = useRef<HTMLSpanElement>(null);
  const tapped = useRef(0); // bumped by a tap on the robot
  const th = useSyncExternalStore(watchTheme, theme, () => 'light' as const);

  useEffect(() => {
    const onProgress = (e: Event) => {
      pLive.current = (e as CustomEvent<{ p: number }>).detail.p;
    };
    window.addEventListener('journey:progress', onProgress);
    return () => window.removeEventListener('journey:progress', onProgress);
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    } catch {
      queueMicrotask(() => setWebgl(false)); // CSS planet fallback below
      return;
    }
    const isReduced = reduced();
    const scene = new THREE.Scene();
    // one sun: a real light/dark edge on every planet (SUN_DIR is shared with the atmosphere shader)
    scene.add(new THREE.AmbientLight(0x9fb4d8, 0.35));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sun.position.copy(SUN_DIR).multiplyScalar(1000);
    scene.add(sun);
    const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
    cam.position.z = 5;

    const planets: PlanetHandle[] = PLANETS.map((p) => createPlanet({ kind: p.kind, radius: 1, position: [0, 0, 0] }));
    planets.forEach((h) => scene.add(h.object));
    const sky = createSkyObject({ theme: theme(), radius: 1, position: [0, 0, 0] });
    scene.add(sky.object);

    const layout = () => {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(vw(), vh(), false);
      cam.right = vw();
      cam.bottom = -vh(); // y grows downward in CSS
      cam.updateProjectionMatrix();
    };
    layout();
    syncH();

    // smoothed state: focus f follows scroll, scroll speed drives spin, robot position follows the free lane
    const f0 = pLive.current * (N - 1);
    const st = { f: f0, speed: 0, lastF: f0, bx: 0, by: 0, bs: 1, bt: 0, anchor: { x: 0, y: 0, l: 0 }, fly: 0, pby: 0, facing: 1 as 1 | -1, left: false, leftSpot: null as null | { x: number; y: number }, tap: 0, job: null as null | { kind: 'wipe' | 'fix'; phase: 'go' | 'grab' | 'pull' | 'throw' | 'weld' | 'work' | 'seal'; x: number; y: number; w: number; h: number; lh: number; bottom?: number; prog: number; t0: number; pts: { x: number; y: number }[]; ms: number; rel?: { x: number; y: number }; dir?: number }, init: false, enter: 'wait' as 'wait' | 'fly' | 'done', enterAt: 0, tgt: null as null | { x: number; y: number; sc: number; free: boolean }, tgtAt: 0, op: 1, anchored: false, copyRight: 0, texts: [] as ReturnType<typeof visibleTextBoxes>, textsAt: 0, mob: null as null | { x: number; y: number }, mobAt: 0 };
    const place = (dt: number) => {
      const fr = { w: vw(), h: vh() };
      const target = pLive.current * (N - 1);
      st.f = isReduced ? target : damp(st.f, target, 7, dt); // a little lag makes the swipe feel weighty
      st.speed = damp(st.speed, Math.abs(st.f - st.lastF) / Math.max(dt, 0.001), 5, dt);
      st.lastF = st.f;

      planets.forEach((planet, i) => {
        const pz = planetPose(i, st.f, fr);
        planet.object.visible = pz.opacity > 0.01;
        if (!planet.object.visible) return;
        planet.object.position.set(pz.x, -pz.y, pz.depth);
        planet.object.scale.setScalar(Math.max(1, pz.scale));
        const dim = dimBehindCopy(pz, st.copyRight);
        planet.object.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (!m) return;
          const u = (m as THREE.ShaderMaterial).uniforms;
          if (u?.uStrength) {
            o.userData.base ??= u.uStrength.value;
            u.uStrength.value = o.userData.base * pz.opacity * dim;
          } else if (!u) {
            m.transparent = true;
            m.opacity = pz.opacity * dim * 0.95;
          }
        });
      });
      sky.object.position.set(fr.w * (fr.w < 768 ? 0.82 : 0.6), -fr.h * 0.13, 0); // fixed in the sky: it never changes side with the scroll
      sky.object.scale.setScalar(Math.min(fr.w, fr.h) * 0.07);
    };

    // robot: wants a spot beside the nearest planet toward screen centre, then slides to the nearest free lane
    const moveBot = (dt: number) => {
      const el = botEl.current;
      if (!el) return;
      const { w: bw, h: bh } = botSize();
      const fr = { w: vw(), h: rh() };
      const now = performance.now();
      if (now - st.textsAt > 120) {
        st.texts = visibleTextBoxes(document.querySelector('main') ?? document.body, fr.w, fr.h);
        st.copyRight = st.texts.reduce((m, b) => (b.r < fr.w * 0.72 ? Math.max(m, b.r) : m), 0);
        // the words nearest the middle of the screen: the robot flies right beside them
        const mid = fr.h * 0.5;
        const line = st.texts.filter((b) => b.b - b.t > 10).sort((a, c) => Math.abs((a.t + a.b) / 2 - mid) - Math.abs((c.t + c.b) / 2 - mid))[0];
        const next = line ? { x: Math.max(line.r, st.copyRight), y: (line.t + line.b) / 2, l: line.l } : { x: fr.w * 0.5, y: mid, l: fr.w * 0.5 };
        // hysteresis: keep the current anchor unless the new line is clearly elsewhere
        if (!st.anchored || Math.hypot(next.x - st.anchor.x, next.y - st.anchor.y) > 80) { st.anchor = next; st.anchored = true; }
        st.textsAt = now;
        // left mode (after a tap): the free spot nearest the left edge, found by scanning inward at the robot's height
        st.leftSpot = null;
        if (st.left) {
          const y0 = Math.min(fr.h * 0.85, Math.max(fr.h * 0.15, st.anchor.y));
          scan: for (const dy of [0, -60, 60, -120, 120, -200, 200]) {
            for (let x = bw * 0.6; x < fr.w * 0.6; x += 24) {
              const y = Math.min(fr.h - bh / 2 - 4, Math.max(bh / 2 + 70, y0 + dy));
              if (!overlaps(boxAt(x, y, bw, bh), st.texts)) { st.leftSpot = { x, y }; break scan; }
            }
          }
        }
      }
      // beside the wording: just right of the text column; on narrow screens, the right edge
      if (tapped.current !== st.tap) { st.tap = tapped.current; st.left = !st.left; } // a tap on the robot swaps sides
      const side = st.left ? Math.max(bw * 0.6, fr.w < 768 ? 0 : st.anchor.l - bw * 0.75) : fr.w < 768 ? fr.w - bw * 0.6 : Math.min(fr.w - bw * 0.7, st.anchor.x + bw * 0.75);
      const tNow = performance.now() / 1000;
      const lp = isReduced ? { x: side, y: st.anchor.y } : patrol(tNow, { x: side, y: st.anchor.y }, Math.min(fr.w * 0.03, 40), Math.min(fr.h * 0.06, 50), 0);
      let wantX = st.left && st.leftSpot ? st.leftSpot.x + (lp.x - side) : lp.x;
      let wantY = st.left && st.leftSpot ? st.leftSpot.y + (lp.y - st.anchor.y) : Math.min(fr.h * 0.85, Math.max(fr.h * 0.15, lp.y));

      // mobile free roam: pick a random free spot every 5–8 s and drift slowly toward it
      if (fr.w < 768 && !st.job) {
        const roamEvery = 5000 + (Math.sin(st.mobAt) * 0.5 + 0.5) * 3000; // 5–8 s, varies per spot
        if (!st.mob || now - st.mobAt > roamEvery) {
          const rx = bw * 0.6 + Math.random() * (fr.w - bw * 1.2);
          const ry = fr.h * 0.15 + Math.random() * (fr.h * 0.70);
          const candidate = freeSpot({ x: rx, y: ry }, bw, bh, st.texts, fr.w, fr.h);
          if (candidate.free) { st.mob = candidate; st.mobAt = now; }
        }
        if (st.mob) { wantX = st.mob.x; wantY = st.mob.y; }
      } else if (fr.w >= 768) {
        st.mob = null; // clear roam target when switching to desktop
      }
      let scale = 1;
      let spot: { x: number; y: number; free: boolean };
      const job = st.job;
      if (job) {
        // wiping a selection or repairing a crack: fly straight to the job, ignore the free-lane rules
        const doc = job.kind === 'wipe';
        const sx = doc ? job.x - scrollX : job.x;
        const sy = doc ? job.y - scrollY : job.y;
        if (doc && (sy + job.h < 0 || sy > window.innerHeight)) { st.job = null; setMark(null); return; } // scrolled out of view: end cleanly
        const fixSide = job.x < fr.w * 0.6 ? 1 : -1;
        // wipe: park the robot so the mop head (MOP_HEAD, robot-box fractions) sits on the text line; fix: hover beside the crack
        // window cleaner: the robot hangs BELOW the line with its back to the viewer; its raised hand reaches up to the text.
        // Centre y puts the head top just under the line's bottom edge (WIPE.headTop of the box above the centre).
        const lineBottom = doc && job.bottom !== undefined ? job.bottom - scrollY : sy + job.lh;
        const below = { x: 0, y: lineBottom + WIPE.headTop * bh };
        // fallback order: below the line; if the body there overlaps text or controls, slide along the line to a clear spot;
        // if nothing below is clear, stand beside the line at its mid-height. Never off-screen.
        const clampX = (x: number) => Math.max(bw / 2, Math.min(fr.w - bw / 2, x));
        const clearAt = (x: number, y: number) => !overlaps(boxAt(x, y, bw * 0.8, bh * 0.8), st.texts);
        const belowY = Math.min(fr.h - bh / 2, below.y);
        let wipeHome = { x: clampX(sx - MOP_HEAD.dx * bw), y: belowY };
        // the whole sweep must be clear, not just the start: check the row of spots the robot will visit
        const rowClear = () => { for (let step = 0; step <= job.w; step += 24) if (!clearAt(clampX(sx + step - MOP_HEAD.dx * bw), belowY)) return false; return true; };
        if (doc && !rowClear()) {
          // the row below is blocked (for example by buttons at the left): slide along it to the first clear x, scanning from the right
          let fx = -1;
          for (let x = sx + job.w - MOP_HEAD.dx * bw; x >= sx - MOP_HEAD.dx * bw && fx < 0; x -= 12) if (clearAt(clampX(x), belowY)) fx = clampX(x);
          if (fx >= 0) wipeHome = { x: fx, y: belowY };
        }
        const home = doc
          ? wipeHome
          : job.phase === 'weld'
            ? { x: job.x, y: job.y }
            : { x: job.x + fixSide * bw * 0.55, y: job.y };
        spot = { x: home.x, y: home.y, free: true };
        if (job.phase === 'go') {
          if (Math.hypot(st.bx - home.x, st.by - home.y) < 16 || now - job.t0 > 3500) {
            job.phase = doc ? 'work' : 'grab'; job.t0 = now;
            if (doc) window.getSelection()?.removeAllRanges(); // the red patch stands in for the selection
          }
        } else if (doc) {
          // one smooth pass across the selection: ease-in-out, with a short hold at each end. No shaking.
          const DUR = Math.min(3500, Math.max(1400, job.w * 8));
          const t = Math.min(1, (now - job.t0) / DUR);
          job.prog = t < 0.1 ? 0 : t > 0.9 ? 1 : (t - 0.1) / 0.8;
          const ease = job.prog < 0.5 ? 2 * job.prog * job.prog : 1 - Math.pow(-2 * job.prog + 2, 2) / 2;
          const blade = sx + job.w * ease;
          // the robot hangs under the line: x follows the blade, y stays put below the text
          spot = { x: blade - MOP_HEAD.dx * bw, y: home.y, free: true };
          // the mark clears from the blade's leading edge (left to right), so the text reads as wiped where the squeegee has been
          if (markEl.current) markEl.current.style.clipPath = `inset(0 ${((1 - ease) * 100).toFixed(1)}% 0 0)`;
          if (t >= 1) { st.job = null; setMark(null); }
        } else {
          // repair: grab (0.5s) -> pull (1.4s) -> throw (0.8s) -> weld (2.5s) -> seal (0.4s) -> fixed
          const el = now - job.t0;
          if (job.phase === 'grab' && el > 500) { job.phase = 'pull'; job.t0 = now; window.dispatchEvent(new Event('meteor:pull')); }
          else if (job.phase === 'pull' && el > 1400) { job.phase = 'throw'; job.t0 = now; window.dispatchEvent(new Event('meteor:throw')); }
          else if (job.phase === 'throw' && el > 800) { job.phase = 'weld'; job.t0 = now; window.dispatchEvent(new Event('meteor:weld')); }
          else if (job.phase === 'weld' && el > 2500) { job.phase = 'seal'; job.t0 = now; window.dispatchEvent(new Event('meteor:seal')); }
          else if (job.phase === 'seal' && el > 400) { st.job = null; repRef.current = null; setRep(null); window.dispatchEvent(new Event('meteor:fixed')); }
        }
        if (!doc) st.facing = fixSide === 1 ? -1 : 1; // face the crack
      } else {
        let sc = 1;
        let c = freeSpot({ x: wantX, y: wantY }, bw, bh, st.texts, fr.w, fr.h);
        if (!c.free) { sc = 0.6; c = freeSpot({ x: wantX, y: wantY }, bw * sc, bh * sc, st.texts, fr.w, fr.h); }
        if (!c.free) { sc = 0.42; c = freeSpot({ x: wantX, y: wantY }, bw * sc, bh * sc, st.texts, fr.w, fr.h); }
        // hysteresis: a displaced pick replaces the held target only when the held one is blocked, or the new one is far and 400ms have passed
        const t = st.tgt;
        const held = !!t && !overlaps(boxAt(t.x, t.y, bw * t.sc, bh * t.sc), st.texts);
        const direct = c.free && sc === 1 && Math.hypot(c.x - wantX, c.y - wantY) < 1; // not displaced: follow the patrol smoothly
        if (!t || direct || !held || (now - st.tgtAt > 400 && Math.hypot(c.x - t.x, c.y - t.y) > 80)) { st.tgt = { x: c.x, y: c.y, sc, free: c.free }; st.tgtAt = now; }
        spot = st.tgt!;
        scale = st.tgt!.sc;
      }
      if (st.job) st.tgt = null; // pick afresh after the job
      // page robot entrance: waits hidden off-screen until loader:done, then the damping below carries it in from the bottom-right
      if (st.enter === 'wait' && !isReduced) { st.bx = fr.w + bw; st.by = fr.h + bh; }
      if (!st.init) { st.bx = st.enter === 'wait' && !isReduced ? fr.w + bw : spot.x; st.by = st.enter === 'wait' && !isReduced ? fr.h + bh : spot.y; st.init = true; }
      if (st.enter === 'fly' && Math.hypot(st.bx - spot.x, st.by - spot.y) < 4) st.enter = 'done';
      if (st.enter === 'done' && held && !st.job) { startFix(held); held = null; } // repair the meteor that landed during the entrance
      st.bs = damp(st.bs, scale, 6, dt);
      const px = st.bx;
      const working = st.job?.kind === 'wipe' && st.job.phase === 'work';
      const dampRate = working ? 14 : fr.w < 768 && !st.job ? 0.9 : 3.2; // mobile free-roam: drift slowly; the mop must track the sweep
      // clamp each step so a big target change glides instead of jumping
      const maxStep = isReduced ? Infinity : Math.min(600, fr.w) * dt;
      const stepTo = (cur: number, to: number) => { const d = damp(cur, to, isReduced ? 60 : dampRate, dt) - cur; return cur + Math.max(-maxStep, Math.min(maxStep, d)); };
      st.bx = stepTo(st.bx, spot.x);
      st.by = stepTo(st.by, spot.y);
      if (!st.job && Math.abs(st.bx - px) > 0.2) st.facing = st.bx > px ? 1 : -1;
      el.style.transform = `translate3d(${(st.bx - bw / 2).toFixed(1)}px, ${(st.by - bh / 2).toFixed(1)}px, 0) scale(${st.bs.toFixed(3)})`;
      st.op = damp(st.op, st.enter === 'wait' ? 0 : spot.free ? 1 : 0.35, 6, dt); // hidden until loader:done, then fades in as it flies
      el.style.opacity = st.enter === 'wait' && !isReduced ? '0' : st.op.toFixed(3); // hard hide until loader:done; dims only as a last resort: no free spot anywhere
      const vx = (st.bx - px) / Math.max(dt, 0.001);
      st.bt = damp(st.bt, Math.max(-0.5, Math.min(0.5, (vx / fr.w) * 3)), 8, dt);
      st.fly = damp(st.fly, Math.min(1, Math.hypot(vx, (st.by - st.pby) / Math.max(dt, 0.001)) / (fr.w * 0.25)), 4, dt);
      st.pby = st.by;
    };

    let raf = 0;
    let last = performance.now();
    let poseAt = 0;
    const frame = (now: number) => {
      if (document.hidden) { last = now; raf = requestAnimationFrame(frame); return; } // pause work in a hidden tab
      const raw = Math.max(0, (now - last) / 1000); // rAF's first timestamp can precede performance.now(): a negative dt makes damp() diverge
      const dt = Math.min(0.05, raw); // spin and animation stay stable on a hitch
      const dtMove = Math.min(0.25, raw); // positions use real time so a slow device still catches up
      last = now;
      place(dtMove);
      moveBot(dtMove);
      const spin = isReduced ? 0 : 1 + Math.min(5, st.speed * 4); // st.speed is damped, so spin eases back when scrolling stops
      planets.forEach((h) => h.update(dt * spin));
      sky.update(dt);
      renderer.render(scene, cam);
      if (now - poseAt > 80) { // robot props change slowly: throttle React updates
        poseAt = now;
        const arrived = Math.abs(st.f - Math.round(st.f)) < 0.06 && st.fly < 0.25 && !st.job;
        const thrust = 0.4 + Math.min(0.6, st.fly * 1.2 + st.speed * 1.5);
        const entering = st.enter !== 'done';
        const action: Action = !st.job ? 'idle' : st.job.kind === 'wipe' ? (st.job.phase === 'work' ? 'wipe' : 'idle') : st.job.phase === 'grab' || st.job.phase === 'pull' || st.job.phase === 'throw' || st.job.phase === 'weld' ? st.job.phase : 'idle';
        setPose((o) => (Math.abs(o.tilt - st.bt) < 0.02 && o.arrived === arrived && o.action === action && o.entering === entering && o.facing === st.facing && Math.abs(o.thrust - thrust) < 0.04 ? o : { tilt: st.bt, thrust, facing: st.facing, arrived, action, entering }));
        if (repRef.current) setRep(repRef.current);

      }
      if (!isReduced) raf = requestAnimationFrame(frame);
    };
    if (isReduced) frame(performance.now()); // one static frame
    else raf = requestAnimationFrame(frame);

    // never snap the robot: it glides (speed-clamped) to whatever the new layout wants; URL-bar height changes are absorbed by syncH
    const onResize = () => { layout(); syncH(); if (isReduced) frame(performance.now()); };
    window.addEventListener('resize', onResize);

    // meteor crack: the robot flies over and repairs it (Meteor.tsx removes the crack on `meteor:fixed`)
    // the robot's hand/torch positions in page px, read every frame by RobotShip and thrown into React state at the throttled pose rate
    const onHand = (grip: Pt, tipPt: Pt, torchOn: number) => {
      const job = st.job;
      if (!job || job.kind !== 'fix') return;
      const box = botEl.current?.getBoundingClientRect();
      if (!box) return;
      const g = { x: box.left + grip.x * (box.width / (botSize().w)), y: box.top + grip.y * (box.width / (botSize().w)) };
      const tp = { x: box.left + tipPt.x * (box.width / (botSize().w)), y: box.top + tipPt.y * (box.width / (botSize().w)) };
      // the rock leaves the hand at the throw: remember the release point and fly it away from the robot (side of the screen opposite the robot)
      if (job.phase === 'throw' && !job.rel) { job.rel = g; job.dir = job.x < window.innerWidth / 2 ? 1 : -1; }
      const stage: Rep['stage'] = job.phase === 'grab' || job.phase === 'pull' ? 'hold' : job.phase === 'throw' ? 'thrown' : job.phase === 'weld' ? 'weld' : 'seal';
      repRef.current = { grip: g, tip: tp, torch: torchOn, stage, rel: job.rel, dir: job.dir };
    };
    onHandRef.current = onHand;
    // loader:done starts the entrance; the robot stays hidden until then, and a safety timer reveals it if the event never comes
    // reduced motion has no fly-in (the scene draws one static frame), so the robot is shown at its spot with a plain fade
    if (isReduced) st.enter = 'done';
    const startEntrance = () => { if (st.enter === 'wait') { st.enter = 'fly'; st.enterAt = performance.now(); } };
    // hard guarantee: whatever happens to loader:done, the robot is revealed by 4.5s (reduced motion gets a plain fade)
    const safety = window.setTimeout(() => { startEntrance(); if (st.enter !== 'done') st.enter = 'done'; }, 4500);
    window.addEventListener('loader:done', startEntrance);
    // a meteor that lands during the robot's entrance is held, then repaired as soon as it finishes (never dropped: a dropped hit left the crack with no robot)
    let held: { x: number; y: number; pts: { x: number; y: number }[] } | null = null;
    const startFix = (d: { x: number; y: number; pts: { x: number; y: number }[] }) => {
      setMark(null);
      st.job = { kind: 'fix', phase: 'go', x: d.x, y: d.y, w: 0, h: 0, lh: 0, prog: 0, t0: performance.now(), pts: d.pts, ms: 0 };
    };
    const onHit = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number; pts: { x: number; y: number }[] }>).detail;
      if (st.enter !== 'done') { held = d; return; }
      startFix(d);
    };
    window.addEventListener('meteor:hit', onHit);

    // text held selected for 1s: the robot flies over it and scrubs it away
    // shortcut: a multi-line selection is wiped as one box along its top edge; fine for short picks
    let selTimer = 0;
    const onSel = () => {
      clearTimeout(selTimer);
      if (st.enter !== 'done') return; // no wipe jobs during the entrance
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (st.job?.kind === 'wipe' && st.job.phase === 'go' && !text) { st.job = null; setMark(null); return; } // pick cleared before the robot arrived
      if (isReduced || !text || st.job) return;
      selTimer = window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.toString().trim() !== text || st.job) return;
        const range = sel.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const host = node instanceof Element ? node : node.parentElement;
        if (host?.closest('input,textarea,form,[contenteditable],dialog') || document.activeElement?.matches('input,textarea')) return; // leave the message form and fields alone
        const r = range.getBoundingClientRect();
        if (r.width < 4 || r.bottom < 0 || r.top > window.innerHeight) return;
        const rects = [...range.getClientRects()].filter(q => q.width > 2 && q.height > 2);
        const lh = rects[0]?.height ?? r.height; // one text line's height
        const bottom = rects.reduce((mx, q) => Math.max(mx, q.bottom), r.top); // the selection's lowest edge: the robot hangs below it
        const m = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
        setMark(m);
        if (markEl.current) markEl.current.style.clipPath = '';
        st.job = { kind: 'wipe', phase: 'go', ...m, lh, bottom: bottom + scrollY, prog: 0, t0: performance.now(), pts: [], ms: 0 };
      }, 1000);
    };
    document.addEventListener('selectionchange', onSel);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('meteor:hit', onHit);
      window.removeEventListener('loader:done', startEntrance);
      clearTimeout(safety);
      document.removeEventListener('selectionchange', onSel);
      clearTimeout(selTimer);
      planets.forEach((h) => h.dispose());
      sky.dispose();
      // no forceContextLoss: React reuses this canvas on re-run, and a force-lost canvas never gets a context back
      renderer.dispose();
    };
  }, [th]);

  return (
    <>
      <canvas ref={canvas} className="space" aria-hidden="true" />
      {!webgl && <div className="space-fallback" aria-hidden="true" />}
      <Starfield theme={th} count={900} />
      <ShootingStars theme={th} />
      {mark && <span className="bot-mark" ref={markEl} aria-hidden="true" style={{ left: mark.x, top: mark.y, width: mark.w, height: mark.h }} />}
      <div className="space-bot" ref={botEl} aria-hidden="true" onClick={() => { tapped.current++; }}>
        <RobotShip tilt={pose.tilt} thrust={pose.thrust} facing={pose.facing} arrived={pose.arrived} action={pose.action} entering={pose.entering} onHand={handHook} />
      </div>
      {rep && <RepairOverlay r={rep} />}
    </>
  );
}
