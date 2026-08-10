// Search harness_state blobs for read_files RESULTS that contain app.js content
const { DatabaseSync } = require('node:sqlite');

for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db']) {
  const db = new DatabaseSync(dbfile, { readOnly: true });
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    // look for read_files tool results blocks
    let idx = 0;
    let hits = [];
    while ((idx = s.indexOf('"read_files"', idx)) >= 0) {
      hits.push(idx);
      idx += 12;
      if (hits.length > 20) break;
    }
    if (hits.length) console.log(dbfile, t.id, 'read_files occurrences:', hits.length);
    // check for app.js content inside (large blocks of JS source)
    const probeIdx = s.indexOf('const renderTool');
    const probeIdx2 = s.indexOf('function renderTool');
    if (probeIdx >= 0) console.log('  const renderTool at', probeIdx);
    if (probeIdx2 >= 0) console.log('  function renderTool at', probeIdx2);
  }
}
