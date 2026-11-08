import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CASES } from '@/lib/cases';

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
  it('every case has a short brag line for the robot', () => {
    for (const c of CASES) {
      expect(c.brag.length).toBeGreaterThan(0);
      expect(c.brag.length).toBeLessThanOrEqual(80);
      expect(hasBanned(c.brag)).toBe(false);
    }
  });

  it('never names employers or clients', () => {
    const text = [...files('src'), ...files('public/demos')].filter((f) => !/\.(webp|png|jpe?g|ico)$/i.test(f));
    const hits = text.filter((f) => hasBanned(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('shows the name Kuzuii, links GitHub kuzuii27, and never uses the handle as a display name', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).toContain('Kuzuii');
    expect(page).toContain('https://github.com/kuzuii27');
    const withoutLinks = page.replaceAll('https://github.com/kuzuii27', '').replaceAll('github.com/kuzuii27', '');
    expect(withoutLinks).not.toMatch(/kuzuii27/);
  });
  it('matches the resume: IT support + dev at the GPS company, developer intern at the fintech', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).toContain('IT support and in-house developer');
    expect(page).toContain('software developer intern');
  });
  it('About does not say I am currently employed', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    const about = page.slice(page.indexOf('id="about"'), page.indexOf('id="contact"'));
    expect(about).not.toMatch(/currently|I work as|I work at|\bnow\b/i);
  });

  it('centres the case-study dialog (the CSS reset zeroes the browser default margin)', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/dialog\{[^}]*margin:auto/);
  });
  it('the hero facts do not claim a current job', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).not.toContain('<dt>Now</dt>');
  });

  it('demo images stay under 1.5 MB', () => {
    const total = files('public/demos').filter((f) => f.endsWith('.webp')).reduce((t, f) => t + statSync(f).size, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(1_572_864);
  });
  it('standard demo has its five pages, each linking the other four', () => {
    const pages = ['index', 'services', 'dentists', 'faq', 'contact'];
    for (const p of pages) {
      const html = readFileSync(`public/demos/standard/${p}.html`, 'utf8');
      for (const other of pages.filter((o) => o !== p)) expect(html, `${p} -> ${other}`).toContain(`href="${other}.html"`);
    }
  });
  it('high demo has booking and result pages with every booking step', () => {
    for (const p of ['index', 'services', 'dentists', 'reviews', 'contact', 'book', 'booking-result'])
      expect(statSync(`public/demos/high/${p}.html`).isFile()).toBe(true);
    const book = readFileSync('public/demos/high/book.html', 'utf8');
    for (const id of ['step-service', 'step-date', 'step-time', 'step-details', 'step-deposit']) expect(book).toContain(`id="${id}"`);
  });
  it('header has no name or logo, and centres the section links between side columns', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    const header = page.slice(page.indexOf('<header'), page.indexOf('</header>'));
    expect(header).not.toContain('className="brand"');
    expect(header).not.toContain('Kuzuii');
    expect(header).toContain('className="nav-actions"');
    expect(readFileSync('src/app/globals.css', 'utf8')).toMatch(/\.nav \.wrap\{[^}]*grid-template-columns:1fr auto 1fr/);
  });

  it('selected work includes the Teltonika provisioning automation', () => {
    const cases = readFileSync('src/lib/cases.ts', 'utf8');
    expect(cases).toContain('Teltonika Device Provisioning Automation');
    expect(cases).toContain('PyInstaller');
  });
  it('nav links have a hover that is visible in light mode', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/#nav-links a:hover\{[^}]*box-shadow/);
  });

  it('About shows growth beyond the backend', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).toContain('still learning');
  });

  it('has a case study on the inquiry-to-website process', () => {
    expect(readFileSync('src/lib/cases.ts', 'utf8')).toContain('From Inquiry to Finished Website');
  });
  it('robot pet is kept in the code but not mounted on the page', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).not.toContain('<RobotPet />');
    expect(page).not.toContain('HeroRobot');
    const pet = readFileSync('src/components/RobotPet.tsx', 'utf8');
    expect(pet).toContain('requestAnimationFrame');
    expect(pet).toContain('Hide robot');
    expect(pet).toContain('prefers-reduced-motion');
    const robot = readFileSync('src/components/Robot.tsx', 'utf8');
    expect(robot).toContain('data-pose');
    expect(robot).not.toContain('laptop');
  });
});
