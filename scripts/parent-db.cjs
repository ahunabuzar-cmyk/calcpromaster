// Check the parent-level .freebuff DB (different from project's) for app.js content
const { DatabaseSync } = require('node:sqlite');

const dbfile = '../.freebuff/desktop-v2.db';
let db;
try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { console.log('ERR', e.message); process.exit(0); }

const threads = db.prepare('SELECT id, title, length(harness_state) hs, length(world_snapshot) ws FROM threads').all();
console.log('threads:', threads.length);
for (const t of threads) console.log(t.id, JSON.stringify((t.title||'').slice(0,60)), 'hs:', t.hs, 'ws:', t.ws);

// check messages count
const c = db.prepare('SELECT COUNT(*) c FROM messages').get();
console.log('messages:', c.c);
