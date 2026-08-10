// Extract all kw fields per tool id — classify short (1-2 words) vs long-tail (3+ words)
const fs = require('fs');
const files = fs.readdirSync('js/data').filter(f => f.endsWith('.js'));
const out = { files: {}, total: 0, short: 0, longTail: 0 };

for (const f of files) {
  const src = fs.readFileSync('js/data/' + f, 'utf8');
  // Find tool objects: { id: 'x', ... kw: '...' }
  const tools = [];
  const objRe = /\{\s*id:\s*'([^']+)'[\s\S]*?kw:\s*'([^']*)'/g;
  let m;
  while ((m = objRe.exec(src)) !== null) {
    tools.push({ id: m[1], kws: m[2].split(',').map(k => k.trim()).filter(Boolean) });
  }
  out.files[f] = tools;
  for (const t of tools) {
    for (const k of t.kws) {
      out.total++;
      const words = k.split(/[\s-]+/).filter(Boolean).length;
      if (words >= 3) out.longTail++; else out.short++;
    }
  }
}
fs.writeFileSync('scripts/kw-report.json', JSON.stringify(out.files, null, 1));
console.log('Files:', files.length);
console.log('Total kws:', out.total, '| Short (1-2w):', out.short, '| Long-tail (3+w):', out.longTail);
console.log('Report: scripts/kw-report.json');
