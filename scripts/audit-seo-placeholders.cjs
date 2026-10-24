#!/usr/bin/env node
// ============================================================
// CalcProMaster — SEO placeholder / machine-shape audit
// ------------------------------------------------------------
// The generated SEO copy has shipped several species of unfinished text.
// Each one was found by hand, one at a time; this script enumerates all of
// the known shapes in one pass so the next one cannot hide:
//
//   P1  "the undefined"          placeholder that never got filled
//   P3  "the page calculator"    placeholder designed for a page name that was absent
//   P4  "<X>: Value" titles      title template appended the primary input label
//   P5  "a between X" / "force units"/"a add"   result noun came from a raw label
//   P6  "cannot directly convert"           result label came from an error string
//   P7  a registry tool with no intro paragraph   (76 pages shipped that way)
//   P8  an intro whose opener does not fit the shape of that tool's `desc`
//       ("Need to customer acquisition cost?", "helps you cMU blocks needed…")
//   P9  an intro whose embedded phrase was cut at a hyphen or colon that belongs
//       to the description itself ("Working out per is easier with…")
//   P10 the same machine shapes in the copy that is NOT generated per tool:
//       74 guides, 7 blog posts, the homepage/about page, the hub copy modules
//       and the premium articles. Measured 2026-10-10: 0 hits — the class exists
//       so it cannot regress unnoticed.
//
// P5 is the largest class: the generator filled the "result noun" slot with a raw
// label string instead of prose. Fix: apply-seo-overrides.cjs → LABEL_REPAIRS.
// P7-P9 all live in the intro paragraph generator (generate-intros.js) and are
// asserted against that file's own verb list, so the two cannot drift apart.
//
// Output: data/seo-placeholder-audit.json  (+ console summary)
// Usage : node scripts/audit-seo-placeholders.cjs [--json]
// Exit 1 when any class is non-empty, so it can gate a build.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'js', 'seo-content.js');
// P10 reads the authored copy: guides/, blog/, the hub modules, premium articles.
const INTROS = path.join(ROOT, 'js', 'tool-intros.js');
const OUT = path.join(ROOT, 'data', 'seo-placeholder-audit.json');
const JSON_ONLY = process.argv.includes('--json');

// The intro generator is the single source of truth for which first words are
// action verbs and which sentence frames exist; importing it here keeps the audit
// from growing a second, stale copy of that list.
const { VERBS, descPhrase, loadAllTools } = require(path.join(ROOT, 'generate-intros.js'));
const VERB_KEYS = Object.keys(VERBS);

// Curated list of the exact raw shapes the generator emitted. Every one is
// ungrammatical English: the wrong article ("a add", "a hourly"), a bare unit
// code ("btufthf"), or the word "between" with an article and no objects
// ("a between length"). Written prose that uses "between" correctly ("convert
// between lux and foot-candles", "the difference between two dates") has no
// article in front of it, so the article test needs no unit list — and an
// enumerated list is exactly what let "a between length" slip through it.
// Exported so the built pages can be screened too.
//
// Note on scope: this pattern describes SEO *copy* defects. On a BUILT page it
// also sees the tool's own UI strings, and "Convert force units (N, kN, lbf)" is
// correct English that happens to contain "force units" — which is why the built
// page check in verify-seo-overrides.cjs runs against the SEO regions only.
const RAW_LABEL = /\b(?:a|an|the|any)\s+between\b|(?:\b(?:a|an|the|get|gets|got|works? out|returns?)\s+force units\b|\bforce units\s+(?:of\s+\d|formula))|(?:\b(?:a|an|the|get|gets|got|works? out|returns?)\s+data rates\b|\bdata rates\s+(?:of\s+\d|formula))|\bbtufthf\b|\b(?:a|the) concentration between\b|\bthe area between two\b|\barea between two formula\b|\ba hourly\b|\ba add\b|\ba currencies fixed\b|\ba gst amount\b|\bthe a\/b-series paper sizes\b|\bthe cooking measurements\b|(?:\b(?:a|an|the|get|gets|got|works? out|returns?)\s+hourly pediatric maintenance\b|\bhourly pediatric maintenance\s+(?:of\s+\d|formula))|\ba m\/s²|\ba radiation measurement\b|\ba fuel economy\b/;

// P3 shape. The defect is the placeholder standing where a *specific* calculator
// belongs — the shipped form was the FAQ stem "What does the page calculator
// do?", i.e. the phrase as the subject of a verb. The attributive use is correct
// English ("the page calculator layout", "more about the page calculator"), so a
// bare /the page calculator/ matched authored guide prose and reported a defect
// that was not there. Requiring a following verb keeps the real shape.
const PAGE_NAME_PLACEHOLDER = /\bthe page calculator\b(?=\s+(?:do|does|did|is|are|was|were|use|uses|used|work|works|help|helps|calculate|calculates|convert|converts|handle|handles|estimate|estimates|compute|computes|find|finds|let|lets)\b)/;

