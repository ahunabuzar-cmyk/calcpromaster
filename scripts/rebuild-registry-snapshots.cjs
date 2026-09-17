// ============================================================
// CalcProMaster — rebuild registry snapshot files
// ------------------------------------------------------------
// all-tool-ids.json and tool-inventory.txt are DERIVED snapshots
// of the authoritative registry (js/data/*.js). They had drifted
// to 528/543 rows while the registry grew to 1201 unique routes,
// which made external audits report conflicting tool counts
// (566+/528/543/1201). This script regenerates both from the
// registry so every snapshot agrees with the single source.
//
// Run: node scripts/rebuild-registry-snapshots.cjs
// Wired into: node scripts/sync-counts.cjs (auto-refresh).
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// Same vm sandbox approach as ssg-pages.cjs — load the registry exactly
// the way the browser does (window globals, no module machinery).
const ctx = {
  window: {},
  console: { log() {}, warn() {}, error() {} },
  Charts: { gauge: () => '', donut: () => '', bar: () => '', line: () => '' },
  Security: { validateInput: v => v, sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; }, sanitizeHtml: v => String(v) }
};
ctx.window.Charts = ctx.Charts;
vm.createContext(ctx);

const dataFiles = fs.readdirSync(path.join(ROOT, 'js', 'data')).filter(f => f.endsWith('.js'));
for (const f of dataFiles) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}

const ARRAY_NAMES = [
  'FINANCE_TOOLS', 'HEALTH_TOOLS', 'MATH_TOOLS', 'EVERYDAY_TOOLS', 'SCIENCE_TOOLS',
  'ENGINEERING_TOOLS', 'CONSTRUCTION_TOOLS', 'CONVERSION_TOOLS', 'BUSINESS_TOOLS',
  'AUTO_TRANSPORT_TOOLS', 'EDUCATION_TOOLS', 'FOOD_NUTRITION_TOOLS', 'CAREER_TOOLS', 'REGIONAL_TOOLS',
  'FITNESS_TOOLS', 'HOME_GARDEN_TOOLS', 'LIFESTYLE_TOOLS', 'FAMILY_TOOLS', 'TECH_TOOLS', 'UTILITY_TOOLS'
];
const CAT_KEY = {
  FINANCE_TOOLS: 'finance', HEALTH_TOOLS: 'health', MATH_TOOLS: 'math', EVERYDAY_TOOLS: 'everyday',
  SCIENCE_TOOLS: 'science', ENGINEERING_TOOLS: 'engineering', CONSTRUCTION_TOOLS: 'construction',
  CONVERSION_TOOLS: 'conversion', BUSINESS_TOOLS: 'business', AUTO_TRANSPORT_TOOLS: 'auto',
  EDUCATION_TOOLS: 'education', FOOD_NUTRITION_TOOLS: 'food', CAREER_TOOLS: 'career', REGIONAL_TOOLS: 'regional',
  FITNESS_TOOLS: 'fitness', HOME_GARDEN_TOOLS: 'homegarden', LIFESTYLE_TOOLS: 'lifestyle',
  FAMILY_TOOLS: 'family', TECH_TOOLS: 'tech', UTILITY_TOOLS: 'utilities'
};
const FILE_TO_CAT = {
  'finance.js': 'finance', 'health.js': 'health', 'math.js': 'math',
  'everyday.js': 'everyday', 'science.js': 'science', 'engineering.js': 'engineering',
  'construction.js': 'construction', 'conversion.js': 'conversion', 'business.js': 'business',
  'education.js': 'education', 'utilities.js': 'utilities', 'lifestyle.js': 'lifestyle',
  'regional.js': 'regional', 'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness',
  'auto-transport.js': 'auto', 'career-freelance.js': 'career', 'home-garden.js': 'homegarden',
  'tech-digital.js': 'tech', 'parenting-family.js': 'family'
};

// Build the ordered route list (matches tool-routes.json ordering: file order, then array order).
const routes = []; // { cat, id, name, file }
for (const f of dataFiles) {
  const cat = FILE_TO_CAT[f];
  if (!cat) continue;
  // Locate the exported array name for this file via the cat mapping.
  const arrName = Object.keys(CAT_KEY).find(k => CAT_KEY[k] === cat);
  let arr;
  try { arr = vm.runInContext(arrName, ctx); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;
  for (const t of arr) {
    if (!t || !t.id) continue;
    routes.push({ cat, id: t.id, name: t.name || t.id, file: f, desc: String(t.desc || ''), inputs: (t.inputs || []).map(i => i.id).join(',') });
  }
}

// ---- 1. all-tool-ids.json ----
const idsOut = routes.map(r => ({ id: r.id, name: r.name, file: r.file }));
fs.writeFileSync(path.join(ROOT, 'all-tool-ids.json'), JSON.stringify(idsOut, null, 1) + '\n', 'utf8');
console.log('all-tool-ids.json rebuilt: ' + idsOut.length + ' routes');

// ---- 2. tool-inventory.txt (cat|id|type|inputs rows) ----
const rows = routes.map(r => [r.cat, r.id, 'calc', r.inputs || ''].join('|'));
fs.writeFileSync(path.join(ROOT, 'tool-inventory.txt'), rows.join('\n') + '\n', 'utf8');
console.log('tool-inventory.txt rebuilt: ' + rows.length + ' rows');
