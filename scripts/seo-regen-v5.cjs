#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — SEO Content Regeneration v5.1 ("human-pass" engine)
 * ------------------------------------------------------------
 * Replaces the template-spun v4 content with page copy that is:
 *   - Factually correct: worked examples are COMPUTED by running each
 *     tool's real calc()/steps() with its default inputs (1179+/1201 tools).
 *   - Grammatically clean: no "The Mortgage Calculator mortgage — solve for…"
 *     splices, no random "(2026)" title suffixes, no broken meta text.
 *   - Subject-accurate: prose centers on what the tool really computes
 *     (its metric + inputs), never on a stray legacy keyword.
 *   - Non-stuffing: tool.kw strings are never quoted as prose.
 *   - Globally unique: every prose sentence carries the (unique) tool name,
 *     and a global fingerprint registry hard-fails on any cross-page duplicate.
 *
 * Outputs:
 *   js/seo-content.js   (source of truth — split into js/seo/*.js by split-seo.cjs)
 *   js/tool-intros.js   (unique per-page intro paragraphs)
 *
 * Run: node scripts/seo-regen-v5.cjs
 * ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT_SEO = path.join(ROOT, 'js', 'seo-content.js');
const OUT_INTROS = path.join(ROOT, 'js', 'tool-intros.js');

// ---------- flagship hand-written content (js/seo-premium.js) ----------
// The premium deep-dive articles (real formulas, worked examples, expert FAQs)
// were dead code — no renderer consumed them. Each article's BODY (composed via
// composeArticle) replaces the thin generated guide for that tool so both the
// SSG and the client render it. Titles/metas stay generated: the v5.1 gates
// verify their length/uniqueness, while the premium copies had truncated metas.
let PREMIUM = {};
try { PREMIUM = require(path.join(ROOT, 'js', 'seo-premium.js')) || {}; } catch (e) { PREMIUM = {}; }
// Batch-2 deep-dives live in their own file to keep both under transport limits;
// merge with batch-1 (batch-2 wins on collision — none by design).
try {
  const B2 = require(path.join(ROOT, 'js', 'seo-premium-batch2.js')) || {};
  PREMIUM = Object.assign({}, PREMIUM, B2);
} catch (e) { console.error('WARN: seo-premium-batch2.js failed to load:', e.message); }
// Batch-3/4 same pattern (batch-4 wins on collision — none by design).
try {
  const B3 = require(path.join(ROOT, 'js', 'seo-premium-batch3.js')) || {};
  PREMIUM = Object.assign({}, PREMIUM, B3);
} catch (e) { console.error('WARN: seo-premium-batch3.js failed to load:', e.message); }
try {
  const B4 = require(path.join(ROOT, 'js', 'seo-premium-batch4.js')) || {};
  PREMIUM = Object.assign({}, PREMIUM, B4);
} catch (e) { console.error('WARN: seo-premium-batch4.js failed to load:', e.message); }
const premiumMerged = [];

// ---------- load registry (module.exports arrays, same as sync-counts.cjs) ----------
const FIXED_KEYS = {
  'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness', 'auto-transport.js': 'auto',
  'career-freelance.js': 'career', 'home-garden.js': 'homegarden', 'tech-digital.js': 'tech',
  'parenting-family.js': 'family'
};
global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
global.Security = { sanitizeHtml: v => String(v), validateInput: v => v, sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; } };
global.AdvancedCalc = global.AdvancedCalc || {};

const CAT_NAMES = {
  finance: 'Finance', health: 'Health', math: 'Math', everyday: 'Everyday Life', science: 'Science',
  engineering: 'Engineering', construction: 'Construction', conversion: 'Unit Conversion', business: 'Business',
  education: 'Education', utilities: 'Utilities', lifestyle: 'Lifestyle', regional: 'Regional',
  food: 'Food & Nutrition', fitness: 'Fitness & Exercise', auto: 'Auto & Transport', career: 'Career & Freelance',
  homegarden: 'Home & Garden', tech: 'Tech & Digital', family: 'Parenting & Family'
};

const tools = [];
for (const f of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js') && !['data.js', 'data-loader.js'].includes(f))) {
  const cat = FIXED_KEYS[f] || f.replace('.js', '');
  const arr = require(path.join(DATA_DIR, f));
  if (Array.isArray(arr)) arr.forEach(t => tools.push(Object.assign({ cat }, t)));
}
console.log('registry loaded: ' + tools.length + ' tools across ' + Object.keys(CAT_NAMES).length + ' categories');

// ---------- text helpers ----------
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function stripTags(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim(); }
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
function pick(pool, h, slot) { return pool[(h + slot) % pool.length]; }
function clip(s, max) { s = String(s); if (s.length <= max) return s; return s.slice(0, max).replace(/\s+\S*$/, ''); }
function fmtNum(v) {
  if (typeof v === 'number' && isFinite(v)) return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return String(v);
}
// "Payment: $1,516.96 / monthly" -> { metric:'payment', value:'$1,516.96 / monthly' }
function splitResult(resText) {
  const t = String(resText);
  const colon = t.indexOf(':');
  if (colon > 0 && colon < 46 && /^[A-Za-z][A-Za-z0-9 \-/&+()']*$/.test(t.slice(0, colon).trim())) {
    const rawMetric = t.slice(0, colon).trim().toLowerCase();
    // Degenerate labels: single letters or 1-2 char fragments ("P:", "cr:")
    // are often truncated/legacy prefixes, not readable English metrics.
    // Treat them as unlabeled so the fallback chain derives a real metric.
    if (rawMetric.replace(/[^a-z]/g, '').length < 3) return { metric: '', value: t.trim() };
    return { metric: rawMetric, value: t.slice(colon + 1).trim() };
  }
  return { metric: '', value: t.trim() };
}
// normalize "/ monthly" style suffixes for prose embedding
function naturalizeValue(v) {
  return String(v)
    .replace(/\s*\/\s*monthly/gi, ' per month')
    .replace(/\s*\/\s*yearly/gi, ' per year')
    .replace(/\s*\/\s*annually/gi, ' per year')
    .replace(/\s*\/\s*quarterly/gi, ' per quarter')
    .replace(/\s*\/\s*weekly/gi, ' per week')
    .replace(/\s*\/\s*bi-?weekly/gi, ' every two weeks')
    .replace(/\s*\/\s*semi-annually/gi, ' twice a year')
    .replace(/\s*\/\s*hourly/gi, ' per hour')
    .replace(/\s*\/\s*daily/gi, ' per day')
    .replace(/\s*\/\s*(12|4|2|1|26|52)\b/g, '');
}
// "a payment of $1,516.96 per month" — for embedding in sentences.
// Only numeric-looking results qualify as worked examples: tools whose default
// output is text (generators, converters of text) must not embed prose here.
// Strip a leading imperative verb from a metric label: "convert pet years" →
// "pet years", "calculate monthly payment" → "monthly payment". Only strips
// when what follows still reads like a noun phrase (>=1 word, no dangling joiner).
function stripLeadVerb(m) {
  const s = String(m).trim();
  const stripped = s.replace(/^(calculate|computes?|converts?|determine|estimate|find|get|check|show(?:s)?|work(?:s)? out|generates?|creates?|builds?|makes?|lists?|counts?|picks?|rolls?|flips?|draws?|shuffl(?:e|es)|encodes?|decodes?|hashes?|formats?|parses?)\s+/i, '');
  const words = stripped.split(/\s+/).filter(Boolean);
  if (!words.length || words.join(' ') === s) return s;
  const tail = words.join(' ').toLowerCase();
  if (/^(and|or|to|the|a|an|of)$/.test(words[0].toLowerCase())) return s;
  if (words.length < 1 || tail.length < 3) return s; // allow short nouns like "md5"
  return words.join(' ');
}
function buildExPhrase(resText, fallbackMetric) {
  if (!resText || !/\d/.test(resText) || resText.length > 100) return '';
  const { metric, value } = splitResult(resText);
  const BADM = /^(result|output|answer|mode|input|values?|enter|select|solve|value|val|p|v|x|n|r|res|out|ans|misc|other)$/;
  let m = (metric && !BADM.test(metric)) ? stripLeadVerb(metric) : (fallbackMetric || 'value');
  if (/^per\s+(person|people)\b/i.test(m)) m = 'per-person total';
  const val = clip(naturalizeValue(value), 80);
  if (!val || !/\d/.test(val)) return '';
  // If the metric's wording already appears in the value ("pet years" … "21
  // human years"), restating it reads as a stutter — fall back to a neutral
  // phrase that stays grammatical for every tool.
  const valWords = val.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 4);
  const mWords = m.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 4);
  if (mWords.length && mWords.some(w => valWords.includes(w))) return `a result of ${val}`;
  // Composite multi-metric results ("P:$1500 D:$1167 EV:$405", "P:150g C:200g
  // F:67g") carry their own letter prefixes — claiming "a petrol of P:..." or
  // "a protein of P:..." mislabels the whole vector with one component's name.
  // Frame those as a breakdown instead, which is accurate for every tool.
  const prefixCount = (val.match(/\b[a-z]{1,4}\s*:\s*\S/gi) || []).length;
  if (prefixCount >= 2) return `a breakdown of ${val}`;
  const article = /s$/.test(m) ? '' : 'a ';
  return `${article}${m} of ${val}`;
}
function pluralize(p) {
  if (/\bs$/.test(p)) return p + 'es';
  if (/[sxz]$/.test(p) || /ch$/.test(p) || /sh$/.test(p)) return p + 'es';
  if (/[^aeiou]y$/.test(p)) return p.slice(0, -1) + 'ies';
  return p + 's';
}
function joinAnd(arr) {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + ' and ' + arr[1];
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

// ---------- derive one bundle per tool ----------
const STOP = new Set(('a an and as at be by for from in into of on or per that the to with your you it its this these those ' +
  'free online tool tools calculator calculators quick instantly instant result results output outputs value values enter ' +
  'entering input inputs need needs based solve solving calculate calculating computation estimate estimates ' +
  'works offline sign up privacy first browser based mobile export results compare scenarios result breakdown step by step math standard formula').split(/\s+/));

function deriveBundle(tool) {
  const h = hash(tool.id);
  const name = tool.name || tool.id;
  const lowerName = name.toLowerCase();
  const bareName = name.replace(/\s+calculator$/i, '');
  const lowerBare = bareName.toLowerCase();
  const nameWords = lowerName.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && w !== 'calculator');
  const catKey = tool.cat;
  const catName = CAT_NAMES[catKey] || catKey;

  // ---- inputs ----
  const inputs = (tool.inputs || []);
  // Mode selectors sometimes ship as number fields ("Solve for (1=y, 2=k, 3=x)",
  // "Convert"): their label is an instruction, not a quantity, so embedding
  // them in prose reads as garble ("with solve for of 1"). Exclude verb-led
  // labels from the prose-embedded input list.
  const MODE_LABEL = /^(solve|convert|calculate|compute|find|enter|choose|pick|select)\b/i;
  const labeled = inputs.filter(i => i.label && !MODE_LABEL.test(i.label) && i.type !== 'select' && i.type !== 'checkbox' && i.type !== 'textarea' && i.type !== 'button');
  const cleanLabel = (s) => clip(String(s).replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/->/g, '—').trim(), 44);
  const uiList = labeled.slice(0, 3).map(i => cleanLabel(i.label)).filter(Boolean);
  const ui = joinAnd(uiList);
  const ui2 = joinAnd(uiList.slice(0, 2)); // shorter variant for tight spaces

  // ---- compute default result + steps ----
  let result = null, steps = [], calcOk = false, resText = '';
  const vals = {};
  inputs.forEach(i => { vals[i.id] = i.def !== undefined ? i.def : (i.type === 'number' ? 0 : ''); });
  if (typeof tool.calc === 'function') {
    try {
      const r = tool.calc(Object.assign({}, vals));
      const rt = r && r.result !== undefined ? stripTags(r.result) : '';
      if (rt && !/NaN|Infinity|undefined/.test(rt)) { result = r; calcOk = true; resText = rt; }
    } catch (e) { /* leave calcOk false */ }
  }
  if (calcOk && typeof tool.steps === 'function') {
    const clean = (arr) => arr.map(stripTags).filter(Boolean).filter(s => !/NaN|Infinity|undefined|[<>]/.test(s)).slice(0, 6);
    try { const s = tool.steps(Object.assign({}, vals), result); if (Array.isArray(s)) steps = clean(s); }
    catch (e) { try { const s = tool.steps(Object.assign({}, vals)); if (Array.isArray(s)) steps = clean(s); } catch (e2) {} }
  }

  // ---- metric (what the result headline represents) ----
  // Result headlines often lead with an imperative verb ("Convert pet years:");
  // strip it so prose reads "pet years" not "the convert pet years".
  let metric = '';
  if (calcOk) {
    const sr = splitResult(resText);
    const BAD = /^(mode|input|values?|enter|select|solve|result|output|answer|value|val|p|v|x|n|r|res|out|ans|misc|other)$/;
    if (sr.metric && !BAD.test(sr.metric)) metric = stripLeadVerb(sr.metric);
    // "Per person: $35.40" style headlines read awkwardly in prose ("the per
    // person"); normalize the person denominators to a natural noun phrase.
    if (/^per\s+(person|people)\b/i.test(metric)) metric = 'per-person total';
  }
  // Fallback chain: result prefix → phrase from the tool's own description →
  // multi-word name → generic. This keeps pages reading naturally instead of
  // repeating a generic "headline value" on tools with unlabeled results.
  function metricFromDesc(desc) {
    let d = stripTags(desc || '').toLowerCase().replace(/^(calculate|compute|find|get)\s+/, '');
    // Conversion-style descriptions ("Convert pet years to human years") describe
    // the OUTPUT after "to" — that, not the input, is what the result represents.
    const conv = d.match(/^(?:converts?|turns?)\s+(.+?)\s+to\s+(.+)$/);
    if (conv) {
      const out = conv[2].split(/\s+/).slice(0, 3).join(' ').replace(/[^a-z0-9 ]/g, '').trim();
      if (out.length >= 3) return out;
    }
    d = d.split(/\s+[—–-]\s+|,\s+|\s+with\s+|\s+for\s+|\s+from\s+|\s+and\s+|\s+or\s+|\s+solve\b|\s+per\b|\s+mode\b|\s+&\s+/)[0].trim();
    const words = d.split(/\s+/).filter(w => w && !STOP.has(w) && w.length > 1);
    if (!words.length) return '';
    let phrase = words.slice(0, 3).join(' ');
    if (phrase.length > 30) phrase = words.slice(0, 2).join(' ');
    if (phrase.length > 30 || phrase.length < 3) return '';
    return stripLeadVerb(phrase);
  }
  const descMetric = metric || metricFromDesc(tool.desc);
  const nameMetric = nameWords.filter(w => w !== 'calculator').length >= 2
    ? nameWords.filter(w => w !== 'calculator').slice(0, 3).join(' ')
    : '';
  const metricRef = metric || descMetric || nameMetric || 'headline value';

  // ---- worked-example phrase (uses metricRef when the result prefix is generic) ----
  const exPhrase = calcOk ? buildExPhrase(resText, metricRef) : '';
  const resultMain = calcOk ? clip(naturalizeValue(resText), 120) : '';
  const extraFacts = calcOk && result.extra && !/NaN|Infinity|undefined|[<>]/.test(stripTags(result.extra)) ? clip(stripTags(result.extra), 120) : '';

  // ---- inputs-in-example list with formatted default values ----
  const inputsUsed = uiList.length
    ? uiList.map((l, i) => {
        const inp = labeled[i];
        return l.toLowerCase() + ' of ' + fmtNum(vals[inp.id]);
      }).join(', ')
    : 'the default inputs';

  // ---- subject: from the tool NAME (most accurate), kw only as fallback ----
  const kwTokens = String(tool.kw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  let subject = nameWords.slice(0, 3).join(' ');
  if (!subject || subject.length < 4) {
    for (const kw of kwTokens) {
      if (kw.split(/\s+/).length < 2) continue;
      if (/^(solve|compare|convert|estimate|check|works|no|daily|step|result|instant|browser|privacy|export|standard|unit|free)/.test(kw)) continue;
      subject = kw; break;
    }
  }
  subject = clip(subject || 'everyday calculations', 48).trim();
  const subjectWords = subject.toLowerCase().split(/\s+/);

  // ---- use cases: natural frames only (legacy keyword-derived use cases removed:
  //      they surfaced technical jargon like "day count convention" as a use case) ----
  // Fix 3: frames must not repeat the tool name — subject≈name and metricRef≈name
  // for most tools, so "X planning … double-checking the X" stacked 3 mentions
  // into one sentence. Planning frame comes from a hash-picked pool; the
  // double-check frame uses metricRef only when it is not the name itself.
  const clipW = (max) => (s) => clip(s, max);
  const PLANS = ['planning ahead', 'planning and budgeting', 'day-to-day planning', 'planning around a target figure', 'short-term planning'];
  const uses3 = [
    pick(PLANS, h, 13),
    'comparing scenarios side by side',
    (metricRef && !lowerName.includes(metricRef)) ? 'double-checking the ' + metricRef : 'double-checking a figure before acting on it'
  ];
  const uses3Text = joinAnd(uses3.map(clipW(60)));

  // ---- verbs ----
  const VERBS = ['enters', 'sets', 'provides', 'records'];
  const verb = pick(VERBS, h, 11);
  const verb2 = pick(['feeds', 'supplies', 'gives', 'passes'], h, 12);

  // Metric-vs-neutral rotation (Fix 3): for many tools the derived metric
  // phrase equals the tool name, so reusing ${metricRef} in every sentence
  // doubles name density (name ≈ metric double-counting). Each pool slot
  // deterministically keeps the real metric some of the time and reads as a
  // neutral reference otherwise — natural prose, same information.
  const NEUTRALS = ['result', 'figure', 'output'];
  const slotMetric = (slot, keepPct) => {
    const mh = hash(tool.id + ':' + slot);
    return (mh % 100 < keepPct) ? metricRef : NEUTRALS[mh % NEUTRALS.length];
  };

  return {
    tool, h, id: tool.id, name, lowerName, bareName, lowerBare, catKey, catName,
    inputs, labeled, uiList, ui, ui2,
    calcOk, result, steps, resultMain, extraFacts, inputsUsed, exPhrase,
    metric, metricRef, slotMetric,
    subject, subjectWords, uses3Text, kwTokens, verb, verb2
  };
}

