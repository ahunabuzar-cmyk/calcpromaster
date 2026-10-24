#!/usr/bin/env node
// ============================================================
// CalcProMaster — site-wide duplicate content audit (n-gram)
// ------------------------------------------------------------
// Reads the BUILT pages under deploy/, extracts the visible text of <main>
// (falling back to <body>), and measures how much of each page is shared with
// the rest of the site:
//
//   * 7-gram document frequency: how many pages contain the same 7 words
//   * per-page duplication share: fraction of a page's 7-grams that also
//     appear on at least MIN_DF other pages
//   * the most repeated blocks, with example URLs
//   * title / meta-description duplication (the snippet-level duplicate)
//
// Output: data/duplicate-content-report.json (+ console table)
//
// Usage: node scripts/audit-n-gram-duplication.cjs [--json] [--top 25]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT = path.join(ROOT, 'data', 'duplicate-content-report.json');
const NGRAM = 7;
const MIN_DF = 6; // a block on 6+ pages is a template, not a coincidence
const JSON_OUT = process.argv.includes('--json');
// --include-noindex reproduces the pre-2026-10-19 measurement basis (all built
// pages, including long-tail variants) so before/after numbers are comparable.
const INCLUDE_NOINDEX = process.argv.includes('--include-noindex');
const TOP = (() => {
  const i = process.argv.indexOf('--top');
  return i === -1 ? 25 : parseInt(process.argv[i + 1], 10) || 25;
})();

