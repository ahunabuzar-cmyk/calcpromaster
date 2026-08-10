// Deep audit: run EVERY tool's calc() with 3 input variants (defaults, edge, extreme)
// + run steps() where present + detect NaN/undefined/[object Object]/duplicate ids.
// Mirrors the browser stubs from audit-tools.cjs so data files load in Node.
const fs = require('fs');
const path = require('path');

const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };
const M = {}; global.Module = M;
global.Currency = {
  getRates: () => ({ USD: 1, EUR: 0.92 }),
  convert: () => Promise.resolve({ result: '1 USD = 0.92 EUR', extra: '' })
};
global.Compounding = { futureValue: (P, r, n, t, c) => P * Math.pow(1 + r / 100 / (c || 12), (c || 12) * t) };
global.LoanSolver = { payment: (P, r, n) => P * (r / 100 / 12) / (1 - Math.pow(1 + r / 100 / 12, -n)) };
global.DayCount = { daysBetween: (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) };
global.SafeMathParser = { parse: (s) => parseFloat(s) };
global.AdvancedCalc = {
  calculate: () => 0, evaluate: () => 0, parse: (s) => parseFloat(s), randInt: (a) => a || 0,
  taxSteps: () => [], irr: () => 0, tipSteps: () => [], generateAmortization: () => [],
  bmiSteps: () => [], pctSteps: () => [], gcd: (a, b) => b ? global.AdvancedCalc.gcd(b, a % b) : Math.abs(a),
  stats: (arr) => ({ mean: 0 }), primeFactors: () => [], lcm: (a, b) => a && b ? Math.abs(a * b) / (global.AdvancedCalc.gcd(a, b) || 1) : 0
};
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s), cryptoRandomInt: (min) => min || 0 };
global.MathJax = {};
global.parseIntFn = parseInt;
global.window = global;

const files = fs.readdirSync('js/data').filter(f => f.endsWith('.js'));
const seenIds = new Map();      // id -> filename
const seenNames = new Map();    // name -> filename
let total = 0, filesLoaded = 0, errors = [], nanResults = [], dupIds = [], dupNames = [], brokenSteps = [];

function pickVariants(inputs) {
  const variants = [];
  for (let i = 0; i < 3; i++) {
    const v = {};
    for (const inp of inputs || []) {
      if (inp.type === 'number' || inp.type === 'range') {
        if (i === 0) v[inp.id] = inp.def !== undefined && inp.def !== null ? inp.def : 10;
        else if (i === 1) v[inp.id] = 0;                       // edge: zero
        else v[inp.id] = (inp.def || 10) * 1000;               // extreme: big
      } else if (inp.type === 'select') {
        v[inp.id] = inp.def || (inp.opts && inp.opts[0] && inp.opts[0].v) || '';
      } else if (inp.type === 'checkbox') {
        v[inp.id] = i === 1 ? false : true;
      } else if (inp.type === 'date') {
        v[inp.id] = '2024-01-15';
      } else if (inp.type === 'time') {
        v[inp.id] = '14:30';
      } else if (inp.type === 'text' || inp.type === 'url' || inp.type === 'email') {
        v[inp.id] = i === 1 ? 'test' : (inp.def || 'A');
      } else {
        v[inp.id] = inp.def || (inp.opts && inp.opts[0] && inp.opts[0].v) || '1';
      }
    }
    variants.push(v);
  }
  return variants;
}

function flattenResult(res) {
  // result may be a string or object {result, extra, steps...}
  const parts = [];
  if (typeof res === 'string') return res;
  if (res && typeof res === 'object') {
    for (const k of ['result', 'extra', 'details', 'summary', 'main']) {
      const val = res[k];
      if (typeof val === 'string') parts.push(val);
      else if (typeof val === 'number') parts.push(String(val));
      else if (Array.isArray(val)) parts.push(val.join(' '));
    }
  }
  return parts.join(' ');
}