// ---------- sentence pools (EVERY sentence carries the unique tool name) ----------
const P = {
  core: [
    (b) => `${b.name} turns the values you enter into a verified ${b.metricRef} — the formula, every intermediate step, and the assumptions sit beside the result instead of hidden behind it.`,
    (b) => `Use ${b.name} when the ${b.metricRef} needs to be right the first time: it evaluates your inputs against the standard ${b.catName} method and shows the working, not just the answer.`,
    (b) => `${b.name} answers one question well — given the values you provide, what is the ${b.metricRef}? Enter the ${b.ui || 'inputs'}, and the result panel returns the value with the full working underneath.`,
    (b) => `Every run of ${b.name} evaluates the ${b.ui || 'inputs'} you enter, applies the standard ${b.catName} formula, and reports the ${b.metricRef} with each step listed for review.`,
    (b) => `${b.name} is built for ${b.subject} questions that need a defensible number: the working is always visible, the inputs accept your own values, and the ${b.metricRef} updates as you type.`,
    (b) => `At its core, ${b.name} takes the ${b.ui || 'values you enter'} and evaluates the standard formula step by step, so the ${b.metricRef} can be checked rather than trusted on faith.`,
    (b) => `This page is a working ${b.lowerName}: enter your values, read the ${b.metricRef}, and follow the step list to see exactly how the answer was derived.`,
    (b) => `${b.name} keeps the whole calculation in front of you — the ${b.ui || 'inputs'}, the formula, the intermediate steps, and a worked example you can reproduce line by line.`
  ],
  formula: [
    (b) => `The calculation in ${b.name} applies the standard ${b.catName} method, keeping full precision internally and rounding only the final display.`,
    (b) => `${b.name} substitutes the ${b.ui || 'inputs'} into the formula, evaluates it in the order shown in the steps panel, and reports the ${b.metricRef} rounded for readability.`,
    (b) => `The engine behind ${b.name} evaluates the inputs in a single pass — no hidden iterations or adjustments — so the ${b.metricRef} you see is exactly what the formula produces for the values you entered.`,
    (b) => `The relationship between the inputs is fixed by the formula, and ${b.name} makes each substitution explicit so nothing about the ${b.metricRef} is hidden.`,
    (b) => `The formula operates on the values exactly as entered; keeping the units shown in each label is what makes the ${b.metricRef} trustworthy.`,
    (b) => `Precision is maintained through every intermediate step, and rounding is applied only when the final value is formatted.`,
    (b) => `${b.name} lists every intermediate step in the result panel, so the derivation of the ${b.metricRef} can be checked line by line.`,
    (b) => `Rounding follows standard display conventions — the underlying math keeps several decimal places until the ${b.metricRef} is shown.`
  ],
  limit: [
    (b) => `Results from ${b.name} are estimates computed from the values entered; real-world outcomes can differ when fees, taxes, or conditions not modeled here apply.`,
    (b) => `${b.name} assumes the units shown in each label — entering values in different units will skew the ${b.metricRef} proportionally.`,
    (b) => `Treat the ${b.metricRef} as a planning figure rather than a binding quote, and confirm important decisions with the relevant professional.`,
    (b) => `The model behind ${b.name} covers the standard case; special cases, edge values, or jurisdiction-specific rules may need manual adjustment.`,
    (b) => `Very large or very small inputs can push the ${b.metricRef} beyond what is practically meaningful — sanity-check extreme values before relying on them.`,
    (b) => `The ${b.metricRef} is only as complete as the inputs: anything the page does not ask for (fees, variability, local rules) sits outside the calculation.`,
    (b) => `Inputs outside a reasonable range may produce a ${b.metricRef} that is mathematically correct but practically implausible; the steps panel helps you spot that quickly.`
  ],
  why: [
    (b) => `Because the working is visible: ${b.name} shows each operation behind the ${b.metricRef} in the steps panel, so you can verify the result instead of trusting a black box.`,
    (b) => `Because it is fast and private — ${b.name} runs entirely in your browser, nothing is uploaded, and no account is needed.`,
    (b) => `Because comparing scenarios takes seconds: change one input at a time and watch the ${b.metricRef} move, which is the fastest way to understand what drives it.`,
    (b) => `Because the ${b.metricRef} arrives with supporting figures and a full step list, the page gives you context rather than a single bare number.`,
    (b) => `Because the page doubles as documentation: ${b.name} puts the formula, a worked example, and the assumptions right beside the calculator.`,
    (b) => `Because it works the same on phone and desktop, keeps working offline after the first visit, and never asks for sign-up.`
  ],
  mistakes: [
    (b) => `The most common error with ${b.name} is a unit mismatch — one value entered in different units than its label assumes quietly skews the ${b.metricRef}. Check each label before typing.`,
    (b) => `Mixing up inputs with similar labels is the classic ${b.lowerBare} mistake; the steps panel is the quickest way to spot a value that landed in the wrong field.`,
    (b) => `Copying the ${b.metricRef} without its assumptions is the frequent error — the number is valid for exactly the inputs shown, so carry the context with it.`,
    (b) => `Rounding intermediate values by hand introduces error ${b.name} does not have; it keeps full precision internally, so trust the displayed ${b.metricRef} over mental arithmetic.`,
    (b) => `Entering a rate or percentage in the wrong scale (5 versus 0.05, or the reverse) is a frequent trap — the input labels show the expected scale, and the steps reveal a misapplied value.`
  ],
  tip: [
    (b) => `Run ${b.name} twice with deliberately low and high inputs; the spread tells you how sensitive the ${b.metricRef} is, which a single run never shows.`,
    (b) => `The result is shareable — the link carries your inputs, so a colleague can open the same calculation without retyping anything.`,
    (b) => `If the ${b.metricRef} looks wrong, read the steps panel before re-entering anything; it usually shows exactly where the number departed from expectation.`,
    (b) => `Bookmark this page — after the first visit it works offline, so the ${b.metricRef} is one tap away even without a connection.`
  ],
  meaning: [
    (b) => `The ${b.metricRef} is the headline answer; the supporting figures beneath it and the step list give the surrounding context needed to judge it.`,
    (b) => `Read the ${b.metricRef} first, then the steps: together they show not just the value but why that value follows from your inputs.`,
    (b) => `The result panel leads with the ${b.metricRef} and follows with intermediate values; if the headline surprises you, the steps usually reveal which input is responsible.`,
    (b) => `Interpret the ${b.metricRef} against the inputs that produced it — the same number from different inputs can mean different things, which is why the pairing is always shown.`
  ],
  uses: [
    (b) => `Typical uses for ${b.name} include ${b.uses3Text} — anywhere the figure needs to be defensible rather than guessed.`,
    (b) => `${b.name} fits planning and checking: ${b.uses3Text}, or any moment when the ${b.metricRef} needs to be right the first time.`,
    (b) => `Students, planners, and professionals use it for ${b.uses3Text}, and for sanity-checking numbers that arrived from somewhere else.`,
    (b) => `Common scenarios for ${b.name}: ${b.uses3Text}. The step list makes it equally useful for learning the method and for double-checking someone else's numbers.`
  ],
  read: [
    (b) => `Read the result. The ${b.metricRef} appears immediately, with the step-by-step working underneath so you can verify every number.`,
    (b) => `Check the result. The ${b.metricRef} is shown as soon as the inputs are valid, and the steps beneath it show exactly how it was derived.`,
    (b) => `Review the output. Beyond the headline ${b.metricRef}, the intermediate steps are listed — useful for catching a mistyped input.`,
    (b) => `Note the ${b.metricRef}. It updates as you type, and the worked steps below it make the arithmetic auditable.`
  ],
  adjust: [
    (b) => `Adjust and re-run. Change one input at a time to see how sensitive the ${b.metricRef} is to it — the fastest way to understand what the calculation is doing.`,
    (b) => `Compare scenarios. Rerun with different values, or use the batch mode, to line up several outcomes side by side.`,
    (b) => `Explore. Each input change recalculates instantly; watching the ${b.metricRef} move tells you which factor dominates your case.`,
    (b) => `Iterate. Vary the inputs one at a time; the movement in the ${b.metricRef} shows which lever matters most for your ${b.lowerBare} question.`
  ],
  step: [
    (b) => `the value that feeds directly into the formula — match it to the scenario you are modeling before moving on.`,
    (b) => `a core input the formula applies directly — keep the units consistent with the label.`,
    (b) => `one of the values the calculation builds from; the result reflects exactly what you type here.`,
    (b) => `used in the first stage of the calculation, so entering it accurately matters more than any later refinement.`
  ]
};

