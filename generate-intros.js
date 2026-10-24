#!/usr/bin/env node
// ====== CalcProMaster Unique Intro Paragraph Generator (Step 3) ======
// Produces a UNIQUE ~100-word intro paragraph for EVERY tool page so Google
// never flags any calculator as thin or duplicate content.
//
// How uniqueness works:
//   - 8 sentence slots, each with several template variants
//   - Variant per slot chosen by a seeded PRNG (hash of toolId) so neighbouring
//     tools never read the same
//   - Real tool data injected: name, desc, keywords, actual input labels, category
//   - Assertions after generation: every registry tool has an intro, all intros
//     are unique, word count is in range, and every opener uses the sentence
//     frame that fits the SHAPE of that tool's description (see tests/unit/
//     tool-intros.test.js and scripts/audit-seo-placeholders.cjs, both of which
//     assert against this file's own VERBS list instead of a second copy).
//
// The opener is the part that needs the shape check. `desc` is authored in three
// shapes — an action ("Calculate fuel cost for any trip"), a topic ("Customer
// acquisition cost") and a question ("How much car can you afford?") — and each
// one only reads correctly in its own kind of sentence. The previous version
// pasted all three into the same three frames, which shipped copy like
// "Concrete Block Wall helps you cMU blocks needed for a wall" (topic in a verb
// slot, acronym lowercased), "Need to customer acquisition cost?" and
// "Working out cost per km for a scooter is easier with…" on ~1,000 pages.
//
// Output: js/tool-intros.js (UMD-ish: browser global + CommonJS export so both
// the vanilla site and calcpro-next/ can consume the SAME file).
//
// Run:  node generate-intros.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'js', 'data');
const OUT = path.join(__dirname, 'js', 'tool-intros.js');
// --check: build the file in memory and compare it with the committed copy
// instead of writing. This is the gate that keeps "one writer" true: if a second
// script ever starts emitting js/tool-intros.js (scripts/seo-regen-v5.cjs used to,
// with its own 55-130 word rule), or someone hand-edits an intro, the committed
// file stops matching what this generator produces and CI fails with the exact
// line that differs. The generation date is the one field allowed to change
// day to day, so it is normalised away before comparing.
const CHECK = process.argv.includes('--check');
function introFileMatches(current, expected) {
  const strip = (s) => String(s).replace(/^\/\/ Generated: \d{4}-\d{2}-\d{2}/m, '// Generated: <date>');
  return strip(current) === strip(expected);
}

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

// ---------- registry load ----------
// require()s the data modules, exactly like sync-counts.cjs and
// scripts/seo-regen-v5.cjs. The previous version scraped the files with a regex
// that required `id`, `name`, `desc` AND `kw` on one line, so the 76 tools whose
// definitions wrap across lines were silently dropped: those pages shipped with
// no intro paragraph at all. require() sees the real registry.
global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
global.Security = {
  sanitizeHtml: (v) => String(v),
  validateInput: (v) => v,
  sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; }
};
global.AdvancedCalc = global.AdvancedCalc || {};

function loadAllTools() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.js') && !['data.js', 'data-loader.js'].includes(f));
  const tools = [];
  for (const file of files) {
    const catKey = FIXED_KEYS[file] || file.replace('.js', '');
    const arr = require(path.join(DATA_DIR, file));
    if (!Array.isArray(arr)) continue;
    for (const t of arr) {
      tools.push({
        id: t.id,
        name: t.name || t.id,
        desc: t.desc || '',
        kw: t.kw || '',
        inputs: t.inputs || [],
        // Carried through so the intro copy can tell a tool that fetches live
        // data (async calculators) from one that works fully offline.
        async: t.async === true,
        cat: catKey,
        catName: CAT_NAMES[catKey] || catKey
      });
    }
  }
  return tools;
}

