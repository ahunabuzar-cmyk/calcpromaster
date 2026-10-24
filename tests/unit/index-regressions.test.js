import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const IR = require('../../scripts/check-index-regressions.cjs');

// Synthetic snapshots: the detector's contract is per-URL transitions between
// two snapshots that share the URL. Real data currently has no comparable
// regression (which is why the alert is quiet), so the behaviour is pinned here.
const SNAPS = [
  {
    date: '2026-03-01',
    source: 'test-a.json',
    checked: {
      'https://x.test/regressed/': 'Submitted and indexed',
      'https://x.test/canonicalised/': 'Discovered - currently not indexed',
      'https://x.test/vanished/': 'Submitted and indexed',
      'https://x.test/stable/': 'Discovered - currently not indexed',
      'https://x.test/advanced/': 'Discovered - currently not indexed',
    },
  },
  {
    date: '2026-03-02',
    source: 'test-b.json',
    checked: {
      'https://x.test/regressed/': 'Discovered - currently not indexed',
      'https://x.test/canonicalised/': 'Alternate page with proper canonical tag',
      'https://x.test/stable/': 'Discovered - currently not indexed',
      'https://x.test/advanced/': 'Submitted and indexed',
      // 'vanished' is absent: it left the queue, which is NOT a regression
      'https://x.test/only-in-b/': 'Submitted and indexed',
    },
  },
];

describe('index-regression alert', () => {
  it('ranks Google coverage states on the index ladder', () => {
    expect(IR.rankOf('URL is unknown to Google')).toBe(0);
    expect(IR.rankOf('Discovered - currently not indexed')).toBe(1);
    expect(IR.rankOf('Crawled - currently not indexed')).toBe(2);
    expect(IR.rankOf('Submitted and indexed')).toBe(3);
    // Non-candidates are not "low rank", they are off the ladder entirely.
    expect(IR.rankOf('Page with redirect')).toBeNull();
    expect(IR.rankOf('Excluded by ‘noindex’ tag')).toBeNull();
    expect(IR.rankOf('Alternate page with proper canonical tag')).toBeNull();
    expect(IR.rankOf('Not found (404)')).toBeNull();
    expect(IR.rankOf('')).toBeNull();
  });

  it('flags only "alternate page with proper canonical tag" as a duplicate canonical', () => {
    expect(IR.isDuplicateCanonical('Alternate page with proper canonical tag')).toBe(true);
    expect(IR.isDuplicateCanonical('Page with redirect')).toBe(false);
    expect(IR.isDuplicateCanonical('Submitted and indexed')).toBe(false);
  });

  it('detects a regression, a new duplicate canonical and a new not-candidate', () => {
    const res = IR.detect(SNAPS);
    expect(res.regressions.map((r) => r.url)).toEqual(['https://x.test/regressed/']);
    expect(res.duplicates.map((r) => r.url)).toEqual(['https://x.test/canonicalised/']);
    // A page that left the queue entirely is not a comparable transition.
    expect(res.regressions.concat(res.duplicates, res.notCandidates).map((r) => r.url))
      .not.toContain('https://x.test/vanished/');
    // A page that only moved up is not a finding.
    expect(res.regressions.map((r) => r.url)).not.toContain('https://x.test/advanced/');
    // Unchanged pages are never findings.
    expect(res.regressions.concat(res.duplicates, res.notCandidates).map((r) => r.url))
      .not.toContain('https://x.test/stable/');
    // Compared pairs counted, and only shared URLs count.
    expect(res.compared).toBe(4);
  });

  it('classifies a candidate that becomes a redirect as a not-candidate, not a regression', () => {
    const res = IR.detect([
      { date: '2026-03-01', source: 'a', checked: { 'https://x.test/merged/': 'Discovered - currently not indexed' } },
      { date: '2026-03-02', source: 'b', checked: { 'https://x.test/merged/': 'Page with redirect' } },
    ]);
    expect(res.notCandidates.map((r) => r.url)).toEqual(['https://x.test/merged/']);
    expect(res.regressions).toHaveLength(0);
    expect(res.duplicates).toHaveLength(0);
  });

  it('keeps findings unique across overlapping windows', () => {
    const a = { date: '2026-03-01', source: 'a', checked: { 'https://x.test/p/': 'Submitted and indexed' } };
    const b = { date: '2026-03-02', source: 'b', checked: { 'https://x.test/p/': 'Crawled - currently not indexed' } };
    const c = { date: '2026-03-03', source: 'c', checked: { 'https://x.test/p/': 'Crawled - currently not indexed' } };
    const res = IR.detect([a, b, c]);
    expect(res.regressions).toHaveLength(1);
  });

  it('builds the real snapshot list in date order from committed data', () => {
    const snaps = IR.allSnapshots();
    expect(snaps.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < snaps.length; i++) {
      expect(String(snaps[i - 1].date) <= String(snaps[i].date)).toBe(true);
    }
    // Every snapshot must carry a {url: coverage} map — a partial checkpoint
    // would invent transitions, so the resumable progress file is excluded.
    for (const s of snaps) expect(typeof s.checked).toBe('object');
    expect(snaps.every((s) => !/all-progress/.test(s.source))).toBe(true);
  });
});
