import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { rankOf, splitSet, advanceRate, weeksToClear, addWeeks } = require('../../scripts/build-index-burndown.cjs');

describe('rankOf', () => {
  it('orders the real index pipeline', () => {
    expect(rankOf('URL is unknown to Google')).toBe(0);
    expect(rankOf('Discovered - currently not indexed')).toBe(1);
    expect(rankOf('Crawled - currently not indexed')).toBe(2);
    expect(rankOf('Submitted and indexed')).toBe(3);
  });

  it('returns null for states that are not a queue position', () => {
    expect(rankOf('Page with redirect')).toBeNull();
    expect(rankOf('Excluded by ‘noindex’ tag')).toBeNull();
    expect(rankOf('Alternate page with proper canonical tag')).toBeNull();
    expect(rankOf('Duplicate, Google chose different canonical than user')).toBeNull();
    expect(rankOf(undefined)).toBeNull();
  });
});

describe('splitSet', () => {
  const results = [
    { url: '/a', coverage: 'URL is unknown to Google' },
    { url: '/b', coverage: 'Discovered - currently not indexed' },
    { url: '/c', coverage: 'Submitted and indexed' },
    { url: '/d', coverage: 'Page with redirect' },
    { url: '/e', coverage: 'Excluded by ‘noindex’ tag' }
  ];

  it('separates the real queue from pages that will never be indexed as-is', () => {
    const s = splitSet(results);
    expect(s.total).toBe(5);
    expect(s.waiting).toBe(2);
    expect(s.indexed).toBe(1);
    expect(s.notCandidates).toBe(2);
    expect(s.candidates).toBe(3);
  });

  it('records why each non-candidate was excluded', () => {
    const s = splitSet(results);
    expect(s.notCandidateReasons['Page with redirect']).toBe(1);
    expect(s.notCandidateReasons['Excluded by ‘noindex’ tag']).toBe(1);
  });

  it('handles an empty set without dividing by zero', () => {
    expect(splitSet([]).total).toBe(0);
    expect(splitSet(null).waiting).toBe(0);
  });
});

describe('advanceRate', () => {
  const before = {
    ranAt: '2026-10-05T00:00:00.000Z',
    results: [
      { url: '/a', coverage: 'URL is unknown to Google' },
      { url: '/b', coverage: 'URL is unknown to Google' },
      { url: '/c', coverage: 'Discovered - currently not indexed' },
      { url: '/d', coverage: 'Submitted and indexed' },
      { url: '/gone', coverage: 'URL is unknown to Google' }
    ]
  };
  const after = {
    ranAt: '2026-10-12T00:00:00.000Z',
    results: [
      { url: '/a', coverage: 'Submitted and indexed' },
      { url: '/b', coverage: 'Discovered - currently not indexed' },
      { url: '/c', coverage: 'Crawled - currently not indexed' },
      { url: '/d', coverage: 'Submitted and indexed' },
      { url: '/new', coverage: 'URL is unknown to Google' }
    ]
  };

  it('measures only URLs present in both snapshots', () => {
    const r = advanceRate(before, after);
    expect(r.commonUrls).toBe(4); // /gone and /new are not comparable
    expect(r.days).toBe(7);
  });

  it('counts ladder stages advanced and pages that became indexed', () => {
    const r = advanceRate(before, after);
    // /a 0→3 = 3, /b 0→1 = 1, /c 1→2 = 1, /d 3→3 = 0  → 5 stages
    expect(r.stagesAdvanced).toBe(5);
    expect(r.becameIndexed).toBe(1);
    expect(r.leftUnknown).toBe(2);
  });

  it('converts to per-day rates', () => {
    const r = advanceRate(before, after);
    expect(r.stagesPerDay).toBeCloseTo(5 / 7, 5);
    expect(r.indexedPerDay).toBeCloseTo(1 / 7, 5);
  });

  it('never counts a backwards move as progress', () => {
    const r = advanceRate(after, before);
    expect(r.stagesAdvanced).toBe(0);
    expect(r.becameIndexed).toBe(0);
  });

  it('reports pages that slipped back down the ladder instead of hiding them', () => {
    // Real queues do this: 133 pages went "discovered" → "unknown" between two
    // whole-queue runs. A burn-down that ignores it reports progress that is not
    // there.
    const r = advanceRate(after, before);
    expect(r.slippedBack).toBe(5);
    expect(r.netStages).toBe(-5);
  });

  it('measures elapsed time, not just whole days', () => {
    const morning = { ranAt: '2026-10-05T14:53:18.051Z', results: before.results };
    const later = { ranAt: '2026-10-08T10:17:19.939Z', results: after.results };
    const r = advanceRate(morning, later);
    expect(r.elapsedDays).toBeCloseTo(2.81, 1);
    expect(r.days).toBe(3);
  });

  it('ignores URLs whose state is not a queue position', () => {
    const withRedirect = { ranAt: before.ranAt, results: [{ url: '/x', coverage: 'Page with redirect' }] };
    const nowIndexed = { ranAt: after.ranAt, results: [{ url: '/x', coverage: 'Submitted and indexed' }] };
    const r = advanceRate(withRedirect, nowIndexed);
    expect(r.stagesAdvanced).toBe(0);
  });

  it('returns null rates for a same-day pair instead of dividing by zero', () => {
    const r = advanceRate(before, { ...after, ranAt: before.ranAt });
    expect(r.stagesPerDay).toBeNull();
    expect(r.indexedPerDay).toBeNull();
  });
});

describe('weeksToClear', () => {
  it('rounds up to whole weeks', () => {
    expect(weeksToClear(585, 84)).toBe(7);
    expect(weeksToClear(585, 23.4)).toBe(25);
  });

  it('returns Infinity rather than a fake date when nothing is being indexed', () => {
    expect(weeksToClear(585, 0)).toBe(Infinity);
    expect(weeksToClear(585, null)).toBe(Infinity);
  });

  it('needs no time at all for an empty queue', () => {
    expect(weeksToClear(0, 10)).toBe(0);
  });
});

describe('addWeeks', () => {
  it('adds whole weeks to an ISO date', () => {
    expect(addWeeks('2026-10-11', 7)).toBe('2026-11-29');
    expect(addWeeks('2026-10-11', 1)).toBe('2026-10-18');
  });

  it('crosses a year boundary correctly', () => {
    expect(addWeeks('2026-12-28', 1)).toBe('2027-01-04');
  });
});
