#!/usr/bin/env node
// Title-length gate (SERP containment).
//
// Why: a <title> under ~30 chars wastes SERP real estate and reads as thin;
// one over ~60 chars gets truncated around the ~600px SERP display width
// (≈55–60 Latin chars). Both are crawl-report / SEO-QA warnings we already
// fixed by hand — this gate stops them from creeping back in on the next build.
//
// Length is measured on the DECODED text (entities like &amp; / &quot; are
// counted as one visible character, matching what Google shows), not the raw
// HTML. Clean, deterministic rule: MIN <= len <= MAX.
//
// noindex pages are skipped: they never appear in the SERP, so their titles
// (e.g. the long-tail variant pages like /finance/mortgage/15-years-…/) are
// out of scope.
//
// Usage: node scripts/audit-title-length.cjs [--json]
// Exit code 1 on any violation so it can gate the build.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const JSON_OUT = process.argv.includes('--json');

const MIN = 30;
const MAX = 60;

// Non-indexable app-shell / error artifacts: their titles are not SERP titles.
const SKIP_FILES = new Set(['404.html']);
const SKIP_DIRS = new Set(['js', 'css', 'fonts', 'og', 'icons', 'docs', 'admin', 'assets', 'images']);

if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ not found — run `node build-deploy.js` first.');
  process.exit(1);
}

const decode = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&#x27;/gi, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const tooShort = [], tooLong = [];
let pages = 0, skippedNoindex = 0;

(function walk(dir) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(e)) continue;
      walk(p);
      continue;
    }
    if (!e.endsWith('.html') || SKIP_FILES.has(e)) continue;
    const html = fs.readFileSync(p, 'utf8');
    const m = html.match(/<title>([^<]*)<\/title>/i);
    if (!m) continue;
    // noindex pages have no SERP title — their length is not a finding.
    if (/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) { skippedNoindex++; continue; }
    pages++;
    const title = decode(m[1]).trim();
    const url = '/' + path.relative(DEPLOY, p).split(path.sep).join('/').replace(/index\.html$/, '');
    if (title.length < MIN) tooShort.push({ url, len: title.length, title });
    else if (title.length > MAX) tooLong.push({ url, len: title.length, title });
  }
})(DEPLOY);

const fail = tooShort.length || tooLong.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ pages, min: MIN, max: MAX, tooShort, tooLong }, null, 2));
} else {
  console.log('==========================================');
  console.log(' TITLE-LENGTH GATE (' + MIN + '\u2013' + MAX + ' chars, decoded)');
  console.log('==========================================');
  console.log('pages scanned : ' + pages + '  (noindex skipped: ' + skippedNoindex + ')');
  console.log('too short     : ' + tooShort.length);
  for (const t of tooShort.slice(0, 20)) console.log('  \u2717 ' + t.len + '  ' + t.url + '  \u2014 "' + t.title + '"');
  if (tooShort.length > 20) console.log('  \u2026 +' + (tooShort.length - 20) + ' more');
  console.log('too long      : ' + tooLong.length);
  for (const t of tooLong.slice(0, 20)) console.log('  \u2717 ' + t.len + '  ' + t.url + '  \u2014 "' + t.title + '"');
  if (tooLong.length > 20) console.log('  \u2026 +' + (tooLong.length - 20) + ' more');
  const ok = !tooShort.length && !tooLong.length;
  console.log(ok ? '\u2705 PASS \u2014 every title is within ' + MIN + '\u2013' + MAX + ' chars' : '\u274c FAIL \u2014 title length out of range');
}

// Fail hard: exit 1 either way (when required from build-deploy.js this aborts
// the build). On success, only exit when run directly as a CLI so the build's
// later gates still run.
if (fail) process.exit(1);
if (require.main === module) process.exit(0);
