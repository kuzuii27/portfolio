'use client';

import { useEffect, useRef, useState } from 'react';

const EVERY_MS = 120_000; // a meteor about every 2 minutes
const GIVE_UP_MS = 30_000; // if the robot never shows up to fix it (no WebGL), the crack clears itself
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Radial cracks, one kinked segment and one branch each, in SVG units around the impact point. */
function makeCracks() {
  const n = 8 + Math.floor(Math.random() * 4);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25);
    const len = rnd(70, 190);
    const k = a + rnd(-0.15, 0.15);
    const mx = Math.cos(k) * len * 0.55;
    const my = Math.sin(k) * len * 0.55;
    d += `M0 0L${mx.toFixed(0)} ${my.toFixed(0)}L${(Math.cos(a) * len).toFixed(0)} ${(Math.sin(a) * len).toFixed(0)}`;
    const b = a + rnd(0.5, 0.9) * (i % 2 ? 1 : -1);
    d += `M${mx.toFixed(0)} ${my.toFixed(0)}l${(Math.cos(b) * len * 0.35).toFixed(0)} ${(Math.sin(b) * len * 0.35).toFixed(0)}`;
  }
  return d;
}

/** A meteor streaks in, cracks the screen and the crack stays until the robot repairs it (SpaceScene listens to `meteor:hit`, answers `meteor:fixed`). */
export function Meteor() {
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null);
  const [rock, setRock] = useState<{ x: number; y: number; d: string } | null>(null);
  const [stage, setStage] = useState<'stuck' | 'pull' | 'throw' | 'weld'>('stuck');
  const busy = useRef(false);
  const giveUp = useRef(0);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const launch = () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      setFly({ x: innerWidth * rnd(0.2, 0.8), y: innerHeight * rnd(0.28, 0.72) });
    };
    const fixed = () => { clearTimeout(giveUp.current); setRock(null); setStage('stuck'); busy.current = false; };
    const at = (s: 'pull' | 'throw' | 'weld') => () => setStage(s);
    const [onPull, onThrow, onWeld] = [at('pull'), at('throw'), at('weld')];
    window.addEventListener('meteor:pull', onPull);
    window.addEventListener('meteor:throw', onThrow);
    window.addEventListener('meteor:weld', onWeld);
    const id = setInterval(launch, EVERY_MS);
    window.addEventListener('meteor:launch', launch); // also how tests trigger one
    window.addEventListener('meteor:fixed', fixed);
    return () => { clearInterval(id); clearTimeout(giveUp.current); window.removeEventListener('meteor:pull', onPull); window.removeEventListener('meteor:throw', onThrow); window.removeEventListener('meteor:weld', onWeld); window.removeEventListener('meteor:launch', launch); window.removeEventListener('meteor:fixed', fixed); };
  }, []);

  const land = () => {
    if (!fly) return;
    setStage('stuck');
    setRock({ ...fly, d: makeCracks() });
    window.dispatchEvent(new CustomEvent('meteor:hit', { detail: fly }));
    giveUp.current = window.setTimeout(() => window.dispatchEvent(new Event('meteor:fixed')), GIVE_UP_MS);
    setFly(null);
  };

  return (
    <>
      {fly && <span className="meteor" style={{ left: fly.x, top: fly.y }} onAnimationEnd={land} aria-hidden="true" />}
      {rock && (
        <>
          <span className="meteor-flash" aria-hidden="true" />
          <svg className="crack" data-stage={stage} style={{ left: rock.x - 220, top: rock.y - 220 }} viewBox="-220 -220 440 440" width="440" height="440" aria-hidden="true">
            <path className="crack-dark" d={rock.d} />
            <path className="crack-lite" d={rock.d} />
            <circle r="16" className="crack-hole" />
          </svg>
          {stage !== 'weld' && <span className="meteor-stuck" data-stage={stage} style={{ left: rock.x, top: rock.y }} />}
          {stage === 'weld' && (
            <span className="weld" style={{ left: rock.x, top: rock.y }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} style={{ '--a': `${i * 45 + 12}deg`, animationDelay: `${(i % 4) * 0.12}s` } as React.CSSProperties} />)}
            </span>
          )}
        </>
      )}
    </>
  );
}
