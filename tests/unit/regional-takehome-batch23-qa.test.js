// ============================================================
// Independent known-answer QA — regional tools, batches #2 + #3
// ------------------------------------------------------------
// Covers the 10 regional tools that shipped without deep-QA
// coverage (AU/SG/QA/AD/JP from batch #2, CH/NL/MY/HK/UAE-gratuity
// from batch #3). Each test re-implements the tool's documented
// model INDEPENDENTLY (table-driven, no shared code) and asserts
// the tool matches to the displayed precision (±1 unit on
// integer-rounded money handles rounding seams).
//
// Documented models (also mirrored in docs/qa-contracts.json):
//   AU: 2025-26 brackets on (salary - 18,200): 16/30/37/45%;
//       Medicare 2% of gross; super is employer-paid ON TOP.
//   SG: employee CPF 20% on first S$7,400/mo; expats 0.
//   QA: no personal income tax; take-home = basic + allowances.
//   AD: fixed = (rent+school)/12 + transport + utilities;
//       discretionary = 20% of salary; surplus = salary - all.
//   JP: employment deduction 480,000 + 10%; national 5/10/20/23%;
//       resident ~10% + 5,000; shakai hoken 14.66% (capped base).
//   CH: social 13.4%; effective tax bands by canton level
//       (low 9% / average 13.5% / high 21% folded into tiers).
//   NL: loonheffing 30% to 38,441 / 33.5% to 76,817 / 42% above
//       (seam tax computed continuously); ruling taxes 70% only.
//   MY: EPF 11%; taxable = annual - EPF - 9,000 relief; PCB
//       0% to 35k / 3% to 100k / 8% above.
//   HK: MPF 5% cap HK$1,500; NCI = annual - MPF - 132,000;
//       progressive 2/6/10/14% with 15% standard-rate min().
//   UAE gratuity: daily = basic x12/365; 21 d/yr first 5 yrs,
//       30 d/yr after; capped at 2 years of wages.
// ============================================================
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ---- Browser-global bootstrap (mirrors regional-takehome-qa.test.js) ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const require = createRequire(import.meta.url);

function allNums(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[,\s]/g, '')
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
  expect(String(out.result)).not.toMatch(/NaN|Infinity|undefined/);
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

const AU = {
  bands: [[18200, 0], [45000, 0.16], [135000, 0.30], [190000, 0.37], [Infinity, 0.45]],
  take(salary) {
    const tax = bracketTax(salary, this.bands);
    return { tax, medicare: salary * 0.02, take: salary - tax - salary * 0.02 };
  },
};

const JP = {
  taxBands: [[1950000, 0.05], [3300000, 0.10], [6950000, 0.20], [Infinity, 0.23]],
  take(salary) {
    const income = Math.max(0, salary - 480000 - salary * 0.1);
    const national = income <= 1950000 ? 5000 : (income - 1950000) * 0.1 + 5000;
    const itax = bracketTax(income, this.taxBands);
    const shakai = Math.min(salary, 15100000) * 0.1466;
    return { income, national, itax, shakai, take: salary - itax - national - shakai };
  },
};

const CH = {
  rate: { low: 0.09, avg: 0.135, high: 0.21 },
  tax(salary, level) {
    const r = this.rate[level];
    if (salary <= 30000) return salary * 0.005;
    if (salary <= 60000) return salary * (0.03 + r * 0.3);
    if (salary <= 100000) return salary * (0.06 + r * 0.5);
    return salary * (0.09 + r * 0.6);
  },
  take(salary, level) {
    const social = salary * 0.134;
    const tax = this.tax(salary, level);
    return { social, tax, take: salary - social - tax };
  },
};

const NL = {
  // continuous seam: 30% band ends at 38,441 with 38,441*0.30 already charged
  bands: [[38441, 0.30], [76817, 0.335], [Infinity, 0.42]],
  withholding(base) { return bracketTax(base, this.bands); },
  take(salary, ruling) {
    const base = ruling ? salary * 0.7 : salary;
    const tax = this.withholding(base);
    return { base, tax, take: salary - tax };
  },
};

const MY = {
  bands: [[35000, 0], [100000, 0.03], [Infinity, 0.08]],
  take(salary, epfPct) {
    const epf = salary * epfPct / 100;
    const taxable = Math.max(0, salary * 12 - epf * 12 - 9000);
    const tax = bracketTax(taxable, this.bands);
    return { epf, taxable, tax, take: salary - epf - tax / 12 };
  },
};

