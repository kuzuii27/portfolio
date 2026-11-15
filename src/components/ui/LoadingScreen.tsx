'use client';

import { useEffect, useRef, useState } from 'react';
import { RobotLoader } from '@/components/ui/loader/RobotLoader';
import { ShipLoader } from '@/components/ui/loader/ShipLoader';
import { LOADER_DONE, REDUCED_MS, REPEAT_MS, SESSION_KEY, TOTAL_MS, TRAVEL_MS, type Phase } from '@/components/ui/loader/shared';

// Which loader is shown. Change to 'ship' to switch back to the spaceship (ShipLoader.tsx stays in the repo).
const VARIANT: 'robot' | 'ship' = 'robot';

/** Shared loader logic: timing, the session skip, reduced motion, and the loader:done event. Renders the chosen variant. */
export function LoadingScreen() {
  // same on server and client; the skip decisions are made after mount
  const [phase, setPhase] = useState<Phase>('travel');
  // read the session flag once and cache it, so a second effect pass (React dev double-invoke) reuses the first answer
  const seenRef = useRef<boolean | null>(null);

  useEffect(() => {
    // every exit path ends the same way: unmount, then tell the page robot it can fly in
    const finish = (ms: number) => setTimeout(() => { setPhase('gone'); window.dispatchEvent(new Event(LOADER_DONE)); }, ms);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = finish(REDUCED_MS); return () => clearTimeout(t); }
    if (seenRef.current === null) {
      try { seenRef.current = sessionStorage.getItem(SESSION_KEY) === '1'; sessionStorage.setItem(SESSION_KEY, '1'); } catch { seenRef.current = false; /* storage blocked: play in full */ }
    }
    // repeat visit in this session: a short skip, no launch
    if (seenRef.current) { const t = finish(REPEAT_MS); return () => clearTimeout(t); }

    const timers = [
      setTimeout(() => setPhase('launch'), TRAVEL_MS),
      finish(TOTAL_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (phase === 'gone') return null;
  return VARIANT === 'robot' ? <RobotLoader phase={phase} /> : <ShipLoader phase={phase} />;
}
