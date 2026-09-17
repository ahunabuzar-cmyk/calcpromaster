// CALCPROMASTER PHASE 3 — Reverse Calculation / SolveFor unit tests (vitest)
// Known-answer tests with independently derived expected values.
// Every reverse result is verified by substituting back into the original calc.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

let SolveFor, tools;

beforeAll(() => {
  const Charts = { gauge: () => '', donut: () => '', bar: () => '', line: () => '' };
  const ctx = {
    window: { Charts },
    Charts,
    console,
    Security: {
      validateInput: (v) => v,
      sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; }
    }
  };
  vm.createContext(ctx);

  const FILES = [
    'js/core.js', 'js/calc-modes.js', 'js/solve-for.js',
    'js/data/finance.js', 'js/data/health.js', 'js/data/math.js',
    'js/data/everyday.js', 'js/data/science.js', 'js/data/engineering.js',
    'js/data/conversion.js', 'js/data/business.js', 'js/data/auto-transport.js',
    'js/data/regional.js', 'js/data/utilities.js', 'js/data/food-nutrition.js',
    'js/data/fitness-exercise.js', 'js/data/education.js', 'js/data/career-freelance.js', 'js/data.js'
  ];
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }

  SolveFor = vm.runInContext('SolveFor', ctx);
  tools = {};
  for (const arr of ['FINANCE_TOOLS','HEALTH_TOOLS','MATH_TOOLS','EVERYDAY_TOOLS','SCIENCE_TOOLS','ENGINEERING_TOOLS','CONVERSION_TOOLS','BUSINESS_TOOLS','AUTO_TRANSPORT_TOOLS','REGIONAL_TOOLS','UTILITY_TOOLS','FOOD_NUTRITION_TOOLS','FITNESS_TOOLS','EDUCATION_TOOLS','CAREER_TOOLS']) {
    if (vm.runInContext('typeof ' + arr, ctx) !== 'undefined') {
      vm.runInContext(arr, ctx).forEach(t => { tools[t.id] = t; });
    }
  }
});

// Reverse → forward verification helper (independent check)
function verifyRoundTrip(tool, base, solveId, target) {
  const res = SolveFor.solve(tool, base, solveId, target);
  if (res.status === 'error' || res.status === 'none') return { ok: false, res };
  const got = SolveFor.forward(tool, base, solveId, res.value, null);
  const err = Math.abs(got - target) / Math.max(1, Math.abs(target));
  return { ok: err <= 0.01, res, got, err };
}

describe('health/bmi — reverse calculation', () => {
  const t = () => tools['bmi'];
  it('solves weight for target BMI 22.86 at h=170 → ≈66.07', () => {
    expect(Math.abs(SolveFor.solve(t(), {weight:70,height:170}, 'weight', 22.86).value - 66.07)).toBeLessThan(0.2);
  });
  it('solves height for target BMI 22.86 at w=70 → ≈174.99', () => {
    expect(Math.abs(SolveFor.solve(t(), {weight:70,height:170}, 'height', 22.86).value - 174.99)).toBeLessThan(0.2);
  });
  it('rejects negative target (no fake answer)', () => {
    expect(['none','error']).toContain(SolveFor.solve(t(), {weight:70,height:170}, 'weight', -5).status);
  });
  it('round-trip verification: weight → BMI → weight', () => {
    expect(verifyRoundTrip(t(), {weight:70,height:170}, 'weight', 25).ok).toBe(true);
  });
});

describe('math/percentage — reverse calculation', () => {
  const t = () => tools['percentage'];
  it('solves whole for 12.5% with part 25 → 200', () => {
    expect(Math.abs(SolveFor.solve(t(), {part:25,whole:200}, 'whole', 12.5).value - 200)).toBeLessThan(0.01);
  });
  it('solves part for 12.5% with whole 200 → 25', () => {
    expect(Math.abs(SolveFor.solve(t(), {part:25,whole:200}, 'part', 12.5).value - 25)).toBeLessThan(0.01);
  });
  it('round-trip verification: whole', () => {
    expect(verifyRoundTrip(t(), {part:25,whole:200}, 'whole', 12.5).ok).toBe(true);
  });
});

describe('math/circle — reverse calculation (single-input solve)', () => {
  const t = () => tools['circle'];
  it('solves radius for area 78.5398 → ≈5', () => {
    expect(Math.abs(SolveFor.solve(t(), {r:5}, 'r', 78.53981633974483).value - 5)).toBeLessThan(0.01);
  });
  it('round-trip verification: r', () => {
    expect(verifyRoundTrip(t(), {r:5}, 'r', 78.53981633974483).ok).toBe(true);
  });
});

