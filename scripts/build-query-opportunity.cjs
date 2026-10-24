#!/usr/bin/env node
// ============================================================
// CalcProMaster — Query opportunity ranker (real data, not proxies)
// ------------------------------------------------------------
// Until now, keyword targeting ranked pages by STRUCTURAL proxies:
// page word count, phrase length, phrase modifiers (see
// docs/KEYWORD-DIFFICULTY.md §0, which says so itself). That cannot
// tell you which page Google already shows and nobody clicks.
//
// This script ranks by what actually happened in Search:
//   - data/gsc-query-page.json   (pairs: query → page → clicks/impr/pos)
//   - data/gsc-page-impressions.json (authoritative per-page totals)
//
// It answers three questions with real numbers:
//   1. Which pages sit on page 1 (position ≤ 10) and get ZERO clicks?
//      → snippet / title / answer-first problem, fixable today.
//   2. For each of those, WHICH query brings the impressions?
//      → the exact phrase the title and first paragraph must answer.
//   3. What is the modelled click upside if those impressions converted
//      at a normal page-1 rate? (clearly labelled: a model, not a fact)
//
// Output: data/query-opportunity.json  (+ console ranked list)
// Usage : node scripts/build-query-opportunity.cjs [--min-impr 20] [--top 30]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JOIN = path.join(ROOT, 'data', 'gsc-query-page.json');
const PAGES = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const OUT = path.join(ROOT, 'data', 'query-opportunity.json');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : dflt;
};
const MIN_IMPR = arg('--min-impr', 20);
const TOP = arg('--top', 30);

// ---------- modelled CTR curve (an ASSUMPTION, not measured here) ----------
// Expected click-through by average position band. Used only to size the
// upside; every row also carries its measured impressions/clicks so the real
// numbers stay visible next to the estimate.
const CTR_BANDS = [
  { max: 3, ctr: 0.20 },
  { max: 6, ctr: 0.10 },
  { max: 10, ctr: 0.06 },
  { max: 20, ctr: 0.03 },
  { max: Infinity, ctr: 0.01 }
];

// ---------- pure helpers (unit-tested) ----------

function targetCtr(position) {
  for (const b of CTR_BANDS) if (position <= b.max) return b.ctr;
  return 0.01;
}

// GSC returns pair pages as absolute URLs with a trailing slash while the
// page-level export stores bare paths, so both sides are normalised to the
// same key before joining.
function normPage(u) {
  const raw = String(u || '').split('#')[0].split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  if (raw === '') return '/';
  return raw.replace(/\/+$/, '') || '/';
}

// Pair rows (query → page) grouped by page, queries ranked by impressions.
function groupPairsByPage(pairs) {
  const byPage = {};
  for (const p of pairs || []) {
    if (!p || !p.page) continue;
    const key = normPage(p.page);
    const e = (byPage[key] = byPage[key] || { page: key, pairImpressions: 0, pairClicks: 0, queries: [] });
    e.pairImpressions += p.impressions || 0;
    e.pairClicks += p.clicks || 0;
    e.queries.push({ query: p.query, impressions: p.impressions || 0, clicks: p.clicks || 0, position: p.position || 0 });
  }
  for (const e of Object.values(byPage)) {
    e.queries.sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
  }
  return byPage;
}

// Shape of a page's situation, from measured data only.
function classifyPage({ impressions, clicks, position }, minImpr) {
  const zeroClick = clicks === 0 && impressions >= minImpr;
  if (zeroClick && position <= 10) return 'zero-click page 1';
  if (zeroClick) return 'zero-click deeper';
  if (position <= 10) return 'page 1 shaping';
  if (position <= 20) return 'striking distance';
  return 'deep';
}

// Modelled upside = impressions × (normal band CTR − actual CTR).
function scoreOpportunity({ impressions, clicks, position }) {
  const actual = impressions ? clicks / impressions : 0;
  const gap = Math.max(0, targetCtr(position) - actual);
  return Math.round(impressions * gap);
}

// The page-level export is row-capped (186 pages here) while the pair export
// reaches 564 pages, so the ranker must not silently ignore 378 pages that have
// real impressions. Pages only present in the join get an impression-weighted
// average position from their own pair rows.
function mergePageRows(pageFilePages, pairMap) {
  const rows = {};
  for (const [p, v] of Object.entries(pageFilePages || {})) {
    rows[normPage(p)] = { path: normPage(p), impressions: v.impressions || 0, clicks: v.clicks || 0, position: v.position || 0 };
  }
  for (const [p, g] of Object.entries(pairMap || {})) {
    if (rows[p]) continue;
    let weighted = 0, weight = 0;
    for (const q of g.queries) { weighted += q.position * q.impressions; weight += q.impressions; }
    rows[p] = { path: p, impressions: g.pairImpressions, clicks: g.pairClicks, position: weight ? weighted / weight : 0 };
  }
  return Object.values(rows);
}

