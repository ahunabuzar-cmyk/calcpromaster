// PHASE 2 / PHASE 1 — Complete calculator inventory
// Loads every js/data/*.js registry in a VM and reports: count, categories,
// duplicate IDs, missing calc(), missing name, missing id.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.js')).sort();

let total = 0;
const byCat = {};
const seen = new Map(); // id -> {file, name}
const problems = [];
const tools = []; // {id, name, cat, file}

for (const f of files) {
  const code = fs.readFileSync(path.join(dataDir, f), 'utf8');
  const ctx = { window: {}, console, Math, Date, JSON, Number, String, Array, Object, isNaN, parseInt, parseFloat };
  try {
    vm.runInNewContext(code, ctx, { timeout: 5000 });
  } catch (e) {
    problems.push(`[LOAD FAIL] ${f}: ${e.message}`);
    continue;
  }
  const base = f.replace(/\.js$/, '');
  // some registries use a different export name than the file name
  const EXPORT_ALIASES = {
    'career-freelance': 'CAREER_TOOLS',
    'fitness-exercise': 'FITNESS_TOOLS',
    'parenting-family': 'FAMILY_TOOLS',
    'tech-digital': 'TECH_TOOLS',
    'utilities': 'UTILITY_TOOLS',
  };
  const varName = (EXPORT_ALIASES[base] || base.replace(/[^A-Za-z0-9]/g, '_').toUpperCase() + '_TOOLS');
  let arr = null;
  try {
    arr = vm.runInNewContext(`typeof ${varName} !== 'undefined' ? ${varName} : null`, ctx);
  } catch (e) { arr = null; }
  if (!Array.isArray(arr)) {
    // Try to find any array-like const ending in _TOOLS
    try {
      const names = vm.runInNewContext(
        `Object.keys(globalThis).filter(k => /_TOOLS$/.test(k))`, ctx
      );
      for (const n of names) {
        const cand = ctx[n];
        if (Array.isArray(cand)) { arr = cand; varName !== n; break; }
      }
    } catch (e) {}
  }
  if (!Array.isArray(arr)) {
    problems.push(`[NO TOOLS ARRAY] ${f}`);
    continue;
  }
  byCat[base] = arr.length;
  total += arr.length;
  for (const t of arr) {
    const id = t && t.id;
    const name = t && t.name;
    const key = base + ':' + id;
    tools.push({ id, name, cat: base, file: f });
    if (!id) problems.push(`[MISSING ID] ${f}: tool without id (name=${name})`);
    if (!name) problems.push(`[MISSING NAME] ${f}: id=${id}`);
    if (t && t.calc === null) {
      // async/external tools (currency converter, scientific) — no local calc
      t.__async = true;
    } else if (!t || typeof t.calc !== 'function') {
      problems.push(`[NO CALC] ${f}: id=${id} name=${name}`);
    }
    if (id) {
      if (seen.has(id)) problems.push(`[DUP ID] '${id}' in ${seen.get(id).file} AND ${f}`);
      else seen.set(id, { file: f });
    }
    // fields sanity
    if (t && Array.isArray(t.fields) === false && t.fields !== undefined) {
      problems.push(`[BAD FIELDS] ${f}: id=${id} fields is not an array`);
    }
  }
}

console.log('=== PHASE 1 — COMPLETE CALCULATOR INVENTORY ===');
console.log('Total tools (registry):', total);
console.log('Categories:', Object.keys(byCat).length);
for (const [c, n] of Object.entries(byCat)) console.log(`  ${c}: ${n}`);
console.log('\n=== PROBLEMS (${problems.length}) ===');
for (const p of problems) console.log(' ' + p);

// write machine-readable inventory
const out = { total, byCat, tools: tools.map(t => ({ id: t.id, name: t.name, cat: t.cat })) };
fs.writeFileSync(path.join(__dirname, '..', 'qa-inventory.json'), JSON.stringify(out, null, 2));
console.log('\nWrote qa-inventory.json (' + tools.length + ' tools)');