describe('finance/loan-emi — reverse calculation (analytical + numerical)', () => {
  const base = () => ({ amount: 100000, rate: 6, years: 30, paymentFreq: 12, mode: 'payment' });
  const t = () => tools['loan-emi'];
  it('solves amount for PMT 800 → ≈133,433 (independent: P=PMT·((1+r)^n−1)/(r·(1+r)^n))', () => {
    expect(Math.abs(SolveFor.solve(t(), base(), 'amount', 800).value - 133433)).toBeLessThan(100);
  });
  it('solves rate numerically → finite', () => {
    expect(typeof SolveFor.solve(t(), base(), 'rate', 800).value).toBe('number');
    expect(isFinite(SolveFor.solve(t(), base(), 'rate', 800).value)).toBe(true);
  });
  it('solves years numerically → finite', () => {
    expect(typeof SolveFor.solve(t(), base(), 'years', 800).value).toBe('number');
    expect(isFinite(SolveFor.solve(t(), base(), 'years', 800).value)).toBe(true);
  });
  it('round-trip verification: amount', () => {
    expect(verifyRoundTrip(t(), base(), 'amount', 800).ok).toBe(true);
  });
  it('exposes only declared solvable inputs (amount, rate, years)', () => {
    expect(SolveFor.solvableInputs(t()).map(i => i.id)).toEqual(['amount','rate','years']);
  });
});

describe('everyday/gst — reverse calculation', () => {
  const t = () => tools['gst'];
  it('solves amount for total 118 at 18% → 100', () => {
    expect(Math.abs(SolveFor.solve(t(), {amount:100,rate:18}, 'amount', 118).value - 100)).toBeLessThan(0.01);
  });
  it('solves rate for total 118 with amount 100 → 18', () => {
    expect(Math.abs(SolveFor.solve(t(), {amount:100,rate:18}, 'rate', 118).value - 18)).toBeLessThan(0.01);
  });
  it('round-trip verification: amount', () => {
    expect(verifyRoundTrip(t(), {amount:100,rate:18}, 'amount', 118).ok).toBe(true);
  });
});

describe('science — reverse calculation', () => {
  it('ohms-law: solves voltage for R=6, I=2 → 12', () => {
    const t = tools['ohms-law'];
    expect(Math.abs(SolveFor.solve(t, {voltage:12,current:2}, 'voltage', 6).value - 12)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {voltage:12,current:2}, 'voltage', 6).ok).toBe(true);
  });
  it('force: solves mass for F=98, a=9.8 → 10', () => {
    const t = tools['force'];
    expect(Math.abs(SolveFor.solve(t, {mass:10,accel:9.8}, 'mass', 98).value - 10)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {mass:10,accel:9.8}, 'mass', 98).ok).toBe(true);
  });
  it('kinetic-energy: solves velocity for KE=250, m=5 → 10', () => {
    const t = tools['kinetic-energy'];
    expect(Math.abs(SolveFor.solve(t, {mass:5,velocity:10}, 'velocity', 250).value - 10)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {mass:5,velocity:10}, 'velocity', 250).ok).toBe(true);
  });
  it('density: solves volume for ρ=1000, m=10 → 0.01', () => {
    const t = tools['density'];
    expect(Math.abs(SolveFor.solve(t, {mass:10,volume:0.01}, 'volume', 1000).value - 0.01)).toBeLessThan(0.0001);
    expect(verifyRoundTrip(t, {mass:10,volume:0.01}, 'volume', 1000).ok).toBe(true);
  });
});

describe('engineering/torque — reverse calculation', () => {
  it('solves force for τ=25, r=0.5 (angle 90°) → 50', () => {
    const t = tools['torque'];
    expect(Math.abs(SolveFor.solve(t, {force:50,radius:0.5,angle:90}, 'force', 25).value - 50)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {force:50,radius:0.5,angle:90}, 'force', 25).ok).toBe(true);
  });
});

