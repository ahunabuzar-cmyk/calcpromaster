#!/usr/bin/env node
/* How much of each tool page is actually unique?
 *
 * Google's "Crawled - currently not indexed" / mass de-indexing is driven by
 * near-duplicate content on templated page sets. Before claiming anything about
 * this site's content quality, measure it:
 *
 *   - take the served <main> of every built page in deploy/
 *   - normalise to lowercase words, build 7-word shingles
 *   - document frequency of every shingle across pages
 *   - per page: words, unique-shingle ratio (shingles seen on THIS page only)
 *
 * Writes data/uniqueness-measure.json and prints a summary.
 *
 * Usage: node scripts/dev-uniqueness-measure.cjs [--limit N]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT = path.join(ROOT, 'data', 'uniqueness-measure.json');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : 0; })();

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

// Visible text of <main> (falls back to <body>) with scripts/styles/binaries out.
function mainText(html) {
  let seg = html;
  const m = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  if (m) seg = m[1];
  else {
    const b = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    if (b) seg = b[1];
  }
  seg = seg.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9%. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return seg;
}

function shingles(words, n) {
  const out = new Set();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

const N = 7;
// Pages that are deliberately noindex (the 183 modifier variants + a few utility
// shells) are NOT part of the indexable corpus; including them would report a
// duplication problem Google never sees. Skip them.
const all = walk(DEPLOY, []);
const files = all.filter((f) => !/name=["']robots["'][^>]*noindex/i.test(fs.readFileSync(f, 'utf8')));
console.log('built pages:', all.length, '| indexable:', files.length, '| noindex (skipped):', all.length - files.length);

const targets = LIMIT ? files.slice(0, LIMIT) : files;
console.log('pages measured:', targets.length);

const df = new Map();          // shingle -> number of pages containing it
const pageShingles = new Map(); // path -> Set
const pageWords = new Map();

for (const f of targets) {
  const rel = '/' + path.relative(DEPLOY, f).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
  const html = fs.readFileSync(f, 'utf8');
  const text = mainText(html);
  const words = text ? text.split(' ') : [];
  pageWords.set(rel, words.length);
  const sh = shingles(words, N);
  pageShingles.set(rel, sh);
  for (const s of sh) df.set(s, (df.get(s) || 0) + 1);
}

const rows = [];
for (const [rel, sh] of pageShingles) {
  let uniq = 0;
  for (const s of sh) if (df.get(s) === 1) uniq++;
  const words = pageWords.get(rel);
  const boiler = Math.round((sh.size ? 1 - uniq / sh.size : 0) * Math.max(0, words - N + 1));
  rows.push({
    path: rel,
    words,
    shingles: sh.size,
    uniqueShingles: uniq,
    uniqueRatio: sh.size ? +(uniq / sh.size).toFixed(3) : 0,
    sharedWordEstimate: boiler,
  });
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0; };
const ratios = rows.map((r) => r.uniqueRatio);
const words = rows.map((r) => r.words);

const top = [...df.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 25);

console.log('\n=== per-page visible <main> text ===');
console.log('median words:', Math.round(pct(words, 50)), '| p10:', pct(words, 10), '| min:', Math.min(...words), '| max:', Math.max(...words));
console.log('median unique-shingle ratio:', (pct(ratios, 50) * 100).toFixed(1) + '%',
  '| p10:', (pct(ratios, 10) * 100).toFixed(1) + '%',
  '| mean:', (mean(ratios) * 100).toFixed(1) + '%');
const shared = rows.map((r) => r.sharedWordEstimate);
console.log('median words that are boilerplate:', Math.round(pct(shared, 50)), 'of', Math.round(pct(words, 50)));
console.log('pages with <25% unique text:', ratios.filter((r) => r < 0.25).length, '/', ratios.length);
console.log('pages with <60% unique text:', ratios.filter((r) => r < 0.6).length, '/', ratios.length);

console.log('\n=== most-repeated 7-word phrases (pages containing) ===');
for (const [s, c] of top) console.log(String(c).padStart(5) + '  ' + s.slice(0, 100));

const byCat = {};
for (const r of rows) {
  const cat = r.path.split('/')[1] || '(root)';
  (byCat[cat] = byCat[cat] || []).push(r.uniqueRatio);
}
console.log('\n=== median unique ratio by first path segment ===');
for (const [c, a] of Object.entries(byCat).sort((x, y) => pct(x[1], 50) - pct(y[1], 50)).slice(0, 12)) {
  console.log('  ' + c.padEnd(16) + (pct(a, 50) * 100).toFixed(1) + '%  (n=' + a.length + ')');
}

fs.writeFileSync(OUT, JSON.stringify({
  ranAt: new Date().toISOString(),
  shingleWords: N,
  pages: rows.length,
  summary: {
    medianWords: Math.round(pct(words, 50)),
    medianUniqueRatio: +pct(ratios, 50).toFixed(3),
    p10UniqueRatio: +pct(ratios, 10).toFixed(3),
    below25pctUnique: ratios.filter((r) => r < 0.25).length,
    below60pctUnique: ratios.filter((r) => r < 0.6).length,
    topSharedPhrases: top.map(([s, c]) => ({ phrase: s, pages: c })),
  },
  rows,
}, null, 1));
console.log('\nwrote ' + path.relative(ROOT, OUT));
