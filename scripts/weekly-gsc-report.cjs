#!/usr/bin/env node
/**
 * weekly-gsc-report.cjs — 100k impressions goal tracker
 *
 * GSC Performance CSV (Queries ya Pages export) ko parse karke hafta-war
 * progress report banata hai. GSC UI: Performance → Last 7 days → Export → CSV.
 *
 * Usage:
 *   node scripts/weekly-gsc-report.cjs "downloads/Performance on Search Results.csv"
 *   node scripts/weekly-gsc-report.cjs week1.csv week2.csv   # multiple weeks (order: purani → nayi)
 *
 * Output: console report + docs/GSC-PROGRESS.md ke liye numbers.
 */

const fs = require('fs');
const path = require('path');

const GOAL_30D = 100000; // 100,000 impressions in 30 days

function parseGscCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // GSC CSV: pehli line property summary (comma junk), phir blank, phir header
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const headerIdx = lines.findIndex(l => /^("?Top )?(queries|pages)/i.test(l) || /^"?Query"?/i.test(l));
  if (headerIdx < 0) throw new Error('GSC CSV header nahi mila: ' + filePath);

  const header = lines[headerIdx];
  // Robust CSV split (quoted commas handle karo)
  const splitCsv = (line) => {
    const out = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };

  const cols = splitCsv(header).map(c => c.replace(/"/g, '').toLowerCase());
  const qIdx = cols.findIndex(c => c === 'top queries' || c === 'query' || c === 'top pages' || c === 'page');
  const impIdx = cols.findIndex(c => c.includes('impression'));
  const clkIdx = cols.findIndex(c => c.includes('click'));
  const posIdx = cols.findIndex(c => c.includes('position'));
  if (impIdx < 0 || clkIdx < 0) throw new Error('Impressions/Clicks columns nahi mile: ' + header);

  let impressions = 0, clicks = 0, rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const parts = splitCsv(lines[i]);
    const imp = parseInt(String(parts[impIdx]).replace(/,/g, ''), 10) || 0;
    const clk = parseInt(String(parts[clkIdx]).replace(/,/g, ''), 10) || 0;
    impressions += imp; clicks += clk;
    const key = qIdx >= 0 ? parts[qIdx] : ('row-' + i);
    const pos = posIdx >= 0 ? parseFloat(parts[posIdx]) : null;
    if (imp > 0 || clk > 0) rows.push({ key, imp, clk, pos });
  }
  rows.sort((a, b) => b.imp - a.imp);
  return { impressions, clicks, rows };
}

function fmt(n) { return n.toLocaleString('en-US'); }

function report(files) {
  console.log('\n════════ GSC WEEKLY REPORT — 100k GOAL TRACKER ════════\n');
  let total = 0;
  files.forEach((f, i) => {
    const d = parseGscCsv(f);
    total += d.impressions;
    const weekNo = i + 1;
    const ctr = d.impressions ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00';
    console.log(`Week ${weekNo}: ${path.basename(f)}`);
    console.log(`  Impressions: ${fmt(d.impressions)} | Clicks: ${fmt(d.clicks)} | CTR: ${ctr}%`);
    console.log(`  Top 5 queries/pages:`);
    d.rows.slice(0, 5).forEach((r, j) => {
      console.log(`    ${j + 1}. ${r.key} — ${fmt(r.imp)} imp${r.pos ? `, pos ${r.pos.toFixed(1)}` : ''}`);
    });
    console.log('');
  });

  console.log('───────────────────────────────────────────');
  console.log(`TOTAL (in ${files.length} week${files.length > 1 ? 's' : ''}): ${fmt(total)} impressions`);
  const pct = ((total / GOAL_30D) * 100).toFixed(1);
  console.log(`GOAL: ${fmt(GOAL_30D)} (30 din) — PROGRESS: ${pct}%`);
  const remaining = GOAL_30D - total;
  if (remaining > 0 && files.length > 0) {
    const perWeek = Math.ceil(remaining / (4 - files.length > 0 ? 4 - files.length : 1));
    console.log(`Bacha hua: ${fmt(remaining)} — lagbhag ${fmt(perWeek)}/hafta chahiye.`);
  }
  console.log('\nNEXT: ye numbers docs/GSC-PROGRESS.md mein update karo.');
  console.log('═══════════════════════════════════════════\n');

  return total;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.log('Usage: node scripts/weekly-gsc-report.cjs <gsc-export.csv> [more.csv ...]');
  console.log('GSC: Performance → Date range (Last 7 days) → Export → CSV → Downloads');
  process.exit(1);
}
report(args);
