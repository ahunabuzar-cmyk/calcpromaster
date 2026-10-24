// ============================================================
// Independent known-answer QA — regional tools, batches #5 & #6
// ------------------------------------------------------------
// Covers the 15 regional take-home / income-tax tools that
// shipped in batch #5 (KE/NG/PH/BD/EG) and batch #6
// (BR/MX/VN/ID/TH/CO/CL/PE/PL/RO).
//
// Each test re-implements the tool's documented model
// INDEPENDENTLY (table-driven, no shared code) and asserts the
// tool output matches to the displayed precision (±1 unit on
// integer-rounded money absorbs rounding seams).
// ============================================================
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ---- Browser-global bootstrap ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg };

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
  expect(String(out.result + ' ' + (out.extra || ''))).not.toMatch(/NaN|Infinity|undefined/);
  return out;
}

function expectMoney(out, expected, tol = 2) {
  const nums = allNums(out.result + ' ' + (out.extra || ''));
  const got = closest(nums, expected);
  expect(Math.abs(got - expected)).toBeLessThanOrEqual(tol);
}

// ---------------- independent reference helpers ----------------
// bands: [[upperBound, rate], ...] continuous, expects an Infinity top band.
function bracketTax(amount, bands, lower0 = 0) {
  let tax = 0, lower = lower0;
  for (const [upper, rate] of bands) {
    if (amount > lower) {
      tax += (Math.min(amount, upper) - lower) * rate;
      lower = upper;
    } else break;
  }
  return tax;
}

// ---------------- batch #5 ----------------

const KE = {
  payeBands: [[24000, 0.10], [32333, 0.25], [500000, 0.30], [800000, 0.325], [Infinity, 0.35]],
  monthly(gross) {
    const nssf = 0.06 * gross;            // 6% employee (capped 108,000 base)
    const shif = 0.0275 * gross;
    const levy = 0.015 * gross;
    const taxable = Math.max(0, gross - nssf - shif - levy);
    const paye = Math.max(0, bracketTax(taxable, this.payeBands) - 2400);
    return { paye, nssf, shif, levy, take: gross - paye - nssf - shif - levy };
  },
};

const NG = {
  annualBands: [[800000, 0], [3000000, 0.15], [12000000, 0.18], [25000000, 0.21], [50000000, 0.23], [Infinity, 0.25]],
  monthly(gross) {
    const pension = 0.08 * gross;
    const taxable = gross * 12 - pension * 12;
    const paye = bracketTax(taxable, this.annualBands);
    return { paye, pension, take: gross - paye / 12 - pension };
  },
};

const PH = {
  annualBands: [[250000, 0], [400000, 0.15], [800000, 0.20], [2000000, 0.25], [8000000, 0.30], [Infinity, 0.35]],
  monthly(gross) {
    const sss = Math.min(gross, 35000) * 0.05;
    const philhealth = Math.min(gross, 100000) * 0.025;
    const pagibig = Math.min(gross * 0.02, 200); // cap: 2% of the 10,000 fund salary
    const taxableM = Math.max(0, gross - sss - philhealth - pagibig);
    const annualTax = bracketTax(taxableM * 12, this.annualBands);
    return { sss, philhealth, pagibig, annualTax, take: gross - sss - philhealth - pagibig - annualTax / 12 };
  },
};

const BD = {
  // FY 2025-26 slab WIDTHS after the category threshold: 10/15/20/25/30%
  widths: [[300000, 0.10], [400000, 0.15], [500000, 0.20], [2000000, 0.25], [Infinity, 0.30]],
  threshold: { General: 400000, 'Woman or senior 65+': 450000, 'Physically challenged': 525000, 'War-wounded freedom fighter': 550000 },
  annual(income, category) {
    const thr = this.threshold[category];
    let tax = 0, remaining = income - thr;
    for (const [w, rate] of this.widths) {
      if (remaining <= 0) break;
      const slice = Math.min(remaining, w);
      tax += slice * rate;
      remaining -= slice;
    }
    if (income > thr) tax = Math.max(tax, 5000); // minimum tax
    return { tax };
  },
};

