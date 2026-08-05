#!/usr/bin/env node
// ====== CalcProMaster Unique Intro Paragraph Generator (Step 3) ======
// Produces a UNIQUE ~100-word intro paragraph for EVERY tool page so Google
// never flags any calculator as thin or duplicate content. The 510 tools with
// TOOL_SEO content still get a fresh, distinct intro (the old `aeo` opener was
// one shared template across all tools — a real duplicate-content risk), and the
// 38 tools WITHOUT any SEO content finally get unique on-page text too.
//
// How uniqueness works:
//   - 8 sentence slots, each with 3-6 template variants
//   - Variant per slot chosen by a seeded PRNG (hash of toolId) so neighbouring
//     tools never read the same
//   - Real tool data injected: name, desc, keywords, actual input labels, category
//   - Post-generation assertion: all 548 intros unique + word count 80-140
//
// Output: js/tool-intros.js (UMD-ish: browser global + CommonJS export so both
// the vanilla site and calcpro-next/ can consume the SAME file).
//
// Run:  node generate-intros.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'js', 'data');
const OUT = path.join(__dirname, 'js', 'tool-intros.js');

const CAT_NAMES = {
  finance: 'Finance', health: 'Health', math: 'Math',
  everyday: 'Everyday Life', science: 'Science', engineering: 'Engineering',
  construction: 'Construction', conversion: 'Unit Conversion', business: 'Business',
  education: 'Education', utilities: 'Utilities', lifestyle: 'Lifestyle',
  regional: 'Regional', food: 'Food & Nutrition', fitness: 'Fitness & Exercise',
  auto: 'Auto & Transport', career: 'Career & Freelance',
  homegarden: 'Home & Garden', tech: 'Tech & Digital', family: 'Parenting & Family'
};
const FIXED_KEYS = {
  'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness',
  'auto-transport.js': 'auto', 'career-freelance.js': 'career',
  'home-garden.js': 'homegarden', 'tech-digital.js': 'tech',
  'parenting-family.js': 'family'
};

// ---------- deterministic PRNG ----------
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- tool extraction (same robust pattern as generate-seo.js) ----------
function extractTools(filePath) {
  // Robust pattern: works for single-line ({ id: 'x', name: ... }) AND multi-line
  // tool definitions. `name:` right after `id:` uniquely identifies a tool (input
  // field objects use `label:` instead), matching generate-sitemap.js exactly.
  const content = fs.readFileSync(filePath, 'utf8');
  const tools = [];
  // Backreference-quote matching: some tools use double-quoted names that contain
  // apostrophes (e.g. name: "Ohm's Law Calculator"), so the content class must only
  // exclude the SAME quote that opened the string (\1), not both quote types.
  const re = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*(['"])((?:\\.|(?!\2)[^\\])*)\2\s*,\s*desc:\s*(['"])((?:\\.|(?!\4)[^\\])*)\4\s*,\s*kw:\s*(['"])((?:\\.|(?!\6)[^\\])*)\6/g;
  const seen = {};
  let m;
  while ((m = re.exec(content)) !== null) {
    const id = m[1];
    if (!seen[id]) {
      seen[id] = true;
      const inputs = [];
      const inputRe = new RegExp("id:\\s*'" + id + "'[\\s\\S]*?inputs:\\s*\\[([\\s\\S]*?)\\]");
      const im = content.match(inputRe);
      if (im) {
        const inputObjRe = /\{id:\s*'([^']+)'\s*,label:\s*'((?:[^'\\]|\\.)*)'\s*,type:\s*'([^']+)'/g;
        let i2;
        while ((i2 = inputObjRe.exec(im[1])) !== null) {
          inputs.push({ id: i2[1], label: i2[2], type: i2[3] });
        }
      }
      tools.push({ id, name: m[3], desc: m[5], kw: m[7], inputs });
    }
  }
  return tools;
}

function loadAllTools() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js') && f !== 'data.js');
  const tools = [];
  files.forEach(file => {
    const catKey = FIXED_KEYS[file] || file.replace('.js', '');
    extractTools(path.join(DATA_DIR, file)).forEach(t => {
      t.cat = catKey;
      t.catName = CAT_NAMES[catKey] || catKey;
      tools.push(t);
    });
  });
  return tools;
}

