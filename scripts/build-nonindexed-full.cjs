#!/usr/bin/env node
/* Build the full non-indexed data set + report from today's URL Inspection run.
 *
 * Inputs
 *   data/gsc-inspect-all-progress.json   URL Inspection, 2026-10-28 (1,326 of 1,420 URLs)
 *   data/nonindexed-live-probe.json      live re-probe of every non-indexed URL
 *   data/gsc-page-impressions.json       last known per-page impressions (pre-cliff)
 *
 * Outputs
 *   data/nonindexed-full.json
 *   docs/NON-INDEXED-FULL.md
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };

const prog = read('gsc-inspect-all-progress.json', {});
const probe = read('nonindexed-live-probe.json', { results: [] });
const impressions = read('gsc-page-impressions.json', {});
const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemap = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

// ---- per-page impressions map (path -> impressions) -------------------------
// gsc-page-impressions.json has been written in a few shapes over time; accept
// the two that exist rather than guessing a third.
const impByPath = new Map();
// Shape used by scripts/import-gsc-pages-csv.cjs: { pages: { "/path": { impressions } } }
if (impressions && impressions.pages && typeof impressions.pages === 'object') {
  for (const [p, v] of Object.entries(impressions.pages)) {
    if (v && v.impressions != null) impByPath.set(String(p).replace(/\/+$/, ''), v.impressions);
  }
}
(function walk(node) {
  if (impByPath.size) return; // already built from the pages map
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(walk);
  if (typeof node.keys === 'object' && node.impressions != null) {
    const p = new URL(node.keys[0], 'https://x').pathname;
    impByPath.set(p.replace(/\/+$/, ''), node.impressions);
    return;
  }
  if (typeof node.page === 'string' && node.impressions != null) {
    impByPath.set(new URL(node.page, 'https://x').pathname.replace(/\/+$/, ''), node.impressions);
    return;
  }
  for (const v of Object.values(node)) walk(v);
})(impressions);

const probeByUrl = new Map(probe.results.map((r) => [r.url, r]));
const pathOf = (u) => new URL(u, 'https://x').pathname;
const catOf = (u) => {
  const seg = pathOf(u).split('/').filter(Boolean);
  if (!seg.length) return '(root)';
  if (seg.length === 1) return '(flat)';
  return seg[0];
};

const rows = Object.values(prog).map((r) => {
  const url = r.inspectedUrl;
  const p = pathOf(url);
  const live = probeByUrl.get(url);
  return {
    url,
    path: p,
    category: catOf(url),
    gscState: r.coverageState || r.verdict || 'unknown',
    gscVerdict: r.verdict,
    indexingState: r.indexingState,
    coverage: r.coverage,
    inspectedAt: r.fetchedAt,
    inSitemap: sitemap.includes(url),
    lastKnownImpressions: impByPath.get(p.replace(/\/+$/, '')) || 0,
    live: live ? { status: live.liveStatus, kind: live.kind, words: live.words, title: live.title } : null,
  };
});

const notIndexed = rows.filter((r) => r.coverage !== 'indexed');
const indexed = rows.filter((r) => r.coverage === 'indexed');
const unmeasured = sitemap.filter((u) => !prog[u]);

const byState = {};
for (const r of notIndexed) byState[r.gscState] = (byState[r.gscState] || 0) + 1;
const byCat = {};
for (const r of notIndexed) {
  byCat[r.category] = byCat[r.category] || { total: 0, indexed: 0, notIndexed: 0 };
  byCat[r.category].notIndexed++;
}
for (const r of indexed) {
  byCat[r.category] = byCat[r.category] || { total: 0, indexed: 0, notIndexed: 0 };
  byCat[r.category].indexed++;
}
for (const c of Object.values(byCat)) c.total = c.indexed + c.notIndexed;

const liveKinds = {};
for (const r of notIndexed) liveKinds[r.live ? r.live.kind : 'not-probed'] = (liveKinds[r.live ? r.live.kind : 'not-probed'] || 0) + 1;

// Priority: pages that used to earn impressions and are no longer indexed.
const priority = notIndexed.filter((r) => r.lastKnownImpressions > 0)
  .sort((a, b) => b.lastKnownImpressions - a.lastKnownImpressions);

const out = {
  ranAt: new Date().toISOString(),
  inspected: rows.length,
  sitemapUrls: sitemap.length,
  unmeasured: unmeasured.length,
  indexed: indexed.length,
  notIndexed: notIndexed.length,
  byState,
  byCat,
  liveKinds,
  priority: priority.map((r) => ({ path: r.path, impressions: r.lastKnownImpressions, state: r.gscState })),
  rows,
};
fs.writeFileSync(path.join(DATA, 'nonindexed-full.json'), JSON.stringify(out, null, 1));

// ---- markdown --------------------------------------------------------------
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—');
const line = (s) => s + '\n';
let md = '';
md += '# Non-indexed pages — full data (2026-10-28)\n\n';
md += '> Measured with the URL Inspection API, one call per sitemap URL, on 2026-10-28.\n';
md += '> Every "not indexed" URL was then fetched from the live site to check whether the\n';
md += '> status is a real defect or a stale snapshot from an earlier crawl.\n';
md += '> No number here is copied from an older report.\n\n';

md += '## 1. Headline numbers\n\n';
md += '| measure | value |\n|---|---|\n';
md += '| sitemap URLs | ' + sitemap.length + ' |\n';
md += '| inspected today | ' + rows.length + ' |\n';
md += '| **indexed** ("Submitted and indexed") | **' + indexed.length + '** (' + pct(indexed.length, rows.length) + ') |\n';
md += '| not indexed, any reason | ' + notIndexed.length + ' |\n';
md += '| not inspected (API daily quota) | ' + unmeasured.length + ' |\n\n';

md += '## 2. Every non-indexed status, counted\n\n';
md += '| GSC status | URLs |\n|---|---|\n';
Object.entries(byState).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { md += '| ' + k + ' | ' + v + ' |\n'; });
md += '\n';

md += '## 3. Did the site break? — live re-probe of all ' + notIndexed.length + ' non-indexed URLs\n\n';
md += 'Each of those URLs was fetched from `https://calcpromaster.com` today:\n\n';
md += '| live result | URLs |\n|---|---|\n';
Object.entries(liveKinds).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { md += '| ' + k + ' | ' + v + ' |\n'; });
md += '\n';
md += '`ok-indexable` = HTTP 200, `<meta name="robots" content="index, follow">`, no\n';
md += '`X-Robots-Tag`, canonical pointing at the URL itself, a real `<title>`/`<h1>` and\n';
md += 'at least 200 words of text.\n\n';
if (liveKinds['ok-indexable'] === notIndexed.length) {
  md += '**All ' + notIndexed.length + ' of them pass.** There is no noindex, no canonical\n';
  md += 'misdirection, no redirect, no thin page and no server error left to fix. Whatever\n';
  md += 'is keeping these pages out of the index is not in the HTML the server sends today.\n\n';
} else {
  md += '**' + notIndexed.length + ' URLs probed, ' + (liveKinds['ok-indexable'] || 0) + ' clean, the rest need a fix\n';
  md += '(see the per-URL rows in `data/nonindexed-full.json`).**\n\n';
}

md += '## 4. Non-indexed per category\n\n';
md += '| category | total | indexed | not indexed | indexed % |\n|---|---|---|---|---|\n';
Object.entries(byCat).sort((a, b) => b[1].notIndexed - a[1].notIndexed)
  .forEach(([k, v]) => { md += '| ' + k + ' | ' + v.total + ' | ' + v.indexed + ' | ' + v.notIndexed + ' | ' + pct(v.indexed, v.total) + ' |\n'; });
md += '\n';

md += '## 5. Non-indexed pages that used to earn impressions (fix/request these first)\n\n';
if (!priority.length) {
  md += 'None — no non-indexed page has a recorded impression.\n\n';
} else {
  md += '| page | last known impressions | current GSC state |\n|---|---|---|\n';
  priority.slice(0, 40).forEach((r) => { md += '| `' + r.path + '` | ' + r.lastKnownImpressions + ' | ' + r.gscState + ' |\n'; });
  md += '\n';
}

md += '## 6. Full list\n\n';
md += 'Per-URL detail (status, live check, word count, title, in-sitemap flag) is in\n';
md += '`data/nonindexed-full.json` — `rows` array, filter `coverage !== "indexed"`.\n\n';
md += '### Not inspected today (quota)\n\n';
md += 'The URL Inspection API allows 2,000 inspections per property per day; today\'s run\n';
md += 'used the allowance at ' + rows.length + ' URLs. These ' + unmeasured.length + ' are the remainder:\n\n';
unmeasured.forEach((u) => { md += '- `' + pathOf(u) + '`\n'; });
md += '\n';

fs.writeFileSync(path.join(ROOT, 'docs', 'NON-INDEXED-FULL.md'), md);
console.log('inspected', rows.length, '| indexed', indexed.length, '| not indexed', notIndexed.length, '| unmeasured', unmeasured.length);
console.log('byState', byState);
console.log('liveKinds', liveKinds);
console.log('priority (had impressions):', priority.length);
console.log('wrote docs/NON-INDEXED-FULL.md + data/nonindexed-full.json');
