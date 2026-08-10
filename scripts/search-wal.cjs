// Search WAL/db files for large contiguous app.js source blocks
const fs = require('fs');

const files = [
  '.freebuff/desktop.db',
  '.freebuff/desktop.db-wal',
  '.freebuff/desktop-v2.db',
  '.freebuff/desktop-v2.db-wal',
  '../.freebuff/desktop-v2.db',
  '../.freebuff/desktop-v2.db-wal',
  '../.freebuff/.freebuff/desktop-v2.db',
];

for (const f of files) {
  let b;
  try { b = fs.readFileSync(f); } catch (e) { continue; }
  const s = b.toString('latin1');
  // Look for app.js header comment patterns
  const probes = ['CalcProMaster', 'renderTool', 'const App', 'window.App', 'App = (function', '_currentTool'];
  const results = [];
  for (const probe of probes) {
    let idx = 0; let c = 0;
    while ((idx = s.indexOf(probe, idx)) >= 0 && c < 3) { results.push(probe + '@' + idx); idx += probe.length; c++; }
  }
  if (results.length) console.log(f, '->', results.slice(0, 8).join('  '));
}
