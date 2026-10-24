// ============================================================
// Keyword targets (B / C / D) — resolution + applied-improvement contract.
//
// docs/KEYWORD-IMPLEMENTATION-MAP.md decides which page owns each actionable
// keyword, but 70 of the 97 B/C/D rows recorded no target, so "improve the
// existing page" had nothing to act on. scripts/apply-keyword-targets.cjs
// resolves each row (recorded target → reviewed table → strict all-token
// registry match) and answers the keyword with a rendered FAQ on that page.
//
// These tests pin the three things that could silently regress:
//   1. every row is resolved or explicitly recorded as having no owner;
//   2. the owner page really renders the keyword (checked against the built
//      deploy/ HTML a crawler would see, not just the source);
//   3. the generated (question, answer) pairs are unique — the rule
//      tests/unit/seo-qa.test.js enforces across all tools.
// ============================================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const A = require('../../scripts/apply-keyword-targets.cjs');
const R = require('../../scripts/lib/keyword-target-resolver.cjs');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'keyword-target-resolution.json');
const DOC = path.join(ROOT, 'docs', 'KEYWORD-TARGET-RESOLUTION.md');
const MAP = path.join(ROOT, 'data', 'keyword-implementation-map.json');

const report = () => JSON.parse(fs.readFileSync(OUT, 'utf8'));

function builtPage(route) {
  const clean = String(route).replace(/^\/+|\/+$/g, '');
  const candidates = [
    path.join(ROOT, 'deploy', clean, 'index.html'),
    path.join(ROOT, 'deploy', clean + '.html')
  ];
  for (const f of candidates) if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  return null;
}

describe('keyword targets — resolution', () => {
  it('covers every B/C/D row of the map exactly once', () => {
    const rows = report().rows;
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    const expected = map.decisions.filter((d) => ['B', 'C', 'D'].includes(d.code)).map((d) => d.keyword).sort();
    expect(rows.map((r) => r.keyword).sort()).toEqual(expected);
  });

  it('gives every improvable row a target, and every ownerless row a reason', () => {
    for (const r of report().rows) {
      if (r.status === 'NO_OWNER') {
        expect(r.resolvedTarget, r.keyword + ' must have no target').toBeNull();
        expect(typeof r.note, r.keyword + ' needs a reason').toBe('string');
        expect(r.note.length, r.keyword + ' reason too short').toBeGreaterThan(30);
      } else {
        expect(r.resolvedTarget, r.keyword + ' must resolve').toMatch(/^\//);
        expect(r.resolvedTarget, r.keyword + ' route must end in /').toMatch(/\/$/);
      }
    }
  });

  it('points every resolved target at a real tool route in the registry', () => {
    const live = new Set([...R.loadToolRoutes().values()].map(R.normaliseRoute));
    const guides = new Set(['/guides/age/', '/guides/income-tax/', '/guides/cagr/', '/guides/career/',
      '/guides/retirement/', '/guides/baby-cost/', '/guides/compound-interest/']);
    const bad = [];
    for (const r of report().rows) {
      if (!r.resolvedTarget) continue;
      if (live.has(r.resolvedTarget) || guides.has(r.resolvedTarget)) continue;
      bad.push(r.keyword + ' -> ' + r.resolvedTarget);
    }
    expect(bad).toEqual([]);
  });

  // "pricing generator" used to sit in this list: the price-*list* SaaS intent is
  // not ours, but the arithmetic half of the phrase (unit cost -> selling price at
  // a target margin) is exactly /business/pricing/, so the reviewed table now owns
  // it and the row is covered. These two remain genuinely ownerless — a phone's
  // built-in calculator app and a cross-cutting "shows its working" feature are
  // navigational/feature intents with no calculation to own.
  it('records no target for the genuinely ownerless intents', () => {
    const rows = report().rows;
    const ownerless = rows.filter((r) => r.status === 'NO_OWNER').map((r) => r.keyword).sort();
    expect(ownerless).toEqual(['calculator on this phone', 'calculator that shows work']);
  });
});

describe('keyword targets — applied improvements are visible in the build', () => {
  it('renders the keyword question on the owner page for every improved row', () => {
    const missing = [];
    for (const r of report().rows) {
      if (r.status !== 'IMPROVED' && r.status !== 'ALREADY') continue;
      const html = builtPage(r.resolvedTarget);
      if (!html) { missing.push(r.keyword + ' -> ' + r.resolvedTarget + ' (no built page)'); continue; }
      const q = A.questionFor(r.keyword);
      const hasVisible = html.includes('>' + q.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '<')
        || html.includes('>' + q + '<');
      const hasSchema = html.includes(JSON.stringify(q).slice(1, -1));
      if (!hasVisible && !hasSchema) missing.push(r.keyword + ' -> ' + r.resolvedTarget);
    }
    expect(missing).toEqual([]);
  });

  it('keeps the generated (question, answer) pairs unique per tool', () => {
    const seen = new Map();
    const dupes = [];
    for (const r of report().rows) {
      if (r.status !== 'IMPROVED' || !r.tool) continue;
      const key = A.questionFor(r.keyword) + '\u0000' + (r.answer || '');
      if (seen.has(key)) dupes.push(r.keyword);
      seen.set(key, true);
    }
    expect(dupes).toEqual([]);
  });

  it('builds each answer from the tool\'s own registry row (no invented copy)', () => {
    const tools = new Map(R.loadRegistry().map((t) => [t.id, t]));
    for (const r of report().rows) {
      if (r.status !== 'IMPROVED' || !r.answer) continue;
      const tool = tools.get(r.tool);
      if (tool) expect(r.answer, r.keyword + ' answer must name its tool').toContain(tool.name);
    }
  });
});

describe('keyword targets — map + docs agree with the applied result', () => {
  it('marks the implemented rows in the map, not as "still open"', () => {
    const rows = report().rows;
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    const implemented = rows.filter((r) => r.status === 'IMPROVED' || r.status === 'ALREADY').length;
    const open = rows.filter((r) => !['IMPROVED', 'ALREADY', 'NO_OWNER'].includes(r.status)).length;
    expect(open).toBe(0);
    const mapImplemented = map.decisions.filter((d) => /^implemented/.test(d.status)).length;
    expect(mapImplemented).toBe(implemented);
  });

  it('commits the resolution doc with one row per keyword', () => {
    const doc = fs.readFileSync(DOC, 'utf8');
    const rows = report().rows;
    for (const r of rows) expect(doc, r.keyword + ' must appear in the doc').toContain('`' + r.keyword + '`');
  });
});
