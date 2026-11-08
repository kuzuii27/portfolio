import { describe, expect, it } from 'vitest';
import { dimBehindCopy, planetPose } from '@/lib/planetPath';

const frame = { w: 1440, h: 900 };

describe('planet journey', () => {
  it('waits small on the left, grows to focus on the right, exits right', () => {
    const wait = planetPose(1, 0, frame); // one step ahead of focus
    const focus = planetPose(1, 1, frame);
    const exit = planetPose(1, 2, frame);
    expect(wait.scale).toBeLessThan(focus.scale / 2);
    expect(wait.x).toBeLessThan(focus.x);
    expect(exit.x).toBeGreaterThan(focus.x); // same direction both halves: always left to right
    expect(exit.opacity).toBe(0);
  });

  it('first screen shows the next planet small and out of the headline', () => {
    const next = planetPose(1, 0, frame);
    expect(next.opacity).toBeGreaterThan(0.5);
    expect(next.x).toBeLessThan(frame.w * 0.25);
    expect(next.y).toBeGreaterThan(frame.h * 0.6); // low corner
    expect(next.scale).toBeLessThan(frame.h * 0.1);
  });

  it('hides planets two or more steps away', () => {
    expect(planetPose(3, 0, frame).opacity).toBe(0);
    expect(planetPose(0, 3, frame).opacity).toBe(0);
  });

  it('is symmetric in scroll: same f gives the same pose (scrub both directions)', () => {
    expect(planetPose(2, 1.4, frame)).toEqual(planetPose(2, 1.4, frame));
  });

  it('uses smaller radii on narrow screens and dims behind copy', () => {
    const wide = planetPose(0, 0, frame);
    const narrow = planetPose(0, 0, { w: 390, h: 800 });
    expect(narrow.scale).toBeLessThan(wide.scale);
    expect(dimBehindCopy({ ...wide, x: 400, scale: 200 }, 700)).toBeLessThan(1);
    expect(dimBehindCopy({ ...wide, x: 1300, scale: 100 }, 700)).toBe(1);
  });
});
