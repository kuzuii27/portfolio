'use client';

import { useEffect } from 'react';

// Toggles 'nav-hidden' on the .nav element: hidden on scroll down, shown on scroll up.
export function NavAutoHide() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.nav');
    if (!nav) return;

    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      // Only hide once past the nav itself, so the top of the page never hides it.
      if (y > last && y > nav.offsetHeight) nav.classList.add('nav-hidden');
      else if (y < last) nav.classList.remove('nav-hidden');
      last = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      nav.classList.remove('nav-hidden');
    };
  }, []);

  return null;
}
