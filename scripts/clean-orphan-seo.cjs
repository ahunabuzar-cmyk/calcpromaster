/*
 * Remove orphaned SEO entries (js/seo-content.js) whose tool id no longer
 * exists in js/data/*.js (tools removed by the dedupe merge).
 *
 * SAFE approach: evaluate the bundle in a vm sandbox (it's plain data), filter
 * the parsed objects, then re-serialize with JSON.stringify. No brace-matching,
 * no regex splicing — syntax cannot break. Run AFTER: node scripts/split-seo.cjs
 * regenerates the per-category chunks from the cleaned source.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'js', 'seo-content.js');
const DATA_DIR = path.join(__dirname, '..', 'js', 'data');

// 1) Collect all valid tool ids from data files
const ids = new Set();
for (const f of fs.readdirSync(DATA_DIR).filter(x => x.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  const re = /\{\s*id:\s*['"]([^'"]+)['"],\s*name:/g;
  let m;
  while ((m = re.exec(s))) ids.add(m[1]);
}

// 2) Evaluate the SEO bundle in a sandbox
const src = fs.readFileSync(SRC, 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
try {
  vm.runInContext(src, sandbox);
} catch (e) {
  console.error('Could not evaluate seo-content.js:', e.message);
  process.exit(1);
}
const TOOL_SEO = sandbox.window.TOOL_SEO || sandbox.TOOL_SEO;
const TOOL_CATEGORY = sandbox.window.TOOL_CATEGORY || sandbox.TOOL_CATEGORY;
if (!TOOL_SEO || typeof TOOL_SEO !== 'object') {
  console.error('No TOOL_SEO object found');
  process.exit(1);
}

// 3) Filter
const seoKeys = Object.keys(TOOL_SEO);
const orphans = seoKeys.filter(k => !ids.has(k));
const cleanSeo = {};
for (const [k, v] of Object.entries(TOOL_SEO)) if (ids.has(k)) cleanSeo[k] = v;

let cleanCat = null;
let catOrphans = [];
if (TOOL_CATEGORY && typeof TOOL_CATEGORY === 'object') {
  cleanCat = {};
  for (const [k, v] of Object.entries(TOOL_CATEGORY)) {
    if (ids.has(k)) cleanCat[k] = v;
    else catOrphans.push(k);
  }
}

// 4) Regenerate — COMPACT serialization (no indent) keeps the payload small;
// JSON.stringify output is valid JS for a plain object literal.
const out = [
  '// Auto-generated SEO content for all CalcPro tools — cleaned of orphaned',
  '// entries whose calculators were merged/removed (dedupe). Regenerate chunks',
  '// with: node scripts/split-seo.cjs',
  'var TOOL_SEO = ' + JSON.stringify(cleanSeo) + ';',
  '',
  'var TOOL_CATEGORY = ' + JSON.stringify(cleanCat || TOOL_SEO) + ';',
  '',
  'if (typeof window !== "undefined") {',
  '  window.TOOL_SEO = TOOL_SEO;',
  '  window.TOOL_CATEGORY = TOOL_CATEGORY;',
  '}',
  ''
].join('\n');
fs.writeFileSync(SRC, out);

console.log('TOOL_SEO: ' + seoKeys.length + ' → ' + Object.keys(cleanSeo).length + ' (removed ' + orphans.length + ')');
if (cleanCat) console.log('TOOL_CATEGORY: removed ' + catOrphans.length + ' stale keys');
console.log('Orphan ids removed: ' + orphans.join(', '));
