/* Temp analysis: count tools, duplicates, seo keys. Run: node scripts/analyze-tools.cjs */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));

// Tool ids use `id: '...'` (space after colon); field ids use `id:'...'` (no space).
const toolIdRe = /^\s*\{\s*id:\s+'([^']+)'/;

const counts = {};
const idLocs = {};
let total = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(dataDir, f), 'utf8');
  // Split on tool object starts: `  { id: 'x',` at start of line
  const lines = src.split('\n');
  let inTool = false;
  let curId = null;
  let curStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(toolIdRe);
    if (m) {
      if (inTool && curId) { /* close previous */ }
      curId = m[1];
      curStart = i;
      inTool = true;
      total++;
      counts[curId] = (counts[curId] || 0) + 1;
      (idLocs[curId] = idLocs[curId] || []).push(f + ':' + (i + 1));
    } else if (inTool && /^\s*\},?\s*$/.test(line)) {
      inTool = false;
      curId = null;
    }
  }
}

console.log('=== TOTAL TOOL DEFINITIONS:', total);
console.log('=== UNIQUE TOOL IDS:', Object.keys(counts).length);
console.log('=== DUPLICATES:');
for (const [id, n] of Object.entries(counts)) {
  if (n > 1) console.log(`  ${id} x${n} -> ${idLocs[id].join(', ')}`);
}

// SEO content keys
const seoFile = path.join(__dirname, '..', 'js', 'seo-content.js');
const seoSrc = fs.readFileSync(seoFile, 'utf8');
const seoKeys = [...seoSrc.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(m => m[1]);
console.log('=== TOOL_SEO keys:', seoKeys.length);
const missing = Object.keys(counts).filter(id => !seoKeys.includes(id));
console.log('=== tool ids WITHOUT seo key:', missing.length, missing.slice(0, 40));
const extra = seoKeys.filter(k => !counts[k]);
console.log('=== seo keys WITHOUT tool id:', extra.length, extra.slice(0, 40));
