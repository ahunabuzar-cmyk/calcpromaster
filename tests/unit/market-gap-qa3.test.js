// ============================================================
// Independent known-answer QA — market-gap tools, batch #4
// ------------------------------------------------------------
// Life-events finance, home energy and ownership, education cost
// and career prep. Each test re-implements the documented model
// INDEPENDENTLY (no shared code) and asserts the shipped tool.
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
  finance: 'finance.js',
  career: 'career-freelance.js',
  homegarden: 'home-garden.js',
  auto: 'auto-transport.js',
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

describe('Life-events finance (batch #4)', () => {
  it('divorce cost: negotiated 300/hr x 20h, no children = 6000', () => {
    const out = run('divorce-cost', { route: 'Lawyer negotiated', hourlyRate: 300, totalHours: 20, children: 0 });
    expect(nums(out.result)[0]).toBe(6000);
  });
  it('divorce cost: mediation is 0.4x and contested with 2 children adds 1000', () => {
    expect(nums(run('divorce-cost', { route: 'Mediation', hourlyRate: 300, totalHours: 20, children: 0 }).result)[0]).toBeCloseTo(2400, 5);
    expect(nums(run('divorce-cost', { route: 'Contested court', hourlyRate: 300, totalHours: 20, children: 2 }).result)[0]).toBeCloseTo(16000, 5);
  });
  it('moving abroad: USA 10 cbm, 1 adult, deposit = 4700', () => {
    const out = run('moving-abroad-cost', { destination: 'USA', cubicMeters: 10, adults: 1, children: 0, deposit: true });
    const expected = 10 * 120 + 1 * 1200 + 0 + 1 * 800 + 0 + 1500;
    expect(nums(out.result)[0]).toBeCloseTo(expected, 5);
  });
  it('moving abroad: UAE no deposit, 8 cbm, 2 adults 1 child', () => {
    const out = run('moving-abroad-cost', { destination: 'UAE', cubicMeters: 8, adults: 2, children: 1, deposit: false });
    const expected = 8 * 120 + 2 * 700 + 1 * 400 + 2 * 800 + 1 * 500 + 0;
    expect(nums(out.result)[0]).toBeCloseTo(expected, 5);
  });
  it('career break runway: 10000 savings, 2000/mo = 5.0 months, 14000 shortfall at 12', () => {
    const out = run('career-break-runway', { monthlyExpenses: 2000, currentSavings: 10000, monthlyIncome: 0, plannedMonths: 12 });
    expect(out.result).toMatch(/5\.0 months/);
    expect(nums(out.result)).toContain(14000);
  });
  it('career break runway: income covering expenses reports no drawdown', () => {
    const out = run('career-break-runway', { monthlyExpenses: 2000, currentSavings: 5000, monthlyIncome: 2500, plannedMonths: 12 });
    expect(out.result).toMatch(/No drawdown/i);
  });
  it('cosigner exposure: 20000 x 10% = 2000', () => {
    expect(nums(run('cosigning-loan-risk', { loanAmount: 20000, defaultProbabilityPct: 10, loanTermYears: 5 }).result)[0]).toBeCloseTo(2000, 5);
  });
  it('cosigner exposure: 50000 x 25% = 12500', () => {
    expect(nums(run('cosigning-loan-risk', { loanAmount: 50000, defaultProbabilityPct: 25, loanTermYears: 3 }).result)[0]).toBeCloseTo(12500, 5);
  });
});

describe('Home energy and ownership (batch #4)', () => {
  it('solar payback: 15000 @30% credit, 9000/10000 kWh @0.20 = 5.8 years, 34500 lifetime', () => {
    const out = run('solar-payback', { systemCost: 15000, annualProductionKwh: 9000, annualUsageKwh: 10000, electricityRate: 0.2, incentivePct: 30 });
    const net = 15000 * 0.7;
    const savings = Math.min(9000, 10000) * 0.2;
    expect(nums(out.result)[0]).toBeCloseTo(Math.round((net / savings) * 10) / 10, 1);
    expect(nums(out.extra)).toContain(10500);
    expect(nums(out.extra)).toContain(savings * 25 - net);
  });
  it('ev charger roi: charger 2000 installed, 12000 mi, 28 mpg @3.5 vs 3.5 mi/kWh @0.15 = 2.0 years', () => {
    const out = run('ev-charger-roi', { chargerCost: 1200, installCost: 800, annualMiles: 12000, gasPrice: 3.5, gasMpg: 28, evMilesPerKwh: 3.5, electricityRate: 0.15 });
    const gas = (12000 / 28) * 3.5;
    const ev = (12000 / 3.5) * 0.15;
    expect(nums(out.result)[0]).toBeCloseTo(Math.round((2000 / (gas - ev)) * 10) / 10, 1);
  });
  it('carbon offset: 4x6h flights + 12000 mi + 8000 kWh = 10.16 tonnes', () => {
    const out = run('carbon-offset', { flights: 4, hoursPerFlight: 6, carMiles: 12000, homeKwh: 8000, offsetPricePerTonne: 15 });
    const total = 4 * 6 * 0.09 + 12000 * 0.0004 + 8000 * 0.0004;
    expect(nums(out.result)[0]).toBeCloseTo(total, 2);
  });
  it('first-year homeowner: 300000 home default inputs = 40500', () => {
    const out = run('homeowner-first-year-budget', { homePrice: 300000, closingCosts: 6000, movingCost: 1500, furnishing: 4000, emergencyRepairs: 2000, monthlyMortgage: 1600, propertyTaxAnnual: 3600, insuranceAnnual: 1200, maintenancePct: 1 });
    const expected = 6000 + 1500 + 4000 + 2000 + 1600 * 12 + 3600 + 1200 + 300000 * 1 / 100;
    expect(nums(out.result)[0]).toBeCloseTo(expected, 5);
  });
});

