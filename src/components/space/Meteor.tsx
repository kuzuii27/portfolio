'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

// First five meteors at 3 s, 10 s, 30 s, 20 s, 60 s after page load; then every 60 s.
const SCHEDULE_S = [3, 10, 30, 20, 60];
const REPEAT_S = 60;
const GIVE_UP_MS = 30_000; // if the robot never shows up to fix it (no WebGL), the crack clears itself
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const gaming = () => !!document.documentElement.dataset.game;

export type Rock = { size: number; clip: string; fill: string };
const FILLS = [
  'radial-gradient(circle at 35% 30%,#d9b48a,#8a5a34 55%,#3b2412)', // stone
  'radial-gradient(circle at 35% 30%,#cfe9ff,#5f8fb8 55%,#1f3550)', // ice
  'radial-gradient(circle at 35% 30%,#d8d8de,#6d7280 55%,#25272e)', // iron
  'radial-gradient(circle at 35% 30%,#ffd18a,#d9531e 55%,#4a1608)', // molten
];
/** A random jagged rock: 7-10 corners at uneven distances, random size and material. */
function makeRock(): Rock {
  const n = 7 + Math.floor(Math.random() * 4);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2);
    const r = rnd(30, 50);
    return `${(50 + Math.cos(a) * r).toFixed(1)}% ${(50 + Math.sin(a) * r).toFixed(1)}%`;
  });
  return { size: rnd(26, 64), clip: `polygon(${pts.join(',')})`, fill: FILLS[Math.floor(Math.random() * FILLS.length)] };
}
// wrapper carries the glow (a filter would be clipped by the polygon), the inner span carries the shape
export const RockShape = ({ r, x, y, cls = '', style }: { r: Rock; x: number; y: number; cls?: string; style?: CSSProperties }) => (
  <span className={`rock-wrap ${cls}`} style={{ left: x, top: y, width: r.size, height: r.size, marginLeft: -r.size / 2, marginTop: -r.size / 2, ...style }} aria-hidden="true">
    <span className="rock-shape" style={{ clipPath: r.clip, background: r.fill }} />
  </span>
);

/** Radial cracks, one kinked segment and one branch each, in SVG units around the impact point. Also returns sample points along the main segments for the torch to trace. */
function makeCracks() {
  const n = 8 + Math.floor(Math.random() * 4);
  let d = '';
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25);
    const len = rnd(70, 190);
    const k = a + rnd(-0.15, 0.15);
    const mx = Math.cos(k) * len * 0.55;
    const my = Math.sin(k) * len * 0.55;
    d += `M0 0L${mx.toFixed(0)} ${my.toFixed(0)}L${(Math.cos(a) * len).toFixed(0)} ${(Math.sin(a) * len).toFixed(0)}`;
    const b = a + rnd(0.5, 0.9) * (i % 2 ? 1 : -1);
    d += `M${mx.toFixed(0)} ${my.toFixed(0)}l${(Math.cos(b) * len * 0.35).toFixed(0)} ${(Math.sin(b) * len * 0.35).toFixed(0)}`;
    // a point mid-way along each main segment, so the torch walks the real crack lines out from the hole
    pts.push({ x: mx * 0.5 + Math.cos(a) * len * 0.25, y: my * 0.5 + Math.sin(a) * len * 0.25 });
  }
  return { d, pts };
}

/**
 * Events (window):
 *  meteor:launch  - start a meteor now (tests)
 *  meteor:hit     - {x,y,pts}: impact point and crack sample points (SpaceScene starts the repair job)
 *  meteor:pull    - robot has the rock: start pulling
 *  meteor:throw   - rock thrown away: crack shows the throw stage
 *  meteor:weld    - torch is welding the seam
 *  meteor:seal    - weld done, hole closes (crack fades)
 *  meteor:fixed   - repair finished (or 30 s give-up): clears the crack, schedules the next
 */
