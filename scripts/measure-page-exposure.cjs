#!/usr/bin/env node
// ============================================================
// CalcProMaster — Page exposure ("ek page move hua" ko naapna)
// ------------------------------------------------------------
// QUERY-REACH.md §5 ke do action hain: `write` (section likho) aur `expose`
// (section pehle se hai, magar copy mein itna neeche dabi hai ke crawler aur
// user dono usay late dekhte hain). `write` ka proof seedha hai — bucket
// missing se present ho gaya. `expose` ka proof depth hai:
//
//   depth      = page ke visible text mein us bucket ki *pehli* mention tak
//                kitne words hain (1-based word offset)
//   depthShare = depth ÷ page ke total words
//
// To cheezein measure hoti hain, dono deterministic aur offline (network nahi):
//
//   1. COVERAGE DELTA — `withEnhance` vs `withoutEnhance`. Enhance card ko
//      page se hata kar wahi instrument dobara chalta hai, is liye pata chalta
//      hai ke us section ne kaun sa bucket 0 → present kiya. Ye "before" ko
//      reconstruct karne ka imaandar tareeqa hai (koi andaaza nahi).
//   2. EXPOSURE DELTA — `--snapshot` se pehle ka depth save karo, change ke
//      baad `--compare` se delta nikalo. Section upar aaya? to depth kam
//      (chhota) hona chahiye.
//
// CONVENTION (project ka apna, Google ka rule nahi): ek bucket `exposed` mana
// jata hai jab uska pehla zikr visible text ke pehle EXPOSE_SHARE hisse mein ho
// (default 35%). Isse aage wo section un readers ke liye practically hidden hai
// jo page scroll kar ke nahi jaate — aur prerender mein Google bhi wahi order
// padhta hai.
//
// Output: data/page-exposure-baseline.json (--snapshot)
//         docs/PAGE-EXPOSURE-PROOF.md        (--compare)
// Usage : node scripts/measure-page-exposure.cjs [--snapshot] [--compare]
//         [--top 12] [--paths /a,/b] [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const qr = require('./build-query-reach.cjs');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'data', 'query-reach.json');
const JOIN_FILE = path.join(ROOT, 'data', 'gsc-query-page.json');
const SNAP_FILE = path.join(ROOT, 'data', 'page-exposure-baseline.json');
const CHANGES_FILE = path.join(ROOT, 'data', 'page-exposure-changes.json');
const OUT_DOC = path.join(ROOT, 'docs', 'PAGE-EXPOSURE-PROOF.md');

// Pehle 35% visible text = exposed. Ye threshold ek convention hai, is liye ise
// doc mein likha jata hai — chupke se badalne wali cheez nahi.
const EXPOSE_SHARE = 0.35;

// Har bucket ki *wording* (jo user/crawler padhta hai). `table` ka signal raw
// HTML hai (page par asli table honi chahiye), baqi visible text par.
const EXPOSURE_WORDS = {
  question: /\b(how|what|why|when|which)\b/,
  formula: /\b(formula|equation|method)\b/,
  example: /\b(example|worked example|sample|for instance)\b/,
  comparison: /(\bvs\b|versus|compare|comparison|compared with)/,
  modifier: /\b(free|no signup|no login|accurate|exact|instant)\b/,
  period: /\b(daily|monthly|annual|yearly|per month|per year|per day)\b/,
  region: /\b(uk|usa|canada|australia|india|europe|2025|2026|2027)\b/,
};

// ---------- pure helpers (unit-tested) ----------

// Word offset of a character index: kitne words is index se pehle hain. Ye
// "page par section kitna neeche hai" ko ek number bana deta hai.
function wordOffset(text, charIndex) {
  if (charIndex === null || charIndex === undefined || charIndex < 0) return null;
  const before = String(text).slice(0, charIndex).trim();
  if (!before) return 0;
  return before.split(/\s+/).length;
}

// Visible text mein pehli match ka word offset. Kuch match na ho to null —
// jhooti depth kabhi nahi.
function firstMentionOffset(text, re) {
  if (!re) return null;
  const m = re.exec(text);
  return m ? wordOffset(text, m.index) : null;
}

// Raw HTML par match hone wali signal (jaise <table>) ka word offset: match se
// pehle ka hissa visible text bana kar words gin lo.
function rawSignalWordOffset(html, re) {
  const idx = String(html || '').search(re);
  if (idx < 0) return null;
  const prefix = qr.visibleText(html.slice(0, idx)).trim();
  return prefix ? prefix.split(/\s+/).length : 0;
}

