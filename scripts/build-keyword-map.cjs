#!/usr/bin/env node
/* Build docs/KEYWORD-TARGETS.md — the complete keyword targeting map.
 *
 * Sources:
 *  1. scripts/.keywords.jsonl  — per-page {url,title,meta,h1} extracted
 *     from the deploy tree (indexable pages only; noindex variants excluded).
 *  2. js/data/*.js                 — the curated `kw` long-tail string per tool
 *     (the phrases the site was built to rank for, e.g. "loan emi calculator
 *     india with prepayment").
 *
 * Primary SEO target per tool page = its <title>; the curated kw phrases are
 * the secondary long-tail surface woven into page copy/FAQs.
 * Run: node scripts/.tmp-keyword-doc.cjs   (after .tmp-keyword-extract.cjs)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT = path.join(ROOT, 'docs', 'KEYWORD-TARGETS.md');
// Deterministic doc date: source-controlled mtime of sitemap.xml (UTC), so CI
// (Linux) and local (Windows) builds produce byte-identical documents.
const DOC_DATE = new Date(fs.statSync(path.join(ROOT, 'sitemap.xml')).mtimeMs).toISOString().slice(0, 10);

// ---------- load per-page rows ----------
const pages = fs.readFileSync(path.join(__dirname, '.keywords.jsonl'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l));
const byUrl = new Map(pages.map(p => [p.url, p]));

// ---------- load tool data (browser-guarded UMD files) ----------
const sandbox = { process, require, module: { exports: {} }, console: { log() {}, warn() {}, error() {} } };
sandbox.module = sandbox.module || { exports: {} };
vm.createContext(sandbox);
const toolsByCat = {};
const catDisplay = {};
// Empirical data-file → URL-directory mapping: vote on which top-level deploy
// dir actually contains the file's tools (e.g. career-freelance.js -> /career/).
const fs2 = fs;
const topDirs = fs2.readdirSync(path.join(ROOT, 'deploy'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);
const dirOf = {};
for (const f of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js')).sort()) {
  const cat = f.replace(/\.js$/, '');
  const code = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  const m = { exports: {} };
  sandbox.module = m;
  vm.runInContext(code, sandbox, { filename: f });
  const arr = m.exports;
  if (!Array.isArray(arr)) continue;
  // vote: which top-level dir has the most <id>/index.html for this file's tools?
  const votes = {};
  for (const t of arr.slice(0, 40)) {
    if (!t || !t.id) continue;
    for (const d of topDirs) {
      if (fs2.existsSync(path.join(ROOT, 'deploy', d, t.id, 'index.html'))) {
        votes[d] = (votes[d] || 0) + 1;
      }
    }
  }
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) dirOf[cat] = best[0];
  toolsByCat[dirOf[cat] || cat] = arr;
  const hub = byUrl.get('/' + (dirOf[cat] || cat));
  catDisplay[dirOf[cat] || cat] = hub ? hub.title.replace(/\s*\|\s*CalcProMaster.*$/, '') : (dirOf[cat] || cat);
}

// ---------- join tools to page rows ----------
const join = { matched: 0, noTitle: 0, titleMismatch: 0 };
const rows = [];
for (const [cat, arr] of Object.entries(toolsByCat)) {
  for (const t of arr) {
    if (!t || !t.id || !t.name) continue;
    const url = '/' + cat + '/' + t.id;
    const page = byUrl.get(url);
    if (!page || !page.title) { join.noTitle++; continue; }
    const titleClean = page.title.replace(/\s*\|\s*CalcProMaster.*$/, '');
    const n = t.name.toLowerCase();
    const ok = titleClean.toLowerCase().includes(n) || n.includes(titleClean.toLowerCase());
    if (!ok) join.titleMismatch++;
    else join.matched++;
    const kws = (t.kw || '').split(',').map(s => s.trim()).filter(Boolean);
    rows.push({ cat, url, name: t.name, title: titleClean, meta: page.meta, kws });
  }
}

// ---------- hub / static / content page rows ----------
const toolUrls = new Set(rows.map(r => r.url));
const hubRows = [];
const staticRows = [];
const guideRows = [];
const blogRows = [];
for (const p of pages) {
  const seg = p.url.split('/')[1] || '';
  const titleClean = p.title.replace(/\s*\|\s*CalcProMaster.*$/, '');
  if (p.url === '/' || (seg && !p.url.slice(1).includes('/') && !/\./.test(seg) && byUrl.has('/' + seg) && !toolUrls.has(p.url))) {
    // one-segment pages: hubs, static, guides index, etc.
  if (/^\/(guides|blog|glossary)$/.test(p.url)) continue;
  if (catDisplay[seg] !== undefined && p.url !== '/' + seg) continue;
  if (catDisplay[seg] !== undefined) { hubRows.push(p); continue; }
  staticRows.push({ ...p, title: titleClean }); continue;
}
if (p.url.startsWith('/guides/')) { guideRows.push({ ...p, title: titleClean }); continue; }
if (p.url.startsWith('/blog')) { blogRows.push({ ...p, title: titleClean }); continue; }
}

// ---------- emit markdown ----------
const L = [];
const push = (s = '') => L.push(s);
push('# Keyword Targeting Map — CalcProMaster (complete inventory)');
push('');
push('_Machine-extracted from the deploy tree + calculator data modules on ' + DOC_DATE + '. Nothing hand-added, nothing omitted._');
push('');
push('**How to read this document**');
push('');
push('- **Primary keyword** = the page `<title>` (what Google shows; the exact-match anchor of every page).');
push('- **Secondary surface** = the `<meta description>` (long-tail + intent modifiers).');
push('- **Curated long-tail phrases** = the `kw` field in `js/data/*.js` — the specific queries each tool was built to rank for (feature + audience + locale modifiers). These are woven into page copy, FAQs and JSON-LD.');
push('- Indexable pages audited: **' + pages.length + '** (noindex variant pages excluded by design).');
push('');
push('**Totals:** ' + rows.length + ' calculator pages · ' + hubRows.length + ' category hubs · ' + guideRows.length + ' guides · ' + blogRows.length + ' blog posts · ' + staticRows.length + ' support/static pages.');
push('');
push('**Honest scope note:** these are the keywords the site TARGETS (on-page). Whether the site RANKS for them is a different question — that requires Google Search Console data (see docs/SEO-AUDIT-2026-09-17.md: rankings/backlinks cannot be verified without GSC credentials).');
push('');
push('---');
push('');
push('## 1. Site-wide head terms (homepage + category hubs)');
push('');
for (const p of [{ url: '/', ...pages.find(x => x.url === '/') }, ...hubRows].filter(Boolean)) {
  push('### `' + p.url + '`');
  push('- **Title:** ' + p.title);
  push('- **Meta:** ' + p.meta);
  push('');
}
push('## 2. Support & trust pages');
push('');
push('| Page | Title target |');
push('|---|---|');
for (const p of staticRows) push('| `' + p.url + '` | ' + p.title + ' |');
push('');
push('## 3. Guides (' + guideRows.length + ')');
push('');
push('| Guide | Title target |');
push('|---|---|');
for (const p of guideRows) push('| `' + p.url + '` | ' + p.title + ' |');
push('');
push('## 4. Blog (' + blogRows.length + ')');
push('');
push('| Post | Title target |');
push('|---|---|');
for (const p of blogRows) push('| `' + p.url + '` | ' + p.title + ' |');
push('');
push('## 5. Calculator pages — every curated keyword, category by category');
push('');
const cats = Object.keys(toolsByCat);
let catIdx = 0;
for (const cat of cats) {
  catIdx++;
  const catRows = rows.filter(r => r.cat === cat);
  if (!catRows.length) continue;
  push('## 5.' + catIdx + ' ' + catDisplay[cat] + ' — `' + cat + '/` (' + catRows.length + ' tools)');
  push('');
  for (const r of catRows) {
    push('**' + r.url + ' — ' + r.name + '**');
    push('- Title: ' + r.title);
    if (r.kws.length) push('- Keywords: ' + r.kws.join(' · '));
    push('');
  }
}
push('---');
push('');
push('## 6. Join-quality audit (extraction honesty)');
push('');
push('- Tool↔URL joins with matching title: **' + join.matched + '**');
push('- Joins where the title did not literally contain the tool name (renamed/rebranded tools — kept, flagged here): **' + join.titleMismatch + '**');
push('- Data entries with no matching indexable page: **' + join.noTitle + '** (data-only tools, groups, or noindex variants)');
push('');

fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log('wrote', OUT, '-', L.length, 'lines');
console.log('tools with keywords:', rows.filter(r => r.kws.length).length, '/', rows.length);
console.log('unique curated phrases:', new Set(rows.flatMap(r => r.kws).map(k => k.toLowerCase())).size);
console.log('join audit:', JSON.stringify(join));
console.log('hubs:', hubRows.length, 'static:', staticRows.length, 'guides:', guideRows.length, 'blog:', blogRows.length);