/** A meteor streaks in, cracks the screen and the crack stays until the robot repairs it. */
export function Meteor() {
  const [fly, setFly] = useState<{ x: number; y: number; r: Rock } | null>(null);
  const [rock, setRock] = useState<{ x: number; y: number; d: string; r: Rock; pts: { x: number; y: number }[] } | null>(null);
  const [kept, setKept] = useState<{ id: number; x: number; y: number; d: string; r: Rock }[]>([]); // game mode: craters that stay until the game ends
  const uid = useRef(0);
  const [stage, setStage] = useState<'stuck' | 'pull' | 'throw' | 'weld' | 'seal'>('stuck');
  const busy = useRef(false);
  const giveUp = useRef(0);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let idx = 0;
    let tid = 0;

    const launch = () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      setFly({ x: innerWidth * rnd(0.2, 0.8), y: innerHeight * rnd(0.28, 0.72), r: makeRock() }); // the rock that streaks in is the one that sticks
    };
    const schedule = () => {
      const delaySec = idx < SCHEDULE_S.length ? SCHEDULE_S[idx] : REPEAT_S;
      idx++;
      tid = window.setTimeout(launch, delaySec * 1000);
    };
    const fixed = () => { clearTimeout(giveUp.current); setRock(null); setStage('stuck'); busy.current = false; schedule(); };
    // game mode: meteors keep falling every 6 s and their craters stay until the game ends; normal repairs resume afterwards
    const onKept = () => { busy.current = false; clearTimeout(tid); tid = window.setTimeout(launch, 6000); };
    const onGameStart = () => { if (!busy.current) { clearTimeout(tid); tid = window.setTimeout(launch, 3000); } };
    const onGameEnd = () => { setKept([]); if (!busy.current) { clearTimeout(tid); schedule(); } };
    window.addEventListener('meteor:kept', onKept);
    window.addEventListener('game:start', onGameStart);
    window.addEventListener('game:end', onGameEnd);
    const at = (s: 'pull' | 'throw' | 'weld' | 'seal') => () => setStage(s);
    const [onPull, onThrow, onWeld, onSeal] = [at('pull'), at('throw'), at('weld'), at('seal')];
    window.addEventListener('meteor:pull', onPull);
    window.addEventListener('meteor:throw', onThrow);
    window.addEventListener('meteor:weld', onWeld);
    window.addEventListener('meteor:seal', onSeal);
    window.addEventListener('meteor:launch', launch); // also how tests trigger one
    window.addEventListener('meteor:fixed', fixed);
    schedule(); // kick off the first one
    return () => { clearTimeout(tid); clearTimeout(giveUp.current); window.removeEventListener('meteor:pull', onPull); window.removeEventListener('meteor:throw', onThrow); window.removeEventListener('meteor:weld', onWeld); window.removeEventListener('meteor:seal', onSeal); window.removeEventListener('meteor:launch', launch); window.removeEventListener('meteor:fixed', fixed); window.removeEventListener('meteor:kept', onKept); window.removeEventListener('game:start', onGameStart); window.removeEventListener('game:end', onGameEnd); };
  }, []);

  const land = () => {
    if (!fly) return;
    const { d, pts } = makeCracks();
    const r = fly.r;
    if (gaming()) {
      setKept((k) => [...k.slice(-7), { id: ++uid.current, x: fly.x, y: fly.y, d, r }]); // at most 8 craters
      setFly(null);
      window.dispatchEvent(new Event('meteor:kept'));
      return;
    }
    setStage('stuck');
    setRock({ ...fly, d, r, pts });
    window.dispatchEvent(new CustomEvent('meteor:hit', { detail: { ...fly, pts, rock: r } }));
    armGiveUp();
    setFly(null);
  };
  // the give-up clear waits while a game runs, so a crater from before the game also stays until it ends
  const armGiveUp = () => { giveUp.current = window.setTimeout(() => { if (gaming()) armGiveUp(); else window.dispatchEvent(new Event('meteor:fixed')); }, GIVE_UP_MS); };

  return (
    <>
      {fly && (
        <span className="meteor" style={{ left: fly.x, top: fly.y, background: 'none', filter: 'drop-shadow(0 0 8px rgba(255,140,60,.7))' }} onAnimationEnd={land} aria-hidden="true">
          <span className="meteor-core" style={{ width: fly.r.size * 0.6, height: fly.r.size * 0.6, clipPath: fly.r.clip, background: fly.r.fill }} />
        </span>
      )}
      {rock && (
        <>
          <span className="meteor-flash" aria-hidden="true" />
          <svg className="crack" data-stage={stage} style={{ left: rock.x - 220, top: rock.y - 220 }} viewBox="-220 -220 440 440" width="440" height="440" aria-hidden="true">
            <path className="crack-dark" d={rock.d} />
            <path className="crack-lite" d={rock.d} />
            <path className="crack-bead" d={rock.d} pathLength={1000} />
            <circle r="16" className="crack-hole" />
          </svg>
          {stage === 'stuck' && <RockShape r={rock.r} x={rock.x} y={rock.y} />}
        </>
      )}
      {kept.map((k) => (
        <span key={k.id}>
          <svg className="crack" style={{ left: k.x - 220, top: k.y - 220 }} viewBox="-220 -220 440 440" width="440" height="440" aria-hidden="true">
            <path className="crack-dark" d={k.d} />
            <path className="crack-lite" d={k.d} />
            <circle r="16" className="crack-hole" />
          </svg>
          <RockShape r={k.r} x={k.x} y={k.y} />
        </span>
      ))}
    </>
  );
}
