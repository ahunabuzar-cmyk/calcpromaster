#!/usr/bin/env node
// ============================================================
// CalcProMaster — cross-file name-level duplicate resolver
// ------------------------------------------------------------
// Removes duplicate calculators that slipped through id-based
// dedupe because they had DIFFERENT ids but the SAME model/
// purpose/name in two category files. Keeps the richer or more
// canonical copy. Only removes ids NOT present in HEAD (never
// shipped/live) so no live URL or content is touched.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dataDir = path.join(__dirname, '..', 'js', 'data');

// [fileToRemoveFrom, idToRemove, reason/keep] — HEAD copies are canonical and never removed.
const REMOVE = [
  // finance.js/inventory-turnover was a NEW duplicate of HEAD-live business.js/inventory
  ['finance.js', 'inventory-turnover', 'keep business.js/inventory (HEAD-live)'],
  ['everyday.js', 'tip-calculator', 'keep finance.js/tip (uses AdvancedCalc.tipSteps)'],
  ['everyday.js', 'percentage-calc', 'keep math.js/percentage (canonical part/whole model)'],
  // lifestyle.js/coffee-habit was a NEW duplicate of HEAD-live everyday.js/coffee-cost
  ['lifestyle.js', 'coffee-habit', 'keep everyday.js/coffee-cost (HEAD-live)'],
  ['utilities.js', 'fraction-calc', 'keep math.js/fraction (same fraction arithmetic, math is canonical home)'],
  // math.js/number-base was a NEW duplicate of HEAD-live utilities.js/base-converter
  ['math.js', 'number-base', 'keep utilities.js/base-converter (HEAD-live)'],
  // math.js/volume-3d was a NEW duplicate of HEAD-live utilities.js/volume-calc
  ['math.js', 'volume-3d', 'keep utilities.js/volume-calc (HEAD-live)'],
  ['health.js', 'daily-calories', 'keep food-nutrition.js/daily-calorie (Mifflin BMR calorie needs)'],
  ['health.js', 'calorie-burn-exercise', 'keep fitness-exercise.js/calories-exercise (exercise burn belongs in Fitness)'],
  // fitness-exercise.js/body-fat-fitness was a NEW duplicate of HEAD-live health.js/body-fat
  ['fitness-exercise.js', 'body-fat-fitness', 'keep health.js/body-fat (HEAD-live Navy method)'],
  // business.js/commission-calc was a NEW duplicate of HEAD-live career-freelance.js/commission-plan (quota+accelerator superset)
  ['business.js', 'commission-calc', 'keep career-freelance.js/commission-plan (HEAD-live quota/accelerator model)'],
  // science.js/torque-calc was a NEW duplicate of HEAD-live engineering.js/torque (angle feature merged into the live tool)
  ['science.js', 'torque-calc', 'keep engineering.js/torque (HEAD-live, now includes angle input)'],
  // ---- input-signature near-duplicates found in the deep scan: only the copies NOT in
  // HEAD (expansion-added, never live) are removed; every HEAD-live tool is kept untouched. ----
  ['parenting-family.js', 'college-529', 'keep finance.js/529-plan (same 529 FV model, both new; Finance is canonical home)'],
  ['everyday.js', 'discount-price', 'keep finance.js/discount (HEAD-live canonical discount model)'],
  ['health.js', 'basal-metabolic-rate', 'keep fitness-exercise.js/calories-burned (HEAD-live Mifflin BMR canonical)'],
  ['health.js', 'tdee-advanced', 'keep food-nutrition.js/daily-calorie (HEAD-live Mifflin x activity TDEE canonical)'],
];

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

for (const [file, id, reason] of REMOVE) {
  if (headHasId(file, id)) {
    console.log('  [SKIP safety] ' + file + '/' + id + ' IS in HEAD — manual review needed (' + reason + ')');
    continue;
  }
  const fp = path.join(dataDir, file);
  const src = fs.readFileSync(fp, 'utf8');
  const items = tokenizeElements(src);
  const idx = findItem(items, src, 'id', id);
  if (idx === -1) { console.log('  [skip] ' + file + '/' + id + ' not present'); continue; }
  const item = items[idx];
  let s = item.start;
  while (s > 0 && /\s/.test(src[s - 1])) s--;
  let removeFrom = s;
  if (s > 0 && src[s - 1] === ',') removeFrom = s - 1;
  const out = src.slice(0, removeFrom) + src.slice(item.endExclusive);
  fs.writeFileSync(fp, out);
  console.log('  [removed] ' + file + '/' + id + ' — ' + reason);
}
console.log('\nDone.');
