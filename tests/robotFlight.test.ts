import { describe, expect, it } from 'vitest';
import { homeBeside, hop, patrol } from '@/lib/robotFlight';

describe('robot flight', () => {
  it('patrols around home without standing still and stays within its radius', () => {
    const home = { x: 600, y: 400 };
    const pts = [0, 1, 2, 3, 4, 5].map((t) => patrol(t, home, 120, 60));
    expect(new Set(pts.map((p) => Math.round(p.x))).size).toBeGreaterThan(3);
    for (const p of pts) {
      expect(Math.abs(p.x - home.x)).toBeLessThanOrEqual(120 * 1.2);
      expect(Math.abs(p.y - home.y)).toBeLessThanOrEqual(60 * 1.4);
    }
  });

  it('homes beside the planet, toward screen centre, not on its disc', () => {
    const right = homeBeside({ x: 1100, y: 450, scale: 300 }, 1440, 900, 150);
    expect(right.x).toBeLessThan(1100 - 300); // left of the planet edge
    const left = homeBeside({ x: 200, y: 450, scale: 100 }, 1440, 900, 150);
    expect(left.x).toBeGreaterThan(200 + 100);
  });

  it('hops along a curve that starts and ends exactly on the endpoints', () => {
    const a = { x: 100, y: 500 };
    const b = { x: 900, y: 300 };
    expect(hop(a, b, 0, 80)).toEqual(a);
    expect(hop(a, b, 1, 80)).toEqual(b);
    expect(hop(a, b, 0.5, 80).y).toBeLessThan(400); // arcs above the straight line (y 400 at the midpoint)
  });
});
