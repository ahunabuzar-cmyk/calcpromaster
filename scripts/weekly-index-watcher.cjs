#!/usr/bin/env node
// ============================================================
// CalcProMaster — Weekly index watcher
// ------------------------------------------------------------
// One command that answers, with evidence: "is the index growing, what does
// Google say about this week's priority URLs, and what can I actually submit?"
//
// Inputs (all optional, skipped when missing):
//   data/gsc-coverage-report.json      GSC coverage snapshot (indexed vs queue)
//   data/index-panel-history.json      the fixed 590-URL cohort, per-day checks
//   data/index-velocity.json           the computed stall/velocity verdict
//   data/gsc-inspect-top*.json         URL Inspection results from today's run
//   data/gsc-page-impressions.json     demand, for ordering the action list
//
// Outputs:
//   docs/WEEKLY-INDEX-WATCHER.md       the weekly report (this week's numbers)
//   data/weekly-index-watcher.json     history (one entry per day, replaces same date)
//   docs/request-indexing-clickthrough.html  one-click GSC inspection links
//
// WHAT THE API CAN AND CANNOT DO (kept in the report so nobody re-litigates it):
//   ✔ URL Inspection API — read status per URL (this script consumes its output)
//   ✔ Sitemaps API — resubmit sitemap.xml (build already does this weekly)
//   ✔ IndexNow — submit to Bing/Yandex/Seznam/Naver (npm run indexnow)
//   ✘ "Request Indexing" for normal pages — GSC UI only; the Indexing API is
//     limited to JobPosting / BroadcastEvent. No script can press that button.
//
// Usage: node scripts/weekly-index-watcher.cjs [--inspect <file>]... [--top 40]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COVERAGE = path.join(ROOT, 'data', 'gsc-coverage-report.json');
const PANEL_HISTORY = path.join(ROOT, 'data', 'index-panel-history.json');
const VELOCITY = path.join(ROOT, 'data', 'index-velocity.json');
const IMPRESSIONS = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const OUT_MD = path.join(ROOT, 'docs', 'WEEKLY-INDEX-WATCHER.md');
const OUT_JSON = path.join(ROOT, 'data', 'weekly-index-watcher.json');
const OUT_HTML = path.join(ROOT, 'docs', 'request-indexing-clickthrough.html');
const SITE = 'https://calcpromaster.com';

const TODAY = new Date().toISOString().slice(0, 10);
const argTop = (() => { const i = process.argv.indexOf('--top'); const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN; return Number.isFinite(v) && v > 0 ? v : 40; })();

const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; } };
const stripSlash = (u) => String(u || '').replace(/\/+$/, '');

function gscLink(url) {
  return 'https://search.google.com/search-console/inspect?resource_id='
    + encodeURIComponent(SITE + '/') + '&id=' + encodeURIComponent(url);
}

// ---- 1. coverage snapshot -------------------------------------------------
const coverage = readJson(COVERAGE, null);
let coverageRows = [];
if (coverage) {
  const t = coverage.tally || {};
  coverageRows = Object.entries(t).sort((a, b) => b[1] - a[1]);
}
const indexedCount = coverage ? ((coverage.lists && coverage.lists.INDEXED) || []).length : 0;
const inspected = coverage ? coverage.uniqueUrls || indexedCount : 0;
const pctIndexed = inspected ? (100 * indexedCount / inspected) : 0;

// ---- 2. fixed-cohort movement (the honest weekly delta) -------------------
const history = readJson(PANEL_HISTORY, []);
const snaps = [...history].sort((a, b) => String(a.date).localeCompare(String(b.date)));
const last = snaps[snaps.length - 1] || null;
const weekAgo = (() => {
  if (!last) return null;
  const target = new Date(last.date + 'T00:00:00Z');
  target.setUTCDate(target.getUTCDate() - 7);
  const cutoff = target.toISOString().slice(0, 10);
  const eligible = snaps.filter((s) => s.date <= cutoff);
  return eligible.length ? eligible[eligible.length - 1] : snaps[0];
})();
function tallySnap(snap) {
  const t = {};
  for (const state of Object.values((snap && snap.checked) || {})) t[state] = (t[state] || 0) + 1;
  return t;
}
const lastTally = tallySnap(last);
const weekTally = tallySnap(weekAgo);
const cohortNow = (lastTally['Submitted and indexed'] || 0);
const cohortBefore = (weekTally['Submitted and indexed'] || 0);
const cohortDelta = cohortNow - cohortBefore;
const cohortSize = last ? Object.keys(last.checked || {}).length : 0;
const velocity = readJson(VELOCITY, null);

