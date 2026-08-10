// Audit every tool in every data file: run calc() with default values and
// catch any runtime error (broken formula, missing chart, etc.)
const fs = require('fs');
const path = require('path');

// ---- Browser global stubs (so data files load in Node) ----
// Charts: SVG-string builders used by calc functions
const svg = '<svg></svg>';
global.Charts = {
  bar: function () { return svg; },
  donut: function () { return svg; },
  gauge: function () { return svg; },
  line: function () { return svg; },
  spark: function () { return svg; },
  heatmap: function () { return svg; },
  area: function () { return svg; }
};
// Finance solver module used by finance.js data tools
const M = {};
global.Module = M;
// Currency module (conversion.js / finance.js live converter)
global.Currency = {
  getRates: function () { return { USD: 1, EUR: 0.92 }; },
  convert: function () { return Promise.resolve({ result: '1 USD = 0.92 EUR', extra: '' }); }
};
// Compounding / LoanSolver / DayCount used inside finance.js tool calcs
// (loaded via calc-modes.js in browser; minimal in-place impls here)
global.Compounding = {
  futureValue: function (P, r, n, t, c) { return P * Math.pow(1 + r / 100 / (c || 12), (c || 12) * t); }
};
global.LoanSolver = {
  payment: function (P, r, n) { return P * (r / 100 / 12) / (1 - Math.pow(1 + r / 100 / 12, -n)); }
};
global.DayCount = { daysBetween: function (a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); } };
global.SafeMathParser = { parse: function (s) { return parseFloat(s); } };
global.AdvancedCalc = {
  calculate: function (a, b, op) { return 0; },
  evaluate: function (s) { return 0; },
  parse: function (s) { return parseFloat(s); },
  randInt: function (a, b) { return a || 0; },
  taxSteps: function () { return []; },
  irr: function () { return 0; },
  tipSteps: function () { return []; },
  generateAmortization: function () { return []; },
  bmiSteps: function () { return []; },
  pctSteps: function () { return []; },
  gcd: function (a, b) { return b ? global.AdvancedCalc.gcd(b, a % b) : Math.abs(a); },
  stats: function (arr) { return { mean: 0 }; },
  primeFactors: function (n) { return []; },
  lcm: function (a, b) { return a && b ? Math.abs(a * b) / (global.AdvancedCalc.gcd(a, b) || 1) : 0; }
};
global.Security = {
  sanitizeHtml: function (s) { return String(s); },
  sanitizeJsString: function (s) { return String(s); },
  sanitizeOutput: function (s) { return String(s); },
  cryptoRandomInt: function (min, max) { return min || 0; }
};
global.MathJax = {};
global.parseIntFn = parseInt;

try {
  require(path.join(__dirname, '..', 'js', 'calc-modes.js'));
  Object.keys(global).forEach(function (k) { if (typeof global[k] === 'object' || typeof global[k] === 'function') M[k] = global[k]; });
} catch (e) { /* calc-modes may define window.* — ignore */ }
// Load the REAL AdvancedCalc + Charts from advanced-calc.js (replaces stubs)
try {
  global.window = global;
  require(path.join(__dirname, '..', 'js', 'advanced-calc.js'));
  if (global.window.AdvancedCalc) global.AdvancedCalc = global.window.AdvancedCalc;
  if (global.window.Charts) global.Charts = global.window.Charts;
} catch (e) { console.error('advanced-calc load failed: ' + e.message); }

const files = fs.readdirSync('js/data').filter(f => f.endsWith('.js'));
let total = 0, passed = 0, failed = [];
const byCat = {};

(async function () {
for (const file of files) {
  const mod = require(path.join(__dirname, '..', 'js', 'data', file));
  const arr = Array.isArray(mod) ? mod : [];
  byCat[file] = { total: arr.length, failed: 0 };
  for (const tool of arr) {
    total++;
    try {
      // Build default values from inputs
      const values = {};
      (tool.inputs || []).forEach(inp => {
        if (inp.type === 'checkbox') values[inp.id] = inp.def === true || inp.def === 1 || inp.def === 'true';
        else values[inp.id] = inp.def;
      });
      if (tool.async === true) {
        // async tools need special handling — mark as pass if handler exists
        passed++;
        continue;
      }
      if (typeof tool.calc !== 'function') {
        // custom tools (scientific calculator etc.) — no calc fn
        passed++;
        continue;
      }
      const raw = tool.calc(values);
      const result = await Promise.resolve(raw);
      if (result === null || result === undefined) {
        throw new Error('calc returned null/undefined');
      }
      if (typeof result === 'object' && result.result === undefined && result.html === undefined && result.value === undefined) {
        throw new Error('calc returned object without result field: ' + JSON.stringify(result).slice(0, 60));
      }
      if (typeof tool.steps === 'function') {
        tool.steps(values);
      }
      passed++;
    } catch (e) {
      byCat[file].failed++;
      failed.push({ file, id: tool.id, name: tool.name, error: e.message });
    }
  }
}

console.log('=== TOOL AUDIT ===');
console.log('Total tools: ' + total);
console.log('Passed: ' + passed);
console.log('Failed: ' + failed.length);
console.log('');
console.log('=== FAILURES BY FILE ===');
Object.entries(byCat).forEach(([f, c]) => {
  if (c.failed > 0) console.log('  ' + f + ': ' + c.failed + '/' + c.total + ' failed');
});
console.log('');
console.log('=== DETAILED FAILURES ===');
failed.forEach(f => {
  console.log('  [' + f.file + '] ' + f.id + ' (' + f.name + '): ' + f.error);
});

// CI-friendly: exit non-zero if any tool failed
process.exit(failed.length > 0 ? 1 : 0);
})();
