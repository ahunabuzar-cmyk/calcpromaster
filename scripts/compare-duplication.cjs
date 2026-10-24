#!/usr/bin/env node
// ============================================================
// CalcProMaster — duplicate content: baseline + compare
// ------------------------------------------------------------
// scripts/audit-n-gram-duplication.cjs writes data/duplicate-content-report.json
// from the built deploy/ pages. This script locks a snapshot and later compares
// the live report against it, so \"did the rewrite actually help?\" is answered
// with numbers instead of memory.
//
//   node scripts/compare-duplication.cjs --save     # write/refresh the baseline
//   node scripts/compare-duplication.cjs            # compare current vs baseline
//   node scripts/compare-duplication.cjs --fail-on-regression
//
// The comparison prints deltas for every headline metric and exits 1 when
// --fail-on-regression is passed and duplicated share got worse by more than
// TOLERANCE points (default 1.0), so it can gate CI.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'data', 'duplicate-content-report.json');
const BASELINE = path.join(ROOT, 'data', 'duplicate-content-baseline.json');
const SAVE = process.argv.includes('--save');
const FAIL = process.argv.includes('--fail-on-regression');
const TOLERANCE = 1.0;

const METRICS = [
  ['siteDupSharePct', '7-gram duplicated share', '%', -1],
  ['pagesOver40Pct', 'pages over 40% shared', '', -1],
  ['repeatedContentSentences', 'editorial sentence repeats', '', -1],
  ['repeatedBoilerplateSentences', 'boilerplate sentence repeats', '', 0],
  ['duplicateTitles', 'duplicate titles', '', -1],
  ['duplicateMetaDescriptions', 'duplicate meta descriptions', '', -1],
  ['pagesUnder400Words', 'pages under 400 words', '', -1]
];

if (!fs.existsSync(REPORT)) {
  console.error('missing ' + path.relative(ROOT, REPORT) + ' — run: node scripts/audit-n-gram-duplication.cjs');
  process.exit(1);
}
const current = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

if (SAVE) {
  const snapshot = Object.assign({}, current, {
    baselineSavedAt: new Date().toISOString(),
    reviewAfter: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  });
  fs.writeFileSync(BASELINE, JSON.stringify(snapshot, null, 2));
  console.log('✔ baseline saved → ' + path.relative(ROOT, BASELINE));
  console.log('  ' + snapshot.pages + ' pages · 7-gram share ' + snapshot.siteDupSharePct + '% · ' +
    (snapshot.repeatedContentSentences || 0) + ' editorial sentence repeats');
  console.log('  review after ' + snapshot.reviewAfter + ' (3 weeks)');
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('no baseline yet — run: node scripts/compare-duplication.cjs --save');
  process.exit(1);
}
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
function fmt(v, unit) { return v === undefined ? '—' : v + unit; }

console.log('==========================================');
console.log(' DUPLICATE CONTENT — baseline vs current');
console.log('==========================================');
console.log('baseline : ' + (base.baselineSavedAt || base.ranAt) + '  (review after ' + (base.reviewAfter || '—') + ')');
console.log('current  : ' + current.ranAt);
console.log('');
console.log(pad('metric', 32) + pad('baseline', 12) + pad('current', 12) + 'delta');

let regression = false;
for (const [key, label, unit, direction] of METRICS) {
  const b = base[key];
  const c = current[key];
  if (typeof b !== 'number' || typeof c !== 'number') continue;
  const d = +(c - b).toFixed(1);
  const arrow = d === 0 ? '=' : d > 0 ? '+' : '';
  if (direction < 0 && d > TOLERANCE) regression = true;
  console.log(pad(label, 32) + pad(fmt(b, unit), 12) + pad(fmt(c, unit), 12) + arrow + d + unit);
}

// The individual repeated sentences are the actionable list: what is still
// shared, and on how many pages.
const before = new Set((base.repeatedSentences || []).map((r) => r.text));
const still = (current.repeatedSentences || []).filter((r) => before.has(r.text));
console.log('');
console.log('still repeated (was repeated at baseline): ' + still.length + ' / ' + (current.repeatedSentences || []).length);
for (const r of still.slice(0, 8)) console.log('  ' + String(r.pages).padStart(4) + 'x  ' + r.text.slice(0, 110));

const fixed = (base.repeatedSentences || []).filter((r) => !(current.repeatedSentences || []).some((c) => c.text === r.text));
console.log('');
console.log('no longer repeated: ' + fixed.length);
for (const r of fixed.slice(0, 8)) console.log('  ✓ ' + r.text.slice(0, 110));

if (FAIL && regression) {
  console.error('\n✖ duplicated share regressed by more than ' + TOLERANCE + ' points — see the table above.');
  process.exit(1);
}
console.log('\n' + (regression ? '⚠ duplicated share is higher than the baseline.' : '✔ no regression against the baseline.'));
