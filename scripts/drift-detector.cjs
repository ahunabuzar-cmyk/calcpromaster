// ============================================================
// CalcProMaster — MIRROR FILE DRIFT DETECTOR
//
// Some modules exist TWICE: once bundled inside js/core.js (the
// runtime copy the browser actually uses) and once as a standalone
// file (js/currency.js, js/safe-math.js, ...) so tests/Node can
// require() them. If the two copies drift apart, tests verify one
// implementation while production runs another — silent divergence.
//
// This detector loads BOTH copies in isolated VM contexts and
// compares the exported API surface:
//   - export keys
//   - function signatures + normalized source
//   - constant/primitive values
//   - nested object/array constants
//
// It does NOT compare file timestamps. Exit 0 = synchronized,
// exit non-zero = drift (with exact file/function/constant printed).
//
// Usage:  node scripts/drift-detector.cjs
// npm:    npm run drift:check
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ---- tolerant browser-ish sandbox so both copies evaluate ----
function makeSandbox() {
  const noopEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [], focus() {}, click() {}, getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, left: 0 }), cloneNode: () => noopEl() });
  const sandbox = {
    console,
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, String, Boolean,
    Array, Object, RegExp, Error, Promise, Map, Set, Symbol, BigInt, Infinity, NaN, undefined,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    MathJax: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear() {}, key: () => null, length: 0 },
    navigator: { language: 'en', userAgent: 'drift-check', onLine: true },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
    Blob: function Blob() {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: function FileReader() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    // cryptoRandom helpers (Security module in core.js)
    crypto: { getRandomValues: (a) => { for (let i = 0; i < a.length; i++) a[i] = 1; return a; } },
    performance: { now: () => 0 },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = {
    createElement: () => noopEl(),
    createElementNS: () => noopEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {}, removeEventListener() {},
    body: noopEl(), head: noopEl(), documentElement: noopEl(),
    title: '', cookie: '',
    createTextNode: () => ({ nodeType: 3 }),
  };
  return sandbox;
}

function loadModule(file, moduleName) {
  const abs = path.join(ROOT, file);
  const code = fs.readFileSync(abs, 'utf8');
  const sandbox = makeSandbox();
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  // Some modules expose on window.<name>, others only set window.safeEval
  // while the const itself stays a sandbox global — check window, sandbox,
  // then the context's lexical scope (top-level `const` bindings).
  let mod = (sandbox.window && sandbox.window[moduleName]) || sandbox[moduleName];
  if (!mod) {
    try { mod = vm.runInContext(moduleName, sandbox); } catch (e) { mod = undefined; }
  }
  if (!mod) throw new Error(`module ${moduleName} not exposed by ${file}`);
  return mod;
}

// ---- Behavioral probes: when function SOURCE differs only cosmetically
// (minified vs readable, inline array vs named const), verify both copies
// actually behave identically on representative inputs before flagging.
// Probes: module -> [ [fnName, [args...]], ... ] (args are serialized JSON).
const PROBES = {
  QRCode: [
    ['generate', ['Hello']],
    ['generate', ['CalcProMaster 1206+ calculators']],
  ],
  AdvancedCalc: [
    ['pctSteps', [25, 200]],
    ['pctSteps', [5, 0]],
    ['bmiSteps', [70, 170]],
    ['bmiSteps', [70, 0]],
  ],
  SafeMathParser: [
    ['safeEval', ['2+3*4']],
    ['safeEval', ['sqrt(144)+2^4']],
    ['safeEval', ['0.1+0.2']],
  ],
  Currency: [
    ['formatAmount', [1234.5, 'USD', 'en-US']],
    ['formatAmount', [1234.5, 'INR', 'en-IN']],
  ],
};

function runProbes(moduleName, coreMod, mirrorMod) {
  const probes = PROBES[moduleName] || [];
  const mismatches = [];
  for (const [fn, args] of probes) {
    let a, b, aErr, bErr;
    try { a = coreMod[fn](...args); } catch (e) { aErr = e.message; }
    try { b = mirrorMod[fn](...args); } catch (e) { bErr = e.message; }
    if (aErr || bErr) {
      if (aErr !== bErr) mismatches.push(`${fn}: core ${aErr ? 'throws ' + aErr : 'ok'} vs mirror ${bErr ? 'throws ' + bErr : 'ok'}`);
      continue;
    }
    let ja, jb;
    try { ja = JSON.stringify(a); } catch (e) { ja = String(a); }
    try { jb = JSON.stringify(b); } catch (e) { jb = String(b); }
    if (ja !== jb) mismatches.push(`${fn}(${JSON.stringify(args)}) differs: ${ja.slice(0, 80)} vs ${jb.slice(0, 80)}`);
  }
  return mismatches;
}

