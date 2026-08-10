// Scan ALL DBs (messages parts_json + harness_state) for app.js header comment,
// report every snapshot length. This finds the MOST COMPLETE app.js copy.
const { DatabaseSync } = require('node:sqlite');

const DB_FILES = ['.freebuff/desktop.db', '.freebuff/desktop-v2.db', '../.freebuff/desktop-v2.db', '../.freebuff/.freebuff/desktop-v2.db'];
const HEADER = 'CalcPro Main App';

const results = [];

for (const dbfile of DB_FILES) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { continue; }
  // 1. messages parts_json
  const rows = db.prepare("SELECT seq, parts_json FROM messages ORDER BY seq").all();
  for (const r of rows) {
    const p = r.parts_json || '';
    let idx = 0;
    while ((idx = p.indexOf(HEADER, idx)) >= 0) {
      // find the content string start before it
      const cs = p.lastIndexOf('"content":"', idx);
      if (cs >= 0 && idx - cs < 300) {
        let len = 0, i = cs + '"content":"'.length;
        while (i < p.length) {
          const c = p[i];
          if (c === '\\') { len++; i += 2; continue; }
          if (c === '"') break;
          len++; i++;
        }
        results.push({ src: dbfile + '#msg' + r.seq, len });
      }
      idx += HEADER.length;
    }
  }
  // 2. harness_state
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    let idx = 0;
    while ((idx = s.indexOf(HEADER, idx)) >= 0) {
      const cs = s.lastIndexOf('"content":"', idx);
      if (cs >= 0 && idx - cs < 300) {
        let len = 0, i = cs + '"content":"'.length;
        while (i < s.length) {
          const c = s[i];
          if (c === '\\') { len++; i += 2; continue; }
          if (c === '"') break;
          len++; i++;
        }
        results.push({ src: dbfile + '#harness-' + t.id, len });
      }
      idx += HEADER.length;
    }
  }
}

console.log('All app.js snapshots found:');
for (const r of results.sort((a, b) => b.len - a.len)) {
  console.log(r.len + ' chars  <- ' + r.src);
}