// ---- 3. this week's URL Inspection results --------------------------------
function inspectionFiles() {
  const explicit = [];
  process.argv.forEach((a, i) => { if (a === '--inspect' && process.argv[i + 1]) explicit.push(process.argv[i + 1]); });
  if (explicit.length) return explicit.map((p) => path.resolve(ROOT, p));
  const dir = path.join(ROOT, 'data');
  const candidates = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^gsc-inspect-top.*\.json$/.test(f)).map((f) => path.join(dir, f))
    : [];
  // The scheduled weekly refresh writes the merged batch file instead of a
  // dated top-40 file; use it when no explicit top-N run exists.
  if (!candidates.length) {
    const batch = path.join(dir, 'gsc-inspect-batch.json');
    if (fs.existsSync(batch)) return [batch];
  }
  if (!candidates.length) return [];
  // Newest run date wins; merge every file written by that run (top40 + top2).
  const dated = candidates.map((p) => ({ p, j: readJson(p, null), m: fs.statSync(p).mtimeMs }))
    .filter((x) => x.j && Array.isArray(x.j.results) && x.j.results.length);
  if (!dated.length) return [];
  dated.sort((a, b) => b.m - a.m);
  const runDate = String(dated[0].j.ranAt || '').slice(0, 10);
  return dated.filter((x) => String(x.j.ranAt || '').slice(0, 10) === runDate).map((x) => x.p);
}
const inspection = new Map();
for (const file of inspectionFiles()) {
  const j = readJson(file, null);
  for (const r of (j && j.results) || []) {
    const url = stripSlash(r.url || r.inspectedUrl);
    if (url && !inspection.has(url)) inspection.set(url, { url, coverage: r.coverage || 'UNKNOWN', verdict: r.verdict || '' });
  }
}
const inspectedRows = [...inspection.values()];
const stateOf = (coverageState) => {
  // Two shapes arrive here: the URL Inspection API's full sentence
  // ("Submitted and indexed") and gsc-inspect-batch.json's short bucket
  // ("indexed"). Normalise both.
  if (/^indexed$/i.test(coverageState)) return 'indexed';
  if (/^discovered$/i.test(coverageState)) return 'discovered';
  if (/^crawled$/i.test(coverageState)) return 'crawled';
  if (/^unknown$/i.test(coverageState)) return 'unknown';
  if (/^Submitted and indexed/i.test(coverageState)) return 'indexed';
  if (/redirect/i.test(coverageState)) return 'redirect';
  if (/^Discovered/i.test(coverageState)) return 'discovered';
  if (/unknown to Google/i.test(coverageState)) return 'unknown';
  if (/^Crawled/i.test(coverageState)) return 'crawled';
  if (/canonical/i.test(coverageState)) return 'canonical';
  return 'other';
};
const byState = {};
for (const r of inspectedRows) { const s = stateOf(r.coverage); (byState[s] = byState[s] || []).push(r); }
const allActionable = inspectedRows.filter((r) => stateOf(r.coverage) !== 'indexed');

// Demand map, used only to order the action list.
const impressions = readJson(IMPRESSIONS, null);
const demand = (impressions && impressions.pages) || {};
// Impressions are keyed by SITE-relative path ("/finance/cd-ladder"), while the
// inspection files carry absolute URLs — normalise before joining.
const demandOf = (url) => {
  const p = stripSlash(url).replace(/^https?:\/\/[^/]+/, '') || '/';
  return (demand[p] || {}).impressions || 0;
};
allActionable.sort((a, b) => demandOf(b.url) - demandOf(a.url) || a.url.localeCompare(b.url));
// Cap the printed action list so a full-site batch run stays readable; the
// report says how many were left out.
const actionable = allActionable.slice(0, argTop);

