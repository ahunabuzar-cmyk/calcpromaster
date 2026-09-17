#!/usr/bin/env node
// ============================================================
// CalcProMaster — cross-file duplicate-id resolver
// ------------------------------------------------------------
// Removes tool copies whose id collides with the canonical
// (HEAD-live or strongest) copy in another category file, and
// renames genuinely different calculators that share an id.
//
// Tokenizer-based: exact element boundaries despite nested
// braces/strings inside calc() bodies.
// ============================================================
const fs = require('fs');
const path = require('path');

// id -> { deleteFrom: [files], renameTo: {file, id, name} }
const PLAN = {
  // Keep HEAD-live canonical, delete expansion re-creations
  'overtime-pay':      { deleteFrom: ['everyday.js'] },                    // canonical: career-freelance.js
  'sales-tax':         { deleteFrom: ['business.js'] },                    // canonical: finance.js (HEAD)
  'macro-split':       { deleteFrom: ['health.js'] },                      // canonical: food-nutrition.js (HEAD)
  'one-rep-max':       { deleteFrom: ['health.js'] },                      // canonical: fitness-exercise.js (HEAD)
  'protein-need':      { deleteFrom: ['health.js'] },                      // canonical: food-nutrition.js (HEAD)
  'percent-change':    { deleteFrom: ['everyday.js'] },                    // canonical: math.js (HEAD)
  'scientific-notation': { deleteFrom: ['utilities.js'] },                 // canonical: math.js (HEAD)
  // Both-new: keep semantically-correct / stronger copy
  'debt-to-income':    { deleteFrom: ['everyday.js'] },                    // keep finance.js
  'paycheck-calc':     { deleteFrom: ['career-freelance.js'] },            // keep finance.js (real tax brackets)
  'net-worth':         { deleteFrom: ['everyday.js'] },                    // keep finance.js (granular)
  'working-capital':   { deleteFrom: ['finance.js'] },                     // keep business.js
  'gross-margin':      { deleteFrom: ['finance.js'] },                     // keep business.js
  'tip-calculator':    { deleteFrom: ['finance.js'] },                     // keep everyday.js
  'ebitda':            { deleteFrom: ['business.js'] },                    // keep finance.js (dep+amort correct)
};

// cash-flow: finance.js (HEAD, projection) stays `cash-flow`;
// business.js copy is a genuinely different model (statement) -> rename
const RENAME = { file: 'business.js', fromId: 'cash-flow', toId: 'cash-flow-statement', toName: 'Cash Flow Statement Calculator' };

const dataDir = path.join(__dirname, '..', 'js', 'data');

function tokenizeElements(src) {
  // Anchor at the tools array declaration (files may contain earlier helper
  // arrays, e.g. PAYMENT_FREQ_OPTS in finance.js — those must not confuse us).
  const m = src.match(/const [A-Z0-9_]*TOOLS = \[/);
  if (!m) { console.error('No *_TOOLS = [ declaration found'); process.exit(1); }
  const arrIdx = src.indexOf('[', m.index);
  let i = arrIdx + 1, depth = 0, quote = null, start = i;
  const items = [];
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
    if (c === ',' && depth === 0) { items.push({ start, endExclusive: i }); start = i + 1; continue; }
    if (c === ']' && depth === 0) {
      const last = src.slice(start, i).trim();
      if (last) items.push({ start, endExclusive: i });
      break;
    }
  }
  return items;
}

function findItemByAttr(items, src, attr, value) {
  const re = new RegExp('(?:^|[,\\s])' + attr + '\\s*:\\s*["\']' + value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']');
  for (let k = 0; k < items.length; k++) {
    const seg = src.slice(items[k].start, items[k].endExclusive);
    if (re.test(seg)) return k;
  }
  return -1;
}

function removeElement(file, id) {
  const fp = path.join(dataDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const bodyStart = (src.match(/const [A-Z0-9_]*TOOLS = \[/) || [''])[0] ? src.indexOf('[', src.match(/const [A-Z0-9_]*TOOLS = \[/).index) : -1;
  const items = tokenizeElements(src);
  const idx = findItemByAttr(items, src, 'id', id);
  if (idx === -1) { console.log('  [skip] ' + file + ' has no id "' + id + '"'); return; }
  const item = items[idx];
  let s = item.start;
  while (s > 0 && /\s/.test(src[s - 1])) s--;
  let removeFrom = s;
  if (s > 0 && src[s - 1] === ',') removeFrom = s - 1;
  // keep file loadable: verify we didn't grab the whole array
  if (bodyStart > 0 && removeFrom <= bodyStart) { console.error('  [ERROR] ' + file + '/' + id + ' boundary math failed'); process.exit(1); }
  src = src.slice(0, removeFrom) + src.slice(item.endExclusive);
  fs.writeFileSync(fp, src);
  console.log('  [removed] ' + file + ': ' + id);
}

function renameElement(file, fromId, toId, toName) {
  const fp = path.join(dataDir, file);
  let src = fs.readFileSync(fp, 'utf8');
  const items = tokenizeElements(src);
  const idx = findItemByAttr(items, src, 'id', fromId);
  if (idx === -1) { console.log('  [skip] ' + file + ' has no id "' + fromId + '" for rename'); return; }
  const item = items[idx];
  const seg = src.slice(item.start, item.endExclusive);
  const newSeg = seg
    .replace(new RegExp('(id\\s*:\\s*["\'])(' + fromId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(["\'])'), '$1' + toId + '$3')
    .replace(new RegExp('(name\\s*:\\s*["\'])[^"\']*(["\'])'), '$1' + toName.replace(/'/g, "\\'") + '$2');
  src = src.slice(0, item.start) + newSeg + src.slice(item.endExclusive);
  fs.writeFileSync(fp, src);
  console.log('  [renamed] ' + file + ': ' + fromId + ' -> ' + toId + ' ("' + toName + '")');
}

for (const [id, plan] of Object.entries(PLAN)) {
  console.log('== ' + id + ' ==');
  for (const f of plan.deleteFrom) removeElement(f, id);
}
console.log('== cash-flow (rename) ==');
renameElement(RENAME.file, RENAME.fromId, RENAME.toId, RENAME.toName);

console.log('\nDone.');
