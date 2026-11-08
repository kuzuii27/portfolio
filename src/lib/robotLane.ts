// Robot lane: keep the robot's box off every visible text element.

export type Box = { l: number; t: number; r: number; b: number };

const hit = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const grow = (b: Box, m: number): Box => ({ l: b.l - m, t: b.t - m, r: b.r + m, b: b.b + m });

/** Box of size (bw x bh) centred on (cx, cy). */
export const boxAt = (cx: number, cy: number, bw: number, bh: number): Box => ({ l: cx - bw / 2, t: cy - bh / 2, r: cx + bw / 2, b: cy + bh / 2 });

export const overlaps = (box: Box, texts: Box[], margin = 6) => texts.some((t) => hit(box, grow(t, margin)));

/**
 * Nearest free centre to the wanted one. Tries the wanted spot, then rings of offsets (sideways first),
 * clamped to the viewport. `free` is false when nothing fits: the caller then dims the robot.
 */
export function freeSpot(want: { x: number; y: number }, bw: number, bh: number, texts: Box[], vw: number, vh: number) {
  const clampX = (x: number) => Math.min(vw - bw / 2 - 4, Math.max(bw / 2 + 4, x));
  const clampY = (y: number) => Math.min(vh - bh / 2 - 4, Math.max(bh / 2 + 70, y)); // 70: below the sticky nav
  const tryAt = (x: number, y: number) => {
    const cx = clampX(x);
    const cy = clampY(y);
    return overlaps(boxAt(cx, cy, bw, bh), texts) ? null : { x: cx, y: cy, free: true };
  };
  const first = tryAt(want.x, want.y);
  if (first) return first;
  const step = Math.max(24, bw / 3);
  for (let ring = 1; ring <= 14; ring++) {
    const d = ring * step;
    const cands: [number, number][] = [
      [want.x + d, want.y], [want.x - d, want.y], [want.x, want.y - d], [want.x, want.y + d],
      [want.x + d, want.y - d], [want.x - d, want.y - d], [want.x + d, want.y + d], [want.x - d, want.y + d],
    ];
    for (const [x, y] of cands) {
      const hitSpot = tryAt(x, y);
      if (hitSpot) return hitSpot;
    }
  }
  return { x: clampX(want.x), y: clampY(want.y), free: false };
}

const inView = (r: DOMRect, vw: number, vh: number) => r.width >= 2 && r.height >= 2 && r.bottom >= 0 && r.top <= vh && r.right >= 0 && r.left <= vw;

/** Rects of readable things in view. Copy uses its real line boxes (ragged edges leave free space); controls use their own box. */
export function visibleTextBoxes(root: ParentNode, vw: number, vh: number): Box[] {
  const out: Box[] = [];
  const push = (r: DOMRect) => { if (inView(r, vw, vh)) out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom }); };
  root.querySelectorAll('a,button,.btn,.pill,.chips li').forEach((el) => push(el.getBoundingClientRect()));
  root.querySelectorAll('.viz svg text').forEach((el) => push(el.getBoundingClientRect())); // case-study diagram labels
  document.querySelectorAll('.progress-track, .progress-dot').forEach((el) => push(el.getBoundingClientRect())); // fixed rail lives outside <main>
  const range = document.createRange();
  root.querySelectorAll('h1,h2,h3,p,dt,dd,li:not(.chips li),.lede').forEach((el) => {
    if (!inView(el.getBoundingClientRect(), vw, vh)) return;
    range.selectNodeContents(el);
    for (const r of Array.from(range.getClientRects())) push(r);
  });
  return out;
}
