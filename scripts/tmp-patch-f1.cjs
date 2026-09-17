'use strict';
const fs = require('fs');
const fp = 'scripts/a3-f1-finance.cjs';
let s = fs.readFileSync(fp, 'utf8');
const dups = ['emergency-fund', 'credit-card-payoff'];
for (const id of dups) {
  // line: ` { id: 'X', ...} }` ,  \n   (brace, backtick, optional comma)
  const toolRe = new RegExp('^`\\{ id: ' + id + ',.*\\}`\\,?\\r?\\n', 'm');
  if (!toolRe.test(s)) throw new Error('tool not found: ' + id);
  s = s.replace(toolRe, '');
  const qaRe = new RegExp("^\\['finance', '" + id + "',.*\\],\\r?\\n", 'm');
  s = s.replace(qaRe, '');
}
fs.writeFileSync(fp, s);
console.log('removed', dups.length, 'dups; tool lines now:', (s.match(/^`/gm) || []).length);
