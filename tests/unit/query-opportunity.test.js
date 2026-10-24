import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Q = require('../../scripts/build-query-opportunity.cjs');

// The ranker exists so keyword targeting can be driven by real Search data
// (impressions, position, CTR) instead of the structural proxies the repo
// admits to in docs/KEYWORD-DIFFICULTY.md §0. These tests pin the pure
// helpers that decide what gets fixed first.

describe('build-query-opportunity / targetCtr', () => {
  it('is monotonically non-increasing as position gets deeper', () => {
    let prev = Infinity;
    for (let pos = 1; pos <= 50; pos++) {
      const v = Q.targetCtr(pos);
      expect(v, 'pos ' + pos).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('uses the documented bands', () => {
    expect(Q.targetCtr(1)).toBe(0.20);
    expect(Q.targetCtr(3)).toBe(0.20);
    expect(Q.targetCtr(4)).toBe(0.10);
    expect(Q.targetCtr(6)).toBe(0.10);
    expect(Q.targetCtr(9)).toBe(0.06);
    expect(Q.targetCtr(15)).toBe(0.03);
    expect(Q.targetCtr(400)).toBe(0.01);
  });

  it('never returns zero (the model is an assumption, not a guarantee)', () => {
    for (const pos of [0, 1, 100, 1000]) expect(Q.targetCtr(pos)).toBeGreaterThan(0);
  });
});

describe('build-query-opportunity / normPage', () => {
  it('joins GSC absolute URLs to bare stored paths', () => {
    // The join broke once because the pair export returns full URLs while the
    // page export stores '/cat/tool'. Both must normalise to one key.
    expect(Q.normPage('https://calcpromaster.com/family/child-height/')).toBe('/family/child-height');
    expect(Q.normPage('/family/child-height')).toBe('/family/child-height');
    expect(Q.normPage('/family/child-height/')).toBe('/family/child-height');
  });

  it('drops query strings and fragments', () => {
    expect(Q.normPage('https://calcpromaster.com/a/b/?x=1#y')).toBe('/a/b');
  });

  it('handles the site root without collapsing it to an empty string', () => {
    expect(Q.normPage('https://calcpromaster.com/')).toBe('/');
    expect(Q.normPage('')).toBe('/');
    expect(Q.normPage(undefined)).toBe('/');
  });
});

describe('build-query-opportunity / groupPairsByPage', () => {
  const pairs = [
    { query: 'b', page: 'https://x.com/family/a/', impressions: 10, clicks: 0, position: 8 },
    { query: 'a', page: '/family/a', impressions: 30, clicks: 1, position: 5 },
    { query: 'c', page: '/other/b', impressions: 4, clicks: 0, position: 40 }
  ];

  it('groups both URL shapes into one page key', () => {
    const g = Q.groupPairsByPage(pairs);
    expect(Object.keys(g).sort()).toEqual(['/family/a', '/other/b']);
    expect(g['/family/a'].pairImpressions).toBe(40);
    expect(g['/family/a'].pairClicks).toBe(1);
  });

  it('ranks each page\'s queries by impressions (the phrase to answer first)', () => {
    const g = Q.groupPairsByPage(pairs);
    expect(g['/family/a'].queries.map((q) => q.query)).toEqual(['a', 'b']);
  });

  it('survives empty and malformed rows', () => {
    expect(Q.groupPairsByPage([])).toEqual({});
    expect(Q.groupPairsByPage(null)).toEqual({});
    const g = Q.groupPairsByPage([{ query: 'x' }, null, undefined]);
    expect(Object.keys(g)).toEqual([]);
  });
});

describe('build-query-opportunity / classifyPage', () => {
  it('flags the fix-today case: page 1, impressions, zero clicks', () => {
    expect(Q.classifyPage({ impressions: 100, clicks: 0, position: 8 }, 20)).toBe('zero-click page 1');
  });

  it('does not call a page zero-click below the impression floor', () => {
    expect(Q.classifyPage({ impressions: 5, clicks: 0, position: 8 }, 20)).toBe('page 1 shaping');
  });

  it('keeps every zero-click page in a zero-click bucket', () => {
    // A page with zero clicks is never labelled 'striking distance': the whole
    // point of the ranker is to separate "nobody clicks" from "clicks, but low".
    expect(Q.classifyPage({ impressions: 100, clicks: 0, position: 15 }, 20)).toBe('zero-click deeper');
    expect(Q.classifyPage({ impressions: 100, clicks: 0, position: 12 }, 20)).toBe('zero-click deeper');
    expect(Q.classifyPage({ impressions: 100, clicks: 3, position: 15 }, 20)).toBe('striking distance');
    expect(Q.classifyPage({ impressions: 100, clicks: 3, position: 8 }, 20)).toBe('page 1 shaping');
    expect(Q.classifyPage({ impressions: 100, clicks: 3, position: 60 }, 20)).toBe('deep');
  });
});

describe('build-query-opportunity / scoreOpportunity', () => {
  it('scores the gap between measured CTR and the modelled band CTR', () => {
    // pos 8 → 0.06 target; 200 impressions, 0 clicks → 200 × 0.06 = 12
    expect(Q.scoreOpportunity({ impressions: 200, clicks: 0, position: 8 })).toBe(12);
  });

  it('never scores negative when a page beats the model', () => {
    expect(Q.scoreOpportunity({ impressions: 100, clicks: 50, position: 8 })).toBe(0);
  });

  it('does not divide by zero on a page with no impressions', () => {
    expect(Q.scoreOpportunity({ impressions: 0, clicks: 0, position: 50 })).toBe(0);
  });
});

describe('build-query-opportunity / rankPages', () => {
  const rows = [
    { path: '/deep', impressions: 500, clicks: 5, position: 40 },
    { path: '/zero', impressions: 200, clicks: 0, position: 8 },
    { path: '/strike', impressions: 100, clicks: 0, position: 15 },
    { path: '/shape', impressions: 300, clicks: 4, position: 7 }
  ];

  it('puts zero-click page-1 pages first', () => {
    expect(Q.rankPages(rows, {}, 20)[0].path).toBe('/zero');
  });

  it('ranks by status first, then modelled upside, then impressions', () => {
    //                               status rank
    // /zero  zero-click page 1      0
    // /shape page 1 shaping         2
    // /strike zero-click deeper     3
    // /deep  deep                   4
    const order = Q.rankPages(rows, {}, 20).map((r) => r.path);
    expect(order).toEqual(['/zero', '/shape', '/strike', '/deep']);
  });

  it('uses modelled upside to break ties inside a status bucket', () => {
    const tie = [
      { path: '/a', impressions: 100, clicks: 0, position: 8 },
      { path: '/b', impressions: 500, clicks: 0, position: 8 }
    ];
    expect(Q.rankPages(tie, {}, 20).map((r) => r.path)).toEqual(['/b', '/a']);
  });

  it('attaches the page\'s real queries and never mutates the input', () => {
    const pairMap = Q.groupPairsByPage([
      { query: 'child height predictor', page: '/zero', impressions: 42, clicks: 0, position: 9 }
    ]);
    const out = Q.rankPages(rows, pairMap, 20);
    const zero = out.find((r) => r.path === '/zero');
    expect(zero.queries[0].query).toBe('child height predictor');
    expect(zero.queryCount).toBe(1);
    expect(rows[0].status).toBeUndefined();
  });
});

describe('build-query-opportunity / summarize', () => {
  it('counts the zero-click page-1 set and totals the modelled upside', () => {
    const rows = Q.rankPages([
      { path: '/a', impressions: 200, clicks: 0, position: 8 },
      { path: '/b', impressions: 100, clicks: 0, position: 8 },
      { path: '/c', impressions: 100, clicks: 3, position: 30 }
    ], {}, 20);
    const s = Q.summarize(rows, { impressions: 1000, clicks: 3 });
    expect(s.pagesWithImpressions).toBe(3);
    expect(s.zeroClickPage1).toBe(2);
    expect(s.modelledUpside).toBe(rows.reduce((n, r) => n + r.upside, 0));
    expect(s.propertyTotals.impressions).toBe(1000);
  });
});