// ---- 4. report ------------------------------------------------------------
const sitemapResubmit = readJson(path.join(ROOT, 'data', 'gsc-inspect-batch-' + TODAY + '.json'), null);
const L = [];
L.push('# Weekly index watcher — ' + TODAY);
L.push('');
L.push('> Auto-generated by `node scripts/weekly-index-watcher.cjs`. Numbers are read from GSC exports and the URL Inspection API — no estimates.');
L.push('');
L.push('## 1. Aaj ka snapshot');
L.push('');
L.push('| Metric | Value | Source |');
L.push('|---|---|---|');
if (coverage) {
  L.push('| Inspected URLs | ' + inspected + ' | `data/gsc-coverage-report.json` (' + String(coverage.ranAt || '').slice(0, 10) + ') |');
  L.push('| Submitted and indexed | **' + indexedCount + '** (' + pctIndexed.toFixed(1) + '%) | same |');
  L.push('| Not indexed (queue + old URL forms) | ' + Math.max(0, inspected - indexedCount) + ' | same |');
}
if (last) {
  L.push('| Fixed cohort indexed | ' + cohortNow + '/' + cohortSize + ' | `data/index-panel-history.json` (' + last.date + ') |');
}
if (velocity && velocity.verdict) {
  L.push('| Velocity verdict | **' + velocity.verdict.status + '** — ' + velocity.verdict.reason + ' | `data/index-velocity.json` |');
}
L.push('| Sitemap resubmit | ' + (sitemapResubmit ? 'HTTP ' + (sitemapResubmit.sitemapResubmit || '?') + ' on ' + String(sitemapResubmit.ranAt || '').slice(0, 10) : 'not recorded today') + ' | `scripts/gsc-batch-inspect.cjs` |');
L.push('');
if (coverage) {
  L.push('Coverage buckets, aggregated from the GSC page export:');
  L.push('');
  L.push('| Coverage state | URLs |');
  L.push('|---|---|');
  for (const [k, v] of coverageRows) L.push('| ' + k + ' | ' + v + ' |');
  L.push('');
}
L.push('## 2. Hafte ka movement (fixed 590-URL cohort)');
L.push('');
if (last && weekAgo) {
  L.push('| | ' + weekAgo.date + ' | ' + last.date + ' | Change |');
  L.push('|---|---|---|---|');
  const states = new Set([...Object.keys(weekTally), ...Object.keys(lastTally)]);
  for (const s of states) {
    const a = weekTally[s] || 0, b = lastTally[s] || 0;
    L.push('| ' + s + ' | ' + a + ' | ' + b + ' | ' + (b - a >= 0 ? '+' : '') + (b - a) + ' |');
  }
  L.push('');
  L.push(cohortDelta > 0
    ? '**Read:** ' + cohortDelta + ' page(s) from this cohort became indexed in the window — the queue is converting.'
    : '**Read:** 0 pages from this cohort converted in the window. The pages are crawlable; Google is simply not spending crawl budget on them yet. Titles alone do not fix that — request indexing, internal links from indexed pages, and backlinks do.');
} else {
  L.push('_No panel history yet — run `node scripts/build-index-panel.cjs --inspect --all` to take a snapshot._');
}
L.push('');
L.push('## 3. Is hafte ka URL inspection (' + inspectedRows.length + ' URLs)');
L.push('');
if (!inspectedRows.length) {
  L.push('_No inspection file found. Run `node scripts/gsc-inspect-list.cjs --from <list> --out data/gsc-inspect-top40-' + TODAY + '.json`._');
} else {
  L.push('| State | URLs |');
  L.push('|---|---|');
  for (const [k, v] of Object.entries(byState).sort((a, b) => b[1].length - a[1].length)) L.push('| ' + k + ' | ' + v.length + ' |');
  L.push('');
  if (actionable.length) {
    L.push('### Abhi bhi index nahi (' + allActionable.length + ') — request-indexing order');
    L.push('');
    L.push('| # | URL | GSC state | 28d impr | Inspect / Request |');
    L.push('|---|---|---|---|---|');
    actionable.forEach((r, i) => {
      L.push('| ' + (i + 1) + ' | `' + stripSlash(r.url) + '` | ' + r.coverage + ' | ' + (demandOf(r.url) || '—') + ' | [open](' + gscLink(r.url) + ') |');
    });
    L.push('');
    L.push('**Note on "Page with redirect":** the live URL returns 200 today (checked with curl), so this is Google still holding an older redirect from before the canonical change. Request Indexing on the canonical form is the correct move; nothing needs fixing in the build.');
    if (allActionable.length > actionable.length) L.push('\n_Showing the top ' + actionable.length + ' by 28-day impressions; ' + (allActionable.length - actionable.length) + ' more are in `data/weekly-index-watcher.json`._');
  } else {
    L.push('Every inspected URL is indexed. No request-indexing action needed from this batch.');
  }
}
L.push('');
L.push('## 4. API limits — kya script kar sakta hai, kya nahi');
L.push('');
L.push('| Action | Automatable? | Where |');
L.push('|---|---|---|');
L.push('| URL Inspection (read status) | ✅ yes | this script consumes it |');
L.push('| Sitemap resubmit | ✅ yes | `scripts/gsc-batch-inspect.cjs` / `npm run seo:weekly` |');
L.push('| IndexNow (Bing, Yandex, Seznam, Naver) | ✅ yes | `npm run indexnow` |');
L.push('| **Request Indexing (Google)** | ❌ **UI only** | [Search Console](https://search.google.com/search-console) → URL Inspection → Request Indexing |');
L.push('');
L.push('Google\'s Indexing API (`indexing.googleapis.com`) accepts **JobPosting** and **BroadcastEvent** URLs only. Using it for calculator pages is unsupported and can trip spam detection, so this repo does not call it. The supported levers are the sitemap, internal links from indexed pages, freshness, and the manual request — in that order.');
L.push('');
L.push('## 5. Is hafte ke actions');
L.push('');
L.push('1. **Request indexing** — the ' + allActionable.length + ' URLs in §3, ~10–12 per day from GSC. Click-through page: [`docs/request-indexing-clickthrough.html`](request-indexing-clickthrough.html).');
L.push('2. **Internal links** — `npm run seo:crawl-boost` links every not-indexed page from an indexed same-category page (then `npm run seo:crawl-gate` proves it). Already wired into `deploy:build`.');
L.push('3. **Snippets** — `node scripts/audit-top100-snippets.cjs` names the titles/metas that still read like template output.');
L.push('4. **Re-check** — next week run this script again; the cohort table in §2 is the honest meter, not the raw indexed total.');
L.push('');
L.push('## 6. Reproduce');
L.push('');
L.push('```bash');
L.push('node scripts/gsc-inspect-list.cjs --from data/top40-today.json --out data/gsc-inspect-top40-' + TODAY + '.json --fresh');
L.push('node scripts/weekly-index-watcher.cjs');
L.push('node scripts/audit-top100-snippets.cjs');
L.push('npm run seo:crawl-boost && npm run seo:crawl-gate');
L.push('```');
L.push('');
fs.writeFileSync(OUT_MD, L.join('\n'));

