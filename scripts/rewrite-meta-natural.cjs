// CALCPROMASTER — natural-language meta description pass (SEO report §8.2/§8.3)
// Target: ~885 metaDesc entries that are machine splices of the form
//   "Free <Name> — <verb clause> — <value-prop tail>"
// with ~10 recycled tails ("Instant, private, works offline. No sign-up needed.",
// "your data never leaves your device.", "Runs 100% in your browser — nothing is
// uploaded or stored.", ...). These read as fragments, not prose.
//
// Strategy (deterministic, template-anchored — not regex-blind):
//   1. Parse the splice with one regex: head ("Free <Name>"), middle clause,
//      tail fragment. Tail fragments glued into the middle with a period are
//      cut off by marker list.
//   2. Emit natural one-to-two-sentence prose:
//        - imperative middle  → "<Verb clause>. <Category closer>. Free, no sign-up."
//        - question middle    → "Find out <clause>. ..."
//        - noun-phrase middle → "<Name>: <clause>. ..."   (label style)
//      Closers are hand-written per category — no recycled tails.
//   3. Enforce the QA band (90–160): drop the "Free, no sign-up." sentence
//      first, then trim whole words — never chop a phrase mid-token.
//   4. desc: remove "The CalcPro Philosophy" + "People searching..." boilerplate
//      tail blocks (324 entries — a regression the previous pass missed).
//
// Dry-run by default; WRITE=1 persists to js/seo-content.js (regenerate
// js/seo/*.js chunks afterwards with scripts/split-seo.cjs).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'seo-content.js');
const registry = require(path.join(ROOT, 'docs', 'calculator-registry.json'));
const TOOL_SEO = require(OUT);
const ids = Object.keys(TOOL_SEO);
const regById = {};
for (const t of registry.tools) regById[t.id] = t;

// ---------- category closers (hand-written, no recycled tails) ----------
const CLOSERS = {
  finance:      'Built for loans, savings and investment decisions',
  health:       'Reference ranges follow published medical guidance',
  fitness:      'Reference paces and loads follow standard training practice',
  food:         'Portion and calorie figures follow standard nutrition references',
  math:         'Every intermediate step is shown so you can verify the math',
  science:      'Constants follow standard physical reference values',
  engineering:  'Formulas follow standard engineering references',
  construction: 'Material estimates follow standard construction practice',
  conversion:   'Exact conversion factors, no rounding until the final digit',
  education:    'Grading scales follow standard academic conventions',
  business:     'Metrics follow standard business-finance definitions',
  career:       'Rates follow standard freelance and payroll conventions',
  auto:         'Running-cost figures follow standard vehicle assumptions',
  everyday:     'The result is exact and the steps show every operation',
  homegarden:   'Coverage figures follow standard home-improvement practice',
  lifestyle:    'Estimates follow standard household planning assumptions',
  family:       'Milestones follow standard pediatric guidance',
  tech:         'Estimates use standard file-size and bandwidth math',
  utilities:    'Runs entirely in your browser — nothing is uploaded',
  regional:     'Slabs and rates follow current published rules',
};

// ---------- splice parsing ----------
const SPLICE_RE = /^Free ([^—]+?) — (.+?)(?: — (.*))?$/s;
// Tail fragments may also be glued into the middle with a period: "…depreciation.
// Runs 100% in your browser". Cut at the first marker; keep the part before it.
const MID_TAIL_MARKERS = [
  'Runs 100%', 'Instant, private', 'Instant results', 'Works on any device',
  'Private by design', 'Your data never', 'Nothing is uploaded',
  'Accurate, step-by-step', 'Free forever', 'Works offline',
  'even offline', 'No sign-up', 'no uploads', '100% in your browser',
];
const TAIL_HINTS = [
  'works offline', 'no sign-up', 'no account', 'private', 'instant',
  'your data', 'nothing is uploaded', 'runs 100%', 'runs entirely',
  'step-by-step results', 'free forever', 'accurate', 'works on any device',
  'even offline', 'no ads', 'without ads', 'no uploads', 'uploaded or stored',
  '100% in your browser',
];

function isTailish(s) {
  const low = s.toLowerCase();
  return TAIL_HINTS.some((h) => low.includes(h));
}

// Strip glued tail fragments from the middle clause.
function cleanMiddle(mid) {
  let s = mid;
  for (const marker of MID_TAIL_MARKERS) {
    const i = s.indexOf(marker);
    if (i > 0) {
      const before = s.slice(0, i).replace(/[\s.,;—–]+$/, '').trim();
      if (before.length > 8) s = before; // keep the real clause, drop the tail
    }
  }
  return s.replace(/\s+/g, ' ').trim();
}

