// Unit tests for the financial helpers in js/data/finance.js (the REAL shipped module — no inline copy)
// Run: npm run test:unit
import { describe, it, expect } from 'vitest';
import fin from '../../js/data/finance.js';

const {
  calcEMI, calcPrincipal, calcRate, calcTerm,
  compFutureValue, compPrincipal, compRate, compTime,
  compIsContinuous, compContributionsFV
} = fin.helpers;

describe('calcEMI', () => {
  it('calculates standard monthly EMI', () => {
    // $100k @ 8.5%/yr monthly, 5yr → ~$2,051.65
    const r = 8.5 / 100 / 12;
    const emi = calcEMI(100000, r, 60);
    expect(emi).toBeCloseTo(2051.65, 1);
  });
  it('handles zero rate (r===0 → P/n)', () => {
    expect(calcEMI(12000, 0, 12)).toBe(1000);
  });
  it('handles 1e18 principal without overflow crash', () => {
    const r = 5 / 100 / 12;
    expect(calcEMI(1e18, r, 120)).toBeGreaterThan(0);
    expect(Number.isFinite(calcEMI(1e18, r, 120))).toBe(true);
  });
  it('round-trips with calcPrincipal', () => {
    const r = 6 / 100 / 12;
    const emi = calcEMI(200000, r, 360);
    expect(calcPrincipal(emi, r, 360)).toBeCloseTo(200000, 1);
  });
});

describe('calcRate', () => {
  it('recovers a known annual rate from payments', () => {
    // $100k, monthly payment $2,051.65, 60 periods → ~8.5%/yr
    const r = calcRate(100000, 2051.65, 60);
    expect(r * 1200).toBeCloseTo(8.5, 1);
  });
  it('returns 0 when payment is too low', () => {
    expect(calcRate(100000, 100, 60)).toBe(0);
    expect(calcRate(0, 100, 60)).toBe(0);
    expect(calcRate(100000, -5, 60)).toBe(0);
    expect(calcRate(100000, 0, 0)).toBe(0);
  });
  it('never diverges to NaN/Infinity', () => {
    for (const pmt of [1000, 5000, 100000, 1e9]) {
      const r = calcRate(100000, pmt, 60);
      expect(Number.isFinite(r)).toBe(true);
    }
  });
});

describe('calcTerm', () => {
  it('solves term for a valid payment', () => {
    const r = 8.5 / 100 / 12;
    const t = calcTerm(100000, r, 2051.65);
    expect(t).toBeCloseTo(60, 0);
  });
  it('returns Infinity when payment never amortizes', () => {
    expect(calcTerm(100000, 0.01, 100)).toBe(Infinity);
  });
  it('handles zero rate', () => {
    expect(calcTerm(1000, 0, 50)).toBe(20);
  });
});

describe('Compound interest helpers', () => {
  it('compFutureValue matches A = P(1+r/n)^(nt)', () => {
    expect(compFutureValue(1000, 10, 10, 12)).toBeCloseTo(2707.04, 1);
  });
  it('compFutureValue continuous matches Pe^(rt)', () => {
    expect(compFutureValue(1000, 10, 10, 'continuous')).toBeCloseTo(2718.28, 1);
  });
  it('compPrincipal inverts compFutureValue', () => {
    const fv = compFutureValue(5000, 7, 15, 4);
    expect(compPrincipal(fv, 7, 15, 4)).toBeCloseTo(5000, 1);
  });
  it('compRate recovers annual rate', () => {
    expect(compRate(1000, 2707.04, 10, 12)).toBeCloseTo(10, 1);
  });
  it('compTime recovers years', () => {
    expect(compTime(1000, 2707.04, 10, 12)).toBeCloseTo(10, 1);
  });
  it('compIsContinuous only true for "continuous"', () => {
    expect(compIsContinuous('continuous')).toBe(true);
    expect(compIsContinuous('12')).toBe(false);
    expect(compIsContinuous(12)).toBe(false);
  });
  it('compContributionsFV zero contribution = 0', () => {
    expect(compContributionsFV(0, 10, 10, 12, false)).toBe(0);
    expect(compContributionsFV(undefined, 10, 10, 12, false)).toBe(0);
  });
  it('edge cases: P<=0 / target<=P', () => {
    expect(compRate(0, 100, 10, 12)).toBe(0);
    expect(compTime(100, 100, 10, 12)).toBe(0);
  });
});
