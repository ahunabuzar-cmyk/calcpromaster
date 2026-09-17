// ============================================================
// CalcProMaster — FORMULA REVIEW CHECKLIST GENERATOR
//
// Phase 1+2 of the release pass: produce a durable, prioritized
// human-review checklist for every calculator that does NOT yet
// have an independent known-answer contract, plus a machine-
// readable QA contract skeleton for the whole registry.
//
// Statuses:
//   PASS               — has an independent known-answer test (CASES
//                        block) OR a structural property test (PROPERTY
//                        QA block) in tests/unit/formula-qa-full.test.js
//   NEEDS HUMAN REVIEW — smoke-tested only; a person must confirm
//                        the formula/units/edge cases (never PASS
//                        without evidence)
//   NOT APPLICABLE     — special tool with no standard formula contract
//                        (e.g. async live-rate currency converter, custom
//                        scientific calculator UI)
//
// Outputs:
//   docs/formula-review-checklist.md  (prioritized human checklist)
//   docs/qa-contracts.json            (machine-readable contract skeleton)
//
// Priority order: 1) deep-QA-covered (PASS)  2) finance+health (YMYL)
// 3) every other category.
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT_MD = path.join(ROOT, 'docs', 'formula-review-checklist.md');
const OUT_JSON = path.join(ROOT, 'docs', 'qa-contracts.json');

// Category display name overrides (file name → UI label)
const CAT_LABEL = {
  'auto-transport': 'Auto & Transport',
  'career-freelance': 'Career & Freelance',
  'conversion': 'Conversion',
  'food-nutrition': 'Food & Nutrition',
  'fitness-exercise': 'Fitness & Exercise',
  'home-garden': 'Home & Garden',
  'lifestyle': 'Lifestyle & Home',
  'parenting-family': 'Parenting & Family',
  'regional': 'Regional (India/PK/UAE)',
  'tech-digital': 'Tech & Digital',
  'health': 'Health & Fitness',
};

// ---- registry count (mirrors sync-counts.cjs) ----
function registry() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.js'));
  const tools = [];
  for (const file of files) {
    const cat = file.replace(/\.js$/, '');
    const mod = require(path.join(DATA_DIR, file));
    const arr = Array.isArray(mod) ? mod : [];
    for (const t of arr) {
      tools.push({ ...t, category: CAT_LABEL[cat] || cat, catFile: cat });
    }
  }
  return tools;
}

