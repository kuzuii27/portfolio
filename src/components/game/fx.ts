import { polyCss, shardPoints } from '@/lib/game';
import { arcPoint } from '@/lib/weapons';

// Effects for the destroy-the-site game: one overlay canvas (sparks, smoke, glow, beams, rings, projectiles) plus DOM shards for destroyed elements.

type Part = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; kind: 'spark' | 'smoke' | 'glow'; color: string; grav: number; drag: number };
type Beam = { x0: number; y0: number; x1: number; y1: number; life: number; max: number; color: string };
type Ring = { x: number; y: number; r: number; life: number; max: number; color: string };
type Proj = { x: number; y: number; tx: number; ty: number; speed: number; accel: number; kind: 'bullet' | 'rocket'; ang: number; onHit: () => void };
type Lob = { x0: number; y0: number; tx: number; ty: number; t: number; dur: number; h: number; fuse: number; blink: number; onHit: () => void; x: number; y: number; chute: boolean; small: boolean };
export type LobOpts = { chute?: boolean; fuse?: number; dur?: number; h?: number; small?: boolean };
type ShardNode = { el: HTMLElement; x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; max: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const MAX_SHARDS = 500; // total live shard nodes: keeps big cards from stalling the page

/** A styled, frozen copy of an element: computed styles are inlined (up to a node budget) so it looks the same outside its page context. */
export function cloneStyled(src: HTMLElement, r: DOMRect, nodes = 220): HTMLElement {
  const root = src.cloneNode(true) as HTMLElement;
  root.classList.remove('game-proxy'); // a shatter copy of a damaged block is debris, not a live proxy or ground
  let budget = nodes;
  const walk = (a: Element, b: Element) => {
    if (budget-- <= 0) return;
    const cs = getComputedStyle(a);
    const st = (b as HTMLElement).style;
    for (let i = 0; i < cs.length; i++) st.setProperty(cs[i], cs.getPropertyValue(cs[i]));
    for (let i = 0; i < a.children.length; i++) if (b.children[i]) walk(a.children[i], b.children[i]);
  };
  walk(src, root);
  const st = root.style;
  st.position = 'absolute'; st.left = '0'; st.top = '0'; st.right = 'auto'; st.bottom = 'auto'; st.margin = '0';
  st.width = `${r.width}px`; st.height = `${r.height}px`; st.boxSizing = 'border-box';
  st.transform = 'none'; st.translate = 'none'; st.rotate = 'none'; st.transition = 'none'; st.animation = 'none';
  st.visibility = 'visible'; st.pointerEvents = 'none';
  return root;
}

export function createFx() {
  const canvas = document.createElement('canvas');
  canvas.className = 'game-fx';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.gameUi = '1';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const size = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  size();
  addEventListener('resize', size);

  const parts: Part[] = [];
  const beams: Beam[] = [];
  const rings: Ring[] = [];
  const projs: Proj[] = [];
  const lobs: Lob[] = [];
  const shards: ShardNode[] = [];
  const destroyed = new Map<HTMLElement, string>(); // element -> its previous inline visibility
  const timers = new Set<number>();
  let raf = 0;
  let last = 0;

  const active = () => parts.length + beams.length + rings.length + projs.length + lobs.length + shards.length > 0;
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  function spark(x: number, y: number, n: number, o: { color?: string; speed?: number; angle?: number; spread?: number } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? rnd(0, Math.PI * 2)) + (o.angle === undefined ? 0 : (Math.random() - 0.5) * (o.spread ?? 0.6));
      const s = (o.speed ?? 420) * rnd(0.3, 1);
      const life = rnd(0.25, 0.6);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: 2, kind: 'spark', color: o.color ?? '#ffd27a', grav: 900, drag: 1.5 });
    }
    kick();
  }
  function smoke(x: number, y: number, n: number, spread = 20) {
    for (let i = 0; i < n; i++) {
      const life = rnd(0.8, 1.4);
      parts.push({ x: x + rnd(-spread, spread), y: y + rnd(-spread, spread), vx: rnd(-30, 30), vy: rnd(-90, -30), life, max: life, size: rnd(10, 24), kind: 'smoke', color: '', grav: 0, drag: 1 });
    }
    kick();
  }
  function flash(x: number, y: number, r: number, color: string) {
    parts.push({ x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, size: r, kind: 'glow', color, grav: 0, drag: 0 });
    kick();
  }
  function ring(x: number, y: number, r: number, color: string) { rings.push({ x, y, r, life: 0.35, max: 0.35, color }); kick(); }
  function beam(x0: number, y0: number, x1: number, y1: number, color: string, ms = 260) { beams.push({ x0, y0, x1, y1, life: ms / 1000, max: ms / 1000, color }); kick(); }
  /** Fly a bullet or rocket from (x0,y0) to (tx,ty); onHit runs on arrival. */
  function shoot(kind: 'bullet' | 'rocket', x0: number, y0: number, tx: number, ty: number, onHit: () => void) {
    projs.push({ x: x0, y: y0, tx, ty, speed: kind === 'bullet' ? 3200 : 450, accel: kind === 'bullet' ? 0 : 1500, kind, ang: Math.atan2(ty - y0, tx - x0), onHit });
    kick();
  }

  /** Lob a grenade from (x0,y0) onto (tx,ty): flies an arc, sits there blinking for the fuse, then onHit runs. */
  function lob(x0: number, y0: number, tx: number, ty: number, onHit: () => void, o: LobOpts = {}) {
    const dist = Math.hypot(tx - x0, ty - y0);
    lobs.push({ x0, y0, tx, ty, t: 0, dur: o.dur ?? Math.min(0.9, 0.35 + dist / 1400), h: o.h ?? Math.min(260, 60 + dist * 0.25), fuse: o.fuse ?? 0.5, blink: 0, onHit, x: x0, y: y0, chute: !!o.chute, small: !!o.small });
    kick();
  }

  /** A burst of fire from the muzzle along `ang`: a few glowing blobs that rise a little and fade fast. */
  function flame(x: number, y: number, ang: number) {
    for (let i = 0; i < 4; i++) {
      const a = ang + (Math.random() - 0.5) * 0.3;
      const s = rnd(380, 640);
      const life = rnd(0.25, 0.42);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: rnd(14, 30), kind: 'glow', color: Math.random() < 0.5 ? 'rgba(255,150,40,.85)' : 'rgba(255,210,90,.8)', grav: -160, drag: 2.4 });
    }
    kick();
  }

  /** Fly an existing fixed element (a knocked-loose letter) with gravity, spin and fade, then remove it. */
  function fling(el: HTMLElement, vx: number, vy: number) {
    if (shards.length >= MAX_SHARDS) { el.remove(); return; }
    const life = rnd(1.1, 1.8);
    shards.push({ el, x: 0, y: 0, vx, vy, rot: 0, vr: rnd(-9, 9), life, max: life });
    kick();
  }

  function shake() {
    const els = document.querySelectorAll('main section, .nav');
    els.forEach((e) => e.classList.add('game-shake'));
    const id = window.setTimeout(() => { timers.delete(id); els.forEach((e) => e.classList.remove('game-shake')); }, 380);
    timers.add(id);
  }

  /** Hide the element in place (no reflow) and fly a styled copy of it apart in shards, away from the hit point. */
  function shatter(el: HTMLElement, hit: { x: number; y: number }, power: number) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || destroyed.has(el)) return false;
    const want = Math.max(8, Math.min(24, Math.round((r.width * r.height) / 6000)));
    const count = shards.length + want > MAX_SHARDS ? 8 : want;
    const base = cloneStyled(el, r);
    for (const s of shardPoints(r.width, r.height, count)) {
      const wrap = document.createElement('div');
      wrap.className = 'game-shard';
      wrap.dataset.gameUi = '1';
      wrap.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;clip-path:${polyCss(s.pts)};transform-origin:${s.cx}px ${s.cy}px`;
      wrap.appendChild(base.cloneNode(true));
      document.body.appendChild(wrap);
      const dx = r.left + s.cx - hit.x;
      const dy = r.top + s.cy - hit.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = power * rnd(0.5, 1.3) * (1 - Math.min(0.7, d / 700));
      const life = rnd(1.3, 1.9);
      shards.push({ el: wrap, x: 0, y: 0, vx: (dx / d) * v + rnd(-60, 60), vy: (dy / d) * v - rnd(200, 420), rot: 0, vr: rnd(-7, 7), life, max: life });
    }
    destroyed.set(el, el.style.visibility);
    el.style.visibility = 'hidden';
    el.dataset.destroyed = '1'; // the world scan skips it, so it stops being ground
    kick();
    return true;
  }

  function tick(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      const dist = Math.hypot(p.tx - p.x, p.ty - p.y);
      const step = p.speed * dt;
      p.speed = Math.min(p.kind === 'rocket' ? 1500 : 3200, p.speed + p.accel * dt);
      if (step >= dist) { projs.splice(i, 1); p.x = p.tx; p.y = p.ty; p.onHit(); continue; }
      p.x += Math.cos(p.ang) * step;
      p.y += Math.sin(p.ang) * step;
      if (p.kind === 'rocket') { smoke(p.x - Math.cos(p.ang) * 16, p.y - Math.sin(p.ang) * 16, 1, 4); spark(p.x, p.y, 2, { angle: p.ang + Math.PI, spread: 0.5, speed: 220, color: '#ff9a3a' }); }
    }

    for (let i = lobs.length - 1; i >= 0; i--) {
      const g = lobs[i];
      if (g.t < 1) {
        g.t = Math.min(1, g.t + dt / g.dur);
        const q = arcPoint(g.x0, g.y0, g.tx, g.ty, g.t, g.h);
        g.x = q.x; g.y = q.y;
      } else {
        g.fuse -= dt; g.blink += dt;
        if (g.fuse <= 0) { lobs.splice(i, 1); g.onHit(); }
      }
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'source-over';
    for (const p of parts) {
      if (p.kind !== 'smoke') continue;
      const a = p.life / p.max;
      ctx.fillStyle = `rgba(150,150,160,${(a * 0.35).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 1.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const a = p.life / p.max;
      if (p.kind === 'spark') {
        ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
      } else if (p.kind === 'glow') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = a; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.life -= dt;
      if (b.life <= 0) { beams.splice(i, 1); continue; }
      const a = b.life / b.max;
      for (const [w, al, col] of [[16, 0.25, b.color], [7, 0.55, b.color], [2.5, 1, '#ffffff']] as const) {
        ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w * (0.5 + a * 0.5);
        ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      g.life -= dt;
      if (g.life <= 0) { rings.splice(i, 1); continue; }
      const a = g.life / g.max;
      ctx.globalAlpha = a; ctx.strokeStyle = g.color; ctx.lineWidth = 6 * a + 1;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r * (1 - a * a), 0, Math.PI * 2); ctx.stroke();
    }
    for (const g of lobs) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const br = g.small ? 5 : g.chute ? 11 : 9;
      if (g.chute && g.t < 1) { // parachute: a canopy above the bomb, with cords
        ctx.fillStyle = '#ff5ea8'; ctx.beginPath(); ctx.arc(g.x, g.y - 36, 28, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
        for (const dx of [-28, -10, 10, 28]) { ctx.beginPath(); ctx.moveTo(g.x + dx, g.y - 36); ctx.lineTo(g.x, g.y - br); ctx.stroke(); }
      }
      ctx.fillStyle = g.chute ? '#7a2250' : '#3b4a3a'; ctx.beginPath(); ctx.arc(g.x, g.y, br, 0, Math.PI * 2); ctx.fill();
      if (!g.small) { ctx.fillStyle = '#1d261d'; ctx.fillRect(g.x - 3, g.y - br - 4, 6, 5); }
      if (g.t >= 1 && Math.floor(g.blink * 12) % 2 === 0) { ctx.fillStyle = '#ff3b2e'; ctx.beginPath(); ctx.arc(g.x, g.y, g.small ? 2.5 : 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter';
    }
    for (const p of projs) {
      ctx.globalAlpha = 1;
      if (p.kind === 'bullet') {
        ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(p.ang) * 60, p.y - Math.sin(p.ang) * 60); ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
        g.addColorStop(0, 'rgba(255,200,120,.9)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#e8edf2'; ctx.fillRect(-12, -4, 20, 8);
        ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(16, 0); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
        ctx.restore(); ctx.globalCompositeOperation = 'lighter';
      }
    }
    ctx.globalAlpha = 1;

    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.life -= dt;
      if (s.life <= 0) { s.el.remove(); shards.splice(i, 1); continue; }
      s.vy += 1700 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      s.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) rotate(${s.rot.toFixed(3)}rad)`;
      s.el.style.opacity = String(Math.min(1, (s.life / s.max) / 0.35));
    }

    raf = active() ? requestAnimationFrame(tick) : 0;
  }

  function restoreAll() {
    destroyed.forEach((prev, el) => { delete el.dataset.destroyed; if (prev) el.style.visibility = prev; else el.style.removeProperty('visibility'); });
    destroyed.clear();
  }

  function dispose() {
    cancelAnimationFrame(raf);
    raf = 0;
    removeEventListener('resize', size);
    timers.forEach(clearTimeout);
    document.querySelectorAll('.game-shake').forEach((e) => e.classList.remove('game-shake'));
    shards.forEach((s) => s.el.remove());
    shards.length = 0;
    canvas.remove();
    restoreAll();
  }

  return { spark, smoke, flash, ring, beam, shoot, lob, flame, shake, shatter, fling, restoreAll, dispose };
}

export type Fx = ReturnType<typeof createFx>;
