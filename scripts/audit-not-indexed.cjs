#!/usr/bin/env node
// ============================================================
// CalcProMaster — Full "not-indexed" page audit
// ------------------------------------------------------------
// Har wo sitemap/page jo GSC coverage ke hisaab se abhi INDEX nahi hui,
// uske liye on-page blockers check karta hai — bilkul file-by-file:
//   - deploy/ mein page bana hua hai? (missing = build gap)
//   - meta robots noindex nahi hai?
//   - self-canonical maujood hai? (aur apne aap par point karta hai?)
//   - <title> non-empty hai?
//   - sitemap.xml mein shaamil hai?
//
// Ye "fixable blocker" (hum theek kar sakte hain) ko "waiting on crawl"
// (page clean hai, Google bas crawl budget de raha hai) se alag karta hai,
// taake pata chale asli kaam kitna bacha hai.
//
// Input:  data/gsc-coverage-report.json   (not-indexed list)
//         deploy/**  ·  deploy/sitemap.xml
// Output: docs/NOT-INDEXED-FULL-AUDIT.md  ·  data/not-indexed-audit.json
// Usage:  node scripts/audit-not-indexed.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const SITE = 'https://calcpromaster.com';
const COVERAGE = path.join(ROOT, 'data', 'gsc-coverage-report.json');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }

const rep = readJson(COVERAGE);
if (!rep) { console.error('data/gsc-coverage-report.json missing — run gsc-aggregate-coverage.cjs first'); process.exit(1); }

// ---- the not-indexed set (Discovered + Unknown). Also accept extra problem buckets. ----
const notIndexed = [
  ...(rep.lists.DISCOVERED || []),
  ...(rep.lists.UNKNOWN || []),
  ...(rep.lists.CRAWLED_NOT_INDEXED || []),
];
const seen = new Set();
const rows = [];
for (const r of notIndexed) {
  const key = String(r.url || '').replace(/\/+$/, '');
  if (!key || seen.has(key)) continue;
  seen.add(key);
  rows.push({ url: String(r.url || ''), coverage: r.coverage || 'UNKNOWN' });
}

// Normalise any URL (full or path) to a site-relative path with no trailing slash.
function normPath(u) {
  let p = String(u || '').replace(SITE, '').split('?')[0].split('#')[0];
  p = p.replace(/\/+$/, '');
  return p || '/';
}

// ---- sitemap membership ----
const sitemapSet = new Set();
let sitemapCount = 0;
try {
  const xml = fs.readFileSync(path.join(DEPLOY, 'sitemap.xml'), 'utf8');
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    sitemapCount++;
    sitemapSet.add(normPath(m[1]));
  }
} catch (e) { /* no sitemap */ }

// ---- resolve a site URL to a built HTML file (tool dir, guide/blog flat file, etc.) ----
function resolveFile(url) {
  const p = String(url).replace(SITE, '').split('?')[0].split('#')[0];
  const rel = p.replace(/^\/+/, '').replace(/\/+$/, '');
  const candidates = [];
  if (!rel) {
    candidates.push(path.join(DEPLOY, 'index.html'));
  } else {
    candidates.push(path.join(DEPLOY, rel + '.html'));       // flat file: guides/bmi.html
    candidates.push(path.join(DEPLOY, rel, 'index.html'));    // dir index: health/bmi/index.html
  }
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function analyze(url) {
  const file = resolveFile(url);
  if (!file) return { state: 'NOT_BUILT', detail: 'deploy/ mein file nahi mili' };
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { return { state: 'NOT_BUILT', detail: 'file read fail' }; }

  const robotsM = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  const robots = robotsM ? robotsM[1].toLowerCase() : '';
  if (/\bnoindex\b/.test(robots)) return { state: 'FIXABLE_NOINDEX', detail: 'meta robots=noindex', file };

  const canM = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (!canM) return { state: 'FIXABLE_NO_CANONICAL', detail: 'canonical tag missing', file };
  const canon = canM[1];
  // canonical should be a self-reference (allow trailing-slash diff)
  const selfSlash = (SITE + (url.replace(SITE, ''))).replace(/\/+$/, '');
  if (canon.replace(/\/+$/, '') !== selfSlash) return { state: 'FIXABLE_CANONICAL_MISMATCH', detail: 'canonical=' + canon, file };

  const titleM = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleM || !titleM[1].trim()) return { state: 'FIXABLE_NO_TITLE', detail: 'title empty/missing', file };

  if (!sitemapSet.has(normPath(url))) return { state: 'FIXABLE_NOT_IN_SITEMAP', detail: 'sitemap mein nahi', file };

  return { state: 'WAITING_CRAWL', detail: 'page clean — Google ke crawl ka intezaar', file: path.relative(ROOT, file) };
}

const results = rows.map((r) => ({ ...r, ...analyze(r.url) }));

const tally = {};
for (const r of results) tally[r.state] = (tally[r.state] || 0) + 1;

const FIXABLE = Object.keys(tally).filter((k) => k.startsWith('FIXABLE_'));
const fixableCount = FIXABLE.reduce((n, k) => n + tally[k], 0);
const waiting = tally.WAITING_CRAWL || 0;
const coverageTally = {};
for (const r of results) { const c = r.coverage; coverageTally[c] = (coverageTally[c] || 0) + 1; }

