'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const watchTheme = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => o.disconnect();
};

export function ThemeToggle() {
  const dark = useSyncExternalStore(watchTheme, () => document.documentElement.dataset.theme === 'dark', () => false);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
  };

  return (
    <button className="btn btn-ghost icon-btn theme-btn" type="button" aria-label="Dark theme" aria-pressed={dark} onClick={toggle}>
      <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
    </button>
  );
}

export function MenuButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const links = document.getElementById('nav-links');
    links?.classList.toggle('open', open);
    const close = (e: Event) => { if ((e.target as HTMLElement).closest('#nav-links a')) setOpen(false); };
    links?.addEventListener('click', close);
    return () => links?.removeEventListener('click', close);
  }, [open]);

  return (
    <button className="btn btn-ghost icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen(!open)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
  );
}
