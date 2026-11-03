// Platform physics for the robot pet. Coordinates are page (document) pixels.

export type Plat = { top: number; left: number; right: number };

export const GRAVITY = 2600; // px/s²

/** The visible platform (top edge between viewTop and viewBottom) closest to the robot's height, or -1. */
export function pickPlatform(plats: Plat[], viewTop: number, viewBottom: number, y: number): number {
  let best = -1;
  let dist = Infinity;
  plats.forEach((p, i) => {
    if (p.top < viewTop || p.top > viewBottom) return;
    const d = Math.abs(p.top - y);
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}

/** Upward launch speed that clears `rise` px with some headroom. */
export function jumpSpeed(rise: number): number {
  return -Math.sqrt(2 * GRAVITY * (Math.max(rise, 0) + 40));
}
