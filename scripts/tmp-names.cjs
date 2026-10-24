const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'js', 'data');
const want = ['mortgage', 'compound-interest', 'bmi', 'loan-emi', 'percentage', 'retirement', 'currency-converter', 'auto-loan', 'date-diff', 'age', 'tip', 'quadratic', 'scientific', 'ohms-law', 'ideal-gas', 'concrete', 'roi', 'profit-margin', 'gpa', 'grade-needed', 'password-generator', 'qr-generator', 'unit-converter', 'trip-fuel-cost'];
const found = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const id of want) {
    if (found[id]) continue;
    const re = new RegExp("id:\\s*'" + id + "',\\s*name:\\s*'([^']+)'");
    const m = s.match(re);
    if (m) found[id] = m[1];
  }
}
for (const id of want) console.log(JSON.stringify(id) + ': ' + JSON.stringify(found[id] || 'MISSING') + ',');
