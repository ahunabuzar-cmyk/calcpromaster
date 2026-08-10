#!/usr/bin/env node
// ============================================================
// CalcProMaster — Duplicate Tool Remover (SEO cannibalization fix)
// Removes duplicate calculator tools from js/data/*.js, keeping
// the canonical (best) version per group. Then you must:
//   1) add 301 redirects in _redirects (old URL -> canonical)
//   2) add client-side redirect map in js/app.js navigate()
//   3) run node generate-sitemap.js && node build-deploy.js
//
// Usage: node scripts/dedupe-tools.js
// ============================================================
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'js', 'data');

// Canonical per duplicate group. Key = file to remove FROM,
// value = array of tool ids to remove (the OTHER copies).
const REMOVE = {
  'utilities.js': ['bmi-calc', 'percentage-calc', 'fraction-calc', 'ratio-calc', 'age-calc', 'discount-calc', 'fuel-cost-trip', 'time-zone', 'random-number'],
  'fitness-exercise.js': ['bmi-fitness', 'heart-rate-zones', 'macro-calc'],
  'everyday.js': ['tip-calculator', 'tile', 'water-intake', 'moving-cost'],
  'business.js': ['cashflow'],
  'career-freelance.js': ['net-worth'],
  'food-nutrition.js': ['ideal-weight'],
  'parenting-family.js': ['pregnancy-due', 'child-bmi-guide', 'pregnancy-weight-gain'],
  'health.js': ['pregnancy-due-date'],
};

// Canonical URL for each removed tool id (for _redirects + client map)
const REDIRECTS = {
  'bmi-calc': '/health/bmi',
  'bmi-fitness': '/health/bmi',
  'percentage-calc': '/math/percentage',
  'fraction-calc': '/math/fraction',
  'ratio-calc': '/math/ratio',
  'age-calc': '/everyday/age',
  'discount-calc': '/finance/discount',
  'fuel-cost-trip': '/everyday/trip-fuel-cost',
  'time-zone': '/everyday/timezone',
  'random-number': '/math/random-generator',
  'tip-calculator': '/finance/tip',
  'tile': '/construction/tile-calculator',
  'water-intake': '/food/daily-water-intake',
  'moving-cost': '/lifestyle/relocation-cost',
  'cashflow': '/finance/cash-flow',
  'net-worth': '/finance/net-worth-calculator',
  'ideal-weight': '/health/ideal-body-weight',
  'pregnancy-due': '/health/pregnancy',
  'pregnancy-due-date': '/health/pregnancy',
  'child-bmi-guide': '/family/child-bmi',
  'pregnancy-weight-gain': '/health/pregnancy-weight',
  'heart-rate-zones': '/health/heart-rate',
  'macro-calc': '/health/macros',
};

// ---------- Brace-matching tool-block locator ----------
// Finds the start of a tool object `{ id: 'X', name:` and returns
// {start, end} of the WHOLE tool object (matching close brace), safe
// against nested {} inside calc bodies and strings/comments.
function findToolBlock(src, id) {
  const idRe = new RegExp("\\{\\s*id:\\s*['\"]" + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"],\\s*name:");
  const m = idRe.exec(src);
  if (!m) return null;
  const start = m.index; // index of '{'
  // Walk from start counting braces, skipping strings and comments
  let depth = 0;
  let inStr = null;
  let i = start;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { start, end: i };
    }
  }
  return null;
}

// Removes the tool block + trailing comma + following whitespace/newline
function removeBlock(src, block) {
  let end = block.end + 1;
  if (src[end] === ',') end++;
  // Also eat following whitespace up to and including a newline
  while (end < src.length && (src[end] === ' ' || src[end] === '\t' || src[end] === '\r' || src[end] === '\n')) end++;
  return src.slice(0, block.start) + src.slice(end);
}

let totalRemoved = 0;
for (const [file, ids] of Object.entries(REMOVE)) {
  const fp = path.join(DATA_DIR, file);
  let src = fs.readFileSync(fp, 'utf8');
  let removedHere = [];
  for (const id of ids) {
    const block = findToolBlock(src, id);
    if (!block) { console.log('  ! NOT FOUND: ' + file + ':' + id); continue; }
    src = removeBlock(src, block);
    removedHere.push(id);
  }
  fs.writeFileSync(fp, src);
  totalRemoved += removedHere.length;
  console.log('  ' + file + ': removed [' + removedHere.join(', ') + ']');
}

console.log('\nTotal tools removed: ' + totalRemoved);

// Verify: re-require every file, confirm removed ids are gone
console.log('\n=== VERIFY ===');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js'));
let total = 0;
for (const f of files) {
  const arr = require(path.join(DATA_DIR, f));
  total += arr.length;
  for (const id of Object.values(REMOVE).flat()) {
    if (arr.some(t => t.id === id)) console.log('  !! STILL PRESENT: ' + f + ':' + id);
  }
}
console.log('Total tools after dedupe: ' + total);
