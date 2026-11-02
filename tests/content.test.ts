import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// sha256 of private names that must never appear on the site (kept hashed so this public repo doesn't name them)
const BANNED = new Set([
  '50f6a9f0aa53a97c7fb3125e9006a16a6857c2c945f131aa9e29202dac75f09f',
  'f1cfe634460baf16a60e289880d6ca6f47f7816075f2724f0424be91a8f7c7b5',
  'a5c380414b3e27fd5d03735fa2f64012c930cc4c731583c852b2f614d36ccba8',
  '980144e66414d1b752ed4e8c3159876ebcc623e611b97d05be8b099518ff08be',
]);
const hasBanned = (text: string) =>
  (text.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => BANNED.has(createHash('sha256').update(w).digest('hex')));

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });

describe('site content', () => {
  it('never names employers or clients', () => {
    const hits = files('src').filter((f) => hasBanned(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('shows the name Kuzuii, links GitHub kuzuii27, and never uses the handle as a display name', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).toContain('Kuzuii');
    expect(page).toContain('https://github.com/kuzuii27');
    const withoutLinks = page.replaceAll('https://github.com/kuzuii27', '').replaceAll('github.com/kuzuii27', '');
    expect(withoutLinks).not.toMatch(/kuzuii27/);
  });
});
