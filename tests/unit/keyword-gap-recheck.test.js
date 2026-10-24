import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { norm, tokens, queryCarries, gscEvidence, DECISIONS } = require('../../scripts/recheck-keyword-gaps.cjs');

describe('recheck-keyword-gaps / query matching', () => {
  it('normalises punctuation and case', () => {
    expect(norm('FT² Calculator!')).toBe('ft calculator');
    expect(tokens('certificate of deposit calculator')).toEqual(['certificate', 'deposit']);
  });

  it('treats word order and stopwords as irrelevant', () => {
    expect(queryCarries('cd bank calculator', 'bank cd calculator')).toBe(true);
    expect(queryCarries('loan calculator for business', 'business loan calculator')).toBe(true);
    expect(queryCarries('snow day calculator', 'snow days calculator')).toBe(false);
    expect(queryCarries('day count', 'calendar day count between dates')).toBe(true);
  });

  it('requires every keyword token, not just one', () => {
    expect(queryCarries('time card clock', 'time clock')).toBe(false);
    expect(queryCarries('time card clock', 'time card clock calculator')).toBe(true);
  });
});

describe('recheck-keyword-gaps / GSC evidence', () => {
  const pairs = [
    { query: 'thinset calculator', page: 'https://x/tile-grout/', impressions: 4, clicks: 0, position: 7.5 },
    { query: 'tile grout calculator', page: 'https://x/tile-grout/', impressions: 4, clicks: 0, position: 4 },
    { query: 'unrelated', page: 'https://x/other/', impressions: 100, clicks: 2, position: 2 },
  ];

  it('sums impressions and keeps the best position', () => {
    expect(gscEvidence('tile grout calculator', pairs)).toEqual({
      impressions: 4,
      clicks: 0,
      bestPosition: 4,
      matches: 1,
    });
  });

  it('returns zero evidence rather than throwing when nothing matches', () => {
    expect(gscEvidence('snow day calculator', pairs)).toEqual({
      impressions: 0,
      clicks: 0,
      bestPosition: null,
      matches: 0,
    });
  });
});

describe('recheck-keyword-gaps / decisions', () => {
  it('only approves a new page where the intent is genuinely distinct', () => {
    const approved = Object.entries(DECISIONS).filter(([, d]) => d.verdict === 'NEW_PAGE').map(([k]) => k);
    expect(approved).toEqual(['snow day calculator']);
  });

  it('gives every hold a reason', () => {
    for (const [keyword, d] of Object.entries(DECISIONS)) {
      if (d.verdict === 'HOLD') expect(d.why, keyword).toBeTruthy();
    }
  });

  it('never routes two different intents to a missing path', () => {
    for (const [keyword, d] of Object.entries(DECISIONS)) {
      if (d.path) expect(d.path, keyword).toMatch(/^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/);
    }
  });

  it('assigns the CD synonyms to the existing CD page', () => {
    for (const k of ['cd bank calculator', 'certificate deposit calculator', 'certified deposit calculator']) {
      expect(DECISIONS[k].path).toBe('/finance/cd-calculator');
    }
  });
});
