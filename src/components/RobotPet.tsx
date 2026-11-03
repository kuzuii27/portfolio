'use client';

import { useEffect, useRef, useState } from 'react';
import { Robot } from '@/components/Robot';
import { lineFor, type Pose } from '@/lib/robotScript';
import { jumpSpeed, pickPlatform, GRAVITY, type Plat } from '@/lib/robotPet';

// The boxes the robot can stand on.
const PLATFORMS = '.facts, .case, .levels > li, .skill-row, .contacts, #contact form';
const IDLE: Pose[] = ['wave', 'think', 'thumbs', 'present', 'nap'];
const FEET = 286 / 300; // where the feet are in the robot's SVG

type State = 'air' | 'land' | 'walk' | 'idle';

/** A playful robot that walks on top of the page's boxes and falls or jumps to the next box as you scroll. */
export function RobotPet() {
  const box = useRef<HTMLDivElement>(null);
  const hop = useRef<() => void>(() => {});
  const [pose, setPose] = useState<Pose>('stand');
  const [walking, setWalking] = useState(false);
  const [say, setSay] = useState('');
  const [hearts, setHearts] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (sessionStorage.getItem('robot-hidden') === '1') { el.style.display = 'none'; return; }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let els = [...document.querySelectorAll(PLATFORMS)];
    const onResize = () => { els = [...document.querySelectorAll(PLATFORMS)]; };
    window.addEventListener('resize', onResize);

    const seen = new Set<string>();
    const s = { plat: -1, x: 0, y: 0, vy: 0, tx: 0, dir: 1, state: 'walk' as State, until: 0 }; // 'walk' with no box makes the first frame pick one
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    const rect = (e: Element): Plat => {
      const r = e.getBoundingClientRect();
      return { top: r.top + scrollY, left: r.left + scrollX, right: r.right + scrollX };
    };
    const clampX = (x: number, p: Plat, w: number) =>
      Math.max(Math.max(p.left, 0), Math.min(x, Math.min(p.right, document.documentElement.clientWidth) - w));
    const setGround = (st: State) => { s.state = st; el.classList.toggle('air', st === 'air'); };

    const greet = () => {
      const sec = els[s.plat]?.closest('section[id]')?.id ?? 'top';
      if (seen.has(sec)) return;
      const line = lineFor(sec, seen);
      if (!line) return;
      setSay(line.text);
      setPose(line.pose);
      setGround('idle'); s.until = performance.now() + 2600;
      later(4500, () => setSay(''));
    };

    const launch = (target: number, plats: Plat[], w: number, vy?: number) => {
      const p = plats[target];
      s.plat = target;
      s.tx = clampX(s.x, p, w);
      setWalking(false);
      if (reduced) { s.x = s.tx; s.y = p.top; setGround('walk'); greet(); return; }
      // a box far away: start the fall/jump just off screen so it stays short and visible
      const h = el.offsetHeight;
      if (p.top > s.y) s.y = Math.max(s.y, scrollY - h);
      else s.y = Math.min(s.y, scrollY + innerHeight + h);
      s.vy = vy ?? (p.top < s.y ? jumpSpeed(s.y - p.top) : 0);
      setPose('stand');
      setGround('air');
    };

    hop.current = () => {
      if (s.state === 'air' || reduced) return;
      s.vy = -620; setGround('air'); setWalking(false); setPose('thumbs');
      setHearts((n) => n + 1);
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!el.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const plats = els.map(rect);
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vTop = scrollY + 160; // below the sticky header, with room for the bubble
      const vBot = scrollY + innerHeight - 24;
      const cur = plats[s.plat];

      // Box scrolled out of view (or first frame, or the target left the screen mid-air): go to the nearest visible one.
      if (!cur || cur.top < vTop || cur.top > vBot) {
        const t = pickPlatform(plats, vTop, vBot, s.y);
        if (t >= 0 && t !== s.plat) {
          if (s.plat < 0) { s.x = clampX(plats[t].left + (plats[t].right - plats[t].left) * 0.7, plats[t], w); s.y = scrollY - h; } // drops in from above
          launch(t, plats, w);
        }
      }

      const p = plats[s.plat];
      if (p && s.state === 'air') {
        const prevY = s.y;
        s.vy = Math.min(s.vy + GRAVITY * dt, 2200);
        s.y += s.vy * dt;
        s.x += (s.tx - s.x) * Math.min(1, dt * 5);
        if (s.vy > 0 && prevY <= p.top + 1 && s.y >= p.top) {
          s.y = p.top;
          setGround('land'); s.until = now + 260;
          el.classList.add('landed');
          later(260, () => el.classList.remove('landed'));
          greet();
        } else if (s.vy > 0 && prevY > p.top + 1) {
          s.y = p.top; setGround('walk'); // failsafe: the box moved under us
        }
      } else if (p) {
        s.y = p.top; // stay glued if the layout shifts
        if (s.state === 'land' && now > s.until) { setGround('walk'); setWalking(true); setPose('stand'); }
        else if (s.state === 'idle' && now > s.until) { setGround('walk'); setWalking(true); setPose('stand'); }
        else if (s.state === 'walk') {
          s.x += s.dir * 55 * dt;
          const min = Math.max(p.left, 0);
          const max = Math.min(p.right, document.documentElement.clientWidth) - w;
          if (s.x < min || s.x > max) {
            s.x = Math.max(min, Math.min(s.x, max));
            // sometimes it walks off the edge onto a visible box below
            const below = plats.findIndex((q, i) => i !== s.plat && q.top > p.top + 40 && q.top < vBot && s.x + w / 2 >= q.left && s.x + w / 2 <= q.right);
            if (below >= 0 && Math.random() < 0.4) launch(below, plats, w, -260);
            else s.dir *= -1;
          } else if (Math.random() < dt * 0.22) {
            setGround('idle'); s.until = now + 1800 + Math.random() * 2600;
            setWalking(false); setPose(IDLE[Math.floor(Math.random() * IDLE.length)]);
          }
        }
      }

      el.dataset.dir = String(s.dir);
      el.dataset.side = s.x > document.documentElement.clientWidth / 2 ? 'r' : 'l';
      el.style.transform = `translate3d(${Math.round(s.x)}px, ${Math.round(s.y - h * FEET)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); window.removeEventListener('resize', onResize); };
  }, []);

  if (hidden) return null;
  return (
    <div className="pet" ref={box}>
      {say && <p className="robot-say" aria-hidden="true">{say}</p>}
      {pose === 'nap' && <span className="pet-z" aria-hidden="true">zZz</span>}
      {hearts > 0 && <span className="pet-heart" key={hearts} aria-hidden="true">♥</span>}
      <div className="pet-body" onClick={() => hop.current()} onPointerEnter={() => setPose((p) => (p === 'stand' ? 'wave' : p))}>
        <Robot pose={pose} walking={walking} talking={say !== ''} />
      </div>
      <button type="button" className="pet-hide" onClick={() => { sessionStorage.setItem('robot-hidden', '1'); setHidden(true); }}>
        Hide robot
      </button>
    </div>
  );
}
