import { makeCracks, makeRock } from '@/components/space/Meteor';

// The exit / refresh finale: a huge meteor hits the whole page, a white flash hides the swap back to normal, then the cracks fade.

const SIZE = 420; // px, the rock is several times bigger than a normal meteor
const IMPACT_MS = 900;
const PEAK_MS = IMPACT_MS + 200; // the flash is fully white here: swap the page behind it
const FADE_AT_MS = IMPACT_MS + 1100;
const FADE_MS = 700;

export type CrashOpts = { onImpact?: () => void; onPeak?: () => void; onDone?: () => void };

export function playCrash(o: CrashOpts = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { o.onPeak?.(); o.onDone?.(); return; }
  const r = makeRock();
  const { d } = makeCracks({ ...r, size: 80 }); // 80 svg units is this rock's size on screen
  const wrap = document.createElement('div');
  wrap.className = 'game-crash';
  wrap.dataset.gameUi = '1'; // blocks clicks and is never a target while it plays
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    `<svg class="crash-crack" viewBox="-220 -220 440 440"><path class="crack-dark" d="${d}"/><path class="crack-lite" d="${d}"/></svg>` +
    `<span class="crash-rock" style="width:${SIZE}px;height:${SIZE}px;margin:${-SIZE / 2}px 0 0 ${-SIZE / 2}px"><span class="crash-tail"></span><i style="clip-path:${r.clip};background:${r.fill}"></i></span>` +
    '<div class="crash-flash"></div>';
  document.body.appendChild(wrap);
  const rock = wrap.querySelector('.crash-rock') as HTMLElement;
  const tail = wrap.querySelector('.crash-tail') as HTMLElement;
  const crack = wrap.querySelector('.crash-crack') as SVGElement;
  const flash = wrap.querySelector('.crash-flash') as HTMLElement;
  crack.style.opacity = '0';
  rock.animate([{ transform: 'translate(55vw,-85vh) scale(.35)' }, { transform: 'translate(0,0) scale(1)' }], { duration: IMPACT_MS, easing: 'cubic-bezier(.55,0,.85,.5)', fill: 'forwards' });
  tail.animate([{ opacity: 1 }, { opacity: 1, offset: 0.97 }, { opacity: 0 }], { duration: IMPACT_MS + 40, fill: 'forwards' });
  window.setTimeout(() => {
    o.onImpact?.();
    crack.animate([{ clipPath: 'circle(0%)', opacity: 1 }, { clipPath: 'circle(75%)', opacity: 1 }], { duration: 260, fill: 'forwards' });
    flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
    const els = document.querySelectorAll('main section, .nav');
    els.forEach((e) => e.classList.add('game-shake'));
    window.setTimeout(() => els.forEach((e) => e.classList.remove('game-shake')), 400);
  }, IMPACT_MS);
  window.setTimeout(() => o.onPeak?.(), PEAK_MS);
  window.setTimeout(() => wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' }), FADE_AT_MS);
  window.setTimeout(() => { wrap.remove(); o.onDone?.(); }, FADE_AT_MS + FADE_MS + 50);
}
