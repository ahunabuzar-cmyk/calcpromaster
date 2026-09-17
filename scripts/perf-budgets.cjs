#!/usr/bin/env node
/**
 * Performance Budgets — fails the build when bundles grow beyond agreed limits.
 * Budgets are for the PRERENDERED shell (what every page load pays), not the
 * whole repo. Values chosen from the 2026-09 baseline (see docs).
 */
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '..', 'deploy');
const KB = n => (n / 1024).toFixed(0) + 'KB';

const BUDGETS = [
  { id: 'eager-js-total', max: 1600 * 1024, get: () => {
      const idx = fs.readFileSync(path.join(D, 'index.html'), 'utf8');
      return [...idx.matchAll(/<script[^>]*src="([^"]+)"/g)]
        .map(m => path.join(D, m[1].replace(/^\//, '')))
        .filter(p => fs.existsSync(p))
        .reduce((s, p) => s + fs.statSync(p).size, 0);
    } },
  { id: 'index-html', max: 90 * 1024, get: () => fs.statSync(path.join(D, 'index.html')).size },
  { id: 'styles-css', max: 110 * 1024, get: () => fs.statSync(path.join(D, 'styles.css')).size },
  { id: 'fonts-total', max: 120 * 1024, get: () => {
      const dir = path.join(D, 'fonts');
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
    } },
  { id: 'sitemap-xml', max: 600 * 1024, get: () => fs.statSync(path.join(D, 'sitemap.xml')).size },
];

let fail = 0;
console.log('==========================================');
console.log(' PERFORMANCE BUDGETS');
console.log('==========================================');
for (const b of BUDGETS) {
  const v = b.get();
  const ok = v <= b.max;
  if (!ok) fail++;
  console.log((ok ? '✓' : '✗ OVER') + ' ' + b.id + ': ' + KB(v) + ' / budget ' + KB(b.max));
}
if (fail) { console.log('✗ ' + fail + ' budget(s) exceeded'); process.exit(1); }
console.log('✅ PASS — all budgets met');
