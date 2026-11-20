// Pure helpers and shared state for the destroy-the-site game (see docs/superpowers/specs/2026-11-20-destroy-site-game-design.md, v2).

export type Gun = 'pistol' | 'laser' | 'rocket';
export const GUNS: readonly Gun[] = ['pistol', 'laser', 'rocket'];

/** Shared mutable state: GameMode writes gun/aim/shots, RobotShip reads them each frame and writes the muzzle position (viewport px). */
export const gameState = { gun: null as Gun | null, aim: { x: 0, y: 0 }, muzzle: { x: 0, y: 0 }, shots: 0 };

/** What a shot can destroy: text, controls, media and the blocks (cards) that hold them. Whole-page sections are filtered by size in GameMode. */
export const BREAKABLE = 'a,button,.btn,.pill,h1,h2,h3,p,li,dt,dd,img,svg,input,textarea,.facts,.sys-card,.glass,article,form,section';

type Closest = { closest(sel: string): unknown };

/** The game's own controls and the robot are never targets. */
export const isGameUi = (el: Closest | null) => !!el?.closest('[data-game-ui], .space-bot');

/** Where a ray from (x0,y0) through (x1,y1) leaves the viewport. A zero-length ray returns its own point. */
export function extendToEdge(x0: number, y0: number, x1: number, y1: number, w: number, h: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (dx === 0 && dy === 0) return { x: x0, y: y0 };
  const tx = dx > 0 ? (w - x0) / dx : dx < 0 ? -x0 / dx : Infinity;
  const ty = dy > 0 ? (h - y0) / dy : dy < 0 ? -y0 / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: x0 + dx * t, y: y0 + dy * t };
}

/** Points along a line every `step` px, both ends included. */
export function alongLine(x0: number, y0: number, x1: number, y1: number, step: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len === 0) return [{ x: x0, y: y0 }];
  const n = Math.max(1, Math.ceil(len / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
}

export type Shard = { pts: [number, number][]; cx: number; cy: number };

/** Cuts a w x h box into jittered triangles (about n of them) that tile it exactly. Boundary vertices stay put, so nothing leaks past the box. */
export function shardPoints(w: number, h: number, n: number, rnd: () => number = Math.random): Shard[] {
  const cols = Math.max(1, Math.round(Math.sqrt((n / 2) * (w / Math.max(h, 1)))));
  const rows = Math.max(1, Math.round(n / 2 / cols));
  const cw = w / cols;
  const ch = h / rows;
  const grid = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols + 1 }, (_, c): [number, number] => {
      const edgeX = c === 0 || c === cols;
      const edgeY = r === 0 || r === rows;
      return [c * cw + (edgeX ? 0 : (rnd() - 0.5) * cw * 0.6), r * ch + (edgeY ? 0 : (rnd() - 0.5) * ch * 0.6)];
    }),
  );
  const out: Shard[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = grid[r][c], b = grid[r][c + 1], d = grid[r + 1][c], e = grid[r + 1][c + 1];
      const tris: [number, number][][] = (r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      for (const pts of tris) out.push({ pts, cx: (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy: (pts[0][1] + pts[1][1] + pts[2][1]) / 3 });
    }
  }
  return out;
}

export const polyCss = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;

type Flight = { x: number; y: number; vx: number; vy: number };

/** One physics step of the robot's W/A/S/D flight: acceleration, drag, speed cap, clamped to the screen (velocity zeroed on contact). */
export function flightStep(s: Flight, dir: { x: number; y: number }, dt: number, b: { w: number; h: number; mx: number; my: number }): Flight {
  const A = 2800;
  const MAX = 560;
  const len = Math.hypot(dir.x, dir.y);
  let vx = s.vx;
  let vy = s.vy;
  if (len === 0) {
    const k = Math.exp(-6 * dt);
    vx *= k;
    vy *= k;
  } else {
    const k = Math.exp(-1.2 * dt);
    vx = (vx + (dir.x / len) * A * dt) * k;
    vy = (vy + (dir.y / len) * A * dt) * k;
  }
  const sp = Math.hypot(vx, vy);
  if (sp > MAX) { vx = (vx / sp) * MAX; vy = (vy / sp) * MAX; }
  let x = s.x + vx * dt;
  let y = s.y + vy * dt;
  if (x < b.mx) { x = b.mx; vx = 0; } else if (x > b.w - b.mx) { x = b.w - b.mx; vx = 0; }
  if (y < b.my) { y = b.my; vy = 0; } else if (y > b.h - b.my) { y = b.h - b.my; vy = 0; }
  return { x, y, vx, vy };
}