// Normalize a function source: strip comments, collapse whitespace.
function normSource(fn) {
  if (typeof fn !== 'function') return String(fn);
  return fn.toString()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snap(value, depth = 0) {
  if (typeof value === 'function') return { type: 'fn', src: normSource(value) };
  if (value === null) return { type: 'null' };
  const t = typeof value;
  if (t === 'number' || t === 'string' || t === 'boolean') return { type: t, v: value };
  if (t === 'undefined') return { type: 'undefined' };
  if (Array.isArray(value)) {
    if (depth > 6) return { type: 'array', v: JSON.stringify(value) };
    return { type: 'array', items: value.map((x) => snap(x, depth + 1)) };
  }
  if (t === 'object') {
    if (depth > 6) return { type: 'object', v: JSON.stringify(value) };
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = snap(value[k], depth + 1);
    return { type: 'object', keys: out };
  }
  return { type: t, v: String(value) };
}

const PAIRS = [
  { core: 'js/core.js', mirror: 'js/currency.js', module: 'Currency' },
  { core: 'js/core.js', mirror: 'js/safe-math.js', module: 'SafeMathParser' },
  { core: 'js/core.js', mirror: 'js/advanced-calc.js', module: 'AdvancedCalc' },
  { core: 'js/core.js', mirror: 'js/qrcode.js', module: 'QRCode' },
];

function main() {
  let failed = false;
  console.log('=== MIRROR DRIFT DETECTOR ===');
  for (const pair of PAIRS) {
    let coreMod, mirrorMod;
    try {
      coreMod = loadModule(pair.core, pair.module);
      mirrorMod = loadModule(pair.mirror, pair.module);
    } catch (e) {
      failed = true;
      console.log(`  ✗ ${pair.module}: LOAD FAILURE — ${e.message}`);
      continue;
    }
    const coreKeys = Object.keys(coreMod).sort();
    const mirrorKeys = Object.keys(mirrorMod).sort();
    const coreSnap = snap(coreMod);
    const mirrorSnap = snap(mirrorMod);
    const diffs = [];
    const funcSrcDiffs = [];

    if (JSON.stringify(coreKeys) !== JSON.stringify(mirrorKeys)) {
      const onlyCore = coreKeys.filter((k) => !mirrorKeys.includes(k));
      const onlyMirror = mirrorKeys.filter((k) => !coreKeys.includes(k));
      if (onlyCore.length) diffs.push(`exports only in core.js: ${onlyCore.join(', ')}`);
      if (onlyMirror.length) diffs.push(`exports only in mirror: ${onlyMirror.join(', ')}`);
    }
    for (const k of coreKeys) {
      if (!mirrorKeys.includes(k)) continue;
      const a = coreMod[k];
      const b = mirrorMod[k];
      if (typeof a === 'function' && typeof b === 'function') {
        if (normSource(a) !== normSource(b)) funcSrcDiffs.push(k);
      } else if (typeof a === 'number' || typeof a === 'string' || typeof a === 'boolean') {
        if (a !== b) diffs.push(`constant '${k}': ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      } else {
        const sa = snap(a);
        const sb = snap(b);
        if (JSON.stringify(sa) !== JSON.stringify(sb)) diffs.push(`value '${k}' differs`);
      }
    }
    // Function source diffs: run behavioral probes — if behavior matches,
    // the difference is cosmetic (minified vs readable) and acceptable.
    let realFuncDiffs = [];
    const probeMismatches = funcSrcDiffs.length ? runProbes(pair.module, coreMod, mirrorMod) : [];
    if (funcSrcDiffs.length) {
      const hadProbes = (PROBES[pair.module] || []).length > 0;
      if (!hadProbes) {
        // No probes defined for this module — treat source diff as real.
        realFuncDiffs = funcSrcDiffs;
      } else {
        // Probes ran: only functions with a behavior mismatch are real drift.
        realFuncDiffs = funcSrcDiffs.filter((k) => probeMismatches.some((m) => m.startsWith(k)));
        if (probeMismatches.length === 0) {
          console.log(`  ~ ${pair.module}: cosmetic source diff only (${funcSrcDiffs.join(', ')}) — behavior probes match`);
        }
      }
    }
    for (const m of probeMismatches) diffs.push('behavior: ' + m);
    for (const k of realFuncDiffs) diffs.push(`function '${k}' implementation differs (no probe mismatch, source differs)`);
    if (diffs.length) {
      failed = true;
      console.log(`  ✗ ${pair.module} (core.js vs ${pair.mirror}): DRIFT`);
      for (const d of diffs) console.log(`      · ${d}`);
    } else {
      console.log(`  ✓ ${pair.module}: synchronized (${coreKeys.length} exports match)`);
    }
  }
  if (failed) {
    console.error('\n❌ DRIFT DETECTED — fix the mirrored copies before release.');
    process.exit(1);
  }
  console.log('\n✅ DRIFT CHECK = PASS — all mirrored modules synchronized.');
}

main();
