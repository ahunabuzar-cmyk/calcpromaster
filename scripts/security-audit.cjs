#!/usr/bin/env node
// ============================================================
// CalcProMaster — Static Security Audit (no network, no browser)
// Scans shipped source for the OWASP-style frontend risk classes:
//   - hardcoded secrets / API keys / tokens / credentials
//   - eval / new Function / document.write (XSS amplifier)
//   - innerHTML with user-controlled data (DOM-injection sinks)
//   - unsafe URL schemes (javascript:, data:) in dynamic hrefs
//   - localStorage writes of sensitive data
//   - dangerouslySetInnerHTML (if any React code)
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = ['node_modules', 'deploy', 'docs'];
const EXTS = ['.js', '.html', '.json', '.cjs', '.mjs'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = walk(ROOT);

// ---- 1. Secrets ----
const SECRET_RES = [
  [/AIza[0-9A-Za-z_-]{20,}/, 'Google API key'],
  [/sk-[A-Za-z0-9]{20,}/, 'OpenAI-style key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/, 'private key block'],
  [/ghp_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/(password|passwd|api_key|apikey|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i, 'possible hardcoded credential'],
  [/mongodb(\+srv)?:\/\/[^\s"']+/, 'MongoDB URI'],
];

// ---- 2. XSS / injection sinks ----
const SINK_RES = [
  [/\beval\s*\(/, 'eval('],
  [/new\s+Function\s*\(/, 'new Function('],
  [/document\.write\s*\(/, 'document.write('],
  [/\.innerHTML\s*=\s*/, 'innerHTML assignment'],
  [/insertAdjacentHTML\s*\(/, 'insertAdjacentHTML'],
  [/dangerouslySetInnerHTML/, 'React dangerouslySetInnerHTML'],
  [/javascript:\s*["']?[^"'\s]+/i, 'javascript: URI'],
  [/window\.open\s*\([^)]*user/i, 'window.open with user data'],
];

// ---- 3. localStorage / sensitive ----
const STORE_RES = [
  [/localStorage\.setItem\s*\(\s*["'](?!.*(?:theme|fav|history|visited|consent|settings|result|preset))[^"']*["']/i, 'localStorage setItem'],
  [/sessionStorage\.setItem/, 'sessionStorage setItem'],
];

let issues = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  for (const [re, label] of SECRET_RES) {
    const m = src.match(re);
    if (m) { console.log(`[SECRET] ${rel}: ${label} → ${String(m[0]).slice(0, 40)}`); issues++; }
  }
  for (const [re, label] of SINK_RES) {
    if (re.test(src)) {
      // innerHTML is used pervasively in this vanilla app; flag count only
      const n = (src.match(re) || []).length;
      console.log(`[SINK]   ${rel}: ${label} ×${n}`);
      issues++;
    }
  }
  for (const [re, label] of STORE_RES) {
    if (re.test(src)) { console.log(`[STORE]  ${rel}: ${label}`); issues++; }
  }
}
console.log('\n=== Security audit done: ' + (issues === 0 ? 'NO FINDINGS' : issues + ' findings (review above)') + ' ===');

// ---- 4. Dependency vulnerability status (offline: just inventory) ----
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
console.log('\nDependencies: ' + Object.keys(pkg.dependencies || {}).length + ' runtime, ' + Object.keys(pkg.devDependencies || {}).length + ' dev');
console.log('Runtime deps: ' + Object.keys(pkg.dependencies || {}).join(', '));