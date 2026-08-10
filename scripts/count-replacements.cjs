// Count str_replace calls targeting app.js in chronological order across all harnesses
const { DatabaseSync } = require('node:sqlite');

const targets = [
  ['.freebuff/desktop.db', 'thms5sej581uln'],
  ['.freebuff/desktop.db', 'thms5wsotnhphx'],
];

for (const [dbfile, tid] of targets) {
  const db = new DatabaseSync(dbfile, { readOnly: true });
  const t = db.prepare('SELECT harness_state FROM threads WHERE id = ?').get(tid);
  if (!t || !t.harness_state) continue;
  const s = t.harness_state;

  // Find str_replace tool calls with path js/app.js
  let count = 0;
  let pos = 0;
  while ((pos = s.indexOf('"toolName":"str_replace"', pos)) >= 0) {
    const segment = s.slice(pos, pos + 5000);
    if (segment.includes('js/app.js')) {
      // Extract oldString/newString lengths
      const oldM = segment.match(/"oldString"\s*:\s*"([\s\S]*?)"(?=,\s*"newString")/);
      const newM = segment.match(/"newString"\s*:\s*"([\s\S]*?)"\s*\}/);
      const oldLen = oldM ? oldM[1].length : 0;
      const newLen = newM ? newM[1].length : 0;
      console.log('str_replace @' + pos, 'oldLen:', oldLen, 'newLen:', newLen);
      count++;
    }
    pos += 28;
    if (count > 60) break;
  }
  console.log('---', dbfile, tid, 'total app.js str_replace calls:', count);
}
