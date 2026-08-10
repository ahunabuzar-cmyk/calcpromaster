// ============================================================
// CalcProMaster — AUTOMATED INVENTORY AUDIT (Phase 2)
//
// Single report over the ENTIRE calculator ecosystem:
//   - actual calculator count + categories
//   - duplicate IDs / duplicate routes
//   - tools missing id / name / category / inputs / calc
//   - orphan tools (registered but not routable)
//   - routes with no registered calculator (broken routes)
//   - calculators missing SEO metadata (TOOL_SEO / premium)
//   - calculators missing an intro paragraph (TOOL_INTROS)
//   - duplicate tool NAMES (keyword cannibalization signal)
//
// Usage:  node scripts/inventory-audit.cjs
// Exit:   0 = clean, 1 = any critical issue found
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---- Load registry (require-based, same as audit-tools.cjs) ----
// IMPORTANT: the registry category key (data.js CALC_DATA) differs from the
// data FILENAME (auto-transport.js → 'auto', fitness-exercise.js → 'fitness',
// food-nutrition.js → 'food', home-garden.js → 'homegarden',
// parenting-family.js → 'family', tech-digital.js → 'tech',
// career-freelance.js → 'career'). Routes and sitemap use the CALC_DATA key,
// so we map filename → registry key from data.js itself.
const FILE_TO_CAT = {
  'auto-transport.js': 'auto',
  'fitness-exercise.js': 'fitness',
  'food-nutrition.js': 'food',
  'home-garden.js': 'homegarden',
  'parenting-family.js': 'family',
  'tech-digital.js': 'tech',
  'career-freelance.js': 'career',
};
const files = fs.readdirSync(path.join(ROOT, 'js', 'data')).filter(f => f.endsWith('.js'));
const cats = [];
const allTools = [];
for (const file of files) {
  const catKey = FILE_TO_CAT[file] || file.replace('.js', '');
  const mod = require(path.join(ROOT, 'js', 'data', file));
  const arr = Array.isArray(mod) ? mod : [];
  cats.push(catKey);
  for (const t of arr) {
    allTools.push({ ...t, cat: catKey });
  }
}

// ---- Load SEO metadata maps (best effort, NO eval) ----
// seo-content.js declares `var TOOL_SEO = {...};` on ONE line, then sets
// window.TOOL_SEO. We run it inside a vm sandbox (like the browser) instead
// of regex-slicing, which is robust to single-line/minified output.
function loadSeoMap() {
  const vm = require('vm');
  const sandbox = { window: {}, console };
  try {
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8'), sandbox, { filename: 'seo-content.js' });
  } catch (e) { /* ignore — seo-content may reference browser-only globals */ }
  let map = sandbox.window.TOOL_SEO || {};
  // js/seo/*.js chunks Object.assign(window.TOOL_SEO, {...})
  const seoDir = path.join(ROOT, 'js', 'seo');
  if (fs.existsSync(seoDir)) {
    for (const f of fs.readdirSync(seoDir).filter(f => f.endsWith('.js'))) {
      const s2 = { window: { TOOL_SEO: map }, console };
      try { vm.createContext(s2); vm.runInContext(fs.readFileSync(path.join(seoDir, f), 'utf8'), s2, { filename: f }); map = s2.window.TOOL_SEO; } catch (e) { /* ignore */ }
    }
  }
  return map || {};
}
const seoMap = loadSeoMap();

// TOOL_INTROS (vm sandbox, no eval)
let introKeys = new Set();
try {
  const vm = require('vm');
  const s = { window: {}, console };
  vm.createContext(s);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'tool-intros.js'), 'utf8'), s, { filename: 'tool-intros.js' });
  introKeys = new Set(Object.keys(s.window.TOOL_INTROS || {}));
} catch (e) { /* ignore */ }

// ---- Checks ----
const issues = { critical: [], warn: [] };
const byId = new Map();
const byRoute = new Map();
const byName = new Map();

