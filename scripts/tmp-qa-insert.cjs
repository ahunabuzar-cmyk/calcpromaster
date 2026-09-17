'use strict';
const fs = require('fs');
const BT = String.fromCharCode(96);
const LF = String.fromCharCode(10);

// 1. Extract QA rows from the finance batch script
const src = fs.readFileSync('scripts/a3-f1-finance.cjs', 'utf8');
const i = src.indexOf('const QA_ROWS');
const j = src.indexOf('];', i);
if (i < 0 || j < 0) throw new Error('QA_ROWS block not found');
const qaLines = [];
for (let line of src.slice(i, j).split(LF)) {
  line = line.trim();
  if (!line.startsWith(BT)) continue;
  line = line.slice(1);                    // drop leading backtick
  const last = line.lastIndexOf(BT);       // find closing backtick
  if (last < 0) throw new Error('unclosed backtick line: ' + line.slice(0, 40));
  line = line.slice(0, last).trim();       // cut at closing backtick
  if (line.endsWith(',')) line = line.slice(0, -1);   // normalize
  if (!line.startsWith('[')) throw new Error('not a row: ' + line.slice(0, 40));
  qaLines.push(line + ',');
}
// Drop rows for tools that were removed as duplicates
const dropped = ['emergency-fund', 'credit-card-payoff'];
const kept = qaLines.filter(l => !dropped.some(d => l.startsWith("['finance', '" + d + "'")));
console.log('QA rows extracted:', qaLines.length, 'kept:', kept.length);
if (kept.length !== 44) throw new Error('expected 44 rows after filter, got ' + kept.length);
fs.writeFileSync('scripts/tmp-f1-qa.txt', kept.join(LF));

// 2. Insert into the formula QA test file (idempotent)
const fp = 'tests/unit/formula-qa-full.test.js';
let test = fs.readFileSync(fp, 'utf8');
const already = kept.filter(l => test.includes(l.slice(0, 40)));
console.log('already present:', already.length);
if (already.length > 0) { console.log('skip insert'); process.exit(0); }
const marker = 'const CASES = [';
const k = test.indexOf(marker);
const m = test.indexOf(LF + '];', k);
if (k < 0 || m < 0) throw new Error('CASES array markers not found');
test = test.slice(0, m + LF.length) + kept.join(LF) + LF + test.slice(m + LF.length);
fs.writeFileSync(fp, test);
console.log('inserted 44 QA rows into formula-qa-full.test.js');