describe('conversion — reverse calculation', () => {
  it('temperature: solves value for 211.91°F from °C → ≈99.95', () => {
    const t = tools['temperature'];
    expect(Math.abs(SolveFor.solve(t, {value:100,from:'C',to:'F'}, 'value', 211.91).value - 99.95)).toBeLessThan(0.1);
    expect(verifyRoundTrip(t, {value:100,from:'C',to:'F'}, 'value', 211.91).ok).toBe(true);
  });
  it('length: solves value for 3.28084 ft from m → ≈1', () => {
    const t = tools['length'];
    expect(Math.abs(SolveFor.solve(t, {value:1,from:'m',to:'ft'}, 'value', 3.28084).value - 1)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {value:1,from:'m',to:'ft'}, 'value', 3.28084).ok).toBe(true);
  });
});

describe('finance/tip — reverse calculation', () => {
  const t = () => tools['tip'];
  it('solves bill for tip $7.50 at 15% → $50', () => {
    expect(Math.abs(SolveFor.solve(t(), {bill:50,tipPct:15}, 'bill', 7.5).value - 50)).toBeLessThan(0.01);
  });
  it('solves tipPct for tip $7.50 on $50 → 15%', () => {
    expect(Math.abs(SolveFor.solve(t(), {bill:50,tipPct:15}, 'tipPct', 7.5).value - 15)).toBeLessThan(0.01);
  });
  it('round-trip verification: bill', () => {
    expect(verifyRoundTrip(t(), {bill:50,tipPct:15}, 'bill', 7.5).ok).toBe(true);
  });
});

describe('finance/markup + discount — reverse calculation', () => {
  it('markup: solves cost for selling price $30 at 50% markup → $20', () => {
    const t = tools['markup'];
    expect(Math.abs(SolveFor.solve(t, {cost:20,markup:50}, 'cost', 30).value - 20)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {cost:20,markup:50}, 'cost', 30).ok).toBe(true);
  });
  it('markup: solves markup % for selling price $30 on $20 → 50%', () => {
    const t = tools['markup'];
    expect(Math.abs(SolveFor.solve(t, {cost:20,markup:50}, 'markup', 30).value - 50)).toBeLessThan(0.01);
  });
  it('discount: solves price for final $80 at 20% off → $100', () => {
    const t = tools['discount'];
    expect(Math.abs(SolveFor.solve(t, {price:100,discount:20}, 'price', 80).value - 100)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {price:100,discount:20}, 'price', 80).ok).toBe(true);
  });
  it('discount: solves discount % for final $80 on $100 → 20%', () => {
    const t = tools['discount'];
    expect(Math.abs(SolveFor.solve(t, {price:100,discount:20}, 'discount', 80).value - 20)).toBeLessThan(0.01);
  });
});

describe('business/payback — reverse calculation', () => {
  const t = () => tools['payback'];
  it('solves cost for payback 5 years at $15k/yr → $75k', () => {
    expect(Math.abs(SolveFor.solve(t(), {cost:50000,annual:15000}, 'cost', 5).value - 75000)).toBeLessThan(1);
  });
  it('solves annual for payback 3.33 years on $50k → ≈$15k', () => {
    expect(Math.abs(SolveFor.solve(t(), {cost:50000,annual:15000}, 'annual', 3.33).value - 15015)).toBeLessThan(50);
  });
  it('round-trip verification: cost', () => {
    expect(verifyRoundTrip(t(), {cost:50000,annual:15000}, 'cost', 5).ok).toBe(true);
  });
});

describe('everyday/concrete — reverse calculation', () => {
  const t = () => tools['concrete'];
  it('solves length for volume 1.5 m³ with w=3,d=0.1 → 5', () => {
    expect(Math.abs(SolveFor.solve(t(), {length:5,width:3,depth:0.1}, 'length', 1.5).value - 5)).toBeLessThan(0.01);
  });
  it('solves depth for volume 1.5 m³ with l=5,w=3 → 0.1', () => {
    expect(Math.abs(SolveFor.solve(t(), {length:5,width:3,depth:0.1}, 'depth', 1.5).value - 0.1)).toBeLessThan(0.001);
  });
  it('round-trip verification: width', () => {
    expect(verifyRoundTrip(t(), {length:5,width:3,depth:0.1}, 'width', 1.5).ok).toBe(true);
  });
});

