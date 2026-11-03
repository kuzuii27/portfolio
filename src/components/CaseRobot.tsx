'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Robot } from '@/components/Robot';
import type { Pose } from '@/lib/robotScript';

const Robot3D = dynamic(() => import('@/components/Robot3D').then((m) => m.Robot3D), { ssr: false, loading: () => <Robot /> });

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Small robot in the case-study popup: flips in, points at the title, brags about the project, then sits. Decorative. */
export function CaseRobot({ line }: { line: string }) {
  const [hidden] = useState(() => sessionStorage.getItem('robot-pet-hidden') === '1');
  const [reduced] = useState(reducedMotion);
  const [pose, setPose] = useState<Pose>(reduced ? 'sit' : 'stand');
  const [say, setSay] = useState(reduced ? line : '');
  const [hop, setHop] = useState(0);
  const [sparks, setSparks] = useState(0);
  const timers = useRef<number[]>([]);
  const at = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  useEffect(() => {
    const ts = timers.current;
    if (!hidden && !reduced) {
      at(300, () => { setPose('flip'); setHop((n) => n + 1); });
      at(1000, () => { setSparks((n) => n + 1); setPose('point'); setSay(line); });
      at(3200, () => setPose('thumbs'));
      at(4400, () => setPose('sit'));
      at(6500, () => setSay(''));
    }
    return () => ts.forEach(clearTimeout);
  }, [hidden, reduced, line]);

  if (hidden) return null;
  const flipAgain = () => {
    if (reduced || pose === 'flip') return;
    setPose('flip'); setHop((n) => n + 1);
    at(750, () => setPose('sit'));
  };
  return (
    <div className="case-bot" data-dir="-1" data-hop={hop % 2 ? 'a' : hop ? 'b' : undefined} aria-hidden="true">
      {say && <p className="robot-say">{say}</p>}
      {sparks > 0 && <span className="pet-sparkles" key={sparks}><i>✦</i><i>✧</i><i>✦</i></span>}
      <div className="case-bot-body" onClick={flipAgain}>
        <Robot3D pose={pose} talking={say !== ''} />
      </div>
    </div>
  );
}
