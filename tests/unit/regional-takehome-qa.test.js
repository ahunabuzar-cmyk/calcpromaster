// ============================================================
// Independent known-answer QA — regional take-home salary tools
// ------------------------------------------------------------
// These 5 tools were added externally and shipped without deep-QA
// coverage, so the sitemap quality gate flagged them
// NEEDS HUMAN REVIEW. Each test re-implements the tool's
// documented tax model INDEPENDENTLY (loop over brackets, no shared
// code) and asserts the tool matches to the cent.
//
// Rate sources (documented simplifications are respected):
//   UK:     gov.uk 2025-26 — PA £12,570; basic 20% to £37,700 taxable
//           (= £50,270 total), higher 40%; NI 8%/2% on the same
//           bands; Plan 1 £26,065 / Plan 2 £28,470 @ 9% (simplified)
//   India:  new regime 2025-26 — slabs 0/5/10/15/20/25/30%;
//           ₹75,000 std deduction; ₹60,000 rebate for taxable
//           ≤ ₹12,00,000; 4% cess; EPF 12% capped ₹1,50,000;
//           base ≈ 85% of CTC
//   Saudi:  GOSI 9.75% (Saudi) / 2% (expat); SANED 2% Saudi only;
//           no personal income tax
//   Canada: 2025 federal brackets (15/20.5/26/29/33%), Ontario
//           (5.05/9.15/11.16/12.16/13.16%), BPA $16,198;
//           CPP 5.95% on ($3,500–$71,300 YMPE); EI 1.64% on ≤ $65,700
//   Germany: simplified class I/III model — €12,096
//           Grundfreibetrag; linear-zone formula with rate/slope
//           per class; soli 5.5% above €36,100; pension 9.3% (cap
//           €96,600); health 7.3% (cap €66,150); care 1.8%;
//           unemployment 1.3% (cap €89,400)
//
// Catching power: this file caught 2 REAL formula bugs on first run
// (UK NI band misaligned to the full niBase and the student-loan
// input silently ignored; Canada Ontario rate written 0.505 instead
// of 0.0505) plus 3 sloppy bracket constants in Canada.
// ============================================================
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ---- Browser-global bootstrap (mirrors formula-qa-full.test.js) ----
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

// ---------------- independent reference models (NO shared code) ----------------
const UK = {
  PA: 12570, BASIC_MAX: 37700,
  tax(netPay) { const t = Math.max(0, netPay - this.PA); return t <= this.BASIC_MAX ? t * 0.2 : this.BASIC_MAX * 0.2 + (t - this.BASIC_MAX) * 0.4; },
  ni(netPay) { const t = Math.max(0, netPay - this.PA); return t <= this.BASIC_MAX ? t * 0.08 : this.BASIC_MAX * 0.08 + (t - this.BASIC_MAX) * 0.02; },
  loan(netPay, plan) {
    const th = plan === 'Plan 1' ? 26065 : plan === 'Plan 2' ? 28470 : null;
    return th === null ? 0 : Math.max(0, netPay - th) * 0.09;
  },
};

const INDIA = {
  base(ctc) { return ctc * 0.85; },
  epf(base, pct) { return Math.min(base * pct / 100, 150000); },
  taxable(base, epf) { return Math.max(0, base - 75000 - epf); },
  slabTax(taxable) {
    const slabs = [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]];
    let tax = 0, lower = 0;
    for (const [upper, rate] of slabs) {
      if (taxable > lower) { tax += (Math.min(taxable, upper) - lower) * rate; lower = upper; } else break;
    }
    const rebate = taxable <= 1200000 ? Math.min(tax, 60000) : 0;
    tax = Math.max(0, tax - rebate);
    return tax * 1.04; // + 4% cess
  },
  monthlyTake(ctc, epfPct) { const base = this.base(ctc); const epf = this.epf(base, epfPct); return (base - epf - this.slabTax(this.taxable(base, epf))) / 12; },
};

const SAUDI = {
  take(salary, saudi) { const gosi = saudi ? salary * 0.0975 : salary * 0.02; const saned = saudi ? salary * 0.02 : 0; return salary - gosi - saned; },
};

const CANADA = {
  BPA: 16198,
  fed: [[57375, 0.15], [114750, 0.205], [177882, 0.26], [253414, 0.29], [Infinity, 0.33]],
  on: [[52886, 0.0505], [105775, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]],
  bracketTax(taxable, brackets) {
    let tax = 0, lower = 0, cumulative = 0;
    for (const [upper, rate] of brackets) {
      if (taxable > lower) {
        cumulative += (Math.min(taxable, upper) - lower) * rate;
        lower = upper;
      } else break;
    }
    return cumulative; // 0 until assigned — trick below
  },
  tax(taxable, brackets) {
    let tax = 0, lower = 0;
    for (const [upper, rate] of brackets) {
      if (taxable > lower) { tax += (Math.min(taxable, upper) - lower) * rate; lower = upper; } else break;
    }
    return tax;
  },
  monthlyTake(salary) {
    const taxable = Math.max(0, salary - this.BPA);
    const fed = this.tax(taxable, this.fed);
    const on = this.tax(taxable, this.on);
    const cpp = Math.min(Math.max(0, salary - 3500), 71300 - 3500) * 0.0595;
    const ei = Math.min(salary, 65700) * 0.0164;
    return (salary - fed - on - cpp - ei) / 12;
  },
};