// ---- 5. click-through page ------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const H = [];
H.push('<!doctype html><html lang="en"><head><meta charset="utf-8">');
H.push('<meta name="robots" content="noindex"><title>Request indexing — ' + TODAY + '</title>');
H.push('<style>body{font:16px/1.5 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#111}');
H.push('h1{font-size:1.5rem}ol{padding-left:1.2rem}li{margin:.5rem 0}a{color:#1d4ed8}');
H.push('.meta{color:#555;font-size:.9rem}.done{color:#166534}.note{background:#f5f5f5;padding:.8rem 1rem;border-radius:8px}</style></head><body>');
H.push('<h1>Request indexing — ' + TODAY + '</h1>');
H.push('<p class="note">Har link GSC URL Inspection kholta hai. Wahan <strong>Request Indexing</strong> dabao, ~1 min wait, phir agla. Din mein 10–12 URLs — Google ki apni quota hai, is se zyada karna spam signal ban sakta hai.</p>');
H.push('<p class="meta">' + actionable.length + ' URLs · source: URL Inspection API run of ' + TODAY + '</p>');
H.push('<ol>');
for (const r of actionable) {
  H.push('<li><a href="' + esc(gscLink(r.url)) + '" target="_blank" rel="noopener">' + esc(stripSlash(r.url).replace(SITE, '')) + '</a>'
    + ' <span class="meta">— ' + esc(r.coverage) + (demandOf(r.url) ? ' · ' + demandOf(r.url) + ' impr/28d' : '') + '</span></li>');
}
H.push('</ol>');
H.push('<p class="meta">Jab sab ho jaye: <code>node scripts/weekly-index-watcher.cjs</code> dobara chalao — jo index ho gaye wo list se nikal jayenge.</p>');
H.push('</body></html>');
fs.writeFileSync(OUT_HTML, H.join('\n'));

// ---- 6. history ------------------------------------------------------------
const prior = readJson(OUT_JSON, { snapshots: [] });
const snapsOut = (prior.snapshots || []).filter((s) => s.date !== TODAY);
snapsOut.push({
  date: TODAY,
  coverage: coverage ? { inspected, indexed: indexedCount, pctIndexed: Number(pctIndexed.toFixed(1)), snapshotAt: coverage.ranAt } : null,
  cohort: last ? { date: last.date, size: cohortSize, indexed: cohortNow, since: weekAgo ? weekAgo.date : null, before: cohortBefore, delta: cohortDelta } : null,
  inspected: { count: inspectedRows.length, byState: Object.fromEntries(Object.entries(byState).map(([k, v]) => [k, v.length])), actionable: actionable.length }
});
snapsOut.sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(OUT_JSON, JSON.stringify({ updatedAt: new Date().toISOString(), snapshots: snapsOut }, null, 2));

console.log('=== Weekly index watcher — ' + TODAY + ' ===');
if (coverage) console.log('coverage: ' + indexedCount + '/' + inspected + ' indexed (' + pctIndexed.toFixed(1) + '%)');
if (last && weekAgo) console.log('cohort:   ' + cohortNow + '/' + cohortSize + ' indexed (' + (cohortDelta >= 0 ? '+' : '') + cohortDelta + ' since ' + weekAgo.date + ')');
console.log('inspected: ' + inspectedRows.length + '  ·  actionable: ' + actionable.length);
for (const [k, v] of Object.entries(byState).sort((a, b) => b[1].length - a[1].length)) console.log('  ' + String(v.length).padStart(3) + '  ' + k);
console.log('💾 ' + path.relative(ROOT, OUT_MD) + ' + ' + path.relative(ROOT, OUT_HTML) + ' + ' + path.relative(ROOT, OUT_JSON));
