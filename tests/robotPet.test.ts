import { describe, expect, it } from 'vitest';
import { GRAVITY, jumpSpeed, pickPlatform } from '@/lib/robotPet';

const plats = [
  { top: 100, left: 0, right: 400 },
  { top: 900, left: 0, right: 400 },
  { top: 1500, left: 0, right: 400 },
];

describe('robot pet physics', () => {
  it('picks the visible platform closest to the robot', () => {
    expect(pickPlatform(plats, 800, 1600, 100)).toBe(1); // scrolled down: nearest below
    expect(pickPlatform(plats, 800, 1600, 1500)).toBe(2);
    expect(pickPlatform(plats, 0, 700, 900)).toBe(0); // scrolled back up
  });

  it('returns -1 when no platform is on screen', () => {
    expect(pickPlatform(plats, 2000, 2600, 100)).toBe(-1);
  });

  it('jumps high enough to reach a platform above', () => {
    for (const rise of [0, 120, 600]) {
      const v = jumpSpeed(rise);
      expect(v).toBeLessThan(0);
      expect((v * v) / (2 * GRAVITY)).toBeGreaterThan(rise);
    }
  });
});
