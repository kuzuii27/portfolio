'use client';

import { useEffect, useRef } from 'react';
import type { Pose } from '@/lib/robotScript';

/**
 * Friendly 3D-looking robot, decorative only. Arms take the pose through CSS ([data-pose]);
 * head and eyes follow the pointer.
 */
export function Robot({ pose = 'stand', talking = false, walking = false }: { pose?: Pose; talking?: boolean; walking?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.3)) / (window.innerHeight / 2)));
        el.style.setProperty('--hx', x.toFixed(3));
        el.style.setProperty('--hy', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
  }, []);

  return (
    <div className={`robot${talking ? ' talking' : ''}${walking ? ' walking' : ''}`} ref={ref} aria-hidden="true" data-pose={pose}>
      <svg viewBox="0 0 320 300" className="robot-svg">
        <defs>
          <radialGradient id="rb-shell" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".55" stopColor="#e9edf2" />
            <stop offset="1" stopColor="#b9c2cc" />
          </radialGradient>
          <linearGradient id="rb-joint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfd6de" />
            <stop offset="1" stopColor="#8d97a3" />
          </linearGradient>
          <linearGradient id="rb-visor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2733" />
            <stop offset="1" stopColor="#0b1118" />
          </linearGradient>
          <filter id="rb-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <ellipse className="robot-shadow" cx="164" cy="288" rx="96" ry="9" />

        <g className="robot-body">
          <g className="robot-leg robot-leg-l"><rect x="134" y="220" width="24" height="60" rx="11" fill="url(#rb-shell)" /><rect x="128" y="274" width="34" height="12" rx="6" fill="url(#rb-joint)" /></g>
          <g className="robot-leg robot-leg-r"><rect x="170" y="220" width="24" height="60" rx="11" fill="url(#rb-shell)" /><rect x="166" y="274" width="34" height="12" rx="6" fill="url(#rb-joint)" /></g>

          {/* torso */}
          <rect x="118" y="134" width="92" height="96" rx="34" fill="url(#rb-shell)" />
          <rect x="138" y="152" width="52" height="28" rx="12" fill="#dfe5eb" />
          <circle className="robot-core" cx="164" cy="166" r="6" fill="#38bdf8" filter="url(#rb-glow)" />
          <rect x="144" y="210" width="40" height="12" rx="6" fill="url(#rb-joint)" />

          {/* arms swing from the shoulder */}
          <g className="robot-arm robot-arm-l">
            <rect x="99" y="150" width="26" height="60" rx="13" fill="url(#rb-shell)" />
            <circle cx="112" cy="214" r="12" fill="url(#rb-shell)" />
          </g>
          <g className="robot-arm robot-arm-r">
            <rect x="203" y="150" width="26" height="60" rx="13" fill="url(#rb-shell)" />
            <circle cx="216" cy="214" r="12" fill="url(#rb-shell)" />
          </g>
          <circle cx="114" cy="150" r="15" fill="url(#rb-joint)" />
          <circle cx="214" cy="150" r="15" fill="url(#rb-joint)" />

        </g>

        {/* head follows the pointer */}
        <g className="robot-head">
          <rect x="152" y="118" width="24" height="20" rx="6" fill="url(#rb-joint)" />
          <circle cx="164" cy="74" r="58" fill="url(#rb-shell)" />
          <circle cx="108" cy="80" r="13" fill="url(#rb-joint)" />
          <circle cx="220" cy="80" r="13" fill="url(#rb-joint)" />
          <line x1="164" y1="16" x2="164" y2="4" stroke="#9aa4af" strokeWidth="3" strokeLinecap="round" />
          <circle className="robot-antenna" cx="164" cy="4" r="5" fill="#38bdf8" filter="url(#rb-glow)" />
          <rect x="122" y="60" width="84" height="40" rx="20" fill="url(#rb-visor)" />
          <g className="robot-eyes">
            <g className="robot-eye"><circle cx="146" cy="80" r="10" fill="none" stroke="#38bdf8" strokeWidth="5" filter="url(#rb-glow)" /></g>
            <g className="robot-eye"><circle cx="182" cy="80" r="10" fill="none" stroke="#38bdf8" strokeWidth="5" filter="url(#rb-glow)" /></g>
          </g>
          <path className="robot-mouth" d="M154 108 Q164 115 174 108" stroke="#7b8693" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="140" cy="40" rx="18" ry="9" fill="#fff" opacity=".7" />
        </g>
      </svg>
    </div>
  );
}
