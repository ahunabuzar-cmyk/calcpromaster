// Search harness_state blobs for full app.js content
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db']) {
  const db = new DatabaseSync(dbfile, { readOnly: true });
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    const hits = [];
    let idx = 0;
    while ((idx = s.indexOf('renderTool', idx)) >= 0) { hits.push(idx); idx += 10; }
    if (hits.length > 0) {
      console.log(dbfile, 'thread', t.id, 'harness len', s.length, 'renderTool hits:', hits.length, 'first at', hits[0]);
      // Show context around first hit
      const h = hits[0];
      console.log('  context:', s.slice(Math.max(0, h - 200), h + 300).slice(0, 500).replace(/\\n/g, '\n'));
      console.log();
    }
  }
}
