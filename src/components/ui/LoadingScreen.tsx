'use client';

import { useEffect, useState } from 'react';
import { Robot } from '@/components/Robot';

// Boot sequence: the robot flies in superman-style from deep space, bumps the page, waves hi.
const TRAVEL_MS = 1900; // flying toward the camera
const BUMP_MS = 420;    // impact + shake
const HI_MS = 900;      // waves and says hi
const TOTAL_MS = TRAVEL_MS + BUMP_MS + HI_MS;

type Phase = 'travel' | 'bump' | 'hi' | 'gone';

/** Full-screen boot animation. Runs on a fixed timer so the arrival is always seen, load or not. */
export function LoadingScreen() {
  const [phase, setPhase] = useState<Phase>('travel');

  useEffect(() => {
    // Reduced motion: skip the flight, just get out of the way.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setPhase('gone'); return; }

    const timers = [
      setTimeout(() => setPhase('bump'), TRAVEL_MS),
      setTimeout(() => setPhase('hi'), TRAVEL_MS + BUMP_MS),
      setTimeout(() => setPhase('gone'), TOTAL_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className="boot" data-phase={phase} role="status" aria-live="polite" aria-busy={phase !== 'hi'}>
      <div className="boot-stars" aria-hidden="true" />
      <div className="boot-bot" aria-hidden="true">
        <Robot pose={phase === 'hi' ? 'wave' : 'fly'} />
      </div>
      {phase === 'hi' && <p className="boot-hi">Hi! 👋</p>}
      <span className="sr">{phase === 'hi' ? 'Ready' : 'Loading'}</span>
    </div>
  );
}