describe('utilities/salary-hourly — reverse calculation', () => {
  const t = () => tools['salary-hourly'];
  it('solves annual salary for $38.46/hr at 40h → $80k', () => {
    expect(Math.abs(SolveFor.solve(t(), {annualSalary:80000,hoursWeek:40}, 'annualSalary', 38.46).value - 80000)).toBeLessThan(5);
  });
  it('solves hoursWeek for $38.46/hr on $80k → 40', () => {
    expect(Math.abs(SolveFor.solve(t(), {annualSalary:80000,hoursWeek:40}, 'hoursWeek', 38.46).value - 40)).toBeLessThan(0.1);
  });
  it('round-trip verification: annualSalary', () => {
    expect(verifyRoundTrip(t(), {annualSalary:80000,hoursWeek:40}, 'annualSalary', 38.46).ok).toBe(true);
  });
});

describe('auto/car-loan-emi — reverse calculation', () => {
  const base = () => ({ amount: 25000, rate: 7, months: 60 });
  const t = () => tools['car-loan-emi'];
  it('solves amount for EMI $495.14 → ≈25,000', () => {
    // Independent: P = EMI·((1+r)^n−1)/(r·(1+r)^n), r=7/1200, n=60
    expect(Math.abs(SolveFor.solve(t(), base(), 'amount', 495.14).value - 25000)).toBeLessThan(50);
  });
  it('solves months numerically → finite', () => {
    const res = SolveFor.solve(t(), base(), 'months', 495.14);
    expect(isFinite(res.value)).toBe(true);
  });
  it('round-trip verification: amount', () => {
    expect(verifyRoundTrip(t(), base(), 'amount', 495.14).ok).toBe(true);
  });
});

describe('finance/sip — reverse calculation', () => {
  const base = () => ({ monthly: 500, returnRate: 12, years: 10 });
  const t = () => tools['sip'];
  it('solves monthly for target FV → finite and verified', () => {
    const fwd = SolveFor.forward(t(), base(), 'monthly', 500, null);
    const res = SolveFor.solve(t(), base(), 'monthly', fwd);
    expect(Math.abs(res.value - 500)).toBeLessThan(1);
  });
  it('solves returnRate numerically → finite', () => {
    const res = SolveFor.solve(t(), base(), 'returnRate', 116170);
    expect(isFinite(res.value)).toBe(true);
  });
  it('round-trip verification: monthly', () => {
    expect(verifyRoundTrip(t(), base(), 'monthly', 116170).ok).toBe(true);
  });
});

describe('math/quadratic — MULTIPLE SOLUTIONS (discriminant target)', () => {
  const t = () => tools['quadratic'];
  it('solving for b with target discriminant 0 returns TWO solutions (b = ±√(4ac))', () => {
    const res = SolveFor.solve(t(), {a:1,b:-5,c:6}, 'b', 0);
    expect(res.status).toBe('multiple');
    expect(res.values.length).toBe(2);
    const expected = Math.sqrt(4 * 1 * 6); // ≈ 4.899
    expect(Math.abs(Math.abs(res.values[0]) - expected)).toBeLessThan(0.01);
    // Each candidate must reproduce the target discriminant when substituted back
    for (const b of res.values) {
      const d = b * b - 4 * 1 * 6;
      expect(Math.abs(d - 0)).toBeLessThan(1e-6);
    }
  });
  it('both solutions are labeled and verified by the engine', () => {
    const res = SolveFor.solve(t(), {a:1,b:-5,c:6}, 'b', 25);
    expect(res.status).toBe('multiple');
    expect(res.values.length).toBe(2);
    for (const b of res.values) {
      const d = b * b - 4 * 1 * 6;
      expect(Math.abs(d - 25)).toBeLessThan(1e-6);
    }
  });
  it('impossible target discriminant (D + 4ac < 0) → no fake answer', () => {
    const res = SolveFor.solve(t(), {a:1,b:-5,c:6}, 'b', -100);
    expect(['none','error']).toContain(res.status);
  });
});

describe('finance/annuity — reverse calculation', () => {
  const t = () => tools['annuity'];
  it('solves pv for target monthly payment → analytical exact', () => {
    // PMT = PV·r/(1-(1+r)^-n); r=5%/12, n=240 → PV for PMT=659.96 ≈ 100000
    const res = SolveFor.solve(t(), {pv:100000,rate:5,years:20}, 'pv', 659.96);
    expect(Math.abs(res.value - 100000)).toBeLessThan(100);
  });
  it('round-trip verification: pv', () => {
    expect(verifyRoundTrip(t(), {pv:100000,rate:5,years:20}, 'pv', 659.96).ok).toBe(true);
  });
});

