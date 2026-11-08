'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { PLANETS } from '@/lib/sceneConfig';
import { planetPose, dimBehindCopy } from '@/lib/planetPath';
import { boxAt, freeSpot, overlaps, visibleTextBoxes } from '@/lib/robotLane';
import { patrol } from '@/lib/robotFlight';
import { createPlanet, SUN_DIR, type PlanetHandle } from '@/components/space/Planet';
import { createSkyObject } from '@/components/space/SkyObjects';
import { Starfield } from '@/components/space/Starfield';
import { ShootingStars } from '@/components/space/ShootingStars';
import { RobotShip } from '@/components/space/RobotShip';

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
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const botSize = () => (vw() < 768 ? { w: 96, h: 132 } : { w: 150, h: 206 });

/** Fixed sky behind the page: one WebGL canvas (planets, sun/moon), a star layer, and the robot in a free lane. */
export function SpaceScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const botEl = useRef<HTMLDivElement>(null);
  const pLive = useRef(0); // scroll progress 0..1, written by journey:progress
  const [webgl, setWebgl] = useState(true);
  const [pose, setPose] = useState({ tilt: 0, thrust: 0.35, facing: 1 as 1 | -1, arrived: true, scrub: false });
  const [mark, setMark] = useState<{ x: number; y: number; w: number; h: number } | null>(null); // red patch over the selection being wiped (document coords)
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

    // smoothed state: focus f follows scroll, scroll speed drives spin, robot position follows the free lane
    const f0 = pLive.current * (N - 1);
    const st = { f: f0, speed: 0, lastF: f0, bx: 0, by: 0, bs: 1, bt: 0, anchor: { x: 0, y: 0, l: 0 }, fly: 0, pby: 0, facing: 1 as 1 | -1, left: false, leftSpot: null as null | { x: number; y: number }, tap: 0, job: null as null | { kind: 'wipe' | 'fix'; phase: 'go' | 'work' | 'pull' | 'throw' | 'weld'; x: number; y: number; w: number; h: number; prog: number; t0: number }, init: false, copyRight: 0, texts: [] as ReturnType<typeof visibleTextBoxes>, textsAt: 0 };
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
      const fr = { w: vw(), h: vh() };
      const now = performance.now();
      if (now - st.textsAt > 120) {
        st.texts = visibleTextBoxes(document.querySelector('main') ?? document.body, fr.w, fr.h);
        st.copyRight = st.texts.reduce((m, b) => (b.r < fr.w * 0.72 ? Math.max(m, b.r) : m), 0);
        // the words nearest the middle of the screen: the robot flies right beside them
        const mid = fr.h * 0.5;
        const line = st.texts.filter((b) => b.b - b.t > 10).sort((a, c) => Math.abs((a.t + a.b) / 2 - mid) - Math.abs((c.t + c.b) / 2 - mid))[0];
        st.anchor = line ? { x: Math.max(line.r, st.copyRight), y: (line.t + line.b) / 2, l: line.l } : { x: fr.w * 0.5, y: mid, l: fr.w * 0.5 };
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
      const wantX = st.left && st.leftSpot ? st.leftSpot.x + (lp.x - side) : lp.x;
      const wantY = st.left && st.leftSpot ? st.leftSpot.y + (lp.y - st.anchor.y) : Math.min(fr.h * 0.85, Math.max(fr.h * 0.15, lp.y));
      let scale = 1;
      let spot: { x: number; y: number; free: boolean };
      const job = st.job;
      if (job) {
        // wiping a selection or repairing a crack: fly straight to the job, ignore the free-lane rules
        const doc = job.kind === 'wipe';
        const sx = doc ? job.x - scrollX : job.x;
        const sy = doc ? job.y - scrollY : job.y;
        const fixSide = job.x < fr.w * 0.6 ? 1 : -1;
        const home = doc ? { x: sx + job.w / 2, y: sy + job.h / 2 } : { x: job.x + fixSide * bw * 0.55, y: job.y }; // wiping stands on the middle of the text, covering it
        spot = { x: home.x, y: home.y, free: true };
        if (job.phase === 'go') {
          if (Math.hypot(st.bx - home.x, st.by - home.y) < 16 || now - job.t0 > 3500) {
            job.phase = doc ? 'work' : 'pull'; job.t0 = now;
            if (doc) window.getSelection()?.removeAllRanges(); // the red patch stands in for the selection
            else window.dispatchEvent(new Event('meteor:pull'));
          }
        } else if (doc) {
          job.prog = Math.min(1, (now - job.t0) / Math.min(3500, Math.max(1200, job.w * 9)));
          // scrub back and forth over the middle, wider as the patch clears
          spot = { x: home.x + Math.sin((now - job.t0) / 90) * Math.min(job.w / 2, 70) * (0.4 + 0.6 * job.prog), y: home.y, free: true };
          // the patch clears from the middle outward
          if (markEl.current) markEl.current.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${50 - job.prog * 50}% 0, ${50 + job.prog * 50}% 0, ${50 + job.prog * 50}% 100%, ${50 - job.prog * 50}% 100%, ${50 - job.prog * 50}% 0)`;
          if (job.prog >= 1) { st.job = null; setMark(null); }
        } else {
          // repair: tug the meteor out, throw it back into space, then weld the hole shut
          const el = now - job.t0;
          if (job.phase === 'pull' && el > 1600) { job.phase = 'throw'; job.t0 = now; window.dispatchEvent(new Event('meteor:throw')); }
          else if (job.phase === 'throw' && el > 700) { job.phase = 'weld'; job.t0 = now; window.dispatchEvent(new Event('meteor:weld')); }
          else if (job.phase === 'weld' && el > 2400) { st.job = null; window.dispatchEvent(new Event('meteor:fixed')); }
        }
        if (!doc) st.facing = fixSide === 1 ? -1 : 1; // face the crack
      } else {
        spot = freeSpot({ x: wantX, y: wantY }, bw, bh, st.texts, fr.w, fr.h);
        if (!spot.free) { scale = 0.6; spot = freeSpot({ x: wantX, y: wantY }, bw * scale, bh * scale, st.texts, fr.w, fr.h); }
        if (!spot.free) { scale = 0.42; spot = freeSpot({ x: wantX, y: wantY }, bw * scale, bh * scale, st.texts, fr.w, fr.h); }
      }
      if (!st.init) { st.bx = spot.x; st.by = spot.y; st.init = true; }
      st.bs = damp(st.bs, scale, 6, dt);
      const px = st.bx;
      st.bx = damp(st.bx, spot.x, isReduced ? 60 : 3.2, dt);
      st.by = damp(st.by, spot.y, isReduced ? 60 : 3.2, dt);
      if (!st.job && Math.abs(st.bx - px) > 0.2) st.facing = st.bx > px ? 1 : -1;
      el.style.transform = `translate3d(${(st.bx - bw / 2).toFixed(1)}px, ${(st.by - bh / 2).toFixed(1)}px, 0) scale(${st.bs.toFixed(3)})`;
      el.style.opacity = spot.free ? '1' : '0.35'; // last resort only: no free spot anywhere
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
        const scrub = !!st.job && st.job.phase !== 'go' && st.job.phase !== 'throw';
        setPose((o) => (Math.abs(o.tilt - st.bt) < 0.02 && o.arrived === arrived && o.scrub === scrub && o.facing === st.facing && Math.abs(o.thrust - thrust) < 0.04 ? o : { tilt: st.bt, thrust, facing: st.facing, arrived, scrub }));
      }
      if (!isReduced) raf = requestAnimationFrame(frame);
    };
    if (isReduced) frame(performance.now()); // one static frame
    else raf = requestAnimationFrame(frame);

    const onResize = () => { layout(); st.init = false; if (isReduced) frame(performance.now()); };
    window.addEventListener('resize', onResize);

    // meteor crack: the robot flies over and repairs it (Meteor.tsx removes the crack on `meteor:fixed`)
    const onHit = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      setMark(null);
      st.job = { kind: 'fix', phase: 'go', x, y, w: 0, h: 0, prog: 0, t0: performance.now() };
    };
    window.addEventListener('meteor:hit', onHit);

    // text held selected for 1s: the robot flies over it and scrubs it away
    // shortcut: a multi-line selection is wiped as one box along its top edge; fine for short picks
    let selTimer = 0;
    const onSel = () => {
      clearTimeout(selTimer);
      const text = window.getSelection()?.toString().trim() ?? '';
      if (isReduced || !text || st.job) return;
      selTimer = window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.toString().trim() !== text || st.job) return;
        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (r.width < 4 || r.bottom < 0 || r.top > vh()) return;
        const m = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
        setMark(m);
        st.job = { kind: 'wipe', phase: 'go', ...m, prog: 0, t0: performance.now() };
      }, 1000);
    };
    document.addEventListener('selectionchange', onSel);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('meteor:hit', onHit);
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
        <RobotShip tilt={pose.tilt} thrust={pose.thrust} facing={pose.facing} arrived={pose.arrived} scrub={pose.scrub} />
      </div>
    </>
  );
}
