'use strict';
const fs = require('fs');
const fp = 'js/data/finance.js';
let s = fs.readFileSync(fp, 'utf8');
const broken = "shares.map(function(s){return s.toFixed(0);}).map(function(s){return s.toFixed(2);}).map(function(s){return s.toFixed(2);}).map(function(s){return s.toFixed(2);})";
const fixed = "shares.map(function(s){return s.toFixed(2);})";
if (s.includes(broken)) {
  s = s.replace(broken, fixed);
  fs.writeFileSync(fp, s);
  console.log('chained maps -> single clean map');
} else if (s.includes(fixed)) {
  console.log('already clean');
} else {
  throw new Error('neither pattern found — inspect manually');
}
// sanity: only one occurrence of the fixed form inside the rent-split tool
const i = s.indexOf("id: 'roommate-rent-split'");
console.log('verify:', s.slice(i, i + 200).includes('roommate-rent-split'));