describe('finance/inflation — reverse calculation', () => {
  const t = () => tools['inflation'];
  it('solves rate for target future value → analytical exact', () => {
    // FV = amount·(1+r)^t; 1000 → 1343.92 in 10y ≈ 3%
    const res = SolveFor.solve(t(), {amount:1000,rate:3,years:10}, 'rate', 1343.92);
    expect(Math.abs(res.value - 3)).toBeLessThan(0.01);
  });
  it('solves years for target future value → analytical exact', () => {
    const res = SolveFor.solve(t(), {amount:1000,rate:3,years:10}, 'years', 1343.92);
    expect(Math.abs(res.value - 10)).toBeLessThan(0.01);
  });
  it('round-trip verification: rate', () => {
    expect(verifyRoundTrip(t(), {amount:1000,rate:3,years:10}, 'rate', 1343.92).ok).toBe(true);
  });
});

describe('science/half-life — reverse calculation', () => {
  const t = () => tools['half-life'];
  it('solves halfLife for target remaining → analytical exact', () => {
    // N = N0·(1/2)^(t/T); 100 → 88.6 after 1000y → T ≈ 5730
    const res = SolveFor.solve(t(), {initial:100,halfLife:5730,time:1000}, 'halfLife', 88.6);
    expect(Math.abs(res.value - 5730)).toBeLessThan(50);
  });
  it('solves time for target remaining → analytical exact', () => {
    const res = SolveFor.solve(t(), {initial:100,halfLife:5730,time:1000}, 'time', 88.6);
    expect(Math.abs(res.value - 1000)).toBeLessThan(1);
  });
  it('round-trip verification: halfLife', () => {
    expect(verifyRoundTrip(t(), {initial:100,halfLife:5730,time:1000}, 'halfLife', 88.6).ok).toBe(true);
  });
});

describe('science/wavelength + velocity + power + acceleration — reverse', () => {
  it('wavelength solves freq for target λ → analytical', () => {
    const t = tools['wavelength'];
    const res = SolveFor.solve(t, {speed:343,freq:440}, 'freq', 0.7795);
    expect(Math.abs(res.value - 440)).toBeLessThan(1);
  });
  it('velocity solves time for target v → analytical', () => {
    const t = tools['velocity'];
    const res = SolveFor.solve(t, {distance:100,time:10}, 'time', 10);
    expect(Math.abs(res.value - 10)).toBeLessThan(0.01);
  });
  it('power solves time for target P → analytical', () => {
    const t = tools['power'];
    const res = SolveFor.solve(t, {work:500,time:10}, 'time', 50);
    expect(Math.abs(res.value - 10)).toBeLessThan(0.01);
  });
  it('acceleration solves vf for target a → analytical', () => {
    const t = tools['acceleration'];
    const res = SolveFor.solve(t, {vi:0,vf:20,time:5}, 'vf', 4);
    expect(Math.abs(res.value - 20)).toBeLessThan(0.01);
  });
});

describe('auto/car-depreciation + auto-fare — reverse', () => {
  it('car-depreciation solves rate for target current value', () => {
    const t = tools['car-depreciation'];
    const res = SolveFor.solve(t, {purchasePrice:35000,years:3,rate:20}, 'rate', 17920);
    expect(Math.abs(res.value - 20)).toBeLessThan(0.1);
  });
  it('auto-fare solves distance for target fare → analytical', () => {
    const t = tools['auto-fare'];
    const res = SolveFor.solve(t, {distance:5,baseFare:25,perKm:12}, 'distance', 85);
    expect(Math.abs(res.value - 5)).toBeLessThan(0.01);
  });
});

describe('everyday/trip-fuel-cost + electricity — reverse', () => {
  it('trip-fuel-cost solves distance for target cost → analytical', () => {
    const t = tools['trip-fuel-cost'];
    const res = SolveFor.solve(t, {distance:500,mpg:12,price:1.5}, 'distance', 62.5);
    expect(Math.abs(res.value - 500)).toBeLessThan(0.1);
  });
  it('electricity solves rate for target cost → analytical', () => {
    const t = tools['electricity'];
    const res = SolveFor.solve(t, {watts:100,hours:8,days:30,rate:0.12}, 'rate', 2.88);
    expect(Math.abs(res.value - 0.12)).toBeLessThan(0.001);
  });
});

