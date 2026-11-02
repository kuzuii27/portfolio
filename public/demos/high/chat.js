// FAQ chatbot widget (demo). Answers from faq.js; anything else is handed to staff (nothing is actually sent).
import { answer, QUICK_REPLIES } from '/demos/high/faq.js';

const bubble = document.createElement('button');
bubble.className = 'chat-bubble';
bubble.type = 'button';
bubble.setAttribute('aria-label', 'Chat with Ngiti Dental');
bubble.setAttribute('aria-expanded', 'false');
bubble.setAttribute('aria-controls', 'chat-panel');
bubble.innerHTML = '<span aria-hidden="true">💬</span>';

const panel = document.createElement('section');
panel.className = 'chat-panel';
panel.id = 'chat-panel';
panel.hidden = true;
panel.setAttribute('aria-label', 'Ngiti Dental assistant');
panel.innerHTML =
  '<div class="chat-head"><div><b>Ngiti assistant</b><small>Demo · answers common questions</small></div>' +
  '<button class="x" type="button" aria-label="Close chat">✕</button></div>' +
  '<div class="chat-log" role="log" aria-live="polite"></div>' +
  '<div class="chips-row" aria-label="Quick questions"></div>' +
  '<form class="chat-form"><label class="sr" for="chat-q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">Your question</label>' +
  '<input id="chat-q" autocomplete="off" placeholder="Ask in English or Taglish"><button type="submit">Send</button></form>';
document.body.append(bubble, panel);

const log = panel.querySelector('.chat-log');
const input = panel.querySelector('#chat-q');
const add = (who, text, link) => {
  const m = document.createElement('div');
  m.className = 'msg ' + who;
  m.textContent = text;
  if (link) { const a = document.createElement('a'); a.href = link; a.textContent = ' Book now \u2192'; m.append(a); }
  log.append(m);
  log.scrollTop = log.scrollHeight;
  return m;
};

let greeted = false;
const open = () => {
  panel.hidden = false;
  bubble.setAttribute('aria-expanded', 'true');
  if (!greeted) {
    add('bot', 'Hi! I\u2019m the Ngiti Dental assistant (demo). Ask about prices, HMO, hours, location or booking. For anything else, I\u2019ll pass your question to our staff.');
    greeted = true;
  }
  input.focus();
};
const close = () => { panel.hidden = true; bubble.setAttribute('aria-expanded', 'false'); bubble.focus(); };
bubble.addEventListener('click', () => (panel.hidden ? open() : close()));
panel.querySelector('.x').addEventListener('click', close);
panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

const handoff = (reason, question) => {
  add('bot', reason === 'symptom'
    ? 'That sounds like something our dentist should check, so I\u2019ll pass it to our staff. If it\u2019s severe, please call 0900 000 0000.'
    : 'I\u2019m not sure about that one. I\u2019ll pass your question to our staff.');
  const f = document.createElement('form');
  f.className = 'handoff';
  f.noValidate = true;
  const uid = Math.random().toString(36).slice(2, 7);
  f.innerHTML =
    '<label for="hn-' + uid + '">First name</label><input id="hn-' + uid + '" name="n" autocomplete="given-name" maxlength="50">' +
    '<label for="hv-' + uid + '">Viber number</label><input id="hv-' + uid + '" name="v" type="tel" inputmode="tel" placeholder="09XX XXX XXXX">' +
    '<p class="ferr" role="alert"></p><button type="submit">Send to staff</button>';
  log.append(f);
  log.scrollTop = log.scrollHeight;
  f.elements.n.focus();
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.elements.n.value.trim();
    const viber = f.elements.v.value.replace(/[\s-]/g, '');
    const okName = name.length > 0 && name.length <= 50;
    const okViber = /^09\d{9}$/.test(viber);
    f.elements.n.setAttribute('aria-invalid', String(!okName));
    f.elements.v.setAttribute('aria-invalid', String(!okViber));
    f.querySelector('.ferr').textContent = !okName ? 'Enter your first name.' : !okViber ? 'Use the format 09XX XXX XXXX.' : '';
    if (!okName) { f.elements.n.focus(); return; }
    if (!okViber) { f.elements.v.focus(); return; }
    f.remove();
    add('bot', 'Sent to staff (demo): a real site would forward \u201c' + question + '\u201d to the clinic by Viber or email. They reply within clinic hours.').classList.add('staff');
    input.focus();
  });
};

const ask = (q) => {
  q = q.trim();
  if (!q) return;
  add('me', q);
  const r = answer(q);
  setTimeout(() => (r.kind === 'answer' ? add('bot', r.text, r.link) : handoff(r.reason, q)), 350);
};

const chips = panel.querySelector('.chips-row');
for (const r of QUICK_REPLIES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = r.label;
  b.addEventListener('click', () => ask(r.question));
  chips.append(b);
}
panel.querySelector('.chat-form').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); input.value = ''; });
