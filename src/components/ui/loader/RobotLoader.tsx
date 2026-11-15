'use client';

// ROBOT LOADER (active). The site's robot seen from behind, flying into the screen. Switch variant in ../LoadingScreen.tsx.
import type { CSSProperties } from 'react';
import './loader.css';
import './robot.css';
import type { Phase } from './shared';

// Streak angles (deg from the vanishing point) and start delays are constants, so server and client render identically.
const RAYS = [
  { a: 20, d: 0 }, { a: 65, d: 0.3 }, { a: 110, d: 0.6 }, { a: 155, d: 0.9 },
  { a: 200, d: 0.15 }, { a: 245, d: 0.45 }, { a: 290, d: 0.75 }, { a: 335, d: 1.05 },
];

/** Full-screen robot loader. Its exit (launch) is driven by LoadingScreen's phase. */
export function RobotLoader({ phase }: { phase: Phase }) {
  return (
    <div className="rl-root" data-phase={phase} role="status" aria-live="polite" aria-busy={phase !== 'launch'}>
      <div className="rl-glow" aria-hidden="true" />
      <div className="rl-stars" aria-hidden="true" />
      <div className="rl-rays" aria-hidden="true">
        {RAYS.map((r, i) => (
          <span key={i} className="rl-ray" style={{ '--a': `${r.a}deg`, animationDelay: `${r.d}s` } as CSSProperties} />
        ))}
      </div>
      <div className="rl-bot" aria-hidden="true">
        <span className="rl-trail" />
        <svg viewBox="0 0 200 200">
          <defs>
            <linearGradient id="rl-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c9d1db" />
            </linearGradient>
            <radialGradient id="rl-head" cx="0.4" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#aeb8c4" />
            </radialGradient>
            <linearGradient id="rl-thr" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7a8594" />
              <stop offset="1" stopColor="#3f4753" />
            </linearGradient>
          </defs>

          {/* arms, held back and down in a flying pose; drawn behind the torso */}
          <g>
            <line x1="66" y1="96" x2="48" y2="126" stroke="#9aa4af" strokeWidth="9" strokeLinecap="round" />
            <circle cx="66" cy="96" r="7" fill="#9aa4af" />
            <circle cx="46" cy="132" r="8" fill="#f1f4f8" stroke="#9aa4af" strokeWidth="1.5" />
            <line x1="134" y1="96" x2="152" y2="126" stroke="#9aa4af" strokeWidth="9" strokeLinecap="round" />
            <circle cx="134" cy="96" r="7" fill="#9aa4af" />
            <circle cx="154" cy="132" r="8" fill="#f1f4f8" stroke="#9aa4af" strokeWidth="1.5" />
          </g>

          {/* thrusters and flames: blue outer, white-blue inner, pointing down */}
          <g className="rl-grow" style={{ transformOrigin: '80px 152px' }}>
            <rect x="72" y="142" width="16" height="10" rx="3" fill="url(#rl-thr)" />
            <g className="rl-flame">
              <path d="M72 152 C72 176 80 188 80 198 C80 188 88 176 88 152 Z" fill="#38bdf8" />
              <path d="M76 154 C76 170 80 178 80 186 C80 178 84 170 84 154 Z" fill="#9be7ff" />
            </g>
          </g>
          <g className="rl-grow" style={{ transformOrigin: '120px 152px' }}>
            <rect x="112" y="142" width="16" height="10" rx="3" fill="url(#rl-thr)" />
            <g className="rl-flame rl-flame-r">
              <path d="M112 152 C112 176 120 188 120 198 C120 188 128 176 128 152 Z" fill="#38bdf8" />
              <path d="M116 154 C116 170 120 178 120 186 C120 178 124 170 124 154 Z" fill="#9be7ff" />
            </g>
          </g>

          {/* neck, torso (white to light grey, cool rim), back hatch, status light */}
          <rect x="90" y="74" width="20" height="14" rx="4" fill="#9aa4af" />
          <rect x="64" y="84" width="72" height="66" rx="18" fill="url(#rl-body)" stroke="#7dd3fc" strokeOpacity="0.55" strokeWidth="1.5" />
          <rect x="89" y="100" width="22" height="18" rx="4" fill="#aeb8c4" stroke="#8a95a3" strokeWidth="1" />
          <path d="M94 105h12M94 110h12M94 115h12" stroke="#8a95a3" strokeWidth="1.2" />
          <circle className="rl-light" cx="100" cy="132" r="3" fill="#38bdf8" />

          {/* head from behind: no visor, no eyes; a back seam and a cyan antenna dot */}
          <g className="rl-head">
            <line x1="100" y1="22" x2="100" y2="10" stroke="#9aa4af" strokeWidth="2.5" />
            <circle cx="100" cy="50" r="28" fill="url(#rl-head)" />
            <path d="M100 22 A28 28 0 0 0 100 78" fill="none" stroke="#8a95a3" strokeWidth="1.3" opacity="0.7" />
            <circle className="rl-antenna" cx="100" cy="8" r="4" fill="#38bdf8" />
          </g>
        </svg>
      </div>
      <p className="ld-word">KUZUII</p>
      <span className="sr">{phase === 'launch' ? 'Ready' : 'Loading'}</span>
    </div>
  );
}