// ---------- description → sentence frame ----------
// An action verb, with the gerund it needs in a topic slot ("calculate fuel cost"
// → "calculating fuel cost"). Curated from the whole corpus by listing the first
// word and count of all 1,282 descriptions (`--explain` prints the classification
// of any one of them) rather than guessed by an inflector. A word that is not
// listed is treated as a topic, so a missed verb would land in a noun slot; the
// grammar gate in main() fails the build on exactly that shape.
const VERBS = {
  add: 'adding', adjust: 'adjusting', allocate: 'allocating', approximate: 'approximating',
  build: 'building', calculate: 'calculating', check: 'checking', classify: 'classifying',
  compare: 'comparing', compress: 'compressing', compute: 'computing', convert: 'converting',
  count: 'counting', decode: 'decoding', divide: 'dividing', encode: 'encoding',
  estimate: 'estimating', evaluate: 'evaluating', expand: 'expanding', find: 'finding',
  generate: 'generating', look: 'looking', measure: 'measuring', multiply: 'multiplying',
  offset: 'offsetting', pay: 'paying', plan: 'planning', predict: 'predicting',
  project: 'projecting', rewrite: 'rewriting', roll: 'rolling', round: 'rounding',
  save: 'saving', scale: 'scaling', score: 'scoring', see: 'seeing', show: 'showing',
  simplify: 'simplifying', simulate: 'simulating', solve: 'solving', split: 'splitting',
  strip: 'stripping', sum: 'summing', teach: 'teaching', track: 'tracking',
  transfer: 'transferring', update: 'updating', validate: 'validating', work: 'working'
};
// Names that must keep their capital letter mid-sentence: proper nouns used as
// the first word of a description (Tsiolkovsky delta-v, Darcy–Weisbach, Welch's
// t-test). Acronyms are detected by shape below, not by this list.
const PROPER = new Set([
  'Tsiolkovsky', 'Cockcroft', 'Friedewald', 'Henderson', 'Darcy', 'Macaulay',
  'Ramanujan', 'Archimedes', 'Flesch', 'Euclidean', 'Phil', 'Payne', 'Bayes', "Welch's",
  'SaaS'
]);
const QUESTION = /^(?:how|what|whats|what's|when|where|which|who|why|is|are|am|do|does|did|should|can|could|will|would)\b/i;

// Lowercase the first letter so the phrase can sit mid-sentence — unless the word
// is an acronym (SE tax, CMU blocks, AOV, P₁V₁, WHtR) or a proper noun, in which
// case lowercasing it is the defect ("SE tax" became "sE tax" on 32 pages).
function phraseCase(s) {
  const first = s.split(' ')[0];
  const bare = first.replace(/[^A-Za-z0-9]/g, '');
  const acronym = /^[A-Z0-9]{2,}$/.test(bare) || /[A-Z]/.test(first.slice(1));
  if (acronym || PROPER.has(first.replace(/[^A-Za-z']/g, ''))) return s;
  return s.replace(/^[A-Z]/, (c) => c.toLowerCase());
}

// Trim a long phrase to `max` words without leaving a half-finished list:
// "…language and work" reads broken, so fall back to the last comma boundary
// when one exists close enough to the cut.
function clipPhrase(s, max) {
  const words = String(s).split(' ');
  if (words.length <= max) return s;
  const head = words.slice(0, max);
  const kept = head.join(' ');
  const lastComma = kept.lastIndexOf(',');
  if (lastComma > 0 && kept.slice(0, lastComma).split(' ').length >= 8) return kept.slice(0, lastComma);
  return kept;
}

// Returns { kind: 'action' | 'topic' | 'question' | 'none', vp, np }.
function descPhrase(tool) {
// Head only: drop a descriptive suffix after a spaced em dash, en dash or colon.
// A plain hyphen is NOT a separator here — it belongs to compounds ("Long-term
// capital gains", "hh:mm", "Drag-strip", "per-delivery"), and splitting on it
// truncated 136 descriptions into stubs like "long", "per", "full" and "Drag".
// Trailing parentheticals are kept: they are the part that names the units or the
// method ("Convert force units (N, kN, lbf)", "Working days between two dates
// (Mon–Fri)"), and 45 descriptions carry one.
  let d = String(tool.desc || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  // A separator only counts when it is spaced (" — " / ": "). Splitting on every
  // dash and colon also cut inside real tokens: "hh:mm entries" lost everything
  // after "hh", "Darcy–Weisbach friction head loss" became "Darcy",
  // "Mon–Fri" left a dangling "(Mon".
  d = d.split(/\s+[—–]\s+|:\s+/)[0].trim();
  // "Free influencer sponsorship rate calculator" is a topic, not an action, and
  // "calculator" is already in the tool name.
  d = d.replace(/^free\s+(?:online\s+)?/i, '').replace(/\s+(?:calculator|estimator)$/i, '').trim();
  // Keep the opener from swallowing the word budget: a 20-word description
  // would push the whole paragraph past the 140-word gate.
  d = clipPhrase(d, 14);
  d = phraseCase(d);
  if (!d) {
    const fromName = String(tool.name || '').replace(/\s+(?:calculator|estimator)$/i, '').trim().toLowerCase();
    return { kind: fromName ? 'topic' : 'none', vp: '', np: fromName };
  }
  // Questions are only used in answer frames, so cut the phrase at its own
  // question mark: "Do discount points pay off? Break-even analysis" is one
  // question plus a trailing clause, not two sentences.
  if (QUESTION.test(d)) return { kind: 'question', vp: '', np: d.split('?')[0] + '?' };
  const first = d.split(' ')[0].toLowerCase();
  if (VERBS[first]) return { kind: 'action', vp: d, np: d.replace(/^\S+/, VERBS[first]) };
  return { kind: 'topic', vp: '', np: d };
}

// ---------- sentence helpers ----------
function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}
// Input labels that are instructions or mode switches, not quantities: embedding
// them in prose reads as garble ("Fill in Solve for (1=y, 2=k, 3=x)").
const MODE_LABEL = /^(?:solve|convert|calculate|compute|find|enter|choose|pick|select|mode|operation|search)\b/i;
function inputList(tool) {
  const labels = (tool.inputs || [])
    .filter((i) => i && i.label && !MODE_LABEL.test(i.label))
    .filter((i) => !['select', 'checkbox', 'textarea', 'button'].includes(i.type))
    .slice(0, 3)
    .map((i) => String(i.label).replace(/<[^>]*>/g, '').trim())
    .filter(Boolean);
  if (labels.length === 0) return 'your values';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels[0] + ' and ' + labels[1];
  return labels[0] + ', ' + labels[1] + ' and ' + labels[2];
}
function kws(tool) {
  const raw = String(tool.kw || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const out = [];
  for (const k of raw) {
    if (out.includes(k)) continue;
    const words = k.split(' ');
    // Skip a phrase whose words are all already present in a kept phrase
    // ("free online mileage calculator" after "free mileage calculator").
    if (out.some((p) => words.every((w) => p.split(' ').includes(w)))) continue;
    out.push(k);
  }
  return out;
}

// ---------- sentence slots (variants chosen by seeded PRNG) ----------
// Every opener names the tool, which is also what keeps 1,282 intros unique.
const OPENERS = {
  action: [
    (t) => `${t.name} is a free online calculator that helps you ${t.vp}.`,
    (t) => `Need to ${t.vp}? ${t.name} gives you an exact answer in seconds.`,
    (t) => `${t.name} helps you ${t.vp} without a spreadsheet.`
  ],
  topic: [
    (t) => `Working out ${t.np} is easier with ${t.name} — a free tool that does the math for you.`,
    (t) => `${t.name} turns the numbers behind ${t.np} into an instant, step-by-step result.`,
    (t) => `${t.name} is built for ${t.np} — fast, free, and private.`,
    (t) => `Need a fast answer on ${t.np}? ${t.name} does the math and shows every step.`
  ],
  // Answer frames only: a question cannot sit inside a clause ("Working out is a
  // year a leap year? is easier with…"), so every question frame keeps it as a
  // quoted object of "answers" or "answer".
  question: [
    (t) => `${t.name} answers one question directly: ${t.np} — with the working shown beside the result.`,
    (t) => `${t.name} is built to answer one question: ${t.np} The steps behind the answer are shown beside the result.`
  ],
  none: [
    (t) => `${t.name} keeps the whole calculation in front of you: your inputs, the formula, and every intermediate step.`
  ]
};
// An action description also gets the noun frames, with its verb turned into the
// gerund ("calculate fuel cost" → "calculating fuel cost"). The clause frame takes
// "how to" plus the plain verb instead, because "Working out calculating fuel
// cost is easier with…" doubles the verb form. A topic description carries no verb,
// so only the topic frames can hold it. The desc-free frame is reserved for a
// description that yields no phrase at all — mixing it in as one of N options
// would leave that share of intros with no description in them.
const ACTION_TOPIC = [
  (t) => `Working out how to ${t.vp} is easier with ${t.name} — a free tool that does the math for you.`,
  (t) => `${t.name} turns the numbers behind ${t.np} into an instant, step-by-step result.`,
  (t) => `${t.name} is built for ${t.np} — fast, free, and private.`,
  (t) => `Need a fast answer on ${t.np}? ${t.name} does the math and shows every step.`
];
function openersFor(kind) {
  if (kind === 'action') return OPENERS.action.concat(ACTION_TOPIC);
  if (kind === 'question') return OPENERS.question;
  if (kind === 'topic') return OPENERS.topic;
  return OPENERS.none.slice();
}

// Only the tool whose calculation fetches live data (the async currency
// converter reads current rates) genuinely needs a connection. The caveat used
// to sit inside one shared privacy sentence, so roughly a quarter of ALL intros
// — including tools that work fully offline — claimed "currency conversion needs
// a live connection" (measured 2026-10-13: 307 of 1,284 intros). Attaching it per
// tool keeps the sentence true wherever it appears.
function needsLiveConnection(tool) {
  return tool && tool.async === true;
}

// DE-DUPLICATION (2026-10-19): every sentence names the tool or its category.
// Only whole intros used to be unique, so six sentences per slot meant the same
// sentence appeared on ~200 pages and each of its 7-grams on those 200 pages
// too. Naming the tool inside every variant makes each sentence (and its
// n-grams) unique by construction, without inventing facts: the wording still
// describes only what the page really does.
const SLOTS = {
  inputs: [
    (t) => `Just enter ${inputList(t)} and ${t.name} updates the result as you type.`,
    (t) => `Type ${inputList(t)} into ${t.name} and the calculator recalculates with every keystroke.`,
    (t) => `Fill in ${inputList(t)} on ${t.name} and read your answer immediately.`,
    (t) => `You provide ${inputList(t)} to ${t.name}; it does the rest in real time.`,
    (t) => `Drop ${inputList(t)} into ${t.name} and the output appears before you finish typing.`,
    (t) => `Enter ${inputList(t)} in any order — ${t.name} recalculates as soon as a field changes.`
  ],
  result: [
    (t) => `${t.name} gives a clean, precise output with the full working shown, so you can verify every step.`,
    (t) => `The answer from ${t.name} comes with a step-by-step breakdown, so the arithmetic can be checked rather than trusted.`,
    (t) => `Every ${t.name} answer includes a transparent breakdown you can repeat by hand.`,
    (t) => `${t.name} displays the calculation with all its working, so the number always makes sense.`,
    (t) => `${t.name} pairs each output with the formula behind it, which keeps the figure auditable.`,
    (t) => `In ${t.name} the working sits beside the answer, so a mistyped input is easy to spot.`,
    (t) => `${t.name} separates the headline result from the supporting detail, so the answer reads at a glance.`,
    (t) => `Nothing in ${t.name} is a black box: the panel shows both the value and how it was derived.`
  ],
  usecase: [
    (t) => `That makes ${t.name} handy for quick estimates at work, at home, or on the go.`,
    (t) => `${t.name} suits budgeting, planning, or checking someone else\u2019s figures.`,
    (t) => `Use ${t.name} whenever you need a reliable number without opening a spreadsheet.`,
    (t) => `Students, professionals, and everyday planners reach for ${t.name} for the same reason: the answer is instant.`,
    (t) => `${t.name} is at its best when you want certainty fast \u2014 no formulas to memorize, no app to install.`,
    (t) => `A one-off check or a figure you revisit every month: ${t.name} handles both.`,
    (t) => `${t.name} fits the moment a decision depends on this calculation and you would rather not guess.`,
    (t) => `Anyone comparing options in ${t.catName} can use ${t.name} to line up scenarios side by side.`
  ],
  privacy: [
    (t) => needsLiveConnection(t)
      ? `${t.name} runs in your browser \u2014 what you type is not sent to our servers \u2014 but this one loads current exchange rates, so it needs a live connection.`
      : `${t.name} runs in your browser: what you type is not sent to our servers, and it works offline after the first visit.`,
    (t) => `Nothing entered in ${t.name} leaves your device; the calculation is fully client-side, and optional analytics or advertising only activate with your consent.`,
    (t) => `There is no sign-up and no server storage in ${t.name} \u2014 the math happens on your device, and the page keeps working offline.`,
    (t) => `${t.name} is privacy-first: the calculation is local, your data stays yours, and the tool keeps working offline.`,
    (t) => `Nothing is uploaded while ${t.name} works, because the numbers stay on the page and the answer is computed on your own device.`,
    (t) => `No account is needed for ${t.name} and no input is sent to a server: the browser does the arithmetic, even when the connection drops.`,
    (t) => `You can disconnect after loading ${t.name} and the calculation still runs, because nothing is sent to a backend.`
  ],
  keywords: [
    (t) => `${t.name} is part of the ${t.catName} collection on CalcProMaster, alongside ${kws(t)[0] || 'other tools'}, ${kws(t)[1] || 'free calculators'} and more.`,
    (t) => `${t.name} is one of ${t.total}+ free CalcProMaster calculators covering ${kws(t)[0] || 'this topic'}, ${kws(t)[1] || 'related figures'} and similar everyday questions.`,
    (t) => `Looking for ${kws(t)[0] || 'an exact figure'} or ${kws(t)[1] || 'a quick estimate'}? ${t.name} covers both.`,
    (t) => `${t.name} sits in the ${t.catName} section next to ${kws(t)[1] || 'related tools'} and ${kws(t)[0] || 'similar pages'}.`
  ],
  extra: [
    (t) => `${t.name} is one of the fastest ways to get from question to answer without a spreadsheet.`,
    (t) => `${t.name} is designed for real people \u2014 plain labels and instant feedback on every field.`,
    (t) => `There is no learning curve in ${t.name}: the fields are clearly labeled and the result explains itself.`,
    (t) => `${t.name} is great for comparing scenarios \u2014 change a value and watch the impact immediately.`,
    (t) => `The labels in ${t.name} use the same terms as its result, so nothing has to be translated in your head.`,
    (t) => `Run ${t.name} twice with different numbers to see which input drives the answer.`,
    (t) => `${t.name} keeps the formula, the assumptions, and the result on one screen, which is what makes it usable rather than merely fast.`,
    (t) => `Bookmark ${t.name} and the same calculation is one click away next time.`
  ],
  cta: [
    (t) => `Open ${t.name}, enter your numbers, and you will have a trustworthy answer before you know it.`,
    (t) => `Give ${t.name} a try \u2014 it takes seconds and costs nothing.`,
    (t) => `Bookmark ${t.name} and the answer is always one click away.`,
    (t) => `Try ${t.name} now and keep it handy for next time.`,
    (t) => `Start with ${t.name} and the first number is seconds away.`,
    (t) => `${t.name} needs no account, so the quickest way to see it work is to type a number.`,
    (t) => `Use ${t.name} for the next question that comes up in ${t.catName} and compare it with your own math.`
  ]
};
const SLOT_ORDER = ['inputs', 'result', 'usecase', 'privacy', 'keywords', 'extra', 'cta'];

function buildIntro(tool, seed) {
  const rand = mulberry32(seed);
  // Sentences are tracked by slot so the length cap can drop the least
  // essential optional ones by NAME. The old index-based splice assumed the
  // opener occupied one slot and removed the wrong sentence whenever the
  // first splice shifted the array.
  const parts = [{ k: 'opener', text: pick(rand, openersFor(tool.kind))(tool) }];
  for (const k of SLOT_ORDER) parts.push({ k, text: pick(rand, SLOTS[k])(tool) });
  const join = () => parts.map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim();
  const drop = (k) => {
    const i = parts.findIndex((p) => p.k === k);
    if (i > 0) parts.splice(i, 1);
  };
  let intro = join();
  // Cap length at the 140-word gate, dropping extra → usecase → cta in that
  // order. Opener, inputs, result, privacy and keywords always stay: they are
  // the sentences that name the tool and describe the page.
  if (intro.split(/\s+/).length > 132) { drop('extra'); intro = join(); }
  if (intro.split(/\s+/).length > 138) { drop('usecase'); intro = join(); }
  if (intro.split(/\s+/).length > 138) { drop('cta'); intro = join(); }
  return intro;
}

// ---------- main ----------
function main() {
  const tools = loadAllTools();
  const used = new Set();
  const out = {};
  const problems = [];

  tools.forEach((tool) => {
    // Expose the true registry size so count claims inside intros stay truthful.
    tool.total = tools.length;
    const phrase = descPhrase(tool);
    tool.kind = phrase.kind;
    tool.vp = phrase.vp;
    tool.np = phrase.np;
  });

  // `node generate-intros.js --explain [tool-id]` prints how each description was
  // classified and the phrase it produced — the quickest way to check a page that
  // reads oddly without reading the generated 1 MB file.
  if (process.argv.includes('--explain')) {
    const want = process.argv[process.argv.indexOf('--explain') + 1];
    for (const t of tools) {
      if (want && t.id !== want) continue;
      console.log(t.id.padEnd(30) + t.kind.padEnd(10) + JSON.stringify(t.vp || t.np));
    }
    return;
  }

  tools.forEach((tool) => {
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
  const wc = Object.values(out).map((s) => s.split(/\s+/).length);
  const min = Math.min(...wc), max = Math.max(...wc);
  const avg = (wc.reduce((a, b) => a + b, 0) / wc.length).toFixed(1);

  const total = Object.keys(out).length;
  const uniqueCount = new Set(Object.values(out)).size;
  const tooShort = Object.keys(out).filter((id) => out[id].split(/\s+/).length < 80);
  const tooLong = Object.keys(out).filter((id) => out[id].split(/\s+/).length > 140);

  console.log('tools:', tools.length, '| intros:', total, '| unique intros:', uniqueCount,
    '| words min/avg/max:', min + '/' + avg + '/' + max);
  if (total !== tools.length) problems.push('intro count ' + total + ' != registry ' + tools.length);
  if (uniqueCount !== total) problems.push('DUPLICATE intros detected: ' + (total - uniqueCount));
  if (tooShort.length) problems.push('too short (<80 words): ' + tooShort.join(', '));
  if (tooLong.length) problems.push('too long (>140 words): ' + tooLong.join(', '));

  // Grammar gate: an action verb must never sit in a noun slot. This is the
  // failure mode the classification exists to prevent, so it fails the build
  // rather than shipping ("Working out repair a relationship is easier with…").
  const verbList = Object.keys(VERBS).join('|');
  const VERB_IN_NOUN_SLOT = new RegExp(
    '(?:turns the numbers behind|Working out|is built for|answer on) (' + verbList + ')\\b'
    + '|(?:helps you|Need to) (?!' + verbList + '\\b)'
    + '|\\?\\s+(?:is easier|is built|turns|helps)'
  );
  const grammar = [];
  for (const [id, s] of Object.entries(out)) {
    const t = tools.find((x) => x.id === id);
    if (!s.includes(t.name)) grammar.push(id + ': opener does not name the tool');
    if (VERB_IN_NOUN_SLOT.test(s)) grammar.push(id + ': verb in a noun slot — ' + s.slice(0, 90));
    // The doubled form is only detectable against the tool's OWN verb: "Working
    // out calculating fuel cost" is wrong, while "Working out planning cost
    // estimate" is a topic phrase that merely looks like a gerund.
    if (t.kind === 'action' && s.includes('Working out ' + t.np.split(' ')[0])) {
      grammar.push(id + ': doubled verb form — ' + s.slice(0, 90));
    }
    for (const artifact of ['undefined', '[object', 'NaN', ' ,', ' .']) {
      const at = s.indexOf(artifact);
      if (at >= 0) grammar.push(id + ': artifact "' + artifact + '" — ' + JSON.stringify(s.slice(Math.max(0, at - 50), at + 30)));
    }
  }
  if (grammar.length) problems.push('GRAMMAR:\n    ' + grammar.slice(0, 20).join('\n    ')
    + (grammar.length > 20 ? '\n    … +' + (grammar.length - 20) + ' more' : ''));

  if (problems.length) {
    console.error('✗ PROBLEMS:\n' + problems.join('\n'));
    process.exit(1);
  }

  // ---- write js/tool-intros.js (or --check the committed copy) ----
  const lines = Object.keys(out).map((id) => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(out[id]));
  const header = '// Auto-generated unique intro paragraphs for all CalcProMaster tools (Step 3)\n'
    + '// Generated: ' + new Date().toISOString().slice(0, 10) + ' — ' + total + ' intros for ' + tools.length + ' registry tools, all unique\n'
    + '// Regenerate with: node generate-intros.js\n'
    + '// Consumed by the vanilla site (browser global TOOL_INTROS) AND calcpro-next/\n'
    + '// (CommonJS export) so both codebases render identical unique intros.\n';
  const body = 'var TOOL_INTROS = {\n' + lines.join(',\n') + '\n};\n'
    + 'if (typeof module !== \'undefined\' && module.exports) { module.exports = TOOL_INTROS; }\n'
    + 'else if (typeof window !== \'undefined\') { window.TOOL_INTROS = TOOL_INTROS; }\n';

  const content = header + body;

  if (CHECK) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (introFileMatches(current, content)) {
      console.log('✓ ' + path.relative(__dirname, OUT) + ' matches the generator (' + total + ' intros, ' + uniqueCount + ' unique)');
      return;
    }
    const a = current.replace(/^\/\/ Generated: \d{4}-\d{2}-\d{2}/m, '// Generated: <date>').split('\n');
    const b = content.replace(/^\/\/ Generated: \d{4}-\d{2}-\d{2}/m, '// Generated: <date>').split('\n');
    let at = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { at = i; break; }
    }
    console.error('✗ js/tool-intros.js does not match generate-intros.js — it was written by another script or edited by hand.');
    if (at >= 0) {
      console.error('  first difference at line ' + (at + 1) + ':');
      console.error('    on disk  : ' + JSON.stringify((a[at] || '(missing)').slice(0, 140)));
      console.error('    generator: ' + JSON.stringify((b[at] || '(missing)').slice(0, 140)));
    }
    console.error('  Fix: run `node generate-intros.js` (npm run intros) and commit js/tool-intros.js.');
    process.exit(1);
  }

  fs.writeFileSync(OUT, content, 'utf8');
  console.log('✓ wrote ' + OUT + ' (' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
  console.log('  opener frames in use: ' + JSON.stringify(countKinds(tools)));
  console.log('\nSample intro for loan-emi:\n  ' + out['loan-emi']);
  console.log('\nSample intro for fuel-cost:\n  ' + out['fuel-cost']);
}

function countKinds(tools) {
  const k = {};
  for (const t of tools) k[t.kind] = (k[t.kind] || 0) + 1;
  return k;
}

// Exported so the audit script and the unit tests assert against the same verb
// list and frames this generator uses, instead of a second hand-kept copy.
module.exports = { VERBS, OPENERS, SLOTS, loadAllTools, descPhrase, clipPhrase, phraseCase, openersFor, buildIntro, introFileMatches };

if (require.main === module) main();