const HK = {
  bands: [[50000, 0.02], [100000, 0.06], [150000, 0.10], [Infinity, 0.14]],
  take(salary) {
    const mpf = Math.min(salary, 30000) * 0.05;
    const nci = Math.max(0, salary * 12 - mpf * 12 - 132000);
    const progressive = bracketTax(nci, this.bands);
    const tax = Math.min(progressive, nci * 0.15);
    return { mpf, nci, tax, take: salary - mpf - tax / 12 };
  },
};

const UAE = {
  gratuity(basic, years) {
    const daily = (basic * 12) / 365;
    const first5 = Math.min(years, 5);
    const rest = Math.max(0, years - 5);
    const raw = daily * 21 * first5 + daily * 30 * rest;
    const cap = basic * 24;
    return { daily, raw, cap, gratuity: Math.min(raw, cap) };
  },
};

// ---------------- batch #2 (AU/SG/QA/AD/JP) ----------------

describe('australia-take-home-salary (batch #2)', () => {
  it('A$95,000 @ 11.5% super matches the independent model', () => {
    const m = AU.take(95000);
    const out = run('australia-take-home-salary', { salary: 95000, super: 11.5 });
    expectMoney(out, Math.round(m.take / 12 * 100) / 100);
    expectMoney(out, Math.round(m.take));
    expectMoney(out, Math.round(m.tax));
    expectMoney(out, Math.round(m.medicare));
    // super is employer-paid on top, not a deduction: appears once, in extra
    expectMoney(out, Math.round(95000 * 0.115));
    expect(m.tax).toBe(19288); expect(m.take).toBe(73812);
  });
});

describe('singapore-take-home-salary (batch #2)', () => {
  it('S$6,500 citizen: CPF 20% under cap', () => {
    const out = run('singapore-take-home-salary', { salary: 6500, status: 'PR/Citizen (CPF)' });
    expectMoney(out, 6500 - 6500 * 0.20);
    expectMoney(out, 1300);
  });
  it('S$8,000 citizen: CPF capped at S$1,480', () => {
    const out = run('singapore-take-home-salary', { salary: 8000, status: 'PR/Citizen (CPF)' });
    expectMoney(out, 1480);
    expectMoney(out, 8000 - 1480);
  });
  it('foreigner pays no CPF', () => {
    const out = run('singapore-take-home-salary', { salary: 6500, status: 'Foreigner (no CPF)' });
    expectMoney(out, 6500);
  });
});

describe('qatar-take-home-salary (batch #2)', () => {
  it('zero income tax: take-home = basic + allowances', () => {
    const out = run('qatar-take-home-salary', { basic: 9000, allow: 2500 });
    expectMoney(out, 11500);
    expectMoney(out, 11500 * 12);
  });
});

describe('abuDhabi-cost-living (batch #2)', () => {
  it('surplus = salary - fixed - 20% discretionary', () => {
    const out = run('abuDhabi-cost-living', { salary: 16000, rent: 55000, school: 24000, transport: 900, utilities: 700 });
    const fixed = (55000 + 24000) / 12 + 900 + 700;
    const surplus = 16000 - fixed - 16000 * 0.2;
    expectMoney(out, Math.round(surplus * 100) / 100);
  });
});

describe('japan-take-home-salary (batch #2)', () => {
  it('¥6,000,000 matches the independent model', () => {
    const m = JP.take(6000000);
    expect(m.itax).toBe(556500);
    expect(m.national).toBe(302000);
    const out = run('japan-take-home-salary', { salary: 6000000 });
    expectMoney(out, Math.round(m.take / 12));
    expectMoney(out, Math.round(m.take));
    expectMoney(out, Math.round(m.itax));
    expectMoney(out, Math.round(m.national));
    expectMoney(out, Math.round(m.shakai));
  });
});

// ---------------- batch #3 (CH/NL/MY/HK/UAE-gratuity) ----------------

