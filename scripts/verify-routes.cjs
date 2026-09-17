#!/usr/bin/env node
// Starts the REAL shipped static server (server.js) in-process on a random port,
// then verifies key routes return 200 with expected markers. No external process.
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// server.js exports nothing; it binds on PORT env. Instead of forking, we
// replicate its behavior by requiring the file with PORT set — but it binds
// immediately on require, so we set PORT first.
process.env.PORT = process.env.PORT || '3987';
require(path.join(ROOT, 'server.js'));

const cases = [
  ['/', 'CalcProMaster'],
  ['/finance/529-plan', '529 Plan'],
  ['/finance/loan-emi', 'Loan EMI'],
  ['/auto/fuel-cost', 'Fuel Cost'],
  ['/math/percentage', 'Percentage'],
  ['/career/tax-bracket', 'Tax Bracket'],
  ['/fitness/running-pace', 'Running Pace'],
  ['/conversion/currency-conv', 'Currency'],
];
const gone = [
  ['/family/college-529', '529'],       // removed dup — SPA serves index.html, but should NOT advertise tool
  ['/everyday/discount-price', 'Discount Price'],
  ['/health/basal-metabolic-rate', 'BMR'],
  ['/health/tdee-advanced', 'TDEE'],
];

function fetchPage(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: process.env.PORT, path: p }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

(async () => {
  let fail = 0;
  for (const [p, marker] of cases) {
    const r = await fetchPage(p);
    const ok = r.status === 200 && r.body.includes(marker);
    console.log((ok ? 'PASS' : 'FAIL'), p, '->', r.status, ok ? '' : '(marker missing)');
    if (!ok) fail++;
  }
  for (const [p, marker] of gone) {
    const r = await fetchPage(p);
    const toolPresent = r.body.includes('id: ' + JSON.stringify(marker.toLowerCase().replace(/\s+/g, '-')) ) || r.body.includes(marker + ' Calculator');
    console.log((!toolPresent ? 'PASS' : 'FAIL'), p, '-> removed-tool hidden');
    if (toolPresent) fail++;
  }
  console.log(fail === 0 ? 'ALL ROUTE CHECKS PASS' : (fail + ' ROUTE CHECKS FAILED'));
  process.exit(fail === 0 ? 0 : 1);
})();