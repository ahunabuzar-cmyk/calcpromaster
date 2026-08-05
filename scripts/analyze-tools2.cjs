/* Temp analysis #2: find the 16 seo-only tools + canonical paths of duplicates + true unique count */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));

// Tool-level ids: `id: 'x'` (space) OR `id: "x"` (space, double quotes)
const toolRe = /^\s*\{\s*id:\s+'([^']+)'/;
let ids = new Set();
let dupLocs = {};
for (const f of files) {
  const lines = fs.readFileSync(path.join(dataDir, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(toolRe);
    if (m) {
      ids.add(m[1]);
      (dupLocs[m[1]] = dupLocs[m[1]] || []).push(f + ':' + (i + 1));
    }
  }
}
console.log('=== UNIQUE TOOL IDS (single-quote, space):', ids.size);

// Find the 16 seo-only tools anywhere in data files (any quote style)
const seoSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'seo-content.js'), 'utf8');
const seoKeys = [...seoSrc.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(m => m[1]);
const missing = seoKeys.filter(k => !ids.has(k));
console.log('=== seo keys not in single-quote ids:', missing);

// Search for those in data files with flexible regex
for (const k of missing) {
  let found = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(dataDir, f), 'utf8');
    if (src.includes(`'${k}'`)) found.push(f);
  }
  console.log(`  ${k}: appears in ${found.join(', ') || 'NONE'}`);
}
