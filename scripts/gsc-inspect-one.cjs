#!/usr/bin/env node
// ============================================================
// CalcProMaster — inspect one (or a few) URLs and print the FULL verdict
// ------------------------------------------------------------
// The other inspection scripts (gsc-inspect-list.cjs, gsc-batch-inspect.cjs) are
// built for volume and keep only `coverageState` + `verdict`. When a single URL
// needs an explanation — "why is this page not indexed?" — the useful fields are
// userCanonical, googleCanonical, lastCrawlTime, pageFetchState and indexingState,
// and those never got printed anywhere. This prints all of them.
//
// Usage:
//   node scripts/gsc-inspect-one.cjs /guides/break-even /everyday/snow-day
//   node scripts/gsc-inspect-one.cjs --json /guides/break-even
//
// Needs the same OAuth credentials as the other GSC scripts
// (see docs/api-credentials-setup.md). Read-only: it calls urlInspection.index:inspect.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { token, request } = require('./lib/gsc-inspect.cjs');

const ROOT = path.join(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');

// Site URL from site-config (single source of truth), overridable via env.
let SITE = (process.env.GSC_SITE_URL || '').replace(/[\\/]+$/, '');
if (!SITE) {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) SITE = 'https://' + m[1].replace(/^https?:\/\//, '');
  } catch (e) { /* fall through */ }
}
if (!SITE) SITE = 'https://calcpromaster.com';

const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('usage: node scripts/gsc-inspect-one.cjs [--json] <path|url> [...]');
  process.exit(1);
}

(async () => {
  const tok = await token();
  const out = [];
  for (const t of targets) {
    const url = /^https?:\/\//.test(t) ? t : SITE + (t.startsWith('/') ? t : '/' + t);
    try {
      const r = await request('POST', '/v1/urlInspection/index:inspect',
        { inspectionUrl: url, siteUrl: SITE + '/', languageCode: 'en' }, tok);
      const idx = (r.inspectionResult && r.inspectionResult.indexStatusResult) || {};
      const row = {
        url,
        verdict: idx.verdict || null,
        coverageState: idx.coverageState || null,
        userCanonical: idx.userCanonical || null,
        googleCanonical: idx.googleCanonical || null,
        lastCrawlTime: idx.lastCrawlTime || null,
        pageFetchState: idx.pageFetchState || null,
        indexingState: idx.indexingState || null,
      };
      out.push(row);
      if (!JSON_OUT) {
        console.log('=== ' + row.url);
        console.log('  verdict         :', row.verdict);
        console.log('  coverageState   :', row.coverageState);
        console.log('  userCanonical   :', row.userCanonical);
        console.log('  googleCanonical :', row.googleCanonical);
        console.log('  lastCrawlTime   :', row.lastCrawlTime);
        console.log('  pageFetchState  :', row.pageFetchState);
        console.log('  indexingState   :', row.indexingState);
      }
    } catch (e) {
      console.error('=== ' + url + '\n  ERROR: ' + e.message);
      process.exitCode = 1;
    }
  }
  if (JSON_OUT) console.log(JSON.stringify({ ranAt: new Date().toISOString(), site: SITE, results: out }, null, 2));
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
