/* Temp analysis #4: TRUE tool count via real JS evaluation of data files */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.join(__dirname, '..', 'js', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));

const sandbox = {
  Charts: {},
  window: {},
  console,
  Security: { sanitizeHtml: s => s, sanitizeOutput: s => s, validateInput: (s, o) => s, sanitizeJsString: s => s },
  Currency: { getAllCurrencyCodes: () => [], getCurrencyName: () => '' },
  setTimeout, clearTimeout, Math, Date, JSON, Object, Array, String, Number, isNaN, parseFloat, parseInt
};
vm.createContext(sandbox);

let allTools = [];
const names = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dataDir, f), 'utf8');
  const m = src.match(/const\s+(\w+_TOOLS)\s*=\s*\[/);
  if (m) names.push(m[1]);
  try { vm.runInContext(src + `\n;globalThis.__collect=${m ? m[1] : '[]'};`, sandbox); } catch (e) {
    console.log('EVAL FAIL', f, e.message); continue;
  }
  const arr = sandbox.__collect || [];
  allTools = allTools.concat(arr.map(t => ({ id: t.id, name: t.name, cat: f.replace('.js', '') })));
}

const uniq = new Map();
for (const t of allTools) {
  if (!uniq.has(t.id)) uniq.set(t.id, []);
  uniq.get(t.id).push(t.cat);
}
console.log('=== TOTAL TOOL OBJECTS:', allTools.length);
console.log('=== UNIQUE TOOL IDS:', uniq.size);
console.log('=== DUPLICATES (real tools):');
for (const [id, cats] of uniq) if (cats.length > 1) console.log(`  ${id} x${cats.length}: ${cats.join(', ')}`);
