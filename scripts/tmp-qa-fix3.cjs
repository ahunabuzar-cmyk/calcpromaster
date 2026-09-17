'use strict';
const fs = require('fs');
const LF = String.fromCharCode(10);

// 1. roommate-rent-split: display cents instead of rounded dollars
const fp = 'js/data/finance.js';
let src = fs.readFileSync(fp, 'utf8');
const oldDisp = ".join(' / '),chart:Charts.bar(shares,inc.map(function(_,i){return 'R'+(i+1);})),extra:'Income-proportional";
const newDisp = ".map(function(s){return s.toFixed(2);}).join(' / '),chart:Charts.bar(shares,inc.map(function(_,i){return 'R'+(i+1);})),extra:'Income-proportional";
if (!src.includes(oldDisp)) throw new Error('rent-split display anchor not found');
src = src.replace(oldDisp, newDisp);
fs.writeFileSync(fp, src);
console.log('rent-split display -> cents');

// 2. Fix the 3 QA rows
const tfp = 'tests/unit/formula-qa-full.test.js';
let t = fs.readFileSync(tfp, 'utf8');
const fixes = [
  [", 25, 1, '25% peak-to-trough'],", ", -25, 1, 'signed drawdown (trough-peak)/peak'],", 'max-drawdown'],
  [", 0.99, 0.02, 'parity gap magnitude'],", ", -1, 0.02, 'signed parity gap'],", 'put-call-parity'],
  [", 1107.69, 1, 'income-weighted share'],", ", 1107.69, 1, 'income-weighted share (cents)'],", 'roommate-rent-split'],
];
for (const [oldStr, newStr, name] of fixes) {
  if (t.includes(oldStr)) { t = t.replace(oldStr, newStr); console.log('fixed QA row:', name); }
  else if (t.includes(newStr)) { console.log('already fixed:', name); }
  else throw new Error('QA row not found: ' + name);
}
fs.writeFileSync(tfp, t);
console.log('done');
