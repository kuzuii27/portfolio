import { describe, expect, it } from 'vitest';
import { boxAt, freeSpot, overlaps } from '@/lib/robotLane';

const text = [{ l: 100, t: 200, r: 700, b: 260 }];

describe('robot lane', () => {
  it('keeps the wanted spot when it is free', () => {
    const s = freeSpot({ x: 1000, y: 500 }, 120, 140, text, 1440, 900);
    expect(s).toMatchObject({ x: 1000, y: 500, free: true });
  });

  it('moves off text to the nearest free spot', () => {
    const want = { x: 400, y: 230 }; // right on the line of copy
    const s = freeSpot(want, 120, 140, text, 1440, 900);
    expect(s.free).toBe(true);
    expect(overlaps(boxAt(s.x, s.y, 120, 140), text)).toBe(false);
  });

  it('stays inside the viewport and below the nav', () => {
    const s = freeSpot({ x: -50, y: 0 }, 120, 140, [], 1440, 900);
    expect(s.x).toBeGreaterThanOrEqual(60);
    expect(s.y).toBeGreaterThanOrEqual(70 + 70);
  });

  it('reports not free when the whole screen is text', () => {
    const wall = [{ l: -10, t: -10, r: 2000, b: 2000 }];
    expect(freeSpot({ x: 700, y: 400 }, 120, 140, wall, 1440, 900).free).toBe(false);
  });
});