// by category
const catOf = (u) => u.replace(SITE, '').split('/').filter(Boolean)[0] || '(root)';
const byCat = {};
for (const r of results) { const c = catOf(r.url); byCat[c] = (byCat[c] || 0) + 1; }
const catList = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

// ---- write JSON ----
fs.writeFileSync(path.join(ROOT, 'data', 'not-indexed-audit.json'), JSON.stringify({
  ranAt: new Date().toISOString(),
  snapshotRanAt: rep.ranAt,
  notIndexedTotal: results.length,
  fixable: fixableCount,
  waitingCrawl: waiting,
  stateTally: tally,
  coverageTally,
  byCategory: byCat,
  results,
}, null, 2));

// ---- write Markdown ----
const L = [];
L.push('# NOT-INDEXED — FULL AUDIT (har page check kiya gaya)');
L.push('');
L.push('> Auto-generated by `node scripts/audit-not-indexed.cjs`.');
L.push('> Coverage snapshot: ' + String(rep.ranAt).slice(0, 10) + ' · audit run: ' + new Date().toISOString().slice(0, 10) + '.');
L.push('');
L.push('## Ek nazar mein');
L.push('');
L.push('| Metric | Count |');
L.push('|---|---|');
L.push('| Not-indexed pages audited | ' + results.length + ' |');
L.push('| **Fixable blocker (hum theek kar sakte hain)** | **' + fixableCount + '** |');
L.push('| Clean — sirf crawl budget ka intezaar | ' + waiting + ' |');
L.push('| Sitemap URLs (reference) | ' + sitemapCount + ' |');
L.push('');
if (fixableCount === 0) {
  L.push('**✅ Koi fixable technical blocker nahi mila.** Saare not-indexed pages technically saaf hain');
  L.push('(built, `index,follow`, self-canonical, titled, sitemap mein). Matlab kaam "fix" ka nahi —');
  L.push('"Google ko crawl karwao" ka hai: Request Indexing (manual) + backlinks + time.');
} else {
  L.push('**⚠ ' + fixableCount + ' pages par asli fixable blocker hai — neeche list.**');
}
L.push('');
L.push('## State breakdown');
L.push('');
L.push('| State | Count | Matlab |');
L.push('|---|---|---|');
const MEANING = {
  WAITING_CRAWL: 'Page clean — Google crawl budget ka intezaar (normal, naye site par)',
  NOT_BUILT: 'deploy/ mein file nahi — build/copy gap',
  FIXABLE_NOINDEX: 'meta robots noindex — index block',
  FIXABLE_NO_CANONICAL: 'canonical tag missing',
  FIXABLE_CANONICAL_MISMATCH: 'canonical apne aap par nahi — consolidate karo',
  FIXABLE_NO_TITLE: 'title khaali/missing',
  FIXABLE_NOT_IN_SITEMAP: 'sitemap mein nahi — submit karo',
};
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  L.push('| ' + k + ' | ' + v + ' | ' + (MEANING[k] || '') + ' |');
}
L.push('');
L.push('## GSC coverage state (jaise snapshot mein tha)');
L.push('');
L.push('| Coverage state | Count |');
L.push('|---|---|');
for (const [k, v] of Object.entries(coverageTally).sort((a, b) => b[1] - a[1])) L.push('| ' + k + ' | ' + v + ' |');
L.push('');
L.push('## By category (not-indexed)');
L.push('');
L.push('| Category | Count |');
L.push('|---|---|');
for (const [c, n] of catList) L.push('| ' + c + ' | ' + n + ' |');
L.push('');
if (fixableCount > 0) {
  L.push('## Fixable pages (pehle ye theek karo)');
  L.push('');
  L.push('| URL | State | Detail |');
  L.push('|---|---|---|');
  for (const r of results.filter((x) => x.state.startsWith('FIXABLE_')).slice(0, 200)) {
    L.push('| `' + r.url + '` | ' + r.state + ' | ' + r.detail + ' |');
  }
  L.push('');
}
L.push('## Baaki kaam (kitna bacha hai)');
L.push('');
L.push('- **Fixable technical work: ' + fixableCount + ' pages.** ' + (fixableCount === 0 ? 'Kuch nahi — site clean hai.' : 'Upar list dekho.'));
L.push('- **' + waiting + ' pages sirf crawl/index ka intezaar kar rahe hain.** Inke liye:');
L.push('  1. GSC → URL Inspection → Request Indexing (`docs/REQUEST-INDEXING-TOP40.md`), ~12 URLs/din.');
L.push('  2. Backlinks (off-page) — yahi crawl appetite badhata hai.');
L.push('  3. Time — naya domain, 2–8 hafte normal.');
L.push('');
L.push('Full machine-readable: `data/not-indexed-audit.json`.');
L.push('');

fs.writeFileSync(path.join(ROOT, 'docs', 'NOT-INDEXED-FULL-AUDIT.md'), L.join('\n'));

console.log('=== Not-indexed full audit ===');
console.log('audited: ' + results.length + '  ·  fixable: ' + fixableCount + '  ·  waiting-crawl: ' + waiting);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(5) + '  ' + k);
console.log('top categories: ' + catList.slice(0, 8).map(([c, n]) => c + ':' + n).join(' '));
console.log('💾 docs/NOT-INDEXED-FULL-AUDIT.md + data/not-indexed-audit.json');