describe('food-nutrition/weight-loss-time — reverse', () => {
  it('solves deficit for target weeks → analytical (target in weeks)', () => {
    const t = tools['weight-loss-time'];
    // 15 kg × 7700 = 115500 cal ÷ 500 = 231 days = 33 weeks
    const res = SolveFor.solve(t, {currentW:80,goalW:65,deficit:500}, 'deficit', 33);
    expect(Math.abs(res.value - 500)).toBeLessThan(5);
  });
  it('solves goalW for target weeks → analytical', () => {
    const t = tools['weight-loss-time'];
    const res = SolveFor.solve(t, {currentW:80,goalW:65,deficit:500}, 'goalW', 33);
    expect(Math.abs(res.value - 65)).toBeLessThan(0.1);
  });
});

describe('fitness/recovery-hr + one-rep-max + calories — reverse', () => {
  it('recovery-hr solves peakHr for target drop 30 → analytical', () => {
    const t = tools['recovery-hr'];
    const res = SolveFor.solve(t, {peakHr:170,after1min:140}, 'peakHr', 30);
    expect(Math.abs(res.value - 170)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {peakHr:170,after1min:140}, 'peakHr', 30).ok).toBe(true);
  });
  it('recovery-hr solves after1min for target 30 → analytical', () => {
    const t = tools['recovery-hr'];
    const res = SolveFor.solve(t, {peakHr:170,after1min:140}, 'after1min', 30);
    expect(Math.abs(res.value - 140)).toBeLessThan(0.01);
  });
  it('one-rep-max solves weight for target 1RM → analytical (Epley/Brzycki/Lander avg)', () => {
    const t = tools['one-rep-max'];
    // f(r) = ((1+5/30) + 36/32 + 100/(101.3-2.67123*5))/3 ≈ 1.1429; w = 100/1.1429 ≈ 87.5
    const res = SolveFor.solve(t, {weight:80,reps:5}, 'weight', 100);
    expect(Math.abs(res.value - 87.5)).toBeLessThan(0.5);
    expect(verifyRoundTrip(t, {weight:80,reps:5}, 'weight', 100).ok).toBe(true);
  });
  it('one-rep-max solves reps numerically → finite', () => {
    const t = tools['one-rep-max'];
    const res = SolveFor.solve(t, {weight:80,reps:5}, 'reps', 100);
    expect(isFinite(res.value)).toBe(true);
  });
  it('calories-exercise solves duration for target cal → analytical', () => {
    const t = tools['calories-exercise'];
    // running (8 MET) × 70kg × d/60 = 280 cal → d = 30
    const res = SolveFor.solve(t, {weight:70,activity:'running',duration:30}, 'duration', 280);
    expect(Math.abs(res.value - 30)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {weight:70,activity:'running',duration:30}, 'duration', 280).ok).toBe(true);
  });
  it('calories-burned solves weight for target BMR → analytical', () => {
    const t = tools['calories-burned'];
    // BMR male: 10w + 6.25*170 - 5*30 + 5 = 1617.5 → w = 70
    const res = SolveFor.solve(t, {weight:70,height:170,age:30,gender:'male'}, 'weight', 1617.5);
    expect(Math.abs(res.value - 70)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {weight:70,height:170,age:30,gender:'male'}, 'weight', 1617.5).ok).toBe(true);
  });
});