// ---------- global uniqueness registry ----------
const seenSentences = new Set();
const seenBy = new Map();
function sentKey(s) { return String(s).replace(/\s+/g, ' ').trim().toLowerCase(); }
function reg(s, ctx) {
  const key = sentKey(s);
  if (seenSentences.has(key)) throw new Error('DUPLICATE SENTENCE [' + ctx + ' — first used by ' + (seenBy.get(key) || '?') + ']: ' + String(s).slice(0, 110));
  seenSentences.add(key);
  seenBy.set(key, ctx);
  return s;
}

// ---------- title overrides (hand-written differentiators) ----------
// Input-label-derived tails collide for tool pairs that share the same fields
// (e.g. bond-duration & bond-price both "Face Value, Coupon Rate"). These
// hand-written titles differentiate the pairs by each tool's actual method.
// All are <=60 chars; the global duplicate-title gate below still applies.
const TITLE_OVERRIDES = {
  'bond-duration': 'Bond Duration Calculator: Macaulay & Modified Duration',
  'bond-price': 'Bond Price Calculator: Present Value From Market Yield',
  'crypto-gains': 'Crypto Gains Calculator: Trade Profit, Loss & ROI',
  'crypto-profit': 'Crypto Profit Calculator: Buy, Sell Price & Quantity',
  'day-of-week': 'Day of Week Calculator: Weekday For Any Date',
  'day-of-year': 'Day of Year Calculator: Ordinal Day Number',
  'discounted-payback': 'Discounted Payback Period: NPV-Based Recovery Time',
  'payback-period': 'Simple Payback Period: Years To Recover Investment',
  'family-budget': 'Family Monthly Budget: Income, Housing & Food Plan',
  'family-budget-simple': 'Family Budget Calculator: Quick Monthly Split',
  'budget-allocator': 'Monthly Budget Allocator: Housing, Food & Savings %',
  'frequency-conv': 'Frequency Converter: Hz, kHz, MHz & More Units',
  'wavelength-freq': 'Wavelength ↔ Frequency: Light & Wave Physics',
  'gravel-driveway': 'Gravel Driveway Calculator: Volume & Tons Needed',
  'gravel-tonnage': 'Gravel Tonnage Calculator: Weight From Area',
  'icosahedron-volume': 'Icosahedron Volume: Regular 20-Faced Solid',
  'octahedron-volume': 'Octahedron Volume: Regular 8-Faced Solid',
  'ideal-body-weight': 'Ideal Weight Calculator: Devine Formula',
  'ideal-weight': 'Ideal Body Weight: Devine, Hamwi & Robinson',
  'sleep-calc': 'Sleep Cycle Calculator: 90-Minute Cycle Bedtime',
  'sleep': 'Sleep Calculator: Best Time To Wake Up',
  'stamp-duty': 'Stamp Duty & Registration Calculator: Total Cost',
  'stamp-duty-india': 'Stamp Duty & Registration (India): State Charges'
};