const EG = {
  bands: [[40000, 0], [55000, 0.10], [70000, 0.15], [200000, 0.20], [400000, 0.225], [1200000, 0.25], [Infinity, 0.275]],
  monthly(gross) {
    const si = Math.min(gross, 16700) * 0.11;
    const taxable = Math.max(0, gross * 12 - si * 12 - 20000);
    const tax = bracketTax(taxable, this.bands);
    return { si, tax, take: gross - si - tax / 12 };
  },
};

// ---------------- batch #6 ----------------

const BR = {
  inssBands: [[1621, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]],
  irrf: [
    { upTo: 2428.80, rate: 0, ded: 0 },
    { upTo: 2826.65, rate: 0.075, ded: 182.16 },
    { upTo: 3751.05, rate: 0.15, ded: 394.16 },
    { upTo: 4664.68, rate: 0.225, ded: 675.49 },
    { upTo: Infinity, rate: 0.275, ded: 908.73 },
  ],
  monthly(gross) {
    let inss = 0, lower = 0;
    for (const [upper, rate] of this.inssBands) {
      if (gross > lower) { inss += (Math.min(gross, upper) - lower) * rate; lower = upper; } else break;
    }
    inss = Math.min(inss, 988.09);
    const base = gross - inss;
    const row = this.irrf.find((r) => base <= r.upTo);
    const irrf = Math.max(0, base * row.rate - row.ded);
    return { inss, irrf, take: gross - inss - irrf };
  },
};

const MX = {
  rows: [
    [0.01, 844.59, 0, 0.0192], [844.60, 7168.51, 16.22, 0.064], [7168.52, 12598.02, 420.95, 0.1088],
    [12598.03, 14644.64, 1011.68, 0.16], [14644.65, 17533.64, 1339.14, 0.1792], [17533.65, 35362.83, 1856.84, 0.2136],
    [35362.84, 55736.68, 5665.16, 0.2352], [55736.69, 106410.50, 10457.09, 0.30], [106410.51, 141880.66, 25659.23, 0.32],
    [141880.67, 425641.99, 37009.69, 0.34], [425642.00, Infinity, 133488.54, 0.35],
  ],
  monthly(gross) {
    const r = this.rows.find((x) => gross >= x[0] && gross <= x[1]);
    const isr = r[2] + (gross - r[0]) * r[3];
    return { isr, take: gross - isr };
  },
};

const VN = {
  monthly(gross) {
    const ins = Math.min(gross, 46800000) * 0.105;
    const taxable = Math.max(0, gross - ins - 15500000);
    const pit = bracketTax(taxable, [[10000000, 0.05], [30000000, 0.10], [60000000, 0.20], [100000000, 0.30], [Infinity, 0.35]]);
    return { ins, pit, take: gross - ins - pit };
  },
};

const ID = {
  monthly(gross) {
    const jht = gross * 0.02;
    const jp = Math.min(gross, 10547400) * 0.01;
    const kes = Math.min(gross, 12000000) * 0.01;
    const bpjs = jht + jp + kes;
    const biaya = Math.min(gross * 0.05, 500000);
    const taxable = Math.max(0, gross * 12 - biaya * 12 - (jht + jp) * 12 - 54000000);
    const pph = bracketTax(taxable, [[60000000, 0.05], [250000000, 0.15], [500000000, 0.25], [5000000000, 0.30], [Infinity, 0.35]]);
    return { bpjs, pph, take: gross - bpjs - pph / 12 };
  },
};

const TH = {
  monthly(gross) {
    const sso = Math.min(gross, 17500) * 0.05; // capped at 875
    const expense = Math.min(gross * 12 * 0.5, 100000);
    const taxable = Math.max(0, gross * 12 - expense - 60000 - sso * 12);
    const pit = bracketTax(taxable, [[150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15], [1000000, 0.20], [3000000, 0.25], [5000000, 0.30], [Infinity, 0.35]]);
    return { sso, pit, take: gross - sso - pit / 12 };
  },
};

