// Pure helpers for the destroy game's damage model (P3). The DOM side lives in components/game/damage.ts.

export const MAX_HOLES = 10;

/** Hit points of a block: bigger blocks take more shots. */
export const hpFor = (w: number, h: number) => Math.min(30, Math.max(2, (w * h) / 5000));

/** Indices of `pts` within `radius` of `c`, nearest first, at most `cap`. */
export function nearestWithin(pts: { x: number; y: number }[], c: { x: number; y: number }, radius: number, cap: number): number[] {
  return pts
    .map((p, i) => ({ i, d: Math.hypot(p.x - c.x, p.y - c.y) }))
    .filter((o) => o.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, cap)
    .map((o) => o.i);
}

/** Destruction meter 0..1. */
export const meterOf = (done: number, total: number) => (total <= 0 ? 0 : Math.max(0, Math.min(1, done / total)));

/** CSS mask-image for a block with holes: one transparent circle per hole (use with mask-composite: intersect). Only the newest MAX_HOLES count. */
export const maskForHoles = (holes: { x: number; y: number; r: number }[]) =>
  holes.slice(-MAX_HOLES).map((h) => `radial-gradient(circle at ${h.x}px ${h.y}px,transparent ${h.r}px,#000 ${h.r + 1}px)`).join(',');