function isBroken(str) {
  if (str === undefined || str === null) return true;
  const s = String(str);
  if (/\bNaN\b/.test(s)) return true;
  if (/\bundefined\b/i.test(s)) return true;
  if (s.includes('[object Object]')) return true;
  return false;
}

for (const f of files) {
  const p = path.join('js/data', f);
  try {
    const src = fs.readFileSync(p, 'utf8');
    delete require.cache[require.resolve(path.resolve(p))];
    const mod = require(path.resolve(p));
    const arr = Array.isArray(mod) ? mod : Object.values(mod).find(v => Array.isArray(v));
    if (!arr || !arr.length) { errors.push({ file: f, err: 'no tool array exported' }); continue; }
    filesLoaded++;
    for (const tool of arr) {
      if (!tool || !tool.id) { errors.push({ file: f, err: 'tool without id' }); continue; }
      total++;
      if (seenIds.has(tool.id)) dupIds.push({ id: tool.id, files: [seenIds.get(tool.id), f] });
      else seenIds.set(tool.id, f);
      const nm = String(tool.name || '').toLowerCase();
      if (nm && seenNames.has(nm)) dupNames.push({ name: tool.name, files: [seenNames.get(nm), f] });
      else if (nm) seenNames.set(nm, f);

      // 3 variants
      const variants = pickVariants(tool.inputs);
      for (let i = 0; i < 3; i++) {
        try {
          let res;
          if (typeof tool.calc === 'function') res = tool.calc(variants[i]);
          else if (typeof tool.calc === 'object' && tool.calc && typeof tool.calc.fn === 'function') res = tool.calc.fn(variants[i]);
          else if (tool.async && typeof tool.calcAsync === 'function') res = tool.calcAsync(variants[i]);
          if (res && typeof res.then === 'function') continue; // async — skip (browser-only)
          // Objects are legitimate calc results (may carry chart/steps/extra).
          // Only string results can be directly flagged; objects must be flattened first.
          const flat = typeof res === 'object' && res !== null ? flattenResult(res) : String(res);
          if (isBroken(flat)) {
            nanResults.push({ id: tool.id, file: f, variant: i, result: flat.slice(0, 80) });
          }
        } catch (e) {
          errors.push({ id: tool.id, file: f, variant: i, err: (e && e.message || String(e)).slice(0, 100) });
        }
      }
      // steps()
      if (typeof tool.steps === 'function') {
        try {
          const st = tool.steps(pickVariants(tool.inputs)[0]);
          if (Array.isArray(st)) {
            for (const s of st) if (isBroken(s)) brokenSteps.push({ id: tool.id, file: f, step: String(s).slice(0, 60) });
          }
        } catch (e) {
          brokenSteps.push({ id: tool.id, file: f, err: (e && e.message || String(e)).slice(0, 80) });
        }
      }
    }
  } catch (e) {
    errors.push({ file: f, err: (e && e.message || String(e)).slice(0, 120) });
  }
}

console.log('=== DEEP AUDIT (3x per tool) ===');
console.log('Files loaded :', filesLoaded, '/', files.length);
console.log('Tools tested :', total);
console.log('Calc errors  :', errors.length);
for (const e of errors.slice(0, 15)) console.log('  ❌', JSON.stringify(e));
console.log('Broken results (NaN/undefined/[obj]):', nanResults.length);
for (const n of nanResults.slice(0, 15)) console.log('  ⚠️', JSON.stringify(n));
console.log('Steps broken :', brokenSteps.length);
for (const s of brokenSteps.slice(0, 10)) console.log('  ⚠️', JSON.stringify(s));
console.log('Duplicate ids :', dupIds.length);
for (const d of dupIds.slice(0, 10)) console.log('  🔁', JSON.stringify(d));
console.log('Duplicate names:', dupNames.length);
for (const d of dupNames.slice(0, 10)) console.log('  🔁', JSON.stringify(d));
console.log('=== DONE ===');
process.exit(errors.length > 0 ? 1 : 0);
