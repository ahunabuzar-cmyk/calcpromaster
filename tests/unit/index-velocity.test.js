import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  STATUS, dailySeries, rollingVelocity, velocityStatus, projectClear, addDays, cleanHistory, snapshotState,
} = require('../../scripts/track-index-velocity.cjs');
const { collectChurnAlerts } = require('../../scripts/build-index-burndown.cjs');

const UNKNOWN = 'URL is unknown to Google';
const DISCOVERED = 'Discovered - currently not indexed';
const CRAWLED = 'Crawled - currently not indexed';
const INDEXED = 'Submitted and indexed';
const REDIRECT = 'Page with redirect';

const snap = (date, checked) => ({ date, checked });

// Do din ka fixture: ek page ladder par chadha, ek index ho gaya, ek wapas gira.
const DAY1 = snap('2026-10-01', {
  'https://x.com/a': UNKNOWN,
  'https://x.com/b': DISCOVERED,
  'https://x.com/c': INDEXED,
  'https://x.com/d': REDIRECT,
});
const DAY2 = snap('2026-10-02', {
  'https://x.com/a': DISCOVERED,   // 0 → 1
  'https://x.com/b': INDEXED,      // 1 → 3  (became indexed)
  'https://x.com/c': INDEXED,      // no move
  'https://x.com/d': REDIRECT,     // not a candidate
});

