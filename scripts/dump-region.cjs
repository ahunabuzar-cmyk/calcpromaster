// Dump raw region around a read_files call referencing js/app.js to see the result format
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

// seq 12 had read_files with js/app.js in paths at ~90178
const r = rows.find(x => x.seq === 12);
const p = r.parts_json || '';
// Find where read_files result output would be. Look for "tool_result" after index 90178
let pos = p.indexOf('tool_result', 90178);
if (pos < 0) pos = p.indexOf('js/app.js', 90178);
console.log('seq12, region at', pos, 'total', p.length);
console.log(p.slice(pos, pos + 2000).replace(/\\n/g, '\n'));
