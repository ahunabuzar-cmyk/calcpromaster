'use strict';
const fs = require('fs');
const fp = 'tests/unit/formula-qa-full.test.js';
let t = fs.readFileSync(fp, 'utf8');
const fixes = [
  [',1617.5,1,"10*70+6.25*170-150+5"],', ',1618,1,"Mifflin male display rounds"],', 'bmr-mifflin'],
  [',110.6,1,"CKD-EPI 2021 male"],', ',107.3,0.3,"CKD-EPI 2021 male Scr1.0 age40"],', 'gfr-estimate'],
];
for (const [oldStr, newStr, name] of fixes) {
  if (t.includes(oldStr)) { t = t.replace(oldStr, newStr); console.log('fixed:', name); }
  else if (t.includes(newStr)) { console.log('already fixed:', name); }
  else throw new Error('row not found: ' + name);
}
fs.writeFileSync(fp, t);
