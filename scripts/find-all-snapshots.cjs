// Find ALL app.js read_files snapshots across all DBs/threads, report their lengths
const { DatabaseSync } = require('node:sqlite');

const targets = [
  ['.freebuff/desktop.db', 'thms5sej581uln'],
  ['.freebuff/desktop.db', 'thms5wsotnhphx'],
  ['.freebuff/desktop-v2.db', 'thms5sej581uln'],
  ['.freebuff/desktop-v2.db', 'thms5wsotnhphx'],
  ['.freebuff/desktop-v2.db', 'bdab1ea9-8d54-4c59-9c9e-915ea305a2ff'],
  ['../.freebuff/desktop-v2.db', '6e2b0148-082c-40c7-93d9-b8cbbcbda069'],
];

for (const [dbfile, tid] of targets) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { continue; }
  const t = db.prepare('SELECT harness_state FROM threads WHERE id = ?').get(tid);
  if (!t || !t.harness_state) continue;
  const s = t.harness_state;

  // Find every read_files result containing app.js content
  let idx = 0;
  let count = 0;
  while ((idx = s.indexOf('"path":"js', idx)) >= 0 || (idx = s.indexOf('"path": "js', idx)) >= 0) {
    // check it's app.js
    const seg = s.slice(idx, idx + 40);
    if (seg.includes('app.js')) {
      // find content start
      const cs = s.indexOf('"content":"', idx);
      if (cs >= 0 && cs - idx < 200) {
        // scan content length
        let len = 0;
        let i = cs + '"content":"'.length;
        while (i < s.length) {
          const c = s[i];
          if (c === '\\') { len++; i += 2; continue; }
          if (c === '"') break;
          len++; i++;
        }
        console.log(dbfile, tid, 'snapshot @' + idx, 'content len:', len);
        count++;
      }
    }
    idx = idx + 1;
  }
  console.log('  ---', dbfile, tid, 'total:', count);
}
