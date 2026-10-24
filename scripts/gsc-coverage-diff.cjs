#!/usr/bin/env node
// ============================================================
// CalcProMaster — Site-wide indexation tracker (coverage diff)
// ------------------------------------------------------------
// Do GSC coverage snapshots (same schema as data/gsc-coverage-report.json)
// ko URL-by-URL compare karta hai aur movement dikhata hai:
//   - kaunse pages INDEXED ho gaye (baseline se aage)
//   - kaunse naye index se gir gaye (regression)
//   - kaunse abhi bhi DISCOVERED/UNKNOWN hain (kaam bacha)
//
// Naya snapshot banane ke liye: GSC URL-inspection batches chalao, phir
//   node scripts/gsc-aggregate-coverage.cjs
// (ya koi export isi shape mein do).
//
// Usage:
//   node scripts/gsc-coverage-diff.cjs [--baseline data/gsc-coverage-report.json]
//                                      [--fresh data/gsc-coverage-report-new.json]
//                                      [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const argVal = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASELINE = path.join(ROOT, argVal('--baseline', path.join('data', 'gsc-coverage-report.json')));
const FRESH = path.join(ROOT, argVal('--fresh', path.join('data', 'gsc-coverage-report.json')));
const JSON_OUT = process.argv.includes('--json');

const norm = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/';

function loadCoverage(p) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const m = new Map();
  for (const [list, arr] of Object.entries(j.lists || {})) {
    for (const r of arr) m.set(norm(r.url), { cat: list, coverage: r.coverage });
  }
  return { ranAt: j.ranAt, urlCount: m.size, map: m, tally: j.tally || {} };
}

const base = loadCoverage(BASELINE);
const fresh = loadCoverage(FRESH);

// movement categories
const becameIndexed = [];   // was not INDEXED, now INDEXED
const regressed = [];       // was INDEXED, now not
const stillOut = [];        // not indexed in both
const onlyInFresh = [];     // new URLs in fresh (never inspected before)
const onlyInBase = [];      // gone from fresh

for (const [u, f] of fresh.map) {
  const b = base.map.get(u);
  const fIndexed = f.cat === 'INDEXED';
  if (!b) { onlyInFresh.push(u); continue; }
  const bIndexed = b.cat === 'INDEXED';
  if (!bIndexed && fIndexed) becameIndexed.push(u);
  else if (bIndexed && !fIndexed) regressed.push({ url: u, was: b.coverage, now: f.coverage });
  else if (!bIndexed && !fIndexed) stillOut.push(u);
}
for (const u of base.map.keys()) if (!fresh.map.has(u)) onlyInBase.push(u);

const sameSnapshot = base.ranAt === fresh.ranAt;

function pct(n, d) { return d ? Math.round(1000 * n / d) / 10 : 0; }

if (!JSON_OUT) {
  console.log('==========================================');
  console.log(' INDEXATION MOVEMENT (coverage diff)');
  console.log('==========================================');
  console.log('baseline: ' + BASELINE.replace(ROOT + path.sep, '') + '  (' + base.ranAt + ', ' + base.urlCount + ' URLs)');
  console.log('fresh   : ' + FRESH.replace(ROOT + path.sep, '') + '  (' + fresh.ranAt + ', ' + fresh.urlCount + ' URLs)');
  if (sameSnapshot) console.log('\n⚠  Dono files same snapshot hain (ranAt match) — asli movement ke liye naya export do.');
  console.log('');
  console.log('  ✅ became indexed : ' + becameIndexed.length);
  console.log('  ❌ regressed      : ' + regressed.length);
  console.log('  ⏳ still not indexed: ' + stillOut.length);
  console.log('  ＋ new URLs (fresh): ' + onlyInFresh.length);
  console.log('  － gone from fresh  : ' + onlyInBase.length);
  console.log('');
  console.log('Baseline indexed: ' + (base.tally.INDEXED || 0) + '/' + base.urlCount + ' (' + pct(base.tally.INDEXED || 0, base.urlCount) + '%)');
  console.log('Fresh indexed   : ' + (fresh.tally.INDEXED || 0) + '/' + fresh.urlCount + ' (' + pct(fresh.tally.INDEXED || 0, fresh.urlCount) + '%)');
  if (becameIndexed.length) {
    console.log('\nRecently indexed (first 30):');
    for (const u of becameIndexed.slice(0, 30)) console.log('  ✅ ' + u);
  }
  if (regressed.length) {
    console.log('\nRegressed (first 30):');
    for (const r of regressed.slice(0, 30)) console.log('  ❌ ' + r.url + '  (' + r.was + ' → ' + r.now + ')');
  }
} else {
  console.log(JSON.stringify({
    baseline: { file: BASELINE, ranAt: base.ranAt, urlCount: base.urlCount, indexed: base.tally.INDEXED || 0 },
    fresh: { file: FRESH, ranAt: fresh.ranAt, urlCount: fresh.urlCount, indexed: fresh.tally.INDEXED || 0 },
    becameIndexed, regressed, stillOut, onlyInFresh, onlyInBase,
  }, null, 2));
}