// ---------- build the entry ----------
function buildEntry(b) {
  const { h } = b;

  // ===== TITLE: "Name: Input1, Input2 & Input3" =====
  let phrase = '';
  if (b.uiList.length >= 2) {
    phrase = joinAndTitle(b.uiList.map(l => clip(l, 24)));
  } else if (b.uiList.length === 1) {
    phrase = b.uiList[0];
  } else if (b.metric) {
    phrase = b.metric.replace(/\b\w/g, c => c.toUpperCase());
  } else {
    phrase = b.subject.replace(/\b\w/g, c => c.toUpperCase());
  }
  // degenerate guard: phrase must add info beyond the bare name AND the slug id
  // ("pet-age" → "Pet Age" adds nothing). A phrase is degenerate when every word
  // in it already appears in the full tool name (incl. parenthetical tokens) —
  // "Hash Generator (MD5/SHA): Hash Generator Md5" is degenerate, while
  // "Fence Calculator: Fence Length & Post Spacing" is not (adds length/spacing).
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idNorm = norm(b.id.replace(/^[a-z]+\//, ''));
  const nameVocab = new Set((b.lowerName.match(/[a-z0-9]+/g) || []).filter(w => w.length > 1));
  const degenerate = (p) => {
    const toks = (String(p).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 1);
    const eq = norm(p) === norm(b.lowerBare) || norm(p) === norm(b.lowerName) || (idNorm.length >= 6 && norm(p) === idNorm);
    return eq || toks.length === 0 || toks.every(w => nameVocab.has(w));
  };
  if (degenerate(phrase)) {
    phrase = b.metricRef ? b.metricRef.replace(/\b\w/g, c => c.toUpperCase())
      : (b.ui ? b.ui.replace(/\b\w/g, c => c.toUpperCase())
      : b.subject.replace(/\b\w/g, c => c.toUpperCase()));
    if (degenerate(phrase)) {
      phrase = 'Step-by-Step ' + (b.catName === 'Unit Conversion' ? 'Converter' : 'Calculator');
    }
    if (degenerate(phrase)) {
      phrase = 'Quick Results';
    }
  }
  let title = `${b.name}: ${phrase}`;
  if (title.length > 60) title = clip(title, 60).replace(/\s+\S*$/, '');
  title = title.replace(/[\s,;&:+\-|]+$/, '');
  if (TITLE_OVERRIDES[b.id]) title = TITLE_OVERRIDES[b.id];

  function joinAndTitle(arr) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + ' & ' + arr[1];
    return arr.slice(0, -1).join(', ') + ' & ' + arr[arr.length - 1];
  }

  // ===== META DESCRIPTION =====
  let metaDesc;
  if (b.exPhrase) {
    metaDesc = `Free ${b.name}: enter the ${b.ui2 || 'values'} and get ${b.exPhrase}. Every step shown, nothing leaves your browser.`;
  } else {
    metaDesc = `Free ${b.name}: enter the ${b.ui || 'values'} and get the ${b.metricRef} instantly, with every step of the math shown in your browser.`;
  }
  if (metaDesc.length > 160) metaDesc = `Free ${b.name}: get the ${b.metricRef} instantly, with every step of the math shown. Nothing leaves your browser.`;
  if (metaDesc.length > 160) metaDesc = clip(metaDesc, 157).replace(/\s+\S*$/, '') + '…';
  if (metaDesc.length < 90) metaDesc = `Free ${b.name}: ${b.ui ? 'enter the ' + b.ui + ' and ' : ''}get the ${b.metricRef} instantly. Every step of the math is shown, nothing is uploaded, and the calculator works offline after your first visit.`;
  if (metaDesc.length > 160) metaDesc = clip(metaDesc, 157).replace(/\s+\S*$/, '') + '…';

  // ===== AEO BLOCK (answer-first) =====
  const defSentence = b.exPhrase
    ? `${b.name} works out the ${b.metricRef} from the ${b.ui || 'values you enter'}, following standard ${b.catName} conventions — the page defaults produce ${b.exPhrase}.`
    : `${b.name} works out the ${b.metricRef} from the ${b.ui || 'values you enter'}, following standard ${b.catName} conventions, and shows each step of the calculation.`;
  const ae2 = `${b.name} computes the ${b.metricRef} directly from your inputs${b.ui ? ' — the ' + b.ui + ' feed the formula' : ''}. Nothing is uploaded: the math runs locally in your browser and the result appears as you type.`;
  const inputsLi = b.ui ? b.ui : 'the labeled fields on the page';
  const quick = b.exPhrase
    ? `With the default inputs (${b.inputsUsed}), ${b.lowerName} returns ${b.exPhrase}. Assumptions and limits are summarized below.`
    : `Enter ${inputsLi} and ${b.lowerName} shows the ${b.metricRef} immediately, with every step shown. Assumptions and limits are summarized below.`;
  // Fix 3: headings + FAQ question stems rotate between the tool name and a
  // neutral variant per tool (deterministic hash) — halves remaining name
  // density in headings/questions without losing clarity anywhere.
  const H = (nameVer, neutralVer) => (hash(b.id + ':h:' + nameVer) % 100 < 45 ? nameVer : neutralVer);
  const aeo =
    `<h2>What does the ${H(b.name, 'page calculator')} do?</h2>\n<p>${reg(defSentence, b.id + ':def')}</p>` +
    `<ul><li><strong>Inputs:</strong> ${inputsLi}.</li>` +
    `<li><strong>Output:</strong> the ${b.metricRef}${b.steps.length ? ', plus the intermediate steps behind it' : ''}.</li>` +
    `<li><strong>Method:</strong> the standard ${b.catName} formula, evaluated entirely in your browser.</li></ul>` +
    `<h3>Quick answer</h3>\n<p>${reg(quick, b.id + ':quick')}</p>` +
    `<h2>${H('How does the ' + b.name + ' work?', 'How does it work?')}</h2>\n<p>${reg(ae2, b.id + ':ae2')}</p>`;

  // ===== GUIDE =====
  // Collision-aware sentence choice (Fix 3): some pool entries are
  // intentionally generic (no tool name) to cut name-repetition density, so a
  // hash slot can land on a sentence another page already used. pickU rotates
  // through the pool to the first unused option and registers the chosen
  // sentence immediately. Falls back to a name-bearing sentence (globally
  // unique) when every option in the pool is already taken.
  // Per-slot fallback templates: every one carries the tool name (globally
  // unique), so even when a tool's whole pool is exhausted the fallback cannot
  // collide with any other page — including the same tool's other slots.
  const SLOT_FB = {
    core: () => `On this page, ${b.lowerName} applies the standard ${b.catName} method to your inputs and lists every step of the working beside the result.`,
    formula: () => `The formula section on this page spells out how ${b.lowerName} turns the ${b.ui || 'inputs'} into the ${b.metricRef}, one operation at a time.`,
    limit: () => `The assumptions listed for ${b.lowerName} bound the estimate: inputs outside the labeled ranges can make the ${b.metricRef} mathematically valid but practically implausible.`,
    why: () => `Choosing ${b.lowerName} comes down to transparency — the working stays visible, the math stays local, and the result is reproducible line by line.`,
    mistake: () => `The classic error when using ${b.lowerName} is a mismatched unit or scale, and the steps panel surfaces it faster than re-reading the inputs.`,
    tip: () => `A useful habit with ${b.lowerName}: vary one input at a time and note how far the ${b.metricRef} moves before trusting any single run.`,
    meaning: () => `To interpret the result from ${b.lowerName}, read it together with the intermediate figures — the pairing is what makes the number auditable.`,
    uses: () => `${b.name} earns its place in the ${b.catName} toolkit wherever the figure has to be explained, not just produced.`,
    read: () => `The output panel in ${b.lowerName} leads with the headline result and follows with the steps behind it, so the value can be checked rather than assumed.`,
    adjust: () => `When rerunning ${b.lowerName}, change a single input between attempts — the resulting spread shows which factor actually drives the ${b.metricRef}.`
  };
  const pickU = (pool, slot, tag, bctx) => {
    const start = (h + slot) % pool.length;
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(start + k) % pool.length](bctx || b);
      if (!seenSentences.has(sentKey(cand))) return reg(cand, tag);
    }
    const slotName = tag.split(':')[1] || 'core';
    return reg((SLOT_FB[slotName] || SLOT_FB.core)(bctx || b), tag + ':fb');
  };
  // poolB: per-slot context where metricRef may read as a neutral word —
  // keepPct = % of tools that keep the real metric in that slot.
  const poolB = (slot, keepPct) => Object.assign({}, b, { metricRef: b.slotMetric(slot, keepPct) });
  const core = pickU(P.core, 0, b.id + ':core', poolB('core', 45));
  const formula = pickU(P.formula, 1, b.id + ':formula', poolB('formula', 40));
  const limit = pickU(P.limit, 2, b.id + ':limit', poolB('limit', 30));
  const why = pickU(P.why, 3, b.id + ':why', poolB('why', 30));
  const mistake = pickU(P.mistakes, 4, b.id + ':mistake', poolB('mistake', 40));
  const tip = pickU(P.tip, 5, b.id + ':tip', poolB('tip', 30));
  const meaning = pickU(P.meaning, 6, b.id + ':meaning', poolB('meaning', 40));
  const uses = pickU(P.uses, 7, b.id + ':uses', poolB('uses', 40));
  const read = pickU(P.read, 9, b.id + ':read', poolB('read', 40));
  const adjust = pickU(P.adjust, 10, b.id + ':adjust', poolB('adjust', 40));

  // worked example (computed, real)
  let worked = '';
  if (b.calcOk && b.resultMain) {
    const shownSteps = b.steps.length ? b.steps.slice(0, 4) : [];
    worked = `<p><strong>Worked example:</strong> with ${b.inputsUsed}, this ${b.lowerBare} calculation returns <strong>${escHtml(b.resultMain)}</strong>.` +
      (b.extraFacts ? ` The same run reports ${escHtml(b.extraFacts)}.` : '') + `</p>` +
      (shownSteps.length
        ? `<p>The steps it follows:</p><ul>${shownSteps.map(s => `<li>${escHtml(s.replace(/^Step\s+\d+:\s*/i, ''))}</li>`).join('')}</ul>`
        : '') +
      `<p>Substitute your own values and the same steps produce your answer — that is the point of a calculator that shows its working.</p>`;
  } else {
    worked = `<p><strong>Worked example:</strong> enter your own ${b.ui || 'values'} and the page shows the ${b.metricRef} together with every step used to reach it, so the example is always your own real case.</p>`;
  }

  // how-to list
  const stepBodies = [];
  const nSteps = Math.min(3, b.labeled.length);
  const stepPoolIndex = h % P.step.length;
  for (let i = 0; i < nSteps; i++) {
    const label = b.uiList[i] || b.labeled[i].label;
    let li = null;
    for (let k = 0; k < P.step.length && !li; k++) {
      const cand = `<li><strong>${escHtml(label)}</strong> — ${P.step[(stepPoolIndex + i + k) % P.step.length](poolB('step' + i, 30))}</li>`;
      if (!seenSentences.has(sentKey(cand))) li = reg(cand, b.id + ':li' + i);
    }
    if (!li) {
      li = reg(`<li><strong>${escHtml(label)}</strong> — in ${b.lowerName}, this value feeds the formula directly, and the steps panel shows exactly where it enters the ${b.metricRef}.</li>`, b.id + ':li' + i + ':fb');
    }
    stepBodies.push(li);
  }
  if (!stepBodies.length) {
    stepBodies.push(reg(`<li><strong>Enter your values</strong> — the fields in ${b.lowerBare} accept your own numbers, and the result reflects exactly what you type here.</li>`, b.id + ':li0'));
  }

  const desc =
    `<h2>${H('How the ' + b.name + ' works', 'How it works')}</h2>\n<p>${core}</p>\n` +
    `<h2>${H('Using the ' + b.name, 'How to use it')}</h2>\n<ol>\n${stepBodies.join('\n')}\n` +
    `<li>${read}</li>\n<li>${adjust}</li>\n</ol>\n` +
    `<h2>The formula behind the result</h2>\n<p>${formula}</p>\n${worked}\n` +
    `<h2>Understanding the result</h2>\n<p>${meaning}</p>\n` +
    `<h2>Where it helps</h2>\n<p>${uses}</p>\n` +
    `<h2>Common mistakes</h2>\n<p>${mistake}</p>\n<p><strong>Tip:</strong> ${tip}</p>\n` +
    `<h2>Assumptions and limitations</h2>\n<p>${limit}</p>\n` +
    `<h2>Why use this calculator</h2>\n<p>${why}</p>`;

  // ===== FAQs =====
  const coreFaq = pickU(P.core, 2, b.id + ':faq1a', poolB('faq-core', 35));
  const formulaFaq = pickU(P.formula, 3, b.id + ':faq2', poolB('faq-formula', 40));
  const limitFaq = pickU(P.limit, 4, b.id + ':faq4b', poolB('faq-limit', 30));
  const whyFaq = pickU(P.why, 5, b.id + ':faq1b', poolB('faq-why', 30));
  const usesFaq = pickU(P.uses, 6, b.id + ':faq5a', poolB('faq-uses', 40));
  const tipFaq = pickU(P.tip, 7, b.id + ':faq5b', poolB('faq-tip', 30));

  let vFormula = `${b.name} derives the ${b.metricRef} from the ${b.ui || 'inputs'} in a single pass, and the steps panel lists each operation`;
  // Only inject steps that look like computation lines (formula substitutions),
  // never prose-like step text ("generate 3 paragraphs of placeholder text").
  const calcSteps = b.steps.filter(s => /[=→:]|^step\s+\d+/i.test(s));
  if (calcSteps.length) vFormula = `the first steps are ${calcSteps.slice(0, 2).map(s => s.replace(/^Step\s+\d+:\s*/i, '').toLowerCase()).join(', then ')}`;

  const faqs = [
    { q: `What does the ${H(b.name, 'tool')} calculate?`, a: coreFaq + ' ' + whyFaq },
    { q: (b.metricRef && !b.lowerName.includes(b.metricRef)) ? `How is the ${b.metricRef} calculated?` : 'How is the result calculated?', a: `${vFormula.charAt(0).toUpperCase() + vFormula.slice(1)}. ` + formulaFaq },
    { q: `What do I need to use the ${b.name}?`, a: `${b.ui ? 'The ' + b.ui + ' it asks for' : 'The labeled inputs on the page'}, or the page defaults if you just want to see the calculation work. Each input maps directly to the formula, and changing any one of them recalculates the ${b.metricRef} instantly.` },
    { q: `What does the result from the ${H(b.name, 'tool')} mean?`, a: reg(`The main number the ${b.lowerName} returns is the ${b.metricRef} for your exact inputs, and the supporting figures and step list give it context.`, b.id + ':faq4a') + ' ' + limitFaq },
    { q: `When is the ${H(b.name, 'page')} most useful?`, a: usesFaq + ' ' + tipFaq }
  ];

  // ===== LSI terms (keyword-variant coverage without stuffing prose) =====
  const lsi = [];
  for (const kw of b.kwTokens) {
    if (lsi.length >= 6) break;
    if (/calculator$/.test(kw) && kw.split(/\s+/).length <= 2) { lsi.push(kw); continue; }
    if (/^(works offline|no sign ?up|unit conversions|daily use calculator|standard formula|estimate|compare scenarios|result breakdown|privacy first|export results|works on mobile|free online tool|instant calculation|step by step math|browser based|solve for|day count convention|interest only mortgage|interest only)$/.test(kw)) continue;
    lsi.push(kw);
  }
  for (const t of [`${b.subjectWords.slice(0, 3).join(' ')} formula`, `how to calculate ${b.subjectWords.slice(0, 2).join(' ')}`, `${b.metricRef} formula`]) {
    if (lsi.length >= 9) break;
    lsi.push(t);
  }

  return {
    title,
    metaDesc,
    canonicalPath: `/${b.catKey}/${b.id}`,
    cat: b.catKey,
    catName: b.catName,
    lsi,
    aeo,
    desc,
    faqs
  };
}