const CO = {
  uvt: 52374,
  monthly(gross) {
    const aportes = gross * 0.08;
    const base = (gross - aportes) * 0.75;
    const u = base / this.uvt;
    const wh = (Math.min(Math.max(u - 95, 0), 55) * 0.19
      + Math.min(Math.max(u - 150, 0), 210) * 0.28
      + Math.min(Math.max(u - 360, 0), 280) * 0.33
      + Math.min(Math.max(u - 640, 0), 305) * 0.35
      + Math.min(Math.max(u - 945, 0), 1355) * 0.37
      + Math.max(u - 2300, 0) * 0.39) * this.uvt;
    return { aportes, wh, take: gross - aportes - wh };
  },
};

const CL = {
  utm: 71506,
  monthly(gross) {
    const afp = gross * 0.10, salud = gross * 0.07, ces = gross * 0.006;
    const bu = (gross - afp - salud - ces) / this.utm;
    const tax = Math.max(0, (bu <= 13.5 ? 0
      : bu <= 30 ? bu * 0.04 - 0.54
      : bu <= 50 ? bu * 0.08 - 1.74
      : bu <= 70 ? bu * 0.135 - 4.49
      : bu <= 90 ? bu * 0.23 - 11.14
      : bu <= 120 ? bu * 0.304 - 17.8
      : bu <= 150 ? bu * 0.35 - 23.32
      : bu * 0.40 - 30.82) * this.utm);
    return { afp, salud, ces, tax, take: gross - afp - salud - ces - tax };
  },
};

const PE = {
  uit: 5350,
  monthly(gross) {
    const onp = gross * 0.13;
    const taxable = Math.max(0, gross * 12 - 7 * this.uit);
    const tu = taxable / this.uit;
    const tax = (Math.min(tu, 5) * 0.08
      + Math.min(Math.max(tu - 5, 0), 15) * 0.14
      + Math.min(Math.max(tu - 20, 0), 15) * 0.17
      + Math.min(Math.max(tu - 35, 0), 10) * 0.20
      + Math.max(tu - 45, 0) * 0.30) * this.uit;
    return { onp, tax, take: gross - onp - tax / 12 };
  },
};

const PL = {
  monthly(gross) {
    const zus = gross * 0.1371;
    const health = (gross - zus) * 0.09;
    const pit = Math.max(0, (gross - zus - 300) * 0.12 - 300);
    return { zus, health, pit, take: gross - zus - health - pit };
  },
};

const RO = {
  monthly(gross) {
    const cas = gross * 0.25;
    const cass = gross * 0.10;
    const tax = (gross - cas - cass) * 0.10;
    return { cas, cass, tax, take: gross - cas - cass - tax };
  },
};

// ---------------- tests ----------------

