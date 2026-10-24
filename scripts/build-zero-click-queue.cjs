#!/usr/bin/env node
// ============================================================
// CalcProMaster — zero-click snippet queue
// ------------------------------------------------------------
// GSC ka pattern: 216 URLs jinke >=20 impressions hain aur 0 click. Lekin unme
// sab ek jaisa defect nahi hai, aur isi liye "sab titles rewrite karo" galat
// fix hai. Do cheezein pehle saaf karni padti hain:
//
//  1) TWINS. GSC /health/bmr-mifflin aur /health/bmr-mifflin/ ko do alag rows
//     me dikhata hai (749 + 359 impressions), jabki live par ek hi 200 hai aur
//     doosra 308. Unhe alag pages maan kar queue banana impressions ko aadha
//     dikhata hai aur ek hi page ke liye do "fixes" maangta hai. Is liye rows
//     slash-insensitive path par merge hote hain, aur canonical form wahi hoti
//     hai jo deploy/ me asli file se serve hoti hai.
//
//  2) BAND. Position se pata chalta hai ki problem kya hai:
//       position 1-20   SERP par already hai -> snippet hi click nahi la raha.
//       position 21+    pehle rank karna hai; title badalne se click nahi aayega.
//
// Snippet defects are measured, not guessed. The old checklist called a
// description without a digit "defective", which flagged 28 of 74 pages whose
// copy was in fact fine ("Enter weight, height, age and sex to get your basal
// metabolic rate…"). The checks kept here are the ones that can be proven from
// the built page alone: SERP truncation, duplicate copy, and — when GSC has the
// query data — a title that omits a content word of the query it already ranks
// for. Long question-style queries are skipped: their words are not terms.
//
// Input:  data/gsc-page-impressions.json + deploy/ (built titles/descriptions)
//         + data/gsc-query-page.json (optional, for query-term coverage)
// Output: docs/ZERO-CLICK-QUEUE.md
// Usage:  node scripts/build-zero-click-queue.cjs [--input <export.json>] [--min 20]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'ZERO-CLICK-QUEUE.md');

const inputArg = (() => {
  const i = process.argv.indexOf('--input');
  return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null;
})();
const INPUT = inputArg || path.join(ROOT, 'data', 'gsc-page-impressions.json');
const MIN = (() => {
  const i = process.argv.indexOf('--min');
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 20;
})();

const DEPLOY = path.join(ROOT, 'deploy');
const SITE = 'https://calcpromaster.com';
const QUERY_PAGE = path.join(ROOT, 'data', 'gsc-query-page.json');
const QUERY_MIN = 3; // a query needs this many impressions before a term miss counts

const STOP = new Set(('a an and are as at be by can calculate calculator do does for from how i if in is it my of on or per ' +
  'the to vs what when where which who why with you your').split(/\s+/));

/** Page path for a GSC key (absolute URL or bare path), without trailing slash. */
function pathOf(url) {
  try { return new URL(url, SITE).pathname; } catch (e) { return String(url); }
}

function bare(url) {
  return pathOf(url).replace(/\/+$/, '') || '/';
}

/**
 * Canonical form as the live edge serves it: a directory page keeps its
 * trailing slash, a flat .html page does not. Returns null when there is no
 * built file (the snippet cannot be read, so no defect can be claimed).
 */
function builtFile(cleanPath) {
  for (const cand of [path.join(DEPLOY, cleanPath, 'index.html'), path.join(DEPLOY, cleanPath + '.html')]) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function canonicalForm(cleanPath) {
  if (cleanPath === '/') return '/';
  if (fs.existsSync(path.join(DEPLOY, cleanPath, 'index.html'))) return cleanPath + '/';
  if (fs.existsSync(path.join(DEPLOY, cleanPath + '.html'))) return cleanPath;
  return null;
}

function decode(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

/** Page path -> { title, desc } from the built page, or null. */
function snippetFor(cleanPath) {
  const f = builtFile(cleanPath);
  if (!f) return null;
  const html = fs.readFileSync(f, 'utf8');
  return {
    title: decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''),
    desc: decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''),
  };
}

