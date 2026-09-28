// ============================================================
// Independent known-answer QA — regional tools, batch #4
// ------------------------------------------------------------
// Covers IE/NZ/ZA take-home tools that shipped in batch #4.
// Each test re-implements the tool's documented model
// INDEPENDENTLY (table-driven, no shared code) and asserts the
// tool matches to the displayed precision (±1 unit on
// integer-rounded money handles rounding seams).
//
// Documented models (also mirrored in docs/qa-contracts.json):
//   IE: PAYE 20% to 44,000 (single) / 53,000 (married one-income),
//       40% above, minus 4,000 standard credits (floor 0);
//       USC 0.5/2/3/8% bands; PRSI 4.1% of gross.
//   NZ: PAYE 2025-26: 10.5% to 15,600, 17.5% to 53,500, 30% to
//       78,100, 33% to 180,000, 39% above; ACC 1.67% capped at
//       152,790; KiwiSaver employee rate (default 3%).
//   ZA: SARS 2025-26 annual brackets with cumulative constants
//       (primary rebate baked in); secondary 9,444 at 65+,
//       tertiary +3,145 more at 75+; UIF 1% capped 177.12/mo.
// ============================================================
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ---- Browser-global bootstrap (mirrors regional-takehome-batch23-qa.test.js) ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const require = createRequire(import.meta.url);

function allNums(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[,\\s]/g, '')
    .match(/-?\d+(?:\.\d+)?/g)
    .map(Number);
}

function closest(nums, expected) {
  return nums.reduce((b, x) => (Math.abs(x - expected) < Math.abs(b - expected) ? x : b), nums[0] ?? 1e9);
}

const REGIONAL = require(join(ROOT, 'js', 'data', 'regional.js'));
function run(id, values) {
  const t = REGIONAL.find((x) => x.id === id);
  if (!t) throw new Error('tool not found: ' + id);
  const out = t.calc(values);
  expect(out).toBeTruthy();
  expect(String(out.result + ' ' + (out.extra || ''))).not.toMatch(/NaN|Infinity|undefined/);
  return out;
}

function expectMoney(out, expected, tol = 1) {
  const nums = allNums(out.result + ' ' + (out.extra || ''));
  const got = closest(nums, expected);
  expect(Math.abs(got - expected)).toBeLessThanOrEqual(tol);
}

// ---------------- independent reference models (NO shared code) ----------------

function bracketTax(amount, bands) {
  // bands: [[upperBound, rate], ...] with Infinity top — computed continuously
  let tax = 0, lower = 0;
  for (const [upper, rate] of bands) {
    if (amount > lower) { tax += (Math.min(amount, upper) - lower) * rate; lower = upper; } else break;
  }
  return tax;
}

const IE = {
  bandsSingle: [[44000, 0.20], [Infinity, 0.40]],
  bandsMarried: [[53000, 0.20], [Infinity, 0.40]],
  uscBands: [[12012, 0.005], [27382, 0.02], [70044, 0.03], [Infinity, 0.08]],
  take(salary, married) {
    const bands = married ? this.bandsMarried : this.bandsSingle;
    const grossTax = bracketTax(salary, bands);
    const paye = Math.max(0, grossTax - 4000);
    const usc = bracketTax(salary, this.uscBands);
    const prsi = salary * 0.041;
    return { paye, usc, prsi, take: salary - paye - usc - prsi };
  },
};

const NZ = {
  bands: [[15600, 0.105], [53500, 0.175], [78100, 0.30], [180000, 0.33], [Infinity, 0.39]],
  take(salary, ksPct) {
    const tax = bracketTax(salary, this.bands);
    const acc = Math.min(salary, 152790) * 0.0167;
    const ks = salary * ksPct / 100;
    return { tax, acc, ks, take: salary - tax - acc - ks };
  },
};

const ZA = {
  bands: [[237100, 0.18], [370500, 0.26], [512800, 0.31], [673000, 0.36], [857900, 0.39], [1817000, 0.41], [Infinity, 0.45]],
  take(monthly, age) {
    const annual = monthly * 12;
    const tax = bracketTax(annual, this.bands);
    const rebate = age === '75+' ? 12589 : age === '65+' ? 9444 : 0;
    const paye = Math.max(0, tax - rebate);
    const uif = Math.min(monthly, 177.12);
    return { paye, uif, take: monthly - paye / 12 - uif };
  },
};

// ---------------- tests ----------------

