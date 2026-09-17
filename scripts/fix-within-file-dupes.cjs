#!/usr/bin/env node
// ============================================================
// CalcProMaster — within-file duplicate remover
// ------------------------------------------------------------
// The expansion accidentally added near-duplicate tools INSIDE
// category files that already contained the same calculator
// (live HEAD copy). For each (file, id) below, id is the ADDED
// duplicate (not present in HEAD); the HEAD copy stays canonical.
//
// scholarship-need is the exception: it is a genuinely different
// model (financial need = COA - EFC - grants) that merely shared
// the name — rename it to a distinct, defensible tool.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dataDir = path.join(__dirname, '..', 'js', 'data');

// id pairs: [file, addedIdToRemove, canonicalHeadId]
const REMOVE = [
  ['conversion.js', 'temperature-conv', 'temperature'],
  ['finance.js', 'inflation-calculator', 'inflation'],
  ['finance.js', 'debt-to-income', 'debt-ratio'],
  ['finance.js', 'net-worth', 'net-worth-calculator'],
  ['finance.js', 'paycheck-calc', 'paycheck'],
  ['finance.js', 'amort-schedule', 'amortization'],
  ['finance.js', 'interest-only-mortgage', 'interest-only'],
  ['engineering.js', 'thermal-expansion', 'thermal'],
  ['engineering.js', 'transformer', 'transformer-ratio'],
  ['health.js', 'vo2max-est', 'vo2-max'],
  ['health.js', 'water-intake', 'water-intake-health'],
  ['health.js', 'body-surface-area', 'bsa'],
  ['health.js', 'waist-hip-ratio', 'waist-hip'],
  ['health.js', 'blood-pressure-category', 'blood-pressure'],
  ['science.js', 'ph-calculator', 'ph'],
  ['science.js', 'momentum-calc', 'momentum'],
  ['science.js', 'doppler-effect', 'doppler'],
  ['science.js', 'coulombs-law', 'coulomb'],
  ['tech-digital.js', 'video-file-size', 'video-size'],
];
// scholarship-need: rename added copy to a distinct tool instead
const RENAME = { file: 'education.js', fromId: 'scholarship-need', toId: 'financial-need', toName: 'Financial Need Calculator', toDesc: 'Financial need = cost of attendance minus expected family contribution and grants' };

function tokenizeElements(src) {
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

function findItem(items, src, attr, value) {
  const re = new RegExp('(?:^|[,\\s])' + attr + '\\s*:\\s*["\']' + value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']');
  for (let k = 0; k < items.length; k++) {
    if (re.test(src.slice(items[k].start, items[k].endExclusive))) return k;
  }
  return -1;
}

function headHasId(file, id) {
  try {
    const head = execFileSync('git', ['show', 'HEAD:js/data/' + file], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    return new RegExp('id\\s*:\\s*["\']' + id + '["\']').test(head);
  } catch (e) { return false; }
}

for (const [file, addedId, canonicalId] of REMOVE) {
  // safety: only remove ids NOT in HEAD (they are the expansion additions)
  if (headHasId(file, addedId)) {
    console.log('  [SKIP safety] ' + file + '/' + addedId + ' IS in HEAD — manual review needed');
    continue;
  }
  const fp = path.join(dataDir, file);
  const src = fs.readFileSync(fp, 'utf8');
  const items = tokenizeElements(src);
  const idx = findItem(items, src, 'id', addedId);
  if (idx === -1) { console.log('  [skip] ' + file + '/' + addedId + ' not present'); continue; }
  const item = items[idx];
  let s = item.start;
  while (s > 0 && /\s/.test(src[s - 1])) s--;
  let removeFrom = s;
  if (s > 0 && src[s - 1] === ',') removeFrom = s - 1;
  const out = src.slice(0, removeFrom) + src.slice(item.endExclusive);
  fs.writeFileSync(fp, out);
  console.log('  [removed] ' + file + '/' + addedId + ' (canonical: ' + canonicalId + ')');
}

// --- Rename scholarship-need -> financial-need ----------------------
{
  const { file, fromId, toId, toName, toDesc } = RENAME;
  if (headHasId(file, fromId)) {
    console.log('  [SKIP safety] ' + file + '/' + fromId + ' IS in HEAD — manual review needed');
  } else {
    const fp = path.join(dataDir, file);
    const src = fs.readFileSync(fp, 'utf8');
    const items = tokenizeElements(src);
    const idx = findItem(items, src, 'id', fromId);
    if (idx === -1) { console.log('  [skip] ' + file + '/' + fromId + ' not present'); }
    else {
      const item = items[idx];
      const seg = src.slice(item.start, item.endExclusive);
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSeg = seg
        .replace(new RegExp('(id\\s*:\\s*["\'])(' + esc(fromId) + ')(["\'])'), '$1' + toId + '$3')
        .replace(new RegExp('(name\\s*:\\s*["\'])[^"\']*(["\'])'), '$1' + toName.replace(/'/g, "\\'") + '$2')
        .replace(new RegExp('(desc\\s*:\\s*["\'])[^"\']*(["\'])'), '$1' + toDesc.replace(/'/g, "\\'") + '$2');
      const out = src.slice(0, item.start) + newSeg + src.slice(item.endExclusive);
      fs.writeFileSync(fp, out);
      console.log('  [renamed] ' + file + '/' + fromId + ' -> ' + toId + ' ("' + toName + '")');
    }
  }
}
console.log('\nDone.');
