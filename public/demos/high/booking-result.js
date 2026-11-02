// Shows the result of the deposit from the URL. Only the four known statuses are trusted; anything else is 'unknown'.
(() => {
  const q = new URLSearchParams(location.search);
  const status = q.get('status');
  const ref = /^NGITI-\d{8}-[A-Z0-9]{4}$/.test(q.get('ref') || '') ? q.get('ref') : '';
  let state = {};
  try { state = JSON.parse(sessionStorage.getItem('ngiti-booking') || '{}'); } catch {}
  const title = document.getElementById('r-title');
  const text = document.getElementById('r-text');
  const cta = document.getElementById('r-cta');
  const msg = {
    success: ['Deposit received (sandbox).', 'Your slot is held. Booking ref ' + (ref || 'not available') + '. A real clinic would now confirm by Viber.' + (q.get('demo') ? ' (Pretend deposit: the Maya sandbox key is not set up yet.)' : '')],
    failure: ['Payment failed.', 'Nothing was charged. Please try again.'],
    cancel: ['Payment cancelled.', 'Your booking was not completed. You can try again anytime.'],
  }[status] || ['We couldn\u2019t confirm the payment status.', 'If you completed a payment, the clinic will check it and message you. Otherwise, please try booking again.'];
  title.textContent = msg[0];
  text.textContent = msg[1];
  if (status === 'success') {
    cta.textContent = 'Book another visit';
    const s = document.getElementById('r-summary');
    const rows = [['Service', state.service], ['Date', /^\d{4}-\d{2}-\d{2}$/.test(state.date || '') ? new Date(state.date + 'T12:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) : ''], ['Time', state.time], ['Name', state.firstName]].filter(([, v]) => v);
    for (const [k, v] of rows) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = k + ': '; d.append(b, v); s.append(d); }
    s.hidden = rows.length === 0;
  }
  title.focus();
})();
