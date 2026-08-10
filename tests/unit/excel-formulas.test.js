// Unit tests for js/excel-formulas.js — copy-pasteable spreadsheet formulas.
// Run: npm run test:unit  (vitest, node environment)
import { describe, it, expect } from 'vitest';
import { EXCEL_FORMULAS, has, build } from '../../js/excel-formulas.js';

// Load real tool data so placeholder names are validated against actual input ids
import finance from '../../js/data/finance.js';
import regional from '../../js/data/regional.js';
import health from '../../js/data/health.js';
import math from '../../js/data/math.js';

const ALL_TOOLS = [...finance, ...regional, ...health, ...math];

describe('ExcelFormulas coverage', () => {
  it('exposes the module API', () => {
    expect(typeof EXCEL_FORMULAS).toBe('object');
    expect(typeof has).toBe('function');
    expect(typeof build).toBe('function');
  });

  it('has formulas for key high-value tools', () => {
    for (const id of ['loan-emi', 'mortgage', 'sip', 'gst-india', 'fd-calculator', 'ppf-calculator', 'home-loan-emi-india', 'tax', 'tip', 'percentage']) {
      expect(has(id), `expected formula for ${id}`).toBe(true);
    }
  });
});

describe('build() substitution', () => {
  it('substitutes every placeholder with the live value', () => {
    const f = build('loan-emi', { rate: 8.5, years: 5, amount: 100000 });
    expect(f).toBe('=PMT(8.5/12/100, 5*12, -100000)');
  });

  it('substitutes nested expressions (mortgage = price - down)', () => {
    const f = build('mortgage', { rate: 6.5, years: 30, amount: 300000, down: 60000 });
    expect(f).toBe('=PMT(6.5/12/100, 30*12, -(300000-60000))');
  });

  it('returns empty string for unknown tool', () => {
    expect(build('does-not-exist', {})).toBe('');
  });

  it('returns formula unchanged when values missing', () => {
    expect(build('loan-emi', {})).toBe('=PMT({rate}/12/100, {years}*12, -{amount})');
  });
});

describe('rate/100 correctness (the critical bug)', () => {
  it('NO formula divides a rate by 12 WITHOUT also dividing by 100', () => {
    // A formula like =FV(12/12, ...) would mean 100% monthly — the bug we fixed.
    for (const [id, entry] of Object.entries(EXCEL_FORMULAS)) {
      const f = entry.formula;
      if (f.includes('{rate}/12') || f.includes('{returnRate}/12')) {
        expect(f, `${id}: rate must be /100 before /12`).toMatch(/100/);
      }
      // Same chain check for any *-rate placeholder ({rate}, {returnRate}…):
      // the PRODUCT of all divisors must be a multiple of 100.
      const rateNames = (f.match(/\{([a-zA-Z]*[rR]ate[a-zA-Z]*)\}(\/[\d.]+)+/g) || []);
      for (const seg of rateNames) {
        const name = seg.match(/\{([^}]+)\}/)[1];
        const divisors = seg.slice(name.length + 2).split('/').slice(1).map(parseFloat);
        const product = divisors.reduce((a, b) => a * b, 1);
        expect(product % 100, `${id}: ${name} divisors ${divisors.join('*')} must total a multiple of 100`).toBe(0);
      }
    }
  });

  it('specific known-good formulas stay correct', () => {
    expect(EXCEL_FORMULAS['loan-emi'].formula).toBe('=PMT({rate}/12/100, {years}*12, -{amount})');
    expect(EXCEL_FORMULAS['sip'].formula).toBe('=FV({returnRate}/12/100, {years}*12, -{monthly})');
    expect(EXCEL_FORMULAS['gst-india'].formula).toBe('={amount}*{gstRate}/100');
  });
});

describe('placeholder ↔ tool input validation', () => {
  it('every placeholder in every formula maps to a real input of that tool', () => {
    for (const [toolId, entry] of Object.entries(EXCEL_FORMULAS)) {
      const tool = ALL_TOOLS.find(t => t.id === toolId);
      // Some formula ids cover tools outside these 4 data files (auto, everyday…)
      // — only validate when the tool is found.
      if (!tool) continue;
      const inputIds = new Set((tool.inputs || []).map(i => i.id));
      const placeholders = entry.formula.match(/\{([a-zA-Z0-9]+)\}/g) || [];
      for (const ph of placeholders) {
        const name = ph.slice(1, -1);
        expect(inputIds.has(name), `${toolId}: placeholder {${name}} not an input of this tool`).toBe(true);
      }
    }
  });
});

describe('formula math sanity (evaluate like a spreadsheet)', () => {
  function evalExpr(expr) {
    // Tiny safe evaluator supporting + - * / ^ ( ) and numbers only —
    // good enough to check our generated formulas produce sane numbers.
    const clean = String(expr).replace(/^=/, '').replace(/\^/g, '**');
    if (/[a-zA-Z{}]/.test(clean.replace(/\*\*/g, ''))) throw new Error('non-numeric token');
    // eslint-disable-next-line no-new-func
    return Function('"use strict";return (' + clean + ');')();
  }

  it('loan-emi formula produces a positive monthly payment ~ $2,051.65', () => {
    const f = build('loan-emi', { rate: 8.5, years: 5, amount: 100000 });
    // PMT(Pv, r, n): extract args: =PMT(8.5/12/100, 5*12, -100000)
    const args = f.replace('=PMT(', '').replace(')', '').split(', ').map(evalExpr);
    const [rMonthly, n, pv] = args;
    const pmt = pv * rMonthly * Math.pow(1 + rMonthly, n) / (Math.pow(1 + rMonthly, n) - 1);
    expect(Math.abs(pmt)).toBeCloseTo(2051.65, 1);
  });

  it('gst-india formula computes 18% of 10000 = 1800', () => {
    expect(evalExpr(build('gst-india', { amount: 10000, gstRate: 18 }))).toBeCloseTo(1800, 2);
  });

  it('percentage formula 25/200*100 = 12.5', () => {
    expect(evalExpr(build('percentage', { part: 25, whole: 200 }))).toBeCloseTo(12.5, 2);
  });
});
