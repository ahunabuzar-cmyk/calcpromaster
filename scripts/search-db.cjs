// Search Freebuff desktop DBs for the original js/app.js content
const { DatabaseSync } = require('node:sqlite');

for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db']) {
  const db = new DatabaseSync(dbfile, { readOnly: true });
  const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();
  console.log('=== ' + dbfile + ' (' + rows.length + ' assistant msgs) ===');
  for (const r of rows) {
    const p = r.parts_json || '';
    const idx = p.indexOf('js/app.js');
    const idx2 = p.indexOf('App.init');
    const idx3 = p.indexOf('window.App');
    if (idx >= 0 || idx2 >= 0 || idx3 >= 0) {
      console.log('seq', r.seq, 'js/app.js@' + idx, 'App.init@' + idx2, 'window.App@' + idx3);
    }
  }
}