function decode(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

function mainText(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = m ? m[1] : html.replace(/<head[\s\S]*?<\/head>/i, ' ');
  return decode(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .toLowerCase()
    .replace(/[^a-z0-9$%.,'’\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shingles(text) {
  const w = text.split(' ').filter(Boolean);
  const out = new Set();
  for (let i = 0; i + NGRAM <= w.length; i++) out.add(w.slice(i, i + NGRAM).join(' '));
  return out;
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (e === 'index.html') acc.push(p);
  }
  return acc;
}

function urlOf(file) {
  return file.slice(DEPLOY.length).replace(/\\/g, '/').replace(/index\.html$/, '') || '/';
}

// ---------- collect ----------
if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ missing — run `node build-deploy.js` first.');
  process.exit(1);
}
const files = walk(DEPLOY, []).sort();
const pages = [];
const df = new Map(); // 7-gram -> count
const dfSamples = new Map(); // 7-gram -> up to 3 urls

// noindex pages (long-tail variants, dashboards) are deliberately not in the
// index, so counting their template copies as "site duplication" measures the
// wrong thing. They are reported separately instead.
const NOINDEX = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i;
const noindexPages = [];

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const text = mainText(html);
  const grams = shingles(text);
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const desc = decode((html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1] || '').trim();
  if (NOINDEX.test(html)) {
    noindexPages.push({ url: urlOf(file), words: text ? text.split(' ').length : 0 });
    if (!INCLUDE_NOINDEX) continue;
  }
  pages.push({ url: urlOf(file), file: path.relative(ROOT, file), words: text ? text.split(' ').length : 0, grams, title, desc, text });
  for (const g of grams) {
    df.set(g, (df.get(g) || 0) + 1);
    if (!dfSamples.has(g)) dfSamples.set(g, []);
    const s = dfSamples.get(g);
    if (s.length < 3 && !s.includes(urlOf(file))) s.push(urlOf(file));
  }
}

// ---------- per-page duplication share ----------
for (const p of pages) {
  let shared = 0;
  for (const g of p.grams) if ((df.get(g) || 0) >= MIN_DF) shared++;
  p.dupShare = p.grams.size ? +(shared / p.grams.size * 100).toFixed(1) : 0;
}

// ---------- template blocks ----------
const worst = [...df.entries()]
  .filter(([, n]) => n >= MIN_DF)
  .sort((a, b) => b[1] - a[1])
  .slice(0, TOP)
  .map(([gram, n]) => ({ gram, pages: n, sharePct: +(n / pages.length * 100).toFixed(1), samples: dfSamples.get(gram) || [] }));

// Group the most repeated blocks into whole sentences so the report reads
// like prose instead of word windows: take the top gram, then greedily extend
// consecutive grams that share the same page count.
function blocks() {
  const top = [...df.entries()].filter(([, n]) => n >= MIN_DF).sort((a, b) => b[1] - a[1]);
  const used = new Set();
  const out = [];
  for (const [gram, n] of top) {
    if (out.length >= 12) break;
    if (used.has(gram)) continue;
    const words = gram.split(' ');
    // extend right while the next window has the same document frequency
    while (words.length < 40) {
      const next = words.slice(-(NGRAM - 1)).concat('__').join(' ');
      void next;
      const cand = words.slice(words.length - (NGRAM - 1)).join(' ') + ' ';
      let found = null;
      for (const [g, c] of df) if (c === n && g.startsWith(cand) && !used.has(g)) { found = g; break; }
      if (!found) break;
      const extra = found.split(' ').slice(-1)[0];
      words.push(extra);
      used.add(found);
    }
    used.add(gram);
    out.push({ pages: n, sharePct: +(n / pages.length * 100).toFixed(1), text: words.join(' ').slice(0, 400), samples: dfSamples.get(gram) || [] });
  }
  return out;
}

// ---------- titles / descriptions ----------
const byTitle = new Map();
const byDesc = new Map();
for (const p of pages) {
  if (p.title) byTitle.set(p.title, (byTitle.get(p.title) || 0) + 1);
  if (p.desc) byDesc.set(p.desc, (byDesc.get(p.desc) || 0) + 1);
}
const dupTitles = [...byTitle.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
const dupDescs = [...byDesc.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);

const dupPages = pages.filter((p) => p.dupShare >= 40).sort((a, b) => b.dupShare - a.dupShare);
const shortPages = pages.filter((p) => p.words < 400).sort((a, b) => a.words - b.words);
const totalShared = pages.reduce((s, p) => s + Math.round(p.grams.size * p.dupShare / 100), 0);
const totalGrams = pages.reduce((s, p) => s + p.grams.size, 0);

// Sentence-level duplication. A repeated 7-gram can be an unavoidable stock
// phrase ("your data never leaves your device"); a repeated whole sentence is
// the shape Google actually treats as duplicate content. Track both, report the
// sentence list first — it is the one worth fixing.
const sentDf = new Map();
const sentSamples = new Map();
for (const p of pages) {
  const raw = p.text || '';
  for (const s of raw.split(/(?<=[.!?])\s+/)) {
    const t = s.trim();
    if (t.split(' ').length < 12) continue;
    sentDf.set(t, (sentDf.get(t) || 0) + 1);
    if (!sentSamples.has(t)) sentSamples.set(t, p.url);
  }
}
// Legal disclaimers and per-category methodology notes are *supposed* to be
// identical on every page of a category. They are tracked, but separately from
// editorial sentences, so the headline number reflects real duplicates.
const BOILERPLATE = /\b(disclaimer|last reviewed|methodology)\b/i;
const allRepeated = [...sentDf.entries()]
  .filter(([, n]) => n > 3)
  .sort((a, b) => b[1] - a[1])
  .map(([s, n]) => ({ pages: n, text: s.slice(0, 220), sample: sentSamples.get(s), boilerplate: BOILERPLATE.test(s) }));
const repeatedSentences = allRepeated.filter((r) => !r.boilerplate).slice(0, 20);
const repeatedBoilerplate = allRepeated.filter((r) => r.boilerplate);

const report = {
  ranAt: new Date().toISOString(),
  pages: pages.length,
  noindexPages: noindexPages.length,
  ngram: NGRAM,
  minDocumentFrequency: MIN_DF,
  siteDupSharePct: +(totalShared / (totalGrams || 1) * 100).toFixed(1),
  pagesOver40Pct: dupPages.length,
  pagesUnder400Words: shortPages.length,
  duplicateTitles: dupTitles.length,
  duplicateMetaDescriptions: dupDescs.length,
  worstBlocks: blocks(),
  worstPages: pages.slice().sort((a, b) => b.dupShare - a.dupShare).slice(0, TOP).map((p) => ({ url: p.url, words: p.words, dupShare: p.dupShare })),
  shortestPages: shortPages.slice(0, TOP).map((p) => ({ url: p.url, words: p.words })),
  repeatedSentencePageHits: repeatedSentences.reduce((s, r) => s + r.pages, 0),
  repeatedContentSentences: repeatedSentences.length,
  repeatedBoilerplateSentences: repeatedBoilerplate.length,
  repeatedSentences,
  duplicateTitleExamples: dupTitles.slice(0, 10).map(([t, n]) => ({ title: t, pages: n })),
  duplicateDescExamples: dupDescs.slice(0, 10).map(([t, n]) => ({ description: t, pages: n })),
  topRepeatedBlocks: worst
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log('==========================================');
console.log(' SITE-WIDE DUPLICATE CONTENT (' + NGRAM + '-grams, built pages)');
console.log('==========================================');
console.log('pages scanned        : ' + report.pages +
  (INCLUDE_NOINDEX
    ? '  (includes ' + report.noindexPages + ' noindex pages — pre-change basis)'
    : '  (plus ' + report.noindexPages + ' noindex pages, excluded)'));
console.log('site duplicated share: ' + report.siteDupSharePct + '% of all ' + NGRAM + '-grams appear on ' + MIN_DF + '+ pages');
console.log('pages >40% shared    : ' + report.pagesOver40Pct);
console.log('pages <400 words     : ' + report.pagesUnder400Words);
console.log('duplicate titles     : ' + report.duplicateTitles);
console.log('duplicate meta descs : ' + report.duplicateMetaDescriptions);
console.log('repeated sentences   : ' + repeatedSentences.length + ' editorial sentences appear on 4+ pages' +
  ' (' + repeatedBoilerplate.length + ' disclaimer/methodology boilerplate, expected)');
console.log('');
if (repeatedSentences.length) {
  console.log('--- editorial sentences shared by 4+ pages ---');
  for (const s of repeatedSentences.slice(0, 8)) {
    console.log('  ' + String(s.pages).padStart(4) + 'x  "' + s.text.slice(0, 120) + '…"');
  }
}
console.log('');
console.log('--- most repeated blocks ---');
for (const b of report.worstBlocks.slice(0, 10)) {
  console.log('  ' + String(b.pages).padStart(4) + ' pages (' + b.sharePct + '%)  "' + b.text.slice(0, 110) + '…"');
  console.log('        e.g. ' + b.samples.slice(0, 2).join(' , '));
}
console.log('');
console.log('--- most duplicated pages ---');
for (const p of report.worstPages.slice(0, 15)) {
  console.log('  ' + p.dupShare.toFixed(1).padStart(5) + '%  ' + String(p.words).padStart(5) + 'w  ' + p.url);
}
if (report.shortestPages.length) {
  console.log('');
  console.log('--- thinnest pages ---');
  for (const p of report.shortestPages.slice(0, 10)) console.log('  ' + String(p.words).padStart(5) + 'w  ' + p.url);
}
console.log('');
console.log('💾 ' + path.relative(ROOT, OUT));
