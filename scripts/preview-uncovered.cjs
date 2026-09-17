#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const qa = fs.readFileSync(path.join(ROOT, 'tests', 'unit', 'formula-qa-full.test.js'), 'utf8');
const covered = new Set();
const re = /\[['"]([a-z0-9-]+)['"],\s*['"]([a-z0-9-]+)['"]/g;
let m; while ((m = re.exec(qa)) !== null) covered.add(m[2]);

const cat = process.argv[2];
const limit = parseInt(process.argv[3] || '8', 10);
for (const f of fs.readdirSync(path.join(ROOT, 'js', 'data')).filter(f => f.endsWith('.js') && !f.endsWith('.test.js')).sort()) {
  if (cat && !f.includes(cat)) continue;
  const arr = require(path.join(ROOT, 'js', 'data', f));
  const uncov = arr.filter(t => !covered.has(t.id));
  if (!uncov.length) continue;
  console.log('===== ' + f + ' (' + uncov.length + ' uncovered) =====');
  for (const t of uncov.slice(0, limit)) {
    const ins = (t.inputs || []).map(i => i.id + ':' + i.type + (i.def !== undefined ? '=' + i.def : '') + (i.opts ? '[' + i.opts.map(o => o.v).join('|') + ']' : '')).join(', ');
    console.log('  ' + t.id + ' :: ' + t.name);
    console.log('    inputs: ' + ins);
    console.log('    calc: ' + String(t.calc).slice(0, 220));
  }
}