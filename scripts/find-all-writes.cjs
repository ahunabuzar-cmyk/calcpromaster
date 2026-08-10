// Find ALL write_file tool calls (any param format) and report content sizes
const { DatabaseSync } = require('node:sqlite');

for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db', '../.freebuff/desktop-v2.db']) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { console.log('skip', dbfile); continue; }
  const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();
  let found = 0;
  for (const r of rows) {
    const p = r.parts_json || '';
    // Match write_file tool calls with any content field
    const re = /"toolName"\s*:\s*"write_file"[\s\S]{0,300}?"input"\s*:\s*\{([\s\S]*?)\}\s*\}/g;
    let m;
    while ((m = re.exec(p)) !== null) {
      const input = m[1];
      const pathM = input.match(/"path"\s*:\s*"([^"]+)"/);
      const fileM = input.match(/"file"\s*:\s*"([^"]+)"/);
      const contentM = input.match(/"content"\s*:\s*"([\s\S]*?)"(?=,|$)/);
      const target = pathM ? pathM[1] : (fileM ? fileM[1] : '?');
      const contentLen = contentM ? contentM[1].length : 0;
      if (contentLen > 3000) {
        console.log(dbfile, 'msg' + r.seq, '->', target, 'content:', contentLen, 'chars');
        found++;
      }
    }
  }
  console.log('---', dbfile, 'big writes:', found);
}
