#!/usr/bin/env node
// Dev-only read-only probe: how many built pages carry FAQPage / HowTo schema.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', 'deploy', '.wrangler', '.git', 'SEO-IMPROVEMENT', '.tmp-scan', 'tmp']);
function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('.') || SKIP.has(f.name)) continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const rows = [];
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  rows.push({
    rel: path.relative(ROOT, f).replace(/\\/g, '/'),
    faq: /"@type"\s*:\s*"FAQPage"/.test(h),
    howto: /"@type"\s*:\s*"HowTo"/.test(h),
    h3: (h.match(/<h3/gi) || []).length,
  });
}
const withFaq = rows.filter((r) => r.faq);
console.log('html files        ' + rows.length);
console.log('FAQPage schema    ' + withFaq.length);
console.log('HowTo schema      ' + rows.filter((r) => r.howto).length);
const noFaq = rows.filter((r) => !r.faq);
console.log('missing FAQPage   ' + noFaq.length);
for (const r of noFaq.slice(0, 25)) console.log('  · ' + r.rel);
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
