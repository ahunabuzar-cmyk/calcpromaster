// Inspect the parts_json structure around js/app.js references to find the file-write tool call format
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

// Look at the biggest messages that reference js/app.js
const interesting = [77, 12, 57, 59, 95];
for (const seq of interesting) {
  const r = rows.find(x => x.seq === seq);
  if (!r) continue;
  const p = r.parts_json || '';
  const idx = p.indexOf('js/app.js');
  console.log('=== seq', seq, 'total', p.length, 'ref at', idx, '===');
  // Show 600 chars around the reference
  console.log(p.slice(Math.max(0, idx - 300), idx + 300).replace(/\\n/g, '\n'));
  console.log();
}
