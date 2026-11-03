'use client';

import { useEffect, useRef, useState } from 'react';
import { Robot } from '@/components/Robot';
import { GUIDE, SECTION_IDS, lineFor, type Pose } from '@/lib/robotScript';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Types text out letter by letter (instantly under reduced motion). */
function useTyped(text: string) {
  const [s, setS] = useState({ text, n: 0 });
  if (s.text !== text) setS({ text, n: 0 }); // restart when the line changes
  useEffect(() => {
    const r = reduced();
    const t = setInterval(() => setS((p) => (p.n >= p.text.length ? p : { ...p, n: r ? p.text.length : p.n + 1 })), 28);
    return () => clearInterval(t);
  }, [text]);
  return s.text === text ? text.slice(0, s.n) : '';
}

/** Big seated robot in the hero: waves hello, then goes back to typing. */
export function HeroRobot() {
  const [pose, setPose] = useState<Pose>('wave');
  const said = useTyped(GUIDE.top.intro);
  useEffect(() => { const t = setTimeout(() => setPose('type'), 3200); return () => clearTimeout(t); }, []);
  return (
    <div className="hero-robot">
      <p className="robot-say" aria-hidden="true">{said}</p>
      <Robot pose={pose} talking={said.length < GUIDE.top.intro.length} />
    </div>
  );
}

/** Small companion that docks in the corner after the hero and introduces each section once. */
export function RobotGuide() {
  const [hidden, setHidden] = useState(false);
  const [section, setSection] = useState<string>('top');
  const [line, setLine] = useState<{ pose: Pose; text: string }>({ pose: 'wave', text: '' });
  const [walking, setWalking] = useState(false);
  const [bubble, setBubble] = useState(false);
  const seen = useRef(new Set<string>(['top']));
  const said = useTyped(line.text);

  useEffect(() => {
    if (sessionStorage.getItem('robot-hidden') === '1') return; // stays docked off-screen for this visit
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.id;
        setSection(id);
        const next = lineFor(id, seen.current);
        if (!next || id === 'top') continue;
        setLine(next);
        setBubble(true);
        if (!reduced()) { setWalking(true); setTimeout(() => setWalking(false), 900); }
      }
    }, { rootMargin: '-30% 0px -60% 0px' }); // the section crossing the upper-middle of the screen
    for (const id of SECTION_IDS) { const el = document.getElementById(id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, []);

  const done = line.text !== '' && said === line.text;
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setBubble(false), 5000);
    return () => clearTimeout(t);
  }, [done, line]);

  const on = section !== 'top' && !hidden;
  return (
    <div className={`guide${on ? ' on' : ''}${section === 'contact' ? ' tucked' : ''}${walking ? ' walking' : ''}${bubble ? '' : ' quiet'}`} inert={!on}>
      {bubble && said && <p className="robot-say" aria-hidden="true">{said}</p>}
      <Robot pose={walking ? 'type' : line.pose} seated={false} talking={!done} walking={walking} />
      <button type="button" className="guide-hide" onClick={() => { sessionStorage.setItem('robot-hidden', '1'); setHidden(true); }}>
        Hide robot
      </button>
    </div>
  );
}
