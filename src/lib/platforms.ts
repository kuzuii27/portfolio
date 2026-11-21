import type { Platform } from '@/lib/platformer';

type Rect = { l: number; t: number; r: number; b: number };

const MIN_W = 24; // narrower rects are not worth standing on
const ROW = 4; // tops within this many px are the same row
const GAP = 12; // line boxes closer than this on one row join into one ledge

/** Turns the page's visible text lines, buttons and images (viewport rects) into one-way platforms: the top edge of each rect, merged along rows. Sorted top to bottom. */
export function platformsFromRects(rects: Rect[], vw: number, vh: number): Platform[] {
  const rows = new Map<number, Platform[]>();
  for (const q of rects) {
    if (q.r - q.l < MIN_W || q.b < 0 || q.t > vh || q.r < 0 || q.l > vw) continue;
    const key = Math.round(q.t / ROW);
    (rows.get(key) ?? rows.set(key, []).get(key)!).push({ l: q.l, r: q.r, t: q.t });
  }
  const out: Platform[] = [];
  for (const list of rows.values()) {
    list.sort((a, b) => a.l - b.l);
    let cur = { ...list[0] };
    for (const q of list.slice(1)) {
      if (q.l <= cur.r + GAP) { cur.r = Math.max(cur.r, q.r); cur.t = Math.min(cur.t, q.t); }
      else { out.push(cur); cur = { ...q }; }
    }
    out.push(cur);
  }
  return out.sort((a, b) => a.t - b.t || a.l - b.l);
}