// ---------- build intros ----------
function buildIntro(b) {
  const { h } = b;
  const exLine = b.exPhrase
    ? pick([
        `With the default inputs it returns ${b.exPhrase} — you can verify the arithmetic instead of copying a bare number.`,
        `The page defaults already produce ${b.exPhrase}, so you can see a real worked result before typing anything.`,
        `Left on its defaults, the page computes ${b.exPhrase} and shows every step that produced it.`
      ], h, 20)
    : pick([
        'The result updates as you type, and the steps beneath it make the arithmetic auditable.',
        'Every keystroke recalculates the answer with the working displayed beside it.',
        'Enter your values and the result, along with its full derivation, appears immediately.'
      ], h, 20);
  const privacy = pick([
    'Everything runs locally in your browser: no uploads, no sign-up, and no tracking.',
    'The math runs entirely on your device — nothing you enter is sent anywhere.',
    'It is private by design: the calculation never leaves your browser.'
  ], h, 21);
  const howLine = b.ui
    ? pick([
        `The ${b.ui} accept your own values, and the guide below covers the formula, a worked example, and the assumptions behind the result.`,
        `Type into the ${b.ui} to replace the defaults; the sections below explain the method, the steps, and the limits of the calculation.`
      ], h, 22)
    : pick([
        'The guide below covers the formula, a worked example, and the assumptions behind the result.',
        'The sections below explain the method, the steps, and the limits of the calculation.'
      ], h, 22);
  const collection = pick([
    `It is part of the ${b.catName} collection on CalcProMaster.`,
    `It sits in the ${b.catName} collection alongside related tools.`
  ], h, 23);

  const intro = reg(
    `${b.name} calculates the ${b.metricRef} from the values you enter and shows every step of the working next to the result. ${exLine} ${privacy} ${howLine} ${collection}`,
    b.id + ':intro'
  );
  return intro;
}

