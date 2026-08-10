// RECOVER js/app.js from the read_files tool result stored in the DB harness
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const t = db.prepare("SELECT harness_state FROM threads WHERE id = 'thms5sej581uln'").get();
const s = t.harness_state;

// The read_files result: {"type":"json","value":[{"path":"js\\app.js","content":"...full source..."}]}
// Find the FIRST occurrence of the app.js file header comment
const header = '// CalcPro Main App';
const idx = s.indexOf(header);
console.log('header found at', idx);
if (idx < 0) { console.log('NOT FOUND'); process.exit(1); }

// Content starts after the "content":" prefix
const contentStart = s.lastIndexOf('"content":"', idx) + '"content":"'.length;
console.log('contentStart at', contentStart);

// The content is a JSON-escaped string. Parse it by finding the matching close.
// Strategy: the content ends when we hit an unescaped `","` followed by a closing `}` 
// We'll scan and unescape manually.
let out = '';
let i = contentStart;
while (i < s.length) {
  const c = s[i];
  if (c === '\\') {
    const n = s[i + 1];
    if (n === 'n') out += '\n';
    else if (n === 't') out += '\t';
    else if (n === 'r') out += '\r';
    else if (n === '"') out += '"';
    else if (n === '\\') out += '\\';
    else if (n === '/') out += '/';
    else out += n;
    i += 2;
    continue;
  }
  if (c === '"') {
    // Check if this closes the content string: next non-space char should be , or }
    let j = i + 1;
    while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
    if (j < s.length && (s[j] === ',' || s[j] === '}')) {
      // This is the end of the content string
      break;
    }
    out += c;
    i++;
    continue;
  }
  out += c;
  i++;
}

console.log('recovered length:', out.length);
console.log('first 300:', out.slice(0, 300));
console.log('last 200:', out.slice(-200));

// Verify it looks like app.js
if (out.includes('renderTool') && out.includes('App =')) {
  fs.writeFileSync('js/app.js', out);
  console.log('✔ WRITTEN to js/app.js');
} else {
  console.log('✘ Does not look like app.js source, NOT writing');
}
