// Search str_replace tool calls in DB for toggleThemeMenu and executeCommand content
const { DatabaseSync } = require('node:sqlite');

for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db', '../.freebuff/desktop-v2.db']) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { continue; }
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    for (const probe of ['toggleThemeMenu', 'executeCommand', 'function executeCommand', 'toggleThemeMenu(event']) {
      let idx = 0;
      while ((idx = s.indexOf(probe, idx)) >= 0) {
        // Show surrounding context (is it a str_replace newString with code?)
        const ctx = s.slice(idx, idx + 400);
        console.log('---', dbfile, t.id, probe, '@' + idx);
        console.log(ctx.replace(/\\n/g, '\n').slice(0, 350));
        console.log();
        idx += probe.length;
      }
    }
  }
}
