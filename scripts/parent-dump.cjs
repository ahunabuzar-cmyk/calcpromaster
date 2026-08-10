// Dump the region around window.App@681742 in parent DB harness
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('../.freebuff/desktop-v2.db', { readOnly: true });
const t = db.prepare("SELECT harness_state FROM threads WHERE id = '6e2b0148-082c-40c7-93d9-b8cbbcbda069'").get();
const s = t.harness_state;

const idx = s.indexOf('window.App', 681742);
console.log('window.App at', idx);
console.log(s.slice(idx - 300, idx + 1500).replace(/\\n/g, '\n'));