function rankPages(pageRows, pairMap, minImpr) {
  const rows = [];
  for (const p of pageRows || []) {
    const g = pairMap[normPage(p.path)] || { queries: [], pairImpressions: 0 };
    const row = {
      path: p.path,
      impressions: p.impressions || 0,
      clicks: p.clicks || 0,
      ctr: p.impressions ? (p.clicks || 0) / p.impressions : 0,
      position: p.position || 0,
      status: classifyPage({ impressions: p.impressions || 0, clicks: p.clicks || 0, position: p.position || 0 }, minImpr),
      upside: scoreOpportunity({ impressions: p.impressions || 0, clicks: p.clicks || 0, position: p.position || 0 }),
      queries: g.queries.slice(0, 8),
      queryCount: g.queries.length
    };
    rows.push(row);
  }
  const rank = { 'zero-click page 1': 0, 'striking distance': 1, 'page 1 shaping': 2, 'zero-click deeper': 3, deep: 4 };
  return rows.sort((a, b) =>
    rank[a.status] - rank[b.status] || b.upside - a.upside || b.impressions - a.impressions || a.path.localeCompare(b.path)
  );
}

function summarize(rows, totals) {
  const by = {};
  for (const r of rows) by[r.status] = (by[r.status] || 0) + 1;
  return {
    pagesWithImpressions: rows.length,
    byStatus: by,
    zeroClickPage1: rows.filter((r) => r.status === 'zero-click page 1').length,
    modelledUpside: rows.reduce((s, r) => s + r.upside, 0),
    propertyTotals: totals || null
  };
}

// ---------- I/O ----------
function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function main() {
  const join = readJson(JOIN, null);
  if (!join || !Array.isArray(join.pairs)) {
    console.error('✖ data/gsc-query-page.json nahi mila — pehle `node scripts/gsc-queries.cjs` chalao.');
    process.exit(1);
  }
  const pageFile = readJson(PAGES, null);
  const pairMap = groupPairsByPage(join.pairs);
  // Authoritative per-page totals where available, plus every page the join
  // reached but the row-capped page export never listed.
  const pageRows = mergePageRows(pageFile && pageFile.pages, pairMap);
  const rows = rankPages(pageRows, pairMap, MIN_IMPR);
  const summary = summarize(rows, join.totals);
  const out = {
    ranAt: new Date().toISOString(),
    window: { days: join.days, startDate: join.startDate, endDate: join.endDate },
    minImpressions: MIN_IMPR,
    ctrModel: CTR_BANDS.map((b) => ({ upToPosition: b.max, assumedCtr: b.ctr })),
    summary,
    rows
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  const band = (a, b) => rows.filter((r) => r.position > a && r.position <= b);
  console.log('==========================================');
  console.log(' QUERY OPPORTUNITY — real GSC data');
  console.log('==========================================');
  console.log('window        : ' + join.startDate + ' → ' + join.endDate + ' (' + join.days + 'd)');
  if (join.totals) console.log('property      : ' + join.totals.impressions + ' impressions, ' + join.totals.clicks + ' clicks, CTR ' + (join.totals.ctr * 100).toFixed(1) + '%, avg pos ' + join.totals.position.toFixed(1));
  console.log('pairs stored  : ' + join.pairs.length + ' (query → page)');
  console.log('pages ranked  : ' + rows.length);
  console.log('');
  console.log('status counts :');
  for (const [k, v] of Object.entries(summary.byStatus).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(4) + '  ' + k);
  console.log('');
  console.log('modelled upside (CTR model, not measured): +' + summary.modelledUpside + ' clicks/period');
  console.log('measured CTR by band:');
  for (const [lo, hi] of [[0, 10], [10, 20], [20, 1e9]]) {
    const r = band(lo, hi);
    const i = r.reduce((s, x) => s + x.impressions, 0), c = r.reduce((s, x) => s + x.clicks, 0);
    console.log('  pos ' + (lo + 1) + '-' + (hi === 1e9 ? '∞' : hi) + ': ' + r.length + ' pages, ' + i + ' impr, ' + c + ' clicks, CTR ' + (i ? ((c / i) * 100).toFixed(2) : '0') + '%');
  }
  console.log('');
  console.log('TOP ' + TOP + ' — fix these first (title + snippet + answer-first paragraph):');
  rows.slice(0, TOP).forEach((r, i) => {
    console.log('  ' + String(i + 1).padStart(3) + '. pos ' + r.position.toFixed(1).padStart(5) + ' impr ' + String(r.impressions).padStart(5) + ' clicks ' + String(r.clicks).padStart(3) + '  ' + r.path + '   [' + r.status + ']');
    if (r.queries[0]) console.log('        top query: "' + r.queries[0].query + '" (impr ' + r.queries[0].impressions + ', pos ' + r.queries[0].position.toFixed(1) + ')');
  });
  console.log('');
  console.log('💾 data/query-opportunity.json  ·  all ' + rows.length + ' rows stored');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { targetCtr, normPage, groupPairsByPage, mergePageRows, classifyPage, scoreOpportunity, rankPages, summarize, CTR_BANDS };
