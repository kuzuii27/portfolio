'use client';

import { useEffect, useState } from 'react';
import { BREAKABLE, GUNS, alongLine, extendToEdge, gameState, isGameUi, type Gun } from '@/lib/game';
import { createFx } from '@/components/game/fx';

const LABEL: Record<Gun, string> = { pistol: 'Pistol', laser: 'Laser', rocket: 'Rocket' };

let ctx: AudioContext | null = null;
/** Zero-dependency Web Audio synth. A sound failure never blocks the game. */
function sound(gun: Gun, phase: 'fire' | 'hit') {
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    const t = c.currentTime;
    const noise = (dur: number, vol: number) => {
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = vol;
      s.buffer = buf;
      s.connect(g).connect(c.destination);
      s.start(t);
    };
    const tone = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur);
    };
    if (phase === 'fire') {
      if (gun === 'pistol') { noise(0.12, 0.5); tone('sine', 140, 50, 0.12, 0.4); }
      else if (gun === 'laser') { tone('sawtooth', 1800, 160, 0.3, 0.18); tone('sine', 900, 120, 0.3, 0.2); }
      else { noise(0.5, 0.25); tone('sawtooth', 160, 60, 0.5, 0.15); }
    } else if (gun === 'pistol') noise(0.06, 0.3);
    else if (gun === 'laser') noise(0.15, 0.25);
    else { noise(0.7, 0.7); tone('sine', 90, 28, 0.6, 0.6); }
  } catch {
    /* no audio: fine */
  }
}

const big = (r: DOMRect) => r.width * r.height > innerWidth * innerHeight * 0.5 || (r.width > innerWidth * 0.97 && r.height > innerHeight * 0.45);

/** The topmost breakable thing under a viewport point (skips game UI, the robot and whole-page sections). Destroyed elements are hidden, so they stop hit-testing and the block behind is next. */
function pickAt(x: number, y: number): HTMLElement | null {
  for (const e of document.elementsFromPoint(x, y)) {
    if (isGameUi(e)) continue;
    const t = e.closest(BREAKABLE) as HTMLElement | null;
    if (!t || isGameUi(t)) continue;
    const r = t.getBoundingClientRect();
    if (big(r) || r.width < 4 || r.height < 4) continue;
    return t;
  }
  return null;
}

/** Play game dock + W/A/S/D-flown robot shooting. Flight and the gun arm live in SpaceScene/RobotShip (they read gameState). */
export function GameMode() {
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  const [gun, setGun] = useState<Gun | null>(null);
  const playing = gun !== null;

  useEffect(() => {
    queueMicrotask(() => setOk(!matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches)); // keyboard + mouse game
  }, []);

  useEffect(() => {
    gameState.gun = gun;
  }, [gun]);

  useEffect(() => {
    if (!playing) return;
    const root = document.documentElement;
    root.dataset.game = '1';
    gameState.aim = { x: innerWidth * 0.6, y: innerHeight * 0.5 };
    const fx = createFx();
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };
    const hitAll = (pts: { x: number; y: number }[], cap: number) => {
      const out: { t: HTMLElement; x: number; y: number }[] = [];
      for (const p of pts) {
        const t = pickAt(p.x, p.y);
        if (t && !out.some((o) => o.t === t)) out.push({ t, x: p.x, y: p.y });
        if (out.length >= cap) break;
      }
      return out;
    };

    const fire = (x: number, y: number) => {
      const g = gameState.gun;
      if (!g) return;
      const m = gameState.muzzle;
      const from = m.x || m.y ? { x: m.x, y: m.y } : { x: innerWidth / 2, y: innerHeight / 2 };
      const ang = Math.atan2(y - from.y, x - from.x);
      gameState.shots++;
      sound(g, 'fire');
      if (g === 'pistol') {
        fx.spark(from.x, from.y, 6, { angle: ang, spread: 0.5, speed: 300 });
        fx.flash(from.x, from.y, 28, 'rgba(255,220,140,.9)');
        fx.shoot('bullet', from.x, from.y, x, y, () => {
          sound(g, 'hit');
          fx.spark(x, y, 14, { speed: 380 });
          const t = pickAt(x, y);
          if (t) fx.shatter(t, { x, y }, 420);
        });
      } else if (g === 'laser') {
        const end = extendToEdge(from.x, from.y, x, y, innerWidth, innerHeight);
        fx.flash(from.x, from.y, 34, 'rgba(120,230,255,.9)');
        fx.beam(from.x, from.y, end.x, end.y, '#38bdf8', 320);
        hitAll(alongLine(from.x, from.y, end.x, end.y, 24), 8).forEach((h, i) => later(() => {
          sound(g, 'hit');
          fx.spark(h.x, h.y, 12, { color: '#9be7ff', speed: 460 });
          fx.shatter(h.t, h, 380);
        }, 60 + i * 45));
      } else {
        fx.flash(from.x, from.y, 40, 'rgba(255,170,90,.9)');
        fx.spark(from.x, from.y, 8, { angle: ang + Math.PI, spread: 0.8, speed: 260, color: '#ff9a3a' });
        fx.shoot('rocket', from.x, from.y, x, y, () => {
          sound(g, 'hit');
          fx.flash(x, y, 170, 'rgba(255,190,100,.95)');
          fx.ring(x, y, 180, '#ffb347');
          fx.spark(x, y, 50, { speed: 720 });
          fx.smoke(x, y, 14, 30);
          fx.shake();
          const pts = [{ x, y }];
          for (const [r, n] of [[70, 6], [130, 12]] as const) for (let i = 0; i < n; i++) pts.push({ x: x + Math.cos((i / n) * Math.PI * 2) * r, y: y + Math.sin((i / n) * Math.PI * 2) * r });
          hitAll(pts, 10).forEach((h) => fx.shatter(h.t, { x, y }, 700));
        });
      }
    };

    const onMove = (e: PointerEvent) => { gameState.aim = { x: e.clientX, y: e.clientY }; };
    const onDown = (e: MouseEvent) => { if (!isGameUi(e.target as Element | null)) e.preventDefault(); }; // no text selection or focus while playing
    const onClick = (e: MouseEvent) => {
      if (isGameUi(e.target as Element | null)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const scripted = e.clientX === 0 && e.clientY === 0; // el.click() from code has no position: shoot where the cursor last was
      fire(scripted ? gameState.aim.x : e.clientX, scripted ? gameState.aim.y : e.clientY);
    };
    const onSubmit = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setGun(null); setOpen(false); } };
    addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('keydown', onKey, true);

    return () => {
      removeEventListener('pointermove', onMove);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('keydown', onKey, true);
      timers.forEach(clearTimeout);
      fx.dispose(); // also restores every destroyed element
      gameState.gun = null;
      delete root.dataset.game;
    };
  }, [playing]);

  if (!ok) return null;
  const pick = (g: Gun) => { setGun(g); setOpen(false); };
  return (
    <div className="game-dock" data-game-ui>
      {!playing && !open && <button className="btn btn-ghost" onClick={() => setOpen(true)}>Play game</button>}
      {(open || playing) && GUNS.map((g) => (
        <button key={g} className="btn btn-ghost" aria-pressed={gun === g} onClick={() => pick(g)}>{LABEL[g]}</button>
      ))}
      {open && !playing && <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>}
      {playing && <span className="game-hint">W A S D move · click to shoot · Esc exit</span>}
      {playing && <button className="btn btn-primary" onClick={() => { setGun(null); setOpen(false); }}>Exit game</button>}
    </div>
  );
}
