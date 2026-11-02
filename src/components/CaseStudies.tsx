'use client';

import { useRef, useState } from 'react';
import { CASES, type CaseStudy } from '@/lib/cases';

const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

function Meta({ c }: { c: CaseStudy }) {
  return (
    <div className="case-meta">
      <span className={`pill${c.status === 'In progress' ? ' blue' : ''}`}><span className="dot" />{c.status}</span>
      {c.note && <span>{c.note}</span>}
    </div>
  );
}

const Chips = ({ items }: { items: string[] }) => <ul className="chips">{items.map((s) => <li key={s}>{s}</li>)}</ul>;

export function CaseStudies() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState<CaseStudy | null>(null);

  const open = (c: CaseStudy, e: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = e.currentTarget;
    setActive(c);
    dialog.current?.showModal();
    if (dialog.current) dialog.current.scrollTop = 0; // focusing the close button scrolls the dialog; start at the top
  };

  return (
    <>
      <div className="grid">
        {CASES.map((c, i) => (
          <article key={c.title} className={`case${i ? '' : ' feature'}`}>
            <div className="viz" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className="case-body">
              <Meta c={c} />
              <h3>{c.title}</h3>
              <p>{c.summary}</p>
              <Chips items={c.stack} />
              <button className="case-open" type="button" aria-haspopup="dialog" onClick={(e) => open(c, e)}>
                Read case study<span className="sr">: {c.title}</span><Arrow />
              </button>
            </div>
          </article>
        ))}
      </div>

      <dialog id="case" ref={dialog} aria-labelledby="case-title" onClose={() => opener.current?.focus()}
        onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
        <button className="btn btn-ghost icon-btn dlg-close" type="button" aria-label="Close case study" onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
        {active && (
          <>
            <div className="viz" dangerouslySetInnerHTML={{ __html: active.svg }} />
            <div className="case-doc">
              <div><Meta c={active} /><h2 id="case-title">{active.title}</h2></div>
              <div><h3>Problem</h3><p>{active.problem}</p></div>
              <div><h3>What I built</h3><ul className="list">{active.built.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Stack</h3><Chips items={active.stack} /></div>
              <div><h3>Lesson learned</h3><p className="lesson">{active.lesson}</p></div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
