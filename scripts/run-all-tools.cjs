#!/usr/bin/env node
// ============================================================
// CalcProMaster — Run-All-Tools Smoke Test
// Executes EVERY tool's calc() function with its default input
// values and reports tools that throw, return NaN, or return an
// empty result. This is the "sare tools test karo" guarantee.
//
// Usage:  node scripts/run-all-tools.cjs
// Exit:   0 = all tools calculate cleanly, 1 = failures
// ============================================================
const path = require('path');
const fs = require('fs');

// Load the REAL shipped engine modules (no inline drift) and expose
// the same globals the browser gets.
const core = require(path.join(__dirname, '..', 'js', 'core.js'));
global.Charts = core.Charts;
global.AdvancedCalc = core.AdvancedCalc;
global.Currency = core.Currency;
global.Security = core.Security;
try {
  const sm = require(path.join(__dirname, '..', 'js', 'safe-math.js'));
  global.safeEval = sm.safeEval;
} catch (e) { /* optional */ }

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js') && !f.endsWith('.test.js'));

let total = 0;
let pass = 0;
const failures = [];

function buildValues(inputs) {
  const v = {};
  for (const inp of inputs || []) {
    // default: def property; selects fall back to first option
    if (inp.def !== undefined && inp.def !== null) {
      v[inp.id] = inp.def;
    } else if (inp.type === 'select' && inp.opts && inp.opts.length) {
      v[inp.id] = inp.opts[0].v;
    } else if (inp.type === 'number' || inp.type === 'text') {
      v[inp.id] = 0;
    } else {
      v[inp.id] = 0;
    }
  }
  return v;
}

async function main() {
for (const f of files) {
  let tools;
  try {
    tools = require(path.join(dataDir, f));
  } catch (e) {
    failures.push({ file: f, id: '(module)', error: 'MODULE LOAD FAIL: ' + e.message });
    continue;
  }
  const arr = Array.isArray(tools) ? tools : (tools.tools || []);
  for (const t of arr) {
    total++;
    const id = t.id || '(unnamed)';
    // Tools handled by the app OUTSIDE calc(): async tools (calc:null, async:true
    // e.g. currency-converter) and custom-render tools (calc:null, custom: 'scientific')
    // are invoked through app.js executeCalc branches, not t.calc() — skip them here.
    if (typeof t.calc !== 'function') {
      if (t.async === true || t.custom) {
        pass++; // handled by app's async/custom branch
        continue;
      }
      failures.push({ file: f, id, error: 'NO calc function and not async/custom' });
      continue;
    }
    let v;
    try { v = buildValues(t.inputs); } catch (e) {
      failures.push({ file: f, id, error: 'buildValues: ' + e.message });
      continue;
    }
    try {
      // calc may return a promise (app awaits it via executeCalc's .then branch)
      const raw = t.calc(v);
      const out = (raw && typeof raw.then === 'function') ? await raw : raw;
      const resultStr = typeof out === 'string' ? out : (out && out.result != null ? String(out.result) : '');
      if (resultStr.trim() === '') {
        failures.push({ file: f, id, error: 'EMPTY RESULT (calc returned no result string)' });
      } else if (/NaN|Infinity|undefined|\[object/.test(resultStr)) {
        failures.push({ file: f, id, error: 'BAD RESULT: "' + resultStr.slice(0, 60) + '"' });
      } else {
        pass++;
      }
    } catch (e) {
      failures.push({ file: f, id, error: 'THROW: ' + e.message });
    }
  }
}

console.log('=== Run-All-Tools Smoke Test ===');
console.log('Tools encountered:', total, '(incl. app-handled async/custom)');
console.log('Passed         :', pass);
console.log('Failed         :', failures.length);
if (failures.length) {
  console.log('--- FAILURES ---');
  for (const f of failures.slice(0, 30)) {
    console.log(`  [${f.file}] ${f.id}: ${f.error}`);
  }
  if (failures.length > 30) console.log(`  ... and ${failures.length - 30} more`);
  process.exit(1);
}
console.log('ALL TOOLS CALCULATE CLEANLY ✓');
process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
