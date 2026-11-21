import { describe, expect, it } from 'vitest';
import { platformsFromRects } from '@/lib/platforms';

describe('platformsFromRects', () => {
  it('ignores rects that are too narrow or off-screen, keeps the top edge as the surface', () => {
    const out = platformsFromRects([{ l: 10, t: 100, r: 20, b: 120 }, { l: 100, t: 200, r: 400, b: 230 }, { l: 0, t: -50, r: 300, b: -20 }], 1000, 800);
    expect(out).toEqual([{ l: 100, r: 400, t: 200 }]);
  });

  it('merges line boxes on the same row that touch or nearly touch', () => {
    const out = platformsFromRects([{ l: 100, t: 200, r: 300, b: 224 }, { l: 308, t: 201, r: 500, b: 225 }, { l: 700, t: 200, r: 800, b: 224 }], 1000, 800);
    expect(out).toEqual([{ l: 100, r: 500, t: 200 }, { l: 700, r: 800, t: 200 }]);
  });

  it('keeps different rows apart and sorts top to bottom', () => {
    const out = platformsFromRects([{ l: 100, t: 400, r: 300, b: 424 }, { l: 100, t: 200, r: 300, b: 224 }], 1000, 800);
    expect(out.map((p) => p.t)).toEqual([200, 400]);
  });
});
