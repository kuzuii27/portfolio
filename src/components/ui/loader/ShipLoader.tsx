'use client';

// SHIP LOADER (unused). The active loader is RobotLoader; to switch back, set VARIANT = 'ship' in ../LoadingScreen.tsx.
import type { Phase } from './shared';
import './ship.css';

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

/** The original pink arrow-ship loader, unchanged in look. Classes are prefixed sl- (see ship.css). */
export function ShipLoader({ phase }: { phase: Phase }) {
  return (
    <div className="sl-root" data-phase={phase} role="status" aria-live="polite" aria-busy={phase !== 'launch'}>
      <div className="sl-glow" aria-hidden="true" />
      <div className="sl-stars" aria-hidden="true" />
      <div className="sl-streaks" aria-hidden="true">
        {STREAKS.map((s, i) => (
          <span key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.len, animationDelay: `${s.d}s`, animationDuration: `${s.dur}s` }} />
        ))}
      </div>
      <div className="sl-ship" aria-hidden="true">
        <div className="sl-hover">
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <linearGradient id="sl-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f04aa0" />
              <stop offset="1" stopColor="#c21a7a" />
            </linearGradient>
            <linearGradient id="sl-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b1a6b" />
              <stop offset="1" stopColor="#3a1050" />
            </linearGradient>
            <linearGradient id="sl-thr" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3b3a8c" />
              <stop offset="1" stopColor="#25246a" />
            </linearGradient>
            <radialGradient id="sl-hl" cx="0.8" cy="0.35" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="sl-flame sl-flame-l">
            <path d="M58 146 Q48 170 60 192 Q72 170 66 146 Z" fill="#ffd21a" />
            <path d="M61 150 Q57 166 61 178 Q65 166 63 150 Z" fill="#fff8d6" />
          </g>
          <g className="sl-flame sl-flame-r">
            <path d="M118 146 Q108 170 120 192 Q132 170 126 146 Z" fill="#ffd21a" />
            <path d="M121 150 Q117 166 121 178 Q125 166 123 150 Z" fill="#fff8d6" />
          </g>
          <rect className="sl-thr" x="46" y="124" width="26" height="30" rx="4" fill="url(#sl-thr)" />
          <rect className="sl-thr" x="116" y="124" width="26" height="30" rx="4" fill="url(#sl-thr)" />
          <rect className="sl-core" x="55" y="138" width="8" height="8" rx="1.5" fill="#ff9f1a" />
          <rect className="sl-core" x="125" y="138" width="8" height="8" rx="1.5" fill="#ff9f1a" />
          <path d="M100 26 L168 150 L124 134 L100 150 L76 134 L32 150 Z" fill="url(#sl-side)" transform="translate(-6 10)" />
          <path d="M100 26 L168 150 L124 134 L100 150 L76 134 L32 150 Z" fill="url(#sl-top)" />
          <path d="M100 26 L168 150 L140 138 Z" fill="url(#sl-hl)" />
        </svg>
        </div>
      </div>
      <p className="sl-stage">KUZUII</p>
      <span className="sr">{phase === 'launch' ? 'Ready' : 'Loading'}</span>
    </div>
  );
}