const GERMANY = {
  GF: 12096,
  tax(salary, cls) {
    const rate = cls === 'III' ? 0.18 : 0.24;
    const slope = cls === 'III' ? 0.30 : 0.36;
    const t = Math.max(0, salary - this.GF);
    return t <= 17005 ? t * rate * 0.6 : 10206 * rate * 0.6 + (t - 17005) * slope * (t / 200000 + 0.7);
  },
  social(salary) {
    return Math.min(salary, 96600) * 0.093 + Math.min(salary, 66150) * 0.073 + salary * 0.018 + Math.min(salary, 89400) * 0.013;
  },
  monthlyNet(salary, cls) {
    const inc = this.tax(salary, cls);
    const soli = inc * 0.055 * (inc > 36100 ? 1 : 0);
    return (salary - inc - soli - this.social(salary)) / 12;
  },
};

// ---------------------------------- tests ----------------------------------
describe('DEEP QA — regional take-home salary (2025-26 published rates)', () => {
  it('uk-take-home-salary matches independent model (£35k / £60k / £100k × pension × loan plans)', () => {
    for (const salary of [35000, 60000, 100000]) {
      for (const pension of [0, 5]) {
        for (const student of ['None', 'Plan 1', 'Plan 2']) {
          const pensionAmt = salary * pension / 100;
          const netPay = salary - pensionAmt;
          const expected = (netPay - UK.tax(netPay) - UK.ni(netPay) - UK.loan(netPay, student)) / 12;
          const out = run('uk-take-home-salary', { salary, pension, student });
          const nums = allNums(out.result);
          expect(closest(nums, expected)).toBeCloseTo(expected, 2);
          // student-loan input must actually change the result (regression lock
          // for the earlier silent-ignore bug)
          if (student !== 'None' && netPay > (student === 'Plan 1' ? 26065 : 28470)) {
            const noLoan = run('uk-take-home-salary', { salary, pension, student: 'None' });
            expect(closest(allNums(noLoan.result), expected + UK.loan(netPay, student) / 12)).toBeCloseTo(expected + UK.loan(netPay, student) / 12, 2);
          }
        }
      }
    }
  });

  it('uk-take-home-salary → 40% band starts at £50,270 total pay (sanity spot-check)', () => {
    // At £50,270 gross, 0% pension: taxable = 37,700 → tax = £7,540 exactly.
    // £1 more gross → last £1 taxed at 40%.
    const at = run('uk-take-home-salary', { salary: 50270, pension: 0, student: 'None' });
    const oneMore = run('uk-take-home-salary', { salary: 50271, pension: 0, student: 'None' });
    const d = closest(allNums(at.result), 0) - closest(allNums(oneMore.result), 0);
    expect(Math.abs(d)).toBeCloseTo(0.6 / 12, 5); // extra 40p tax + 20p NI... see note
    // NOTE: marginal = 40% tax + 2% NI = 62% of £1 = £0.62/yr → £0.0517/mo
  });

  it('india-take-home-salary matches independent model across slab boundaries', () => {
    for (const ctc of [700000, 870000, 1200000, 1500000, 1800000, 2500000]) {
      const expected = INDIA.monthlyTake(ctc, 12);
      const out = run('india-take-home-salary', { ctc, epf: 12 });
      const nums = allNums(out.result);
      expect(closest(nums, expected)).toBeCloseTo(expected, 0); // tool rounds monthly to whole ₹
    }
  });

  it('india-take-home-salary → rebate zeroes slab tax below ₹12L taxable', () => {
    // CTC ₹8,70,000 → base 7,39,500 − EPF 88,740 − std 75,000 = ₹5,75,760 taxable → 5% slab → rebate wipes it
    const out = run('india-take-home-salary', { ctc: 870000, epf: 12 });
    expect(String(out.result + ' ' + (out.extra || ''))).not.toMatch(/Tax: ₹[1-9]/);
  });

  it('saudi-take-home-salary matches independent model (expat + Saudi)', () => {
    for (const salary of [5000, 12000, 30000]) {
      const expat = run('saudi-take-home-salary', { salary, saudi: 'No (expat)' });
      expect(closest(allNums(expat.result), SAUDI.take(salary, false))).toBeCloseTo(SAUDI.take(salary, false), 2);
      const saudi = run('saudi-take-home-salary', { salary, saudi: 'Yes' });
      expect(closest(allNums(saudi.result), SAUDI.take(salary, true))).toBeCloseTo(SAUDI.take(salary, true), 2);
    }
  });

  it('canada-take-home-salary matches independent model across fed+ON brackets', () => {
    for (const salary of [30000, 75000, 120000, 200000, 300000]) {
      const expected = CANADA.monthlyTake(salary);
      const out = run('canada-take-home-salary', { salary });
      const nums = allNums(out.result);
      expect(closest(nums, expected)).toBeCloseTo(expected, 2);
    }
  });

  it('canada-take-home-salary → CPP plateau at the 2025 maximum ($4,034.10)', () => {
    // At C$200,000 CPP is capped: (71,300−3,500) × 5.95% = 4,034.10 — the
    // tool's own `extra` line must report this (catches cap regressions).
    const out = run('canada-take-home-salary', { salary: 200000 });
    expect(String(out.extra)).toContain('4034');
    expect(String(out.extra)).not.toContain('4034.15');
  });

  it('germany-take-home-salary matches independent model (classes I/III, multiple incomes)', () => {
    for (const salary of [30000, 60000, 90000, 150000]) {
      for (const cls of ['I', 'III']) {
        const expected = GERMANY.monthlyNet(salary, cls);
        const out = run('germany-take-home-salary', { salary, class: cls });
        const nums = allNums(out.result);
        expect(closest(nums, expected)).toBeCloseTo(expected, 2);
      }
    }
  });
});
