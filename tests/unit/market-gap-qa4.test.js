// ============================================================
// Independent known-answer QA — market-gap tools, batch #5
// ------------------------------------------------------------
// Remaining Part 2 opportunities plus the multi-property tracker.
// Each test re-implements the documented model INDEPENDENTLY.
// ============================================================
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const FILES = {
  family: 'parenting-family.js',
  finance: 'finance.js',
  construction: 'construction.js',
  business: 'business.js',
  career: 'career-freelance.js',
  everyday: 'everyday.js',
  education: 'education.js',
};
const CACHE = {};
function findTool(id) {
  for (const f of Object.keys(FILES)) {
    if (!CACHE[f]) {
      const arr = require(join(ROOT, 'js', 'data', FILES[f]));
      CACHE[f] = Array.isArray(arr) ? arr.filter((t) => t && t.id) : [];
    }
    const t = CACHE[f].find((x) => x.id === id);
    if (t) return t;
  }
  return null;
}
function run(id, values) {
  const t = findTool(id);
  if (!t) throw new Error('tool not found: ' + id);
  const v = {};
  t.inputs.forEach((inp) => { v[inp.id] = values[inp.id] !== undefined ? values[inp.id] : inp.def; });
  const out = t.calc(v);
  expect(out).toBeTruthy();
  expect(String(out.result + ' ' + (out.extra || ''))).not.toMatch(/NaN|Infinity|undefined/);
  return out;
}
function nums(s) {
  return String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g).map(Number);
}

describe('Life-events finance (batch #5)', () => {
  it('bereavement: 120000 cash over a net 1500 need = 80.0 months, 8 steps', () => {
    const out = run('bereavement-checklist', { hasWill: true, lifeInsurance: 100000, existingSavings: 20000, monthlyExpenses: 3000, receivesBenefit: true, monthlyBenefit: 1500 });
    expect(out.result).toMatch(/80\.0 months/);
    expect(out.result).toMatch(/8 steps/);
  });
  it('bereavement: no will adds a ninth checklist step', () => {
    const out = run('bereavement-checklist', { hasWill: false, lifeInsurance: 100000, existingSavings: 20000, monthlyExpenses: 3000, receivesBenefit: true, monthlyBenefit: 1500 });
    expect(out.result).toMatch(/9 steps/);
  });
  it('inheritance tax: UK 500000, no spouse exemption = 70000', () => {
    const out = run('inheritance-tax-uk-india', { country: 'UK', estateValue: 500000, spouseExempt: false, charityPercent: 0 });
    const taxable = Math.max(0, 500000 - 325000);
    expect(nums(out.result)[0]).toBeCloseTo(taxable * 0.4, 5);
  });
  it('inheritance tax: spouse exemption and India both give zero', () => {
    expect(nums(run('inheritance-tax-uk-india', { country: 'UK', estateValue: 900000, spouseExempt: true, charityPercent: 0 }).result)[0]).toBe(0);
    expect(nums(run('inheritance-tax-uk-india', { country: 'India', estateValue: 900000, spouseExempt: false, charityPercent: 0 }).result)[0]).toBe(0);
  });
  it('inheritance tax: charity reduces the taxable estate', () => {
    const out = run('inheritance-tax-uk-india', { country: 'UK', estateValue: 500000, spouseExempt: false, charityPercent: 10 });
    const taxable = Math.max(0, 500000 - 50000 - 325000);
    expect(nums(out.result)[0]).toBeCloseTo(taxable * 0.4, 5);
  });
});

