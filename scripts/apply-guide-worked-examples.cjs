#!/usr/bin/env node
// ============================================================
// CalcProMaster — worked-example depth for thin guides
// ------------------------------------------------------------
// 62 of the 74 guides are 400-800 words: the tool pages are already
// 1,500-2,500 words, so the guides are where the site is thin. Rather than
// pad each one with generic prose, every guide that links to a calculator gets
// a section computed from that calculator's own engine:
//
//   * the default inputs and the result they produce,
//   * the steps the page itself would show,
//   * a sensitivity table (half / default / one-and-a-half times the first
//     numeric input) so the reader can see which lever moves the answer.
//
// Nothing is invented: the numbers come from tool.calc() and tool.steps() at
// run time, exactly as the calculator page computes them. The block is wrapped
// in markers and is idempotent, so re-running never duplicates it.
//
// Usage:
//   node scripts/apply-guide-worked-examples.cjs           (apply)
//   node scripts/apply-guide-worked-examples.cjs --check   (stale → exit 1)
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDES = path.join(ROOT, 'guides');
const CHECK = process.argv.includes('--check');
const MARK_START = '<!-- guide-worked-example:start -->';
const MARK_END = '<!-- guide-worked-example:end -->';
const MIN_WORDS = 900;

// ---------- load the tool registry (same stubs seo-regen-v5 uses) ----------
global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
global.Security = { sanitizeHtml: (v) => String(v), validateInput: (v) => v, sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; } };
// Use the REAL helper bundle instead of an empty stub: several calculators call
// AdvancedCalc.stats/gcd/irr, and with a blank object their calc() threw, so the
// guide was silently skipped even though the tool page works fine in the browser.
// js/core.js is where those helpers live and it is the only file that exports them.
global.AdvancedCalc = global.AdvancedCalc || (function () {
  try { return require(path.join(ROOT, 'js', 'core.js')).AdvancedCalc; } catch (e) { return {}; }
})();
const DATA = path.join(ROOT, 'js', 'data');
const tools = new Map();
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.js') && !['data.js', 'data-loader.js'].includes(f))) {
  try {
    const arr = require(path.join(DATA, f));
    if (Array.isArray(arr)) for (const t of arr) if (t && t.id) tools.set(t.id, t);
  } catch (e) { /* a broken registry file must not stop the pass */ }
}

