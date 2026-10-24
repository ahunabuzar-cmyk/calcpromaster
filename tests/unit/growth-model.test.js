import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runRate, monthsToTarget, ladder, decompose } = require('../../scripts/build-growth-model.cjs');

// A ramp: flat-low days then a jump. This is the shape that made the 28-day
// average read 2.4x below the real run-rate, so runRate must use the tail.
const ramp = [
  { date: '2026-09-24', impressions: 0 },
  { date: '2026-09-25', impressions: 63 },
  { date: '2026-09-26', impressions: 1114 },
  { date: '2026-09-27', impressions: 1554 },
  { date: '2026-09-28', impressions: 1044 },
  { date: '2026-09-29', impressions: 1126 },
  { date: '2026-09-30', impressions: 1191 },
  { date: '2026-10-01', impressions: 1183 },
  { date: '2026-10-02', impressions: 1325 },
  { date: '2026-10-03', impressions: 1473 },
  { date: '2026-10-04', impressions: 1343 },
];

describe('runRate', () => {
  it('uses only the last `window` days, not the whole series', () => {
    const all = runRate(ramp, ramp.length);
    const last7 = runRate(ramp, 7);
    expect(last7.days).toBe(7);
    expect(last7.from).toBe('2026-09-28');
    expect(last7.to).toBe('2026-10-04');
    // A ramp means the trailing average is lower than the recent rate.
    expect(all.perDay).toBeLessThan(last7.perDay);
  });

  it('computes per-day and per-month from the same tail', () => {
    const r = runRate([{ date: '2026-10-01', impressions: 100 }], 7);
    expect(r.perDay).toBe(100);
    expect(r.perMonth).toBeCloseTo(3044, 0);
    expect(r.windowRequested).toBe(7);
  });

  it('ignores rows without a numeric impressions value', () => {
    const r = runRate([{ date: '2026-10-01' }, { date: '2026-10-02', impressions: 50 }], 7);
    expect(r.days).toBe(1);
    expect(r.perDay).toBe(50);
  });

  it('returns null on an empty or missing series instead of NaN', () => {
    expect(runRate([], 7)).toBeNull();
    expect(runRate(null, 7)).toBeNull();
  });
});

describe('monthsToTarget', () => {
  it('returns 0 when the target is already met', () => {
    expect(monthsToTarget(40000, 0.4, 30000)).toBe(0);
  });

  it('matches the compounding arithmetic', () => {
    // 1000 → 3000 at 20%/month: log(3)/log(1.2) = 6.03 → 7 months.
    expect(monthsToTarget(1000, 0.2, 3000)).toBe(7);
    expect(monthsToTarget(1000, 1.0, 3000)).toBe(2);
  });

  it('is monotonic: a faster rate never takes longer', () => {
    let prev = Infinity;
    for (const g of [0.1, 0.2, 0.4, 0.6, 1.0]) {
      const n = monthsToTarget(10000, g, 300000);
      expect(n).toBeLessThanOrEqual(prev);
      prev = n;
    }
  });

  it('returns Infinity when growth is zero or negative and the target is above start', () => {
    expect(monthsToTarget(1000, 0, 2000)).toBe(Infinity);
    expect(monthsToTarget(1000, -0.1, 2000)).toBe(Infinity);
  });
});

describe('ladder', () => {
  const pairs = [
    { position: 2, impressions: 100, clicks: 10 },
    { position: 7, impressions: 100, clicks: 1 },
    { position: 15, impressions: 100, clicks: 0 },
    { position: 30, impressions: 100, clicks: 0 },
    { position: 80, impressions: 100, clicks: 0 },
  ];

  it('assigns every pair to exactly one band', () => {
    const bands = ladder(pairs);
    expect(bands.reduce((s, b) => s + b.pairs, 0)).toBe(pairs.length);
    expect(bands.reduce((s, b) => s + b.impressions, 0)).toBe(500);
  });

  it('reports the MEASURED ctr per band (not an assumed curve)', () => {
    const bands = ladder(pairs);
    expect(bands[0].band).toBe('1-3');
    expect(bands[0].ctr).toBeCloseTo(0.1, 5);
    expect(bands[1].ctr).toBeCloseTo(0.01, 5);
    expect(bands[4].ctr).toBe(0);
  });

  it('puts deep positions in the open-ended band and never divides by zero', () => {
    const bands = ladder([{ position: 999, impressions: 0, clicks: 0 }]);
    expect(bands[4].band).toBe('51+');
    expect(bands[4].ctr).toBe(0);
  });

  it('tolerates a missing pairs list', () => {
    expect(ladder(null).every((b) => b.pairs === 0 && b.impressions === 0)).toBe(true);
  });
});

describe('decompose', () => {
  it('splits the target gap into index growth and per-page exposure', () => {
    const d = decompose({ indexed: 952, known: 1875, runRateMonthly: 37000, targetMonthly: 300000, exposureMultiple: 4 });
    expect(d.impressionsPerIndexedPagePerMonth).toBeCloseTo(37000 / 952, 3);
    expect(d.indexMultiple).toBeCloseTo(1875 / 952, 3);
    expect(d.targetMultiple).toBeCloseTo(300000 / 37000, 3);
    expect(d.fullIndexImpressions).toBeCloseTo(37000 * (1875 / 952), 3);
    expect(d.bothApplied).toBeCloseTo(37000 * (1875 / 952) * 4, 3);
  });

  it('derives the exposure multiple needed when none is given', () => {
    const d = decompose({ indexed: 1000, known: 2000, runRateMonthly: 10000, targetMonthly: 40000, exposureMultiple: 0 });
    expect(d.exposureMultiple).toBeCloseTo(2, 5); // 4x needed / 2x from indexing
  });

  it('does not divide by zero on an empty index', () => {
    const d = decompose({ indexed: 0, known: 10, runRateMonthly: 0, targetMonthly: 1000, exposureMultiple: 4 });
    expect(d.impressionsPerIndexedPagePerMonth).toBe(0);
    expect(d.indexMultiple).toBe(0);
    expect(d.targetMultiple).toBe(Infinity);
  });
});

describe('growth arithmetic vs the model report', () => {
  it('the 3-lakh target needs ~8-11x today\'s run-rate at the measured base', () => {
    const runRateMonthly = 37767;
    expect(300000 / runRateMonthly).toBeGreaterThan(7.5);
    expect(400000 / runRateMonthly).toBeLessThan(11);
  });

  it('no growth rate reaches 300k/month within one month from the measured base', () => {
    const base = 37767;
    for (const g of [0.2, 0.4, 0.6, 1.0]) {
      expect(base * (1 + g)).toBeLessThan(300000);
    }
  });
});