// SSG prerender ka enhancement card nikal do — balanced <div> walk, is liye
// nested markup ho to bhi ghalat jagah nahi katta. Card mila hi nahi to wahi
// HTML wapas, `removed:false` ke saath (chup-chaap kuch nahi hatta).
function stripEnhanceCard(html, marker = '<div class="explain-card tool-enhance">') {
  const start = String(html).indexOf(marker);
  if (start < 0) return { html, removed: false, removedHtml: '' };
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') {
      depth -= 1;
      if (depth === 0) {
        const end = m.index + m[0].length;
        return { html: html.slice(0, start) + html.slice(end), removed: true, removedHtml: html.slice(start, end) };
      }
    } else {
      depth += 1;
    }
  }
  return { html, removed: false, removedHtml: '' };
}

// Ek page ke do versions ka pura exposure picture.
function measureExposure(html) {
  const raw = String(html || '');
  const text = qr.visibleText(raw);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const cov = qr.contentCoverage(raw);

  // table ka signal raw HTML par hai, is liye uska offset alag se nikalta hai.
  const tableOffset = rawSignalWordOffset(raw, /<table[\s>]/i);

  const faqOffset = firstMentionOffset(text, /frequently asked questions/);

  const depths = {};
  for (const b of qr.INTENT_BUCKETS) {
    depths[b.key] = b.key === 'table' ? tableOffset : firstMentionOffset(text, EXPOSURE_WORDS[b.key]);
  }

  const depthShare = {};
  const exposed = [];
  const buried = [];
  for (const [k, d] of Object.entries(depths)) {
    const share = d !== null && words ? +(d / words).toFixed(3) : null;
    depthShare[k] = share;
    if (d === null) continue;
    (share <= EXPOSE_SHARE ? exposed : buried).push(k);
  }

  return {
    words,
    coverage: cov.coverage,
    missing: cov.missing.map((m) => m.key),
    present: cov.present.map((p) => p.key),
    depths,
    depthShare,
    exposed,
    buried,
    tableCount: (raw.match(/<table[\s>]/gi) || []).length,
    firstTableOffset: tableOffset,
    faqOffset,
    enhancements: (raw.match(/explain-card tool-enhance/g) || []).length,
  };
}

// Page ka "with enhancement" aur "without enhancement" dono naapo.
function measurePage(html) {
  const withEnhance = measureExposure(html);
  const stripped = stripEnhanceCard(html);
  const withoutEnhance = measureExposure(stripped.html);
  return { withEnhance, withoutEnhance, enhanceRemoved: stripped.removed, stripped };
}

// Snapshot vs current: per page per bucket depth delta.
function compareExposure(before, after) {
  const rows = [];
  for (const page of Object.keys(after.pages)) {
    const b = before.pages[page];
    const a = after.pages[page];
    if (!b) { rows.push({ path: page, status: 'added' }); continue; }
    const buckets = [];
    for (const key of Object.keys(a.withEnhance.depths)) {
      const bd = b.withEnhance.depths[key];
      const ad = a.withEnhance.depths[key];
      const bShare = b.withEnhance.depthShare[key];
      const aShare = a.withEnhance.depthShare[key];
      let status = 'same';
      if (bd === null && ad !== null) status = 'appeared';
      else if (bd !== null && ad === null) status = 'disappeared';
      else if (bd !== null && ad !== null && ad < bd) status = 'moved-up';
      else if (bd !== null && ad !== null && ad > bd) status = 'moved-down';
      buckets.push({
        key,
        beforeDepth: bd, afterDepth: ad,
        beforeShare: bShare, afterShare: aShare,
        deltaWords: bd !== null && ad !== null ? ad - bd : null,
        status,
      });
    }
    rows.push({
      path: page,
      status: 'compared',
      wordsBefore: b.withEnhance.words,
      wordsAfter: a.withEnhance.words,
      coverageBefore: b.withEnhance.coverage,
      coverageAfter: a.withEnhance.coverage,
      buckets,
      movedUp: buckets.filter((x) => x.status === 'moved-up').length,
      appeared: buckets.filter((x) => x.status === 'appeared').length,
      movedDown: buckets.filter((x) => x.status === 'moved-down').length,
    });
  }
  return rows;
}

