// PHASE 2 — EDGE-CASE + INPUT-VALIDATION AUDIT
// For every tool in the registry, run calc() with:
//   1. defaults                (baseline)
//   2. all-zero numeric inputs (division-by-zero, log(0), etc.)
//   3. negative values         (sqrt of negative, log of negative)
//   4. huge values             (overflow, Infinity)
//   5. tiny values             (underflow)
//   6. missing required fields (undefined handling)
// Reports: NaN / Infinity / throws / empty results / broken UI strings.
// NOTE: a throw or NaN is flagged as a POTENTIAL issue — many tools legitimately
// show "Invalid" for zero/negative inputs. The report is reviewed manually.
const path = require('path');
const fs = require('fs');

// Real shipped engine modules (same globals the browser gets) — same as run-all-tools.cjs
const core = require(path.join(__dirname, '..', 'js', 'core.js'));
global.Charts = core.Charts;
global.AdvancedCalc = core.AdvancedCalc;
global.Currency = core.Currency;
global.Security = core.Security;
try {
  const sm = require(path.join(__dirname, '..', 'js', 'safe-math.js'));
  global.safeEval = sm.safeEval;
} catch (e) {}
try { global.Module = require(path.join(__dirname, '..', 'js', 'calc-modes.js')); } catch (e) {}
// Node 24: btoa + webcrypto exist as globals already (btoa, crypto)

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));

const BAD = /NaN|Infinity|undefined|\bnull\b/;

function buildValues(inputs, overrides) {
  const v = {};
  for (const inp of inputs || []) {
    if (inp.def !== undefined && inp.def !== null) v[inp.id] = inp.def;
    else if (inp.type === 'select' && inp.opts && inp.opts.length) v[inp.id] = inp.opts[0].v;
    else v[inp.id] = 0;
  }
  if (overrides) Object.assign(v, overrides);
  return v;
}

function isNumeric(f) {
  return f && (f.type === 'number' || f.type === 'range');
}

function flattenOut(out) {
  if (!out) return '';
  if (typeof out === 'string') return out;
  const parts = [];
  for (const k of ['result', 'value', 'html', 'extra']) {
    if (out[k] && typeof out[k] === 'string') parts.push(out[k]);
    else if (out[k] && typeof out[k] === 'number') parts.push(String(out[k]));
  }
  return parts.join(' | ');
}

async function runCalc(tool, values) {
  try {
    const raw = tool.calc(values);
    if (raw && typeof raw.then === 'function') {
      try { return { out: await raw }; } catch (e) { return { throw: 'ASYNC REJECT: ' + e.message }; }
    }
    return { out: raw };
  } catch (e) {
    return { throw: e.message };
  }
}

async function main() {
  let total = 0, checked = 0;
  const issues = [];
  const allTools = [];

  for (const f of files) {
    let tools;
    try { tools = require(path.join(dataDir, f)); } catch (e) { continue; }
    const arr = Array.isArray(tools) ? tools : (tools.tools || []);
    const cat = f.replace('.js', '');
    for (const t of arr) {
      if (!t) continue;
      total++;
      if (typeof t.calc !== 'function') continue; // async/custom — handled by app
      checked++;
      allTools.push({ ...t, cat });
      const inputs = Array.isArray(t.inputs) ? t.inputs : [];
      const numeric = inputs.filter(isNumeric);
      const defs = buildValues(inputs);
      const base = { tool: t.id, cat };

      // 1. defaults
      const r1 = await runCalc(t, defs);
      if (r1.throw) issues.push({ ...base, kase: 'defaults', issue: 'THROW: ' + r1.throw });
      else {
        const txt = flattenOut(r1.out);
        if (!txt.trim()) issues.push({ ...base, kase: 'defaults', issue: 'EMPTY RESULT' });
        else if (BAD.test(txt)) issues.push({ ...base, kase: 'defaults', issue: 'BAD VALUE: ' + txt.slice(0, 120) });
      }

      // 2. all zeros
      if (numeric.length) {
        const zeros = buildValues(inputs, Object.fromEntries(numeric.map((f) => [f.id, 0])));
        const r2 = await runCalc(t, zeros);
        if (r2.throw) issues.push({ ...base, kase: 'all-zero', issue: 'THROW: ' + r2.throw });
        else {
          const txt = flattenOut(r2.out);
          if (txt && BAD.test(txt)) issues.push({ ...base, kase: 'all-zero', issue: 'BAD VALUE: ' + txt.slice(0, 120) });
        }
      }

      // 3. negatives (magnitude of default, negated; fall back to 1)
      if (numeric.length) {
        const neg = buildValues(inputs, Object.fromEntries(numeric.map((f) => {
          const mag = Math.abs(f.def !== undefined && f.def !== null ? f.def : 1) || 1;
          return [f.id, -mag];
        })));
        const r3 = await runCalc(t, neg);
        if (r3.throw) issues.push({ ...base, kase: 'negatives', issue: 'THROW: ' + r3.throw });
        else {
          const txt = flattenOut(r3.out);
          if (txt && BAD.test(txt)) issues.push({ ...base, kase: 'negatives', issue: 'BAD VALUE: ' + txt.slice(0, 120) });
        }
      }

      // 4. huge
      if (numeric.length) {
        const big = buildValues(inputs, Object.fromEntries(numeric.map((f) => [f.id, 1e15])));
        const r4 = await runCalc(t, big);
        if (r4.throw) issues.push({ ...base, kase: 'huge', issue: 'THROW: ' + r4.throw });
        else {
          const txt = flattenOut(r4.out);
          if (txt && BAD.test(txt)) issues.push({ ...base, kase: 'huge', issue: 'BAD VALUE: ' + txt.slice(0, 120) });
        }
      }

      // 5. tiny
      if (numeric.length) {
        const tiny = buildValues(inputs, Object.fromEntries(numeric.map((f) => [f.id, 1e-9])));
        const r5 = await runCalc(t, tiny);
        if (r5.throw) issues.push({ ...base, kase: 'tiny', issue: 'THROW: ' + r5.throw });
        else {
          const txt = flattenOut(r5.out);
          if (txt && BAD.test(txt)) issues.push({ ...base, kase: 'tiny', issue: 'BAD VALUE: ' + txt.slice(0, 120) });
        }
      }

      // 6. missing fields (empty object — simulates blank form submit)
      const r6 = await runCalc(t, {});
      if (r6.throw) issues.push({ ...base, kase: 'missing-fields', issue: 'THROW: ' + r6.throw });
    }
  }

  // Group by tool
  const byTool = {};
  for (const i of issues) {
    byTool[i.tool] = byTool[i.tool] || [];
    byTool[i.tool].push(i);
  }

  console.log('=== EDGE-CASE / VALIDATION AUDIT ===');
  console.log('Total tools:', total, '| calc() checked:', checked, '| Issues:', issues.length, '| Tools with issues:', Object.keys(byTool).length);
  console.log('\n--- Issues by tool ---');
  for (const [tid, list] of Object.entries(byTool)) {
    console.log(`\n${tid} (${list[0].cat}):`);
    for (const i of list) console.log(`  [${i.kase}] ${i.issue}`);
  }

  fs.writeFileSync(path.join(__dirname, '..', 'qa-edge-issues.json'), JSON.stringify({ total, checked, issues, byTool }, null, 2));
  console.log('\nWrote qa-edge-issues.json');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
