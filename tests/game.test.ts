import { describe, expect, it } from 'vitest';
import { BREAKABLE, alongLine, extendToEdge, isGameUi, shardPoints } from '@/lib/game';

const fake = (inUi: boolean) => ({ closest: (s: string) => (s.includes('data-game-ui') ? (inUi ? {} : null) : null) });
const area = (t: [number, number][]) => Math.abs((t[0][0] * (t[1][1] - t[2][1]) + t[1][0] * (t[2][1] - t[0][1]) + t[2][0] * (t[0][1] - t[1][1])) / 2);

describe('game helpers', () => {
  it('treats the dock and the robot as game UI', () => {
    expect(isGameUi(fake(true))).toBe(true);
    expect(isGameUi(fake(false))).toBe(false);
    expect(isGameUi(null)).toBe(false);
    expect(BREAKABLE).toContain('.sys-card');
  });

  it('extends a ray through the cursor to the viewport edge', () => {
    expect(extendToEdge(100, 100, 200, 100, 1000, 800)).toEqual({ x: 1000, y: 100 });
    expect(extendToEdge(500, 400, 500, 300, 1000, 800)).toEqual({ x: 500, y: 0 });
    expect(extendToEdge(100, 100, 100, 100, 1000, 800)).toEqual({ x: 100, y: 100 }); // zero direction: no NaN
  });

  it('samples points along a line, ends included', () => {
    const pts = alongLine(0, 0, 100, 0, 25);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[4]).toEqual({ x: 100, y: 0 });
    expect(alongLine(5, 5, 5, 5, 10)).toEqual([{ x: 5, y: 5 }]);
  });

  it('cuts a box into triangles that tile it exactly', () => {
    const shards = shardPoints(300, 120, 16, () => 0.8);
    expect(shards.length).toBeGreaterThanOrEqual(8);
    expect(shards.length % 2).toBe(0);
    const total = shards.reduce((s, sh) => s + area(sh.pts), 0);
    expect(total).toBeCloseTo(300 * 120, 3);
    for (const sh of shards) {
      expect(sh.pts).toHaveLength(3);
      expect(sh.cx).toBeGreaterThanOrEqual(0);
      expect(sh.cx).toBeLessThanOrEqual(300);
    }
  });
});
