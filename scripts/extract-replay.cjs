// Extract ALL str_replace tool calls targeting js/app.js from a thread's harness_state,
// in chronological order, and save them to a JSON file for replay.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbfile = '.freebuff/desktop.db';
const tid = 'thms5sej581uln';
const db = new DatabaseSync(dbfile, { readOnly: true });
const t = db.prepare('SELECT harness_state FROM threads WHERE id = ?').get(tid);
const s = t.harness_state;

// Find all str_replace tool calls. Format: {"toolName":"str_replace","input":{"path":"js/app.js","replacements":[{...},{...}]}}
const edits = [];
let pos = 0;
let count = 0;
while ((pos = s.indexOf('"toolName":"str_replace"', pos)) >= 0) {
  // Find the input object — scan forward to find "{"
  const openBrace = s.indexOf('"input":{', pos);
  if (openBrace < 0 || openBrace - pos > 3000) { pos += 28; continue; }
  // Read until matching close brace of input
  let depth = 0, i = openBrace + '"input":{'.length - 1;
  let start = i;
  while (i < s.length) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  const inputJson = s.slice(openBrace + '"input":'.length, i + 1);
  try {
    const input = JSON.parse(inputJson);
    if (input.path && input.path.endsWith('js/app.js') && Array.isArray(input.replacements)) {
      for (const r of input.replacements) {
        if (r && typeof r.oldString === 'string') {
          edits.push({
            pos,
            path: input.path,
            oldString: r.oldString,
            newString: r.newString || '',
            allowMultiple: !!r.allowMultiple
          });
          count++;
        }
      }
    }
  } catch (e) { /* malformed */ }
  pos = i + 1;
  if (count > 500) break;
}

console.log('total str_replace edits for app.js:', edits.length);
// Summary: size deltas
let totalDelta = 0;
for (const e of edits) totalDelta += e.newString.length - e.oldString.length;
console.log('total size delta from edits: +' + totalDelta + ' chars');

fs.writeFileSync('scripts/replay-edits.json', JSON.stringify(edits, null, 1));
console.log('saved to scripts/replay-edits.json');

// Show the first few edits
for (const e of edits.slice(0, 5)) {
  console.log('--- pos', e.pos);
  console.log('OLD:', e.oldString.slice(0, 120).replace(/\n/g, '\\n'));
  console.log('NEW:', e.newString.slice(0, 120).replace(/\n/g, '\\n'));
}
