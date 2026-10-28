'use strict';
// Which whole SENTENCES are repeated across pages, and how long are they?
// Shingle counts tell us text is shared; sentences say what to rewrite.
const fs = require('fs');
const path = require('path');

const DEPLOY = path.join(__dirname, '..', 'deploy');
const CATS = new Set(['auto', 'business', 'construction', 'conversion', 'career', 'education', 'engineering',
  'everyday', 'family', 'finance', 'fitness', 'food', 'health', 'homegarden', 'lifestyle', 'math',
  'regional', 'science', 'tech', 'utilities']);

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === 'index.html') acc.push(p);
  }
  return acc;
}

function mainText(html) {
  const m = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  let seg = m ? m[1] : html;
  seg = seg.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return seg;
}

const files = walk(DEPLOY, []).filter((f) => {
  const rel = path.relative(DEPLOY, f).split(path.sep);
  return rel.length === 3 && CATS.has(rel[0]);
});
console.log('tool pages:', files.length);

const df = new Map();
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  if (/name=["']robots["'][^>]*noindex/i.test(html.slice(0, 40000))) continue;
  const text = mainText(html);
  const seen = new Set();
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    const norm = s.trim().toLowerCase();
    if (norm.split(' ').length < 8) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    df.set(s.trim(), (df.get(s.trim()) || 0) + 1);
  }
}

const shared = [...df.entries()].filter(([, c]) => c >= 500).sort((a, b) => b[1] - a[1]);
let words = 0;
console.log('\nsentences on >=500 pages:', shared.length);
for (const [s, c] of shared.slice(0, 40)) {
  words += s.split(' ').length;
  console.log(String(c).padStart(5) + ' w=' + String(s.split(' ').length).padStart(3) + '  ' + s.slice(0, 170));
}
console.log('\nwords in those sentences (per page):', shared.reduce((a, [, ]) => a, 0), '->', shared.reduce((a, [s]) => a + s.split(' ').length, 0));
