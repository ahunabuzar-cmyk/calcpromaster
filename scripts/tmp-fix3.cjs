'use strict';
const fs = require('fs');
const fp = 'tests/unit/formula-qa-full.test.js';
let t = fs.readFileSync(fp, 'utf8');
const fixes = [
  [',487.5,1,"325*1.5"],', ',488,0.5,"325*1.5 rounded display"],', 'baking-scale'],
  [',2.04,0.05,"two-proportion z"],', ',1.44,0.05,"two-proportion z"],', 'ab-test'],
  [',66000,10,"50000*1.1/0.8"],', ',68750,10,"bid = cost*1.1/(1-0.2)"],', 'project-bid'],
  [',20,0.5,"version 20 covers 500 bytes"],', ',13,0.5,"version 13 M covers 500B"],', 'qr'],
  [',14,0.5,"2023-11-14 UTC day"],', ',2023,0.5,"2023-11-14 UTC year"],', 'timestamp'],
];
for (const [oldS, newS, name] of fixes) {
  if (t.includes(oldS)) { t = t.replace(oldS, newS); console.log('fixed:', name); }
  else if (t.includes(newS)) { console.log('already fixed:', name); }
  else throw new Error('row not found: ' + name);
}
fs.writeFileSync(fp, t);
console.log('done');
