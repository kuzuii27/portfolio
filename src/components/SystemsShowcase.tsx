'use client';

import { SYSTEMS } from '@/lib/systems';
import { askAbout } from '@/lib/askAbout';

/** "What I can build" cards. Only cards with `proof` claim real past work; the rest are scope I can deliver. */
export function SystemsShowcase() {
  return (
    <>
      <ul className="sys-grid">
        {SYSTEMS.map((s) => (
          <li className="sys-card" key={s.id}>
            <svg className="sys-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
            <h3>{s.title}</h3>
            <p className="sys-out">{s.outcome}</p>
            <ul className="sys-feat">{s.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="sys-proof">{s.proof ?? 'Can build, scoped to your business.'}</p>
            <button type="button" className="sys-ask" onClick={() => askAbout(s.title)} aria-label={`Ask about ${s.title}`}>Ask about this</button>
          </li>
        ))}
      </ul>
      <p className="sys-more"><button type="button" className="btn btn-ghost" onClick={() => askAbout('')}>Don&apos;t see yours? Tell me what you need</button></p>
    </>
  );
}
