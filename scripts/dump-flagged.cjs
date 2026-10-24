// Dump the flagged meta descriptions with their registry info so we can rewrite them.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const s = { window: {}, console };
vm.createContext(s);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8'), s);
const T = s.window.TOOL_SEO || s.TOOL_SEO;

// registry
const ctx = { window: {}, console };
vm.createContext(ctx);
ctx.window = ctx;
for (const f of fs.readdirSync(path.join(ROOT, 'js', 'data')).filter((x) => x.endsWith('.js'))) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8'), ctx, { filename: f }); } catch (e) {}
}
let registry = [];
try { registry = ctx.CALC_DATA || ctx.window.CALC_DATA || []; } catch (e) {}
const byId = {};
for (const t of registry) byId[t.id] = t;

const flagged = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-results', 'flagged-desc.json'), 'utf8'));
const out = [];
for (const id of flagged) {
  const seo = T[id] || {};
  const tool = byId[id] || {};
  out.push({
    id,
    cat: seo.cat,
    catName: seo.catName,
    name: tool.name || seo.title,
    desc: tool.desc || '',
    inputs: (tool.inputs || []).map((i) => i.label || i.id),
    old: seo.metaDesc || ''
  });
}
fs.writeFileSync(path.join(ROOT, 'test-results', 'flagged-full.json'), JSON.stringify(out, null, 1));
console.log('wrote', out.length, 'entries');
console.log(out.slice(0, 8).map((e) => e.id + ' | ' + e.cat + ' | ' + e.name + ' | inputs: ' + e.inputs.join(', ')).join('\n'));
