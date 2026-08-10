// Check the other thread (thms5wsotnhphx) read_files results - different snapshot format?
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });

const t = db.prepare("SELECT harness_state FROM threads WHERE id = 'thms5wsotnhphx'").get();
const s = t.harness_state || '';
console.log('harness len:', s.length);

// Find all 'js/app.js' or app.js references
let idx = 0, count = 0;
while ((idx = s.indexOf('app.js', idx)) >= 0) {
  count++;
  idx += 6;
  if (count > 40) break;
}
console.log('app.js refs:', count);

// Look for any large read_files result - search for "content" blocks larger than 5KB
let pos = 0;
let big = 0;
while ((pos = s.indexOf('"content":"', pos)) >= 0) {
  let len = 0, i = pos + '"content":"'.length;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') { len++; i += 2; continue; }
    if (c === '"') break;
    len++; i++;
  }
  if (len > 5000) {
    console.log('BIG content block @' + pos + ' len ' + len + ' head: ' + s.slice(pos + 12, pos + 120).replace(/\\n/g, '\n'));
    big++;
  }
  pos = i;
}
console.log('big blocks:', big);
