import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildSnapshot, upsertSnapshot, diffSnapshots, trendRows } = require('../../scripts/gsc-indexation-tracker.cjs');

// Fixture shaped exactly like parse-gsc-coverage-export.cjs output.
const fresh = {
  latest: { date: '2026-10-04', indexed: 952, notIndexed: 923 },
  issues: [
    { reason: 'Page with redirect', source: 'Website', validation: 'Not Started', pages: 208 },
    { reason: 'Discovered - currently not indexed', source: 'Google systems', validation: 'Not Started', pages: 631 },
  ],
};

describe('buildSnapshot', () => {
  it('flattens the export into totals + a reason map', () => {
    const s = buildSnapshot(fresh);
    expect(s.date).toBe('2026-10-04');
    expect(s.indexed).toBe(952);
    expect(s.notIndexed).toBe(923);
    expect(s.known).toBe(1875);
    expect(s.pctIndexed).toBe(50.8);
    expect(Object.keys(s.issues)).toEqual(['Page with redirect', 'Discovered - currently not indexed']);
    expect(s.issues['Page with redirect']).toEqual({ pages: 208, source: 'Website', validation: 'Not Started' });
  });

  it('throws on an export with no latest row', () => {
    expect(() => buildSnapshot({})).toThrow(/latest/);
    expect(() => buildSnapshot(null)).toThrow(/latest/);
  });

  it('handles a zero-known snapshot without dividing by zero', () => {
    const s = buildSnapshot({ latest: { date: '2026-01-01', indexed: 0, notIndexed: 0 } });
    expect(s.pctIndexed).toBe(0);
  });
});

describe('upsertSnapshot', () => {
  it('adds a new date and keeps chronological order', () => {
    const a = buildSnapshot({ latest: { date: '2026-10-01', indexed: 1, notIndexed: 1 } });
    const b = buildSnapshot({ latest: { date: '2026-10-04', indexed: 2, notIndexed: 2 } });
    const list = upsertSnapshot(upsertSnapshot([], b), a);
    expect(list.map((s) => s.date)).toEqual(['2026-10-01', '2026-10-04']);
  });

  it('replaces the same snapshot date instead of duplicating it (idempotent weekly run)', () => {
    const first = buildSnapshot({ latest: { date: '2026-10-04', indexed: 900, notIndexed: 900 } });
    const reparse = buildSnapshot({ latest: { date: '2026-10-04', indexed: 952, notIndexed: 923 } });
    const list = upsertSnapshot([first], reparse);
    expect(list).toHaveLength(1);
    expect(list[0].indexed).toBe(952);
  });

  it('tolerates a missing/garbage history file', () => {
    expect(upsertSnapshot(null, buildSnapshot(fresh))).toHaveLength(1);
    expect(upsertSnapshot([null, undefined], buildSnapshot(fresh))).toHaveLength(1);
  });
});

describe('diffSnapshots', () => {
  const prev = buildSnapshot({
    latest: { date: '2026-09-27', indexed: 900, notIndexed: 975 },
    issues: [
      { reason: 'Page with redirect', source: 'Website', validation: 'Not Started', pages: 240 },
      { reason: 'Excluded by ‘noindex’ tag', source: 'Website', validation: 'Not Started', pages: 54 },
    ],
  });
  const cur = buildSnapshot(fresh);

  it('reports total movement and % indexed', () => {
    const d = diffSnapshots(prev, cur);
    expect(d.from).toBe('2026-09-27');
    expect(d.to).toBe('2026-10-04');
    expect(d.indexed).toEqual({ was: 900, now: 952, delta: 52 });
    expect(d.notIndexed.delta).toBe(-52);
    expect(d.pctIndexed.was).toBeCloseTo(48, 0);
    expect(d.pctIndexed.now).toBe(50.8);
  });

  it('classifies each bucket as up / down / new / resolved / same', () => {
    const byReason = Object.fromEntries(diffSnapshots(prev, cur).buckets.map((b) => [b.reason, b]));
    expect(byReason['Page with redirect'].state).toBe('down');
    expect(byReason['Page with redirect'].delta).toBe(-32);
    expect(byReason['Discovered - currently not indexed'].state).toBe('new');
    expect(byReason['Discovered - currently not indexed'].was).toBe(0);
    expect(byReason['Excluded by ‘noindex’ tag'].state).toBe('resolved');
    expect(byReason['Excluded by ‘noindex’ tag'].now).toBe(0);
  });

  it('marks an unchanged bucket as same and notes zero deltas', () => {
    const d = diffSnapshots(cur, cur);
    expect(d.indexed.delta).toBe(0);
    expect(d.buckets.every((b) => b.state === 'same' && b.delta === 0)).toBe(true);
  });

  it('treats the first snapshot (no previous) as all-new without crashing', () => {
    const d = diffSnapshots(null, cur);
    expect(d.from).toBe(null);
    expect(d.indexed).toEqual({ was: 0, now: 952, delta: 952 });
    expect(d.buckets.every((b) => b.state === 'new')).toBe(true);
  });
});

describe('trendRows', () => {
  const history = ['2026-09-20', '2026-09-27', '2026-10-04'].map((date, i) =>
    buildSnapshot({ latest: { date, indexed: 100 * (i + 1), notIndexed: 10 } })
  );

  it('returns at most `last` rows, newest last', () => {
    const rows = trendRows(history, 2);
    expect(rows.map((r) => r.date)).toEqual(['2026-09-27', '2026-10-04']);
  });

  it('defaults to the full series when `last` is not a positive number', () => {
    expect(trendRows(history, 0)).toHaveLength(3);
    expect(trendRows(history, undefined)).toHaveLength(3);
  });
});
