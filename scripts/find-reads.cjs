// Find read_files tool RESULTS that contain the full app.js content
// The tool result for read_files with js/app.js in paths returns the file body
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('.freebuff/desktop.db', { readOnly: true });
const rows = db.prepare("SELECT seq, parts_json FROM messages WHERE role = 'assistant' ORDER BY seq").all();

for (const r of rows) {
  const p = r.parts_json || '';
  // tool results look like {"kind":"tool_result","toolName":"read_files","output":{...}}
  const idx = p.indexOf('js/app.js');
  if (idx < 0) continue;
  // Find "tool_result" blocks with content that looks like app.js code (has renderTool or App =)
  const re = /"kind":"tool_result"[\s\S]{0,300}?"content"\s*:\s*"([\s\S]*?)"(?=,\s*"[\w]+"|\s*\})/g;
  let m;
  while ((m = re.exec(p)) !== null) {
    const c = m[1];
    if (c.length > 10000 && (c.indexOf('renderTool') >= 0 || c.indexOf('const App') >= 0 || c.indexOf('window.App') >= 0)) {
      console.log('=== seq', r.seq, 'content len', c.length, '===');
      console.log(c.slice(0, 400).replace(/\\n/g, '\n'));
      console.log('...');
      break;
    }
  }
}
