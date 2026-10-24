import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Pure logic only: the Report reads deploy/ + GSC snapshots, which do not exist
// in a unit-test context, so the maths is exercised in isolation.
const {
  coverageTransition, fallbackGroups, summarize, shareAtLeast, extractDocPaths, sitemapPaths,
  UNKNOWN, DISCOVERED,
} = require('../../scripts/analyze-discovered-fallback.cjs');

const SNAPSHOT = [
  { url: '/a/', coverage: DISCOVERED },
  { url: '/b/', coverage: DISCOVERED },
  { url: '/c/', coverage: UNKNOWN },
  { url: '/d/', coverage: UNKNOWN },
  { url: '/e/', coverage: 'Submitted and indexed' },
  { url: '/only-before/', coverage: DISCOVERED },
];

describe('coverageTransition', () => {
  const after = {
    '/a/': DISCOVERED, // stayed
    '/b/': UNKNOWN, // the fallback under investigation
    '/c/': DISCOVERED, // the opposite move
    '/d/': UNKNOWN, // stayed
    '/e/': 'Submitted and indexed',
  };

  it('compares only the URLs both snapshots hold', () => {
    const t = coverageTransition(SNAPSHOT, after);
    // /only-before/ was not re-inspected, so it is not a regression
    expect(t.common).toBe(5);
    expect(t.slipped).toEqual(['/b/']);
  });

  it('separates the two directions of the same transition', () => {
    const t = coverageTransition(SNAPSHOT, after);
    expect(t.slipped).toEqual(['/b/']);
    expect(t.gained).toEqual(['/c/']);
  });

  it('records unchanged URLs separately from moves', () => {
    const t = coverageTransition(SNAPSHOT, after);
    expect(t.stayed.map((s) => s.url)).toEqual(['/a/', '/d/', '/e/']);
    expect(t.moves).toEqual([
      { move: `${DISCOVERED} ➜ ${UNKNOWN}`, count: 1 },
      { move: `${UNKNOWN} ➜ ${DISCOVERED}`, count: 1 },
    ]);
  });

  it('reports the move counts in descending order', () => {
    const small = [{ url: '/a/', coverage: DISCOVERED }, { url: '/b/', coverage: DISCOVERED }];
    const t = coverageTransition(small, { '/a/': UNKNOWN, '/b/': UNKNOWN });
    expect(t.moves).toEqual([{ move: `${DISCOVERED} ➜ ${UNKNOWN}`, count: 2 }]);
  });

  it('handles empty and missing input without throwing', () => {
    expect(coverageTransition([], {}).common).toBe(0);
    expect(coverageTransition(null, null).slipped).toEqual([]);
  });
});

describe('fallbackGroups', () => {
  const after = { '/a/': DISCOVERED, '/b/': UNKNOWN, '/c/': DISCOVERED, '/d/': UNKNOWN, '/e/': 'Submitted and indexed' };

  it('splits the pages that were all Discovered on the start date', () => {
    const g = fallbackGroups(SNAPSHOT, after);
    expect(g.stayedDiscovered).toEqual(['/a/']);
    expect(g.fellToUnknown).toEqual(['/b/']);
    expect(g.unknownToDiscovered).toEqual(['/c/']);
  });

  it('accounts for every URL that started Discovered', () => {
    const g = fallbackGroups(SNAPSHOT, after);
    // 2 Discovered URLs in the compared set: /a/ stayed, /b/ fell
    expect(g.discoveredAtStart).toBe(g.stayedDiscovered.length + g.fellToUnknown.length);
    expect(g.discoveredAtStart).toBe(2);
  });

  it('ignores a Discovered URL that was not inspected this time', () => {
    const g = fallbackGroups(SNAPSHOT, after);
    expect(g.stayedDiscovered).not.toContain('/only-before/');
  });
});

describe('summarize', () => {
  it('takes the middle value for an odd count', () => {
    expect(summarize([5, 1, 3]).median).toBe(3);
  });

  it('averages the two middles for an even count', () => {
    expect(summarize([1, 2, 3, 4]).median).toBe(2.5);
  });

  it('reports min, max and mean', () => {
    const s = summarize([2, 4, 6]);
    expect(s.min).toBe(2);
    expect(s.max).toBe(6);
    expect(s.mean).toBe(4);
    expect(s.n).toBe(3);
  });

  it('returns nulls instead of NaN for an empty group', () => {
    expect(summarize([])).toEqual({ n: 0, min: null, median: null, mean: null, max: null });
    expect(summarize(null).median).toBeNull();
  });

  it('drops non-numeric values rather than counting them as zero', () => {
    expect(summarize([1, null, undefined, 'x', '', true, 3]).n).toBe(2);
  });

  it('keeps a real zero — no inlinks is a measurement, not a missing value', () => {
    const s = summarize([0, 0, 6]);
    expect(s.n).toBe(3);
    expect(s.min).toBe(0);
    expect(s.mean).toBe(2);
  });
});

describe('shareAtLeast', () => {
  it('counts the threshold as inclusive', () => {
    expect(shareAtLeast([3, 4], 3)).toBe(1);
  });

  it('returns a fraction, not a count', () => {
    expect(shareAtLeast([1, 2, 3, 4], 3)).toBe(0.5);
  });

  it('returns null for an empty group so a missing sample never prints as 0%', () => {
    expect(shareAtLeast([], 3)).toBeNull();
  });
});

describe('extractDocPaths', () => {
  it('pulls the two-segment page paths out of the request-indexing tables', () => {
    const md = '| 1 | `https://calcpromaster.com/finance/pmi-calculator/` | 453 |\n| 2 | `/business/cac/` | 1 |';
    expect(extractDocPaths(md).sort()).toEqual(['/business/cac/', '/finance/pmi-calculator/']);
  });

  it('deduplicates a URL that appears both bare and absolute', () => {
    const md = '/finance/apy-calculator/ and https://calcpromaster.com/finance/apy-calculator/';
    expect(extractDocPaths(md)).toEqual(['/finance/apy-calculator/']);
  });

  it('does not invent paths out of prose or one-segment links', () => {
    expect(extractDocPaths('GSC → URL Inspection → Request Indexing. Sirf 12/day limit hai.')).toEqual([]);
  });
});

describe('sitemapPaths', () => {
  it('strips the host and normalises the trailing slash', () => {
    const xml = '<url><loc>https://calcpromaster.com/finance/pmi-calculator</loc></url>';
    expect([...sitemapPaths(xml)]).toEqual(['/finance/pmi-calculator/']);
  });

  it('keeps the site root as "/"', () => {
    expect([...sitemapPaths('<loc>https://calcpromaster.com/</loc>')]).toEqual(['/']);
  });
});
