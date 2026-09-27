#!/usr/bin/env node
// ============================================================
// CalcProMaster — Aggregate GSC URL-inspection batches #1–#14
// Merges batch JSONs (batch #1/#2 recovered from git history) into
// data/gsc-coverage-report.json + prints an actionable summary.
// Usage: node scripts/gsc-aggregate-coverage.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const SITE = 'https://calcpromaster.com';

// ---- collect batch files (disk) ----
const batches = [];
const bdir = path.join(DATA, 'batches');
if (fs.existsSync(bdir)) {
  const files = fs.readdirSync(bdir)
    .filter(f => /^batch-skip\d+\.json$/.test(f))
    .sort((a, b) => {
      const n = s => parseInt((s.match(/skip(\d+)/) || [0, 0])[1], 10);
      return n(a) - n(b);
    });
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(bdir, f), 'utf8'));
    batches.push({ name: f.replace('.json', ''), ...j });
  }
}

// ---- batch #1 (skip 0, 9 URLs) + batch #2 (skip 100) recovered from git ----
function fromGit(commit) {
  try {
    const raw = execSync('git show ' + commit + ':data/gsc-inspect-batch.json', { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const j = JSON.parse(raw);
    if (j.site === SITE || (j.site || '').startsWith('https://calcpromaster.com')) {
      batches.unshift({ name: 'git-' + commit.slice(0, 7), ...j });
      return true;
    }
  } catch (e) { return false; }
  return false;
}
fromGit('3be1923'); // batch #2 (skip 100, 21 URLs)
fromGit('887a883'); // batch #1 (skip 0, 9 URLs) — unshift puts it first

// ---- merge, dedupe by URL (later batches override) ----
const byUrl = new Map();
for (const b of batches) {
  for (const r of (b.results || [])) {
    if (r && r.url) byUrl.set(r.url, { url: r.url, verdict: r.verdict, coverage: r.coverage, batch: b.name });
  }
}

// ---- categorize ----
const CAT = {
  INDEXED: ['Submitted and indexed', 'Indexed, not submitted in sitemap'],
  CRAWLED_NOT_INDEXED: ['Crawled - currently not indexed'],
  DISCOVERED: ['Discovered - currently not indexed'],
  UNKNOWN: ['URL is unknown to Google'],
  REDIRECT: ['Page with redirect', 'Redirect error'],
  SOFT404: ['Soft 404'],
  SERVER_ERR: ['Server error (5xx)', 'Server error'],
  NOINDEX: ['Excluded by noindex tag', 'Excluded by \'noindex\' tag'],
  CANONICAL: ['Alternate page with proper canonical tag', 'Duplicate without user-selected canonical', 'Duplicate, Google chose different canonical than user'],
};
function catOf(coverage) {
  for (const [cat, strs] of Object.entries(CAT)) {
    if (strs.some(s => (coverage || '').toLowerCase().includes(s.toLowerCase()))) return cat;
  }
  if ((coverage || '').toLowerCase().includes('indexed')) return 'INDEXED';
  if ((coverage || '').startsWith('HTTP_') || coverage === 'API_ERROR') return 'API_ERROR';
  return 'OTHER';
}

const tally = {};
const lists = {};
for (const r of byUrl.values()) {
  const c = catOf(r.coverage);
  tally[c] = (tally[c] || 0) + 1;
  (lists[c] = lists[c] || []).push(r);
}

// ---- report ----
const report = {
  ranAt: new Date().toISOString(),
  site: SITE,
  batches: batches.map(b => ({ name: b.name, count: b.count, ranAt: b.ranAt })),
  uniqueUrls: byUrl.size,
  tally,
  lists: Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.map(r => ({ url: r.url.replace(SITE, '') || '/', coverage: r.coverage, batch: r.batch }))])),
};
const out = path.join(DATA, 'gsc-coverage-report.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));

// ---- console summary ----
console.log('=== GSC Coverage — aggregated ' + batches.length + ' batches, ' + byUrl.size + ' unique URLs ===\n');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + String(v).padStart(4) + '  ' + k);
}
const pct = Math.round(100 * (tally.INDEXED || 0) / byUrl.size);
console.log('\nIndexed: ' + (tally.INDEXED || 0) + '/' + byUrl.size + ' (' + pct + '%)');
console.log('💾 ' + out);

// lists of problem URLs (first 15 each)
for (const c of ['CRAWLED_NOT_INDEXED', 'DISCOVERED', 'UNKNOWN', 'API_ERROR', 'SERVER_ERR', 'SOFT404']) {
  if (lists[c] && lists[c].length) {
    console.log('\n--- ' + c + ' (' + lists[c].length + ') first ' + Math.min(15, lists[c].length) + ' ---');
    for (const r of lists[c].slice(0, 15)) console.log('  ' + (r.url.replace(SITE, '') || '/') + '  [' + r.coverage + ']');
  }
}
