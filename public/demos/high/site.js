// Theme toggle, mobile menu, scroll reveal and before/after sliders.
(() => {
  const root = document.documentElement;
  document.querySelector('.theme')?.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ngiti-theme', root.dataset.theme); } catch {}
  });

  const menu = document.querySelector('.icon-btn.menu');
  const nav = document.getElementById('site-nav');
  menu?.addEventListener('click', () => menu.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.focus(); }
  });

  const items = document.querySelectorAll('.reveal');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  document.querySelectorAll('.ba input[type=range]').forEach((r) => {
    const set = () => r.parentElement.style.setProperty('--pos', r.value + '%');
    r.addEventListener('input', set); set();
  });
})();