/** path -> highest-impression query, from the GSC query×page export. */
function topQueryByPath(queryPage) {
  const agg = new Map();
  for (const pair of (queryPage && queryPage.pairs) || []) {
    let key;
    try { key = new URL(pair.page, SITE).pathname.replace(/\/+$/, '') || '/'; } catch (e) { continue; }
    const q = pair.query || '';
    if (!agg.has(key)) agg.set(key, new Map());
    const perQuery = agg.get(key);
    perQuery.set(q, (perQuery.get(q) || 0) + (pair.impressions || 0));
  }
  const out = new Map();
  for (const [key, perQuery] of agg) {
    let best = null;
    for (const [q, imp] of perQuery) if (!best || imp > best.impressions) best = { query: q, impressions: imp };
    if (best) out.set(key, best);
  }
  return out;
}

/**
 * Content words of a short query that a title does not state. Long, question-
 * style queries return [] — matching their words would demand copy that pretends
 * to answer one user's sentence. Pure.
 */
function titleTermMiss(query, title) {
  const words = String(query || '').toLowerCase().replace(/[^\p{L}\p{N}%$ ]+/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 5) return [];
  const t = String(title || '').toLowerCase();
  return words.filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w) && !t.includes(w));
}

function bandOf(position) {
  if (!position) return 'unknown';
  if (position <= 20) return '1-20';
  if (position <= 50) return '21-50';
  return '51+';
}

/**
 * Merge GSC rows by slash-insensitive path. Pure: takes the `pages` map and a
 * canonical-form resolver, returns one row per page with its URL forms.
 */
