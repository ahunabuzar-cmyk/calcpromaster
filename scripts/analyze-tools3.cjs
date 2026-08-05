/* Temp analysis #3: TRUE unique tool count (single+double quotes), duplicates, sitemap URLs */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));

const toolRe = /^\s*\{\s*id:\s*['"]([^'"]+)['"]/;
const ids = {};
for (const f of files) {
  const lines = fs.readFileSync(path.join(dataDir, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(toolRe);
    if (m) {
      const id = m[1];
      (ids[id] = ids[id] || []).push(f + ':' + (i + 1));
    }
  }
}
const all = Object.entries(ids);
console.log('=== TOTAL DEFINITIONS:', all.reduce((a, [, v]) => a + v.length, 0));
console.log('=== UNIQUE TOOL IDS:', all.length);
console.log('=== DUPLICATES:');
for (const [id, locs] of all) if (locs.length > 1) console.log(`  ${id} x${locs.length} -> ${locs.join(', ')}`);

// Sitemap URLs for duplicate ids
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
console.log('=== SITEMAP URLs for dup ids:');
for (const [id, locs] of all) {
  if (locs.length > 1) {
    const matches = [...sitemap.matchAll(new RegExp('<loc>[^<]*/' + id + '</loc>', 'g'))].map(m => m[0]);
    console.log(`  ${id}: ${matches.length ? matches.join(' ') : '(none)'}`);
  }
}
