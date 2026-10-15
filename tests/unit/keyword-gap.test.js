// ============================================================
// Keyword-gap classifier rules.
//
// This classifier is a heuristic stack (plural/gerund stemming, a small synonym
// map, a boilerplate filter and a title-first coverage rule) and it was tuned
// against real exports — every rule here exists because a naive version produced
// a wrong answer that looked plausible (a "concrete estimator" gap, an EV page
// credited with concrete, a "day count" match on a screw-count page). The tests
// pin the behaviour so the next tuning pass cannot silently regress it.
// ============================================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const G = require('../../scripts/audit-keyword-gap.cjs');

// A tiny stand-in for the built site. `df` is how many pages carry a token —
// the classifier uses it to tell topical text from site-wide furniture.
function page(path, title, body) {
  return { path, title, h1: title, titleTokens: new Set(G.keyTokens(title + ' ' + path)), bodyTokens: new Set(G.keyTokens(body)) };
}
function site(pages) {
  const df = new Map();
  for (const p of pages) for (const t of new Set([...p.titleTokens, ...p.bodyTokens])) df.set(t, (df.get(t) || 0) + 1);
  for (const p of pages) p.df = df;
  return pages;
}

describe('keyword-gap: token normalization', () => {
  it('stems plurals and gerunds the way the exports need', () => {
    expect(G.stem('grades')).toBe('grade');
    expect(G.stem('hours')).toBe('hour');
    expect(G.stem('compounding')).toBe('compound'); // no invented silent e
    expect(G.stem('tipping')).toBe('tip');          // doubled consonant is the word
    // The words that need the silent e back are synonyms, not stem guesses.
    expect(G.canon('grading')).toBe('grade');
    expect(G.canon('measuring')).toBe('measure');
    expect(G.stem('class')).toBe('class');        // not "clas"
  });

  it('maps only unambiguous synonyms', () => {
    expect(G.canon('cement')).toBe('concrete');
    expect(G.canon('grading')).toBe('grade');
    expect(G.canon('grader')).toBe('grade');
    expect(G.canon('sci')).toBe('scientific');
    expect(G.canon('amortisation')).toBe('amortization');
    expect(G.canon('graphical')).toBe('graph');   // chained, not one hop
    expect(G.canon('paycheck')).toBe('salary');
    // Ambiguous words must NOT be mapped: a wrong synonym hides a real gap.
    expect(G.canon('bank')).toBe('bank');
    expect(G.canon('certificate')).toBe('certificate');
  });

  it('drops stop words, generic suffixes and abbreviations', () => {
    expect(G.keyTokens('calculator for grading')).toEqual(['grade']);
    expect(G.keyTokens('estimate compound interest')).toEqual(['compound', 'interest']);
    expect(G.keyTokens('compound int calculator')).toEqual(['compound', 'interest']);
    expect(G.keyTokens('concrete measurements calculator')).toEqual(['concrete']);
    expect(G.keyTokens('hour counter')).toEqual(['hour', 'counter']);
  });

  it('excludes brand-only keywords instead of padding the gap list', () => {
    expect(G.isBrandOnly('google calculator')).toBe(true);
    expect(G.isBrandOnly('xe currency converter')).toBe(false); // "currency" is a real intent
    expect(G.isBrandOnly('peptide calculator')).toBe(false);
  });
});

describe('keyword-gap: coverage verdicts', () => {
  const pages = site([
    page('/finance/compound-interest', 'Compound Interest Calculator', 'compound interest growth over time'),
    page('/finance/cd-calculator', 'CD Calculator: Certificate of Deposit', 'annual percentage yield term'),
    page('/construction/concrete-slab', 'Concrete Slab Calculator', 'volume bags cubic yards'),
    page('/math/percentage', 'Percentage Calculator', 'percent of a number'),
    page('/guides/compound-interest', 'Compound Interest Guide', 'compounding yearly monthly')
  ]);

  it('calls a keyword covered when the page title states it', () => {
    expect(G.classify('compound interest calculator', pages).verdict).toBe('COVERED');
    expect(G.classify('percentage calculator', pages).verdict).toBe('COVERED');
    expect(G.classify('calculator for grading', pages).verdict).toBe('GAP'); // no grade page in this fixture
  });

  it('routes a wording variant to the page that owns the intent', () => {
    // cement → concrete, and "measurements" is filler: this is the concrete page.
    const c = G.classify('concrete measurements calculator', pages);
    expect(c.verdict).toBe('COVERED');
    expect(c.page.path).toBe('/construction/concrete-slab');
  });

  it('returns GAP when no page states it, and WEAK when only the body does', () => {
    expect(G.classify('peptide calculator', pages).verdict).toBe('GAP');
    const w = G.classify('compounding yearly', pages);
    expect(w.verdict).toBe('WEAK');
    expect(w.page.path).toBe('/guides/compound-interest');
  });

  it('ignores site-wide boilerplate as evidence', () => {
    // "concrete" in a footer paragraph must not make the EV page the concrete page.
    const withFurniture = site([
      page('/auto/ev-range', 'EV Range Estimator', 'battery efficiency'),
      ...['a', 'b', 'c', 'd', 'e'].map((n) => page('/x/' + n, 'Page ' + n, 'generic prose mentioning concrete volumes and mortgage expense'))
    ]);
    const c = G.classify('concrete estimating', withFurniture);
    expect(c.verdict).toBe('GAP');
    expect(G.distinctive(withFurniture[0], 'concrete')).toBe(false);
  });
});
