// Check threads table for world_snapshot / harness_state that may contain file contents
const { DatabaseSync } = require('node:sqlite');
for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db']) {
  const db = new DatabaseSync(dbfile, { readOnly: true });
  console.log('=== ' + dbfile + ' ===');
  const threads = db.prepare('SELECT id, title, length(world_snapshot) ws, length(harness_state) hs, length(turn_state) ts FROM threads').all();
  for (const t of threads) {
    console.log('thread', t.id, JSON.stringify((t.title || '').slice(0, 50)), 'world_snapshot:', t.ws, 'harness_state:', t.hs, 'turn_state:', t.ts);
  }
}
