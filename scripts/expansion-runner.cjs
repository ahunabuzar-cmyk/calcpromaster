#!/usr/bin/env node
// ============================================================
// CalcProMaster — Calculator Expansion Runner
// Loads per-category tool definitions from scripts/expansion/*.cjs,
// VALIDATES every tool (runs calc + steps with default inputs,
// aborts on throw/empty/NaN so we never ship a broken tool), then
// appends them to the matching js/data/*.js file (deduped by id).
//
// Usage:  node scripts/expansion-runner.cjs
// Exit:   0 = all tools valid and applied, 1 = failure (nothing written)
// ============================================================
const fs = require('fs');
const path = require('path');

// Expose the same globals the browser gets (Charts, AdvancedCalc, Currency,
// Security, safeEval) so calc()/steps() validation runs realistically.
const core = require(path.join(__dirname, '..', 'js', 'core.js'));
global.Charts = core.Charts;
global.AdvancedCalc = core.AdvancedCalc;
global.Currency = core.Currency;
global.Security = core.Security;
try {
  const sm = require(path.join(__dirname, '..', 'js', 'safe-math.js'));
  global.safeEval = sm.safeEval;
} catch (e) { /* optional */ }

const EXPANSION_DIR = path.join(__dirname, 'expansion');
const DATA_DIR = path.join(__dirname, '..', 'js', 'data');

// ─── Validation helpers ─────────────────────────────────────
function buildValues(inputs) {
  const v = {};
  for (const inp of inputs || []) {
    if (inp.def !== undefined && inp.def !== null) v[inp.id] = inp.def;
    else if (inp.type === 'select' && inp.opts && inp.opts.length) v[inp.id] = inp.opts[0].v;
    else if (inp.type === 'number' || inp.type === 'text') v[inp.id] = 0;
    else v[inp.id] = 0;
  }
  return v;
}

