// Syntax-check every .js file in js/, scripts/, and root-level JS entry points.
// Used by the CI pipeline (npm run lint:js). Exits 1 on any parse error.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const roots = ['js', 'scripts'];
const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.js') && fs.statSync(f).isFile());

const files = [];
const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
};
roots.forEach(walk);
rootFiles.forEach(f => files.push(f));

// Skip known-broken scratch files if any remain (they are not loaded at runtime)
const skip = files.filter(f => /fix-|scratch|tmp-|_draft/.test(f) && !fs.existsSync(f));
let failures = 0;

for (const f of files) {
  if (skip.includes(f)) continue;
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failures++;
    const msg = String(e.stderr || e.message).split('\n')[0];
    console.log('FAIL ' + f + ' — ' + msg);
  }
}

console.log(`syntax-check: ${files.length - skip.length} files checked, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);