describe('IE take-home (batch #4) — independent known answers', () => {
  it('50,000 single: PAYE 7,200 after credits, net ≈ 39,704/yr', () => {
    const ref = IE.take(50000, false);
    expect(ref.paye).toBeCloseTo(7200, 0);
    const out = run('ireland-take-home-salary', { salary: 50000, status: 'Single' });
    expectMoney(out, Math.round(ref.take / 12));
    expectMoney(out, Math.round(ref.take));
  });

  it('60,000 single: PAYE = 8,800+6,400−4,000 = 11,200', () => {
    const ref = IE.take(60000, false);
    expect(ref.paye).toBeCloseTo(11200, 0);
    const out = run('ireland-take-home-salary', { salary: 60000, status: 'Single' });
    expectMoney(out, Math.round(ref.take));
  });

  it('50,000 married one-income: 20% band widens to 53,000 → no 40% slice', () => {
    const ref = IE.take(50000, true);
    expect(ref.paye).toBeCloseTo(6000, 0); // 50,000 × 20% − 4,000 credits
    const out = run('ireland-take-home-salary', { salary: 50000, status: 'Married (one income)' });
    expectMoney(out, Math.round(ref.take));
  });

  it('low salary: credits can zero the PAYE slice', () => {
    const ref = IE.take(20000, false);
    expect(ref.paye).toBe(0);
    const out = run('ireland-take-home-salary', { salary: 20000, status: 'Single' });
    expectMoney(out, Math.round(ref.take));
  });
});

describe('NZ take-home (batch #4) — independent known answers', () => {
  it('80,000 @3% KiwiSaver: tax 16,277.5, net ≈ 59,986/yr', () => {
    const ref = NZ.take(80000, 3);
    expect(ref.tax).toBeCloseTo(16277.5, 1);
    const out = run('new-zealand-take-home-salary', { salary: 80000, ks: 3 });
    expectMoney(out, Math.round(ref.take));
    expectMoney(out, Math.round(ref.take / 12));
  });

  it('ACC caps at 152,790 of covered earnings', () => {
    const ref = NZ.take(200000, 3);
    expect(ref.acc).toBeCloseTo(152790 * 0.0167, 0);
    const out = run('new-zealand-take-home-salary', { salary: 200000, ks: 3 });
    expectMoney(out, Math.round(ref.take));
  });

  it('10% KiwiSaver reduces take-home by the extra 7% of salary', () => {
    const a = NZ.take(100000, 3);
    const b = NZ.take(100000, 10);
    expect(b.take).toBeCloseTo(a.take - 100000 * 0.07, 0);
    const out = run('new-zealand-take-home-salary', { salary: 100000, ks: 10 });
    expectMoney(out, Math.round(b.take));
  });

  it('first 15,600 is taxed at 10.5% only', () => {
    const ref = NZ.take(15600, 0);
    expect(ref.tax).toBeCloseTo(15600 * 0.105, 0);
    const out = run('new-zealand-take-home-salary', { salary: 15600, ks: 0 });
    expectMoney(out, Math.round(ref.take));
  });
});

describe('ZA take-home (batch #4) — independent known answers', () => {
  it('R50,000/mo under 65: PAYE 152,867/yr, net ≈ 37,084/mo', () => {
    const ref = ZA.take(50000, 'Under 65');
    expect(ref.paye).toBeCloseTo(152867, 0);
    const out = run('south-africa-take-home-salary', { salary: 50000, age: 'Under 65' });
    expectMoney(out, Math.round(ref.take));
  });

  it('65+ secondary rebate adds ~787/month back', () => {
    const a = ZA.take(50000, 'Under 65');
    const b = ZA.take(50000, '65+');
    expect(b.paye).toBeCloseTo(a.paye - 9444, 0);
    const out = run('south-africa-take-home-salary', { salary: 50000, age: '65+' });
    expectMoney(out, Math.round(b.take));
  });

  it('75+ tertiary rebate stacks the extra 3,145', () => {
    const a = ZA.take(50000, '65+');
    const c = ZA.take(50000, '75+');
    expect(c.paye).toBeCloseTo(a.paye - 3145, 0);
    const out = run('south-africa-take-home-salary', { salary: 50000, age: '75+' });
    expectMoney(out, Math.round(c.take));
  });

  it('UIF caps at R177.12/month even for high salaries', () => {
    const ref = ZA.take(200000, 'Under 65');
    expect(ref.uif).toBeCloseTo(177.12, 1);
    const out = run('south-africa-take-home-salary', { salary: 200000, age: 'Under 65' });
    expectMoney(out, Math.round(ref.take));
  });
});
