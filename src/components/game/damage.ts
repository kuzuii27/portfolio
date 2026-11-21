import { cloneStyled, type Fx } from '@/components/game/fx';
import { hpFor, maskForHoles, meterOf, nearestWithin } from '@/lib/damage';

// Gradual destruction (P3). The first hit on an element swaps it for a "proxy": a styled copy placed over it in document coordinates, with every letter in its own span.
// Hits knock letters loose (they fly), punch holes (CSS masks) and use up hit points; at zero the rest shatters. The original is only hidden, never changed, so restore() is exact.

type Hole = { x: number; y: number; r: number };
type Proxy = { orig: HTMLElement; root: HTMLElement; prev: string; hp: number; holes: Hole[]; letters: HTMLElement[]; left: number; gone: boolean };
export type HitOpts = { radius: number; dmg: number; power: number };

const MEDIA = 'img,svg';
const MEDIA_WEIGHT = 25; // a picture or diagram counts like this many letters on the meter
const MAX_LETTERS = 1500; // per proxy: keeps huge cards cheap
const MAX_FLUNG = 80; // letters knocked loose by one hit

/** Letters and media in <main> that are really on the page: the denominator of the meter. */
function countTotal() {
  const main = document.querySelector('main');
  if (!main) return 0;
  let n = 0;
  const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const par = t.parentElement;
    if (!par || par.closest('svg,dialog,script,style,noscript,[data-game-ui],.space-bot') || !par.getClientRects().length) continue;
    n += (t.textContent ?? '').replace(/\s/g, '').length;
  }
  main.querySelectorAll(MEDIA).forEach((m) => { if (!m.closest('dialog') && m.getClientRects().length) n += MEDIA_WEIGHT; });
  return n;
}

/** Wraps every non-space character of the copy in its own span (HTML text only, never SVG or form fields). */
function wrapLetters(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const nodes: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const par = t.parentElement;
    // skip text that is already hidden in this copy (a destroyed child): wrapping it would let ghost letters fly
    if (par && !par.closest('svg,script,style,textarea,[style*="visibility: hidden"]')) nodes.push(t as Text);
  }
  for (const t of nodes) {
    const s = t.textContent ?? '';
    if (!/\S/.test(s)) continue;
    const frag = document.createDocumentFragment();
    for (const ch of s) {
      if (/\s/.test(ch) || out.length >= MAX_LETTERS) frag.appendChild(document.createTextNode(ch));
      else {
        const sp = document.createElement('span');
        sp.textContent = ch;
        frag.appendChild(sp);
        out.push(sp);
      }
    }
    t.replaceWith(frag);
  }
  return out;
}

export function createDamage(fx: Fx, onMeter: (p: number) => void) {
  const byOrig = new Map<HTMLElement, Proxy>();
  const byRoot = new Map<Element, Proxy>();
  const total = countTotal();
  let done = 0;

  function make(orig: HTMLElement): Proxy | null {
    const r = orig.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    const root = cloneStyled(orig, r, 600);
    root.removeAttribute('id');
    root.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id')); // the copy must not duplicate anchors
    root.classList.add('game-proxy');
    root.style.left = `${r.left + scrollX}px`;
    root.style.top = `${r.top + scrollY}px`;
    root.style.zIndex = '5';
    root.style.pointerEvents = 'auto'; // so elementsFromPoint finds it
    root.style.setProperty('mask-composite', 'intersect');
    root.style.setProperty('-webkit-mask-composite', 'source-in');
    const letters = wrapLetters(root);
    document.body.appendChild(root);
    const p: Proxy = { orig, root, prev: orig.style.visibility, hp: hpFor(r.width, r.height), holes: [], letters, left: letters.length, gone: false };
    orig.style.visibility = 'hidden';
    orig.dataset.destroyed = '1'; // the world scan skips it
    byOrig.set(orig, p);
    byRoot.set(root, p);
    return p;
  }

  function fling(s: HTMLElement, q: DOMRect, from: { x: number; y: number }, power: number) {
    const cs = getComputedStyle(s);
    const fill = cs.getPropertyValue('-webkit-text-fill-color');
    const d = document.createElement('div');
    d.className = 'game-shard';
    d.textContent = s.textContent;
    d.style.cssText = `left:${q.left}px;top:${q.top}px;font:${cs.font};line-height:${q.height}px;white-space:pre;color:${fill && !/rgba\(0, 0, 0, 0\)|transparent/.test(fill) ? fill : /rgba\(0, 0, 0, 0\)|transparent/.test(cs.color) ? '#eee' : cs.color}`;
    document.body.appendChild(d);
    const dx = q.left + q.width / 2 - from.x;
    const dy = q.top + q.height / 2 - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const v = power * (0.5 + Math.random() * 0.8);
    fx.fling(d, (dx / dist) * v + (Math.random() - 0.5) * 80, (dy / dist) * v - 200 - Math.random() * 300);
  }

  function retire(p: Proxy) {
    p.root.remove();
    byRoot.delete(p.root);
    p.gone = true;
  }

  function finish(p: Proxy, pt: { x: number; y: number }, power: number) {
    const visible = p.letters.filter((s) => getComputedStyle(s).visibility === 'visible').length;
    done += visible + p.root.querySelectorAll(MEDIA).length * MEDIA_WEIGHT;
    fx.shatter(p.root, pt, power);
    retire(p);
  }

  /** Damage `el` at viewport point `pt`: knocks loose the letters within o.radius, punches a hole, and shatters the rest when its hit points run out. */
  function hit(el: HTMLElement, pt: { x: number; y: number }, o: HitOpts) {
    let p = byOrig.get(el);
    if (p?.gone) return;
    p ??= make(el) ?? undefined;
    if (!p) return;
    const vis = p.letters.filter((s) => s.style.visibility !== 'hidden');
    const rects = vis.map((s) => s.getBoundingClientRect());
    const centers = rects.map((q) => ({ x: q.left + q.width / 2, y: q.top + q.height / 2 }));
    for (const i of nearestWithin(centers, pt, o.radius, MAX_FLUNG)) {
      fling(vis[i], rects[i], pt, o.power);
      vis[i].style.visibility = 'hidden';
      p.left--;
      done++;
    }
    const rr = p.root.getBoundingClientRect();
    p.holes.push({ x: pt.x - rr.left, y: pt.y - rr.top, r: Math.min(70, 10 + o.dmg * 7) });
    const m = maskForHoles(p.holes);
    p.root.style.maskImage = m;
    p.root.style.setProperty('-webkit-mask-image', m);
    p.hp -= o.dmg;
    if (p.hp <= 0) finish(p, pt, o.power);
    else if (p.letters.length && p.left <= 0 && !p.root.querySelector(MEDIA)) retire(p); // nothing left to see
    onMeter(meterOf(done, total));
  }

  /** The original element behind a proxy part (so shots at a damaged block keep hitting that block). */
  function proxyFor(e: Element): HTMLElement | null {
    const r = e.closest('.game-proxy');
    return r ? (byRoot.get(r)?.orig ?? null) : null;
  }

  function restore() {
    byOrig.forEach((p) => {
      p.root.remove();
      if (p.prev) p.orig.style.visibility = p.prev;
      else p.orig.style.removeProperty('visibility');
      delete p.orig.dataset.destroyed;
    });
    byOrig.clear();
    byRoot.clear();
    done = 0;
    onMeter(0);
  }

  return { hit, proxyFor, restore };
}

export type Damage = ReturnType<typeof createDamage>;
