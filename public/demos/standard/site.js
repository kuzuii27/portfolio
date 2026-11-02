// Mobile menu + demo inquiry form checks (nothing is sent).
(() => {
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  btn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  const form = document.getElementById('inquiry');
  if (!form) return;
  const rules = {
    name: [(v) => v.trim().length > 1, 'Enter your name.'],
    phone: [(v) => /^09\d{9}$/.test(v.replace(/[\s-]/g, '')), 'Use the format 09XX XXX XXXX.'],
    service: [(v) => v !== '', 'Choose a service.'],
    message: [(v) => v.trim().length >= 10, 'Write at least 10 characters.'],
  };
  const errId = { name: 'e-name', phone: 'e-phone', service: 'e-service', message: 'e-msg' };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = document.getElementById('ok');
    ok.textContent = '';
    let first = null;
    for (const [name, [test, msg]] of Object.entries(rules)) {
      const el = form.elements[name];
      const bad = !test(el.value);
      el.setAttribute('aria-invalid', String(bad));
      el.setAttribute('aria-describedby', errId[name]);
      document.getElementById(errId[name]).textContent = bad ? msg : '';
      if (bad && !first) first = el;
    }
    if (form.elements.hp_x.value) return; // spam trap: bots fill hidden fields
    if (first) { first.focus(); return; }
    form.reset();
    ok.textContent = 'Thanks! This is a demo, so nothing was sent. A real site would email the clinic and confirm by text.';
    ok.focus();
  });
})();
