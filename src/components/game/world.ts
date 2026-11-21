import type { Box } from '@/lib/robotLane';

// What the player can stand on, read from the live page. Rects are in DOCUMENT px (viewport rect + scrollY) so they stay put while the camera scrolls.

const TEXT = 'main h1,main h2,main h3,main p,main dt,main dd,main li';
const BLOCK = 'main a,main button,main .btn,main .pill,main img,main .facts,main .sys-card,main .glass';
const SKIP = '[data-destroyed],[data-game-ui],.space-bot,.nav,.progress-track,dialog'; // destroyed things stop being ground

/** Rects of text lines and blocks whose vertical span touches [from, to] (document px). */
export function pageRects(from: number, to: number): Box[] {
  const sy = scrollY;
  const out: Box[] = [];
  const push = (r: DOMRect) => {
    if (r.width < 2 || r.height < 2 || r.bottom + sy < from || r.top + sy > to) return;
    out.push({ l: r.left, t: r.top + sy, r: r.right, b: r.bottom + sy });
  };
  const range = document.createRange();
  document.querySelectorAll(TEXT).forEach((el) => {
    if (el.closest(SKIP)) return;
    const r = el.getBoundingClientRect();
    if (r.bottom + sy < from || r.top + sy > to) return;
    range.selectNodeContents(el);
    for (const q of Array.from(range.getClientRects())) push(q); // real line boxes: ragged text leaves gaps to fall through
  });
  document.querySelectorAll(BLOCK).forEach((el) => { if (!el.closest(SKIP)) push(el.getBoundingClientRect()); });
  document.querySelectorAll('.game-proxy').forEach((el) => push(el.getBoundingClientRect())); // a damaged block is still ground until it breaks
  return out;
}
