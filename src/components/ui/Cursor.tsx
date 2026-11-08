'use client';

import { useEffect, useRef, useState } from 'react';

// Fine pointers only, and no motion for reduced-motion users.
export function Cursor() {
  const [on, setOn] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    queueMicrotask(() => setOn(true)); // pointer capability is an external fact, read after mount

    let x = -100, y = -100, gx = x, gy = y, raf = 0;
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; };
    const tick = () => {
      gx += (x - gx) * 0.2;
      gy += (y - gy) * 0.2;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      if (glow.current) glow.current.style.transform = `translate3d(${gx}px,${gy}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
    };
  }, []);

  if (!on) return null;

  const base = { position: 'fixed', left: 0, top: 0, pointerEvents: 'none', zIndex: 9999, borderRadius: '50%' } as const;
  return (
    <>
      <div ref={glow} aria-hidden="true" style={{ ...base, width: 32, height: 32, background: 'radial-gradient(circle, rgba(125,211,252,.35), transparent 70%)' }} />
      <div ref={dot} aria-hidden="true" style={{ ...base, width: 6, height: 6, background: '#7dd3fc', boxShadow: '0 0 8px #7dd3fc' }} />
    </>
  );
}
