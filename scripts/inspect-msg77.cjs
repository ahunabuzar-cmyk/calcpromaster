// Inspect msg77 around the 204933 offset where js/app.js appears
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const r = db.prepare("SELECT parts_json FROM messages WHERE seq = 77").get();
const p = r.parts_json;
console.log('total', p.length);
// Show 1500 chars around the reference
console.log(p.slice(204500, 206000).replace(/\\n/g, '\n'));
