// Dump the region around const App in desktop.db-wal to check if it's full app.js source
const fs = require('fs');
const b = fs.readFileSync('.freebuff/desktop.db-wal');
const s = b.toString('latin1');

for (const probe of ['const App@6227194', 'window.App@6235048']) {
  const name = probe.split('@')[0];
  const idx = parseInt(probe.split('@')[1], 10);
  console.log('=== ' + probe + ' ===');
  console.log(JSON.stringify(s.slice(idx - 100, idx + 400)));
  console.log();
}
