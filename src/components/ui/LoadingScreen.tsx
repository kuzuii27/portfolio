'use client';

import { useEffect, useRef, useState } from 'react';

// Launch loader: a pink arrow ship idles and flickers while the page loads, then rockets off the top right.
const TRAVEL_MS = 1900; // hover and flicker (flames grow with time)
const LAUNCH_MS = 650;  // anticipation + rocket exit (<= 700ms per the spec)
const TOTAL_MS = TRAVEL_MS + LAUNCH_MS;
const SESSION_KEY = 'kuzuii-loader-seen';

type Phase = 'travel' | 'launch' | 'gone';

// Streak start points and lengths are constants, so server and client render identically (no Math.random in render).
const STREAKS = [
  { x: 8, y: 62, len: 120, d: 0, dur: 1.8 },
  { x: 22, y: 78, len: 90, d: 0.4, dur: 2.2 },
  { x: 40, y: 88, len: 160, d: 0.9, dur: 1.6 },
  { x: 58, y: 70, len: 70, d: 0.2, dur: 2.6 },
  { x: 74, y: 84, len: 130, d: 1.1, dur: 1.9 },
  { x: 86, y: 60, len: 100, d: 0.6, dur: 2.4 },
  { x: 30, y: 52, len: 80, d: 1.4, dur: 2.0 },
  { x: 66, y: 46, len: 110, d: 0.8, dur: 2.2 },
];

/** Full-screen launch loader. Runs on a fixed timer so the launch is always seen; unmounts itself afterwards. */
export function LoadingScreen() {
  // decide skip cases once, on mount, without setState in the effect body
  const [phase, setPhase] = useState<Phase>('travel'); // same on server and client; reduced motion is decided after mount

  // run once on mount. The session flag is read once and cached in a ref, so a second effect pass (React dev double-invoke)
  // reuses the first pass's answer instead of treating its own write as a repeat visit.
  const seenRef = useRef<boolean | null>(null);
  useEffect(() => {
    // reduced motion: no flight or launch, just a short fade then unmount
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = setTimeout(() => setPhase('gone'), 250); return () => clearTimeout(t); }
    if (seenRef.current === null) {
      try { seenRef.current = sessionStorage.getItem(SESSION_KEY) === '1'; sessionStorage.setItem(SESSION_KEY, '1'); } catch { seenRef.current = false; /* storage blocked: play in full */ }
    }
    // repeat visit: short skip, no launch
    if (seenRef.current) { const t = setTimeout(() => setPhase('gone'), 300); return () => clearTimeout(t); }

    const timers = [
      setTimeout(() => setPhase('launch'), TRAVEL_MS),
      setTimeout(() => setPhase('gone'), TOTAL_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className="boot" data-phase={phase} role="status" aria-live="polite" aria-busy={phase !== 'launch'}>
      <div className="boot-glow" aria-hidden="true" />
      <div className="boot-stars" aria-hidden="true" />
      <div className="boot-streaks" aria-hidden="true">
        {STREAKS.map((s, i) => (
          <span key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.len, animationDelay: `${s.d}s`, animationDuration: `${s.dur}s` }} />
        ))}
      </div>
      <div className="boot-ship" aria-hidden="true">
        <div className="boot-hover">
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <linearGradient id="boot-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f04aa0" />
              <stop offset="1" stopColor="#c21a7a" />
            </linearGradient>
            <linearGradient id="boot-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b1a6b" />
              <stop offset="1" stopColor="#3a1050" />
            </linearGradient>
            <linearGradient id="boot-thr" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3b3a8c" />
              <stop offset="1" stopColor="#25246a" />
            </linearGradient>
            <radialGradient id="boot-hl" cx="0.8" cy="0.35" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="boot-flame boot-flame-l">
            <path d="M58 146 Q48 170 60 192 Q72 170 66 146 Z" fill="#ffd21a" />
            <path d="M61 150 Q57 166 61 178 Q65 166 63 150 Z" fill="#fff8d6" />
          </g>
          <g className="boot-flame boot-flame-r">
            <path d="M118 146 Q108 170 120 192 Q132 170 126 146 Z" fill="#ffd21a" />
            <path d="M121 150 Q117 166 121 178 Q125 166 123 150 Z" fill="#fff8d6" />
          </g>
          <rect className="boot-thr" x="46" y="124" width="26" height="30" rx="4" fill="url(#boot-thr)" />
          <rect className="boot-thr" x="116" y="124" width="26" height="30" rx="4" fill="url(#boot-thr)" />
          <rect className="boot-core" x="55" y="138" width="8" height="8" rx="1.5" fill="#ff9f1a" />
          <rect className="boot-core" x="125" y="138" width="8" height="8" rx="1.5" fill="#ff9f1a" />
          <path d="M100 26 L168 150 L124 134 L100 150 L76 134 L32 150 Z" fill="url(#boot-side)" transform="translate(-6 10)" />
          <path d="M100 26 L168 150 L124 134 L100 150 L76 134 L32 150 Z" fill="url(#boot-top)" />
          <path d="M100 26 L168 150 L140 138 Z" fill="url(#boot-hl)" />
        </svg>
        </div>
      </div>
      <p className="boot-stage">KUZUII</p>
      <span className="sr">{phase === 'launch' ? 'Ready' : 'Loading'}</span>
    </div>
  );
}
