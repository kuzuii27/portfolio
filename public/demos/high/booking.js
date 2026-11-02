// Booking steps for the demo clinic. Nothing is saved; choices live in sessionStorage so Back and the result page can show them.
(() => {
  const KEY = 'ngiti-booking';
  const form = document.getElementById('booking');
  const steps = ['step-service', 'step-date', 'step-time', 'step-details', 'step-deposit'];
  let state = {};
  try { state = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch {}
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  // Next 14 days from tomorrow, clinic closed on Sundays.
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dates = document.getElementById('dates');
  for (let i = 1; i <= 14; i++) {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue;
    const label = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
    dates.insertAdjacentHTML('beforeend', '<label class="opt"><input type="radio" name="date" value="' + iso(d) + '"><span><b>' + label + '</b></span></label>');
  }
  const times = document.getElementById('times');
  for (let h = 9; h <= 17; h++) {
    const label = (h > 12 ? h - 12 : h) + ':00 ' + (h >= 12 ? 'PM' : 'AM');
    times.insertAdjacentHTML('beforeend', '<label class="opt"><input type="radio" name="time" value="' + label + '"><span><b>' + label + '</b></span></label>');
  }

  // Restore earlier choices.
  for (const k of ['service', 'date', 'time']) {
    const el = state[k] && [...form.elements[k] instanceof RadioNodeList ? form.elements[k] : [form.elements[k]]].find((r) => r && r.value === state[k]);
    if (el) el.checked = true;
  }
  if (state.firstName) form.elements.firstName.value = state.firstName;
  if (state.viber) form.elements.viber.value = state.viber;

  const err = (k, msg) => { const p = form.querySelector('[data-err="' + k + '"]'); if (p) p.textContent = msg || ''; };
  const val = (k) => (form.elements[k] instanceof RadioNodeList ? form.elements[k].value : form.elements[k]?.value) || '';

  const checks = {
    'step-service': () => (val('service') ? null : ['service', 'Choose a service.']),
    'step-date': () => (val('date') ? null : ['date', 'Choose a date.']),
    'step-time': () => (val('time') ? null : ['time', 'Choose a time.']),
    'step-details': () => {
      const name = val('firstName').trim();
      const viber = val('viber').replace(/[\s-]/g, '');
      const bad = [];
      form.elements.firstName.setAttribute('aria-invalid', String(!name || name.length > 50));
      form.elements.viber.setAttribute('aria-invalid', String(!/^09\d{9}$/.test(viber)));
      err('firstName', name && name.length <= 50 ? '' : 'Enter your first name.');
      err('viber', /^09\d{9}$/.test(viber) ? '' : 'Use the format 09XX XXX XXXX.');
      if (!name || name.length > 50) bad.push(form.elements.firstName);
      if (!/^09\d{9}$/.test(viber)) bad.push(form.elements.viber);
      return bad.length ? ['_field', bad[0]] : null;
    },
  };

  let current = 0;
  const show = (i, focus = true) => {
    current = i;
    steps.forEach((id, j) => { document.getElementById(id).hidden = j !== i; });
    document.querySelectorAll('.progress li').forEach((li, j) => {
      li.classList.toggle('done', j < i);
      if (j === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (steps[i] === 'step-deposit') renderSummary();
    if (focus) document.getElementById(steps[i]).querySelector('input, button')?.focus();
  };
  const collect = () => {
    Object.assign(state, { service: val('service'), date: val('date'), time: val('time'), firstName: val('firstName').trim(), viber: val('viber').trim() });
    save();
  };
  const renderSummary = () => {
    const s = document.getElementById('summary');
    s.textContent = '';
    const rows = [['Service', state.service], ['Date', state.date && new Date(state.date + 'T12:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })], ['Time', state.time], ['Name', state.firstName], ['Deposit', '₱500 (deducted from your bill)']];
    for (const [k, v] of rows) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = k + ': '; d.append(b, v || ''); s.append(d); }
  };

  form.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-back')) { collect(); show(current - 1); }
    if (t.hasAttribute('data-next')) {
      const problem = checks[steps[current]]?.();
      if (problem) {
        if (problem[0] === '_field') problem[1].focus();
        else { err(problem[0], problem[1]); document.getElementById(steps[current]).querySelector('input')?.focus(); }
        return;
      }
      ['service', 'date', 'time'].forEach((k) => err(k, ''));
      collect(); show(current + 1);
    }
  });
  form.addEventListener('change', (e) => { if (e.target.type === 'radio') err(e.target.name, ''); });

  const makeRef = () => {
    const d = new Date();
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tail = ''; for (let i = 0; i < 4; i++) tail += abc[Math.floor(Math.random() * abc.length)];
    return 'NGITI-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + tail;
  };

  // Deposit through Maya's sandbox checkout. Without a key (503) it falls back to a pretend deposit so the demo never breaks.
  async function startDeposit({ service, firstName }) {
    const res = await fetch('/api/demo/maya-checkout', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service, firstName }),
    });
    // Only our own 'no key' answer means pretend; a platform 503 (overload, outage) is a real failure.
    const fallback = res.status === 503 && (await res.json().catch(() => ({}))).fallback === true;
    if (fallback) {
      const ref = makeRef();
      state.ref = ref; save();
      location.assign('booking-result.html?status=success&demo=1&ref=' + encodeURIComponent(ref));
      return;
    }
    if (!res.ok) throw new Error('checkout ' + res.status);
    const { redirectUrl, ref } = await res.json();
    state.ref = ref; save();
    location.assign(redirectUrl);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    collect();
    const pay = document.getElementById('pay');
    pay.disabled = true; err('deposit', '');
    try { await startDeposit({ service: state.service, firstName: state.firstName }); }
    catch { err('deposit', 'Couldn\u2019t start the payment, please try again.'); pay.disabled = false; }
  });

  // Coming back from Maya with the browser's Back button can restore this page with Pay still disabled.
  addEventListener('pageshow', (e) => { if (e.persisted) document.getElementById('pay').disabled = false; });

  show(0, false);
})();
