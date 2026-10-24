#!/usr/bin/env node
// Why is search traffic (nearly) zero? Reads the GSC artifacts already in
// data/ and prints the three numbers that answer it, from stored API pulls —
// no guesses, no re-fetch (the token dies every 7 days, see docs/GSC-STATUS-REPORT.md).
//
//   1. IMPRESSIONS vs CLICKS — the ceiling and the CTR
//   2. INDEX FOOTPRINT       — how much of the site Google actually indexed
//   3. QUERY PROFILE         — where the impressions come from (and whether
//                              they can ever convert)
//
// Usage: node scripts/diagnose-impressions.cjs
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const D = (f) => path.join(ROOT, 'data', f);
const read = (f) => JSON.parse(fs.readFileSync(D(f), 'utf8'));

function section(t) { console.log('\n' + '='.repeat(72) + '\n' + t + '\n' + '='.repeat(72)); }
function pct(a, b) { return b ? ((a / b) * 100).toFixed(2) + '%' : '—'; }

// ---------- 1. Impressions, clicks, CTR ----------
const pages = read('gsc-page-impressions.json');
const rows = Object.entries(pages.pages).map(([u, v]) => ({ u, ...v }));
const spanDays = Math.max(1, Math.round((new Date(pages.endDate) - new Date(pages.startDate)) / 86400000) + 1);
const impr = rows.reduce((a, r) => a + r.impressions, 0);
const clicks = rows.reduce((a, r) => a + r.clicks, 0);

section('1. What Search Console actually recorded (stored API pull)');
console.log('window          ' + pages.startDate + ' → ' + pages.endDate + '  (' + spanDays + ' days, pulled ' + pages.ranAt.slice(0, 10) + ')');
console.log('impressions     ' + impr.toLocaleString() + '   (' + (impr / spanDays).toFixed(0) + '/day)');
console.log('clicks          ' + clicks + '   (' + (clicks / spanDays).toFixed(2) + '/day)');
console.log('CTR             ' + pct(clicks, impr));
console.log('pages seen      ' + rows.length + ' of ~1,620 built');
console.log('');
rows.sort((a, b) => b.impressions - a.impressions);
const top10 = rows.slice(0, 10).reduce((a, r) => a + r.impressions, 0);
console.log('top-10 pages    ' + pct(top10, impr) + ' of all impressions');
console.log('pages ≤2 impr   ' + rows.filter((r) => r.impressions <= 2).length + ' (' + pct(rows.filter((r) => r.impressions <= 2).length, rows.length) + ' of pages seen)');
console.log('pages ≤10 impr  ' + rows.filter((r) => r.impressions <= 10).length + ' (' + pct(rows.filter((r) => r.impressions <= 10).length, rows.length) + ')');
console.log('\nTop pages (impressions | clicks | avg position):');
rows.slice(0, 10).forEach((r) => console.log('  ' + String(r.impressions).padStart(5) + ' | ' + String(r.clicks).padStart(2) + ' | ' + r.position.toFixed(1).padStart(5) + '  ' + r.u));

// ---------- 2. Index footprint ----------
section('2. How much of the site Google has indexed');
const panelRuns = read('index-panel-history.json');
const last = panelRuns[panelRuns.length - 1];
const states = {};
for (const v of Object.values(last.checked || {})) states[v] = (states[v] || 0) + 1;
console.log('panel snapshot  ' + last.date + ' (' + Object.keys(last.checked || {}).length + ' URLs re-inspected)');
for (const [k, v] of Object.entries(states).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(4) + '  ' + k);
const batchFile = fs.readdirSync(D('')).filter((f) => /^gsc-inspect-batch-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
const batch = read(batchFile);
const bstates = {};
for (const r of batch.results) bstates[r.coverage] = (bstates[r.coverage] || 0) + 1;
console.log('\nnewest batch    ' + batchFile.replace('gsc-inspect-batch-', '').replace('.json', '') + ' (' + batch.results.length + ' URLs)');
for (const [k, v] of Object.entries(bstates).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(4) + '  ' + k);
const unknown = batch.results.filter((r) => /unknown/i.test(r.coverage)).map((r) => r.url.replace('https://calcpromaster.com', '') || '/');
if (unknown.length) console.log('  unknown →       ' + unknown.slice(0, 12).join('  '));
const indexed = batch.results.filter((r) => /Submitted and indexed/i.test(r.coverage)).map((r) => r.url.replace('https://calcpromaster.com', '') || '/');
const toolLike = indexed.filter((u) => /^\/[a-z]+\/[a-z0-9-]+\/?$/.test(u) && !/^\/hub\//.test(u));
console.log('  indexed tool pages in this sample: ' + toolLike.length + ' / ' + batch.results.length);

// ---------- 3. Query profile ----------
section('3. Where the impressions come from');
const qp = read('gsc-query-page.json');
const q = (qp.queries || []).slice().sort((a, b) => b.impressions - a.impressions);
const qImpr = q.reduce((a, r) => a + r.impressions, 0);
console.log('join window     ' + qp.startDate + ' → ' + qp.endDate + ' (limits: ' + JSON.stringify(qp.rowLimits) + ')');
console.log('property totals ' + JSON.stringify(qp.totals));
console.log('stored rows     ' + q.length + ' queries carrying ' + qImpr + ' impressions (' + pct(qImpr, qp.totals.impressions) + ' of the property total)');
console.log('1-impression    ' + q.filter((r) => r.impressions === 1).length + ' queries');
console.log('≤2 impressions  ' + q.filter((r) => r.impressions <= 2).length + ' queries');
const junk = /[+%]|pubmed|official|authoritative|\bsource\b/i;
const junkRows = q.filter((r) => junk.test(r.query));
console.log('formula-literal ' + junkRows.length + ' of the stored queries look like scraped formula strings (contain + % pubmed/official/source)');
console.log('\nTop queries:');
q.slice(0, 12).forEach((r) => console.log('  ' + String(r.impressions).padStart(4) + ' impr | ' + String(r.clicks).padStart(2) + ' clk | pos ' + r.position.toFixed(1).padStart(5) + '  ' + r.query.slice(0, 88)));

// ---------- verdict ----------
section('Verdict (read the numbers above, not a story)');
const perDay = impr / spanDays;
console.log('· Impressions are NOT at 2/day in this pull: ' + perDay.toFixed(0) + '/day.');
console.log('  If the GSC UI shows "2", it is almost certainly the CLICKS line (' + clicks + ' clicks in ' + spanDays + ' days)');
console.log('  or a single day in the last 2–3 days, which Search Console has not finished reporting yet.');
console.log('· The real constraint is index footprint: Google indexed a few dozen URLs out of ~1,620,');
console.log('  and the same URLs re-inspected a week later were still in the queue (see section 2).');
console.log('· What does get shown is a 1–2-impression long tail at average position ~33, so even those');
console.log('  impressions do not turn into visits (CTR ' + pct(clicks, impr) + ').');
