// Comprehensive: find EVERY large content block that looks like app.js source
// in all harness_state + parts_json across all DBs
const { DatabaseSync } = require('node:sqlite');

const DB_FILES = [
  ['.freebuff/desktop.db', true],      // has messages table
  ['.freebuff/desktop-v2.db', true],
  ['../.freebuff/desktop-v2.db', true],
];

const allBlocks = [];

for (const [dbfile] of DB_FILES) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { continue; }

  // threads harness_state
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    // find every "content":" with big JS content
    let pos = 0;
    while ((pos = s.indexOf('"content":"', pos)) >= 0) {
      let len = 0, i = pos + '"content":"'.length;
      const start = i;
      let looksLikeJs = false;
      while (i < s.length) {
        const c = s[i];
        if (c === '\\') { len += 2; i += 2; continue; }
        if (c === '"') break;
        len++; i++;
      }
      const chunk = s.slice(start, Math.min(start + 600, i));
      if (len > 20000 && (chunk.includes('renderTool') || chunk.includes('App = (') || chunk.includes('function navigate'))) {
        allBlocks.push({ src: dbfile + '#harness-' + t.id, len, head: chunk.replace(/\\n/g, '\n').slice(0, 120) });
      }
      pos = i;
    }
  }

  // messages parts_json
  try {
    const rows = db.prepare("SELECT seq, parts_json FROM messages ORDER BY seq").all();
    for (const r of rows) {
      const p = r.parts_json || '';
      let pos = 0;
      while ((pos = p.indexOf('"content":"', pos)) >= 0) {
        let len = 0, i = pos + '"content":"'.length;
        const start = i;
        while (i < p.length) {
          const c = p[i];
          if (c === '\\') { len += 2; i += 2; continue; }
          if (c === '"') break;
          len++; i++;
        }
        const chunk = p.slice(start, Math.min(start + 600, i));
        if (len > 20000 && (chunk.includes('renderTool') || chunk.includes('App = (') || chunk.includes('function navigate'))) {
          allBlocks.push({ src: dbfile + '#msg' + r.seq, len, head: chunk.replace(/\\n/g, '\n').slice(0, 120) });
        }
        pos = i;
      }
    }
  } catch (e) {}
}

console.log('Large app.js-like blocks:', allBlocks.length);
for (const b of allBlocks.sort((a, b) => b.len - a.len)) {
  console.log('---', b.len, 'chars', b.src);
  console.log(b.head);
  console.log();
}
