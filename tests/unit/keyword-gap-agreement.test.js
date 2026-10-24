// ============================================================
// Export ↔ analysis agreement for the keyword-gap audit.
//
// The audit reads four committed CSVs (data/keyword-gap/*.csv) and publishes a
// verdict per keyword. Two things used to be uncheckable without re-running the
// classifier against a freshly built site:
//
//   1. that every row of an export was actually classified (a silently dropped
//      row shrinks the denominator and makes coverage look better than it is), and
//   2. that the published numbers (docs/KEYWORD-GAP.md) are the ones in the data
//      (data/keyword-gap.json) rather than a hand-edited copy that drifted.
//
// data/keyword-gap-verdicts.csv exists for (1) — one line per classified
// keyword — and this test is the gate for both. It never re-runs the classifier:
// it only checks that the stored artifacts agree with each other and with the
// exports they claim to describe.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const IN_DIR = path.join(ROOT, 'data', 'keyword-gap');
const VERDICTS = path.join(ROOT, 'data', 'keyword-gap-verdicts.csv');
// The 88-row keyword-volume/difficulty export: the deliverable whose rows the
// owner asked to be able to trace into the analysis.
const EXPORT = path.join(IN_DIR, 'keyword-volume-difficulty.csv');
const VERDICT_SET = ['COVERED', 'WEAK', 'GAP', 'IGNORE'];

function parseCsv(text) {
  const rows = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < rawLine.length; i++) {
      const c = rawLine[i];
      if (q) {
        if (c === '"' && rawLine[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'keyword-gap.json'), 'utf8'));
const verdictRows = parseCsv(fs.readFileSync(VERDICTS, 'utf8'));
const verdictHeader = verdictRows[0];
const verdicts = verdictRows.slice(1).map((r) => ({
  keyword: r[0], verdict: r[1], page: r[2], source: r[3], volume: Number(r[4]), difficulty: Number(r[5])
}));
const exportRows = parseCsv(fs.readFileSync(EXPORT, 'utf8')).slice(1).filter((r) => r[0]);
const doc = fs.readFileSync(path.join(ROOT, 'docs', 'KEYWORD-GAP.md'), 'utf8');

const countBy = (list, key) => list.reduce((acc, r) => { acc[r[key]] = (acc[r[key]] || 0) + 1; return acc; }, {});
const verdictCounts = countBy(verdicts, 'verdict');
const exportCounts = countBy(
  exportRows.map((r) => ({ verdict: (verdicts.find((v) => v.keyword === r[0].toLowerCase()) || {}).verdict || 'MISSING' })),
  'verdict'
);

describe('keyword-gap: stored artifacts', () => {
  it('publishes the per-keyword verdict file with one line per classified keyword', () => {
    expect(verdictHeader).toEqual(['keyword', 'verdict', 'page', 'source', 'volume', 'difficulty']);
    expect(verdicts.length).toBe(report.keywords);
    expect(new Set(verdicts.map((v) => v.keyword)).size).toBe(verdicts.length);
    for (const v of verdicts) expect(VERDICT_SET).toContain(v.verdict);
  });

  it('reconciles the unique keyword count with the raw input rows', () => {
    // 608 export rows → 604 unique keywords, i.e. exactly the duplicates listed.
    expect(report.inputRows - report.keywords).toBe(report.duplicateKeywords.length);
    const sourceRows = Object.values(report.bySource).reduce((a, b) => a + b.rows, 0);
    const perKeywordSources = verdicts.reduce((a, v) => a + String(v.source || '').split('+').filter(Boolean).length, 0);
    expect(sourceRows).toBe(perKeywordSources);
  });

  it('agrees with itself: verdict counts, JSON counts and the verdict file', () => {
    const ordered = VERDICT_SET.reduce((a, k) => { a[k] = verdictCounts[k] || 0; return a; }, {});
    expect(ordered).toEqual(report.counts);
    expect(Object.values(report.counts).reduce((a, b) => a + b, 0)).toBe(report.keywords);
    // The JSON's actionable slices are capped at 200 rows each.
    expect(report.gap.length).toBe(Math.min(report.counts.GAP, 200));
    expect(report.weak.length).toBe(Math.min(report.counts.WEAK, 200));
    for (const g of report.gap) expect(verdicts.find((v) => v.keyword === g.keyword).verdict).toBe('GAP');
    for (const w of report.weak) expect(verdicts.find((v) => v.keyword === w.keyword).verdict).toBe('WEAK');
  });

  it('accounts for every row of the 88-keyword export', () => {
    expect(exportRows.length).toBe(88);
    expect(exportCounts.MISSING).toBeUndefined();
    const declared = report.bySource['keyword-volume-difficulty'];
    expect(declared.rows).toBe(exportRows.length);
    for (const k of VERDICT_SET) expect(exportCounts[k] || 0).toBe(declared[k]);
    // A gap verdict must not come with a page, and a covered/weak one must.
    for (const r of exportRows) {
      const v = verdicts.find((x) => x.keyword === r[0].toLowerCase());
      expect(v.source.split('+')).toContain('keyword-volume-difficulty');
      if (v.verdict === 'GAP') expect(v.page).toBe('');
      else if (v.verdict === 'COVERED' || v.verdict === 'WEAK') expect(v.page).not.toBe('');
    }
  });

  it('keeps the published report in step with the data', () => {
    expect(doc).toContain('| COVERED | ' + report.counts.COVERED + ' |');
    expect(doc).toContain('| WEAK | ' + report.counts.WEAK + ' |');
    expect(doc).toContain('| GAP | ' + report.counts.GAP + ' |');
    expect(doc).toContain(report.pagesIndexed.toLocaleString('en-US') + ' pages');
    // Every keyword listed as a gap in the doc is a gap in the data — and its
    // opportunity column is the documented volume × (100 − difficulty)/100.
    const gapSection = doc.split('## Biggest gaps')[1].split('## Covered but weak')[0];
    const listed = [...gapSection.matchAll(/^\| `([^`]+)` \| ([\d,]+) \| (\d+) \| ([\d,]+) \|/gm)];
    expect(listed.length).toBeGreaterThan(0);
    for (const [, keyword, volume, difficulty, opportunity] of listed) {
      const v = verdicts.find((x) => x.keyword === keyword);
      expect(v, 'doc lists an unclassified keyword: ' + keyword).toBeTruthy();
      expect(v.verdict).toBe('GAP');
      const num = (s) => Number(s.replace(/,/g, ''));
      expect(num(opportunity)).toBe(Math.round((num(volume) * (100 - Math.min(num(difficulty), 100))) / 100));
    }
  });
});
