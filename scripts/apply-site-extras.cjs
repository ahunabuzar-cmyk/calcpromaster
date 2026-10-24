#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — inject js/site-extras.js into every built page
 * ------------------------------------------------------------
 * WHY: the guides, blog, legal pages and prerendered long-form pages ship no
 * app bundle, so they had no calculator search and no reading controls at all.
 * The SPA has both. This adds the shared layer at BUILD time (one script tag
 * per page, deferred) instead of hand-editing 1,600 files.
 *
 * Idempotent: a page that already references site-extras.js is skipped, so
 * re-running the build never stacks duplicate tags.
 *
 * Excluded on purpose:
 *   embed/*          iframe widget — must stay minimal for third parties
 *   og-image.html    a PNG-render harness, not a user page
 *   .well-known/*    machine files
 *
 * Usage: node scripts/apply-site-extras.cjs [--check]
 *   --check → exit 1 if any eligible page is missing the tag (CI guard)
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'deploy');
const TAG = '<script src="/js/site-extras.js" defer></script>';
const CHECK = process.argv.includes('--check');

const SKIP_DIRS = new Set(['embed', 'node_modules', '.well-known', 'og', 'seo']);
// googled*.html is Google's site-verification file: it must stay byte-for-byte
// as Google served it, so nothing may be appended to it.
const SKIP_FILES = new Set(['og-image.html']);
const SKIP_PATTERN = /^googled[0-9a-f]+\.html$/i;

function walk(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, acc);
    } else if (e.isFile() && /\.html$/i.test(e.name) && !SKIP_FILES.has(e.name) && !SKIP_PATTERN.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function main() {
  if (!fs.existsSync(OUT)) {
    console.error('✗ deploy/ not found — run `node build-deploy.js` first');
    process.exit(1);
  }
  const files = walk(OUT, []);
  let changed = 0, already = 0, missing = [];

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    if (html.indexOf('/js/site-extras.js') !== -1) { already++; continue; }
    if (CHECK) { missing.push(path.relative(OUT, file)); continue; }
    if (html.indexOf('</body>') === -1) continue; // fragment, not a page
    const next = html.replace('</body>', '  ' + TAG + '\n</body>');
    fs.writeFileSync(file, next, 'utf8');
    changed++;
  }

  if (CHECK) {
    if (missing.length) {
      console.error('✗ site-extras.js missing on ' + missing.length + ' page(s):');
      missing.slice(0, 10).forEach((m) => console.error('   · ' + m));
      process.exit(1);
    }
    console.log('✓ site-extras.js present on all ' + files.length + ' built pages');
    return;
  }

  console.log('  site-extras: ' + changed + ' page(s) updated, ' + already + ' already had it (' + files.length + ' total)');
}

main();
