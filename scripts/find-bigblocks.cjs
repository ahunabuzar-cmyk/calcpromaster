// Find any JSON block in messages or harness_state > 20KB that contains app.js code
const { DatabaseSync } = require('node:sqlite');

const blobs = [];
for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db']) {
  const db = new DatabaseSync(dbfile, { readOnly: true });
  const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();
  for (const r of rows) {
    const p = r.parts_json || '';
    if (p.includes('renderTool') && p.length > 50000) {
      blobs.push({ src: dbfile + '#msg' + r.seq, len: p.length });
    }
  }
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    if (s.includes('renderTool') && s.length > 50000) {
      blobs.push({ src: dbfile + '#harness-' + t.id, len: s.length });
    }
  }
}
console.log('Big blobs with renderTool:');
for (const b of blobs) console.log(b.src, b.len);

// Now scan each for the biggest contiguous app.js-looking chunk
for (const b of blobs) {
  const db = new DatabaseSync(b.src.split('#')[0], { readOnly: true });
  let content;
  if (b.src.includes('#msg')) {
    const seq = parseInt(b.src.split('#msg')[1], 10);
    content = db.prepare("SELECT parts_json FROM messages WHERE seq = ?").get(seq).parts_json;
  } else {
    const tid = b.src.split('#harness-')[1];
    content = db.prepare('SELECT harness_state FROM threads WHERE id = ?').get(tid).harness_state;
  }
  // Find the longest run that looks like JS source (heuristic: contains 'function renderTool' or 'const App' or 'renderTool:')
  const re = /function renderTool[\s\S]*?^\s*\}/gm;
  let m = content.match(re);
  if (m) console.log(b.src, '-> function renderTool block len', m[0].length);
}
