#!/usr/bin/env node
/* One-time fix for the cannibalized phrases found by
 * scripts/audit-keyword-quality.cjs (docs/KEYWORD-AUDIT.md section C2).
 *
 * For each shared phrase an OWNER page keeps the phrase; every other page
 * that listed it loses it. Owners are explicit (OWNERS map below) — decided
 * by: exact-name match > name-head match > most-searched generic hub of the
 * cluster. The script re-derives the shared-phrase set from the live data so
 * it can never silently drift from the audit, and asserts every owner is
 * actually a member of its group.
 *
 * Run: node scripts/fix-cannibalized-keywords.cjs        (applies edits)
 *      node scripts/fix-cannibalized-keywords.cjs --dry  (report only)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const DRY = process.argv.includes('--dry');

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---- load tools (same dir-vote mapping as the audit) ----
const sandbox = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
const topDirs = fs.readdirSync(path.join(ROOT, 'deploy'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);
const tools = []; // {cat, id, url, kws, file}
for (const f of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js')).sort()) {
  const m = { exports: {} };
  sandbox.module = m;
  vm.runInContext(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'), sandbox, { filename: f });
  const arr = m.exports;
  if (!Array.isArray(arr)) continue;
  const votes = {};
  for (const t of arr.slice(0, 40)) {
    if (!t || !t.id) continue;
    for (const d of topDirs) {
      if (fs.existsSync(path.join(ROOT, 'deploy', d, t.id, 'index.html'))) votes[d] = (votes[d] || 0) + 1;
    }
  }
  const dir = (Object.entries(votes).sort((a, b) => b[1] - a[1])[0] || [f.replace(/\.js$/, '')])[0];
  for (const t of arr) {
    if (!t || !t.id || !t.name) continue;
    tools.push({
      cat: dir, id: t.id, name: t.name, file: f,
      url: '/' + dir + '/' + t.id,
      kws: (t.kw || '').split(',').map(s => s.trim()).filter(Boolean)
    });
  }
}

// ---- re-derive shared phrases (same normalization as the audit) ----
const byPhrase = new Map();
for (const t of tools) {
  for (const k of t.kws) {
    const key = norm(k);
    if (!key) continue;
    if (!byPhrase.has(key)) byPhrase.set(key, new Set());
    byPhrase.get(key).add(t.url);
  }
}
const groups = [...byPhrase.entries()].filter(([, set]) => set.size > 1);
console.log('shared phrases found:', groups.length);

// ---- owner decisions (phrase-norm → owner URL) ----
const OWNERS = {
  'return on investment': '/finance/roi',
  'break even point calculator with fixed costs': '/business/break-even-point',
  'break even point': '/business/break-even-point',
  'tax refund estimator': '/career/tax-refund',
  'concrete volume calculator in cubic yards': '/construction/concrete-slab',
  'how many bags of concrete do i need calculator': '/construction/concrete-slab',
  'roof pitch calculator with slope': '/construction/roof-pitch',
  'gpa calculator semester with credit hours': '/education/semester-gpa',
  'final grade calculator with weightage': '/education/grade',
  'exact age calculator in years months days': '/everyday/age',
  'day count convention': '/finance/loan-emi',
  'fha vs conventional loan comparison calculator': '/finance/mortgage',
  'home loan affordability calculator with property tax': '/finance/mortgage',
  'mortgage payment calculator with pmi and taxes': '/finance/mortgage',
  'interest only mortgage': '/finance/interest-only',
  'solve for rate': '/finance/compound-interest',
  'solve for time': '/finance/savings-goal',
  'roi calculator with annual returns': '/finance/investment',
  'cagr calculator with monthly contributions': '/finance/investment-growth',
  'investment return calculator with inflation': '/finance/investment',
  'salary income tax calculator pakistan fbr': '/finance/tax',
  'take home pay calculator with tax deduction': '/finance/tax',
  'pakistan income tax salary calculator': '/finance/tax',
  'vo2 max calculator': '/fitness/vo2max',
  'daily calorie intake calculator to lose weight': '/health/calorie',
  'maintenance calorie calculator with activity level': '/health/calorie',
  'max heart rate calculator by age': '/health/heart-rate',
  'target heart rate zone calculator': '/health/target-heart-rate',
  'target heart rate': '/health/target-heart-rate',
  'pregnancy due date calculator by last period': '/health/pregnancy',
  'pregnancy week calculator from conception': '/health/pregnancy',
  'force mass acceleration calculator': '/science/force',
  'hash generator calculator': '/tech/hash-generator'
};

// ---- build per-tool removal lists ----
const removals = new Map(); // url -> Set of phrases (original casing) to drop
let missingOwner = 0;
for (const [phrase, urls] of groups) {
  const owner = OWNERS[phrase];
  if (!owner) { console.error('NO OWNER for:', phrase, '→', [...urls].join(', ')); missingOwner++; continue; }
  if (!urls.has(owner)) { console.error('OWNER NOT IN GROUP for:', phrase, '→ owner', owner, 'group', [...urls].join(', ')); missingOwner++; continue; }
  for (const url of urls) {
    if (url === owner) continue;
    if (!removals.has(url)) removals.set(url, new Set());
    removals.get(url).add(phrase);
  }
}
if (missingOwner) { console.error('aborting — fix OWNERS first'); process.exit(1); }

// ---- apply to source files (surgical in-place quote-region rewrite) ----
const byFile = new Map();
for (const t of tools) {
  if (!removals.has(t.url)) continue;
  if (!byFile.has(t.file)) byFile.set(t.file, []);
  byFile.get(t.file).push(t);
}

let totalRemoved = 0, emptyWarn = 0;
for (const [file, list] of byFile) {
  const fp = path.join(DATA_DIR, file);
  let src = fs.readFileSync(fp, 'utf8');
  for (const t of list) {
    const drop = removals.get(t.url);
    const idAnchor = src.indexOf("id: '" + t.id + "'");
    const idAnchor2 = idAnchor === -1 ? src.indexOf('id: "' + t.id + '"') : idAnchor;
    const anchor = idAnchor === -1 ? idAnchor2 : idAnchor;
    if (anchor === -1) { console.error('anchor not found:', t.id, 'in', file); process.exit(1); }
    const region = src.slice(anchor, anchor + 6000);
    const km = region.match(/kw:\s*'([^']*)'/) || region.match(/kw:\s*"([^"]*)"/);
    if (!km) { console.error('kw field not found:', t.id, 'in', file); process.exit(1); }
    const kept = km[1].split(',').map(s => s.trim()).filter(Boolean)
      .filter(k => !drop.has(norm(k)));
    if (!kept.length) { emptyWarn++; console.warn('WARN: all phrases removed for', t.url); }
    totalRemoved += km[1].split(',').map(s => s.trim()).filter(Boolean).length - kept.length;
    const replacement = km[0].slice(0, km[0].indexOf(km[1])) + kept.join(', ') + km[0].slice(km[0].indexOf(km[1]) + km[1].length);
    src = src.slice(0, anchor) + region.replace(km[0], replacement) + src.slice(anchor + region.length);
  }
  if (!DRY) fs.writeFileSync(fp, src, 'utf8');
  console.log((DRY ? '[dry] ' : '') + file + ': ' + list.length + ' tools updated');
}
console.log('phrases removed:', totalRemoved, (DRY ? '(dry run — nothing written)' : ''));