// Intro defects (P7-P9) are read from the generated paragraph, not from the SEO
// entry, so they are checked in auditIntros() below.
const INTRO_BAD_FRAME = new RegExp(
  '(?:turns the numbers behind|Working out|is built for|answer on) (' + VERB_KEYS.join('|') + ')\\b'
  + '|(?:helps you|Need to) (?!' + VERB_KEYS.join('|') + '\\b)'
  + '|\\?\\s+(?:is easier|is built|turns|helps)'
);

const CLASSES = [
  {
    key: 'P1 undefined placeholder',
    test: (entry) => /the undefined/.test(entry),
    fix: 'apply-seo-overrides.cjs → UNDEFINED_FIXES'
  },
  {
    key: 'P3 "the page calculator"',
    test: (entry) => PAGE_NAME_PLACEHOLDER.test(entry),
    fix: 'apply-seo-overrides.cjs → SHAPE_RESTORES'
  },
  {
    key: 'P4 title ends with a raw input label',
    // The generator appended the primary input's label to the title. The label
    // list covers every one it emitted (not just ": Value").
    test: (_, m) => /: (Value|Number|Amount|Between Polar|Weight)$/.test(m.title || ''),
    fix: 'apply-seo-overrides.cjs → LABEL_REPAIRS title'
  },
  {
    key: 'P5 result noun is a raw label ("a between X", "force units", "a add")',
    test: (entry) => RAW_LABEL.test(entry),
    fix: 'apply-seo-overrides.cjs → LABEL_REPAIRS'
  },
  {
    key: 'P6 result label is an error string',
    test: (entry) => /cannot directly convert/.test(entry),
    fix: 'needs hand-written meta/quick answer (per tool)'
  }
];

// P9 helper: the phrase must be a prefix of its own description, and whatever
// follows it there must not be an IN-TOKEN delimiter. "Calculate per-delivery
// cost" left the phrase "calculate per" sitting in front of a hyphen that the
// description needs — that is the defect. An intended cut ends on a spaced em
// dash or on a colon-plus-space ("Days cash is tied up: DIO + DSO"), so the
// character after the phrase is a space and nothing is flagged. Returns the
// phrase when it was cut inside a token, otherwise ''. Exported for its unit test.
function phraseCutAt(phrase, desc) {
  const text = String(phrase || '').split('?')[0].trim();
  if (!text) return '';
  const raw = String(desc || '').toLowerCase();
  const at = raw.indexOf(text.toLowerCase());
  if (at < 0) return '';
  const end = at + text.length;
  const next = raw.slice(end, end + 1);
  const prev = raw.slice(end - 1, end);
  const afterNext = raw.slice(end + 1, end + 2);
  if (next === '-' && prev !== ' ') return text;
  if (next === ':' && afterNext !== ' ') return text;
  if ((next === '—' || next === '–') && prev !== ' ') return text;
  return '';
}

// ---------- P10: the copy that is not generated per tool ----------
// Tool pages are generated from js/seo-content.js + js/tool-intros.js; guides,
// blog posts, hubs and premium articles are separate sources that were never
// screened. Only the label/placeholder shapes apply here: the intro FRAME checks
// assume every sentence came from generate-intros.js and flag correct prose in
// authored copy (the guide title "How Much You Need to Retire" matched the
// "Need to " + non-verb shape).
const SITE_COPY_FIXED = ['index.html', 'about.html', 'js/category-depth.js', 'js/category-hub.js', 'js/legal-pages.js'];
const SITE_SHAPES = {
  'raw result label': RAW_LABEL,
  'undefined placeholder': /the undefined/,
  'page-name placeholder': PAGE_NAME_PLACEHOLDER,
  'error string used as a label': /cannot directly convert/,
  'stringified object or NaN': /\[object [A-Za-z]+\]|\bNaN\b/
};

function siteCopyFiles() {
  const out = [];
  for (const rel of SITE_COPY_FIXED) if (fs.existsSync(path.join(ROOT, rel))) out.push(rel);
  for (const dir of ['guides', 'blog']) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).sort()) if (f.endsWith('.html')) out.push(dir + '/' + f);
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).sort()) {
    if (/^seo-premium.*\.js$/.test(f)) out.push('js/' + f);
  }
  return out;
}

