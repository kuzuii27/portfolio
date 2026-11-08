'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Robot } from '@/components/Robot';
import { lineFor, type Pose } from '@/lib/robotScript';
import { climbStep, headingInReach, pickPlatform, GRAVITY, type Plat } from '@/lib/robotPet';

// three.js loads after the page; the SVG robot shows meanwhile.
const Robot3D = dynamic(() => import('@/components/Robot3D').then((m) => m.Robot3D), { ssr: false, loading: () => <Robot /> });

// The boxes the robot can stand on.
const PLATFORMS = '.facts, .case, .skill-row, .contacts-cta';
const IDLE: Pose[] = ['wave', 'think', 'thumbs', 'present', 'nap'];
const FEET = 286 / 300; // where the feet are in the robot's SVG
const HAND = 0.8; // towel hand x while scrubbing, as a fraction of the robot's width

type State = 'air' | 'climb' | 'land' | 'walk' | 'idle' | 'mop' | 'wipe-go' | 'wipe' | 'scold-go' | 'scold' | 'scold-wipe' | 'scold-done';

/** A playful robot that walks on top of the page's boxes and falls or jumps to the next box as you scroll. */
export function RobotPet() {
  const box = useRef<HTMLDivElement>(null);
  const hop = useRef<() => void>(() => {});
  const scoldEl = useRef<HTMLSpanElement>(null);
  const [pose, setPose] = useState<Pose>('stand');
  const [walking, setWalking] = useState(false);
  const [say, setSay] = useState('');
  const [hearts, setHearts] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [shine, setShine] = useState<{ left: number; top: number; width: number } | null>(null);
  const [sparkles, setSparkles] = useState(0);
  const [scold, setScold] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (sessionStorage.getItem('robot-pet-hidden') === '1') { el.style.display = 'none'; return; }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let els = [...document.querySelectorAll(PLATFORMS)];
    const onResize = () => { els = [...document.querySelectorAll(PLATFORMS)]; };
    window.addEventListener('resize', onResize);

    const seen = new Set<string>();
    let wipeOn: Element | null = null;
    let scoldTarget: { left: number; top: number; width: number; height: number } | null = null;
    const s = { plat: -1, x: 0, y: 0, vy: 0, tx: 0, ty: 0, dir: 1, state: 'walk' as State, until: 0 }; // 'walk' with no box makes the first frame pick one
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    const rect = (e: Element): Plat => {
      const r = e.getBoundingClientRect();
      return { top: r.top + scrollY, left: r.left + scrollX, right: r.right + scrollX };
    };
    const clampX = (x: number, p: Plat, w: number) =>
      Math.max(Math.max(p.left, 0), Math.min(x, Math.min(p.right, document.documentElement.clientWidth) - w));
    const setGround = (st: State) => { s.state = st; el.dataset.state = st; el.classList.toggle('air', st === 'air'); el.classList.toggle('climb', st === 'climb'); };

    const stopClean = () => setShine(null);

    // Idle cleaning: wipe the section heading just above this box if the arm reaches it, otherwise mop the box.
    const clean = (now: number, p: Plat, w: number, h: number) => {
      const reach = h * 0.7; // the raised arm reaches about 0.65 of the robot's height
      for (const e of document.querySelectorAll('section h2')) {
        const r = document.createRange();
        r.selectNodeContents(e); // the text itself, not the full-width block
        const t = r.getBoundingClientRect();
        if (!headingInReach({ left: t.left + scrollX, right: t.right + scrollX, bottom: t.bottom + scrollY }, p, reach)) continue;
        wipeOn = e;
        s.tx = clampX(t.left + scrollX + t.width / 2 - w / 2, p, w);
        setGround('wipe-go'); setWalking(true); setPose('stand');
        return;
      }
      setGround('mop'); s.until = now + 3000;
      setWalking(true); setPose('mop');
      setShine({ left: Math.max(p.left, 0), top: p.top, width: Math.min(p.right, document.documentElement.clientWidth) - Math.max(p.left, 0) });
    };

    const greet = () => {
      const sec = els[s.plat]?.closest('section[id]')?.id ?? 'top';
      if (seen.has(sec)) return;
      const line = lineFor(sec, seen);
      if (!line) return;
      setSay(line.text);
      setPose(line.pose);
      setGround('idle'); s.until = performance.now() + 2600;
      later(4500, () => setSay(''));
    };

    const launch = (target: number, plats: Plat[], w: number, vy?: number) => {
      const p = plats[target];
      s.plat = target;
      stopClean();
      s.tx = clampX(s.x, p, w);
      setWalking(false);
      if (reduced) { s.x = s.tx; s.y = p.top; setGround('walk'); greet(); return; }
      // a box far away: start the fall/jump just off screen so it stays short and visible
      const h = el.offsetHeight;
      if (p.top > s.y) s.y = Math.max(s.y, scrollY - h);
      else s.y = Math.min(s.y, scrollY + innerHeight + h);
      setPose('stand');
      if (vy === undefined && p.top < s.y) { setGround('climb'); return; } // box above: climb up to it
      s.vy = vy ?? 0;
      setGround('air');
    };

    hop.current = () => {
      if (s.state === 'air' || s.state === 'climb' || reduced) return;
      stopClean();
      s.vy = -620; setGround('air'); setWalking(false); setPose('thumbs');
      setHearts((n) => n + 1);
    };

    // A text selection held for 1s: the robot hops onto it, gets angry, then scrubs it away with its towel.
    // shortcut: multi-line selections use the bounding box and the robot scrubs along its top edge; fine for short picks.
    let selTimer = 0;
    const hopFrom = { x: 0, y: 0, u: 0, len: 1, home: -1 }; // home >= 0: this hop is the trip back to that box
    let scrubbing = false;
    const hopTo = (x: number, y: number, home: number) => {
      s.tx = x; s.ty = y;
      Object.assign(hopFrom, { x: s.x, y: s.y, u: 0, len: Math.max(1, Math.hypot(x - s.x, y - s.y)), home });
      setWalking(false); setPose('stand');
      setGround('scold-go'); el.classList.add('air');
    };
    const onSelChange = () => {
      clearTimeout(selTimer);
      if (reduced || s.state.startsWith('scold')) return;
      const text = window.getSelection()?.toString().trim() ?? '';
      if (!text) return;
      selTimer = window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.toString().trim() !== text) return; // selection changed since: not angry
        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (!r.width) return;
        const w = el.offsetWidth;
        scoldTarget = { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height };
        stopClean(); setSay('');
        // stand right on top of the selection, centered, to be angry at it
        hopTo(Math.max(0, Math.min(scoldTarget.left + scoldTarget.width / 2 - w / 2, document.documentElement.clientWidth - w)), scoldTarget.top, -1);
      }, 1000);
    };
    document.addEventListener('selectionchange', onSelChange);

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!el.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const plats = els.map(rect);
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vTop = scrollY + 160; // below the sticky header, with room for the bubble
      const vBot = scrollY + innerHeight - 24;

      const scolding = s.state.startsWith('scold');

      // Box scrolled out of view (or first frame, or the target left the screen mid-air): go to the nearest visible one.
      if (!scolding) {
        const cur = plats[s.plat];
        if (!cur || cur.top < vTop || cur.top > vBot) {
          const t = pickPlatform(plats, vTop, vBot, s.y);
          if (t >= 0 && t !== s.plat) {
            if (s.plat < 0) { s.x = clampX(plats[t].left + (plats[t].right - plats[t].left) * 0.7, plats[t], w); s.y = scrollY - h; } // drops in from above
            launch(t, plats, w);
          }
        }
      }

      const p = scolding ? undefined : plats[s.plat];
      const land = () => {
        setGround('land'); s.until = now + 260;
        el.classList.add('landed');
        later(260, () => el.classList.remove('landed'));
        greet();
      };
      if (scolding) {
        // Off the boxes: hop in an arc onto the selection, stomp angrily, scrub across it, then hop back to a box.
        const t = scoldTarget;
        if (s.state === 'scold-go') {
          hopFrom.u = Math.min(1, hopFrom.u + (420 * dt) / hopFrom.len);
          const u = hopFrom.u;
          s.dir = s.tx < hopFrom.x ? -1 : 1;
          s.x = hopFrom.x + (s.tx - hopFrom.x) * u;
          s.y = hopFrom.y + (s.ty - hopFrom.y) * u - Math.sin(u * Math.PI) * Math.min(140, 40 + hopFrom.len * 0.25);
          if (u >= 1) {
            el.classList.remove('air');
            if (hopFrom.home >= 0) { s.plat = hopFrom.home; land(); } // back on a box: normal walking resumes from here
            else {
              el.classList.add('landed');
              later(260, () => el.classList.remove('landed'));
              setGround('scold'); s.until = now + 1300; setPose('angry'); setSay('Hey! No touching!');
              if (t) setScold(t);
            }
          }
        } else if (s.state === 'scold' && now > s.until && t) {
          window.getSelection()?.removeAllRanges(); // the red mark stands in for the selection while it scrubs
          s.tx = Math.max(0, t.left - w * HAND); // first walk back to where the towel reaches the start of the text
          scrubbing = false;
          setGround('scold-wipe'); setPose('stand'); setSay(''); setWalking(true);
        } else if (s.state === 'scold-wipe' && t && !scrubbing) {
          const d = s.tx - s.x;
          s.dir = d < 0 ? -1 : 1;
          s.x += Math.sign(d) * Math.min(Math.abs(d), 140 * dt);
          if (Math.abs(d) < 1) { scrubbing = true; s.dir = 1; setPose('scrub'); }
        } else if (s.state === 'scold-wipe' && t) {
          const end = Math.min(t.left + t.width - w * HAND, document.documentElement.clientWidth - w);
          s.x = Math.min(end, s.x + 70 * dt);
          s.y += (t.top + t.height * 0.6 - s.y) * Math.min(1, dt * 10); // ease down into the crouch
          const done = Math.max(0, Math.min(1, (s.x + w * HAND - t.left) / t.width)); // how far the towel has got
          if (scoldEl.current) scoldEl.current.style.clipPath = `inset(0 0 0 ${done * 100}%)`;
          if (s.x >= end) {
            setScold(null); scoldTarget = null;
            setSparkles((n) => n + 1);
            setGround('scold-done'); s.until = now + 1100; setWalking(false); setPose('thumbs'); setSay('All clean!');
            later(1600, () => setSay(''));
          }
        } else if (s.state === 'scold-done' && now > s.until) {
          const home = pickPlatform(plats, vTop, vBot, s.y);
          // hop in an arc that lands exactly on the box; climb/fall here could finish off the box's edge and snap (the teleport)
          if (home >= 0) hopTo(clampX(s.x, plats[home], w), plats[home].top, home); // stays put until a box is on screen
        }
      } else if (p && s.state === 'climb') {
        s.y = climbStep(s.y, p.top, dt);
        s.x += (s.tx - s.x) * Math.min(1, dt * 5);
        if (s.y <= p.top) land();
      } else if (p && s.state === 'air') {
        const prevY = s.y;
        s.vy = Math.min(s.vy + GRAVITY * dt, 2200);
        s.y += s.vy * dt;
        s.x += (s.tx - s.x) * Math.min(1, dt * 5);
        if (s.vy > 0 && prevY <= p.top + 1 && s.y >= p.top) {
          s.y = p.top;
          land();
        } else if (s.vy > 0 && prevY > p.top + 1) {
          s.y = p.top; setGround('walk'); // failsafe: the box moved under us
        }
      } else if (p) {
        s.y = p.top; // stay glued if the layout shifts
        if (s.state === 'land' && now > s.until) { setGround('walk'); setWalking(true); setPose('stand'); }
        else if (s.state === 'idle' && now > s.until) { setGround('walk'); setWalking(true); setPose('stand'); }
        else if (s.state === 'mop') {
          s.x += s.dir * 25 * dt;
          const min = Math.max(p.left, 0);
          const max = Math.min(p.right, document.documentElement.clientWidth) - w;
          if (s.x < min || s.x > max) { s.x = Math.max(min, Math.min(s.x, max)); s.dir *= -1; }
          if (now > s.until) { stopClean(); setGround('walk'); setPose('stand'); }
        } else if (s.state === 'wipe-go') {
          const d = s.tx - s.x;
          s.dir = d < 0 ? -1 : 1;
          s.x += Math.sign(d) * Math.min(Math.abs(d), 55 * dt);
          if (Math.abs(d) < 1) { setGround('wipe'); s.until = now + 2400; setWalking(false); setPose('wipe'); }
        } else if (s.state === 'wipe' && now > s.until) {
          const e = wipeOn;
          e?.classList.add('pet-gleam');
          later(1200, () => e?.classList.remove('pet-gleam'));
          setSparkles((n) => n + 1);
          setGround('walk'); setWalking(true); setPose('stand');
        }
        else if (s.state === 'walk') {
          s.x += s.dir * 55 * dt;
          const min = Math.max(p.left, 0);
          const max = Math.min(p.right, document.documentElement.clientWidth) - w;
          if (s.x < min || s.x > max) {
            s.x = Math.max(min, Math.min(s.x, max));
            // sometimes it walks off the edge onto a visible box below
            const below = plats.findIndex((q, i) => i !== s.plat && q.top > p.top + 40 && q.top < vBot && s.x + w / 2 >= q.left && s.x + w / 2 <= q.right);
            if (below >= 0 && Math.random() < 0.4) launch(below, plats, w, -260);
            else s.dir *= -1;
          } else if (Math.random() < dt * 0.22) {
            if (!reduced && Math.random() < 1 / 3) clean(now, p, w, h);
            else {
              setGround('idle'); s.until = now + 1800 + Math.random() * 2600;
              setWalking(false); setPose(IDLE[Math.floor(Math.random() * IDLE.length)]);
            }
          }
        }
      }

      el.dataset.dir = String(s.dir);
      el.dataset.side = s.x > document.documentElement.clientWidth / 2 ? 'r' : 'l';
      el.style.transform = `translate3d(${Math.round(s.x)}px, ${Math.round(s.y - h * FEET)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout); clearTimeout(selTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('selectionchange', onSelChange);
      document.querySelectorAll('.pet-gleam').forEach((e) => e.classList.remove('pet-gleam'));
    };
  }, []);

  if (hidden) return null;
  return (
    <>
    {shine && <span className="pet-shine" aria-hidden="true" style={{ left: shine.left, top: shine.top, width: shine.width }} />}
    {scold && <span className="pet-scold" ref={scoldEl} aria-hidden="true" style={{ left: scold.left, top: scold.top, width: scold.width, height: scold.height }} />}
    <div className="pet" ref={box}>
      {say && <p className="robot-say" aria-hidden="true">{say}</p>}
      {pose === 'nap' && <span className="pet-z" aria-hidden="true">zZz</span>}
      {pose === 'angry' && <span className="pet-anger" aria-hidden="true">💢</span>}
      {hearts > 0 && <span className="pet-heart" key={hearts} aria-hidden="true">♥</span>}
      {sparkles > 0 && <span className="pet-sparkles" key={`s${sparkles}`} aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></span>}
      <div className="pet-body" onClick={() => hop.current()} onPointerEnter={() => setPose((p) => (p === 'stand' ? 'wave' : p))}>
        <Robot3D pose={pose} walking={walking} talking={say !== ''} />
      </div>
      <button type="button" className="pet-hide" onClick={() => { sessionStorage.setItem('robot-pet-hidden', '1'); setHidden(true); }}>
        Hide robot
      </button>
    </div>
    </>
  );
}
