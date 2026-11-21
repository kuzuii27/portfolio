'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BREAKABLE, alongLine, extendToEdge, gameState, isGameUi } from '@/lib/game';
import { BOMBLETS, GRENADE_COOLDOWN, GUNS, WEAPONS, bombletTargets, gunFromKey, nextWeapon, spreadAngles, type Gun } from '@/lib/weapons';
import { createFx } from '@/components/game/fx';
import { createDamage } from '@/components/game/damage';

type Snd = Gun | 'grenade';

let ctx: AudioContext | null = null;
let muted = false; // the pause menu's Sound switch
/** Zero-dependency Web Audio synth. A sound failure never blocks the game. */
function sound(gun: Snd, phase: 'fire' | 'hit') {
  if (muted) return;
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
      else if (gun === 'smg') { noise(0.05, 0.35); tone('square', 220, 90, 0.05, 0.12); }
      else if (gun === 'shotgun') { noise(0.3, 0.7); tone('sawtooth', 110, 40, 0.3, 0.3); }
      else if (gun === 'laser') { tone('sawtooth', 1800, 160, 0.3, 0.18); tone('sine', 900, 120, 0.3, 0.2); }
      else if (gun === 'rocket') { noise(0.5, 0.25); tone('sawtooth', 160, 60, 0.5, 0.15); }
      else if (gun === 'flame') noise(0.08, 0.12);
      else if (gun === 'bomb') tone('sine', 300, 700, 0.25, 0.15); // pop as it leaves
      else tone('sine', 500, 200, 0.15, 0.12); // grenade throw
    } else if (gun === 'pistol' || gun === 'smg') noise(0.06, 0.3);
    else if (gun === 'shotgun') noise(0.1, 0.3);
    else if (gun === 'laser') noise(0.15, 0.25);
    else { noise(0.7, gun === 'grenade' ? 0.5 : 0.7); tone('sine', 90, 28, 0.6, gun === 'grenade' ? 0.45 : 0.6); }
  } catch {
    /* no audio: fine */
  }
}

const big = (r: DOMRect) => r.width * r.height > innerWidth * innerHeight * 0.5 || (r.width > innerWidth * 0.97 && r.height > innerHeight * 0.45);

/** The topmost breakable thing under a viewport point (skips game UI, the robot and whole-page sections). Destroyed elements are hidden, so they stop hit-testing and the block behind is next. */
function pickAt(x: number, y: number, proxyFor: (e: Element) => HTMLElement | null): HTMLElement | null {
  for (const e of document.elementsFromPoint(x, y)) {
    if (isGameUi(e)) continue;
    const damaged = proxyFor(e); // a block already swapped for its damage copy
    if (damaged) return damaged;
    const t = e.closest(BREAKABLE) as HTMLElement | null;
    if (!t || isGameUi(t)) continue;
    const r = t.getBoundingClientRect();
    if (big(r) || r.width < 4 || r.height < 4) continue;
    return t;
  }
  return null;
}

