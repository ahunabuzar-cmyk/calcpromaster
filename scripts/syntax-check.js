// Syntax-check every JS file the repo ships: js/, scripts/ and root-level entry
// points. Extension `.cjs` counts — nearly every gate in this repo is CommonJS,
// and walking only `.js` silently skipped the exact files CI depends on, so the
// step kept reporting "0 failed" while a script under scripts/ would not parse.
// Used by CI (npm run lint:js); exits 1 on any parse error.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// `functions/` holds the Pages Functions that run in front of every request, so
// a typo there takes the whole site down. It was outside this gate until
// 2026-10-21 — which is exactly how a middleware that broke every SPA route
// shipped. Those files are ESM, hence the module-type handling below.
const ROOTS = ['js', 'scripts', 'functions'];
const JS_FILE = /\.(cjs|mjs|js)$/i;

// Paths are returned with forward slashes and relative to rootDir, so the same
// call gives the same list on Windows and on the Linux CI runner.
function collectFiles(rootDir = '.', roots = ROOTS) {
  const files = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, relPath);
      else if (JS_FILE.test(entry.name)) files.push(relPath);
    }
  };
  for (const dir of roots) {
    const full = path.join(rootDir, dir);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) walk(full, dir);
  }
  for (const entry of fs.readdirSync(rootDir)) {
    const full = path.join(rootDir, entry);
    if (JS_FILE.test(entry) && fs.statSync(full).isFile()) files.push(entry);
  }
  return files;
}

// Returns null when the file parses, otherwise the first line of the parser
// error. Each file gets its own process so `node --check` honours that file's
// module type instead of reporting ESM syntax as a CommonJS error.
function checkSyntax(file) {
  let target = file;
  let tmp = null;
  try {
    // An ESM file with a `.js` extension inside a CommonJS package parses as a
    // syntax error under `node --check` even when it is valid. Check a `.mjs`
    // copy instead, so module type comes from the extension.
    const src = fs.readFileSync(file, 'utf8');
    if (/\.js$/i.test(file) && /^\s*(import|export)\b/m.test(src)) {
      tmp = path.join(os.tmpdir(), 'syntax-check-' + process.pid + '-' + path.basename(file).replace(/\.js$/i, '') + '.mjs');
      fs.writeFileSync(tmp, src);
      target = tmp;
    }
    execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
    return null;
  } catch (e) {
    // Report the original path, not the temp copy.
    return String(e.stderr || e.message).split('\n')[0].trim().replace(target, file);
  } finally {
    if (tmp) { try { fs.unlinkSync(tmp); } catch (e) { /* best effort */ } }
  }
}

function run(rootDir = '.') {
  const files = collectFiles(rootDir);
  let failures = 0;
  for (const file of files) {
    const err = checkSyntax(path.join(rootDir, file));
    if (err) {
      failures++;
      console.log('FAIL ' + file + ' — ' + err);
    }
  }
  console.log(`syntax-check: ${files.length} files checked, ${failures} failed`);
  return failures > 0 ? 1 : 0;
}

module.exports = { collectFiles, checkSyntax, run, ROOTS, JS_FILE };

if (require.main === module) process.exit(run('.'));
