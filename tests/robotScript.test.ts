import { describe, expect, it } from 'vitest';
import { GUIDE, SECTION_IDS, lineFor, type Pose } from '@/lib/robotScript';

describe('robot guide script', () => {
  it('has a pose and an intro for every section, in page order', () => {
    expect(SECTION_IDS).toEqual(['top', 'work', 'levels', 'skills', 'about', 'contact']);
    const poses: Pose[] = ['wave', 'point', 'present', 'think', 'thumbs', 'type'];
    for (const id of SECTION_IDS) {
      expect(poses).toContain(GUIDE[id].pose);
      expect(GUIDE[id].intro.length).toBeGreaterThan(10);
      expect(GUIDE[id].intro.length).toBeLessThanOrEqual(90); // fits a 2-line bubble on phones
    }
  });

  it('greets in full the first time, then only a short wave', () => {
    const seen = new Set<string>();
    expect(lineFor('work', seen)).toEqual({ pose: 'point', text: GUIDE.work.intro });
    expect(seen.has('work')).toBe(true);
    expect(lineFor('work', seen)).toEqual({ pose: 'wave', text: GUIDE.work.again });
  });

  it('ignores unknown sections', () => {
    expect(lineFor('nope', new Set())).toBeNull();
  });
});
