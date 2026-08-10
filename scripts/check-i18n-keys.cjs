// List missing translation keys per language vs English base
const fs = require('fs');
const src = fs.readFileSync('js/i18n.js', 'utf8');

// Extract the TRANSLATIONS object literal safely
const start = src.indexOf('const TRANSLATIONS = ');
const brace = src.indexOf('{', start);
let depth = 0, end = -1;
for (let i = brace; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const objSrc = src.slice(brace, end);
const TRANSLATIONS = eval('(' + objSrc + ')');

const base = Object.keys(TRANSLATIONS.en);
const langs = Object.keys(TRANSLATIONS).filter(l => l !== 'en');
console.log('English base keys: ' + base.length);
console.log('Languages: ' + langs.length);
console.log('');
for (const l of langs) {
  const missing = base.filter(k => !(k in TRANSLATIONS[l]));
  const pct = Math.round(((base.length - missing.length) / base.length) * 100);
  console.log(l + ': ' + (base.length - missing.length) + '/' + base.length + ' (' + pct + '%)' + (missing.length ? ' — missing: ' + missing.join(', ') : ' — COMPLETE'));
}
