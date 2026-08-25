// CALCPROMASTER PHASE 3 — Reverse-Calculation Candidate Matrix
// Classifies every registered calculator by reverse-calc suitability:
//   ANALYTICAL   — exact closed-form inverse exists (declared or trivially derivable)
//   NUMERICAL    — monotonic single-root; safe bisection possible
//   MULTI        — multiple valid roots (must be labeled, never silently picked)
//   DOMAIN       — mathematically invertible but domain-limited
//   NOT_SUITABLE — no meaningful solve-for (lookups, non-numeric, discrete, random)
//   DECLARED     — reverse block present in the tool definition (implemented)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ---- Load all data files (eager + lazy) ----
const dataFiles = fs.readdirSync(path.join(ROOT, 'js', 'data'))
  .filter(f => f.endsWith('.js') && f !== 'data.js' && f !== 'data-loader.js');

const ctx = {
  window: {},
  Charts: { gauge: () => '', donut: () => '', bar: () => '', line: () => '' },
  console: { log() {}, warn() {}, error() {} },
  Security: { validateInput: v => v, sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; } }
};
ctx.window.Charts = ctx.Charts;
vm.createContext(ctx);

const loaded = [];
for (const f of dataFiles) {
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8'), ctx, { filename: f });
    loaded.push(f);
  } catch (e) {
    console.error('LOAD FAIL', f, e.message);
  }
}

// Collect tool arrays by naming convention (data files declare top-level consts,
// e.g. FINANCE_TOOLS — lexical bindings read via runInContext).
const ARRAY_NAMES = [
  'FINANCE_TOOLS','HEALTH_TOOLS','MATH_TOOLS','EVERYDAY_TOOLS','SCIENCE_TOOLS',
  'ENGINEERING_TOOLS','CONSTRUCTION_TOOLS','CONVERSION_TOOLS','BUSINESS_TOOLS',
  'AUTO_TRANSPORT_TOOLS','EDUCATION_TOOLS','FOOD_NUTRITION_TOOLS','CAREER_TOOLS','REGIONAL_TOOLS',
  'FITNESS_TOOLS','HOME_GARDEN_TOOLS','LIFESTYLE_TOOLS','FAMILY_TOOLS','TECH_TOOLS','UTILITY_TOOLS'
];
const tools = [];
for (const key of ARRAY_NAMES) {
  let arr;
  try { arr = vm.runInContext(key, ctx); } catch (e) { continue; }
  if (Array.isArray(arr)) {
    const cat = key.replace(/_TOOLS$/, '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    arr.forEach(t => tools.push(Object.assign({ cat }, t)));
  }
}

// ---- Classification ----
const CAT = {
  ANALYTICAL: 'A. Exact analytical',
  NUMERICAL: 'B. Numerical possible',
  MULTI: 'C. Multiple solutions',
  DOMAIN: 'D. Domain-limited',
  NOT_SUITABLE: 'F. Not suitable'
};

function classify(t) {
  if (t.reverse) return { cls: 'DECLARED', label: 'ENABLED (declared)' };
  const inputs = (t.inputs || []).filter(i => i.type === 'number');
  if (inputs.length === 0) return { cls: 'NOT_SUITABLE', label: CAT.NOT_SUITABLE };
  const calcStr = (t.calc ? t.calc.toString() : '');
  const isLookup = /\[.*\]|\.find\(|\.map\(|Math\.random|Date\.now|new Date\(\)|switch\s*\(/.test(calcStr);
  if (isLookup) return { cls: 'NOT_SUITABLE', label: CAT.NOT_SUITABLE + ' (lookup/discrete/random)' };
  if (/Math\.random/.test(calcStr)) return { cls: 'NOT_SUITABLE', label: CAT.NOT_SUITABLE + ' (random)' };
  // Heuristic: tools whose calc is a single continuous expression over numeric inputs
  // are prime analytical/numerical candidates.
  if (inputs.length <= 3 && !/\.toFixed\(|Chart|gauge|donut|bar\b/.test(calcStr.replace(/'[^']*'|"[^"]*"/g, ''))) {
    return { cls: 'NUMERICAL', label: CAT.NUMERICAL };
  }
  if (/Math\.(sqrt|log|pow|sin|cos|tan|exp)\b/.test(calcStr)) {
    return { cls: 'DOMAIN', label: CAT.DOMAIN };
  }
  return { cls: 'NOT_SUITABLE', label: CAT.NOT_SUITABLE };
}

const rows = tools.map(t => {
  const c = classify(t);
  return {
    id: t.id, name: t.name, category: t.cat || '?',
    inputs: (t.inputs || []).filter(i => i.type === 'number').map(i => i.id).join(','),
    cls: c.cls, label: c.label
  };
});

rows.sort((a, b) => (a.cls === 'DECLARED' ? 0 : 1) - (b.cls === 'DECLARED' ? 0 : 1));

// ---- Summary ----
const counts = {};
rows.forEach(r => { counts[r.cls] = (counts[r.cls] || 0) + 1; });

console.log('Total calculators:', rows.length);
console.log('Classified:');
Object.keys(counts).sort().forEach(k => console.log('  ' + k + ':', counts[k]));

// ---- Matrix output ----
const outPath = path.join(ROOT, 'docs', 'phase3-reverse-matrix.md');
const lines = [];
lines.push('# CALCPROMASTER PHASE 3 — Reverse Calculation Feature Matrix');
lines.push('');
lines.push('Generated: ' + new Date().toISOString().slice(0, 10));
lines.push('');
lines.push('| Calculator | Category | Solvable inputs | Classification | Status |');
lines.push('|---|---|---|---|---|');
rows.forEach(r => {
  const status = r.cls === 'DECLARED' ? 'ENABLED' : (r.cls === 'NOT_SUITABLE' ? 'NOT SUITABLE' : 'NEEDS REVIEW');
  lines.push('| ' + r.id + ' | ' + r.category + ' | ' + r.inputs + ' | ' + r.label + ' | ' + status + ' |');
});
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push('| Class | Count |');
lines.push('|---|---|');
Object.keys(counts).sort().forEach(k => lines.push('| ' + k + ' (' + counts[k] + ') | ' + counts[k] + ' |'));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'));
console.log('Matrix written to', outPath);