describe('index velocity / cleanHistory + snapshotState', () => {
  it('drops partial snapshots and sorts by date', () => {
    const h = cleanHistory([
      { date: '2026-10-03', checked: { u: UNKNOWN } },
      { date: '2026-10-01', checked: {} },
      { date: '2026-10-02' },
      null,
      { date: '2026-10-01', checked: { u: UNKNOWN } },
    ]);
    expect(h.map((s) => s.date)).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('counts indexed / waiting and keeps non-candidates out of the queue', () => {
    const s = snapshotState(DAY1.checked);
    expect(s.total).toBe(4);
    expect(s.indexed).toBe(1);
    expect(s.waiting).toBe(2);
    expect(s.notCandidates).toBe(1);
  });
});

describe('index velocity / dailySeries', () => {
  it('leaves the first row without deltas — one snapshot is not a speed', () => {
    const rows = dailySeries([DAY1]);
    expect(rows).toHaveLength(1);
    expect(rows[0].days).toBeNull();
    expect(rows[0].becameIndexed).toBeNull();
    expect(rows[0].indexed).toBe(1);
    expect(rows[0].waiting).toBe(2);
  });

  it('measures the delta between consecutive snapshots', () => {
    const rows = dailySeries([DAY1, DAY2]);
    const r = rows[1];
    expect(r.date).toBe('2026-10-02');
    expect(r.days).toBe(1);
    expect(r.common).toBe(4);
    expect(r.becameIndexed).toBe(1);
    expect(r.stagesAdvanced).toBe(3);
    expect(r.slippedBack).toBe(0);
    expect(r.churnStages).toBe(3);
    expect(r.netStages).toBe(3);
    expect(r.leftUnknown).toBe(1);
    expect(r.indexedPerDay).toBe(1);
    expect(r.indexed).toBe(2);
    expect(r.waiting).toBe(1);
  });

  it('counts a backslide as movement, not as negative progress hidden in the total', () => {
    const before = snap('2026-10-01', { u1: DISCOVERED, u2: DISCOVERED });
    const after = snap('2026-10-02', { u1: UNKNOWN, u2: CRAWLED });
    const r = dailySeries([before, after])[1];
    expect(r.stagesAdvanced).toBe(1);   // u2: 1 → 2
    expect(r.slippedBack).toBe(1);      // u1: 1 → 0
    expect(r.churnStages).toBe(2);
    expect(r.netStages).toBe(0);
  });
});

describe('index velocity / rollingVelocity', () => {
  const d = (n) => '2026-10-0' + n;

  it('returns null with fewer than two snapshots', () => {
    expect(rollingVelocity([])).toBeNull();
    expect(rollingVelocity([DAY1])).toBeNull();
  });

  it('returns null when only one snapshot falls inside the window', () => {
    expect(rollingVelocity([snap(d(1), { u: UNKNOWN }), snap(d(4), { u: INDEXED })], { windowDays: 1 })).toBeNull();
  });

  it('compares the window ends, so a page indexed mid-window is counted once', () => {
    const history = [
      snap(d(1), { u1: DISCOVERED, u2: DISCOVERED }),
      snap(d(2), { u1: INDEXED, u2: DISCOVERED }),
      snap(d(3), { u1: INDEXED, u2: DISCOVERED }),
      snap(d(4), { u1: INDEXED, u2: DISCOVERED }),
    ];
    const v = rollingVelocity(history, { windowDays: 7 });
    expect(v.days).toBe(3);
    expect(v.snapshots).toBe(4);
    expect(v.becameIndexed).toBe(1);
    expect(v.indexedPerDay).toBeCloseTo(1 / 3, 5);
    expect(v.becameIndexed).not.toBe(3);
  });

  it('reports the trailing window, not the whole history', () => {
    const history = [
      snap(d(1), { u: DISCOVERED }),
      snap(d(2), { u: DISCOVERED }),
      snap(d(5), { u: DISCOVERED }),
      snap(d(6), { u: INDEXED }),
    ];
    const v = rollingVelocity(history, { windowDays: 7 });
    expect(v.from).toBe(d(1));       // 7-day window still reaches day 1
    const narrow = rollingVelocity(history, { windowDays: 2 });
    expect(narrow.from).toBe(d(5));  // 2-day window starts at the latest pair only
    expect(narrow.becameIndexed).toBe(1);
  });
});

describe('index velocity / velocityStatus', () => {
  it('refuses to invent a rate from no shape at all', () => {
    const v = velocityStatus(null);
    expect(v.status).toBe(STATUS.insufficientHistory);
    expect(v.reason).toMatch(/do snapshots nahi/);
  });

  it('treats a window shorter than the minimum as insufficient history', () => {
    const v = velocityStatus({ days: 2, becameIndexed: 5, netStages: 10, common: 50 });
    expect(v.status).toBe(STATUS.insufficientHistory);
    expect(v.reason).toMatch(/sirf 2 din/);
  });

  it('calls it stalled when nothing reached indexed', () => {
    const v = velocityStatus({ days: 7, becameIndexed: 0, netStages: 12, common: 590 });
    expect(v.status).toBe(STATUS.stalled);
    expect(v.reason).toMatch(/koi page index nahi hua/);
  });

  it('separates losing ground from moving', () => {
    const losing = velocityStatus({ days: 7, becameIndexed: 3, netStages: -28, common: 590 });
    expect(losing.status).toBe(STATUS.losingGround);
    const moving = velocityStatus({ days: 7, becameIndexed: 3, netStages: 4, common: 590 });
    expect(moving.status).toBe(STATUS.moving);
    expect(moving.reason).toMatch(/net \+4/);
  });
});

describe('index velocity / projectClear', () => {
  it('gives no date when the measured rate is zero', () => {
    const p = projectClear(585, 0, '2026-10-11');
    expect(p.date).toBeNull();
    expect(p.days).toBeNull();
    expect(p.beyondHorizon).toBe(true);
    expect(p.reason).toMatch(/measured rate zero/);
  });

  it('projects a date at a real rate', () => {
    const p = projectClear(585, 6, '2026-10-11');
    expect(p.days).toBe(98);
    expect(p.date).toBe('2027-01-17');
    expect(p.beyondHorizon).toBe(false);
  });

  it('refuses a date beyond the horizon instead of printing a confident-looking one', () => {
    const p = projectClear(585, 0.35, '2026-10-11');
    expect(p.days).toBe(1672);
    expect(p.date).toBeNull();
    expect(p.beyondHorizon).toBe(true);
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});

describe('index velocity / churn reuses the shared definition', () => {
  it('stays silent on movement too small for a ratio to mean anything', () => {
    const before = snap('2026-10-01', { u1: DISCOVERED });
    const after = snap('2026-10-02', { u1: UNKNOWN });
    expect(collectChurnAlerts(dailySeries([before, after]).slice(1))).toEqual([]);
  });

  it('flags a window whose advance is cancelled in the same window', () => {
    const before = {}, after = {};
    for (let i = 0; i < 6; i++) { before['a' + i] = DISCOVERED; after['a' + i] = UNKNOWN; }
    for (let i = 0; i < 6; i++) { before['b' + i] = UNKNOWN; after['b' + i] = DISCOVERED; }
    const alerts = collectChurnAlerts(dailySeries([snap('2026-10-01', before), snap('2026-10-02', after)]).slice(1));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('high');       // net 0 → har advance churn hai
    expect(alerts[0].churnStages).toBe(12);
    expect(alerts[0].cancelledShare).toBe(1);
  });
});
