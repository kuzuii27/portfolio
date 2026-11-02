import { describe, expect, it } from 'vitest';
import { answer, QUICK_REPLIES } from '../public/demos/high/faq.js';

const id = (q: string) => {
  const r = answer(q);
  return 'id' in r ? r.id : `handoff:${r.reason}`;
};

describe('FAQ bot', () => {
  it('answers known questions in English and Taglish', () => {
    expect(id('How much is cleaning?')).toBe('prices');
    expect(id('MAGKANO po ang cleaning??')).toBe('prices');
    expect(id('Do you accept Maxicare?')).toBe('hmo');
    expect(id('bukas ba kayo sa linggo')).toBe('hours');
    expect(id('saan kayo / may parking ba')).toBe('location');
    expect(id('pa-book po')).toBe('book');
  });

  it('symptoms always go to staff', () => {
    for (const q of ['masakit ngipin ko', 'my gums are bleeding', 'namamaga pisngi', 'magkano extraction, masakit kasi'])
      expect(answer(q)).toEqual({ kind: 'handoff', reason: 'symptom' });
  });

  it('common pain phrasings go to staff even inside other questions', () => {
    for (const q of ['my tooth hurts', 'my tooth hurts, magkano extraction?', 'sumasakit ngipin ko, magkano?', 'makirot ngipin ko pa-book po',
      'sore gums, open ba kayo bukas', 'kumikirot', 'cracked tooth', 'nabasag ngipin ko'])
      expect(answer(q), q).toEqual({ kind: 'handoff', reason: 'symptom' });
    expect(id('Does cleaning hurt?')).toBe('comfort');
  });

  it('card payment questions get the payment answer, not HMO', () => {
    expect(id('can I pay by card?')).toBe('payment');
    expect(id('HMO card accepted?')).toBe('hmo');
  });

  it('unknown goes to staff', () => {
    for (const q of ['asdf qwerty', '', '   '])
      expect(answer(q)).toEqual({ kind: 'handoff', reason: 'unknown' });
  });

  it('every quick reply gets an answer', () => {
    expect(QUICK_REPLIES.map((r: { label: string }) => r.label)).toEqual(['Prices', 'HMO', 'Hours', 'Location & parking', 'Book an appointment']);
    for (const r of QUICK_REPLIES) expect(answer(r.question).kind).toBe('answer');
  });
});