function mergeTwins(pages, resolveCanonical) {
  const groups = new Map();
  for (const [url, m] of Object.entries(pages || {})) {
    const key = bare(url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ url, clicks: m.clicks || 0, impressions: m.impressions || 0, position: m.position || 0 });
  }
  const out = [];
  for (const [key, forms] of groups) {
    const impressions = forms.reduce((s, f) => s + f.impressions, 0);
    const clicks = forms.reduce((s, f) => s + f.clicks, 0);
    const weighted = forms.reduce((s, f) => s + f.position * f.impressions, 0);
    const canonical = resolveCanonical ? resolveCanonical(key) : null;
    out.push({
      path: key,
      url: canonical ? SITE + canonical : forms[0].url,
      canonical,
      forms: forms.length,
      impressions,
      clicks,
      position: impressions ? Math.round((weighted / impressions) * 10) / 10 : 0,
    });
  }
  return out;
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('  ✗ ' + path.relative(ROOT, INPUT) + ' missing — run `npm run gsc:pages` or pass --input');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const all = mergeTwins(data.pages, canonicalForm);
  const twinPages = all.filter((r) => r.forms > 1).length;
  const splitImpressions = all.filter((r) => r.forms > 1).reduce((s, r) => s + r.impressions, 0);

  const rows = [];
  const unbuilt = [];
  for (const page of all) {
    if (page.clicks > 0) continue;
    if (page.impressions < MIN) continue;
    const snip = snippetFor(page.path);
    if (!snip) unbuilt.push(page);
    rows.push({
      ...page,
      band: bandOf(page.position),
      title: snip ? snip.title : '',
      desc: snip ? snip.desc : '',
      built: !!snip,
    });
  }
  rows.sort((a, b) => b.impressions - a.impressions);

  const topQuery = fs.existsSync(QUERY_PAGE)
    ? topQueryByPath(JSON.parse(fs.readFileSync(QUERY_PAGE, 'utf8')))
    : new Map();

  const titleCount = new Map();
  const descCount = new Map();
  for (const r of rows) {
    if (r.title) titleCount.set(r.title, (titleCount.get(r.title) || 0) + 1);
    if (r.desc) descCount.set(r.desc, (descCount.get(r.desc) || 0) + 1);
  }
  const defects = (r) => {
    if (!r.built) return ['no built page — snippet not verifiable'];
    const out = [];
    if (r.title.length > 60) out.push('title >60 chars (truncated in SERP)');
    if (r.title.length && r.title.length < 30) out.push('title <30 chars');
    if (r.title && titleCount.get(r.title) > 1) out.push('duplicate title across ' + titleCount.get(r.title) + ' pages');
    if (r.desc && descCount.get(r.desc) > 1) out.push('duplicate description across ' + descCount.get(r.desc) + ' pages');
    if (r.desc && r.desc.length < 80) out.push('description <80 chars');
    const tq = topQuery.get(r.path);
    if (tq && tq.impressions >= QUERY_MIN) {
      const miss = titleTermMiss(tq.query, r.title);
      if (miss.length) out.push('top query "' + tq.query + '" — title omits "' + miss.join('", "') + '"');
    }
    return out;
  };

  const bands = { '1-20': [], '21-50': [], '51+': [], unknown: [] };
  for (const r of rows) bands[r.band].push(r);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const fixable = bands['1-20'];
  const fixableImpressions = fixable.reduce((s, r) => s + r.impressions, 0);
  const defective = fixable.filter((r) => defects(r).length > 0);

  const lines = [];
  lines.push('# Zero-click snippet queue');
  lines.push('');
  lines.push('Generated by `npm run seo:zero-click` from `' + path.relative(ROOT, INPUT) + '`');
  lines.push('(window ' + (data.startDate || '?') + ' → ' + (data.endDate || '?') + ').');
  lines.push('');
  lines.push('**' + rows.length + ' pages** have ≥' + MIN + ' impressions and **0 clicks**, holding **' +
    impressions.toLocaleString('en-US') + ' impressions**. They do NOT share one cause:');
  lines.push('');
  lines.push('| Position band | Pages | Impressions | What actually fixes it |');
  lines.push('| --- | --- | --- | --- |');
  lines.push('| 1–20 (already on page 1–2) | ' + bands['1-20'].length + ' | ' + fixableImpressions.toLocaleString('en-US') + ' | snippet: title, description, rich result |');
  lines.push('| 21–50 | ' + bands['21-50'].length + ' | ' + bands['21-50'].reduce((s, r) => s + r.impressions, 0).toLocaleString('en-US') + ' | ranking, not the snippet |');
  lines.push('| 51+ | ' + bands['51+'].length + ' | ' + bands['51+'].reduce((s, r) => s + r.impressions, 0).toLocaleString('en-US') + ' | ranking, not the snippet |');
  lines.push('');
  lines.push('Rows are merged by path: ' + twinPages + ' pages appear in GSC under two URL forms');
  lines.push('(`/x` and `/x/`), holding ' + splitImpressions.toLocaleString('en-US') + ' impressions between them.');
  lines.push('Only the **' + fixable.length + ' pages in the 1–20 band** can be moved by editing the snippet,');
  lines.push('and only **' + defective.length + ' of them has a defect that is measurable offline**.');
  lines.push('Rewriting the other ' + (rows.length - fixable.length) + ' is churn: they are not being shown to anyone yet.');
  lines.push('');
  lines.push('## The 1–20 band, by impressions');
  lines.push('');
  lines.push('| # | Canonical URL | Imp | Pos | Measured snippet defect | Title |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  fixable.forEach((r, i) => {
    const d = defects(r);
    lines.push('| ' + (i + 1) + ' | `' + r.url + '` | ' + r.impressions + ' | ' + r.position + ' | ' +
      (d.length ? d.join('; ') : 'none — snippet is well-formed, so the SERP feature is eating the click') +
      (r.forms > 1 ? ' *(2 URL forms merged)*' : '') +
      ' | ' + String(r.title).replace(/\|/g, '\\|') + ' |');
  });
  lines.push('');
  lines.push('## Everything else');
  lines.push('');
  lines.push('The ' + (rows.length - fixable.length) + ' pages in the 21+ bands are listed so nothing is hidden, but the');
  lines.push('action there is ranking work (content depth, internal links, intent match), not copy edits.');
  lines.push('');
  lines.push('| Canonical URL | Imp | Pos |');
  lines.push('| --- | --- | --- |');
  for (const r of rows.filter((x) => x.band !== '1-20')) {
    lines.push('| `' + r.url + '` | ' + r.impressions + ' | ' + r.position + ' |');
  }

  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.log('zero-click queue: ' + rows.length + ' pages, ' + impressions.toLocaleString('en-US') + ' impressions');
  console.log('  twins merged: ' + twinPages + ' pages, ' + splitImpressions.toLocaleString('en-US') + ' impressions');
  console.log('  1-20 band (snippet-fixable): ' + fixable.length + ' pages, of which ' + defective.length + ' have a measurable defect');
  console.log('  wrote ' + path.relative(ROOT, OUT));
  if (unbuilt.length) {
    console.log('  ⚠ ' + unbuilt.length + ' page(s) have no built file in deploy/ — run `npm run deploy:build` to read their snippets');
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('build-zero-click-queue crashed: ' + (e && e.message)); process.exit(1); }
}

module.exports = { bandOf, mergeTwins, bare };
