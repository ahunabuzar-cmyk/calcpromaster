#!/usr/bin/env node
// One-off measurement before deciding what the sitewide audit should gate on.
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./audit-seo-placeholders.cjs');

const ROOT = path.join(__dirname, '..');
const FILES = [];
for (const dir of ['guides', 'blog', 'hub']) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith('.html')) FILES.push(path.join(dir, f));
}
for (const f of ['index.html', 'about.html']) FILES.push(f);
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter((x) => /^seo-premium/.test(x))) FILES.push(path.join('js', f));
for (const f of ['js/category-depth.js', 'js/category-hub.js']) if (fs.existsSync(path.join(ROOT, f))) FILES.push(f);

const SHAPES = [
  ['RAW_LABEL', A.RAW_LABEL],
  ['the undefined', /the undefined/],
  ['the page calculator', /the page calculator/],
  ['cannot directly convert', /cannot directly convert/],
  ['verb in noun slot', A.INTRO_BAD_FRAME],
  ['artifact [object/NaN', /\[object |\bNaN\b/],
  ['double space', /  /]
];

console.log('files scanned:', FILES.length);
const totals = {};
for (const rel of FILES) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const [name, re] of SHAPES) {
    const m = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
    if (!m) continue;
    totals[name] = (totals[name] || 0) + m.length;
    console.log('  ' + name.padEnd(24) + ' ' + rel.padEnd(28) + ' x' + m.length + '  e.g. ' + JSON.stringify(m[0].slice(0, 60)));
  }
}
console.log('\ntotals:', JSON.stringify(totals, null, 1));