describe('switzerland-take-home-salary (batch #3)', () => {
  it('CHF 90,000 average canton matches the model', () => {
    const m = CH.take(90000, 'avg');
    expect(m.tax).toBe(11475);
    const out = run('switzerland-take-home-salary', { salary: 90000, cantonal: 'Average (ZH)' });
    expectMoney(out, Math.round(m.take / 12));
    expectMoney(out, Math.round(m.take));
    expectMoney(out, Math.round(m.social));
    expectMoney(out, Math.round(m.tax));
  });
  it('canton levels move the tax block both ways', () => {
    const low = run('switzerland-take-home-salary', { salary: 90000, cantonal: 'Low (ZG/SZ)' });
    const high = run('switzerland-take-home-salary', { salary: 90000, cantonal: 'High (GE/VD)' });
    const mL = CH.take(90000, 'low');
    const mH = CH.take(90000, 'high');
    expectMoney(low, Math.round(mL.take));
    expectMoney(high, Math.round(mH.take));
    expect(mL.take).toBeGreaterThan(mH.take);
  });
});

describe('netherlands-take-home-salary (batch #3)', () => {
  it('€50,000 without ruling matches the model', () => {
    const m = NL.take(50000, false);
    const out = run('netherlands-take-home-salary', { salary: 50000, ruling: 'No' });
    expectMoney(out, Math.round(m.take));
    expectMoney(out, Math.round(m.take / 12));
    expectMoney(out, Math.round(m.tax));
  });
  it('30% ruling taxes only 70% and raises the net', () => {
    const noR = run('netherlands-take-home-salary', { salary: 50000, ruling: 'No' });
    const withR = run('netherlands-take-home-salary', { salary: 50000, ruling: 'Yes' });
    const m = NL.take(50000, true);
    expectMoney(withR, Math.round(m.take));
    expectMoney(withR, Math.round(m.take / 12));
    const n = (s) => allNums(s.result)[0];
    expect(n(withR)).toBeGreaterThan(n(noR));
    expect(m.base).toBe(35000);
  });
});

describe('malaysia-take-home-salary (batch #3)', () => {
  it('RM 8,000 @ 11% EPF matches the model', () => {
    const m = MY.take(8000, 11);
    expect(m.taxable).toBe(76440);
    const out = run('malaysia-take-home-salary', { salary: 8000, epf: 11 });
    expectMoney(out, Math.round(m.take * 100) / 100, 0.02);
    expectMoney(out, Math.round(m.tax));
    expectMoney(out, Math.round(m.epf * 12)); // tool prints annual EPF
  });
  it('first RM35,000 taxable is 0% (relief can zero the tax)', () => {
    const out = run('malaysia-take-home-salary', { salary: 4000, epf: 11 });
    const m = MY.take(4000, 11);
    expect(m.tax).toBe(0);
    expectMoney(out, Math.round(m.take * 100) / 100, 0.02);
  });
});

describe('hongkong-take-home-salary (batch #3)', () => {
  it('HK$35,000 matches the model exactly', () => {
    const m = HK.take(35000);
    expect(m.nci).toBe(270000);
    expect(m.tax).toBe(25800);
    const out = run('hongkong-take-home-salary', { salary: 35000 });
    expectMoney(out, Math.round(m.take));
    expectMoney(out, Math.round(m.mpf * 12)); // tool prints annual MPF
    expectMoney(out, Math.round(m.tax));
    expectMoney(out, Math.round(m.take * 12));
  });
  it('MPF cap applies at HK$30,000 relevant income', () => {
    const out = run('hongkong-take-home-salary', { salary: 100000 });
    const m = HK.take(100000);
    expect(m.mpf).toBe(1500);
    expectMoney(out, m.mpf * 12); // tool prints annual MPF
    expectMoney(out, Math.round(m.take));
  });
});

describe('uae-gratuity-calculator (batch #3)', () => {
  it('AED 10,000 basic, 4 years: 21 days/year tier', () => {
    const m = UAE.gratuity(10000, 4);
    const out = run('uae-gratuity-calculator', { basic: 10000, years: 4 });
    expectMoney(out, Math.round(m.gratuity), 2);
    expect(m.gratuity).toBeLessThan(m.cap);
  });
  it('6 years blends 21-day and 30-day tiers', () => {
    const m = UAE.gratuity(10000, 6);
    expect(Math.round(m.gratuity)).toBe(44384);
    const out = run('uae-gratuity-calculator', { basic: 10000, years: 6 });
    expectMoney(out, 44384, 2);
  });
  it('total never exceeds 2 years of wages (cap)', () => {
    const m = UAE.gratuity(10000, 50);
    expect(m.raw).toBeGreaterThan(m.cap);
    const out = run('uae-gratuity-calculator', { basic: 10000, years: 50 });
    expectMoney(out, 240000, 2);
  });
});
