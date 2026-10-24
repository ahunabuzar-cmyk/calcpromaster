import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { upsertSample, weeklyChain, flatWeekStreak, classifyCause, isStaleWindow } = require('../../scripts/run-rate-tracker.cjs');

const s = (date, runRate7, indexedPct = null) => ({ date, runRate7, runRate7PerMonth: runRate7 * 30, indexedPct });

describe('upsertSample', () => {
  it('keeps one row per date and sorts by date', () => {
    let h = upsertSample([], s('2026-10-04', 1000));
    h = upsertSample(h, s('2026-09-27', 900));
    h = upsertSample(h, s('2026-10-11', 1200));
    expect(h.map((x) => x.date)).toEqual(['2026-09-27', '2026-10-04', '2026-10-11']);
  });

  it('replaces the same date instead of duplicating (idempotent weekly run)', () => {
    const h = upsertSample(upsertSample([], s('2026-10-11', 1000)), s('2026-10-11', 1241));
    expect(h).toHaveLength(1);
    expect(h[0].runRate7).toBe(1241);
  });

  it('drops garbage rows rather than throwing', () => {
    expect(upsertSample(null, s('2026-10-11', 1000))).toHaveLength(1);
    expect(upsertSample([null, undefined, { date: 'x' }, { runRate7: 5 }], s('2026-10-11', 1000))).toHaveLength(1);
  });
});

describe('weeklyChain', () => {
  it('collapses runs closer than 5 days into one weekly observation', () => {
    const chain = weeklyChain([s('2026-10-03', 900), s('2026-10-04', 950), s('2026-10-11', 1200)]);
    expect(chain.map((x) => x.date)).toEqual(['2026-10-04', '2026-10-11']);
    expect(chain[0].runRate7).toBe(950); // the later reading of that week wins
  });

  it('keeps genuinely weekly-spaced samples all', () => {
    expect(weeklyChain([s('2026-09-27', 900), s('2026-10-04', 1000), s('2026-10-11', 1100)])).toHaveLength(3);
  });

  it('tolerates a missing history', () => {
    expect(weeklyChain(null)).toEqual([]);
    expect(weeklyChain([{ date: '2026-10-11' }])).toEqual([]);
  });
});

describe('flatWeekStreak', () => {
  it('is 0 while the run-rate is growing', () => {
    expect(flatWeekStreak([s('2026-09-27', 1000), s('2026-10-04', 1200), s('2026-10-11', 1400)]).streak).toBe(0);
  });

  it('counts one flat week, then two', () => {
    expect(flatWeekStreak([s('2026-09-27', 1000), s('2026-10-04', 1200), s('2026-10-11', 1200)]).streak).toBe(1);
    expect(flatWeekStreak([s('2026-09-20', 1000), s('2026-09-27', 1200), s('2026-10-04', 1200), s('2026-10-11', 1195)]).streak).toBe(2);
  });

  it('ignores a move inside the noise tolerance as flat, growth beyond it is not flat', () => {
    // 1% up is noise; 10% up is growth.
    expect(flatWeekStreak([s('2026-10-04', 1000), s('2026-10-11', 1010)]).streak).toBe(1);
    expect(flatWeekStreak([s('2026-10-04', 1000), s('2026-10-11', 1100)]).streak).toBe(0);
  });

  it('counts a decline as flat-or-worse', () => {
    expect(flatWeekStreak([s('2026-10-04', 1000), s('2026-10-11', 800)]).streak).toBe(1);
  });

  it('stops the streak at a zero/low baseline instead of dividing by zero', () => {
    expect(flatWeekStreak([s('2026-10-04', 0), s('2026-10-11', 500)]).streak).toBe(0);
  });

  it('reports the chain it judged on, so the report can show its work', () => {
    const { streak, chain } = flatWeekStreak([s('2026-10-03', 900), s('2026-10-04', 1000), s('2026-10-11', 1000)]);
    expect(streak).toBe(1);
    expect(chain).toHaveLength(2);
  });
});

describe('isStaleWindow', () => {
  const sample = (from, to) => ({ date: '2026-10-24', windowFrom: from, windowTo: to });
  const recorded = { date: '2026-10-17', windowFrom: '2026-09-28', windowTo: '2026-10-04' };

  it('calls a re-dated identical window stale', () => {
    expect(isStaleWindow([recorded], sample('2026-09-28', '2026-10-04'))).toBe(true);
  });

  it('is not stale once the source advances', () => {
    expect(isStaleWindow([recorded], sample('2026-10-05', '2026-10-11'))).toBe(false);
  });

  it('does not judge the first ever sample as stale', () => {
    expect(isStaleWindow([], sample('2026-09-28', '2026-10-04'))).toBe(false);
    expect(isStaleWindow(null, sample('2026-09-28', '2026-10-04'))).toBe(false);
  });

  it('compares against the newest row, not the first one', () => {
    const history = [
      { date: '2026-10-04', windowFrom: '2026-09-14', windowTo: '2026-09-20' },
      recorded,
    ];
    expect(isStaleWindow(history, sample('2026-09-28', '2026-10-04'))).toBe(true);
    expect(isStaleWindow(history, sample('2026-09-14', '2026-09-20'))).toBe(false);
  });

  it('ignores rows without a recorded window rather than crashing', () => {
    expect(isStaleWindow([{ date: '2026-09-01' }], sample('2026-09-28', '2026-10-04'))).toBe(false);
    expect(isStaleWindow([recorded], { date: '2026-10-24' })).toBe(false);
  });
});

describe('classifyCause', () => {
  it('needs two flat weeks before naming a cause', () => {
    expect(classifyCause({ flatWeeks: 1, indexedPctDelta: 5 }).cause).toBeNull();
    expect(classifyCause({ flatWeeks: 0, indexedPctDelta: 5 }).cause).toBeNull();
  });

  it('calls it exposure when indexing moved but the run-rate did not', () => {
    expect(classifyCause({ flatWeeks: 2, indexedPctDelta: 3.2 }).cause).toBe('exposure');
  });

  it('calls it crawl when neither indexing nor the run-rate moved', () => {
    expect(classifyCause({ flatWeeks: 2, indexedPctDelta: 0.1 }).cause).toBe('crawl');
    expect(classifyCause({ flatWeeks: 3, indexedPctDelta: 0 }).cause).toBe('crawl');
  });

  it('says unknown rather than guessing when the indexing data is missing', () => {
    expect(classifyCause({ flatWeeks: 2, indexedPctDelta: null }).cause).toBe('unknown');
  });

  it('always returns a reason the report can print', () => {
    for (const c of [
      { flatWeeks: 2, indexedPctDelta: 3 },
      { flatWeeks: 2, indexedPctDelta: 0 },
      { flatWeeks: 2, indexedPctDelta: null },
      { flatWeeks: 1, indexedPctDelta: 3 }
    ]) expect(classifyCause(c).reason.length).toBeGreaterThan(10);
  });
});