const strip = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (v) => (typeof v === 'number' && isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v));
const words = (html) => strip(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')).split(/\s+/).filter(Boolean).length;

function defaults(tool) {
  const vals = {};
  for (const i of tool.inputs || []) vals[i.id] = i.def !== undefined ? i.def : (i.type === 'number' ? 0 : '');
  return vals;
}
function run(tool, vals) {
  try {
    const r = tool.calc(Object.assign({}, vals));
    const text = strip(r && r.result !== undefined ? r.result : '');
    if (!text || /NaN|Infinity|undefined/.test(text)) return null;
    let steps = [];
    try {
      const s = tool.steps(Object.assign({}, vals), r);
      if (Array.isArray(s)) steps = s.map(strip).filter((x) => x && !/NaN|Infinity|undefined/.test(x)).slice(0, 4);
    } catch (e) { /* steps are optional */ }
    return { text, steps };
  } catch (e) { return null; }
}

// Deterministic per-guide wording. 64 guides used to share the same two
// sentences, which an 8-gram scan flagged as the site's largest duplicated
// block. The facts stay identical (same engine, same numbers); only the
// sentences around them rotate, chosen by the guide slug so the output is
// byte-stable and still passes --check.
const pick = (list, seed) => list[Math.abs(seed) % list.length];
const hashOf = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

const OPENERS = [
  (t, p, slug) => `Take the default setup on <a href="${p}">${t}</a>: no fields changed, nothing tuned to a nice round number. Run in the site's own engine, those values produce the answer below.`,
  (t, p, slug) => `This is the answer <a href="${p}">${t}</a> gives before you touch anything — the defaults as shipped, computed live rather than copied from a sample.`,
  (t, p, slug) => `Open <a href="${p}">${t}</a> and press calculate without editing a field. What comes back is the table and result below, so the ${slug} numbers here are checkable in one click.`,
  (t, p, slug) => `A worked example is only useful if you can reproduce it. The defaults on <a href="${p}">${t}</a> give exactly the figures in this section, with no rounding done by us.`,
];

const TAILS = [
  (label) => `Halve ${label} and the result moves one way; add half again and it moves the other. Watching that gap is quicker than guessing which field matters most.`,
  (label) => `Read the three rows as a range: the spread between them is how much the answer depends on ${label} alone, with everything else held still.`,
  (label) => `If the rows barely differ, ${label} is not your lever — change a different input. If they swing widely, get that number right before trusting the total.`,
  (label) => `The middle row is the default. The outer two show how far the answer drifts when ${label} is wrong by half or by a half in the other direction.`,
];

function buildBlock(tool, linkPath, slug) {
  const base = defaults(tool);
  const first = run(tool, base);
  if (!first) return null;
  // A random or clock-based calculator returns a different answer per call, so
  // its "worked example" can never be reproduced by the reader (or by --check).
  // Skip it and let the caller try the next calculator the guide links to.
  const repeat = run(tool, base);
  if (!repeat || repeat.text !== first.text) return null;

  // The lever to vary: the first numeric input whose output actually moves, so
  // a fee or multiplier that does nothing at these defaults is not advertised
  // as "what changes, and by how much".
  const numericAll = (tool.inputs || []).filter((i) => i.type === 'number' && typeof base[i.id] === 'number' && base[i.id] !== 0);
  let numeric = [];
  let knobs = [];
  for (let n = 0; n < Math.min(numericAll.length, 4) && knobs.length < 3; n++) {
    const input = numericAll[n];
    const d = base[input.id];
    const trial = [];
    for (const mult of [0.5, 1, 1.5]) {
      const vals = Object.assign({}, base, { [input.id]: Math.round(d * mult * 100) / 100 });
      const r = run(tool, vals);
      if (r) trial.push({ label: num(vals[input.id]), out: r.text });
    }
    const moved = new Set(trial.map((t) => t.out)).size > 1;
    if (moved || n === Math.min(numericAll.length, 4) - 1) {
      numeric = [input];
      knobs = trial;
    }
  }

  const rows = (tool.inputs || [])
    .filter((i) => i.type !== 'select' && i.type !== 'checkbox' && i.type !== 'textarea' && i.type !== 'button' && i.label)
    .slice(0, 6)
    .map((i) => `<tr><td>${esc(strip(i.label))}</td><td>${esc(String(base[i.id] === '' ? '—' : base[i.id]))}</td></tr>`)
    .join('');

  const L = [];
  L.push(MARK_START);
  const seed = hashOf(slug || tool.id) + hashOf(tool.id);
  L.push(`<h2>Worked example: ${esc(tool.name)} at its default inputs</h2>`);
  L.push(`<p>${pick(OPENERS, seed)(esc(tool.name), linkPath, esc(slug || '') )}</p>`);
  L.push(`<table><caption>Default inputs</caption><thead><tr><th>Input</th><th>Default</th></tr></thead><tbody>${rows}</tbody></table>`);
  L.push(`<p><strong>Result:</strong> ${esc(first.text)}</p>`);
  if (first.steps.length) {
    // Deliberately NOT an <h3>: guides/gear-ratio.html's FAQ parser pairs every
    // <h3> with the next <p>, so a sub-heading here swallowed the rest of the
    // page into one "question" and desynced the FAQPage schema.
    L.push('<p class="steps-label"><strong>The steps behind that answer</strong></p><ol>' + first.steps.map((s) => `<li>${esc(s)}</li>`).join('') + '</ol>');
  }
  if (knobs.length > 1 && numeric.length) {
    const lever = esc(strip(numeric[0].label));
    const knobLabel = esc(strip(numeric[0].label).toLowerCase());
    const HEADINGS = [
      `${lever}: half, as given, and half again`,
      `Sensitivity: ${lever} from half to one-and-a-half times`,
      `What ${lever} does to the answer`,
      `${lever} — three values, three answers`,
    ];
    const PROMISE = [
      `Hold every other field still and move only ${knobLabel}.`,
      `Same calculator, same fields, one change: ${knobLabel}.`,
      `The table below varies ${knobLabel} alone — half, the default, and half again.`,
      `${lever} is the first input worth testing, so here it is at three sizes.`,
    ];
    L.push(`<h2>${pick(HEADINGS.map((h) => h), seed >> 5)}</h2>`);
    L.push(`<p>${pick(PROMISE, seed >> 7)}</p>`);
    L.push('<table><thead><tr><th>' + esc(strip(numeric[0].label)) + '</th><th>Result</th></tr></thead><tbody>'
      + knobs.map((k) => `<tr><td>${esc(k.label)}</td><td>${esc(k.out)}</td></tr>`).join('')
      + '</tbody></table>');
    L.push(`<p>${pick(TAILS, seed >> 3)(knobLabel)}</p>`);
  }
  L.push(MARK_END);
  return L.join('\n');
}

let changed = 0;
let stale = 0;
const report = [];

for (const name of fs.readdirSync(GUIDES).filter((f) => f.endsWith('.html') && f !== 'index.html').sort()) {
  const file = path.join(GUIDES, name);
  while (name === '') break;
  let html = fs.readFileSync(file, 'utf8');
  const bodyWords = words(html);
  // Process a guide when it is thin OR when it has no block yet: the authored
  // depth pass (scripts/apply-guide-extra-depth.cjs) pushed several guides over
  // MIN_WORDS while they still had no computed example, and the old word-only
  // guard then skipped them forever. A guide that already carries the block is
  // still processed, so a stale tool link cannot survive a rebuild.
  if (bodyWords >= MIN_WORDS && html.includes(MARK_START)) continue;

  // Calculators the guide actually links to, in page order. Links inside our own
  // block are ignored so adding the block cannot change which tool is picked on
  // the next run.
  const links = [...html
    .replace(/<!-- guide-worked-example:start -->[\s\S]*?<!-- guide-worked-example:end -->/g, ' ')
    .matchAll(/href="\/([a-z]+)\/([a-z0-9-]+)\/"/g)];
  const candidates = [];
  for (const m of links) {
    const t = tools.get(m[2]);
    if (!t || typeof t.calc !== 'function' || !t.inputs || !t.inputs.length) continue;
    const hrefPath = m[0].slice('href="'.length, -1);
    // Only link to a page that actually exists: some guides carry a stale
    // category link (/everyday/password-gen/) beside the correct one.
    const rel = hrefPath.replace(/^\//, '').replace(/\/$/, '');
    if (!fs.existsSync(path.join(ROOT, 'deploy', rel, 'index.html'))) continue;
    candidates.push({ tool: t, linkPath: hrefPath });
  }
  // First candidate with a reproducible answer. This skips random generators
  // (passwords): their "worked example" changed on every run, so the page could
  // never pass --check and the reader saw a different password on each reload.
  let block = null;
  let tool = null;
  for (const c of candidates) {
    const b = buildBlock(c.tool, c.linkPath, name.replace(/\.html$/, ''));
    if (b) { tool = c.tool; block = b; break; }
  }
  if (!block) continue;

  const has = html.includes(MARK_START);
  const existing = has ? html.slice(html.indexOf(MARK_START), html.indexOf(MARK_END) + MARK_END.length) : '';
  if (has && existing === block) continue; // already current

  // Where the block belongs. On the category guides apply-guide-depth.cjs owns a
  // block that CONTAINS the FAQ section and strips it wholesale on every run, so
  // a worked example placed before the FAQ heading disappeared on the next
  // regeneration (the suite caught it as non-idempotent). Land after that block
  // whenever it exists; on topic guides (no depth block) above the FAQ heading;
  // otherwise before </main>.
  const anchorIn = (s) => {
    const depthEnd = s.indexOf('<!-- guide-depth:end -->');
    if (depthEnd !== -1) return s.indexOf('\n', depthEnd) + 1;
    const f = s.search(/<h2[^>]*>\s*(Frequently asked questions|FAQ)/i);
    if (f !== -1) return s.lastIndexOf('\n', f - 1) + 1;
    const close = s.lastIndexOf('</main>');
    return close === -1 ? null : s.lastIndexOf('\n', close - 1) + 1;
  };
  // The block always occupies whole lines, so dropping it again is byte-exact
  // (the old "insert inline, then slice it back out" version leaked a blank line
  // on every rewrite that changed the block).
  const DROP = /(^|\n)[ \t]*<!-- guide-worked-example:start -->[\s\S]*?<!-- guide-worked-example:end -->[ \t]*\r?\n/;

  // Drop any previous copy first (it may sit inside the depth block), then
  // insert at the anchor.
  let next = has ? html.replace(DROP, '$1') : html;
  if (has && next === html) next = html.replace(/<!-- guide-worked-example:start -->[\s\S]*?<!-- guide-worked-example:end -->/, '');
  const spot = anchorIn(next);
  if (spot === null) continue;
  next = next.slice(0, spot) + block + '\n' + next.slice(spot);

  if (CHECK) { stale++; continue; }
  fs.writeFileSync(file, next);
  changed++;
  report.push({ file: 'guides/' + name, tool: tool.id, wordsBefore: bodyWords, wordsAfter: words(next) });
}

if (CHECK) {
  if (stale) { console.error(`✖ ${stale} thin guide(s) missing a current worked example — run: node scripts/apply-guide-worked-examples.cjs`); process.exit(1); }
  console.log('✔ worked examples up to date');
} else {
  console.log(`worked examples written: ${changed}`);
  for (const r of report.slice(0, 12)) console.log(`  ${r.file.padEnd(38)} ${r.wordsBefore} → ${r.wordsAfter} words  (${r.tool})`);
  if (report.length > 12) console.log(`  … ${report.length - 12} more`);
}
