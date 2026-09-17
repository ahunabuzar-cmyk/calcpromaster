// CALCPROMASTER — SEO content quality cleanup
// 1) metaDesc: remove "— standard," junk tokens, self-referential "using X calculator"
//    echoes, and em-dash sentence splices -> clean period-joined prose.
// 2) desc: drop the identical site-wide boilerplate tail ("The CalcPro Philosophy" +
//    "People searching for this tool often pair it with <lsi>" keyword line).
// Dry-run mode (default) prints samples; run with WRITE=1 to persist.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'js', 'seo-content.js');
const TOOL_SEO = require(OUT);
const ids = Object.keys(TOOL_SEO);

// Small deterministic token strips. NO case-insensitive flags: every replacement
// is anchored so it cannot swallow real verbs like "Estimate".
const JUNK_BEFORE_CAP = /[—–]\s*(?:math|you)\s+(?=[A-Z])/g; // "— math Private"
const STANDARD_TOK = /[—–]\s*standard,?\s*(?:verifiable\s+)?/g; // "— standard, "
const FILLER = /\s+using\s+(?:the\s+|a\s+)?[a-z0-9][a-z0-9 \-]{3,60}?(?:calculator|converter|estimator|tool)?\s*(?=[—–]|\.|$)/g;
const FILLER_NO_SEP = /\s+using\s+(?:the\s+|a\s+)?[a-z0-9][a-z0-9 \-]{3,60}?(?=\s*[A-Z])/g;
const TAIL_JOIN = /([a-z0-9%)])\s+(?=(?:Runs 100%|Instant, private|Accurate, step-by-step|Works on any device|Private by design|Your data never leaves|No sign-up needed))/g;
const AMP_FRAG = /\s&\s(?=[A-Z][a-z]+,\s)/g; // "mode & Instant, private"

function cleanMeta(d) {
  let s = d;
  s = s.replace(JUNK_BEFORE_CAP, ' — ');
  s = s.replace(TAIL_JOIN, '$1. ');
  s = s.replace(FILLER, ' ');
  s = s.replace(FILLER_NO_SEP, ' ');
  s = s.replace(STANDARD_TOK, ' — ');
  s = s.replace(AMP_FRAG, '. ');
  s = s.replace(/\s*[—–]\s*/g, ' — ');
  s = s.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').replace(/,\s*,/g, ',').replace(/\s+([.,])/g, '$1').trim();
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += '.';
  s = s.replace(/(?: — ){2,}/g, ' — ').replace(/^[—–]\s*/, '');
  return s;
}

function trimDescTail(desc) {
  let s = desc;
  const i = s.indexOf('<h2>The CalcPro Philosophy</h2>');
  if (i !== -1) s = s.slice(0, i);
  // kill any stray "pair it with <keywords>" keyword lines wherever they appear
  s = s.replace(/<p>People searching for this tool often pair it with[\s\S]*?<\/p>/g, '');
  return s;
}

const changedDesc = [];
const lenStats = { under110: 0, in110160: 0, over160: 0 };
const byId = {};
for (const id of ids) {
  const e = TOOL_SEO[id];
  const metaNew = cleanMeta(e.metaDesc);
  const descNew = trimDescTail(e.desc);
  const len = metaNew.length;
  if (len < 110) lenStats.under110++;
  else if (len <= 160) lenStats.in110160++;
  else lenStats.over160++;
  if (metaNew !== e.metaDesc) byId[id] = { old: e.metaDesc, metaNew };
  if (descNew !== e.desc) changedDesc.push(id);
  e.metaDesc = metaNew;
  e.desc = descNew;
}

console.log('entries:', ids.length);
console.log('metaDesc changed:', Object.keys(byId).length, '| desc tails trimmed:', changedDesc.length);
console.log('length distribution after clean — <110:', lenStats.under110, '| 110-160:', lenStats.in110160, '| >160:', lenStats.over160);
console.log('\n--- before/after samples ---');
let n = 0;
for (const [id, c] of Object.entries(byId)) {
  console.log('· ' + id);
  console.log('  OLD: ' + c.old);
  console.log('  NEW: ' + c.metaNew);
  if (++n >= 12) break;
}
console.log('\n--- desc tail trimmed sample (first 5) ---');
changedDesc.slice(0, 5).forEach((id) => console.log('  ' + id + ' (old tail ' + TOOL_SEO[id].desc.length + ' chars after) '));

if (process.env.WRITE === '1') {
  const lines = [
    '// Auto-generated SEO content for all CalcPro tools — Master 6-Block Blueprint',
    '// Generated: ' + new Date().toISOString().slice(0, 10),
    '// Quality pass: cleaned metaDesc splices; removed site-wide boilerplate tail.',
    'var TOOL_SEO = {'
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
