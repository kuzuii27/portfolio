import { describe, expect, it } from 'vitest';
import { MAX_HOLES, hpFor, maskForHoles, meterOf, nearestWithin } from '@/lib/damage';

describe('damage helpers', () => {
  it('gives small text blocks a few hit points and big cards many, capped', () => {
    expect(hpFor(100, 20)).toBe(2); // floor
    expect(hpFor(400, 100)).toBe(8);
    expect(hpFor(2000, 2000)).toBe(30); // cap
  });

  it('finds the points inside a radius, nearest first, up to a cap', () => {
    const pts = [{ x: 100, y: 0 }, { x: 10, y: 0 }, { x: 50, y: 0 }, { x: 500, y: 0 }];
    expect(nearestWithin(pts, { x: 0, y: 0 }, 120, 10)).toEqual([1, 2, 0]);
    expect(nearestWithin(pts, { x: 0, y: 0 }, 120, 2)).toEqual([1, 2]);
    expect(nearestWithin(pts, { x: 0, y: 0 }, 5, 10)).toEqual([]);
    expect(nearestWithin([], { x: 0, y: 0 }, 50, 5)).toEqual([]);
  });

  it('turns the meter into a 0..1 fraction that never exceeds 1 or divides by zero', () => {
    expect(meterOf(0, 0)).toBe(0);
    expect(meterOf(50, 200)).toBe(0.25);
    expect(meterOf(300, 200)).toBe(1);
    expect(meterOf(-5, 200)).toBe(0);
  });

  it('builds one mask layer per hole and keeps only the newest MAX_HOLES', () => {
    expect(maskForHoles([])).toBe('');
    const one = maskForHoles([{ x: 10, y: 20, r: 12 }]);
    expect(one).toContain('radial-gradient(circle at 10px 20px');
    expect(one).toContain('transparent 12px');
    const many = Array.from({ length: MAX_HOLES + 5 }, (_, i) => ({ x: i, y: 0, r: 5 }));
    expect(maskForHoles(many).split('radial-gradient').length - 1).toBe(MAX_HOLES);
    expect(maskForHoles(many)).toContain(`circle at ${MAX_HOLES + 4}px 0px`); // newest kept
  });
});