function auditSiteCopy() {
  const files = siteCopyFiles();
  const pages = [];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const [shape, re] of Object.entries(SITE_SHAPES)) {
      const m = text.match(new RegExp(re.source, 'g'));
      if (m) pages.push({ path: rel, shape, hits: m.length, sample: String(m[0]).slice(0, 60) });
    }
  }
  return { files, pages };
}

function loadTools() {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox);
  return sandbox.window.TOOL_SEO || {};
}

function loadIntros() {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(INTROS, 'utf8'), sandbox);
  return sandbox.window.TOOL_INTROS || {};
}

// Intro defects. P7 compares the intro keys with the SEO entry keys (both must
// cover the registry); P8/P9 inspect the paragraph itself.
function auditIntros(seo) {
  const intros = loadIntros();
  const missing = Object.keys(seo).filter((id) => !String(intros[id] || '').trim());
  const badFrame = [];
  const cut = [];
  for (const [id, s] of Object.entries(intros)) {
    if (INTRO_BAD_FRAME.test(s)) badFrame.push({ id, intro: s.slice(0, 120) });
  }
  // The doubled verb form can only be judged against a tool's OWN description:
  // "Working out calculating fuel cost" is wrong, "Working out planning cost
  // estimate" is a topic phrase that merely looks like a gerund.
  for (const t of loadAllTools()) {
    const s = String(intros[t.id] || '');
    const p = descPhrase(t);
    if (p.kind === 'action' && s.includes('Working out ' + p.np.split(' ')[0])) {
      badFrame.push({ id: t.id, intro: s.slice(0, 120) });
    }
  }
  for (const t of loadAllTools()) {
    const phrase = descPhrase(t);
    const hit = phraseCutAt(phrase.vp || phrase.np, t.desc);
    if (hit) cut.push({ id: t.id, phrase: hit, desc: t.desc });
  }
  return {
    'P7 registry tool has no intro paragraph': { count: missing.length, fix: 'run node generate-intros.js', pages: missing },
    'P8 intro opener does not fit the description shape': { count: badFrame.length, fix: 'generate-intros.js → VERBS / OPENERS', pages: badFrame },
    'P9 phrase cut inside the description (hyphen/colon)': { count: cut.length, fix: 'generate-intros.js → descPhrase head rules', pages: cut }
  };
}

function audit() {
  const TOOL_SEO = loadTools();
  const report = { ranAt: new Date().toISOString(), totalTools: Object.keys(TOOL_SEO).length, classes: {} };
  for (const c of CLASSES) {
    const ids = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const entry = JSON.stringify(m);
      let hit = false;
      try { hit = c.test(entry, m); } catch (e) { hit = false; }
      if (hit) ids.push({ id, path: m.canonicalPath, title: m.title });
    }
    report.classes[c.key] = { count: ids.length, fix: c.fix, pages: ids };
  }
  Object.assign(report.classes, auditIntros(TOOL_SEO));
  const site = auditSiteCopy();
  report.classes['P10 machine shapes in guide/hub/blog/premium copy'] = {
    count: site.pages.length,
    fix: 'edit the offending source file; tool labels go through apply-seo-overrides.cjs',
    files: site.files.length,
    pages: site.pages
  };
  report.registryTools = loadAllTools().length;
  report.siteCopyFiles = site.files.length;
  report.totalFindings = Object.values(report.classes).reduce((n, c) => n + c.count, 0);
  return report;
}

if (require.main === module) {
  const report = audit();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  if (!JSON_ONLY) {
    console.log('==========================================');
    console.log(' SEO PLACEHOLDER / MACHINE-SHAPE AUDIT');
    console.log('==========================================');
    console.log('tools scanned : ' + report.totalTools + '  (registry: ' + report.registryTools + ')');
    console.log('site copy     : ' + report.siteCopyFiles + ' guide/blog/hub/premium files');
    console.log('');
    for (const [key, c] of Object.entries(report.classes)) {
      const mark = c.count === 0 ? '✔' : '✖';
      console.log(mark + ' ' + String(c.count).padStart(5) + '  ' + key);
      if (c.count) console.log('        fix: ' + c.fix);
      if (c.count && c.count <= 10) c.pages.forEach((p) => console.log('          · ' + (p.path || p.id) + '  (' + (p.shape || p.title || p.phrase || p.intro || '') + ')'));
    }
    console.log('');
    console.log('total findings: ' + report.totalFindings + '  →  data/seo-placeholder-audit.json');
  }
  process.exit(report.totalFindings ? 1 : 0);
}

module.exports = { CLASSES, RAW_LABEL, SITE_SHAPES, INTRO_BAD_FRAME, PAGE_NAME_PLACEHOLDER, audit, auditIntros, auditSiteCopy, siteCopyFiles, phraseCutAt, loadTools, loadIntros };