describe('Education cost and funding (batch #4)', () => {
  it('study abroad: USA 4 years, avg 35000 tuition + 12000 living = 188000', () => {
    const out = run('study-abroad-cost', { country: 'USA', years: 4, livingCostPerYear: 12000, tuitionPerYearOverride: 0 });
    expect(nums(out.result)[0]).toBeCloseTo(35000 * 4 + 12000 * 4, 5);
  });
  it('study abroad: tuition override wins over the country average', () => {
    const out = run('study-abroad-cost', { country: 'UK', years: 3, livingCostPerYear: 10000, tuitionPerYearOverride: 20000 });
    expect(nums(out.result)[0]).toBeCloseTo(20000 * 3 + 10000 * 3, 5);
  });
  it('scholarship gap: 50000 - 20000 - 15000 - 3000 = 12000/yr, 48000 total', () => {
    const out = run('scholarship-gap', { annualCost: 50000, scholarshipPerYear: 20000, familyContributionPerYear: 15000, workStudyPerYear: 3000, years: 4 });
    expect(nums(out.result)).toContain(12000);
    expect(nums(out.result)).toContain(48000);
  });
  it('scholarship gap: overfunded leaves a zero gap', () => {
    const out = run('scholarship-gap', { annualCost: 30000, scholarshipPerYear: 35000, familyContributionPerYear: 0, workStudyPerYear: 0, years: 4 });
    expect(nums(out.result)[0]).toBe(0);
    expect(nums(out.result)[1]).toBe(0);
  });
});

describe('Career prep (batch #4)', () => {
  it('ats resume score: default inputs = 86', () => {
    const out = run('ats-resume-score', { keywordMatchPct: 70, quantifiedBulletsPct: 60, hasContactInfo: true, hasSkillsSection: true, wordCount: 600, usesTablesGraphics: false, fileFormat: 'PDF (text-based)' });
    expect(nums(out.result)[0]).toBe(86);
  });
  it('ats resume score: scanned PDF with tables and 900 words penalised to 45', () => {
    const out = run('ats-resume-score', { keywordMatchPct: 50, quantifiedBulletsPct: 50, hasContactInfo: true, hasSkillsSection: true, wordCount: 900, usesTablesGraphics: true, fileFormat: 'PDF (scanned image)' });
    const expected = Math.min(40, 50 * 0.4) + Math.min(30, 50 * 0.3) + 10 + 10 + 0 + 0 - 10;
    expect(nums(out.result)[0]).toBe(Math.max(0, Math.min(100, Math.round(expected))));
  });
  it('salary range: 75000 median, 5 yrs, strong = target 82500 open 89100', () => {
    const out = run('salary-negotiation-range', { currentSalary: 60000, marketLow: 65000, marketMedian: 75000, marketHigh: 85000, yearsExperience: 5, offerStrength: 'Strong' });
    expect(out.result).toMatch(/Target: 82500/);
    expect(out.result).toMatch(/Open at: 89100/);
  });
  it('salary range: experience caps at market high and moderate leverage trims the opening', () => {
    const out = run('salary-negotiation-range', { currentSalary: 60000, marketLow: 65000, marketMedian: 80000, marketHigh: 90000, yearsExperience: 10, offerStrength: 'Moderate' });
    const target = Math.min(90000, Math.round(80000 * (1 + 0.02 * 10)));
    const opening = Math.round(target * (1 + 0.08 * 0.5));
    expect(target).toBe(90000);
    expect(out.result).toMatch(new RegExp('Target: ' + target));
    expect(out.result).toMatch(new RegExp('Open at: ' + opening));
  });
});
