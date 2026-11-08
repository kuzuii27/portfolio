'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { PLANETS } from '@/lib/sceneConfig';
import { nearestPlanetIndex } from '@/lib/journey';
import './cards.css';

// Glass card that is visible only while its section is the nearest planet.
// inert keeps hidden cards out of focus order and the accessibility tree.
export function SectionCard({ children, sectionId, className = '' }: { children: ReactNode; sectionId: string; className?: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<{ p: number }>).detail.p;
      setActive(PLANETS[nearestPlanetIndex(p, PLANETS.length)].id === sectionId);
    };
    window.addEventListener('journey:progress', onProgress);
    return () => window.removeEventListener('journey:progress', onProgress);
  }, [sectionId]);

  return (
    <div className={`section-card${active ? ' is-active' : ''} ${className}`.trim()} inert={!active}>
      {children}
    </div>
  );
}