// ---------- run ----------
const SEO = {};
const INTROS = {};
const failures = [];
let withExample = 0;

for (const tool of tools) {
  const b = deriveBundle(tool);
  if (b.calcOk && b.resultMain) withExample++;
  try {
    const m = buildEntry(b);
    const p = PREMIUM[tool.id];
    if (p && typeof p === 'object') {
      // Flagship merge: swap the generated guide body for the hand-written
      // deep-dive. FAQs are unioned (premium first — they are expert-level;
      // generated ones fill in any stems the article does not cover). The
      // article's `related` list is dropped (the page already renders Related
      // Calculators) and its short disclaimer is dropped (the page emits a
      // category-specific YMYL disclaimer).
      const article = Object.assign({}, p, { faqs: [], related: null, disclaimer: null });
      m.desc = PREMIUM.composeArticle(article);
      const seenQ = new Set((p.faqs || []).map(f => f.q));
      m.faqs = (p.faqs || []).concat((m.faqs || []).filter(f => !seenQ.has(f.q)));
      premiumMerged.push(tool.id);
    }
    SEO[tool.id] = m;
    INTROS[tool.id] = buildIntro(b);
  } catch (e) {
    failures.push(tool.id + ': ' + e.message.slice(0, 140));
  }
}
console.log('premium deep-dive merged: ' + premiumMerged.length + (premiumMerged.length ? ' (' + premiumMerged.join(', ') + ')' : ''));

