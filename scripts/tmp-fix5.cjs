'use strict';
const fs = require('fs');
const LF = String.fromCharCode(10);
const fp = 'tests/unit/formula-qa-full.test.js';
let lines = fs.readFileSync(fp, 'utf8').split(LF);
const rowText = '["finance","rent-vs-sell",{ rentNet: 20000,sell: 350000,inv: 5,years: 10 },20113,5,"sale gains 220113 minus rent 200000"],';
// 1. remove all copies of the row anywhere
let count = 0;
lines = lines.filter(line => {
  if (line.includes('rent-vs-sell') && line.includes('20113')) { count++; return false; }
  return true;
});
// 2. find the CASES array close (line that is exactly '];' after 'const CASES = [')
const startIdx = lines.findIndex(l => l.includes('const CASES = ['));
if (startIdx < 0) throw new Error('CASES start not found');
let closeIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t === '];') { closeIdx = i; break; }
}
if (closeIdx < 0) throw new Error('CASES close not found');
// 3. insert just before the close
lines.splice(closeIdx, 0, '  ' + rowText);
fs.writeFileSync(fp, lines.join(LF));
console.log('removed', count, 'stray copies; inserted at line', closeIdx + 1);
