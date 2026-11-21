import { describe, expect, it } from 'vitest';
import { GUNS, WEAPONS, arcPoint, gunFromKey, nextWeapon, spreadAngles } from '@/lib/weapons';

describe('weapons', () => {
  it('has the five weapons in key order, each with a sane cooldown', () => {
    expect(GUNS).toEqual(['pistol', 'smg', 'shotgun', 'rocket', 'laser']);
    for (const g of GUNS) expect(WEAPONS[g].cooldown).toBeGreaterThan(0);
    expect(WEAPONS.smg.auto).toBe(true);
    expect(WEAPONS.pistol.auto).toBe(false);
    expect(WEAPONS.shotgun.pellets).toBeGreaterThan(3);
  });

  it('maps number keys 1-5 to weapons and ignores everything else', () => {
    expect(gunFromKey('1')).toBe('pistol');
    expect(gunFromKey('3')).toBe('shotgun');
    expect(gunFromKey('5')).toBe('laser');
    expect(gunFromKey('6')).toBeNull();
    expect(gunFromKey('a')).toBeNull();
  });

  it('cycles weapons both ways and wraps', () => {
    expect(nextWeapon('pistol', 1)).toBe('smg');
    expect(nextWeapon('laser', 1)).toBe('pistol');
    expect(nextWeapon('pistol', -1)).toBe('laser');
    expect(nextWeapon('rocket', -1)).toBe('shotgun');
  });

  it('spreads pellets evenly around the aim, one angle for a single pellet', () => {
    expect(spreadAngles(1, 0.3, () => 0.5)).toEqual([0]);
    const a = spreadAngles(5, 0.4, () => 0.5);
    expect(a).toHaveLength(5);
    expect(a[0]).toBeCloseTo(-0.2, 5);
    expect(a[4]).toBeCloseTo(0.2, 5);
    const jittered = spreadAngles(5, 0.4, () => 1);
    expect(Math.max(...jittered)).toBeLessThanOrEqual(0.2 + 0.4 / 5);
  });

  it('lobs along an arc: ends on the target, peaks in the middle', () => {
    expect(arcPoint(0, 100, 200, 100, 0, 80)).toEqual({ x: 0, y: 100 });
    expect(arcPoint(0, 100, 200, 100, 1, 80)).toEqual({ x: 200, y: 100 });
    const mid = arcPoint(0, 100, 200, 100, 0.5, 80);
    expect(mid.x).toBe(100);
    expect(mid.y).toBe(20); // 80 px above the straight line
  });
});