console.log('worked examples computed: ' + withExample + '/' + tools.length);
if (failures.length) {
  console.error('FAILURES (' + failures.length + '):\n' + failures.slice(0, 20).join('\n'));
  process.exit(1);
}

// ---------- verification gates ----------
let errs = [];
for (const key of Object.keys(TITLE_OVERRIDES)) {
  if (!SEO[key]) errs.push(`title override key ${key}: no such entry`);
  else if (SEO[key].title !== TITLE_OVERRIDES[key]) errs.push(`title override ${key} NOT applied`);
}
const titles = new Set(), metas = new Set(), canons = new Set();
for (const [id, m] of Object.entries(SEO)) {
  if (!m.title || m.title.length > 60) errs.push(`${id}: title len ${m.title.length}`);
  if (/\(20\d\d\)\s*$/.test(m.title)) errs.push(`${id}: title has year suffix`);
  if (titles.has(m.title)) errs.push(`${id}: DUPLICATE TITLE ${m.title}`);
  titles.add(m.title);
  if (m.metaDesc.length < 90 || m.metaDesc.length > 160) errs.push(`${id}: meta len ${m.metaDesc.length}`);
  if (metas.has(m.metaDesc)) errs.push(`${id}: DUPLICATE META`);
  metas.add(m.metaDesc);
  if (m.canonicalPath !== `/${m.cat}/${id}`) errs.push(`${id}: canonical mismatch`);
  canons.add(m.canonicalPath);
  if (!Array.isArray(m.faqs) || m.faqs.length < 4) errs.push(`${id}: faqs < 4`);
  const strip = (x) => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = [m.aeo, m.desc, ...m.faqs.map(f => f.q + ' ' + f.a)].map(strip).join(' ').split(/\s+/).filter(Boolean).length;
  if (words < 500) errs.push(`${id}: thin (${words} words)`);
  const blob = JSON.stringify(m);
  for (const p of ['your  and', 'Entering  in', 'undefined', '[object', 'NaN']) {
    if (blob.includes(p)) errs.push(`${id}: artifact "${p}"`);
  }
  for (const f of m.faqs) {
    if (/<|>/.test(f.q) || /<|>/.test(f.a)) errs.push(`${id}: html in faq`);
  }
  // Premium pages carry hand-written expert FAQs with their own (valid) stems,
  // so the generated-stem requirement only applies to template pages.
  if (!premiumMerged.includes(id)) {
    const qs = m.faqs.map(f => f.q);
    if (!qs.some(q => /^How is the /.test(q)) || !qs.some(q => /^What do I need to use /.test(q)) || !qs.some(q => /^What does the result from /.test(q))) {
      errs.push(`${id}: faq format stems missing`);
    }
  }
}
// intros: length + uniqueness
const introSet = new Set();
for (const [id, s] of Object.entries(INTROS)) {
  const wc = s.split(/\s+/).length;
  if (wc < 55 || wc > 130) errs.push(`${id}: intro words ${wc}`);
  if (introSet.has(s)) errs.push(`${id}: DUPLICATE INTRO`);
  introSet.add(s);
}
if (errs.length) {
  console.error('GATE FAILURES (' + errs.length + '):\n' + errs.slice(0, 30).join('\n'));
  process.exit(1);
}

