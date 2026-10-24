#!/usr/bin/env node
// ============================================================
// CalcProMaster — Tool Registry Health Check
// Fixes `npm run check` (package.json referenced this file but it
// did not exist). Validates the tool registry WITHOUT executing
// browser code: scans js/data/*.js for tool definitions and checks
// IDs, duplicates, and SEO content coverage.
//
// Usage:  npm run check   (or: node scripts/check-all-tools.js)
// Exit:   0 = healthy, 1 = problems found
// ============================================================
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));

// Read the REAL registry, not a guess at its punctuation.
//
// The previous version regex-scanned for `{ id: '...'` at the start of a line,
// which cannot tell a tool object from the first field of a multi-line `inputs:`
// array (`{ id: 'chargerCost', ...` looks identical). Measured 2026-10-17: it
// reported 187 tools "without intro" that were really input-field ids, and 82
// intros "without a tool" that were real calculators. Every data file exports
// its array (`module.exports`), so requiring them is exact and cheap.
const problemsNote = [];
const counts = {};
const idLocs = {};
let total = 0;
let loadFailures = 0;

for (const f of files) {
  let tools;
  try {
    tools = require(path.join(dataDir, f));
  } catch (e) {
    loadFailures++;
    console.log('!!! DATA FILE WILL NOT LOAD: ' + f + ' — ' + e.message);
    continue;
  }
  if (!Array.isArray(tools)) continue;
  for (const t of tools) {
    if (!t || typeof t.id !== 'string') continue;
    total++;
    counts[t.id] = (counts[t.id] || 0) + 1;
    (idLocs[t.id] = idLocs[t.id] || []).push(f);
  }
}
if (loadFailures) problemsNote.push(loadFailures + ' data file(s) failed to load');

const uniqueIds = Object.keys(counts).length;
const duplicates = Object.entries(counts).filter(([, n]) => n > 1);
let problems = 0;

console.log('=== Tool Registry Check ===');
console.log('Total tool definitions :', total);
console.log('Unique tool IDs        :', uniqueIds);

if (duplicates.length) {
  problems++;
  console.log('!!! DUPLICATE TOOL IDS:');
  for (const [id, n] of duplicates) console.log(`  ${id} x${n} -> ${idLocs[id].join(', ')}`);
} else {
  console.log('Duplicate tool IDs     : NONE ✓');
}

// SEO content coverage (js/seo-content.js = per-tool TOOL_SEO)
const seoFile = path.join(__dirname, '..', 'js', 'seo-content.js');
if (fs.existsSync(seoFile)) {
  const seoSrc = fs.readFileSync(seoFile, 'utf8');
  const seoKeys = [...seoSrc.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(m => m[1]);
  const missing = uniqueIds ? Object.keys(counts).filter(id => !seoKeys.includes(id)) : [];
  const extra = seoKeys.filter(k => !counts[k]);
  console.log('SEO content entries     :', seoKeys.length);
  if (missing.length) {
    problems++;
    console.log('!!! TOOLS WITHOUT SEO CONTENT:', missing.length, missing.slice(0, 20));
  } else {
    console.log('Tools without SEO       : NONE ✓');
  }
  if (extra.length) {
    console.log('(note) SEO keys w/o tool :', extra.length, extra.slice(0, 10));
  }
} else {
  console.log('(note) js/seo-content.js not found — skipping SEO coverage check');
}

// Intro coverage (js/tool-intros.js)
const introFile = path.join(__dirname, '..', 'js', 'tool-intros.js');
if (fs.existsSync(introFile)) {
  const introSrc = fs.readFileSync(introFile, 'utf8');
  // intros are "key": "string" (double-quoted keys, string values) — not 'key': { objects
  const introKeys = [...introSrc.matchAll(/^\s*["']([^"']+)["']:\s*["'{]/gm)].map(m => m[1]);
  const missingIntros = uniqueIds ? Object.keys(counts).filter(id => !introKeys.includes(id)) : [];
  const extraIntros = introKeys.filter(k => !counts[k]);
  console.log('Intro entries           :', introKeys.length);
  if (missingIntros.length) {
    problems++;
    console.log('!!! TOOLS WITHOUT INTRO:', missingIntros.length, missingIntros.slice(0, 20));
  } else {
    console.log('Tools without intro     : NONE ✓');
  }
  if (extraIntros.length) {
    console.log('(note) Intro keys w/o tool:', extraIntros.length, extraIntros.slice(0, 10));
  }
}

console.log('========================');
if (problemsNote.length) {
  problems++;
  problemsNote.forEach(n => console.log('!!! ' + n));
}
if (problems) {
  console.log(`RESULT: ${problems} problem group(s) found — fix before deploy.`);
  process.exit(1);
}
console.log('RESULT: registry healthy — deploy-ready. ✓');
process.exit(0);
