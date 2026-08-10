// Find full privacy.html / terms.html content in message parts (write_file calls)
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

for (const probe of ['privacy.html', 'terms.html']) {
  for (const r of rows) {
    const p = r.parts_json || '';
    const idx = p.indexOf('"' + probe + '"');
    if (idx >= 0) {
      // look for write_file with this path
      const re = new RegExp('"toolName"\\s*:\\s*"write_file"[\\s\\S]{0,400}"path"\\s*:\\s*"' + probe.replace('.', '\\.') + '"[\\s\\S]{0,100}?"content"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}', 'g');
      let m;
      while ((m = re.exec(p)) !== null) {
        console.log('msg', r.seq, probe, 'content len:', m[1].length, 'head:', m[1].slice(0, 80));
      }
    }
  }
}
