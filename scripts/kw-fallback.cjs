// Fill tools whose kw became empty after head-term removal with a
// name-derived long-tail (e.g. fuel-cost → 'fuel cost calculator').
const fs = require('fs');
const files = fs.readdirSync('js/data').filter(f => f.endsWith('.js'));

let filled = 0;
for (const f of files) {
  const lines = fs.readFileSync('js/data/' + f, 'utf8').split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*\{\s*id:\s*'([^']+)',\s*name:\s*'((?:[^'\\]|\\.)*)',.*?)(kw:\s*)'([^']*)'(.*)$/);
    if (!m) continue;
    const kws = m[5].split(',').map(k => k.trim()).filter(Boolean);
    if (kws.length > 0) continue; // already has keywords
    // derive a long-tail from the tool name; if the plain form is only 2 words
    // (e.g. 'mileage calculator'), use the 'free X calculator' pattern — a real
    // long-tail search with low competition.
    const name = m[3].replace(/ Calculator$/i, '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    let derived = name + ' calculator';
    if (derived.split(/\s+/).length < 3) derived = 'free ' + derived;
    const words = derived.split(/\s+/).length;
    if (words < 3) continue; // still too short
    lines[i] = m[1] + m[4] + "'" + derived + "'" + m[6];
    filled++;
    changed = true;
  }
  if (changed) fs.writeFileSync('js/data/' + f, lines.join('\n'));
}
console.log('Filled empty kw with name-derived long-tail:', filled);
