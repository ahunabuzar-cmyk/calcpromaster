const fs = require('fs');
const BSC = String.fromCharCode(92); // backslash, avoids transport mangling
const src = fs.readFileSync('js/seo-premium-batch2.js', 'utf8');
const lines = src.split(String.fromCharCode(10));
let depth = 0, inStr = false, strCh = '', esc = false, start = -1;
const entries = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (esc) { esc = false; continue; }
    if (c === BSC) { esc = true; continue; }
    if (inStr) { if (c === strCh) { inStr = false; } continue; }
    if (c === "'" || c === '"') { inStr = true; strCh = c; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) { entries.push({ s: start + 1, e: i + 1 }); start = -1; } }
  }
}
console.log('entries:', entries.length);
let fails = 0;
entries.forEach(en => {
  let body = lines.slice(en.s - 1, en.e).join(String.fromCharCode(10));
  body = body.replace(/^\s*'([^']+)':\s*\{/, '$1: {').replace(/,\s*$/, '');
  try {
    const obj = new Function('return {' + body + '}')();
    console.log('OK  ', en.s + '-' + en.e, '| faqs:', (obj.faqs||[]).length, '| related:', (obj.related||[]).length, '| refs:', /references:/.test(body)?'y':'N', '| disclaimer:', /disclaimer:/.test(body)?'y':'N');
  } catch (err) { fails++; console.log('FAIL', en.s + '-' + en.e, err.message.slice(0,100)); }
});
if (fails) process.exit(1);
