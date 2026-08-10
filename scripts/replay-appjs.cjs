// REPLAY all str_replace edits on the recovered base app.js to reconstruct the final version
const fs = require('fs');

let src = fs.readFileSync('js/app.js', 'utf8'); // recovered base (43KB snapshot)
const edits = JSON.parse(fs.readFileSync('scripts/replay-edits.json', 'utf8'));

// Filter edits to str_replace only for the base application (write_file overwrites start fresh)
let applied = 0, skipped = 0, rewrites = 0;
for (const e of edits) {
  if (e.type === 'write_file') {
    // A later full rewrite replaces everything (only use the LAST one as base)
    // Note: we keep str_replace chain; write_file would reset the base — for this
    // reconstruction we only use the read_files snapshot as base and apply str_replace.
    rewrites++;
    continue;
  }
  const idx = e.allowMultiple ? (() => { let c = 0; return src.indexOf(e.oldString); })() : src.indexOf(e.oldString);
  if (idx >= 0) {
    src = src.slice(0, idx) + e.newString + src.slice(idx + e.oldString.length);
    applied++;
  } else {
    skipped++;
  }
}

console.log('applied:', applied, 'skipped:', skipped, 'write_file rewrites ignored:', rewrites);
console.log('result size:', src.length);

fs.writeFileSync('js/app.js.reconstructed', src);
console.log('saved to js/app.js.reconstructed');
