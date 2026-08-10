// Search ALL DB files for run_terminal_command stdout containing app.js source
// The app.js source would appear in tool results if anyone ran cat/sed on it
const { DatabaseSync } = require('node:sqlite');

const dbFiles = ['.freebuff/desktop.db', '.freebuff/desktop-v2.db', '../.freebuff/desktop-v2.db'];

for (const dbfile of dbFiles) {
  let db;
  try { db = new DatabaseSync(dbfile, { readOnly: true }); } catch (e) { continue; }
  // Search raw harness_state and parts_json text for large app.js source blocks
  const threads = db.prepare('SELECT id, harness_state FROM threads WHERE harness_state IS NOT NULL').all();
  for (const t of threads) {
    const s = t.harness_state || '';
    // Find "stdout" values that contain app.js code: look for 'function renderTool' preceded by stdout
    let idx = 0;
    while ((idx = s.indexOf('function renderTool', idx)) >= 0) {
      // Check 500 chars before — is this inside a stdout/json value (actual code) or a command string?
      const before = s.slice(Math.max(0, idx - 800), idx);
      const after = s.slice(idx, idx + 2000);
      // Actual source has code context, commands have "command":...
      const isCommand = before.includes('"command"') && !before.includes('"stdout"');
      console.log(dbfile, t.id, 'renderTool@' + idx, isCommand ? '(in command)' : '(maybe source!)');
      if (!isCommand) {
        console.log('--- CONTEXT ---');
        console.log(after.replace(/\\n/g, '\n').slice(0, 1200));
        console.log('==============');
      }
      idx += 18;
    }
  }
  console.log('done', dbfile);
}
