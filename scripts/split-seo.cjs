/* Split js/seo-content.js (4.9MB, all categories) into per-category chunks:
   js/seo/<cat>.js — each chunk defines only its category's tools on window.TOOL_SEO.
   Run: node scripts/split-seo.cjs   (reads js/seo-content.js, writes js/seo/*.js)
   The runtime loader (in index.html) fetches ONLY the chunk needed by the open tool,
   so first paint never downloads the 4.9MB bundle. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'js', 'seo-content.js');
const OUT_DIR = path.join(__dirname, '..', 'js', 'seo');

const src = fs.readFileSync(SRC, 'utf8');

// Evaluate the bundle in a sandbox (it is plain data: no DOM used at eval time)
const sandbox = { window: {}, console };
vm.createContext(sandbox);
try {
  vm.runInContext(src, sandbox);
} catch (e) {
  console.error('Could not evaluate seo-content.js:', e.message);
  process.exit(1);
}

const TOOL_SEO = sandbox.window.TOOL_SEO || sandbox.TOOL_SEO;
if (!TOOL_SEO || typeof TOOL_SEO !== 'object') {
  console.error('No TOOL_SEO object found in', SRC);
  process.exit(1);
}

const entries = Object.entries(TOOL_SEO);
console.log('TOOL_SEO entries:', entries.length);

// Group by entry.cat (fallback: 'misc')
const groups = {};
for (const [id, meta] of entries) {
  const cat = (meta && meta.cat) ? meta.cat : 'misc';
  (groups[cat] = groups[cat] || {})[id] = meta;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let totalBytes = 0;
for (const [cat, obj] of Object.entries(groups)) {
  const body = JSON.stringify(obj, null, 0);
  const out = [
    '// Auto-generated per-category SEO chunk: ' + cat + ' (' + Object.keys(obj).length + ' tools)',
    '// Source: js/seo-content.js (regenerate with: node scripts/split-seo.cjs)',
    'window.TOOL_SEO = window.TOOL_SEO || {};',
    'Object.assign(window.TOOL_SEO, ' + body + ');',
    'window._seoCatsLoaded = window._seoCatsLoaded || {};',
    "window._seoCatsLoaded['" + cat + "'] = true;",
    ''
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, cat + '.js'), out);
  totalBytes += out.length;
  console.log('  wrote js/seo/' + cat + '.js (' + Object.keys(obj).length + ' tools, ' + (out.length / 1024).toFixed(1) + ' KB)');
}

console.log('Total chunk bytes:', (totalBytes / 1024).toFixed(1), 'KB  (vs', (src.length / 1024 / 1024).toFixed(1), 'MB monolithic)');