module.exports = {
  EXPOSE_SHARE,
  EXPOSURE_WORDS,
  wordOffset,
  firstMentionOffset,
  rawSignalWordOffset,
  stripEnhanceCard,
  measureExposure,
  measurePage,
  compareExposure,
};

// ---------- CLI ----------

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : dflt;
};

// Har change ka apna before/after chahiye hota hai. Ek hi baseline file par
// dobara snapshot lena pichhle proof ko mitata hai, is liye `--baseline <file>`
// se naam diya ja sakta hai:
//   node scripts/measure-page-exposure.cjs --snapshot --baseline data/x.json  (change se pehle)
//   node scripts/measure-page-exposure.cjs --compare  --baseline data/x.json  (change ke baad)
// Default wahi purani file rehti hai, is liye flag ke bina kuch nahi badalta.
const strArgs = (name, dflt = []) => {
  const out = [];
  process.argv.forEach((a, i) => {
    if (a !== name) return;
    const v = process.argv[i + 1];
    if (!v || v.startsWith('--')) {
      console.error(`${name} ke baad file path chahiye (mila: ${v === undefined ? 'kuch nahi' : v})`);
      process.exit(2);
    }
    out.push(v);
  });
  return out.length ? out : dflt;
};

const md = (s) => '\u0060' + s + '\u0060';
const fmtPct = (x) => (x === null || x === undefined ? '—' : (x * 100).toFixed(1) + '%');

