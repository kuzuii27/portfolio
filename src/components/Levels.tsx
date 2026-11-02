import { LEVELS, type Level } from '@/lib/levels';

const HIGHLIGHTS: Record<Level, string[]> = {
  minimum: ['One page with services, prices, hours and map', 'Call, Viber and Messenger buttons', 'Clean, simple look'],
  standard: ['5 pages with FAQ, gallery and testimonials', 'Inquiry form with checks', 'Polished brand style that works on phones'],
  high: ['Online booking with a Maya sandbox deposit', 'FAQ chatbot that hands off to staff', 'Custom design, animations, dark mode'],
};

export function Levels() {
  return (
    <section className="sec" id="levels" aria-labelledby="levels-title">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="levels-title">Website levels</h2>
          <p>Three levels for any kind of business: a shop, a school, a service or an internal tool. The demos use one sample business so you can compare them side by side.</p>
        </div>
        <ul className="levels">
          {LEVELS.map((l) => (
            <li key={l.id} className="level-card">
              <h3>{l.label}</h3>
              <p className="level-term">{l.term}</p>
              <p>{l.meaning}</p>
              <p className="level-sub">In the sample demo</p>
              <ul className="level-list">{HIGHLIGHTS[l.id].map((h) => <li key={h}>{h}</li>)}</ul>
              <p className="level-sub">What you get in a real project</p>
              <ul className="level-list">{l.full.map((f) => <li key={f}>{f}</li>)}</ul>
              <a className="btn btn-ghost" href={l.demo} target="_blank" rel="noopener">
                Open demo<span className="sr"> of the {l.label} level (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
