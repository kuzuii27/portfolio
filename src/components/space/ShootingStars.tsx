'use client';

import { useEffect, useRef } from 'react';
import { SCENE_COLORS, SHOOTING_STARS } from '@/lib/sceneConfig';

type Streak = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  width: number;
  life: number;
  age: number;
  comet: boolean;
};

/** Random streaks with glowing, fading tails on a 2D canvas. Own timer; nothing at all under prefers-reduced-motion. */
export function ShootingStars({ theme }: { theme: 'light' | 'dark' }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const c = SCENE_COLORS[theme].star;
    const [r, g, b] = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;
    const maxActive = innerWidth < 768 ? 1 : 2; // halved on mobile

    const streaks: Streak[] = [];
    let timer = 0;
    let raf = 0;
    let last = 0;

    const layout = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.age += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const a = 1 - s.age / s.life;
        if (a <= 0) {
          streaks.splice(i, 1);
          continue;
        }
        const mag = Math.hypot(s.vx, s.vy);
        const tx = s.x - (s.vx / mag) * s.len;
        const ty = s.y - (s.vy / mag) * s.len;
        const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
        grad.addColorStop(0, rgba(0));
        grad.addColorStop(1, rgba(s.comet ? a : a * 0.9));
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = rgba(0.8 * a);
        ctx.shadowBlur = s.comet ? 18 : 10;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      raf = streaks.length ? requestAnimationFrame(frame) : 0;
    };

    const spawn = () => {
      if (streaks.length < maxActive) {
        const comet = Math.random() < SHOOTING_STARS.cometChance;
        const speed = comet ? 500 + Math.random() * 200 : 900 + Math.random() * 700; // px/s
        const angle = ((15 + Math.random() * 35) * Math.PI) / 180; // varied slope below horizontal
        const dir = Math.random() < 0.5 ? 1 : -1;
        streaks.push({
          x: Math.random() * innerWidth * 0.9,
          y: Math.random() * innerHeight * 0.4,
          vx: Math.cos(angle) * speed * dir,
          vy: Math.sin(angle) * speed,
          len: comet ? speed * 0.6 : speed * 0.22,
          width: comet ? 3 : 1.4,
          life: comet ? 2.4 : 1.2,
          age: 0,
          comet,
        });
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      }
      const { minIntervalMs, maxIntervalMs } = SHOOTING_STARS;
      timer = window.setTimeout(spawn, minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs));
    };

    layout();
    timer = window.setTimeout(spawn, SHOOTING_STARS.minIntervalMs);
    addEventListener('resize', layout);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      removeEventListener('resize', layout);
    };
  }, [theme]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
