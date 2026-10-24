#!/usr/bin/env node
// ============================================================
// CalcProMaster — thin content audit (runs on deploy/)
// ------------------------------------------------------------
// Counts visible words per indexable page and buckets the site. Pages under
// the threshold are listed so a thin page cannot be added quietly.
//
// Usage:
//   node scripts/audit-thin-pages.cjs [--min 500] [--json] [--limit 60]
// Exit code: 1 when any page falls below --min.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const DEPLOY = path.join(__dirname, '..', 'deploy');
const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  const v = i >= 0 ? parseFloat(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
};
const MIN = arg('min', 500);
const LIMIT = arg('limit', 60);
const JSON_OUT = process.argv.includes('--json');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const rows = [];
for (const file of walk(DEPLOY)) {
  const rel = path.relative(DEPLOY, file).replace(/\\/g, '/');
  if (/^googled[0-9a-z]+\.html$/i.test(rel) || rel === '404.html') continue;
  const html = fs.readFileSync(file, 'utf8');
  if (/name="robots"[^>]*noindex/i.test(html)) continue;
  const text = visibleText(html);
  rows.push({
    words: text ? text.split(' ').length : 0,
    page: '/' + rel.replace(/\.html$/, '').replace(/\/index$/, ''),
    title: ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/&amp;/g, '&')
  });
}

rows.sort((a, b) => a.words - b.words);
const buckets = { '<200': 0, '200-349': 0, '350-499': 0, '500-799': 0, '800-1199': 0, '1200+': 0 };
for (const r of rows) {
  if (r.words < 200) buckets['<200']++;
  else if (r.words < 350) buckets['200-349']++;
  else if (r.words < 500) buckets['350-499']++;
  else if (r.words < 800) buckets['500-799']++;
  else if (r.words < 1200) buckets['800-1199']++;
  else buckets['1200+']++;
}
const thin = rows.filter((r) => r.words < MIN);

if (JSON_OUT) {
  console.log(JSON.stringify({ pages: rows.length, min: MIN, buckets, thin }, null, 2));
} else {
  console.log('indexable pages:', rows.length);
  console.log('word-count buckets:', buckets);
  console.log('pages under ' + MIN + ' words:', thin.length);
  thin.slice(0, LIMIT).forEach((r) => console.log('  ' + r.words + '  ' + r.page + '  | ' + r.title.slice(0, 64)));
  if (thin.length > LIMIT) console.log('  … ' + (thin.length - LIMIT) + ' more');
}
if (thin.length) process.exitCode = 1;
