import { LEVELS, type Level } from '@/lib/levels';

const HIGHLIGHTS: Record<Level, string[]> = {
  minimum: ['One page: services, prices, hours and map', 'Call, Viber and Messenger buttons', 'Clean, template-style look'],
  standard: ['4-5 pages with HMO list, FAQ and gallery', 'Inquiry form with spam protection', 'Polished brand style that works on phones', 'Google and Maps setup, visitor stats'],
  high: ['Online booking with a Maya deposit', 'FAQ chatbot that hands off to staff', 'Custom design, animations, dark mode', 'Speed, security and integrations'],
};

export function Levels() {
  return (
    <section className="sec" id="levels" aria-labelledby="levels-title">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="levels-title">Website levels</h2>
          <p>Not sure what to ask for? Open the same sample clinic site built three ways.</p>
        </div>
        <ul className="levels">
          {LEVELS.map((l) => (
            <li key={l.id} className="level-card">
              <h3>{l.label}</h3>
              <p className="level-term">{l.term}</p>
              <p>{l.meaning}</p>
              <ul className="level-list">{HIGHLIGHTS[l.id].map((h) => <li key={h}>{h}</li>)}</ul>
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
