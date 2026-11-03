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
  it('offers the web resume PDF in job mode, without phone numbers', () => {
    const form = readFileSync('src/components/InquiryForm.tsx', 'utf8');
    expect(form).toMatch(/href="\/Kuzui-Santillan-Resume\.pdf"[^>]*download/);
    const pdf = readFileSync('public/Kuzui-Santillan-Resume.pdf');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.includes('09929469627') || pdf.includes('09072734117')).toBe(false);
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
  it('page has a Website levels section with all three demos', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    expect(page).toContain('<Levels />');
    expect(page).toContain('href="#levels"');
    const levels = readFileSync('src/components/Levels.tsx', 'utf8');
    expect(levels).toContain('id="levels"');
    expect(levels).toContain('LEVELS.map');
    expect(levels).toMatch(/href=\{l\.demo\}[^>]*target="_blank"/);
  });

  it('form asks for level, not budget', () => {
    const form = readFileSync('src/components/InquiryForm.tsx', 'utf8');
    expect(form).toContain('name="level"');
    expect(form).not.toContain('name="budget"');
    expect(form).not.toContain('Budget (PHP)');
  });
  it('every demo page has the sample-site bar and checklist', () => {
    const pages = files('public/demos').filter((f) => f.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(0);
    for (const f of pages) {
      const html = readFileSync(f, 'utf8');
      expect(html, f).toMatch(/data-level="(minimum|standard|high)"/);
      expect(html, f).toContain('/demos/demo-bar.js');
      expect(html, f).toContain('id="level-checklist"');
    }
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
  it('each level lists what the full application includes, on the portfolio and in its demo', () => {
    const levels = readFileSync('src/lib/levels.ts', 'utf8');
    expect(levels).toContain('full:');
    expect(readFileSync('src/components/Levels.tsx', 'utf8')).toContain('l.full.map');
    for (const [id, item] of [['minimum', 'Domain and hosting set up'], ['standard', 'Admin portal to update your own content'], ['high', 'Custom features built around your workflow']]) {
      expect(levels).toContain(item);
      const page = readFileSync(`public/demos/${id}/index.html`, 'utf8');
      expect(page, id).toContain('In the full application');
      expect(page, id).toContain(item);
    }
  });
  it('level descriptions are generic, not tied to the clinic sample', () => {
    const copy = readFileSync('src/lib/levels.ts', 'utf8') + readFileSync('src/components/Levels.tsx', 'utf8');
    expect(copy).not.toMatch(/dentist|clinic|HMO|patient/i);
    expect(copy).not.toContain('any kind of business');
    expect(readFileSync('src/app/page.tsx', 'utf8')).not.toContain('What I use every day');
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
  it('hero has the friendly robot, decorative and motion-safe', () => {
    expect(readFileSync('src/app/page.tsx', 'utf8')).toContain('<Robot />');
    const robot = readFileSync('src/components/Robot.tsx', 'utf8');
    expect(robot).toContain('aria-hidden="true"');
    expect(robot).toContain('prefers-reduced-motion');
    expect(readFileSync('src/app/globals.css', 'utf8')).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*\.robot/);
  });
});
