// Robot patrol: while a section is in focus the robot flies a slow loop in its free gutter instead of
// tracking the planet. Between sections it takes a short curved hop. Everything is a pure function of
// (time, focus, planet pose), so reverse scrubbing and tests are straightforward.

export type P = { x: number; y: number };
const TAU = Math.PI * 2;

/** Lissajous-style loop around `home`: wide on x, gentle on y, never stands still. */
export function patrol(t: number, home: P, rx: number, ry: number, seed = 0): P {
  const a = t * 0.35 + seed * 1.7;
  return { x: home.x + Math.sin(a) * rx + Math.sin(a * 2.3 + 1) * rx * 0.18, y: home.y + Math.sin(a * 1.4 + seed) * ry + Math.cos(a * 0.6) * ry * 0.3 };
}

/** Home point for a section: the gutter beside the planet, toward screen centre, clear of its disc. */
export function homeBeside(planet: P & { scale: number }, vw: number, vh: number, bw: number): P {
  const towardCentre = planet.x > vw / 2 ? -1 : 1;
  const x = planet.x + towardCentre * (planet.scale * 1.25 + bw * 0.55);
  return { x: Math.min(vw - bw, Math.max(bw, x)), y: Math.min(vh * 0.78, Math.max(vh * 0.28, planet.y)) };
}

/** Quadratic bezier hop from a to b with a lifted control point (the arc). */
export function hop(a: P, b: P, t: number, lift: number): P {
  const u = 1 - t;
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift };
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

export const wrapPhase = (t: number) => ((t % TAU) + TAU) % TAU;
