/* Temp: count tools per category for llms.txt */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..', 'js', 'data');
const sandbox = {
  Charts: {}, window: {}, console,
  Security: { sanitizeHtml: s => s, sanitizeOutput: s => s, validateInput: (s, o) => s, sanitizeCalcValue: s => s, sanitizeJsString: s => s },
  Currency: { getAllCurrencyCodes: () => [], getCurrencyName: () => '' },
  setTimeout, clearTimeout, Math, Date, JSON, Object, Array, String, Number, isNaN, parseFloat, parseInt
};
vm.createContext(sandbox);

const map = {
  'finance.js': 'Finance', 'health.js': 'Health', 'math.js': 'Math', 'everyday.js': 'Everyday',
  'science.js': 'Science', 'engineering.js': 'Engineering', 'construction.js': 'Construction',
  'conversion.js': 'Conversion', 'business.js': 'Business', 'education.js': 'Education',
  'utilities.js': 'Utilities', 'lifestyle.js': 'Lifestyle', 'regional.js': 'Regional',
  'food-nutrition.js': 'Food & Nutrition', 'fitness-exercise.js': 'Fitness & Exercise',
  'auto-transport.js': 'Auto & Transport', 'career-freelance.js': 'Career & Freelance',
  'home-garden.js': 'Home & Garden', 'tech-digital.js': 'Tech & Digital',
  'parenting-family.js': 'Parenting & Family'
};

const order = ['Finance', 'Health', 'Math', 'Everyday', 'Science', 'Engineering', 'Construction',
  'Conversion', 'Business', 'Education', 'Utilities', 'Lifestyle', 'Regional', 'Food & Nutrition',
  'Fitness & Exercise', 'Auto & Transport', 'Career & Freelance', 'Home & Garden', 'Tech & Digital',
  'Parenting & Family'];

const counts = {};
for (const f of Object.keys(map)) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = src.match(/const\s+(\w+_TOOLS)\s*=\s*\[/);
  const varName = m ? m[1] : null;
  try {
    if (!varName) throw new Error('no _TOOLS const');
    vm.runInContext(src + `\n;globalThis.__t=${varName};`, sandbox);
    counts[map[f]] = (sandbox.__t || []).length;
  } catch (e) { counts[map[f]] = 'ERR ' + e.message; }
}
for (const c of order) console.log(c + ': ' + counts[c]);