const VERB_RE = /^(calculate|compare|estimate|convert|find|check|compute|track|plan|measure|see|get|model|split|price|cost|project|forecast|determine|work out)\b/i;

function lowerFirst(s) {
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function upperFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Build the natural description for one entry. Returns null when the entry is
// already natural prose (no splice detected).
function buildNatural(id, entry) {
  const m = entry.metaDesc.match(SPLICE_RE);
  if (!m) return null;
  const name = m[1].trim();
  const reg = regById[id];
  const cat = entry.cat || (reg && reg.category) || 'everyday';
  const closer = CLOSERS[cat] || CLOSERS.everyday;

  let mid = cleanMiddle(m[2] || '');

  // If there is a tail fragment (or the middle itself was tailish), and the
  // remaining middle lost its meaning, recover the verb from the registry desc.
  if ((!mid || mid.length < 8 || isTailish(mid)) && reg && reg.desc) {
    mid = String(reg.desc).replace(/\.$/, '').trim();
  }
  if (!mid || mid.length < 8) return null; // nothing usable — leave as-is
  // If what remains is still just a recycled tail and there is no registry
  // fallback, this entry was NOT a real splice — leave it alone.
  if (isTailish(mid) && !reg) return null;

  // Sentence 1 — imperative when the middle starts with a verb; otherwise a
  // "<Name>: <clause>." label construction (reads naturally for questions too).
  let s1;
  if (VERB_RE.test(mid)) {
    s1 = upperFirst(mid) + '.';                       // "Compare petrol, diesel, EV costs."
  } else {
    let clause = lowerFirst(mid);
    // Fix question inversion for embedded clauses: "how much car can you afford"
    // -> "how much car you can afford".
    clause = clause.replace(/\b(can|do|did|does|will|would|should)\s+you\s+/, 'you $1 ');
    const label = name.replace(/\s*\(.*?\)\s*$/, '').trim();
    s1 = label + ': ' + clause + '.';
  }

  // Sentence 2 — driven by the tool's OWN input labels (unique per tool, so the
  // sentence never repeats across sibling pages); falls back to the category
  // closer when the registry has no usable labels.
  const PROPER_KEEP = new Set(['English', 'Unix']); // verified: only real proper nouns in all 2,420 labels
  const smartLower = (l) =>
    l
      .split(/\b/)
      .map((w) => (PROPER_KEEP.has(w) ? w : lowerFirst(w)))
      .join('');
  const labels = ((reg && reg.inputs) || [])
    .map((i) => i && i.label)
    .filter((l) => typeof l === 'string' && l.length > 1 && l.length < 34)
    .map((l) => smartLower(l.trim().replace(/[:.]$/, '')));
  if (labels.length >= 3) {
    s2 = 'Enter your ' + labels[0] + ', ' + labels[1] + ' and ' + labels[2] + ' — the result updates as you type.';
  } else if (labels.length === 2) {
    s2 = 'Enter your ' + labels[0] + ' and ' + labels[1] + ' — the result updates as you type.';
  } else if (labels.length === 1) {
    s2 = 'Enter your ' + labels[0] + ' and the result updates right away.';
  } else {
    s2 = closer + '.';
    if (!/browser|uploaded|offline|private|sign-up|device/i.test(closer)) s2 += ' Free, no sign-up.';
  }
  return { s1, s2, cat };
}

// ---------- band enforcement (90–160), phrase-safe ----------
function clampBand(s1, s2, cat) {
  let out = s1 + ' ' + s2;
  if (out.length >= 90 && out.length <= 160) return out;
  if (out.length > 160) {
    // 1) drop the trailing "Free, no sign-up." if present
    const noFree = s2.replace(/ Free, no sign-up\.$/, '.');
    if (noFree !== s2) {
      out = s1 + ' ' + noFree;
      if (out.length <= 160) return ensureBandFloor(out, s1, cat);
    }
    // 2) trim whole words off sentence 2 until it fits (keep >= 3 words)
    let s2t = noFree;
    while ((s1 + ' ' + s2t).length > 160) {
      const words = s2t.replace(/\.$/, '').split(' ');
      if (words.length <= 3) break;
      words.pop();
      s2t = words.join(' ') + '.';
    }
    out = s1 + ' ' + s2t;
    if (out.length <= 160) return ensureBandFloor(out, s1, cat);
    // 3) last resort: sentence 1 alone
    out = s1;
  }
  return ensureBandFloor(out, s1, cat);
}

function ensureBandFloor(out, s1, cat) {
  const PADS = [
    ' Results appear instantly.',
    ' Works offline after your first visit.',
    ' No account needed — open and calculate.',
  ];
  let i = 0;
  while (out.length < 90 && i < PADS.length) {
    out += PADS[i];
    i++;
  }
  // very short sentence 1: append a formula/steps clause
  let j = 0;
  while (out.length < 90 && j < 2) {
    const ext = j === 0 ? ' Shows the formula and every step with your own numbers.' : ' Compare scenarios side by side before you decide.';
    if (out.length + ext.length <= 200) out = out.replace(/\.$/, '') + ',' + ext.toLowerCase().replace(/^(\w)/, (c) => c);
    j++;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// ---------- run ----------
const changes = {};
let noSplice = 0;
let tailRemoved = 0;
const dist = { under90: 0, inBand: 0, over160: 0 };
const seenMeta = {};
const dups = [];

for (const id of ids) {
  const e = TOOL_SEO[id];

  // 1. metaDesc rewrite
  const built = buildNatural(id, e);
  if (built) {
    const clamped = clampBand(built.s1, built.s2, built.cat);
    const L = clamped.length;
    dist[L < 90 ? 'under90' : L <= 160 ? 'inBand' : 'over160']++;
    if (clamped !== e.metaDesc) changes[id] = { old: e.metaDesc, new: clamped };
    e.metaDesc = clamped;
  } else {
    noSplice++;
    const L = e.metaDesc.length;
    dist[L < 90 ? 'under90' : L <= 160 ? 'inBand' : 'over160']++;
  }

  // duplicate guard within this pass
  const key = e.metaDesc.toLowerCase();
  if (seenMeta[key]) dups.push(id + ' == ' + seenMeta[key]);
  else seenMeta[key] = id;

  // 2. desc boilerplate tail removal
  const d = e.desc || '';
  const i = d.indexOf('<h2>The CalcPro Philosophy</h2>');
  let d2 = d;
  if (i !== -1) d2 = d.slice(0, i);
  d2 = d2.replace(/<p>People searching for this tool often pair it with[\s\S]*?<\/p>/g, '');
  d2 = d2.replace(/\n\s*\n\s*\n/g, '\n\n');
  if (d2 !== d) { tailRemoved++; e.desc = d2; }
}

console.log('entries:', ids.length);
console.log('metaDesc rewritten:', Object.keys(changes).length, '| left as-is:', noSplice);
console.log('length band after rewrite — <90:', dist.under90, '| 90-160:', dist.inBand, '| >160:', dist.over160);
console.log('duplicate metas introduced:', dups.length);
dups.slice(0, 5).forEach((x) => console.log('  DUP: ' + x));
console.log('desc blocks with Philosophy/LSI-pair tail removed:', tailRemoved);

console.log('\n--- before/after samples ---');
let n = 0;
for (const [id, c] of Object.entries(changes)) {
  console.log('· ' + id);
  console.log('  OLD: ' + c.old);
  console.log('  NEW: ' + c.new + '  [' + c.new.length + ']');
  if (++n >= 18) break;
}

// leftovers that still look machine-spliced after the pass
const left = ids.filter((id) => /^Free [^—]+ — .+( — .+)?$/.test(TOOL_SEO[id].metaDesc) && isTailish(TOOL_SEO[id].metaDesc));
console.log('\nstill spliced after pass:', left.length);
left.slice(0, 10).forEach((id) => console.log('  ' + id + ': ' + TOOL_SEO[id].metaDesc));

if (process.env.WRITE === '1') {
  const lines = [
    '// Auto-generated SEO content for all CalcPro tools — Master 6-Block Blueprint',
    '// Generated: ' + new Date().toISOString().slice(0, 10),
    '// Quality pass: natural-language metaDesc rewrites; removed CalcPro Philosophy + LSI-pair boilerplate tail.',
    'var TOOL_SEO = {',
  ];
  for (const [id, e] of Object.entries(TOOL_SEO)) lines.push("  '" + id + "': " + JSON.stringify(e) + ',');
  lines.push('};');
  lines.push("if (typeof window !== 'undefined') { window.TOOL_SEO = TOOL_SEO; window.TOOL_CATEGORY = {}; }");
  lines.push("if (typeof module !== 'undefined') module.exports = TOOL_SEO;");
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log('\nWROTE ' + OUT);
} else {
  console.log('\nDRY-RUN (set WRITE=1 to persist)');
}