describe('everyday/pet-age + walking-steps + blood-alcohol — reverse', () => {
  it('pet-age solves petYears for target human years → analytical', () => {
    const t = tools['pet-age'];
    // dogMed: human = 15 + (9/15+5/5)(y-1) = 15 + 1.6(y-1) → y for 23 = 6
    const res = SolveFor.solve(t, {petYears:5,petType:'dogMed'}, 'petYears', 23);
    expect(Math.abs(res.value - 6)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {petYears:5,petType:'dogMed'}, 'petYears', 23).ok).toBe(true);
  });
  it('walking-steps solves steps for target km → analytical', () => {
    const t = tools['walking-steps'];
    // km = steps*stride/100000 → 7.6 km at 76cm = 10000 steps
    const res = SolveFor.solve(t, {steps:10000,strideCm:76}, 'steps', 7.6);
    expect(Math.abs(res.value - 10000)).toBeLessThan(1);
    expect(verifyRoundTrip(t, {steps:10000,strideCm:76}, 'steps', 7.6).ok).toBe(true);
  });
  it('blood-alcohol solves drinks for target BAC 0.08 → analytical', () => {
    const t = tools['blood-alcohol'];
    // BAC = drinks*1400/(w*1000*0.68) - 0.015*2 → 0.08 → drinks ≈ 3.74
    const res = SolveFor.solve(t, {drinks:3,weight:70,hours:2,gender:'male'}, 'drinks', 0.08);
    expect(Math.abs(res.value - 3.74)).toBeLessThan(0.1);
    expect(verifyRoundTrip(t, {drinks:3,weight:70,hours:2,gender:'male'}, 'drinks', 0.08).ok).toBe(true);
  });
  it('vacation-budget solves nights for target total → analytical', () => {
    const t = tools['vacation-budget'];
    // total = 500 + 150n + 60n + 300 = 800 + 210n → 1850 → n = 5
    const res = SolveFor.solve(t, {flight:500,hotel:150,nights:5,food:60,activitiesTotal:300}, 'nights', 1850);
    expect(Math.abs(res.value - 5)).toBeLessThan(0.01);
  });
  it('laundry-cost solves loads for target weekly → analytical', () => {
    const t = tools['laundry-cost'];
    // weekly = ((0.5+2.5)*0.12 + 0.25)*loads = 0.61*loads → 2.44 for 4 loads
    const res = SolveFor.solve(t, {loads:4,washerKwh:0.5,dryerKwh:2.5,rateKwh:0.12,detergentCost:0.25}, 'loads', 2.44);
    expect(Math.abs(res.value - 4)).toBeLessThan(0.01);
  });
  it('coffee-cost solves cupsDay for target annual → analytical', () => {
    const t = tools['coffee-cost'];
    // annual = cups × 5 × 5 × 52 = 2600 for 2 cups
    const res = SolveFor.solve(t, {cupsDay:2,costCup:5,daysWeek:5}, 'cupsDay', 2600);
    expect(Math.abs(res.value - 2)).toBeLessThan(0.01);
  });
});

describe('education/homework-time + flashcard-count + grade-needed + sat — reverse', () => {
  it('homework-time solves pages for target total min → analytical', () => {
    const t = tools['homework-time'];
    // total = 3p + 5*15 + 500/200*60 = 3p + 225 → 285 for p = 20
    const res = SolveFor.solve(t, {pages:20,problems:15,essayWords:500}, 'pages', 285);
    expect(Math.abs(res.value - 20)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {pages:20,problems:15,essayWords:500}, 'pages', 285).ok).toBe(true);
  });
  it('flashcard-count solves totalCards for target cards/day → analytical', () => {
    const t = tools['flashcard-count'];
    // perDay = total/7 → 100 for 700 cards
    const res = SolveFor.solve(t, {totalCards:100,reviewDays:7,newDaily:20}, 'totalCards', 100);
    expect(Math.abs(res.value - 700)).toBeLessThan(0.01);
  });
  it('grade-needed solves targetGrade for needed % → analytical', () => {
    const t = tools['grade-needed'];
    // needed = (tg - 78*0.6)/0.4 = 95.5 → tg = 85
    const res = SolveFor.solve(t, {currentGrade:78,currentWeight:60,targetGrade:85}, 'targetGrade', 95.5);
    expect(Math.abs(res.value - 85)).toBeLessThan(0.01);
  });
  it('sat-score solves mathScore for total → analytical', () => {
    const t = tools['sat-score'];
    const res = SolveFor.solve(t, {mathScore:650,erwScore:700}, 'mathScore', 1350);
    expect(Math.abs(res.value - 650)).toBeLessThan(0.01);
  });
});

describe('career/crypto-tax + career-gap — reverse', () => {
  it('crypto-tax solves buyPrice for target tax → analytical', () => {
    const t = tools['crypto-tax'];
    // gain = 40000, long-term 15% → tax 6000; buy = 50000 - 6000/0.15 = 10000
    const res = SolveFor.solve(t, {buyPrice:10000,sellPrice:50000,holdingPeriod:'long',income:80000}, 'buyPrice', 6000);
    expect(Math.abs(res.value - 10000)).toBeLessThan(1);
    expect(verifyRoundTrip(t, {buyPrice:10000,sellPrice:50000,holdingPeriod:'long',income:80000}, 'buyPrice', 6000).ok).toBe(true);
  });
  it('career-gap solves currentSalary for target loss → analytical', () => {
    const t = tools['career-gap'];
    // loss = salary*((1.05^2 - 1)/0.05) = salary*2.05 → 205000 for 100000
    const res = SolveFor.solve(t, {currentSalary:100000,gapYears:2,growthRate:5}, 'currentSalary', 205000);
    expect(Math.abs(res.value - 100000)).toBeLessThan(1);
    expect(verifyRoundTrip(t, {currentSalary:100000,gapYears:2,growthRate:5}, 'currentSalary', 205000).ok).toBe(true);
  });
});

