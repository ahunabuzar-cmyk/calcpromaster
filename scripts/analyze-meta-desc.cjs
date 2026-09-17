const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(__dirname + '/../js/seo-content.js', 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const T = sandbox.window.TOOL_SEO || sandbox.TOOL_SEO;
const ids = Object.keys(T);

function countBad(f) { return ids.filter((id) => f(T[id].metaDesc)); }
function nameBase(d) {
  return d.replace(/^Free\s+/, '').split(/[\u2014\u2013:]/)[0].trim().toLowerCase();
}

const pats = {
  'amp-splice ( & X)': (d) => /\s&\s[A-Za-z]/.test(d),
  'privacy-device fragments': (d) => /(\u2014|\u2013)\s*(private by design|your data never leaves|works on any device|works offline|no sign-up|free online tool)/i.test(d),
  'redundant name echo': (d) => {
    const base = nameBase(d).replace(/ calculator$/, '').trim();
    if (base.length < 8) return false;
    const rest = d.toLowerCase().slice(base.length);
    return rest.includes(base) || rest.includes(base.replace(/\s+/g, ' '));
  },
  'uses "using X calculator"': (d) => /\busing\s+[\w -]{4,45}\s+calculator\b/i.test(d),
  'double em-dash piles': (d) => ((d.match(/\u2014/g) || []).length > 2),
  'ends mid thought ("—" tail)': (d) => /[\u2014\u2013]\s*$/.test(d)
};

const hits = {};
for (const [k, f] of Object.entries(pats)) {
  const list = countBad(f);
  hits[k] = list.length;
  console.log('PATTERN "' + k + '": ' + list.length);
}
const union = new Set();
for (const f of Object.values(pats)) countBad(f).forEach((id) => union.add(id));
console.log('\nTOTAL distinct metaDescs flagged: ' + union.size + ' of ' + ids.length);
console.log('\n--- flagged samples ---');
let c = 0;
for (const id of ids) {
  if (union.has(id)) { console.log(' ' + id + ' :: ' + T[id].metaDesc); if (++c >= 14) break; }
}
console.log('\n--- 6 clean samples (control) ---');
c = 0;
for (const id of ids) {
  if (!union.has(id)) { console.log(' ' + id + ' :: ' + T[id].metaDesc); if (++c >= 6) break; }
}
fs.writeFileSync(__dirname + '/../test-results/flagged-desc.json', JSON.stringify([...union]));
