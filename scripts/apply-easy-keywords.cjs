#!/usr/bin/env node
/* Apply the easy-keyword targeting decided in docs/HARD-KEYWORDS.md.
 *
 * For every tool in js/data/*.js:
 *   1. DROP  phrases tiered HARD (bare brand-wall head terms — probes showed
 *      DR 70-90 brands own these; wasted targeting).
 *   2. KEEP  MEDIUM phrases (3-word contestable long-tails — legitimate
 *      secondary targets, also feed in-app search matching).
 *   3. GUARANTEE at least one EASY phrase per tool: derive `free online <name>`
 *      from the tool's own name (unique by construction → no C2
 *      cannibalization; claim-free → guaranteed EASY tier).
 *
 * Safety rails:
 *   - Only rewrites the `kw: '...'` literal in place; no other field touched.
 *   - Refuses (exit 1) if a derived phrase is already owned by another tool,
 *     or if the old kw literal is not uniquely findable in its file.
 *   - Idempotent: second run is a no-op.
 *   - Titles/metas are NOT touched (already long-tail per KEYWORD-TARGETS.md).
 *
 * Run: node scripts/apply-easy-keywords.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { tier, score } = require('./keyword-difficulty.cjs');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');

const words_ = p => String(p).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).length;
const isHard = p => tier(p) === 'HARD' || (score(p) >= 4 && words_(p) <= 3);
const isEasy = p => tier(p) === 'EASY' && score(p) === 2;
const derived = name => {
  const base = /calculator|counter|converter|solver|estimator|tracker|tool|guides?\b/i.test(name)
    ? name : name + ' calculator';
  return 'free online ' + base;
};
// Fallback when the name-derived phrase collides with a sibling (e.g. two
// "Video File Size Calculator"-named tools): derive from the tool's slug,
// which is unique site-wide by construction.
const derivedFromSlug = id =>
  'free online ' + String(id).replace(/[-_]+/g, ' ').trim() + ' calculator';

// ---------- load all tools from their files ----------
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js')).sort();
const allTools = [];
for (const f of files) {
  const code = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  const m = { exports: {} };
  const sandbox = { process, require, module: m, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: f });
  if (Array.isArray(m.exports)) for (const t of m.exports) if (t && t.id && t.name) allTools.push({ ...t, __file: f });
}

// ---------- phrase ownership across the site ----------
const owner = new Map(); // phrase-lc -> tool id
for (const t of allTools) {
  for (const p of String(t.kw || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const k = p.toLowerCase();
    if (owner.has(k) && owner.get(k) !== t.id) throw new Error('C2 pre-existing: "' + p + '" owned by ' + owner.get(k) + ' AND ' + t.id);
    owner.set(k, t.id);
  }
}

// ---------- decide new kw per tool ----------
const changes = []; // { id, file, oldKw, newKw, droppedEasy[], added }
for (const t of allTools) {
  const phrases = String(t.kw || '').split(',').map(s => s.trim()).filter(Boolean);
  const kept = [];
  const droppedEasy = [];
  for (const p of phrases) {
    if (isHard(p)) droppedEasy.push(p);
    else kept.push(p);
  }
  let added = null;
  let d = derived(t.name);
  if (!kept.some(isEasy)) {
    const k = d.toLowerCase();
    const prior = owner.get(k);
    if (prior && prior !== t.id) {
      d = derivedFromSlug(t.id);
      const k2 = d.toLowerCase();
      const prior2 = owner.get(k2);
      if (prior2 && prior2 !== t.id) throw new Error('derived phrases both taken for ' + t.id + ': ' + prior + ', ' + prior2);
    }
    kept.push(d);
    owner.set(d.toLowerCase(), t.id);
    added = d;
  }
  if (!droppedEasy.length && !added) continue;
  const newKw = kept.join(', ');
  const oldKw = phrases.join(', ');
  if (newKw === oldKw) continue;
  changes.push({ id: t.id, name: t.name, file: t.__file, oldKw, newKw, droppedEasy, added });
}

// ---------- apply edits (unique literal replacement in the source file) ----------
// Source files quote kw in single quotes and escape inner apostrophes
// (kw: 'pascal\'s triangle row calculator'), so the needle must be escaped
// the same way — matching the raw runtime string directly finds nothing.
const srcEscape = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
let applied = 0;
const byFile = new Map();
for (const c of changes) {
  if (!byFile.has(c.file)) byFile.set(c.file, fs.readFileSync(path.join(DATA_DIR, c.file), 'utf8'));
  let text = byFile.get(c.file);
  const needle = srcEscape(c.oldKw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const newLit = srcEscape(c.newKw);
  const re = new RegExp("kw:\\s*'" + needle + "'", 'g');
  const hits = text.match(re) || [];
  if (hits.length !== 1) {
    // double-quoted source form
    const needle2 = c.newKw && c.oldKw.replace(/"/g, '\\"');
    const re2 = new RegExp('kw:\\s*"' + c.oldKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g');
    const hits2 = text.match(re2) || [];
    if (hits2.length !== 1) throw new Error(c.id + ': kw literal found ' + hits.length + '+' + hits2.length + ' times (need exactly 1) in ' + c.file);
    text = text.replace(re2, 'kw: "' + c.newKw + '"');
  } else {
    text = text.replace(re, "kw: '" + newLit + "'");
  }
  byFile.set(c.file, text);
  applied++;
}
for (const [f, text] of byFile) fs.writeFileSync(path.join(DATA_DIR, f), text);

// ---------- summary ----------
const hardDropped = changes.reduce((n, c) => n + c.droppedEasy.length, 0);
const easyAdded = changes.filter(c => c.added).length;
console.log('apply-easy-keywords: ' + applied + ' tools updated across ' + byFile.size + ' files');
console.log('  hard phrases dropped : ' + hardDropped);
console.log('  easy phrases added   : ' + easyAdded + ' (derived, unique-owner)');
console.log('  medium phrases kept  : untouched (secondary long-tail + in-app search feed)');
if (applied) {
  console.log('\nNext: npm run keywords:fresh && npm run build && npm run lint');
}
