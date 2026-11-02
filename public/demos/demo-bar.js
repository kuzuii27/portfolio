// Sample-site bar: shows the level, a 'What's in this level' panel (from <template id="level-checklist">) and a way back.
(() => {
  const LABELS = { minimum: 'Minimum', standard: 'Standard', high: 'High quality' };
  const level = document.body.dataset.level;
  const tpl = document.getElementById('level-checklist');
  const bar = document.createElement('div');
  bar.className = 'kz-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Sample site notice');
  bar.innerHTML =
    '<span><b>Sample site</b>, not a real clinic</span>' +
    '<span class="kz-level">Level: ' + (LABELS[level] || level) + '</span>' +
    '<button type="button" aria-expanded="false" aria-controls="kz-panel">What\u2019s in this level</button>' +
    '<a class="kz-back" href="/#levels">\u2190 Back to Kuzuii\u2019s portfolio</a>';
  const panel = document.createElement('div');
  panel.className = 'kz-panel';
  panel.id = 'kz-panel';
  panel.hidden = true;
  panel.innerHTML = '<h2>What\u2019s in the ' + (LABELS[level] || level) + ' level</h2>';
  if (tpl) panel.appendChild(tpl.content.cloneNode(true));
  const btn = bar.querySelector('button');
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.body.prepend(bar, panel);
})();
