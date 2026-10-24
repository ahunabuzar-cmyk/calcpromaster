import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { strictCoverage, titleDefect, classifyRow, isGeneric } = require('../../scripts/build-top10-push-list.cjs');

describe('isGeneric', () => {
  it('treats calculator words as saying nothing about the page', () => {
    expect(isGeneric('calculator')).toBe(true);
    expect(isGeneric('calculators')).toBe(true);
    expect(isGeneric('calculated')).toBe(true);
    expect(isGeneric('estimate')).toBe(true);
    expect(isGeneric('the')).toBe(true);
    expect(isGeneric('calc')).toBe(true);
  });

  it('keeps real vocabulary', () => {
    expect(isGeneric('thinset')).toBe(false);
    expect(isGeneric('payroll')).toBe(false);
    expect(isGeneric('whtr')).toBe(false);
  });
});

describe('strictCoverage', () => {
  it('ignores generic query words, so a page is not flattered by "calculator"', () => {
    const entry = { title: 'Tile & Grout Calculator: Area, Bags & Line Width', metaDesc: '', aeo: '' };
    const r = strictCoverage('tile grout calculator', entry);
    expect(r.coverage).toBe(1);
    expect(r.missing).toEqual([]);
  });

  it('reports the distinctive word the copy is missing', () => {
    const entry = { title: 'Tile & Grout Calculator: Area, Bags', metaDesc: '', aeo: '' };
    const r = strictCoverage('thinset calculator', entry);
    expect(r.coverage).toBe(0);
    expect(r.missing).toEqual(['thinset']);
  });

  it('returns null coverage for a query with no distinctive words', () => {
    expect(strictCoverage('calculator', { title: 'x', metaDesc: '', aeo: '' }).coverage).toBeNull();
    expect(strictCoverage('', {}).coverage).toBeNull();
  });

  it('searches the answer block as well as the title', () => {
    const entry = { title: 'Statistics Calculator', metaDesc: '', aeo: '<p>variance and quartile</p>' };
    expect(strictCoverage('variance quartile', entry).coverage).toBe(1);
  });

  it('matches a glued query token against a hyphenated page phrase', () => {
    // GSC returns "inhand salary calculator ireland" for "in-hand pay"; the page
    // already says "In-Hand", so it is not missing the term.
    const entry = { title: 'Ireland Take-Home Salary Calculator: In-Hand Pay', metaDesc: '', aeo: '' };
    const r = strictCoverage('inhand salary calculator ireland', entry);
    expect(r.missing).toEqual([]);
    expect(r.coverage).toBe(1);
  });

  it('still reports a term the copy genuinely lacks', () => {
    const entry = { title: 'Ireland Take-Home Salary Calculator: Net Pay', metaDesc: '', aeo: '' };
    expect(strictCoverage('inhand salary calculator ireland', entry).missing).toEqual(['inhand']);
  });
});

describe('titleDefect', () => {
  it('catches the generator\'s truncated label titles', () => {
    expect(titleDefect('Statistics Calculator: Data')).toMatch(/raw input label/);
    expect(titleDefect('Harmonic Mean: Data')).toMatch(/raw input label/);
    expect(titleDefect('Password Generator: Length')).toMatch(/raw input label/);
    expect(titleDefect('Variance & Standard Deviation: Data')).toMatch(/raw input label/);
  });

  it('catches a mangled initialism and a stray joiner', () => {
    expect(titleDefect('Waist-to-Height Ratio Calculator: Whtr')).toMatch(/initialism/);
    expect(titleDefect('Projectile Motion: Launch Velocity &')).toMatch(/stray joiner/);
  });

  it('catches a collapsed double space', () => {
    expect(titleDefect('Clean vs Dirty Bond Price: Dirty  Price')).toMatch(/double space/);
  });

  it('leaves a complete title alone', () => {
    expect(titleDefect('LED Light Bulb Savings Calculator: Watts & Annual Saving')).toBeNull();
    expect(titleDefect('Saudi Arabia (KSA) Take-Home Salary Calculator: Net Pay')).toBeNull();
    expect(titleDefect('')).toBeNull();
  });
});

describe('classifyRow', () => {
  const base = { titleDefect: null, coverage: 1, missing: [], informational: false };

  it('a title defect outranks everything else', () => {
    expect(classifyRow({ ...base, titleDefect: 'raw input label' }).verdict).toBe('fix-title');
  });

  it('an explanation query is an answer-section job, not a title edit', () => {
    const r = classifyRow({ ...base, coverage: 0.5, missing: ['normal', 'range'], informational: true });
    expect(r.verdict).toBe('answer-section');
  });

  it('a missing real word is a title fix', () => {
    const r = classifyRow({ ...base, coverage: 0.5, missing: ['thinset'] });
    expect(r.verdict).toBe('add-term');
  });

  it('a missing number, brand or shorthand is not a title fix', () => {
    const r = classifyRow({ ...base, coverage: 0.5, missing: ['50000', 'myusfinance'] });
    expect(r.verdict).toBe('not-a-title-fix');
  });

  it('copy that already covers the query is left alone', () => {
    expect(classifyRow({ ...base }).verdict).toBe('already-targets');
  });

  it('a page with no readable query is not treated as a defect', () => {
    expect(classifyRow({ ...base, coverage: null }).verdict).toBe('no-query');
  });

  it('never returns a verdict without a reason to print', () => {
    const rows = [
      { ...base, titleDefect: 'x' },
      { ...base, coverage: null },
      { ...base, coverage: 0.5, missing: ['thinset'] },
      { ...base, coverage: 0.5, missing: ['50000'] },
      { ...base, coverage: 0.5, missing: ['normal'], informational: true },
      { ...base }
    ];
    for (const r of rows) expect(classifyRow(r).why.length).toBeGreaterThan(10);
  });
});
