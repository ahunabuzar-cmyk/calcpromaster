// ============================================================
// Independent QA — content claims vs the calculator's own maths
// ------------------------------------------------------------
// Har wo number jo is batch ke naye sections mein likha gaya hai, yahan
// DOBARA se — aur independent tareeqe se — compute hota hai, phir string ke
// roop mein card mein maujood hona zaroori hai. Yani content aur arithmetic
// ek doosre se alag nahi ho sakte: number badla to test fail.
//
// Covered:
//   · js/tool-enhance.js — home-insurance · fha-loan · pmi-calculator · apy-calculator
//   · guides/business-days.html — start-weekday table + September 2026 count
//   · js/data/finance.js — apy-calculator ka apna calc/steps
//
// Sources for the conventions used (US/Canada rate per $1,000, UK/Australia
// sum-insured, FHA county limits, CMHC/AER naming) are cited in the sections
// themselves; nothing market-rate-ish is asserted here that is not arithmetic.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const require = createRequire(import.meta.url);

// ---- load the enhancement map the same way the SSG does ----
// The file ends with a browser-only injector that touches `document`, so the
// load throws after the map is assigned — same behaviour ssg-pages.cjs relies on.
function loadEnhance() {
  const sandbox = { window: {}, document: undefined, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  try {
    vm.runInContext(readFileSync(join(ROOT, 'js', 'tool-enhance.js'), 'utf8'), sandbox, { filename: 'tool-enhance.js' });
  } catch {
    /* injector threw — the map is already assigned */
  }
  return sandbox.window.TOOL_ENHANCE || {};
}

const ENHANCE = loadEnhance();
const card = (id) => {
  const html = ENHANCE[id];
  expect(html, `tool-enhance.js mein ${id} entry mojood ho`).toBeTruthy();
  return String(html);
};
const plain = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// Money formatting exactly as the cards write it.
const money = (n, dp = 0) => '$' + Number(n).toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

describe('home-insurance card — rate per $1,000 maths', () => {
  const html = card('home-insurance');

  it('worked example: $350,000 at $3.50 per $1,000 = $1,225/year and $102.08/month', () => {
    const annual = 350000 / 1000 * 3.5;
    expect(annual).toBe(1225);
    expect(money(annual)).toBe('$1,225');
    expect(money(annual / 12, 2)).toBe('$102.08');
    expect(plain(html)).toContain('$1,225 per year');
    expect(plain(html)).toContain('$102.08 per month');
  });

  it('every cell of the rate grid is value/1000*rate', () => {
    const rates = [2, 3, 3.5, 5, 7];
    const values = [150000, 250000, 350000, 500000];
    // Card renders the rate column with 2 decimals ($2.00, $3.50 ...) but whole
    // dollars in the value cells.
    for (const r of rates) {
      expect(html, `rate row ${r}`).toContain('<td>' + money(r, 2) + '</td>');
      for (const v of values) {
        expect(html, `cell ${v} @ ${r}`).toContain('<td>' + money(v / 1000 * r) + '</td>');
      }
    }
  });

  it('UK conversion example: 480 / 240 = 2.00 per $1,000', () => {
    expect(480 / 240).toBe(2);
    expect(plain(html)).toContain('\u00a32.00 per $1,000');
  });

  it('quotes a worked example before it asks the reader to trust the rate', () => {
    expect(plain(html)).toMatch(/Worked example:/);
  });
});

describe('fha-loan card — MIP maths', () => {
  const html = card('fha-loan');

  it('upfront MIP 1.75% and annual MIP 0.55% of a $350,000 base loan', () => {
    expect(money(350000 * 0.0175)).toBe('$6,125');
    expect(money(350000 * 0.0055 / 12, 2)).toBe('$160.42');
    expect(plain(html)).toContain('$6,125');
    expect(plain(html)).toContain('$160.42');
  });

  it('every MIP table row is base x rate (upfront) and base x rate / 12 (monthly)', () => {
    for (const base of [200000, 300000, 400000, 500000]) {
      expect(html, `upfront ${base}`).toContain('<td>' + money(base * 0.0175) + '</td>');
      expect(html, `monthly ${base}`).toContain('<td>' + money(base * 0.0055 / 12, 2) + '</td>');
    }
  });

  it('names the USA and keeps the MIP rate national, the limit county-set', () => {
    const t = plain(html);
    expect(t).toMatch(/county/i);
    expect(t).toMatch(/HUD/);
    expect(t).toMatch(/USA/);
    expect(t).toMatch(/same in every state/);
  });
});

describe('pmi-calculator card — PMI maths', () => {
  const html = card('pmi-calculator');

  it('worked example: $400,000 at 0.5% = $166.67/month', () => {
    expect(money(400000 * 0.005 / 12, 2)).toBe('$166.67');
    expect(plain(html)).toContain('$166.67 per month');
  });

  it('every PMI grid cell is loan x rate / 12', () => {
    const rates = [0.003, 0.005, 0.0075, 0.01, 0.015];
    for (const r of rates) {
      for (const loan of [300000, 400000]) {
        expect(html, `${loan} @ ${r}`).toContain('<td>' + money(loan * r / 12, 2) + '</td>');
      }
    }
  });

  it('names the regional equivalents without conflating them', () => {
    const t = plain(html);
    expect(t).toMatch(/USA/);
    expect(t).toMatch(/Canada/);
    expect(t).toMatch(/UK lenders/);
    expect(t).toMatch(/CMHC/);
  });
});

describe('apy-calculator card — APY maths', () => {
  const html = card('apy-calculator');

  it('5% nominal compounded monthly is 5.116% APY, as the card states', () => {
    const apy = (Math.pow(1 + 0.05 / 12, 12) - 1) * 100;
    expect(apy).toBeCloseTo(5.1162, 3);
    expect(plain(html)).toContain(apy.toFixed(3) + '%');
  });

  it('the $10,000 value table: interest is balance x APY, monthly rate is (1+APY)^(1/12)-1', () => {
    for (const a of [3.0, 3.5, 4.0, 4.1, 4.5, 5.0]) {
      const interest = 10000 * a / 100;
      const monthly = (Math.pow(1 + a / 100, 1 / 12) - 1) * 100;
      expect(html, `interest row ${a}%`).toContain('<td>' + money(interest) + '</td>');
      expect(html, `balance row ${a}%`).toContain('<td>' + money(10000 + interest) + '</td>');
      expect(html, `monthly rate row ${a}%`).toContain('<td>' + monthly.toFixed(4) + '%</td>');
    }
  });

  it('the monthly rate column is NOT APY/12 (that would double-count compounding)', () => {
    for (const a of [3.0, 4.0, 5.0]) {
      const naive = a / 12;
      const correct = (Math.pow(1 + a / 100, 1 / 12) - 1) * 100;
      expect(html).not.toContain('<td>' + naive.toFixed(4) + '%</td>');
      expect(html).toContain('<td>' + correct.toFixed(4) + '%</td>');
    }
  });

  it('scaling sentence is arithmetic: 5% APY on $1,000 = $50 and on $100,000 = $5,000', () => {
    expect(1000 * 0.05).toBe(50);
    expect(100000 * 0.05).toBe(5000);
    const t = plain(html);
    expect(t).toContain('$1,000 is $50');
    expect(t).toContain('$100,000 it is $5,000');
  });

  it('names AER as the UK/Ireland label and refuses to treat APR as the same figure', () => {
    const t = plain(html);
    expect(t).toMatch(/AER/);
    expect(t).toMatch(/UK and Ireland/);
    expect(t).toMatch(/APR is not interchangeable with APY/);
  });
});

describe('apy-calculator — the shipped calculator agrees with the card', () => {
  const finance = require(join(ROOT, 'js', 'data', 'finance.js'));
  const tool = (Array.isArray(finance) ? finance : []).find((t) => t && t.id === 'apy-calculator');
  global.Charts = { gauge: () => '<svg></svg>', bar: () => '', donut: () => '', line: () => '', spark: () => '' };

  const run = (values) => {
    const v = {};
    tool.inputs.forEach((i) => { v[i.id] = values[i.id] !== undefined ? values[i.id] : i.def; });
    return tool.calc(v);
  };

  it('exists and defaults to 5% monthly', () => {
    expect(tool, 'apy-calculator registry mein ho').toBeTruthy();
    const d = {};
    tool.inputs.forEach((i) => { d[i.id] = i.def; });
    expect(d.rate).toBe(5);
    expect(String(d.freq)).toBe('12');
    expect(d.principal).toBe(10000);
  });

  it('5% monthly => APY 5.116%, matching the card and the table', () => {
    const out = run({ rate: 5, freq: '12', principal: 10000, years: 1 });
    const apy = (Math.pow(1 + 0.05 / 12, 12) - 1) * 100;
    expect(apy.toFixed(3)).toBe('5.116');
    expect(out.result).toContain('5.116%');
    expect(out.result).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('the 5% APY table row is consistent with the calculator at 1 year', () => {
    // Table says a 5.00% APY yields $500 on $10,000. The NOMINAL rate that
    // produces 5% APY under monthly compounding is 12 x ((1.05)^(1/12) - 1),
    // not the APY itself — feeding it back must land on $10,500.
    const nominal = 12 * (Math.pow(1.05, 1 / 12) - 1) * 100;
    expect(nominal).toBeCloseTo(4.8889, 3);
    const fv = 10000 * Math.pow(1 + nominal / 100 / 12, 12);
    expect(fv).toBeCloseTo(10500, 6);
    const out = run({ rate: nominal, freq: '12', principal: 10000, years: 1 });
    // The tool formats its own output without a thousands separator — assert
    // the string users actually see, not a prettier variant.
    expect(out.extra).toContain('$10500.00');
    expect(out.extra).toContain('Interest: $500.00');
  });

  it('steps() shows the formula the card quotes', () => {
    const steps = tool.steps({ rate: 5, freq: '12', principal: 10000, years: 1 });
    expect(steps.join(' ')).toContain('APY = (1 + r/m)^m');
  });
});

describe('guides/business-days.html — start-weekday table is arithmetic, not memory', () => {
  const html = readFileSync(join(ROOT, 'guides', 'business-days.html'), 'utf8');
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Independent re-implementation of the documented convention: start day is
  // day zero, counting starts the next business day, weekends are skipped.
  function addBusinessDays(startLabel, n) {
    let d = DAYS.indexOf(startLabel);
    if (d < 0) throw new Error('unknown weekday ' + startLabel);
    let left = n;
    while (left > 0) {
      d = (d + 1) % 7;
      if (d !== 0 && d !== 6) left -= 1;
    }
    return DAYS[d];
  }

  it('every row matches the rule for +3, +5 and +10 business days', () => {
    for (const start of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const rowMatch = html.match(new RegExp('<tr><td>' + start + '</td>(.*?)</tr>'));
      expect(rowMatch, `${start} row present`).toBeTruthy();
      const cells = rowMatch[1]
        .split(/<\/td>/)
        .map((c) => c.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      expect(cells.length, `${start} has three answer cells`).toBe(3);
      // Compare the weekday itself; the page adds a parenthetical period hint.
      expect(cells.map((c) => c.split(' ')[0])).toEqual([
        addBusinessDays(start, 3),
        addBusinessDays(start, 5),
        addBusinessDays(start, 10),
      ]);
      expect(cells[1], '+5 hints one week').toContain('(next week)');
      expect(cells[2], '+10 hints two weeks').toContain('(two weeks later)');
    }
  });

  it('has exactly one start-weekday table (no duplicate answer grid)', () => {
    const tables = (html.match(/Counting starts on/g) || []).length;
    expect(tables).toBe(1);
  });

  it('states the two patterns the table implies', () => {
    // 5 and 10 business days land on the same weekday; 3 business days is 3-5 calendar days away.
    for (const start of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      expect(addBusinessDays(start, 5)).toBe(start);
      expect(addBusinessDays(start, 10)).toBe(start);
      const gap = (() => {
        const from = DAYS.indexOf(start);
        let d = from;
        let left = 3;
        let days = 0;
        while (left > 0) { d = (d + 1) % 7; days += 1; if (d !== 0 && d !== 6) left -= 1; }
        return days;
      })();
      expect(gap === 3 || gap === 5).toBe(true);
    }
    expect(plain(html)).toMatch(/5 business days is exactly one week later and 10 is exactly two/);
    expect(plain(html)).toMatch(/3 business days is 3 to 5 calendar days away/);
  });

  it('May 2026 really is 31 days, 21 weekdays and 20 business days after Memorial Day', () => {
    let weekends = 0;
    let weekdays = 0;
    for (let day = 1; day <= 31; day += 1) {
      const dow = new Date(Date.UTC(2026, 4, day)).getUTCDay();
      if (dow === 0 || dow === 6) weekends += 1;
      else weekdays += 1;
    }
    expect(weekdays).toBe(21);
    expect(weekends).toBe(10);
    // Memorial Day = last Monday of May 2026.
    const lastMonday = 31 - ((new Date(Date.UTC(2026, 4, 31)).getUTCDay() + 6) % 7);
    expect(new Date(Date.UTC(2026, 4, lastMonday)).getUTCDay()).toBe(1);
    expect(lastMonday).toBe(25);
    expect(weekdays - 1).toBe(20);
    const t = plain(html);
    expect(t).toContain('21 weekdays');
    expect(t).toContain('20 business days');
    expect(t).toContain('Monday 25 May 2026');
  });

  it('September 2026 really is 30 days with 8 weekend days = 22 business days', () => {
    let weekends = 0;
    let total = 0;
    for (let day = 1; day <= 30; day += 1) {
      const dow = new Date(Date.UTC(2026, 8, day)).getUTCDay();
      total += 1;
      if (dow === 0 || dow === 6) weekends += 1;
    }
    expect(total).toBe(30);
    expect(weekends).toBe(8);
    expect(total - weekends).toBe(22);
    expect(html).toContain('22 business days');
    expect(html).toContain('4 Saturdays + 4 Sundays');
  });

  it('keeps the weekday-only formula visible on the page', () => {
    expect(html).toContain('Business days = calendar days \u2212 weekend days \u2212 holidays');
  });

  it('the holiday example is real arithmetic on named 2026 dates', () => {
    // Independent re-computation: +5 business days from Mon 2026-11-23, with and
    // without the US Thanksgiving holiday on Thu 2026-11-26.
    function addBD(startISO, n, holidays = []) {
      const d = new Date(startISO + 'T00:00:00Z');
      let left = n;
      while (left > 0) {
        d.setUTCDate(d.getUTCDate() + 1);
        const dow = d.getUTCDay();
        const iso = d.toISOString().slice(0, 10);
        if (dow !== 0 && dow !== 6 && !holidays.includes(iso)) left -= 1;
      }
      return d.toISOString().slice(0, 10);
    }
    // Locale-independent label — toLocaleDateString inserts a comma and varies by ICU build.
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const long = (iso) => {
      const d = new Date(iso + 'T00:00:00Z');
      return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    };

    expect(new Date('2026-11-23T00:00:00Z').getUTCDay()).toBe(1); // a Monday
    expect(new Date('2026-11-26T00:00:00Z').getUTCDay()).toBe(4); // Thanksgiving Thursday
    const noHoliday = addBD('2026-11-23', 5);
    const withHoliday = addBD('2026-11-23', 5, ['2026-11-26']);
    expect(long(noHoliday)).toBe('Monday 30 November 2026');
    expect(long(withHoliday)).toBe('Tuesday 1 December 2026');
    // The card writes these exact strings; a wrong date cannot pass.
    expect(plain(html)).toContain('Monday 30 November 2026');
    expect(plain(html)).toContain('Tuesday 1 December 2026');
    expect(addBD('2026-11-23', 10)).toBe('2026-12-07');
    expect(plain(html)).toContain('Monday 7 December 2026');
  });

  it('states the day-zero convention rather than leaving it implied', () => {
    const t = plain(html);
    expect(t).toMatch(/start day is day zero/i);
    expect(t).toMatch(/counting begins the next business day/i);
  });

  it('separates the shipping clock from the contractual clock', () => {
    const t = plain(html);
    expect(t).toMatch(/shipping promise/i);
    expect(t).toMatch(/dispatch date/i);
    expect(t).toMatch(/cut-off/i);
    expect(t).toMatch(/whole day/i);
  });

  it('every <p> in the guide is closed (no invalid HTML from a missing </p>)', () => {
    const opened = (html.match(/<p(\s|>)/g) || []).length;
    const closed = (html.match(/<\/p>/g) || []).length;
    expect(opened).toBeGreaterThan(5);
    expect(closed).toBe(opened);
  });
});

describe('home-insurance card — the inverted (premium \u2192 rate) arithmetic', () => {
  const html = card('home-insurance');
  // Rounding DOWN to the cent is the whole point of the section: rounding to
  // nearest overshoots the ceiling, so max rate = floor(raw * 100) / 100.
  const maxRate = (value, targetMonthly) => Math.floor(((targetMonthly * 12) / (value / 1000)) * 100) / 100;

  it('the worked example really is 1,200 / 350 rounded down', () => {
    expect((100 * 12) / (350000 / 1000)).toBeCloseTo(3.428571, 6);
    expect(maxRate(350000, 100)).toBe(3.42);
    // $3.43 would overshoot: 350 x 3.43 = 1,200.50 a year = $100.04 a month.
    expect(money((350000 / 1000) * 3.43, 2)).toBe('$1,200.50');
    expect(money(((350000 / 1000) * 3.43) / 12, 2)).toBe('$100.04');
    // $3.42 stays under: 350 x 3.42 = 1,197.00 = $99.75 a month.
    expect(money((350000 / 1000) * 3.42, 2)).toBe('$1,197.00');
    expect(money(((350000 / 1000) * 3.42) / 12, 2)).toBe('$99.75');
    const t = plain(html);
    expect(t).toContain('$3.42');
    expect(t).toContain('$1,197.00 a year');
    expect(t).toContain('$99.75 a month');
    expect(t).toContain('$1,200.50 a year');
  });

  it('every cell of the ceiling table is floor(raw) on the calculator\u2019s own formula', () => {
    const cases = [
      [250000, 100, 4.80],
      [350000, 100, 3.42],
      [350000, 150, 5.14],
      [500000, 100, 2.40],
      [500000, 200, 4.80],
    ];
    for (const [value, target, rate] of cases) {
      expect(maxRate(value, target), `rate ${value}/${target}`).toBe(rate);
      const annual = (value / 1000) * rate;
      expect(html, `${value} @ ${rate}`).toContain('<td>' + money(rate, 2) + '</td>');
      expect(html, `annual ${value} @ ${rate}`).toContain('<td>' + money(annual, 2) + ' \u2014 ' + money(annual / 12, 2) + '/mo</td>');
      // the ceiling is met, never exceeded
      expect(annual).toBeLessThanOrEqual(target * 12 + 1e-9);
    }
  });

  it('the deductible break-even is division, and the page says the quotes are illustrative', () => {
    expect(1500 / 120).toBe(12.5);
    const t = plain(html);
    expect(t).toContain('12.5 years');
    expect(t).toMatch(/Extra deductible/);
    expect(t).toMatch(/quotes, not averages/);
  });

  it('states the lead-form-free difference in its own words', () => {
    const t = plain(html);
    expect(t).toMatch(/no address field/);
    expect(t).toMatch(/no lead form/);
  });
});

describe('apy-calculator card — monthly contributions and the APY/APR pair', () => {
  const html = card('apy-calculator');
  const monthlyRate = (apyPct) => Math.pow(1 + apyPct / 100, 1 / 12) - 1;
  // End-of-month deposits: FV = D * ((1+i)^n - 1) / i
  const fv = (deposit, apyPct, months) => {
    const i = monthlyRate(apyPct);
    return deposit * ((Math.pow(1 + i, months) - 1) / i);
  };

  it('the monthly-deposit table matches an independent accumulation', () => {
    const rows = [[3, 12164.12, 164.12, 24693.16, 693.16], [4, 12218.44, 218.44, 24925.62, 925.62], [5, 12272.58, 272.58, 25158.78, 1158.78]];
    for (const [apy, b12, i12, b24, i24] of rows) {
      expect(fv(1000, apy, 12)).toBeCloseTo(b12, 2);
      expect(fv(1000, apy, 24)).toBeCloseTo(b24, 2);
      expect(fv(1000, apy, 12) - 12000).toBeCloseTo(i12, 2);
      expect(fv(1000, apy, 24) - 24000).toBeCloseTo(i24, 2);
      // the card writes these exact strings
      for (const cell of [money(b12, 2), money(i12, 2), money(b24, 2), money(i24, 2)]) {
        expect(html, `apy ${apy}% cell ${cell}`).toContain(cell);
      }
    }
  });

  it('the lump-sum comparison is arithmetic, not a claim', () => {
    const lump = 12000 * 1.05;
    expect(lump).toBe(12600);
    const gap = lump - fv(1000, 5, 12);
    expect(gap).toBeCloseTo(327.42, 2);
    const t = plain(html);
    expect(t).toContain('$12,600.00');
    expect(t).toContain('$327.42');
  });

  it('the APY/APR pair is the same rate in both labels', () => {
    const effectiveFromNominal = (Math.pow(1 + 0.05 / 12, 12) - 1) * 100;
    const nominalForFivePercent = 12 * (Math.pow(1.05, 1 / 12) - 1) * 100;
    expect(effectiveFromNominal).toBeCloseTo(5.116, 3);
    expect(nominalForFivePercent).toBeCloseTo(4.889, 3);
    const t = plain(html);
    expect(t).toContain('5.116% effective');
    expect(t).toContain('4.889% nominal');
    expect(t).toMatch(/AER in the UK and Ireland/);
    expect(t).toMatch(/fees are inside the number/);
    expect(t).toMatch(/promotional APY applies only while the promotion runs/);
  });

  it('says plainly that the calculator itself compounds one balance', () => {
    expect(plain(html)).toMatch(/calculator above compounds a single balance/);
  });
});

describe('bmr-mifflin card — Mifflin-St Jeor arithmetic only', () => {
  const html = card('bmr-mifflin');
  const bmrOf = (w, h, age, sex) => 10 * w + 6.25 * h - 5 * age + (sex === 1 ? 5 : -161);
  const kcal = (n) => money(n).slice(1);

  it('names the equation and shows it, rather than using one silently', () => {
    const t = plain(html);
    expect(t).toMatch(/Mifflin-St Jeor/);
    const maleEquation = '10 × weight (kg) + 6.25 × height (cm) − 5 × age + 5';
    const femaleEquation = '10 × weight (kg) + 6.25 × height (cm) − 5 × age − 161';
    expect(t).toContain(maleEquation);
    expect(t).toContain(femaleEquation);
    expect(t).toMatch(/Harris-Benedict/);
  });

  it('the worked examples are the equation, and the sex gap is 166 kcal', () => {
    const male = bmrOf(80, 180, 40, 1);
    const female = bmrOf(80, 180, 40, 0);
    expect(male).toBe(1730);
    expect(female).toBe(1564);
    // the card quotes the female example at 65 kg / 165 cm instead
    const female2 = bmrOf(65, 165, 40, 0);
    expect(female2).toBe(1320.25);
    expect(female2.toFixed(0)).toBe('1320');
    expect(1730 - 1564).toBe(166);
    const t = plain(html);
    expect(t).toContain('1,730 kcal/day');
    expect(t).toContain('1,320 kcal/day');
    expect(t).toContain('166 kcal gap');
  });

  it('every activity multiplier cell is BMR \u00d7 factor, rounded like the calculator', () => {
    const maleBmr = 1730;
    const femaleBmr = 1320.25;
    const factors = [1.2, 1.375, 1.55, 1.725, 1.9];
    for (const k of factors) {
      expect(html, `male ${k}`).toContain('<td>' + kcal(maleBmr * k) + '</td>');
      expect(html, `female ${k}`).toContain('<td>' + kcal(femaleBmr * k) + '</td>');
    }
    // 1.55 is the calculator default and its output must agree: 1730 x 1.55 = 2681.5 -> 2682
    expect((maleBmr * 1.55).toFixed(0)).toBe('2682');
    expect(html).toContain('<td>1.55</td><td>2,682</td>');
  });

  it('matches the shipped calculator for the male and female defaults', () => {
    const health = require(join(ROOT, 'js', 'data', 'health.js'));
    const tool = (Array.isArray(health) ? health : []).find((t) => t && t.id === 'bmr-mifflin');
    global.Charts = { gauge: () => '<svg></svg>', bar: () => '', donut: () => '', line: () => '', spark: () => '' };
    const run = (vals) => {
      const v = {};
      tool.inputs.forEach((i) => { v[i.id] = vals[i.id] !== undefined ? vals[i.id] : i.def; });
      return tool.calc(v);
    };
    const male = run({ w: 80, h: 180, age: 40, sex: 1 });
    expect(male.result).toBe('BMR: 1730 kcal/day');
    expect(male.extra).toContain('2682');
    const female = run({ w: 65, h: 165, age: 40, sex: 0 });
    expect(female.result).toBe('BMR: 1320 kcal/day');
    expect(female.extra).toContain('2046');
  });

  it('refuses the clinical questions instead of answering them', () => {
    const t = plain(html);
    expect(t).toMatch(/does not diagnose anything/);
    expect(t).toMatch(/does not say how much anyone should eat/);
    // No dosing, no condition-specific calorie advice, no "good BMR" grading.
    for (const bannedWord of ['you should eat', 'recommended intake', 'good bmr', 'will cure']) {
      expect(t.toLowerCase(), bannedWord).not.toContain(bannedWord);
    }
    // and the pages it links to must be health tools, not marketing
    expect(html).toMatch(/href="\/health\/[a-z-]+\/"/);
  });
});

// ============================================================
// 2026-10-17 · twenty-page batch
// Every figure in these new sections is recomputed here from the formula the
// section states, so the copy and the arithmetic cannot drift apart.
// ============================================================
describe('2026-10-17 batch — worked examples match their formulas', () => {
  const t = (id) => plain(card(id));

  it('sit-up bands: 35 is the first Good count, average is 25-34', () => {
    const text = t('situp-test');
    expect(text).toContain('25\u201334');
    expect(text).toContain('35\u201344');
    expect(60 / 35).toBeCloseTo(1.714, 2);
    expect(text).toContain('one every 1.7 seconds');
  });

  it('VO2 max resting-HR and step-test equations', () => {
    expect(15.3 * (220 - 30) / 65).toBeCloseTo(44.7, 1);
    expect(14.7 * (226 - 30) / 65).toBeCloseTo(44.3, 1);
    expect(111.33 - 0.42 * 150).toBeCloseTo(48.3, 1);
    expect(65.81 - 0.1847 * 150).toBeCloseTo(38.1, 1);
    const text = t('vo2max');
    expect(text).toContain('44.7');
    expect(text).toContain('48.3');
  });

  it('Sharpe ratio is excess return over volatility', () => {
    for (const [sd, expected] of [[10, '0.800'], [15, '0.533'], [20, '0.400'], [25, '0.320']]) {
      expect(((12 - 4) / sd).toFixed(3)).toBe(expected);
      expect(t('sharpe-ratio')).toContain(expected);
    }
  });

  it('percentile rank uses half credit for ties', () => {
    const data = [65, 70, 75, 80, 90];
    const pr = (s) => ((data.filter((x) => x < s).length + 0.5 * data.filter((x) => x === s).length) / data.length) * 100;
    expect(pr(75)).toBe(50);
    expect(pr(65)).toBe(10);
    expect(pr(90)).toBe(90);
    expect(t('percentile-rank')).toContain('50.0');
    // rank from percentile: 90th percentile of 200 ≈ 21st
    expect(Math.round((1 - 90 / 100) * 200 + 1)).toBe(21);
  });

  it('anion gap, albumin correction and delta ratio arithmetic', () => {
    expect(140 - (104 + 24)).toBe(12);
    expect(2.5 * (4 - 2)).toBe(5);
    expect(((20 - 12) / (24 - 12))).toBeCloseTo(0.667, 3);
    expect(((16 - 12) / (24 - 20))).toBe(1);
    expect((20 - 12) - (24 - 12)).toBe(-4);
    expect(t('anion-gap')).toContain('0.67');
  });

  it('RMS table is sqrt(mean of squares)', () => {
    const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    expect(rms([3, 4])).toBeCloseTo(3.5355, 4);
    expect(rms([1, 2, 3, 4])).toBeCloseTo(2.7386, 4);
    expect(rms([-3, 4])).toBeCloseTo(3.5355, 4);
    expect(230 / Math.SQRT2).toBeCloseTo(162.63, 2);
    expect(t('rms')).toContain('162.6');
  });

  it('wavelength and de Broglie examples', () => {
    expect(343 / 440).toBeCloseTo(0.7795, 4);
    expect(343 / 1000).toBeCloseTo(0.343, 3);
    const lambda = 6.626e-34 / (9.109e-31 * 1e6);
    expect(lambda).toBeCloseTo(7.274e-10, 13);
    expect(t('wavelength')).toContain('0.7795');
    expect(t('wavelength')).toContain('0.73 nm');
  });

  it('storage total and plan threshold', () => {
    const gb = 10 * 5 + 20 * 3 + 5 + 200 * 0.1;
    expect(gb).toBe(135);
    expect(gb * 1.25).toBe(168.75);
    expect(gb).toBeLessThan(210);
    const text = t('storage-need');
    expect(text).toContain('135 GB');
    expect(text).toContain('200 GB');
  });

  it('cleaning time adds rooms, bathrooms and floors', () => {
    expect(4 * 12 + 2 * 15 + 1200 * 0.02).toBe(102);
    expect(4 * 5 + 2 * 15 + 1200 * 0.02).toBe(74);
    expect(4 * 25 + 2 * 30 + 1200 * 0.02).toBe(184);
    expect(t('cleaning-time')).toContain('102 minutes');
  });

  it('dividend income and the savings balance that matches it', () => {
    expect(100 * 2.5).toBe(250);
    expect(10000 * 0.04).toBe(400);
    expect(250 / 0.04).toBe(6250);
    expect(t('dividend')).toContain('$6,250');
  });

  it('dew point reproduces the Magnus formula at 30 C', () => {
    const dp = (T, RH) => {
      const a = Math.log(RH / 100) + (17.27 * T) / (237.7 + T);
      return (237.7 * a) / (17.27 - a);
    };
    expect(dp(30, 70)).toBeCloseTo(23.9, 1);
    expect(dp(30, 40)).toBeCloseTo(14.9, 1);
    expect(dp(30, 100)).toBeCloseTo(30.0, 1);
    expect(t('dew-point')).toContain('23.9');
  });

  it('serum osmolality = 2Na + glucose/18 + BUN/2.8', () => {
    expect(2 * 140 + 90 / 18 + 14 / 2.8).toBe(290);
    expect(2 * 130 + 90 / 18 + 14 / 2.8).toBe(270);
    expect(2 * 150 + 90 / 18 + 14 / 2.8).toBe(310);
    expect(t('serum-osmolality')).toContain('290 mOsm/kg');
  });

  it('auto fare = base + distance x rate', () => {
    expect(25 + 5 * 12).toBe(85);
    expect(25 + 15 * 12).toBe(205);
    expect(t('auto-fare')).toContain('85');
  });

  it("Winter's formula expected PCO2 band", () => {
    expect(1.5 * 12 + 8).toBe(26);
    expect(1.5 * 24 + 8).toBe(44);
    expect(t('winters-formula')).toContain('24\u201328');
  });

  it('Devine ideal body weight in kg', () => {
    const ibw = (cm, male) => (male ? 50 : 45.5) + 2.3 * (cm / 2.54 - 60);
    expect(ibw(170, true)).toBeCloseTo(65.9, 1);
    expect(ibw(170, false)).toBeCloseTo(61.4, 1);
    expect(ibw(190, true)).toBeCloseTo(84.0, 1);
    expect(t('ideal-body-weight')).toContain('65.9 kg');
  });

  it('bond price is the present value of coupons plus face', () => {
    const price = (y) => {
      let pv = 0;
      for (let n = 1; n <= 10; n++) pv += 50 / Math.pow(1 + y / 100, n);
      return pv + 1000 / Math.pow(1 + y / 100, 10);
    };
    expect(price(4)).toBeCloseTo(1081.11, 2);
    expect(price(5)).toBeCloseTo(1000, 6);
    expect(price(6)).toBeCloseTo(926.40, 2);
    expect(t('bond-price')).toContain('$1,081.11');
  });

  it('keyword density is occurrences over words', () => {
    expect((10 / 1000) * 100).toBe(1);
    expect((30 / 1000) * 100).toBe(3);
    expect(t('keyword-density')).toContain('1.0%');
  });

  it('wall area deducts openings once', () => {
    expect(10 * 3 - 2 - 3).toBe(25);
    expect(25 / 10).toBe(2.5);
    expect(t('wall-area')).toContain('25 m\u00b2');
  });

  it('leap-year rule handles the century cases', () => {
    const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    expect(leap(2024)).toBe(true);
    expect(leap(2026)).toBe(false);
    expect(leap(1900)).toBe(false);
    expect(leap(2000)).toBe(true);
    expect(t('leap-year')).toContain('29 February');
  });

  it('class rank estimate keeps its 0.5 GPA scale', () => {
    const rank = (gpa) => {
      const pct = Math.max(1, Math.round((1 - (gpa - 3.2) / 0.5) * 100));
      return Math.round((pct / 100) * 200);
    };
    expect(rank(3.7)).toBe(2);
    expect(rank(3.45)).toBe(100);
    expect(rank(3.6)).toBe(40);
    expect(t('class-rank')).toContain('rank 2');
  });
});

describe('snow-day card — score is the tool\u2019s own sum', () => {
  const score = (s, t, temp, r) => {
    const snow = Math.min(1, Math.max(0, s) / Math.max(1, t)) * 55;
    const cold = temp <= 20 ? 25 : temp <= 28 ? 15 : temp <= 32 ? 5 : 0;
    const road = r === 'poor' ? 25 : r === 'mixed' ? 15 : 5;
    return Math.round(Math.min(100, snow + cold + road));
  };

  it('defaults score 85 and every table row is the formula', () => {
    expect(score(4, 4, 28, 'mixed')).toBe(85);
    expect(score(3, 4, 30, 'mixed')).toBe(61);
    expect(score(2, 4, 34, 'good')).toBe(33);
    expect(score(6, 4, 22, 'poor')).toBe(95);
    const text = plain(card('snow-day'));
    for (const n of ['85', '61', '33', '95']) expect(text).toMatch(new RegExp(' \\b' + n + '\\b '));
  });

  it('caps the snow component so depth alone cannot reach the top band', () => {
    const snowOnly = Math.min(1, 5 / 4) * 55;
    expect(snowOnly).toBe(55);
    expect(score(5, 4, 40, 'good')).toBe(60);
    expect(plain(card('snow-day'))).toMatch(/capped at 55/);
  });
});
