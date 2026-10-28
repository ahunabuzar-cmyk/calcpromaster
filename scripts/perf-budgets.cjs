#!/usr/bin/env node
/**
 * Performance Budgets — fails the build when bundles grow beyond agreed limits.
 * Budgets are for the PRERENDERED shell (what every page load pays), not the
 * whole repo. Values chosen from the 2026-09 baseline (see docs).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const D = path.join(__dirname, '..', 'deploy');
const KB = n => (n / 1024).toFixed(0) + 'KB';

const BUDGETS = [
  // 900KB = the 2026-10-26 measured baseline (841KB) + ~7% headroom. The old
  // 1600KB limit was never exercised against a real number because the metric
  // was broken (see below), so it could not have caught any regression.
  { id: 'eager-js-total', max: 900 * 1024, get: () => {
      const idx = fs.readFileSync(path.join(D, 'index.html'), 'utf8');
      // Strip the build's ?v=<hash> cache-bust token BEFORE resolving the path:
      // `js/app.js?v=0adf8e00c6` is not a file on disk, so existsSync() rejected
      // every entry and this budget reported 0KB / 1600KB on every run — a gate
      // that could never fire, on the one resource the CWV numbers are about.
      return [...idx.matchAll(/<script[^>]*src="([^"]+)"/g)]
        .map(m => path.join(D, m[1].replace(/^\//, '').split('?')[0]))
        .filter(p => fs.existsSync(p))
        .reduce((s, p) => s + fs.statSync(p).size, 0);
    } },
  // GZIPPED html, not raw bytes — transfer size is what a visitor pays. The
  // stylesheet is no longer inlined into the shell (removed 2026-10-26): the
  // source's own critical-CSS block + `preload as=style` swap is the better
  // fix, and the full stylesheet is now the same cacheable /styles.css the
  // prerendered pages already link.
  { id: 'index-html (gzip)', max: 50 * 1024, get: () => zlib.gzipSync(fs.readFileSync(path.join(D, 'index.html'))).length },
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
