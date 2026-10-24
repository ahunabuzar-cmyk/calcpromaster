#!/usr/bin/env node
// Dev-only read-only probe: which tools expose "advanced" capabilities
// (reverse/solve-for, sliders, charts, steps, presets) and which do not.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'js', 'data');
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), sandbox, { filename: f }); } catch (e) { console.error('load fail ' + f + ': ' + e.message); }
}
const keys = Object.keys(sandbox.window).filter((k) => Array.isArray(sandbox.window[k]) || (sandbox.window[k] && typeof sandbox.window[k] === 'object'));
const tools = [];
const seen = new Set();
for (const k of keys) {
  const v = sandbox.window[k];
  const arr = Array.isArray(v) ? v : (Array.isArray(v.tools) ? v.tools : null);
  if (!arr) continue;
  for (const t of arr) {
    if (!t || typeof t !== 'object' || !t.id || !t.calc) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    tools.push({ id: t.id, name: t.name || t.id, cat: t.cat || t.category || k, tool: t });
  }
}
const has = (t, p) => !!(t && t[p]);
const flags = (t) => ({
  reverse: has(t, 'reverse'),
  // Sliders live on the input definition: { id, ..., slider: {min,max,step} }
  sliders: Array.isArray(t.inputs) && t.inputs.some((i) => i && i.slider),
  // A "Solve For" select is the visible reverse-calculation mode.
  mode: Array.isArray(t.inputs) && t.inputs.some((i) => i && i.id === 'mode'),
  chart: has(t, 'chart') || has(t, 'chartType') || has(t, 'viz'),
  steps: has(t, 'steps') || has(t, 'explain'),
  presets: Array.isArray(t.presets) && t.presets.length > 0,
});
const rows = tools.map((x) => ({ id: x.id, name: x.name, cat: x.cat, ...flags(x.tool) }));
const adv = rows.filter((r) => r.reverse || r.mode || r.sliders || r.chart || r.steps || r.presets);
console.log('tools parsed       ' + rows.length);
console.log('with ANY advanced  ' + adv.length);
console.log('reverse/solve-for  ' + rows.filter((r) => r.reverse || r.mode).length);
console.log('sliders            ' + rows.filter((r) => r.sliders).length);
console.log('chart              ' + rows.filter((r) => r.chart).length);
console.log('steps/explain      ' + rows.filter((r) => r.steps).length);
console.log('presets            ' + rows.filter((r) => r.presets).length);
// "Advanced" for the audit means a real interaction beyond typing numbers and
// reading one answer: reverse solve, sliders or a chart. Step lists alone are
// shipped on almost every tool, so they cannot be the bar.
const none = rows.filter((r) => !(r.reverse || r.mode || r.sliders || r.chart));
console.log('NONE (core adv)    ' + none.length + ' of ' + rows.length);
if (process.argv.includes('--list')) {
  const byCat = {};
  for (const r of none) (byCat[r.cat] = byCat[r.cat] || []).push(r);
  for (const [cat, list] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
    console.log('\n' + cat + ' — ' + list.length + ' without advanced');
    console.log('  ' + list.map((r) => r.name).join(' · '));
  }
}
