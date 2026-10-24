// ============================================================
// HOMEPAGE SEED PRESERVATION
// ------------------------------------------------------------
// js/home-tools.js seeds window.ALL_TOOLS with the first tools in registry order
// so the homepage can search and render before any category chunk arrives.
// js/data-loader.js calls window.refreshCalcData() after EVERY chunk, and the
// first version of that function cleared ALL_TOOLS and rebuilt it from
// CALC_DATA alone — so as soon as one chunk finished (the calculator-of-day
// widget pulls one at boot) every other category disappeared from ALL_TOOLS.
// Measured on the built home page 2026-10-17: 68 tools of 1285, and homepage
// search for "mortgage" returned nothing.
//
// This test pins the contract: hydrated categories win, un-hydrated categories
// keep their seed, and a seed never duplicates a real row.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

function bootData() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox;
}

describe('refreshCalcData keeps homepage seeds for un-hydrated categories', () => {
  it('keeps a seed when its category has not loaded', () => {
    const sb = bootData();
    const { window } = sb;
    window.ALL_TOOLS.push({ id: 'loan-emi', name: 'Loan EMI Calculator', cat: 'finance', _seed: true });
    window.TOOL_MAP['loan-emi'] = window.ALL_TOOLS[0];

    window.refreshCalcData();

    expect(window.ALL_TOOLS.map((t) => t.id)).toContain('loan-emi');
    expect(window.TOOL_MAP['loan-emi']).toBeTruthy();
    expect(window.TOTAL_CALCULATORS).toBe(1);
  });

  it('replaces a seed with the real row once its category hydrates', () => {
    const sb = bootData();
    const { window } = sb;
    window.ALL_TOOLS.push({ id: 'bmi', name: 'BMI Calculator', cat: 'health', _seed: true });
    window.TOOL_MAP.bmi = window.ALL_TOOLS[0];

    const real = { id: 'bmi', name: 'BMI Calculator', cat: 'health', calc: () => ({}) };
    window.CALC_DATA.health.tools = [real];
    window.refreshCalcData();

    expect(window.ALL_TOOLS).toHaveLength(1);
    expect(window.ALL_TOOLS[0]).toBe(real);
    expect(window.TOOL_MAP.bmi).toBe(real);
  });

  it('drops every seed of a hydrated category and keeps the other categories', () => {
    const sb = bootData();
    const { window } = sb;
    // Two seeds from a category that hydrates, one from a category that does not.
    [['a', 'math'], ['b', 'math'], ['c', 'conversion']].forEach(([id, cat]) => {
      const seed = { id, name: id, cat, _seed: true };
      window.ALL_TOOLS.push(seed);
      window.TOOL_MAP[id] = seed;
    });
    window.CALC_DATA.math.tools = [{ id: 'b', name: 'B real', cat: 'math' }];
    window.refreshCalcData();

    const ids = window.ALL_TOOLS.map((t) => t.id);
    // math's real array replaces BOTH of its seeds; conversion is untouched.
    expect(ids).toEqual(['b', 'c']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a fully hydrated registry drops every seed', () => {
    const sb = bootData();
    const { window } = sb;
    window.ALL_TOOLS.push({ id: 'x', name: 'X', cat: 'finance', _seed: true });
    window.TOOL_MAP.x = window.ALL_TOOLS[0];
    window.CALC_DATA.finance.tools = [{ id: 'y', name: 'Y', cat: 'finance' }];

    window.refreshCalcData();

    expect(window.ALL_TOOLS.map((t) => t.id)).toEqual(['y']);
  });
});
