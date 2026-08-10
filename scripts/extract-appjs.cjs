// Extract candidate app.js content from DB messages (tool calls with full file writes)
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

const candidates = [];
for (const r of rows) {
  const p = r.parts_json || '';
  // A write_file tool call to app.js has "file":"js/app.js" or "path":"js/app.js" followed by a big content string
  const re = /"path"\s*:\s*"js\/app\.js"[\s\S]{0,200}?"content"\s*:\s*"([\s\S]*?)"\s*\}/g;
  let m;
  while ((m = re.exec(p)) !== null) {
    const content = m[1];
    if (content.length > 5000) {
      candidates.push({ seq: r.seq, len: content.length, start: content.slice(0, 200) });
    }
  }
}
console.log('Candidates with full content >5000 chars:', candidates.length);
for (const c of candidates) {
  console.log('--- seq', c.seq, 'len', c.len);
  console.log(c.start.replace(/\\n/g, '\n').slice(0, 300));
}
