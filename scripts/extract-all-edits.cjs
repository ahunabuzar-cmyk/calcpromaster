// Extract ALL str_replace + write_file tool calls targeting js/app.js from ALL messages
// in ALL DBs, chronologically (by seq), to reconstruct the full app.js evolution.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const results = [];

for (const dbfile of ['.freebuff/desktop.db', '.freebuff/desktop-v2.db', '../.freebuff/desktop-v2.db']) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { continue; }
  const rows = db.prepare("SELECT seq, role, parts_json FROM messages ORDER BY seq").all();
  for (const r of rows) {
    if (r.role !== 'assistant') continue;
    const p = r.parts_json || '';
    // Parse parts array
    let parts;
    try { parts = JSON.parse(p); } catch (e) { continue; }
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (part.kind !== 'tool' || !part.input) continue;
      const input = part.input;
      const toolName = part.toolName;
      if (toolName === 'str_replace' && input.path && input.path.endsWith('js/app.js')) {
        if (Array.isArray(input.replacements)) {
          for (const rep of input.replacements) {
            if (rep && typeof rep.oldString === 'string') {
              results.push({ dbfile, seq: r.seq, type: 'str_replace', oldString: rep.oldString, newString: rep.newString || '', allowMultiple: !!rep.allowMultiple });
            }
          }
        }
      } else if (toolName === 'write_file' && input.path && input.path.endsWith('js/app.js')) {
        results.push({ dbfile, seq: r.seq, type: 'write_file', oldString: '', newString: input.content || '', allowMultiple: false });
      }
    }
  }
}

console.log('Total edits across all DBs:', results.length);
let totalDelta = 0;
let lastWrite = null;
for (const e of results) {
  if (e.type === 'write_file') { lastWrite = e; totalDelta = e.newString.length; }
  else totalDelta += e.newString.length - e.oldString.length;
}
console.log('Net size delta:', totalDelta);
if (lastWrite) console.log('Last full write: seq', lastWrite.seq, lastWrite.dbfile, 'len', lastWrite.newString.length);

fs.writeFileSync('scripts/replay-edits.json', JSON.stringify(results, null, 1));
console.log('saved to scripts/replay-edits.json (all ' + results.length + ')');
