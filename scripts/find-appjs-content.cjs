// Search for the actual app.js source text in message blobs
// The file starts with a comment header. Find distinctive app.js fragments.
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

// App.js distinctive strings (from crash logs in DB: renderTool, navigate, calc form)
const probes = ['function renderTool', 'const renderTool', 'renderTool:', 'function renderHome', 'function navigate', 'function renderCategory'];
for (const r of rows) {
  const p = r.parts_json || '';
  for (const probe of probes) {
    const idx = p.indexOf(probe);
    if (idx >= 0) {
      // Check length of surrounding code-like content
      const snippet = p.slice(idx, idx + 300).replace(/\\n/g, '\n');
      console.log('seq', r.seq, 'probe:', probe, 'at', idx);
      console.log('   ', snippet.slice(0, 250));
      console.log();
    }
  }
}
