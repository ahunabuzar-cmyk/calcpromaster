#!/usr/bin/env node
// ============================================================
// CalcProMaster — Parse a GSC "Coverage / Page indexing" CSV export
// ------------------------------------------------------------
// GSC ka site-wide Coverage data **UI-only** hai (koi public API nahi), is liye
// har hafte GSC → Indexing → Pages → Export karke ek ZIP milta hai. ZIP kholo,
// uske andar ye 4 CSV hoti hain:
//   Chart.csv               → date, Not indexed, Indexed, Impressions (daily)
//   Critical issues.csv     → Reason, Source, Validation, Pages
//   Non-critical issues.csv → (usually khaali)
//   Metadata.csv            → Property / Value
//
// Ye script un CSVs ko padh kar ek normalized JSON banati hai taaki baaki
// scripts (diff / plan / report) usi ko use kar sakein:
//   node scripts/parse-gsc-coverage-export.cjs --dir data/gsc-coverage-export-2026-10-09
//
// Output: data/gsc-coverage-fresh.json  (+ console summary)
//
// Usage:
//   node scripts/parse-gsc-coverage-export.cjs [--dir <folder>] [--out <file>]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const argVal = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DIR = argVal('--dir', path.join('data', 'gsc-coverage-export'));
const OUT = argVal('--out', path.join('data', 'gsc-coverage-fresh.json'));

// ---- tiny CSV reader (handles quoted fields + CRLF) ----
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length && !(r.length === 1 && r[0].trim() === ''));
}

function readTable(file) {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(abs)) return null;
  return parseCsv(fs.readFileSync(abs, 'utf8'));
}

// ---- load the 4 export files ----
const absDir = path.isAbsolute(DIR) ? DIR : path.join(ROOT, DIR);
if (!fs.existsSync(absDir)) {
  console.error('❌ folder nahi mila: ' + DIR);
  console.error('   GSC export ZIP kholo aur --dir se us folder ka path do.');
  process.exit(1);
}
const chart = readTable(path.join(absDir, 'Chart.csv'));
const critical = readTable(path.join(absDir, 'Critical issues.csv'));
const nonCritical = readTable(path.join(absDir, 'Non-critical issues.csv'));
const metadata = readTable(path.join(absDir, 'Metadata.csv'));

// ---- Chart.csv: last row that actually has numbers = the real snapshot ----
let latest = null;
let series = [];
if (chart) {
  for (const r of chart.slice(1)) {
    const date = (r[0] || '').trim();
    const notIndexed = r[1] === '' || r[1] == null ? null : parseInt(r[1], 10);
    const indexed = r[2] === '' || r[2] == null ? null : parseInt(r[2], 10);
    const impressions = r[3] === '' || r[3] == null ? null : parseInt(r[3], 10);
    series.push({ date, notIndexed, indexed, impressions });
    if (Number.isFinite(notIndexed) && Number.isFinite(indexed)) {
      latest = { date, notIndexed, indexed };
    }
  }
}

// ---- Critical issues.csv: Reason, Source, Validation, Pages ----
const issues = [];
if (critical) {
  for (const r of critical.slice(1)) {
    const reason = (r[0] || '').trim();
    if (!reason) continue;
    issues.push({
      reason,
      source: (r[1] || '').trim(),
      validation: (r[2] || '').trim(),
      pages: parseInt(r[3], 10) || 0,
    });
  }
}

const sum = (pred) => issues.filter(pred).reduce((a, i) => a + i.pages, 0);
const websiteFaults = sum((i) => /website/i.test(i.source));
const googleSystems = sum((i) => /google/i.test(i.source));
const totalNotIndexed = issues.reduce((a, i) => a + i.pages, 0);

const now = new Date().toISOString();
const payload = {
  ranAt: now,
  exportedFor: (metadata && metadata[1] && metadata[1][1]) ? metadata[1][1].trim() : null,
  source: DIR.replace(/\\/g, '/'),
  latest,
  series,
  issues,
  totals: {
    indexed: latest ? latest.indexed : null,
    notIndexed: latest ? latest.notIndexed : totalNotIndexed,
    websiteFaults,
    googleSystems,
    issueRowSum: totalNotIndexed,
  },
  nonCritical: (nonCritical || []).slice(1).filter((r) => (r[0] || '').trim()).map((r) => ({ reason: r[0].trim(), pages: parseInt(r[3], 10) || 0 })),
};

const outPath = path.isAbsolute(OUT) ? OUT : path.join(ROOT, OUT);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

// ---- console summary ----
console.log('📥 GSC coverage export parsed — ' + payload.source);
if (latest) {
  const pct = (100 * latest.indexed / (latest.indexed + latest.notIndexed)).toFixed(1);
  console.log('   snapshot ' + latest.date + ':  Indexed ' + latest.indexed + '  ·  Not indexed ' + latest.notIndexed + '  (' + pct + '% indexed)');
} else {
  console.log('   ⚠ Chart.csv mein koi complete daily row nahi mili (Indexed/Not indexed khaali hain).');
}
console.log('\n   Critical issues (by reason):');
for (const i of [...issues].sort((a, b) => b.pages - a.pages)) {
  console.log('     ' + String(i.pages).padStart(5) + '  ' + i.reason + '   [' + i.source + ']');
}
console.log('\n   Website-side faults : ' + websiteFaults);
console.log('   Google-systems side : ' + googleSystems);
console.log('💾 ' + OUT);