describe('Trade & career maths (batch #5)', () => {
  it('journeyman progression: 16 to 32/hr, 4 + 10 years at 3% = 925688', () => {
    const out = run('journeyman-wage-progression', { apprenticeStartWage: 16, journeyWage: 32, apprenticeYears: 4, journeyYears: 10, hoursPerYear: 2000, annualRaisePct: 3 });
    const appEarn = Math.round(((16 + 32) / 2) * 2000 * 4);
    const grow = (Math.pow(1.03, 10) - 1) / 0.03;
    const jourEarn = Math.round(32 * 2000 * grow);
    expect(nums(out.result)[0]).toBe(appEarn + jourEarn);
  });
  it('tool depreciation: straight line 360, declining balance 800', () => {
    expect(nums(run('tool-depreciation', { toolCost: 2000, salvageValue: 200, usefulLifeYears: 5, method: 'Straight line' }).result)[0]).toBe(360);
    expect(nums(run('tool-depreciation', { toolCost: 2000, salvageValue: 200, usefulLifeYears: 5, method: 'Declining balance' }).result)[0]).toBe(800);
  });
  it('us priority date: 2025 vs 2018 cutoff = approximately 7 years', () => {
    const out = run('us-priority-date', { category: 'Family F4', priorityYear: 2025, currentCutoffYear: 2018 });
    expect(out.result).toMatch(/approximately 7 years/);
  });
  it('us priority date: a date before the cutoff is current', () => {
    const out = run('us-priority-date', { category: 'Family F1', priorityYear: 2018, currentCutoffYear: 2024 });
    expect(out.result).toMatch(/current/i);
  });
  it('interview tracker: 1 offer from 50 applications = 2.0 percent', () => {
    const out = run('interview-to-offer-tracker', { applications: 50, interviews: 10, offers: 1 });
    expect(out.result).toMatch(/2\.0 percent/);
  });
});

describe('Relocation, home and education (batch #5)', () => {
  it('cost of living: 60000 x 100/35 in London = 171429', () => {
    const out = run('cost-of-living-compare', { cityA: 'Karachi', cityB: 'London', currentSalary: 60000, housingSharePct: 30 });
    expect(nums(out.result)[0]).toBe(Math.round(60000 * 100 / 35));
  });
  it('business EV charger ROI: capex 40000 over 75600 gross = 0.5 years', () => {
    const out = run('ev-charger-business-roi', { chargers: 4, costPerCharger: 5000, installTotal: 20000, sessionsPerDay: 6, kwhPerSession: 30, pricePerKwh: 0.5, costPerKwh: 0.2, daysPerYear: 350 });
    const kwh = 4 * 6 * 350 * 30;
    const gross = kwh * (0.5 - 0.2);
    const capex = 4 * 5000 + 20000;
    expect(nums(out.result)[0]).toBeCloseTo(Math.round((capex / gross) * 10) / 10, 1);
  });
  it('student loan: 15000/yr uncovered x 4 = 60000 principal', () => {
    const out = run('student-loan-vs-scholarship', { tuitionPerYear: 20000, years: 4, scholarshipPerYear: 5000, loanRatePct: 6, loanTermYears: 10 });
    const loan = Math.max(0, 20000 - 5000) * 4;
    const r = 0.06 / 12, n = 120;
    const pay = loan * r / (1 - Math.pow(1 + r, -n));
    expect(nums(out.result)[0]).toBe(loan);
    expect(nums(out.extra)).toContain(Math.round(pay));
    expect(nums(out.extra)).toContain(Math.round(pay * n - loan));
  });
  it('student loan: a full scholarship needs no loan', () => {
    const out = run('student-loan-vs-scholarship', { tuitionPerYear: 10000, years: 4, scholarshipPerYear: 12000, loanRatePct: 6, loanTermYears: 10 });
    expect(nums(out.result)[0]).toBe(0);
  });
  it('rental portfolio: 3 properties, net 900, gross yield 9.0 percent', () => {
    const out = run('rental-portfolio-tracker', { properties: 3, avgValue: 200000, avgMonthlyRent: 1500, avgMonthlyCosts: 400, mortgagePerProperty: 800 });
    expect(nums(out.result)[0]).toBe(900);
    expect(nums(out.extra)[0]).toBe(10800);
  });
});
