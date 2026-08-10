// Search parent DB harness for app.js source content
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('../.freebuff/desktop-v2.db', { readOnly: true });

const t = db.prepare("SELECT harness_state FROM threads WHERE id = '6e2b0148-082c-40c7-93d9-b8cbbcbda069'").get();
const s = t.harness_state || '';
console.log('harness len:', s.length);

const probes = ['function renderTool', 'const App', 'window.App', 'App.init', 'js/app.js', 'renderHome'];
for (const probe of probes) {
  let idx = 0, count = 0, first = -1;
  while ((idx = s.indexOf(probe, idx)) >= 0) { if (first < 0) first = idx; count++; idx += probe.length; }
  console.log(probe, ':', count, 'hits', first >= 0 ? 'first@' + first : '');
}
