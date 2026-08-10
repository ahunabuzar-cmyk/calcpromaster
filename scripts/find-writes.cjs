// Find write_file / str_replace tool calls that contain app.js code content
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

const re = /"toolName":"write_file"[^}]*?"input":\{[^}]*?"path"\s*:\s*"js\/app\.js"[\s\S]*?"content"\s*:\s*"([\s\S]*?)"\s*\}/g;
const re2 = /"toolName":"str_replace"[\s\S]{0,200}?"path"\s*:\s*"js\/app\.js"/g;

for (const r of rows) {
  const p = r.parts_json || '';
  let m;
  let count = 0;
  re.lastIndex = 0;
  while ((m = re.exec(p)) !== null) { count++; }
  const m2 = p.match(re2);
  if (count > 0 || m2) {
    console.log('seq', r.seq, 'write_file app.js hits:', count, 'str_replace hits:', m2 ? m2.length : 0);
  }
}