// ---- which calculators have independent known-answer tests ----
// Covers BOTH the deterministic CASES matrix and the structural
// PROPERTY QA block (non-deterministic tools like random generators).
function deepQACovered() {
  const src = fs.readFileSync(path.join(ROOT, 'tests', 'unit', 'formula-qa-full.test.js'), 'utf8');
  const ids = new Set();
  const block = src.match(/const CASES = \[([\s\S]*?)\n\];/);
  if (block) {
    for (const line of block[1].split('\n')) {
      // matches both single- and double-quoted entries
      const m = line.match(/\[["']([a-z0-9-]+)["'],\s*["']([a-z0-9-]+)["']/);
      if (m) ids.add(m[2]);
    }
  }
  const props = src.match(/describe\('PROPERTY QA[\s\S]*?\n\}\);/);
  if (props) {
    for (const line of props[0].split('\n')) {
      // matches calcResult(...) and calcFull(...) invocations
      const m = line.match(/calc(?:Result|Full)\('([a-z0-9-]+)', '([a-z0-9-]+)'/);
      if (m) ids.add(m[2]);
    }
  }
  return ids;
}

// ---- special tools with no standard formula contract ----
// async live-rate converter + custom-UI scientific calculator: a fixed
// known-answer formula test is not applicable; verified by smoke/e2e.
const NOT_APPLICABLE = new Set(['currency-converter', 'scientific']);

// ---- extract input summary + formula source hint ----
function summarizeInputs(tool) {
  if (!Array.isArray(tool.inputs)) return '—';
  return tool.inputs
    .map((i) => {
      const slider = i.slider ? ` [slider ${i.slider.min}–${i.slider.max}]` : '';
      return `${i.label || i.id} (${i.type}${slider})`;
    })
    .join('; ');
}

function formulaHint(tool) {
  if (typeof tool.calc !== 'function') return 'custom/no calc fn';
  const src = tool.calc.toString().replace(/\s+/g, ' ').slice(0, 140);
  return src;
}

const YMYL = new Set(['Finance', 'Health & Fitness', 'Food & Nutrition', 'Fitness & Exercise', 'Parenting & Family', 'Regional (India/PK/UAE)']);

function main() {
  const tools = registry();
  const covered = deepQACovered();
  let pass = 0, review = 0, na = 0;
  const rows = tools.map((t) => {
    let status;
    if (NOT_APPLICABLE.has(t.id)) { status = 'NOT APPLICABLE'; na++; }
    else if (covered.has(t.id)) { status = 'PASS'; pass++; }
    else { status = 'NEEDS HUMAN REVIEW'; review++; }
    const route = `/${t.catFile}/${t.id}`;
    return {
      id: t.id, name: t.name, category: t.category, route,
      inputs: summarizeInputs(t), formula: formulaHint(t),
      status,
    };
  });

  // Priority sort: PASS first, then YMYL, then alpha by category/name.
  const priority = (r) => (r.status === 'PASS' ? 0 : YMYL.has(r.category) ? 1 : 2);
  rows.sort((a, b) => priority(a) - priority(b) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  // ---- Markdown checklist ----
  const md = [];
  md.push('# CalcProMaster — Formula Review Checklist');
  md.push('');
  md.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push(`Total calculators: **${rows.length}**`);
  md.push('');
  md.push(`- **PASS** (independent known-answer or property test): **${pass}**`);
  md.push(`- **NEEDS HUMAN REVIEW** (smoke-tested only): **${review}**`);
  md.push(`- **NOT APPLICABLE** (special tool, no formula contract): **${na}**`);
  md.push('');
  md.push('> Statuses are NEVER marked PASS without evidence. A calculator only leaves');
  md.push('> NEEDS HUMAN REVIEW once a person has confirmed formula, units, signs,');
  md.push('> rounding, boundary/zero behavior and recorded it as a test case in');
  md.push('> `tests/unit/formula-qa-full.test.js` (the automated contract runner).');
  md.push('> Non-deterministic tools (random generators, UUIDs) are verified by');
  md.push('> structural PROPERTY QA (count/length/charset/range invariants).');
  md.push('');
  md.push('Priority: deep-QA PASS first, then YMYL (finance/health) calculators, then the rest.');
  md.push('');

  // ---- Remaining-review tracker (durable progress, derived from tests) ----
  const catAgg = {};
  rows.forEach((r) => {
    const c = r.category;
    catAgg[c] = catAgg[c] || { total: 0, pass: 0, review: 0, na: 0 };
    catAgg[c].total++;
    if (r.status === 'PASS') catAgg[c].pass++;
    else if (r.status === 'NEEDS HUMAN REVIEW') catAgg[c].review++;
    else catAgg[c].na++;
  });
  const catNames = Object.keys(catAgg).sort((a, b) => catAgg[b].review - catAgg[a].review || a.localeCompare(b));
  const remaining = rows.filter((r) => r.status === 'NEEDS HUMAN REVIEW');
  const nextBatch = remaining.slice(0, 15);

  md.push('## 📊 Remaining Review Tracker');
  md.push('');
  md.push(`**Progress: ${pass}/${rows.length - na} reviewable PASS (${Math.round((pass / (rows.length - na)) * 100)}%)** — ${review} NEED HUMAN REVIEW, ${na} NOT APPLICABLE (no formula contract).`);
  md.push('');
  md.push('> How to record a review: verify formula / units / signs / rounding / boundary / zero behavior,');
  md.push('> add an independent known-answer case to `tests/unit/formula-qa-full.test.js`, re-run `npx vitest run`,');
  md.push('> then regenerate this checklist. The tracker never goes stale: PASS count is derived from the');
  md.push('> automated test suite, not a hand-edited spreadsheet.');
  md.push('');
  md.push('### Remaining by category (highest remaining first)');
  md.push('');
  md.push('| Category | Total | PASS | NEEDS REVIEW | N/A |');
  md.push('|----------|------:|-----:|-------------:|----:|');
  catNames.forEach((c) => {
    md.push(`| ${c} | ${catAgg[c].total} | ${catAgg[c].pass} | ${catAgg[c].review} | ${catAgg[c].na} |`);
  });
  md.push('');
  md.push(`### Next recommended batch (top ${nextBatch.length} NEEDS HUMAN REVIEW, YMYL-first)`);
  md.push('');
  md.push('| # | Category | Tool | Route |');
  md.push('|---|----------|------|-------|');
  nextBatch.forEach((r, i) => {
    const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
    md.push(`| ${i + 1} | ${r.category} | ${esc(r.name)} | ${r.route} |`);
  });
  md.push('');
  md.push('| # | Status | Category | Tool | Route | Inputs | Formula (source hint) |');
  md.push('|---|--------|----------|------|-------|--------|-----------------------|');
  rows.forEach((r, i) => {
    const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
    md.push(`| ${i + 1} | ${r.status} | ${r.category} | ${esc(r.name)} | ${r.route} | ${esc(r.inputs)} | \`${esc(r.formula)}\` |`);
  });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_MD, md.join('\n'), 'utf8');

  // ---- Machine-readable contracts ----
  const contracts = rows.map((r) => ({
    calculatorId: r.id, name: r.name, category: r.category, route: r.route,
    inputs: r.inputs, formula: r.formula,
    verificationStatus: r.status,
    knownAnswerTestCases: r.status === 'PASS' ? 'SEE tests/unit/formula-qa-full.test.js' : 'NONE',
    reviewer: null, notes: '',
  }));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generated: new Date().toISOString(), count: contracts.length, contracts }, null, 2), 'utf8');

  // ---- Machine-readable tracker (durable progress) ----
  // Progress is measured against reviewable tools only (N/A tools have no
  // formula contract, so they are neither PASS nor REVIEW).
  const reviewable = rows.length - na;
  const pct = reviewable > 0 ? Math.round((pass / reviewable) * 100) : 0;
  fs.writeFileSync(path.join(ROOT, 'docs', 'review-tracker.json'),
    JSON.stringify({
      generated: new Date().toISOString(),
      total: rows.length, pass, needsReview: review, notApplicable: na,
      reviewable,
      progressPct: pct,
      remainingByCategory: catNames.map((c) => ({ category: c, ...catAgg[c] })),
      nextBatch: nextBatch.map((r) => ({ id: r.id, name: r.name, category: r.category, route: r.route })),
    }, null, 2), 'utf8');

  console.log(`Checklist: ${pass} PASS, ${review} NEEDS HUMAN REVIEW, ${na} NOT APPLICABLE (total ${rows.length})`);
  console.log(`Tracker: ${pct}% of reviewable (${reviewable}) PASS | next batch: ${nextBatch.map((r) => r.id).join(', ')}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log('Wrote docs/review-tracker.json');
  console.log(`\nTop 12 NEEDS HUMAN REVIEW (YMYL first):`);
  rows.filter((r) => r.status === 'NEEDS HUMAN REVIEW').slice(0, 12).forEach((r) => {
    console.log(`  · [${r.category}] ${r.name} → ${r.route}`);
  });
}

main();
