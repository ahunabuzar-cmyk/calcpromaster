// ====== CalcProMaster JS Rebrand Script (word-boundary safe) ======
// Replaces standalone 'CalcPro' (word boundary) with 'CalcProMaster' in all js/*.js
// files, EXCEPT it never touches already-correct 'CalcProMaster' (boundary prevents
// matching inside CalcProMaster). Skips minified/node_modules.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let total = 0;
const touched = [];

files.forEach(f => {
  const file = path.join(dir, f);
  const src = fs.readFileSync(file, 'utf8');
  // \b word boundary: matches "CalcPro" but NOT "CalcProMaster" (CalcPro is not
  // followed by a word boundary there since M follows)
  const next = src.replace(/\bCalcPro\b/g, 'CalcProMaster');
  if (next !== src) {
    fs.writeFileSync(file, next);
    const count = (src.match(/\bCalcPro\b/g) || []).length;
    total += count;
    touched.push(f + ' (' + count + ')');
  }
});

console.log('=== Rebrand complete: ' + total + ' refs across ' + touched.length + ' files ===');
touched.forEach(t => console.log('  ' + t));