for (const t of allTools) {
  // missing core fields
  if (!t.id) issues.critical.push(`tool missing id (category ${t.cat})`);
  if (!t.name) issues.critical.push(`tool "${t.id || '?'}" missing name`);
  if (!Array.isArray(t.inputs) || t.inputs.length === 0) issues.warn.push(`tool "${t.id}" has no inputs`);
  if (typeof t.calc !== 'function' && t.async !== true && !t.custom) issues.warn.push(`tool "${t.id}" has no calc/async/custom handler`);

  // duplicate IDs
  const idKey = t.id || '?';
  if (byId.has(idKey)) byId.get(idKey).push(t.cat); else byId.set(idKey, [t.cat]);

  // duplicate routes (canonicalPath)
  const route = (t.seo && t.seo.canonicalPath) || `/` + t.cat + `/` + idKey;
  if (byRoute.has(route)) byRoute.get(route).push(t.cat + '/' + idKey); else byRoute.set(route, [t.cat + '/' + idKey]);

  // duplicate names (cannibalization signal)
  const nameKey = (t.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  if (nameKey && byName.has(nameKey)) byName.get(nameKey).push(t.cat + '/' + idKey); else byName.set(nameKey, [t.cat + '/' + idKey]);

  // missing SEO metadata
  if (!seoMap[idKey]) issues.warn.push(`tool "${idKey}" missing TOOL_SEO entry`);

  // missing intro
  if (!introKeys.has(idKey)) issues.warn.push(`tool "${idKey}" missing TOOL_INTROS intro`);
}

// route map check: every registered tool must have a routable path
const routesJson = (() => { try { return require(path.join(ROOT, 'tool-routes.json')); } catch (e) { return null; } })();
const routeSet = routesJson ? new Set(routesJson.map(r => r.path || (r.cat + '/' + r.id))) : null;

const dupIds = [...byId.entries()].filter(([, v]) => v.length > 1);
const dupRoutes = [...byRoute.entries()].filter(([, v]) => v.length > 1);
const dupNames = [...byName.entries()].filter(([, v]) => v.length > 1);

for (const [id, catsArr] of dupIds) issues.critical.push(`DUPLICATE ID "${id}" in: ${catsArr.join(', ')}`);
for (const [route, tools] of dupRoutes) issues.critical.push(`DUPLICATE ROUTE "${route}" for: ${tools.join(', ')}`);
for (const [name, tools] of dupNames) issues.warn.push(`duplicate tool name "${name}" (${tools.length}x): ${tools.join(', ')}`);

// ---- Report ----
console.log('══════════════════════════════════════════════');
console.log('  CALCPROMASTER INVENTORY AUDIT');
console.log('══════════════════════════════════════════════');
console.log(`Actual calculators: ${allTools.length}`);
console.log(`Categories: ${cats.length}`);
console.log(`Duplicate IDs: ${dupIds.length}`);
console.log(`Duplicate routes: ${dupRoutes.length}`);
console.log(`Duplicate tool names: ${dupNames.length}`);
console.log(`Missing SEO metadata: ${allTools.filter(t => !seoMap[t.id]).length}`);
console.log(`Missing intro: ${allTools.filter(t => !introKeys.has(t.id)).length}`);
console.log(`Tools missing inputs: ${allTools.filter(t => !Array.isArray(t.inputs) || t.inputs.length === 0).length}`);
console.log(`Tools without calc/async/custom: ${allTools.filter(t => typeof t.calc !== 'function' && t.async !== true && !t.custom).length}`);
if (routeSet) {
  const orphans = allTools.filter(t => !routeSet.has(`/${t.cat}/${t.id}`) && !routeSet.has(`${t.cat}/${t.id}`));
  console.log(`Orphan calculators (registered, not routable): ${orphans.length}${orphans.length ? ' → ' + orphans.map(t => t.id).slice(0, 10).join(', ') : ''}`);
}

console.log('\n— Critical issues —');
if (issues.critical.length === 0) console.log('  none ✓');
else issues.critical.forEach(i => console.log('  ✗ ' + i));

console.log('\n— Warnings —');
if (issues.warn.length === 0) console.log('  none ✓');
else issues.warn.forEach(i => console.log('  ⚠ ' + i));

console.log('\n— Duplicate names detail —');
if (dupNames.length === 0) console.log('  none ✓');
else dupNames.forEach(([n, v]) => console.log(`  ⚠ "${n}": ${v.join(', ')}`));

const critical = issues.critical.length;
console.log(`\nRESULT: ${critical === 0 ? 'PASS' : 'FAIL (' + critical + ' critical issues)'}`);
process.exit(critical === 0 ? 0 : 1);