describe('batch #5 regional — independent known answers', () => {
  it('Kenya 100,000/mo: PAYE 19,308, take-home KSh 70,442', () => {
    const ref = KE.monthly(100000);
    expect(ref.paye).toBeCloseTo(19308, 0);
    const out = run('kenya-take-home-salary', { salary: 100000 });
    expectMoney(out, Math.round(ref.take));
    expectMoney(out, ref.paye);
  });

  it('Nigeria 500,000/mo: PAYE 783,600/yr, take-home NGN 394,700', () => {
    const ref = NG.monthly(500000);
    expect(ref.paye).toBeCloseTo(783600, 0);
    expect(ref.take).toBeCloseTo(394700, 0);
    const out = run('nigeria-take-home-salary', { salary: 500000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Philippines 50,000/mo: annual tax 54,820, take-home PHP 42,232', () => {
    const ref = PH.monthly(50000);
    expect(ref.annualTax).toBeCloseTo(54820, 0);
    expect(ref.sss).toBeCloseTo(1750, 0);
    expect(ref.pagibig).toBeCloseTo(200, 0);
    const out = run('philippines-take-home-salary', { salary: 50000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Bangladesh 1,200,000/yr General: slabs 10/15/20 → tax BDT 110,000', () => {
    const ref = BD.annual(1200000, 'General');
    expect(ref.tax).toBeCloseTo(110000, 0);
    const out = run('bangladesh-income-tax', { income: 1200000, category: 'General' });
    expectMoney(out, ref.tax);
  });

  it('Egypt 30,000/mo: SI 1,837, tax 56,290/yr, take-home EGP 23,472', () => {
    const ref = EG.monthly(30000);
    expect(ref.si).toBeCloseTo(1837, 0);
    expect(ref.tax).toBeCloseTo(56290, 0);
    const out = run('egypt-take-home-salary', { salary: 30000 });
    expectMoney(out, Math.round(ref.take));
  });
});

describe('batch #6 regional — independent known answers', () => {
  it('Brazil 8,000/mo: INSS 922, IRRF 1,038, take-home BRL 6,041', () => {
    const ref = BR.monthly(8000);
    expect(ref.inss).toBeCloseTo(922, 0);
    expect(ref.irrf).toBeCloseTo(1038, 0);
    const out = run('brazil-take-home-salary', { salary: 8000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Mexico 25,000/mo taxable: ISR 3,452, net MXN 21,548', () => {
    const ref = MX.monthly(25000);
    expect(ref.isr).toBeCloseTo(3452, 0);
    expect(ref.take).toBeCloseTo(21548, 0);
    const out = run('mexico-isr-salary', { salary: 25000 });
    expectMoney(out, Math.round(ref.take));
    expectMoney(out, Math.round(ref.isr));
  });

  it('Vietnam 30,000,000/mo: insurance 3,150,000, PIT 635,000, net VND 26,215,000', () => {
    const ref = VN.monthly(30000000);
    expect(ref.ins).toBeCloseTo(3150000, 0);
    expect(ref.pit).toBeCloseTo(635000, 0);
    const out = run('vietnam-take-home-salary', { salary: 30000000 });
    expectMoney(out, ref.take);
  });

  it('Indonesia 10,000,000/mo: BPJS 400,000, PPh21 2,820,000/yr, net IDR 9,365,000', () => {
    const ref = ID.monthly(10000000);
    expect(ref.bpjs).toBeCloseTo(400000, 0);
    expect(ref.pph).toBeCloseTo(2820000, 0);
    const out = run('indonesia-take-home-salary', { salary: 10000000 });
    expectMoney(out, ref.take);
  });

  it('Thailand 40,000/mo: SSO 875, PIT 8,450/yr, net THB 38,421', () => {
    const ref = TH.monthly(40000);
    expect(ref.sso).toBeCloseTo(875, 0);
    expect(ref.pit).toBeCloseTo(8450, 0);
    const out = run('thailand-take-home-salary', { salary: 40000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Colombia 12,000,000/mo: aportes 960,000, withholding 666,000, net COP 10,374,000', () => {
    const ref = CO.monthly(12000000);
    expect(ref.aportes).toBeCloseTo(960000, 0);
    expect(ref.wh).toBeCloseTo(666000, 0);
    const out = run('colombia-take-home-salary', { salary: 12000000 });
    expectMoney(out, ref.take);
  });

  it('Chile 1,500,000/mo: AFP 150,000, health 105,000, tax 10,827, net CLP 1,225,173', () => {
    const ref = CL.monthly(1500000);
    expect(ref.afp).toBeCloseTo(150000, 0);
    expect(ref.salud).toBeCloseTo(105000, 0);
    expect(ref.tax).toBeCloseTo(10827, 0);
    const out = run('chile-take-home-salary', { salary: 1500000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Peru 5,000/mo: ONP 650, annual tax 1,804, net PEN 4,200', () => {
    const ref = PE.monthly(5000);
    expect(ref.onp).toBeCloseTo(650, 0);
    expect(ref.tax).toBeCloseTo(1804, 0);
    const out = run('peru-take-home-salary', { salary: 5000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Poland 8,000/mo: ZUS 1,097, health 621, PIT 492, net PLN 5,790', () => {
    const ref = PL.monthly(8000);
    expect(ref.zus).toBeCloseTo(1097, 0);
    expect(ref.pit).toBeCloseTo(492, 0);
    const out = run('poland-take-home-salary', { salary: 8000 });
    expectMoney(out, Math.round(ref.take));
  });

  it('Romania 8,000/mo: CAS 2,000, CASS 800, tax 520, net RON 4,680', () => {
    const ref = RO.monthly(8000);
    expect(ref.cas).toBeCloseTo(2000, 0);
    expect(ref.tax).toBeCloseTo(520, 0);
    const out = run('romania-take-home-salary', { salary: 8000 });
    expectMoney(out, Math.round(ref.take));
  });
});
