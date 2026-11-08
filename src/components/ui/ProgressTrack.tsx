'use client';

import { useEffect, useState } from 'react';
import { PLANETS } from '@/lib/sceneConfig';
import { nearestPlanetIndex, progressForPlanet } from '@/lib/journey';
import './cards.css';

// Vertical trajectory rail: one dot per planet, click scrolls to its section.
export function ProgressTrack() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<{ p: number }>).detail.p;
      setActive(nearestPlanetIndex(p, PLANETS.length));
    };
    window.addEventListener('journey:progress', onProgress);
    return () => window.removeEventListener('journey:progress', onProgress);
  }, []);

  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <nav className="progress-track" aria-label="Journey">
      <ol>
        {PLANETS.map((planet, i) => (
          <li key={planet.id} style={{ top: `${progressForPlanet(i, PLANETS.length) * 100}%` }}>
            <button
              type="button"
              className={`progress-dot${i === active ? ' is-active' : ''}`}
              data-name={planet.name}
              aria-label={`Go to ${planet.name}`}
              aria-current={i === active ? 'step' : undefined}
              onClick={() => goTo(planet.id)}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
