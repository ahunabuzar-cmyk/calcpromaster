#!/usr/bin/env node
// ============================================================
// CalcProMaster — finance.js duplicate-id fixer
// ------------------------------------------------------------
// Problem: the finance expansion accidentally re-added tools
// whose ids already exist in the live (HEAD) finance set. Each
// duplicate id means the later copy silently overwrites the
// earlier one in TOOL_MAP and the card renders twice.
//
// Resolution (duplicate-protection policy):
//   * Keep the canonical tool (first occurrence = live HEAD copy).
//   * Remove the added duplicate copy (second occurrence).
//
// Works by tokenizing the source so element boundaries are exact
// even though calc() bodies contain nested braces and strings.
// ============================================================
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'js', 'data', 'finance.js');
const src = fs.readFileSync(file, 'utf8');

// --- Load current array to find duplicate-id ordinals -------------
const cur = require(file);
const firstSeen = {};
const toDelete = new Set();
cur.forEach((t, i) => {
  if (firstSeen[t.id] !== undefined) toDelete.add(i);
  else firstSeen[t.id] = i;
});

if (toDelete.size === 0) {
  console.log('finance.js: no duplicate ids found — nothing to do.');
  process.exit(0);
}
console.log('Duplicate copies to remove (array ordinals):', [...toDelete].join(', '));

// --- Locate array body: const FINANCE_TOOLS = [ ... ]; ------------
const arrStartMarker = 'const FINANCE_TOOLS = [';
const arrIdx = src.indexOf(arrStartMarker);
if (arrIdx === -1) { console.error('Array start marker not found'); process.exit(1); }
let i = arrIdx + arrStartMarker.length;

// --- Tokenize: find top-level element boundaries ------------------
// depth counts braces INSIDE the array (array item nesting starts at 0).
let depth = 0;
let quote = null;
let start = i;               // start of current element text (after separator)
const items = [];            // { start, endExclusive } raw text spans

function skipString(ch) {
  // ch is the opening quote char; advance i past the closing quote
  i++; // consume opening quote
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === ch) { i++; break; }
    i++;
  }
}

for (; i < src.length; i++) {
  const c = src[i];
  if (quote) {
    if (c === '\\') { i++; continue; }
    if (c === quote) quote = null;
    continue;
  }
  if (c === '"' || c === "'") { quote = c; continue; }
  if (c === '{') { depth++; continue; }
  if (c === '}') { depth--; continue; }
  if (c === ',' && depth === 0) {
    items.push({ start, endExclusive: i });
    start = i + 1;
    continue;
  }
  if (c === ']' && depth === 0) {
    // end of array
    const last = src.slice(start, i).trim();
    if (last) items.push({ start: start, endExclusive: i });
    break;
  }
}

console.log('Parsed top-level elements:', items.length, '(expected', cur.length + ')');
if (items.length !== cur.length) {
  console.error('Element count mismatch — aborting without changes.');
  process.exit(1);
}

// --- Remove duplicates in reverse order ----------------------------
let out = src;
for (const ordinal of [...toDelete].sort((a, b) => b - a)) {
  const item = items[ordinal];
  // expand backwards over whitespace to the previous separator
  let s = item.start;
  while (s > 0 && /\s/.test(out[s - 1])) s--;
  // the char before s is ',' (item separator) — remove it too
  let removeFrom = s;
  if (s > 0 && out[s - 1] === ',') removeFrom = s - 1;
  out = out.slice(0, removeFrom) + out.slice(item.endExclusive);
}

fs.writeFileSync(file, out);
console.log('Removed', toDelete.size, 'duplicate tool entries. File rewritten.');

// --- Verify ----------------------------------------------------------
delete require.cache[require.resolve(file)];
const after = require(file);
const seen = {};
let dup = 0;
after.forEach(t => { if (seen[t.id]) dup++; else seen[t.id] = 1; });
console.log('After fix: total entries =', after.length, '| duplicate ids =', dup);
if (dup > 0) { console.error('STILL HAS DUPLICATES'); process.exit(1); }
console.log('finance.js duplicate fix verified ✓');
