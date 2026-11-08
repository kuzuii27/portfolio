'use client';

import type { CSSProperties } from 'react';
import { useState, useSyncExternalStore } from 'react';

const watchTheme = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => o.disconnect();
};

export function ThemeToggle() {
  const dark = useSyncExternalStore(watchTheme, () => document.documentElement.dataset.theme === 'dark', () => false);
  // Before the first click, start icons at their end frame so load does not animate.
  const [touched, setTouched] = useState(false);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    setTouched(true);
  };

  const style: CSSProperties = { animationDelay: touched ? '0s' : '-0.6s' };

  return (
    <button className="btn btn-ghost icon-btn theme-btn" type="button" aria-label="Dark theme" aria-pressed={dark} onClick={toggle}>
      <span className={`theme-morph morph-${dark ? 'dark' : 'light'}`} aria-hidden="true">
        <svg className="tt-sun" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        <svg className="tt-moon" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      </span>
    </button>
  );
}
