'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power3.out';

function splitLines(el: HTMLElement): HTMLElement[] {
  const text = el.textContent?.trim() ?? '';
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const words = text.split(/\s+/).map((w, i, a) => {
    const s = document.createElement('span');
    s.style.display = 'inline-block';
    s.textContent = w;
    el.append(s, i < a.length - 1 ? ' ' : '');
    return s;
  });
  const rows: HTMLElement[][] = [];
  let top = -1;
  for (const w of words) {
    if (w.offsetTop !== top) { top = w.offsetTop; rows.push([]); }
    rows[rows.length - 1].push(w);
  }
  el.textContent = '';
  return rows.map((row) => {
    const mask = document.createElement('span');
    mask.setAttribute('aria-hidden', 'true');
    mask.style.display = 'block';
    mask.style.overflow = 'hidden';
    const inner = document.createElement('span');
    inner.style.display = 'block';
    inner.textContent = row.map((w) => w.textContent).join(' ');
    mask.append(inner);
    el.append(mask);
    return inner;
  });
}

export function Motion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const originals: [HTMLElement, string][] = [];
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
        originals.push([el, el.innerHTML]);
        const lines = splitLines(el);
        gsap.set(lines, { yPercent: 100 });
        gsap.to(lines, {
          yPercent: 0, duration: 0.9, stagger: 0.08, ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });

      const ups = gsap.utils.toArray<HTMLElement>('[data-reveal="up"]');
      if (ups.length) {
        gsap.set(ups, { opacity: 0, y: 24 });
        ScrollTrigger.batch(ups, {
          start: 'top 90%', once: true,
          onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: EASE }),
        });
      }

      if (window.matchMedia('(pointer: fine)').matches) {
        gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((el) => {
          const x = gsap.quickTo(el, 'x', { duration: 0.4, ease: EASE });
          const y = gsap.quickTo(el, 'y', { duration: 0.4, ease: EASE });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            x(gsap.utils.clamp(-8, 8, (e.clientX - r.left - r.width / 2) * 0.3));
            y(gsap.utils.clamp(-8, 8, (e.clientY - r.top - r.height / 2) * 0.3));
          };
          const leave = () => { x(0); y(0); };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerleave', leave);
        });
      }

      const links = gsap.utils.toArray<HTMLAnchorElement>('#nav-links a[href^="#"]');
      links.forEach((a) => {
        const target = document.querySelector(a.getAttribute('href')!);
        if (!target) return;
        const set = () => {
          links.forEach((l) => l.removeAttribute('aria-current'));
          a.setAttribute('aria-current', 'true');
        };
        ScrollTrigger.create({
          trigger: target, start: 'top 50%', end: 'bottom 50%',
          onEnter: set, onEnterBack: set,
          onLeave: () => a.removeAttribute('aria-current'),
          onLeaveBack: () => a.removeAttribute('aria-current'),
        });
      });
    });
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      ctx.revert();
      originals.forEach(([el, html]) => { el.innerHTML = html; el.removeAttribute('aria-label'); });
    };
  }, []);
  return null;
}