// ---------- write js/seo-content.js ----------
const today = new Date().toISOString().slice(0, 10);
const entries = Object.entries(SEO);
let out = `// Auto-generated SEO content for all CalcPro tools — v5 "human-pass" engine
// Generated: ${today} by scripts/seo-regen-v5.cjs
// Quality: real computed worked examples; natural titles/metas (no year suffixes);
// answer-first AEO blocks; no keyword-stuffing phrases; globally unique sentences.
var TOOL_SEO = {
`;
for (const [id, m] of entries) {
  out += `  '${id}': ${JSON.stringify(m)},\n`;
}
out += `};
if (typeof window !== 'undefined') { window.TOOL_SEO = TOOL_SEO; window.TOOL_CATEGORY = {}; }
if (typeof module !== 'undefined') module.exports = TOOL_SEO;
`;
fs.writeFileSync(OUT_SEO, out, 'utf8');
console.log('wrote js/seo-content.js (' + entries.length + ' entries, ' + (out.length / 1048576).toFixed(1) + ' MB, ' + premiumMerged.length + ' premium)');

// ---------- write js/tool-intros.js ----------
let iout = `// Auto-generated unique intro paragraphs — v5 engine (scripts/seo-regen-v5.cjs)
// Generated: ${today}. Every intro is unique; sentences avoid template-splice artifacts.
var TOOL_INTROS = {
`;
for (const [id, s] of Object.entries(INTROS)) {
  iout += `  '${id}': ${JSON.stringify(s)},\n`;
}
iout += `};
if (typeof module !== 'undefined' && module.exports) { module.exports = TOOL_INTROS; }
else if (typeof window !== 'undefined') { window.TOOL_INTROS = TOOL_INTROS; }
`;
fs.writeFileSync(OUT_INTROS, iout, 'utf8');
console.log('wrote js/tool-intros.js (' + Object.keys(INTROS).length + ' intros)');
console.log('global unique sentences: ' + seenSentences.size);
console.log('OK: all gates passed');
