'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { PLANETS } from '@/lib/sceneConfig';
import { clampProgress, progressForPlanet } from '@/lib/journey';

gsap.registerPlugin(ScrollTrigger);

const emit = (p: number) =>
  window.dispatchEvent(new CustomEvent('journey:progress', { detail: { p: clampProgress(p) } }));

/** Smooth scroll (Lenis) plus one master timeline scrubbed 0..1 over the page. Renders nothing. */
export function ScrollJourney() {
  useEffect(() => {
    // Reduced motion: static scene, no smooth scroll, no scrub.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ autoRaf: false });
    lenis.on('scroll', () => ScrollTrigger.update());
    const tick = (t: number) => lenis.raf(t * 1000); // gsap ticks in seconds, Lenis wants ms
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // keep Lenis and ScrollTrigger in step on slow frames

    const ctx = gsap.context(() => {
      const state = { p: 0 };
      const tl = gsap.timeline({
        scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true },
      });
      tl.to(state, { p: 1, ease: 'none', duration: 1, onUpdate: () => emit(state.p) });
      // Labels let each planet section line up with its share of the timeline.
      PLANETS.forEach((planet, i) => tl.addLabel(planet.id, progressForPlanet(i, PLANETS.length)));
    });

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}