// ---------- sentence helpers ----------
function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function cleanDesc(d) {
  // Trim long descriptions so the intro stays ~100 words even for tools whose
  // `desc` field runs long (e.g. plant-spacing, compost, gift-split).
  const clean = String(d || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  // Cut descriptive suffixes like "— with interest-only mode" so they don't repeat.
  const cut = clean.split(/\s*(?:—|–|-|:)\s*/)[0].trim();
  const words = cut.split(' ');
  return words.length > 12 ? words.slice(0, 12).join(' ') : cut;
}
function descPhrase(t) {
  // Normalize the tool's desc into a natural verb phrase: lowercase the first
  // word, and turn question-form descs ("How much car can you afford") into
  // "figure out ..." so the intro sentences read like human writing.
  let d = cleanDesc(t.desc).replace(/^[A-Z]/, c => c.toLowerCase());
  if (/^(how much|how many|what|whats|what's|when|where|which)\b/.test(d)) {
    d = 'figure out ' + d.replace(/^(how much|how many|what|whats|what's|when|where|which)\s*/i, '');
  }
  return d;
}
function kws(tool) {
  return String(tool.kw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
function inputList(tool) {
  const labels = (tool.inputs || []).slice(0, 3).map(i => i.label);
  if (labels.length === 0) return 'your values';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels[0] + ' and ' + labels[1];
  return labels[0] + ', ' + labels[1] + ' and ' + labels[2];
}

// ---------- sentence slots (variants chosen by seeded PRNG) ----------
const SLOTS = {
  opener: [
    t => `${t.name} is a free online calculator that helps you ${descPhrase(t)}.`,
    t => `Need to ${descPhrase(t)}? ${t.name} gives you an exact answer in seconds.`,
    t => `${t.name} turns ${descPhrase(t)} into an instant, step-by-step result.`,
    t => `Working out ${descPhrase(t)} is easier with ${t.name} — a free tool that does the math for you.`,
    t => `${t.name} is built for ${descPhrase(t)} — fast, free, and private.`,
    t => `Whether you are estimating or double-checking a figure, ${t.name} handles ${kws(t)[0] || 'the numbers'} instantly.`
  ],
  inputs: [
    t => `Just enter ${inputList(t)} and the result updates as you type.`,
    t => `Type in ${inputList(t)} — the calculator recalculates live with every keystroke.`,
    t => `Fill in ${inputList(t)} and read your answer immediately.`,
    t => `You provide ${inputList(t)}; the tool does the rest in real time.`,
    t => `Drop in ${inputList(t)} and the output appears before you finish typing.`
  ],
  result: [
    t => 'You get a clean, precise output with the full working shown, so you can verify every step.',
    t => 'The result comes with a step-by-step breakdown — no black box, just math you can check.',
    t => 'Every answer includes a transparent breakdown you can repeat by hand.',
    t => 'The calculation is displayed with all its working, so the number always makes sense.'
  ],
  usecase: [
    t => 'It is handy for quick estimates at work, at home, or on the go.',
    t => 'Perfect for budgeting, planning, or checking someone else\u2019s figures.',
    t => 'Use it whenever you need a reliable number without opening a spreadsheet.',
    t => 'A practical tool for students, professionals, and everyday planners alike.',
    t => 'Great when you want certainty fast — no formulas to memorize, no apps to install.'
  ],
  privacy: [
    t => 'Everything runs in your browser — nothing is uploaded, and it works offline after the first visit.',
    t => 'Your numbers never leave your device: it is 100% client-side and private by design.',
    t => 'No sign-up, no tracking, no server uploads — the math happens right on your device, even offline.',
    t => 'Privacy-first: the calculation is local, your data stays yours, and the tool keeps working offline.'
  ],
  keywords: [
    t => `It is part of the ${t.catName} collection on CalcProMaster, alongside ${kws(t)[0] || 'other tools'}, ${kws(t)[1] || 'free calculators'} and more.`,
    t => `One of 500+ free CalcProMaster calculators covering ${kws(t)[0] || 'this topic'}, ${kws(t)[1] || 'related figures'} and similar everyday questions.`,
    t => `Searching for ${kws(t)[0] || 'an exact figure'} or ${kws(t)[1] || 'a quick estimate'}? This tool covers it — free, fast, and private.`
  ],
  extra: [
    t => 'It is one of the fastest ways to get from question to answer without a spreadsheet.',
    t => 'Designed for real people — plain labels and instant feedback on every field.',
    t => 'No learning curve: the fields are clearly labeled and the result explains itself.',
    t => 'Great for comparing scenarios — change a value and watch the impact immediately.'
  ],
  cta: [
    t => `Open ${t.name}, enter your numbers, and you will have a trustworthy answer before you know it.`,
    t => `Give ${t.name} a try — it takes seconds and costs nothing.`,
    t => `Bookmark it and the answer is always one click away.`,
    t => `Try ${t.name} now and keep it handy for next time.`
  ]
};
const SLOT_ORDER = ['opener', 'inputs', 'result', 'usecase', 'privacy', 'keywords', 'extra', 'cta'];

function buildIntro(tool, seed) {
  const rand = mulberry32(seed);
  const sentences = SLOT_ORDER.map(k => pick(rand, SLOTS[k])(tool));
  let intro = sentences.join(' ').replace(/\s+/g, ' ').trim();
  // Cap length: long input labels can push an intro past ~140 words. Drop the
  // least-essential OPTIONAL slot (extra) first, then usecase, keeping opener /
  // inputs / result / keywords / cta — the sentences that matter for SEO.
  if (intro.split(/\s+/).length > 132) {
    const idxExtra = SLOT_ORDER.indexOf('extra');
    const idxUse = SLOT_ORDER.indexOf('usecase');
    sentences.splice(idxExtra, 1);
    intro = sentences.join(' ').replace(/\s+/g, ' ').trim();
    if (intro.split(/\s+/).length > 132) {
      sentences.splice(idxUse, 1);
      intro = sentences.join(' ').replace(/\s+/g, ' ').trim();
    }
  }
  return intro;
}

// ---------- main ----------
function main() {
  const tools = loadAllTools();
  const used = new Set();
  const out = {};
  const problems = [];

  tools.forEach(tool => {
    // Deterministic base seed; bump until this tool's intro is unique.
    let base = hashStr(tool.id + '::' + tool.cat);
    let intro = buildIntro(tool, base);
    let guard = 0;
    while (used.has(intro) && guard < 500) {
      base += 1013904223;
      intro = buildIntro(tool, base);
      guard++;
    }
    used.add(intro);
    out[tool.id] = intro;
  });

  // ---- assertions ----
  const wc = Object.values(out).map(s => s.split(/\s+/).length);
  const min = Math.min(...wc), max = Math.max(...wc);
  const avg = (wc.reduce((a, b) => a + b, 0) / wc.length).toFixed(1);

  const total = Object.keys(out).length;
  const uniqueCount = new Set(Object.values(out)).size;
  const tooShort = Object.keys(out).filter(id => out[id].split(/\s+/).length < 80);
  const tooLong = Object.keys(out).filter(id => out[id].split(/\s+/).length > 140);

  console.log('tools:', total, '| unique intros:', uniqueCount, '| words min/avg/max:', min + '/' + avg + '/' + max);
  if (uniqueCount !== total) problems.push('DUPLICATE intros detected: ' + (total - uniqueCount));
  if (tooShort.length) problems.push('too short (<80 words): ' + tooShort.join(', '));
  if (tooLong.length) problems.push('too long (>140 words): ' + tooLong.join(', '));
  if (problems.length) {
    console.error('✗ PROBLEMS:\n' + problems.join('\n'));
    process.exit(1);
  }

  // ---- write js/tool-intros.js ----
  const lines = Object.keys(out).map(id => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(out[id]));
  const header = '// Auto-generated unique intro paragraphs for all CalcProMaster tools (Step 3)\n'
    + '// Generated: ' + new Date().toISOString().slice(0, 10) + ' — ' + total + ' tools, all unique\n'
    + '// Regenerate with: node generate-intros.js\n'
    + '// Consumed by the vanilla site (browser global TOOL_INTROS) AND calcpro-next/\n'
    + '// (CommonJS export) so both codebases render identical unique intros.\n';
  const body = 'var TOOL_INTROS = {\n' + lines.join(',\n') + '\n};\n'
    + 'if (typeof module !== \'undefined\' && module.exports) { module.exports = TOOL_INTROS; }\n'
    + 'else if (typeof window !== \'undefined\') { window.TOOL_INTROS = TOOL_INTROS; }\n';

  fs.writeFileSync(OUT, header + body, 'utf8');
  console.log('✓ wrote ' + OUT + ' (' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
  console.log('\nSample intro for loan-emi:\n  ' + out['loan-emi']);
  console.log('\nSample intro for fuel-cost:\n  ' + out['fuel-cost']);
}

main();
