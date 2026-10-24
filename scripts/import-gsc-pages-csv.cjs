#!/usr/bin/env node
// ============================================================
// CalcProMaster — GSC "Pages" CSV import (no OAuth needed)
// ------------------------------------------------------------
// Har GSC-fed report (consolidation queue, zero-click queue, exposure) ek hi
// shape padhta hai: data/gsc-page-impressions.json. Pehle wo sirf OAuth script
// se banta tha, is liye GSC ka UI export use nahi ho sakta tha — aur committed
// file 2026-10-14 par atki thi.
//
// GSC → Performance → Pages → Export → CSV download karo, phir:
//   node scripts/import-gsc-pages-csv.cjs <export.csv>
//   node scripts/import-gsc-pages-csv.cjs <export.csv> --start 2026-10-01 --end 2026-10-20
//
// GSC export me top rows "Top pages" table hote hain, phir "Search appearance",
// "Devices" waghera — is liye parser sirf wo rows leta hai jinka pehla column ek
// URL path hai, aur duplicate URL rows ko merge karta hai.
//
// GSC ka "Pages" CSV apne window ki dates nahi likhta (Filters.csv me sirf
// "Last 3 months" hota hai). Is liye window usi export folder ki "Chart.csv"
// se li gayi hai — uski pehli aur aakhri date hi asli range hai. Isse report
// apna window invent nahi karti; jo GSC ne export kiya wahi likha jaata hai.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'gsc-page-impressions.json');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
};

/**
 * Read the first/last date out of the export's Chart.csv (the daily trend that
 * GSC ships next to Pages.csv). Pure: takes the CSV text or null.
 * Returns { startDate, endDate } or null when no dates are present.
 */
function windowFromChart(csvText) {
  if (!csvText) return null;
  const dates = parseCsv(csvText)
    .slice(1)
    .map((cells) => (cells[0] || '').trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (!dates.length) return null;
  return { startDate: dates[0], endDate: dates[dates.length - 1] };
}

/** Minimal RFC-4180 CSV parser (quoted fields, embedded commas and newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const num = (s) => Number(String(s || '').replace(/[,%\s]/g, '')) || 0;

/** Turn GSC page rows into the repo's data shape. Exported for tests. */
function rowsToPages(rows) {
  const pages = {};
  for (const cells of rows) {
    if (!cells || cells.length < 5) continue;
    const rawUrl = (cells[0] || '').trim();
    // Only the "Top pages" table: an absolute URL or a path, plus 4 metrics.
    if (!/^https?:\/\//i.test(rawUrl) && !/^\//.test(rawUrl)) continue;
    const clicks = num(cells[1]);
    const impressions = num(cells[2]);
    if (!impressions) continue;
    const ctr = num(cells[3]);
    const position = num(cells[4]);
    const key = rawUrl;
    if (pages[key]) {
      pages[key].clicks += clicks;
      pages[key].impressions += impressions;
      pages[key].position = position || pages[key].position;
    } else {
      pages[key] = {
        clicks,
        impressions,
        ctr: ctr ? Math.round(ctr * 10000) / 1000000 : 0,
        position: Math.round(position * 10) / 10,
      };
    }
  }
  for (const p of Object.values(pages)) {
    p.ctr = p.impressions ? Math.round((p.clicks / p.impressions) * 10000) / 10000 : 0;
  }
  return pages;
}

function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) {
    console.error('usage: node scripts/import-gsc-pages-csv.cjs <gsc-pages-export.csv> [--start YYYY-MM-DD --end YYYY-MM-DD]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error('  ✗ file not found: ' + file);
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const pages = rowsToPages(rows);
  const count = Object.keys(pages).length;
  if (!count) {
    console.error('  ✗ no page rows found — is this the GSC "Pages" CSV export?');
    process.exit(1);
  }
  const impressions = Object.values(pages).reduce((s, p) => s + p.impressions, 0);
  const chartPath = path.join(path.dirname(file), 'Chart.csv');
  const chartWindow = fs.existsSync(chartPath)
    ? windowFromChart(fs.readFileSync(chartPath, 'utf8'))
    : null;
  const startDate = arg('--start') || (chartWindow && chartWindow.startDate) || null;
  const endDate = arg('--end') || (chartWindow && chartWindow.endDate) || null;
  const payload = {
    ranAt: new Date().toISOString(),
    site: 'https://calcpromaster.com',
    source: path.basename(file),
    days: null,
    startDate,
    endDate,
    count,
    impressions,
    pages,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log('imported ' + count + ' page rows (' + impressions.toLocaleString('en-US') + ' impressions)');
  console.log('  window: ' + (startDate || '?') + ' -> ' + (endDate || '?') +
    (chartWindow ? ' (from Chart.csv)' : ' (pass --start/--end)'));
  console.log('  wrote ' + path.relative(ROOT, OUT));
  console.log('  next: node scripts/build-consolidation-queue.cjs && node scripts/build-zero-click-queue.cjs');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('import-gsc-pages-csv crashed: ' + (e && e.message)); process.exit(1); }
}

module.exports = { parseCsv, rowsToPages, windowFromChart };
