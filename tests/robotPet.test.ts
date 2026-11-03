import { describe, expect, it } from 'vitest';
import { CLIMB_SPEED, climbStep, headingInReach, pickPlatform } from '@/lib/robotPet';

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

  it('only wipes a heading just above the box it stands on', () => {
    const p = { top: 400, left: 0, right: 400 };
    expect(headingInReach({ left: 0, right: 300, bottom: 340 }, p, 120)).toBe(true);
    expect(headingInReach({ left: 0, right: 300, bottom: 200 }, p, 120)).toBe(false); // too high
    expect(headingInReach({ left: 0, right: 300, bottom: 410 }, p, 120)).toBe(false); // below the box top
    expect(headingInReach({ left: 500, right: 700, bottom: 340 }, p, 120)).toBe(false); // not over the box
  });

  it('climbs up at a steady speed and stops on the box top', () => {
    expect(climbStep(1000, 400, 0.5)).toBe(1000 - CLIMB_SPEED * 0.5);
    expect(climbStep(420, 400, 0.5)).toBe(400);
  });
});
