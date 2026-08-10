/**
 * Programmatic-SEO variant quality gate (modifier-mapping).
 *
 * Guards the LONGTAIL list in generate-sitemap.js: every variant URL must
 * actually auto-fill at least one input when the app's applyModifier() runs.
 * A variant that parses an amount but cannot map it to any input is either:
 *   - a misleading page (title claims "$X" while the calc runs on defaults), or
 *   - a thin near-duplicate of the base calculator page.
 *
 * This test mirrors the mapping logic in js/app.js applyModifier() (id-key
 * match first, conservative label fallback, salary annual→hourly conversion,
 * kWh-aware unit title) so a future LONGTAIL addition can never silently
 * reintroduce a zero-effect or misleading variant.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAllTools() {
  const all = {};
  const dir = path.join(__dirname, '..', '..', 'js', 'data');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const mod = require(path.join(dir, f));
    const arr = Array.isArray(mod) ? mod : Object.values(mod).find(Array.isArray);
    if (arr) arr.forEach(t => { all[t.id] = t; });
  }
  return all;
}

function getLONGTAIL() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'generate-sitemap.js'), 'utf8');
  const m = src.match(/const LONGTAIL = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('LONGTAIL constant not found in generate-sitemap.js');
  return eval(m[1]);
}

// Same key lists as js/app.js applyModifier()
const AMOUNT_ID_KEYS = ['amount', 'loan', 'principal', 'price', 'cost', 'salary', 'income', 'investment', 'budget', 'value', 'balance', 'current', 'initial', 'goal', 'gross', 'savings', 'monthly', 'kwh', 'desired'];
const AMOUNT_LABEL_KEYS = ['amount', 'loan', 'principal', 'price', 'cost', 'salary', 'income', 'investment', 'budget', 'value'];
const YEAR_KEYS = ['year', 'term', 'tenure', 'duration'];
const RATE_KEYS = ['rate', 'interest', 'apr', 'percent'];
const LOC_KEYS = ['location', 'state', 'city', 'region', 'country'];

function mapField(inputs, idKeys, labelKeys) {
  if (labelKeys === undefined) labelKeys = idKeys;
  const byId = (inputs || []).find(inp => {
    const id = String(inp.id || '').toLowerCase();
    return idKeys.some(k => id === k || id.indexOf(k) !== -1);
  });
  if (byId) return byId;
  return (inputs || []).find(inp => {
    const words = String(inp.label || '').toLowerCase().split(/[^a-z]+/);
    return labelKeys.some(k => words.indexOf(k) !== -1);
  });
}

function parseModifier(modifier) {
  const parsed = { years: null, months: null, amount: null, rate: null, location: null };
  const segments = String(modifier).toLowerCase().split('-').filter(Boolean);
  segments.forEach(seg => {
    let m;
    if ((m = seg.match(/^(\d+(?:\.\d+)?)(years?|yrs?)$/))) parsed.years = parseFloat(m[1]);
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)months?$/))) parsed.months = parseFloat(m[1]);
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)(k|k-?dollars?|thousand)$/))) parsed.amount = parseFloat(m[1]) * 1000;
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)m$/))) parsed.amount = parseFloat(m[1]) * 1000000;
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)(%|percent|pct)$/))) parsed.rate = parseFloat(m[1]);
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)$/))) {
      if (parseFloat(m[1]) > 100) parsed.amount = parseFloat(m[1]);
      else parsed.years = parseFloat(m[1]);
    }
    else if (/^[a-z]{2,}$/.test(seg)) parsed.location = seg;
  });
  return parsed;
}

function variantEffects(tool, modifier) {
  const p = parseModifier(modifier);
  const inp = tool.inputs || [];
  const fAmt = p.amount !== null ? mapField(inp, AMOUNT_ID_KEYS, AMOUNT_LABEL_KEYS) : null;
  const fYr = p.years !== null ? mapField(inp, YEAR_KEYS) : null;
  const fRate = p.rate !== null ? mapField(inp, RATE_KEYS) : null;
  const fLoc = p.location ? mapField(inp, LOC_KEYS) : null;
  const salaryConv = p.amount !== null && !fAmt &&
    inp.some(i => i.id === 'hourly') && inp.some(i => i.id === 'hours') && inp.some(i => i.id === 'weeks');
  const effects = [];
  if (fAmt) effects.push('amount→' + fAmt.id);
  if (salaryConv) effects.push('amount→hourly(annual conversion)');
  if (fYr) effects.push('years→' + fYr.id);
  if (p.months !== null) effects.push('months');
  if (fRate) effects.push('rate→' + fRate.id);
  if (fLoc) effects.push('location→' + fLoc.id);
  return { p, effects, any: effects.length > 0, amountMapped: !!(fAmt || salaryConv) };
}

describe('programmatic SEO variant mapping', () => {
  const all = loadAllTools();
  const LONGTAIL = getLONGTAIL();

  it('LONGTAIL contains only known tool ids', () => {
    const unknown = LONGTAIL.filter(([, toolId]) => !all[toolId]).map(([, toolId, mod]) => toolId + '/' + mod);
    expect(unknown).toEqual([]);
  });

  it('every variant auto-fills at least one input (no zero-effect pages)', () => {
    const zero = [];
    for (const [, toolId, mod] of LONGTAIL) {
      if (!all[toolId]) continue;
      const { any } = variantEffects(all[toolId], mod);
      if (!any) zero.push(toolId + '/' + mod);
    }
    expect(zero).toEqual([]);
  });

  it('every parseable amount maps to a real input (no misleading $X titles)', () => {
    const unmapped = [];
    for (const [, toolId, mod] of LONGTAIL) {
      if (!all[toolId]) continue;
      const { p, amountMapped } = variantEffects(all[toolId], mod);
      if (p.amount !== null && !amountMapped) unmapped.push(toolId + '/' + mod + ' ($' + p.amount + ' unmapped)');
    }
    expect(unmapped).toEqual([]);
  });

  it('genuinely ambiguous tools (no single amount field) have zero variants', () => {
    const ambiguousTools = ['dividend', 'net-worth-calculator', 'cac', 'generator-size', 'college-cost-planner'];
    const offenders = LONGTAIL.filter(([, toolId]) => ambiguousTools.includes(toolId))
      .map(([, toolId, mod]) => toolId + '/' + mod);
    expect(offenders).toEqual([]);
  });

  it('salary variants convert annual amount to hourly (result = amount)', () => {
    for (const [, toolId, mod] of LONGTAIL.filter(([, t]) => t === 'salary')) {
      const t = all[toolId];
      const { p } = variantEffects(t, mod);
      if (p.amount === null) continue;
      const h = parseFloat(t.inputs.find(i => i.id === 'hours').def || 40);
      const w = parseFloat(t.inputs.find(i => i.id === 'weeks').def || 52);
      const hourly = p.amount / (h * w);
      const annual = hourly * h * w;
      expect(Math.round(annual)).toBe(p.amount);
    }
  });
});