function readPageHtml(relPath) {
  const base = path.join(ROOT, 'deploy', relPath.replace(/^\//, ''));
  for (const cand of [path.join(base, 'index.html'), base + '.html']) {
    if (fs.existsSync(cand)) return fs.readFileSync(cand, 'utf8');
  }
  return null;
}

// Kaun se pages? Default: query-reach ka backlog (top priority pehle).
function selectPages(top, explicit) {
  if (explicit && explicit.length) return explicit;
  const backlog = fs.existsSync(OUT_JSON)
    ? (JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')).backlog || [])
    : [];
  return backlog.slice(0, top).map((b) => b.path);
}

function querySideByPath() {
  if (!fs.existsSync(JOIN_FILE)) return new Map();
  const join = JSON.parse(fs.readFileSync(JOIN_FILE, 'utf8'));
  const byPath = qr.groupPairsByPath(join.pairs || []);
  const out = new Map();
  for (const [p, entry] of byPath) {
    const reach = qr.pageReach(entry);
    const cov = qr.intentCoverage(reach.queries);
    out.set(p, {
      distinctQueries: reach.distinctQueries,
      impressions: reach.impressions,
      queryCoverage: cov.coverage,
      queryMissing: cov.missing.map((m) => m.key),
      queries: reach.queries,
    });
  }
  return out;
}

function currentSnapshot(paths) {
  const pages = {};
  const missingHtml = [];
  for (const p of paths) {
    const html = readPageHtml(p);
    if (html === null) { missingHtml.push(p); continue; }
    const m = measurePage(html);
    pages[p] = {
      withEnhance: m.withEnhance,
      withoutEnhance: m.withoutEnhance,
      enhanceRemoved: m.enhanceRemoved,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    exposeShare: EXPOSE_SHARE,
    pages,
    missingHtml,
  };
}

function buildDoc(report) {
  const L = [];
  L.push('# Page exposure proof — "ek page move hua" ka evidence');
  L.push('');
  L.push(`> Auto-generated by \`node scripts/measure-page-exposure.cjs --compare\` · baseline: \`${report.baselineFile || 'data/page-exposure-baseline.json'}\` (${report.baselineAt}).`);
  L.push('> Ye **content-side** proof hai: jo HTML crawler ko milta hai usme section ki jagah naapi gayi hai. Ranking/clicks ka proof is doc se nahi aata — wo GSC ka kaam hai aur waqt leta hai (`docs/QUERY-REACH.md` §1).');
  L.push('');
  if (report.changes.length) {
    L.push('## 1. Kya badla (aur kyun)');
    L.push('');
    for (const c of report.changes) {
      L.push(`### ${c.title}`);
      L.push('');
      L.push(`- **Date:** ${c.date} · **Files:** ${c.files.map((f) => md(f)).join(', ')}`);
      L.push(`- **Kyun:** ${c.why}`);
      L.push(`- **Measured:** ${c.measured}`);
      if (c.tradeoff) L.push(`- **Trade-off (chhupaya nahi):** ${c.tradeoff}`);
      L.push('');
    }
  }
  L.push('## ' + (report.changes.length ? '2' : '1') + '. Do tarah ka proof, do alag sawal');
  L.push('');
  L.push('| Proof | Sawal | Kaise naapa |');
  L.push('|---|---|---|');
  L.push('| **Coverage delta** | section ne koi bucket banaya? | wahi page, enhancement card ke saath vs bina (`withoutEnhance`), ek hi build par |');
  L.push('| **Exposure delta** | section pehle se tha, upar aaya? | snapshot (change se pehle) vs aaj, per-bucket word depth |');
  L.push('');
  L.push(`Depth convention: bucket **exposed** hai jab uska pehla zikr visible text ke pehle **${fmtPct(report.exposeShare)}** mein ho. Ye project ki apni threshold hai (\`EXPOSE_SHARE\`), Google ka rule nahi.`);
  L.push('');
  L.push('## 3. Coverage delta — section ka apna asar');
  L.push('');
  L.push('| Path | Words | Coverage (bina enhancement) | Coverage (enhancement ke saath) | Buckets jo section banata hai |');
  L.push('|---|---|---|---|---|');
  for (const row of report.coverageRows) {
    L.push(`| ${md(row.path)} | ${row.words} | ${fmtPct(row.without)} | **${fmtPct(row.with)}** | ${row.gained.map((g) => report.label(g)).join(', ') || '—'} |`);
  }
  L.push('');
  L.push('## 4. Exposure delta — snapshot vs aaj');
  L.push('');
  // Har change ka apna baseline: ek table per baseline file, warna naya change
  // purane proof ko overwrite kar deta hai.
  for (const cmp of report.compares) {
    L.push(`### baseline: ${md(cmp.file)} (${cmp.at})`);
    L.push('');
    if (!cmp.rows.length) {
      L.push('_Is baseline mein koi page nahi mila — `--snapshot` isi file par chalaya gaya tha?_');
      L.push('');
      continue;
    }
    L.push('| Path | Bucket | Depth before | Depth after | Δ words | Status |');
    L.push('|---|---|---|---|---|---|');
    for (const row of cmp.rows) {
      if (row.status !== 'compared') { L.push(`| ${md(row.path)} | — | — | — | — | ${row.status} |`); continue; }
      for (const b of row.buckets) {
        if (b.status === 'same' && b.beforeDepth === null) continue;
        const delta = b.deltaWords === null ? '—' : (b.deltaWords > 0 ? '+' + b.deltaWords : String(b.deltaWords));
        L.push(`| ${md(row.path)} | ${report.label(b.key)} | ${b.beforeDepth === null ? '—' : b.beforeDepth} (${fmtPct(b.beforeShare)}) | ${b.afterDepth === null ? '—' : b.afterDepth} (${fmtPct(b.afterShare)}) | ${delta} | ${b.status === 'same' ? 'same' : '**' + b.status + '**'} |`);
      }
    }
    L.push('');
  }
  L.push('');
  L.push('## 5. Aaj ki haalat (priority pages)');
  L.push('');
  L.push('| Path | Queries | Impr | Action | Buckets buried (depth > ' + fmtPct(EXPOSE_SHARE) + ') | Buckets exposed |');
  L.push('|---|---|---|---|---|---|');
  for (const row of report.current) {
    L.push(`| ${md(row.path)} | ${row.distinctQueries} | ${row.impressions} | ${row.action} | ${row.buried.map((k) => report.label(k)).join(', ') || '—'} | ${row.exposed.map((k) => report.label(k)).join(', ') || '—'} |`);
  }
  L.push('');
  L.push('## 6. Ye kya prove NAHI karta');
  L.push('');
  L.push('- Ranking, clicks, CTR ya position mein koi tabdeeli. Wo sirf GSC ke fresh export se, aur kuch hafton baad, dikhega.');
  L.push('- Ke exposure badhane se impressions barhenge. Ye ek **mechanism** hai (content upar = crawler aur user dono tak pohanchta hai), nateeja nahi.');
  L.push('- Ke har page ka exposure number uski quality batata hai. Table hona aur table ka *kaam ka* hona alag cheez hai.');
  L.push('');
  L.push('## 7. Reproduce');
  L.push('');    L.push('```bash');
    L.push('node build-deploy.js                                          # deploy/ refresh (measurement deploy/ padhta hai)');
    L.push('node scripts/measure-page-exposure.cjs --snapshot --top 25 \\');
    L.push('  --baseline data/page-exposure-baseline-<change>.json        # change se PEHLE');
    L.push('node scripts/measure-page-exposure.cjs --compare --top 25 \\');
    L.push('  --baseline data/page-exposure-baseline.json \\              # purane changes ke delta bhi');
    L.push('  --baseline data/page-exposure-baseline-<change>.json        # change ke baad → ye doc');
    L.push('```');
  L.push('');
  return L.join('\n');
}

function main() {
  const top = arg('--top', 12);
  const baselineFiles = strArgs('--baseline', [SNAP_FILE]);
  const snapFile = baselineFiles[0];
  const pathsArg = process.argv.includes('--paths')
    ? process.argv[process.argv.indexOf('--paths') + 1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const paths = selectPages(top, pathsArg);
  const snap = currentSnapshot(paths);
  const join = querySideByPath();

  if (process.argv.includes('--snapshot')) {
    fs.writeFileSync(snapFile, JSON.stringify(snap, null, 2) + '\n');
    console.log(`exposure snapshot: ${Object.keys(snap.pages).length} pages → ${path.relative(ROOT, snapFile).replace(/\\/g, '/')}`);
    if (snap.missingHtml.length) console.log(`  (no local HTML: ${snap.missingHtml.join(', ')})`);
    return;
  }

  const readBaseline = (file) => (fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : { generatedAt: null, pages: {}, exposeShare: EXPOSE_SHARE });
  const baselines = baselineFiles.map((file) => ({
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    at: (readBaseline(file).generatedAt || '—'),
    rows: compareExposure(readBaseline(file), snap),
  }));
  const baseline = readBaseline(snapFile);

  const labels = new Map(qr.INTENT_BUCKETS.map((b) => [b.key, b.label]));
  const changes = fs.existsSync(CHANGES_FILE)
    ? (JSON.parse(fs.readFileSync(CHANGES_FILE, 'utf8')).changes || [])
    : [];
  const report = {
    baselineAt: baseline.generatedAt || '—',
    baselineFile: path.relative(ROOT, snapFile).replace(/\\/g, '/'),
    exposeShare: baseline.exposeShare || EXPOSE_SHARE,
    changes,
    compares: baselines,
    label: (k) => labels.get(k) || k,
    pages: snap.pages,
    coverageRows: Object.entries(snap.pages).map(([p, m]) => ({
      path: p,
      words: m.withEnhance.words,
      with: m.withEnhance.coverage,
      without: m.withoutEnhance.coverage,
      gained: m.withEnhance.present.filter((k) => !m.withoutEnhance.present.includes(k)),
    })),
    compare: compareExposure(baseline, snap),
    current: Object.entries(snap.pages).map(([p, m]) => {
      const q = join.get(p);
      const queryMissing = q ? q.queryMissing : [];
      const contentMissing = m.withEnhance.missing;
      const action = qr.planAction(queryMissing, contentMissing);
      return {
        path: p,
        distinctQueries: q ? q.distinctQueries : 0,
        impressions: q ? q.impressions : 0,
        action: action.action,
        buried: m.withEnhance.buried,
        exposed: m.withEnhance.exposed,
      };
    }),
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  fs.writeFileSync(OUT_DOC, buildDoc(report));

  console.log('PAGE EXPOSURE');
  for (const row of report.coverageRows) {
    console.log(`  ${row.path.padEnd(40)} words ${String(row.words).padStart(5)} · coverage ${fmtPct(row.without)} → ${fmtPct(row.with)}` + (row.gained.length ? ` (gained: ${row.gained.join(', ')})` : ''));
  }
  console.log(`--- checked against ${baselines.length} baseline(s): ${baselines.map((b) => b.file).join(', ')}`);
  for (const cmp of baselines) {
    const moved = cmp.rows.filter((r) => r.status === 'compared' && (r.movedUp || r.appeared));
    console.log(`    ${cmp.file}: moved ${moved.length} page(s) of ${cmp.rows.length}` + (moved.length ? ' | ' + moved.map((m) => `${m.path} up=${m.movedUp} new=${m.appeared}`).join(' · ') : ''));
  }
  console.log('report: docs/PAGE-EXPOSURE-PROOF.md');
}

if (require.main === module) main();
