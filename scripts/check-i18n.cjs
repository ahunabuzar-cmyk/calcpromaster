// Check i18n translation completeness per language in js/i18n.js
const fs = require('fs');
const src = fs.readFileSync('js/i18n.js', 'utf8');

function extractKeys(lang) {
  // Find the lang block:  '    lang: { ... },'
  const re = new RegExp('\\n\\s{4}' + lang + ':\\s*\\{([\\s\\S]*?)\\n\\s{4}\\},');
  const m = src.match(re);
  if (!m) return null;
  const keys = m[1].match(/'[\w.]+'\s*:/g) || [];
  return keys.length;
}

const en = extractKeys('en');
console.log('English base keys:', en);
const langs = ['es','hi','ur','fr','de','pt','ar','zh','bn','ru','ja','ko','it','nl','tr','id','vi','th'];
langs.forEach(l => {
  const k = extractKeys(l);
  if (k === null) { console.log(l + ': NOT FOUND'); return; }
  const pct = en ? Math.round(100 * k / en) : 0;
  console.log(l + ': ' + k + ' keys = ' + pct + '% of English');
});
