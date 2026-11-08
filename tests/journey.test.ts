import { describe, expect, it } from 'vitest';
import { PLANETS } from '@/lib/sceneConfig';
import { clampProgress, nearestPlanetIndex, progressForPlanet } from '@/lib/journey';

describe('scroll journey', () => {
  it('clamps progress to 0..1', () => {
    expect(clampProgress(-0.2)).toBe(0);
    expect(clampProgress(1.4)).toBe(1);
    expect(clampProgress(0.5)).toBe(0.5);
  });

  it('maps progress to the nearest planet', () => {
    expect(nearestPlanetIndex(0, 5)).toBe(0);
    expect(nearestPlanetIndex(1, 5)).toBe(4);
    expect(nearestPlanetIndex(0.5, 5)).toBe(2);
  });

  it('round-trips a planet index through progress', () => {
    for (let i = 0; i < 5; i++) {
      expect(nearestPlanetIndex(progressForPlanet(i, 5), 5)).toBe(i);
    }
  });

  it('maps planets 1:1 to the real page sections, in page order', () => {
    expect(PLANETS.map((p) => p.id)).toEqual(['top', 'work', 'skills', 'about', 'contact']);
  });
});
