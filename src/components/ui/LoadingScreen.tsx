'use client';

import { useEffect, useState } from 'react';

const LINES = ['BOOT SEQUENCE INITIATED', 'CHECKING SERVOS', 'CALIBRATING SENSORS', 'LOADING ASSETS', 'SYSTEMS ONLINE'];
const TIMEOUT = 2500;

// Hides on window load or after TIMEOUT, whichever comes first.
export function LoadingScreen() {
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const start = performance.now();
    let done = false;
    let raf = 0;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      setPct(100);
      setShow(false);
    };
    const tick = () => {
      if (done) return;
      setPct(Math.min(95, Math.round(((performance.now() - start) / TIMEOUT) * 100)));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    const timer = setTimeout(finish, TIMEOUT);
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('load', finish);
    };
  }, []);

  if (!show) return null;

  const filled = Math.round(pct / 5);
  const line = LINES[Math.min(LINES.length - 1, Math.floor((pct / 100) * LINES.length))];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: '#000', color: '#7dd3fc',
        fontFamily: 'monospace', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'flex-start', padding: '0 10vw', gap: 8,
      }}
    >
      <div>{line}</div>
      <div>[{'#'.repeat(filled)}{'.'.repeat(20 - filled)}] {pct}%</div>
    </div>
  );
}
