import { describe, expect, it } from 'vitest';
import { allow } from '@/lib/rateLimit';

describe('allow', () => {
  it('only counts recorded hits, so a check alone never uses up the limit', () => {
    for (let i = 0; i < 10; i++) expect(allow('ip-e', 0, 5, 3_600_000, false)).toBe(true);
    for (let i = 0; i < 5; i++) allow('ip-e', 0);
    expect(allow('ip-e', 1, 5, 3_600_000, false)).toBe(false);
  });
  it('allows 5 requests per hour then blocks the 6th', () => {
    const r = Array.from({ length: 6 }, (_, i) => allow('ip-a', 1000 + i));
    expect(r).toEqual([true, true, true, true, true, false]);
  });
  it('allows again once the window has passed', () => {
    for (let i = 0; i < 5; i++) allow('ip-b', 0);
    expect(allow('ip-b', 1)).toBe(false);
    expect(allow('ip-b', 3_600_001)).toBe(true);
  });
  it('keeps keys independent', () => {
    for (let i = 0; i < 5; i++) allow('ip-c', 0);
    expect(allow('ip-c', 1)).toBe(false);
    expect(allow('ip-d', 1)).toBe(true);
  });
});
