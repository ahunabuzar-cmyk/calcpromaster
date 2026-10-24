// Guards for the 2,000-keyword opportunity review
// (scripts/analyze-keyword-opportunities.cjs).
//
// These pin the judgements the report leans on, not the script's coverage:
//   1. a "winnable new" row really has no page and no off-core/brand intent;
//   2. a single-acronym query is never presented as a build-now page;
//   3. the report's headline numbers are the ones the data actually produced.
// If any of those flip, the shortlist is wrong and this fails.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.join(process.cwd(), 'data', 'keyword-opportunity-review-2026-10-18.json');
const DOC = path.join(process.cwd(), 'docs', 'KEYWORD-OPPORTUNITY-2026-10-18.md');
const CSV = path.join(process.cwd(), 'data', 'keyword-shortlist-2026-10-18.csv');
const have = [DATA, DOC, CSV].every((f) => fs.existsSync(f));

const data = have ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : null;
const doc = have ? fs.readFileSync(DOC, 'utf8') : '';
const csv = have ? fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(Boolean) : [];

describe.skipIf(!have)('keyword opportunity review / winnable-new gate', () => {
  const winnable = data.rows.filter((r) => r.winnableNew);

  it('reads every row of the export', () => {
    expect(data.rows.length).toBe(2000);
    expect(data.totals.total).toBe(2000);
  });

  it('keeps only tool intent, low difficulty, real volume and no page', () => {
    for (const r of winnable) {
      expect(r.type, r.keyword).toBe('TOOL');
      expect(r.reviewOnly, r.keyword).toBe(false);
      expect(r.difficulty, r.keyword).toBeLessThanOrEqual(25);
      expect(r.volume, r.keyword).toBeGreaterThanOrEqual(1000);
      expect(['NONE'], r.keyword).toContain(r.coverage);
    }
  });

  it('never lets a brand or off-core row into the new-page list', () => {
    const leak = data.rows
      .filter((r) => r.winnableNew && (r.type === 'BRAND' || r.type === 'OFF_CORE'))
      .map((r) => r.keyword);
    expect(leak).toEqual([]);
  });

  it('separates single-acronym queries from build-now queries', () => {
    for (const r of winnable.filter((x) => x.needsSerp)) {
      // "p f t calculator" — a spaced acronym plus the word calculator, nothing
      // else. If a qualifier ever creeps in, the SERP bucket is the wrong home.
      const rest = r.keyword.replace(/\bcalculators?\b/g, '').trim();
      expect(rest.split(/\s+/).filter(Boolean).length, r.keyword).toBeLessThanOrEqual(3);
      expect(r.hint, r.keyword).toBeTruthy();
    }
  });

  it('puts every acronym row in the SERP-check bucket of the shortlist', () => {
    const csvSerp = csv
      .slice(1)
      .map((l) => l.match(/^"([^"]+)","([^"]*)"/))
      .filter((m) => m && m[1] === 'NEW-SERP')
      .map((m) => m[2]);
    const jsonSerp = winnable.filter((r) => r.needsSerp).map((r) => r.keyword);
    expect(csvSerp.length).toBeGreaterThan(0);
    // "p f t" and "pft" are the same query; squash the spaces before matching.
    const squash = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
    const flagged = new Set(jsonSerp.map(squash));
    for (const kw of csvSerp) expect(flagged.has(squash(kw)), kw).toBe(true);
    // Dedupe drops a duplicate row, never the whole bucket.
    expect(csvSerp.length).toBeLessThanOrEqual(jsonSerp.length);
  });
});

describe.skipIf(!have)('keyword opportunity review / report matches data', () => {
  it('states the winnable count it actually found', () => {
    expect(doc).toContain('**' + data.totals.winnableNew + ' rows**');
  });

  it('does not claim the attached file is the 9-lakh export', () => {
    expect(doc).toMatch(/2,000 rows\*\* hai, 9 lakh nahi/);
  });

  it('answers the earlier-targeted question from GSC, not from page existence', () => {
    expect(doc).toContain('## 3b.');
    expect(doc).toMatch(/koi matching query hi nahi/);
  });
});

describe.skipIf(!have)('keyword opportunity review / shortlist csv', () => {
  it('has one header and only known actions', () => {
    expect(csv[0].startsWith('action,keyword,volume')).toBe(true);
    const actions = new Set(csv.slice(1).map((l) => l.match(/^"([^"]*)"/)[1]));
    for (const a of actions) expect(['OPTIMIZE', 'NEW', 'NEW-SERP']).toContain(a);
  });

  it('gives every optimize row a target and a measured position', () => {
    for (const line of csv.slice(1)) {
      const m = line.match(/^"(OPTIMIZE)","([^"]*)","","","","","([^"]*)","([^"]*)","([^"]*)"/);
      if (!m) continue;
      expect(m[3], m[2]).not.toBe('');
      expect(m[5], m[2]).toMatch(/^\//);
    }
  });
});