function validateTool(catKey, t) {
  const errs = [];
  if (!t.id || !/^[a-z0-9-]+$/.test(t.id)) errs.push('bad id: ' + t.id);
  if (!t.name) errs.push('missing name');
  if (!t.desc) errs.push('missing desc');
  if (typeof t.calc !== 'function') errs.push('calc is not a function');
  if (typeof t.steps !== 'function') errs.push('steps is not a function');
  if (errs.length) return errs;

  let v;
  try { v = buildValues(t.inputs); } catch (e) { return ['buildValues: ' + e.message]; }

  // calc must return a non-empty result string with no NaN/Infinity/undefined
  try {
    const out = t.calc(v);
    const resultStr = typeof out === 'string' ? out : (out && out.result != null ? String(out.result) : '');
    if (resultStr.trim() === '') errs.push('calc returned EMPTY result');
    else if (/NaN|Infinity|undefined|\[object/.test(resultStr)) errs.push('calc BAD RESULT: "' + resultStr.slice(0, 60) + '"');
  } catch (e) { errs.push('calc THROW: ' + e.message); }

  // steps must not throw and must return a non-empty array
  try {
    const s = t.steps(v);
    if (!Array.isArray(s) || s.length === 0) errs.push('steps returned empty');
    else {
      const joined = s.join(' ');
      if (/NaN|Infinity|undefined/.test(joined)) errs.push('steps BAD: "' + joined.slice(0, 60) + '"');
    }
  } catch (e) { errs.push('steps THROW: ' + e.message); }

  return errs;
}

// ─── Serialization ──────────────────────────────────────────
function q(str) { return "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

function serializeInputs(inputs) {
  return '[' + (inputs || []).map(inp => {
    const parts = [];
    for (const k of Object.keys(inp)) {
      const val = inp[k];
      if (typeof val === 'string') parts.push(k + ':' + q(val));
      else if (Array.isArray(val)) {
        parts.push(k + ':[' + val.map(o => '{v:' + q(o.v) + ',l:' + q(o.l) + '}').join(',') + ']');
      } else if (val && typeof val === 'object') {
        parts.push(k + ':' + JSON.stringify(val));
      } else {
        parts.push(k + ':' + val);
      }
    }
    return '{' + parts.join(',') + '}';
  }).join(',') + ']';
}

// ─── Main ───────────────────────────────────────────────────
function main() {
  const defFiles = fs.readdirSync(EXPANSION_DIR).filter(f => f.endsWith('.cjs')).sort();
  if (!defFiles.length) { console.error('No definition files in scripts/expansion/'); process.exit(1); }

  let totalValidated = 0;
  let totalApplied = 0;
  const problems = [];

  for (const defFile of defFiles) {
    let mod;
    try { mod = require(path.join(EXPANSION_DIR, defFile)); }
    catch (e) { problems.push(`[${defFile}] MODULE LOAD FAIL: ${e.message}`); continue; }

    for (const [catKey, tools] of Object.entries(mod)) {
      const dataFile = path.join(DATA_DIR, catKey + '.js');
      if (!fs.existsSync(dataFile)) { problems.push(`[${defFile}] no data file for category "${catKey}"`); continue; }

      let content;
      try { content = fs.readFileSync(dataFile, 'utf8'); }
      catch (e) { problems.push(`[${defFile}/${catKey}] read fail: ${e.message}`); continue; }

      const existingIds = new Set([...content.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]));

      const fresh = [];
      for (const t of tools) {
        totalValidated++;
        const errs = validateTool(catKey, t);
        if (errs.length) { problems.push(`[${defFile}/${catKey}] ${t.id}: ${errs.join(' | ')}`); continue; }
        if (existingIds.has(t.id)) { console.log(`  skip (exists): ${catKey}/${t.id}`); continue; }
        fresh.push(t);
      }

      if (fresh.length === 0) { console.log(`  ${catKey}: nothing new to add`); continue; }

      // Build tool code
      let toolCode = '\n\n  // ═══ NEW: ' + fresh.length + ' additional calculators ═══\n\n';
      fresh.forEach((t, i) => {
        toolCode += '  { id: ' + q(t.id) + ', name: ' + q(t.name) + ', desc: ' + q(t.desc) + ', kw: ' + q(t.kw) + ',\n';
        toolCode += '    inputs: ' + serializeInputs(t.inputs) + ',\n';
        toolCode += '    calc: ' + t.calc.toString() + ',\n';
        toolCode += '    steps: ' + t.steps.toString() + ' }' + (i < fresh.length - 1 ? ',' : '') + '\n';
      });

      // Insert before the array terminator "];" (last occurrence, CRLF-safe).
      // Data files vary: the final tool entry may or may not end with a trailing
      // comma, so normalize the boundary to exactly one separator comma.
      const idx = content.lastIndexOf('];');
      if (idx === -1) { problems.push(`[${defFile}/${catKey}] no "];" insertion point`); continue; }
      let head = content.slice(0, idx).replace(/[\s]+$/, '');
      if (head.endsWith(',')) head = head.slice(0, -1);
      content = head + ',\r\n' + toolCode.replace(/\n/g, '\r\n') + '\r\n' + content.slice(idx);

      try { fs.writeFileSync(dataFile, content, 'utf8'); }
      catch (e) { problems.push(`[${defFile}/${catKey}] write fail: ${e.message}`); continue; }

      totalApplied += fresh.length;
      console.log(`  ${catKey}: +${fresh.length} tools (${dataFile})`);
    }
  }

  console.log('\n=== Expansion Runner ===');
  console.log('Validated :', totalValidated);
  console.log('Applied   :', totalApplied);
  console.log('Problems  :', problems.length);
  if (problems.length) {
    for (const p of problems.slice(0, 40)) console.log('  ✗ ' + p);
    if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
    process.exit(1);
  }
  console.log('ALL NEW TOOLS VALID + APPLIED ✓');
  process.exit(0);
}

main();