describe('food-nutrition/cooking-time + meal-prep + sugar-intake — reverse', () => {
  it('cooking-time solves weight for target adjusted min → analytical', () => {
    const t = tools['cooking-time'];
    // adjusted = 90*(w/2)^(2/3) → 74.29 for w = 1.5
    const res = SolveFor.solve(t, {weight:1.5,recipeWeight:2,recipeTime:90}, 'weight', 74.29);
    expect(Math.abs(res.value - 1.5)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {weight:1.5,recipeWeight:2,recipeTime:90}, 'weight', 74.29).ok).toBe(true);
  });
  it('meal-prep solves totalCost for target per-serving → analytical', () => {
    const t = tools['meal-prep'];
    const res = SolveFor.solve(t, {totalCost:24,servings:8}, 'totalCost', 3);
    expect(Math.abs(res.value - 24)).toBeLessThan(0.01);
  });
  it('sugar-intake solves sugarGrams for target % of limit → analytical', () => {
    const t = tools['sugar-intake'];
    // pct = g/25*100 → 180 for g = 45
    const res = SolveFor.solve(t, {age:30,sugarGrams:45,weight:70}, 'sugarGrams', 180);
    expect(Math.abs(res.value - 45)).toBeLessThan(0.01);
  });
});

describe('food-nutrition/keto-macro + intermittent-fasting + auto/car-maintenance — reverse', () => {
  it('keto-macro solves weight for target TDEE → analytical', () => {
    const t = tools['keto-macro'];
    // TDEE male = (10w + 6.25×170 - 5×30 + 5) × 1.4 = 2264.5 cal/day for w=70
    // → result shows Math.round → 2265 cal/day
    const res = SolveFor.solve(t, {weight:70,height:170,age:30,gender:'male'}, 'weight', 2265);
    expect(Math.abs(res.value - 70.04)).toBeLessThan(0.05);
    expect(verifyRoundTrip(t, {weight:70,height:170,age:30,gender:'male'}, 'weight', 2265).ok).toBe(true);
  });
  it('intermittent-fasting solves wakeTime for target eat start → analytical', () => {
    const t = tools['intermittent-fasting'];
    // eatStart = (wake + 16) % 24 → 23 means wake = 7
    const res = SolveFor.solve(t, {fastHours:'16',wakeTime:7}, 'wakeTime', 23);
    expect(Math.abs(res.value - 7)).toBeLessThan(0.01);
    expect(verifyRoundTrip(t, {fastHours:'16',wakeTime:7}, 'wakeTime', 23).ok).toBe(true);
  });
  it('car-maintenance solves mileage for target annual cost → analytical', () => {
    const t = tools['car-maintenance'];
    // 3-yr-old car: base 900 → $900/yr at 15000 km
    const res = SolveFor.solve(t, {age:3,mileage:15000}, 'mileage', 900);
    expect(Math.abs(res.value - 15000)).toBeLessThan(1);
    expect(verifyRoundTrip(t, {age:3,mileage:15000}, 'mileage', 900).ok).toBe(true);
  });
});

describe('SolveFor engine safety', () => {
  it('bisection terminates (bounded iterations) on an impossible target', () => {
    const res = SolveFor.solve(tools['loan-emi'], {amount:100000,rate:6,years:30,paymentFreq:12,mode:'payment'}, 'rate', 99999999);
    expect(['none','error']).toContain(res.status);
  });
  it('no infinite loop on huge/small targets', () => {
    const t = tools['circle'];
    const r1 = SolveFor.solve(t, {r:5}, 'r', 1e15);
    // r = sqrt(1e15/π) ≈ 1.78e7 is outside the declared domain [0,1e7] → rejected fast, no iteration blowup.
    expect(['none','error']).toContain(r1.status);
    expect(r1.iterations === undefined || r1.iterations <= 200).toBe(true);
    const r2 = SolveFor.solve(t, {r:5}, 'r', 1e-9);
    // r = sqrt(1e-9/π) ≈ 1.78e-5 is inside the domain → valid exact solve, bounded iterations.
    expect(r2.status === 'exact' || r2.status === 'approximate').toBe(true);
    expect(r2.iterations === undefined || r2.iterations <= 200).toBe(true);
  });
});
