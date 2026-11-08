// Planet journey: one pure function maps scroll focus f (0..N-1) to each planet's screen pose.
// Every planet travels the same way: waits small on the left, swipes right as it grows to focus,
// then keeps going right, swelling a little and fading out the far side.

export type Pose = { x: number; y: number; scale: number; opacity: number; depth: number };

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export type Frame = { w: number; h: number };

// Viewport fractions. Waiting is small and low-left, focus is large on the right, exit is past the right edge.
const WAIT = { x: 0.1, y: 0.8, r: 0.08 };
const FOCUS = { x: 0.78, y: 0.5, r: 0.34 };
const EXIT = { x: 1.18, y: 0.34, r: 0.42 };

/** d = f - i: -1 waiting, 0 focused, +1 exited. Beyond that the planet is hidden. */
export function planetPose(i: number, f: number, { w, h }: Frame): Pose {
  const d = f - i;
  const narrow = w < 768;
  // narrow screens: smaller radii, focus pulled toward the edge so copy stays clear
  const k = narrow ? 0.7 : 1;
  const focusX = narrow ? 0.86 : FOCUS.x;
  let x: number, y: number, r: number, opacity: number;
  if (d <= 0) {
    const t = smooth(clamp(d + 1));
    x = lerp(WAIT.x, focusX, t);
    y = lerp(WAIT.y, FOCUS.y, t);
    r = lerp(WAIT.r, FOCUS.r, t);
    // fades in over the whole step before it starts waiting (d -2..-1), then rises to full as it swipes in
    opacity = smooth(clamp(d + 2)) * lerp(0.9, 1, t);
  } else {
    const t = smooth(clamp(d));
    x = lerp(focusX, EXIT.x, t);
    y = lerp(FOCUS.y, EXIT.y, t);
    r = lerp(FOCUS.r, EXIT.r, t);
    opacity = 1 - t;
  }
  // hidden more than two steps ahead or past the exit
  if (d < -2 || d > 1) opacity = 0;
  const minSide = Math.min(w, h);
  // farther planets (waiting) move less than near ones: the x lerp above is the parallax; depth orders them
  return { x: x * w, y: y * h, scale: r * (narrow ? Math.min(w * 1.1, minSide) : h) * k, opacity, depth: -Math.abs(d) };
}

/** Text-aware dimming: planets are pushed back while they sit behind the copy column. */
export function dimBehindCopy(pose: Pose, copyRight: number): number {
  // copyRight = right edge (px) of the text column; planet disc left edge = x - scale
  const overlap = clamp((copyRight - (pose.x - pose.scale)) / Math.max(1, pose.scale * 2));
  return 1 - overlap * 0.55;
}