/** Play game button (in the nav) + weapon bar + A/D/Space platformer shooter. Movement and the gun arm live in SpaceScene/RobotShip (they read gameState). */
export function GameMode() {
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  const [gun, setGun] = useState<Gun | null>(null);
  const playing = gun !== null;
  const [meter, setMeter] = useState(0); // % destroyed
  const [paused, setPaused] = useState(false); // the Esc menu; the game keeps running behind it
  const [soundOn, setSoundOn] = useState(true);
  const [done, setDone] = useState(false); // the "portfolio destroyed" screen
  const restartRef = useRef<() => void>(() => {});

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
    window.dispatchEvent(new Event('game:start'));
    gameState.aim = { x: innerWidth * 0.6, y: innerHeight * 0.5 };
    const fx = createFx();
    let shown = false;
    const damage = createDamage(fx, (p) => {
      setMeter(Math.round(p * 100));
      if (p >= 0.9 && !shown) { shown = true; setDone(true); }
    });
    restartRef.current = () => { damage.restore(); shown = false; setDone(false); };
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };
    const hitAll = (pts: { x: number; y: number }[], cap: number) => {
      const out: { t: HTMLElement; x: number; y: number }[] = [];
      for (const p of pts) {
        const t = pickAt(p.x, p.y, damage.proxyFor);
        if (t && !out.some((o) => o.t === t)) out.push({ t, x: p.x, y: p.y });
        if (out.length >= cap) break;
      }
      return out;
    };
    const muzzle = () => (gameState.muzzle.x || gameState.muzzle.y ? { ...gameState.muzzle } : { x: innerWidth / 2, y: innerHeight / 2 });

    /** Explosion on the page: flash, ring, sparks, smoke, shake, and everything within the radius is destroyed. */
    const boom = (x: number, y: number, radius: number, cap: number, snd: Snd, dmg: number) => {
      sound(snd, 'hit');
      fx.flash(x, y, radius * 1.3, 'rgba(255,190,100,.95)');
      fx.ring(x, y, radius * 1.4, '#ffb347');
      fx.spark(x, y, Math.round(radius * 0.4), { speed: 720 });
      fx.smoke(x, y, 14, 30);
      if (radius >= 100) fx.shake(); // bomblets are too small to shake the page
      const pts = [{ x, y }];
      for (const [f, n] of [[0.55, 6], [1, 12]] as const) for (let i = 0; i < n; i++) pts.push({ x: x + Math.cos((i / n) * Math.PI * 2) * radius * f, y: y + Math.sin((i / n) * Math.PI * 2) * radius * f });
      hitAll(pts, cap).forEach((h) => damage.hit(h.t, { x, y }, { radius, dmg, power: 700 }));
    };
    /** One bullet along `ang` for `dist` px; whatever is at the end of its flight is destroyed. */
    const bullet = (from: { x: number; y: number }, ang: number, dist: number, o: { radius: number; dmg: number; power: number }) => {
      const ex = from.x + Math.cos(ang) * dist;
      const ey = from.y + Math.sin(ang) * dist;
      fx.shoot('bullet', from.x, from.y, ex, ey, () => {
        fx.spark(ex, ey, 8, { speed: 360 });
        const t = pickAt(ex, ey, damage.proxyFor);
        if (t) damage.hit(t, { x: ex, y: ey }, o);
      });
    };

    let last = 0;
    let lastGrenade = 0;
    let flameTick = 0;
    const fire = (x: number, y: number) => {
      const g = gameState.gun;
      if (!g) return;
      const w = WEAPONS[g];
      const now = performance.now();
      if (now - last < w.cooldown * 1000) return;
      last = now;
      const from = muzzle();
      const ang = Math.atan2(y - from.y, x - from.x);
      const dist = Math.max(60, Math.hypot(x - from.x, y - from.y));
      if (g !== 'flame') gameState.shots++; // a steady stream of fire must not make the arm jitter
      if (g !== 'flame' || flameTick % 4 === 0) sound(g, 'fire');
      if (g === 'pistol' || g === 'smg') {
        fx.spark(from.x, from.y, g === 'smg' ? 3 : 6, { angle: ang, spread: 0.5, speed: 300 });
        fx.flash(from.x, from.y, g === 'smg' ? 18 : 28, 'rgba(255,220,140,.9)');
        bullet(from, ang + (Math.random() - 0.5) * w.spread, dist, g === 'smg' ? { radius: 20, dmg: 0.5, power: 300 } : { radius: 26, dmg: 1, power: 420 });
      } else if (g === 'shotgun') {
        fx.spark(from.x, from.y, 12, { angle: ang, spread: 0.7, speed: 420 });
        fx.flash(from.x, from.y, 44, 'rgba(255,200,120,.95)');
        spreadAngles(w.pellets, w.spread).forEach((a) => bullet(from, ang + a, Math.max(260, dist), { radius: 22, dmg: 0.6, power: 380 }));
      } else if (g === 'laser') {
        const end = extendToEdge(from.x, from.y, x, y, innerWidth, innerHeight);
        fx.flash(from.x, from.y, 34, 'rgba(120,230,255,.9)');
        fx.beam(from.x, from.y, end.x, end.y, '#38bdf8', 320);
        hitAll(alongLine(from.x, from.y, end.x, end.y, 24), 8).forEach((h, i) => later(() => {
          sound(g, 'hit');
          fx.spark(h.x, h.y, 12, { color: '#9be7ff', speed: 460 });
          damage.hit(h.t, h, { radius: 20, dmg: 3, power: 380 });
        }, 60 + i * 45));
      } else if (g === 'flame') {
        const a2 = ang + (Math.random() - 0.5) * w.spread;
        const reach = Math.min(w.range ?? 240, dist);
        fx.flame(from.x, from.y, a2);
        if (flameTick++ % 2 === 0) {
          for (const f of [0.35, 0.7, 1]) { // the stream sets fire to whatever it reaches
            const px = from.x + Math.cos(a2) * reach * f;
            const py = from.y + Math.sin(a2) * reach * f;
            const t = pickAt(px, py, damage.proxyFor);
            if (t) damage.burn(t, { x: px, y: py });
          }
        }
      } else if (g === 'bomb') {
        // Too Much: a parachute bomb drifts down onto the cursor, then splits into bomblets that scatter and blow
        fx.flash(from.x, from.y, 44, 'rgba(255,120,200,.9)');
        fx.lob(from.x, from.y, x, y, () => {
          fx.flash(x, y, 60, 'rgba(255,120,200,.9)');
          bombletTargets(x, y, BOMBLETS, 160).forEach((s, i) => later(() => {
            fx.lob(x, y, s.x, s.y, () => boom(s.x, s.y, 55, 3, 'shotgun', 2.5), { fuse: 0.15, dur: 0.4, h: 70, small: true });
          }, i * 40));
        }, { chute: true, fuse: 0.05, dur: 1.5, h: 200 });
      } else {
        fx.flash(from.x, from.y, 40, 'rgba(255,170,90,.9)');
        fx.spark(from.x, from.y, 8, { angle: ang + Math.PI, spread: 0.8, speed: 260, color: '#ff9a3a' });
        fx.shoot('rocket', from.x, from.y, x, y, () => boom(x, y, 130, 10, 'rocket', 6));
      }
    };
    /** Right click: a grenade lands on the cursor, blinks, then blows. */
    const grenade = (x: number, y: number) => {
      if (performance.now() - lastGrenade < GRENADE_COOLDOWN * 1000) return;
      lastGrenade = performance.now();
      const from = muzzle();
      gameState.shots++; // the arm kicks
      sound('grenade', 'fire');
      fx.lob(from.x, from.y, x, y, () => boom(x, y, 105, 6, 'grenade', 5));
    };

    let held = false;
    const onMove = (e: PointerEvent) => { gameState.aim = { x: e.clientX, y: e.clientY }; };
    const onDown = (e: MouseEvent) => {
      if (isGameUi(e.target as Element | null)) return;
      e.preventDefault(); // no text selection or focus while playing
      if (e.button === 0) { held = true; fire(e.clientX, e.clientY); }
    };
    const onUp = () => { held = false; };
    const auto = window.setInterval(() => { const g = gameState.gun; if (held && g && WEAPONS[g].auto) fire(gameState.aim.x, gameState.aim.y); }, 25);
    const onClick = (e: MouseEvent) => {
      if (isGameUi(e.target as Element | null)) return;
      e.preventDefault(); // the shot already happened on mousedown; a click must never follow a link or press a button
      e.stopImmediatePropagation();
    };
    const onContext = (e: MouseEvent) => {
      if (isGameUi(e.target as Element | null)) return;
      e.preventDefault();
      grenade(e.clientX, e.clientY);
    };
    const onSubmit = (e: Event) => e.preventDefault();
    let wheelAt = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // the camera follows the player; the wheel switches weapons and Lenis never sees it
      e.stopPropagation();
      const now = performance.now();
      if (now - wheelAt < 140) return;
      wheelAt = now;
      setGun((g) => (g ? nextWeapon(g, e.deltaY > 0 ? 1 : -1) : g));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPaused((p) => !p); return; }
      const g = gunFromKey(e.key);
      if (g) setGun(g);
    };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('blur', onUp);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('mouseup', onUp, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContext, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('keydown', onKey, true);

    return () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('blur', onUp);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('mouseup', onUp, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContext, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('keydown', onKey, true);
      clearInterval(auto);
      timers.forEach(clearTimeout);
      restartRef.current = () => {};
      damage.dispose();
      fx.dispose(); // also restores everything the shatter effect hid
      setMeter(0);
      setDone(false);
      setPaused(false);
      gameState.gun = null;
      delete root.dataset.game;
      window.dispatchEvent(new Event('game:end'));
    };
  }, [playing]);

  if (!ok) return null;
  const exit = () => { setGun(null); setOpen(false); };
  const toggleSound = () => { muted = !muted; setSoundOn(!muted); };
  const pick = (g: Gun) => { setGun(g); setOpen(false); };
  return (
    <>
      <button className="btn btn-ghost game-nav" data-game-ui onClick={playing ? exit : () => setOpen((o) => !o)}>
        {playing ? 'Exit game' : open ? 'Cancel' : 'Play game'}
      </button>
      {(open || playing) && createPortal(
        <div className="game-dock" data-game-ui>
          {GUNS.map((g, i) => (
            <button key={g} className="btn btn-ghost" aria-pressed={gun === g} onClick={() => pick(g)}>{i + 1} {WEAPONS[g].label}</button>
          ))}
          {playing && (
            <div className="game-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={meter}>
              <i style={{ width: `${meter}%` }} />
              <span>Destroyed {meter}%</span>
            </div>
          )}
          {playing && <span className="game-hint">A D run · Space jump (again to flip, hold to fly) · S drop · click shoot (hold for SMG and Flame) · right-click grenade · 1-7 or wheel weapon · Esc menu</span>}
          <button className="btn btn-primary" onClick={exit}>{playing ? 'Exit game' : 'Cancel'}</button>
        </div>,
        document.body,
      )}
      {playing && paused && createPortal(
        <div className="game-over" data-game-ui>
          <div>
            <h2>Paused</h2>
            <p>The game keeps running while this menu is open.</p>
            <div>
              <button className="btn btn-primary" onClick={() => setPaused(false)}>Resume</button>
              <button className="btn btn-ghost" onClick={() => { restartRef.current(); setPaused(false); }}>Restart site</button>
              <button className="btn btn-ghost" onClick={toggleSound}>Sound: {soundOn ? 'on' : 'off'}</button>
              <button className="btn btn-ghost" onClick={exit}>Exit game</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {playing && done && createPortal(
        <div className="game-over" data-game-ui>
          <div>
            <h2>Portfolio destroyed</h2>
            <p>{meter}% wiped out. Nice shooting.</p>
            <div>
              <button className="btn btn-primary" onClick={() => setDone(false)}>Keep destroying</button>
              <button className="btn btn-ghost" onClick={() => restartRef.current()}>Restart</button>
              <button className="btn btn-ghost" onClick={exit}>Exit</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
