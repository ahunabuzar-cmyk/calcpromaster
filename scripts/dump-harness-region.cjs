// Dump harness_state around function renderTool
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const t = db.prepare("SELECT harness_state FROM threads WHERE id = 'thms5sej581uln'").get();
const s = t.harness_state;
const idx = s.indexOf('function renderTool', 264745);
console.log('at', idx);
console.log(s.slice(idx - 200, idx + 2500).replace(/\\n/g, '\n'));
