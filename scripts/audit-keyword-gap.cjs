#!/usr/bin/env node
// ============================================================
// CalcProMaster — keyword gap audit
// ------------------------------------------------------------
// Inputs (data/keyword-gap/):
//   calculator-net-gap.csv     competitor gap export (Keyword, Volume, Position, SEO Difficulty, Ranking URL)
//   calculatorsoup-gap.csv     same schema
//   keyword-planner.csv        Google Ads Keyword Planner export (Keyword Text, Competition Index, Search Volume)
//
// Method: the deliverable is a DECISION per keyword, so coverage is measured
// against the built site (deploy/), not against a keyword list that can drift
// from what is actually published:
//
//   COVERED — a page's slug or title already carries the keyword's head phrase.
//             Nothing to build; initially the SERP position is an authority/
//             exposure question, not a content question.
//   WEAK    — a page exists for the intent but the keyword is only in the body,
//             so the title/H1 does not say what it answers. On-page fix.
//   GAP     — no page matches; this is where new pages are actually needed.
//
// Opportunity = volume × (100 − difficulty)/100, i.e. traffic you could
// plausibly win, not "biggest volume first" — which is how a 2.7M/month head
// term with a 60 difficulty outranks a 400k term you could actually rank for.
//
// Usage:
//   node scripts/audit-keyword-gap.cjs                 # audit + write report
//   node scripts/audit-keyword-gap.cjs --top 40        # longer tables
//   node scripts/audit-keyword-gap.cjs --json          # data/keyword-gap.json only
// Exit 0 always: this is a planning report, not a gate (CI would need the CSVs).
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IN_DIR = path.join(ROOT, 'data', 'keyword-gap');
const OUT_JSON = path.join(ROOT, 'data', 'keyword-gap.json');
const OUT_MD = path.join(ROOT, 'docs', 'KEYWORD-GAP.md');
// Per-keyword verdict for EVERY row that went through the classifier, one line
// per keyword. The JSON above only carries the actionable slices (gap + weak),
// so without this file the claim "every row of the 88-row keyword-volume export
// was classified" cannot be checked — it can only be re-derived by re-running
// the classifier against a built site. This is the analysis side of the
// export↔analysis agreement asserted by tests/unit/keyword-gap-agreement.test.js.
// NOTE: it deliberately lives OUTSIDE data/keyword-gap/ — that directory is the
// input set (readInputs() reads every *.csv in it), so a verdict file in there
// would be re-read as an input export on the next run.
const OUT_VERDICTS = path.join(ROOT, 'data', 'keyword-gap-verdicts.csv');
const DEPLOY = path.join(ROOT, 'deploy');

// The 20 categories that actually host calculators. deploy/ contains other
// top-level directories too (blog, guides, hub, embed, the disclaimer pages,
// legal copy), and those must never be suggested as the home for a new tool —
// see the note on the category vote below.
const TOOL_CATS = new Set([
  'finance', 'health', 'math', 'everyday', 'science', 'engineering', 'construction',
  'conversion', 'business', 'education', 'utilities', 'lifestyle', 'regional', 'food',
  'fitness', 'auto', 'career', 'homegarden', 'tech', 'family'
]);

const argNum = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : dflt;
};
const TOP = argNum('--top', 25);
const JSON_ONLY = process.argv.includes('--json');
// --only <substring>: audit a single input file's keywords (e.g. one vendor's export).
const onlyI = process.argv.indexOf('--only');
const ONLY = onlyI >= 0 ? process.argv[onlyI + 1] : null;

// ---------- tiny CSV reader (quoted fields, CRLF) ----------
function parseCsv(text) {
  const rows = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < rawLine.length; i++) {
      const c = rawLine[i];
      if (q) {
        if (c === '"' && rawLine[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

function readInputs() {
  const files = fs.existsSync(IN_DIR) ? fs.readdirSync(IN_DIR).filter((f) => f.endsWith('.csv')) : [];
  const out = [];
  for (const f of files) {
    const rows = parseCsv(fs.readFileSync(path.join(IN_DIR, f), 'utf8'));
    if (rows.length < 2) continue;
    const head = rows[0].map((h) => h.toLowerCase());
    const col = (...names) => {
      for (const n of names) { const i = head.findIndex((h) => h === n); if (i >= 0) return i; }
      return -1;
    };
    const kI = col('keyword text', 'keyword');
    const vI = col('search volume', 'volume');
    const dI = col('competition index', 'seo difficulty', 'paid difficulty', 'difficulty');
    const posI = col('position');
    const cpcI = col('cpc', 'low top page bid');
    const urlI = col('ranking url');
    if (kI < 0 || vI < 0) continue;
    for (const r of rows.slice(1)) {
      const kw = (r[kI] || '').toLowerCase().trim();
      if (ONLY && !f.includes(ONLY)) continue;
      const volume = parseInt((r[vI] || '').replace(/[^0-9]/g, ''), 10);
      if (!kw || !Number.isFinite(volume)) continue;
      out.push({
        keyword: kw,
        volume,
        difficulty: dI >= 0 ? (parseInt(r[dI], 10) || 0) : 0,
        cpc: cpcI >= 0 ? (parseFloat((r[cpcI] || '').replace(/[^0-9.]/g, '')) || 0) : 0,
        competitorPosition: posI >= 0 ? (parseInt(r[posI], 10) || null) : null,
        competitorUrl: urlI >= 0 ? r[urlI] || '' : '',
        source: f.replace(/\.csv$/, '')
      });
    }
  }
  // De-dupe by keyword, keeping the highest volume and the richest difficulty.
  const byKw = new Map();
  for (const k of out) {
    const prev = byKw.get(k.keyword);
    if (!prev) { byKw.set(k.keyword, k); continue; }
    byKw.set(k.keyword, {
      ...prev,
      volume: Math.max(prev.volume, k.volume),
      difficulty: Math.max(prev.difficulty, k.difficulty),
      cpc: Math.max(prev.cpc, k.cpc),
      competitorPosition: prev.competitorPosition || k.competitorPosition,
      competitorUrl: prev.competitorUrl || k.competitorUrl,
      source: prev.source === k.source ? prev.source : prev.source + '+' + k.source
    });
  }
  // inputRows is the pre-dedupe count: how many CSV data rows the classifier
  // actually saw. Reporting it next to the unique count is what shows the
  // duplicates instead of hiding them (608 rows → 604 unique keywords).
  return { keywords: [...byKw.values()], files, inputRows: out.length };
}

// ---------- our site's pages as the coverage ground truth ----------
const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'and', 'to', 'in', 'on', 'my', 'your', 'how', 'what', 'is', 'are', 'online', 'free', 'best', 'calculator', 'calculators', 'with', 'by']);
// Generic suffix words that say "there is a tool here" and nothing about WHAT it
// computes. Keeping them made "estimate compound interest" read as a keyword
// needing an "estimate" page; dropping them makes it the compound-interest page.
const GENERIC = new Set(['estimate', 'estimator', 'estimation', 'calculate', 'calculation', 'compute', 'solver', 'solve', 'tool', 'tools', 'find', 'search', 'exact', 'instant', 'quick', 'check', 'checker', 'value', 'number', 'numbers', 'make', 'my', 'thing', 'stuff', 'convert', 'converting',
  // Filler nouns that modifiers attach to. "Concrete measurements calculator" is
  // the concrete page; keeping "measurement" made it read as a page we lack.
  'table', 'measurement', 'measurements', 'measuring', 'measure', 'chart', 'result', 'results']);
// Abbreviations and vendor artifacts: "compound int calculator" must match the
// compound-interest page, not read as a keyword about "int".
const NOISE = new Set(['int', 'ci', 'calc', 'vs', 'php', 'html', 'app', 'com', 'net', 'org', 'io', 'uk', 'us']);
// Brand/navigational terms: nobody outranks Google's own calculator widget or
// the "xe" brand for these, so they are excluded instead of padding the gap list.
const BRAND = new Set(['google', 'xe', 'bing', 'amazon', 'iphone', 'android', 'windows', 'excel', 'ipad', 'mac']);
// One token → canonical token. Cheap synonym handling for the head nouns that
// actually repeat across these files (a paycheck page IS our salary page).
const SYN = new Map([
  ['paycheck', 'salary'], ['pay', 'salary'], ['payroll', 'salary'], ['wage', 'salary'], ['wages', 'salary'], ['stub', 'salary'],
  ['lender', 'loan'], ['lending', 'loan'], ['borrowing', 'loan'],
  ['int', 'interest'],
  ['mathematical', 'math'], ['maths', 'math'], ['statistic', 'statistics'],
  ['grader', 'grade'], ['grading', 'grade'], ['graded', 'grade'],
  // Gerunds whose base needs the silent e back (the stem cannot know this).
  ['measuring', 'measure'], ['solving', 'solve'], ['dating', 'date'], ['pricing', 'price'],
  ['valuing', 'value'], ['rating', 'rate'], ['tilting', 'tilt'],
  // Unambiguous spellings/equivalents seen in the exports. Anything ambiguous
  // ("bank certificate" → CD, "a/g" → albumin/globulin) is deliberately NOT
  // mapped: a wrong synonym hides a real gap.
  ['sci', 'scientific'], ['amortisation', 'amortization'], ['amortised', 'amortization'],
  ['cement', 'concrete'], ['sq', 'square'], ['ft', 'foot'], ['feet', 'foot'], ['ft2', 'squarefoot'],
  ['graphical', 'graph'], ['graphing', 'graph'], ['grafic', 'graph'], ['plotter', 'graph'],
  // "hours worked" wording belongs to the hours/timesheet pages, not to a page
  // literally titled "worked".
  ['worked', 'hours'], ['working', 'hours'], ['worktime', 'hours'], ['timesheet', 'hours'],
  ['deduction', 'deductions'],
  // "days" is four letters, so the plural stemmer (which only folds length >= 5)
  // left it alone while the page said "Day" — and the audit then handed
  // "snow days calculator" to /everyday/jet-lag (whose title says "Days") even
  // though /everyday/snow-day states the keyword in its H1 and title. An explicit
  // fold is safer than lowering the stemmer's floor, which would restem every
  // four-letter plural in the corpus.
  ['days', 'day']
]);
const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s-]+/g, ' ').split(/[\s-]+/).filter(Boolean);
// Light plural stemming, because "day count" and a page titled "Days Between
// Dates" describe the same page and only stemming sees that.
const stem = (t) => {
  if (t.length >= 5 && t.endsWith('ing')) {
    const base = t.slice(0, -3);
    // Doubled consonant: the base IS the word (tipping → tip, running → run).
    // Do NOT try to restore the dropped silent e here — that turned compounding
    // into "compounde" and matched nothing. The words that need an e to come
    // back (grading → grade, measuring → measure) are explicit synonyms below,
    // because only a dictionary can tell which ones those are.
    return /([a-z])\1$/.test(base) ? base.slice(0, -1) : base;
  }
  return t.length >= 5 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
};
// Synonyms first, then stem — not the other way round. Stemming "grading" to
// "grad" before the dictionary ran meant the explicit grading → grade synonym
// could never fire, and "grad" matches nothing.
const canon = (t) => {
  let out = t;
  for (let i = 0; i < 3; i++) {
    const mapped = SYN.get(out);
    const next = mapped || stem(out);
    if (next === out) break;
    out = next;
  }
  return out;
};
const keyTokens = (s) => tokens(s).map(canon)
  .filter((t) => t.length >= 2 && !STOP.has(t) && !GENERIC.has(t) && !NOISE.has(t));
const isBrandOnly = (s) => {
  const t = tokens(s).map(canon).filter((x) => x.length >= 3 && !STOP.has(x));
  return t.length > 0 && t.every((x) => BRAND.has(x) || NOISE.has(x));
};

function buildIndex() {
  const pages = [];
  if (!fs.existsSync(DEPLOY)) return pages;
  for (const dir of fs.readdirSync(DEPLOY, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const catDir = path.join(DEPLOY, dir.name);
    for (const entry of fs.readdirSync(catDir, { withFileTypes: true })) {
      const file = entry.isDirectory() ? path.join(catDir, entry.name, 'index.html') : path.join(catDir, entry.name);
      if (!fs.existsSync(file) || !file.endsWith('.html')) continue;
      const html = fs.readFileSync(file, 'utf8');
      // A noindex page is not a coverage owner. deploy/embed/* declares
      // "noindex, follow" (its canonical is the real tool page), so counting it
      // made "paycheck calculator" look covered by /embed/dubai-salary — an
      // embeddable widget that is not in the sitemap. The page's own robots
      // declaration decides, not a hardcoded directory list, so any future
      // noindex variant is excluded the same way.
      if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) continue;
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
      const slug = entry.isDirectory() ? '/' + dir.name + '/' + entry.name : '/' + dir.name + '/' + entry.name.replace(/\.html$/, '');
      // Body prose only: strip script/style/tags, cap the read so a 1.5MB page
      // cannot dominate the match.
      const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000);
      const tk = keyTokens(title + ' ' + slug.replace(/\//g, ' '));
      const bk = keyTokens(body);
      pages.push({
        path: slug,
        title,
        h1: h1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        titleTokens: new Set(tk),
        bodyTokens: new Set(bk)
      });
    }
  }
  // Root + guides/blog live at the top level.
  for (const f of fs.existsSync(DEPLOY) ? fs.readdirSync(DEPLOY) : []) {
    if (!f.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(DEPLOY, f), 'utf8');
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000);
    pages.push({
      path: '/' + f.replace(/\.html$/, ''),
      title, h1: h1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      titleTokens: new Set(keyTokens(title + ' ' + f)), bodyTokens: new Set(keyTokens(body))
    });
  }
  // Token rarity across the site: the rarest token in a keyword is its most
  // specific one ("concrete" in "concrete estimator", not "estimate"), so that
  // token decides which page the keyword is really about.
  const df = new Map();
  for (const p of pages) for (const t of new Set([...p.titleTokens, ...p.bodyTokens])) df.set(t, (df.get(t) || 0) + 1);
  for (const p of pages) p.df = df;
  return pages;
}

// A token only counts as evidence about THIS page when it is topical rather than
// site-wide furniture. Without this, every page's footer/related/"About" prose
// mentions every popular word (the EV page mentions "concrete volumes"), which
// is how a scoring pass starts reporting "/auto/ev-range" as the concrete-
// estimator page. Titles/slugs always count; body text must be uncommon enough
// to be about the page (BOILER_DF pages or fewer).
const BOILER_DF = 60;
function distinctive(page, token) {
  if (page.titleTokens.has(token)) return true;
  if (!page.bodyTokens.has(token)) return false;
  return (page.df.get(token) || 0) <= BOILER_DF;
}

// A keyword is COVERED when its tokens are in a page's slug+title, WEAK when the
// page for that intent exists but the title does not say it, GAP when no page
// carries the intent. The relevance floor (head token must be present) is what
// keeps a nonsense best-match from being reported as WEAK.
function classify(keyword, pages) {
  const kt = keyTokens(keyword);
  if (!kt.length || isBrandOnly(keyword)) return { verdict: 'IGNORE', page: null };
  // Head = rarest token in the corpus (most specific); tie-break on the longest.
  // Used only for "where would this page live", never for the verdict: a verdict
  // driven by the rarest token calls "mortgage expense calculator" a page about
  // "expense" and misses the mortgage calculator that already exists.
  const head = kt.slice().sort((a, b) => {
    const d = (pages[0].df.get(a) || 0) - (pages[0].df.get(b) || 0);
    return d !== 0 ? d : b.length - a.length;
  })[0];
  const first = kt[0];
  let best = null;
  for (const p of pages) {
    const titleHits = kt.filter((t) => p.titleTokens.has(t)).length;
    let bodyHits = 0;
    for (const t of kt) if (distinctive(p, t)) bodyHits++;
    if (titleHits === 0 && bodyHits === 0) continue;     // not this page at all
    const score = titleHits * 3 + bodyHits;
    // Deterministic tie-break: score, then head token in the title, then the
    // keyword's first token in the title (the modifier), then the most specific
    // page. Without it, ties resolved by directory order, so "mortgage expense
    // calculator" pointed at an EV-startup burn-rate page.
    const tie = [p.titleTokens.has(head) ? 1 : 0, p.titleTokens.has(first) ? 1 : 0, -p.bodyTokens.size];
    const better = !best || score > best.score ||
      (score === best.score && (tie[0] - best.tie[0] || tie[1] - best.tie[1] || tie[2] - best.tie[2]) > 0);
    if (better) best = { score, p, titleHits, bodyHits, tie };
  }
  if (!best) return { verdict: 'GAP', page: null, closest: null, head, titleHits: 0, bodyHits: 0 };
  // COVERED: a page's slug/title already states the keyword. A 3+ token keyword
  // may miss one token in the title if the body carries it (long keywords are
  // mostly wordier versions of a page that exists).
  const need = kt.length <= 2 ? kt.length : kt.length - 1;
  if (best.titleHits >= need) return { verdict: 'COVERED', page: best.p, head, titleHits: best.titleHits, bodyHits: best.bodyHits };
  // WEAK: the page for the intent exists (every token is on it, distinctly) but
  // the title only names part of it — the keyword is in the body, not the title.
  if (best.titleHits >= 1 && best.bodyHits >= kt.length) return { verdict: 'WEAK', page: best.p, head, titleHits: best.titleHits, bodyHits: best.bodyHits };
  // GAP: no page states it. "GAP" means exactly that — no page's title/slug
  // carries the keyword, not "nothing similar exists" (see the suggested path).
  // closest: the nearest page even though it does not state the keyword. For
  // "day count" that is /everyday/days-between — the honest answer is usually
  // "retarget the page you have", not "build a new one". Only offered when the
  // page's title shares a token: a body-only match is how "proportion" ended up
  // pointing at /construction/conduit-fill.
  return { verdict: 'GAP', page: null, head, titleHits: best.titleHits, bodyHits: best.bodyHits };
}

function main() {
  const { keywords, files, inputRows } = readInputs();
  const pages = buildIndex();

  // --explain <keyword>: show the evidence behind one verdict (why a page did or
  // did not match). Debugging aid for the report, not part of the normal run.
  const exI = process.argv.indexOf('--explain');
  if (exI >= 0 && process.argv[exI + 1]) {
    const kw = process.argv[exI + 1].toLowerCase();
    const kt = keyTokens(kw);
    const c = classify(kw, pages);
    console.log('keyword : ' + kw);
    console.log('tokens  : [' + kt.join(', ') + ']');
    console.log('verdict : ' + c.verdict + (c.page ? ' → ' + c.page.path : ''));
    const ranked = pages.map((p) => ({
      p,
      titleHits: kt.filter((t) => p.titleTokens.has(t)).length,
      bodyHits: kt.filter((t) => distinctive(p, t)).length
    })).filter((r) => r.titleHits || r.bodyHits)
      .sort((a, b) => (b.titleHits * 3 + b.bodyHits) - (a.titleHits * 3 + a.bodyHits))
      .slice(0, 5);
    console.log('best pages:');
    for (const r of ranked) console.log('  ' + r.p.path + '  titleHits=' + r.titleHits + ' bodyHits=' + r.bodyHits + '  | ' + r.p.title);
    process.exit(0);
  }
  const rows = keywords.map((k) => {
    const c = classify(k.keyword, pages);
    const opportunity = Math.round((k.volume * (100 - Math.min(k.difficulty, 100))) / 100);
    // For a GAP, the most useful thing after "no page" is where the page would
    // live: inherit the category of the closest page that covers the head token.
    let suggest = null;
    if (c.verdict === 'GAP' && c.head) {
      // Place the missing page by category vote: the category with the most
      // pages that already carry the head token is where this tool belongs.
      //
      // The vote is restricted to real tool categories. deploy/ also holds
      // non-tool pages — the per-topic disclaimers, blog, guides, legal copy —
      // and their paths carry tool-ish words ("financial", "cost", "time"),
      // so an unrestricted vote produced nonsense like
      // `/disclaimer-finance/financial-compound`: a legal notice offered as the
      // home for a calculator. A suggestion that cannot host a tool is worse
      // than no suggestion.
      const votes = new Map();
      for (const p of pages) {
        if (!distinctive(p, c.head)) continue;
        const cat = p.path.split('/')[1] || '';
        if (cat) votes.set(cat, (votes.get(cat) || 0) + 1);
      }
      for (const cat of [...votes.keys()]) if (!TOOL_CATS.has(cat)) votes.delete(cat);
      const cat = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const slug = k.keyword.replace(/\bcalculator?s?\b/g, '').trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
      if (cat && slug) suggest = '/' + cat[0] + '/' + slug;
    }
    return { ...k, ...c, opportunity, page: c.page ? c.page.path : null, suggest };
  });
  rows.sort((a, b) => b.opportunity - a.opportunity);

  const counts = { COVERED: 0, WEAK: 0, GAP: 0, IGNORE: 0 };
  for (const r of rows) counts[r.verdict]++;
  const byVerdict = (v) => rows.filter((r) => r.verdict === v);
  // Which export each verdict came from, and which keywords appeared in more
  // than one export. Both are cheap and make the export↔analysis agreement
  // checkable without re-running the classifier (see OUT_VERDICTS note above).
  const bySource = {};
  const seenIn = new Map();
  for (const r of rows) {
    for (const src of String(r.source || '').split('+')) {
      if (!src) continue;
      const b = bySource[src] || (bySource[src] = { rows: 0, COVERED: 0, WEAK: 0, GAP: 0, IGNORE: 0 });
      b.rows++;
      b[r.verdict]++;
      if (!seenIn.has(r.keyword)) seenIn.set(r.keyword, new Set());
      seenIn.get(r.keyword).add(src);
    }
  }
  const duplicateKeywords = [...seenIn.entries()]
    .filter(([, s]) => s.size > 1)
    .map(([kw, s]) => ({ keyword: kw, sources: [...s].sort() }))
    .sort((a, b) => a.keyword.localeCompare(b.keyword));

  const report = {
    ranAt: new Date().toISOString(),
    inputs: files,
    inputRows,
    pagesIndexed: pages.length,
    keywords: rows.length,
    counts,
    bySource,
    duplicateKeywords,
    gap: byVerdict('GAP').slice(0, 200),
    weak: byVerdict('WEAK').slice(0, 200)
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  // One line per classified keyword, sorted by verdict then keyword so the file
  // diffs readably when a single row changes verdict. `keyword` is quoted
  // because several export keywords carry a comma ("celsius to fahrenheit, …").
  const csvCell = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const verdictRows = [...rows].sort((a, b) => a.verdict.localeCompare(b.verdict) || a.keyword.localeCompare(b.keyword));
  fs.writeFileSync(OUT_VERDICTS, 'keyword,verdict,page,source,volume,difficulty\r\n'
    + verdictRows.map((r) => [r.keyword, r.verdict, r.page || '', r.source || '', r.volume, r.difficulty].map(csvCell).join(',')).join('\r\n') + '\r\n');

  if (!JSON_ONLY) {
    const L = [];
    const fmt = (n) => n.toLocaleString('en-US');
    L.push('# Keyword gap audit');
    L.push('');
    L.push('_Generated by `scripts/audit-keyword-gap.cjs` from the CSVs in `data/keyword-gap/`. Coverage is measured against the **built site** (`deploy/`, '
      + fmt(pages.length) + ' pages), not against a hand-kept keyword list._');
    L.push('');
    L.push('| verdict | keywords | meaning |');
    L.push('|---|---|---|');
    L.push('| COVERED | ' + counts.COVERED + ' | a page slug/title already carries the keyword |');
    L.push('| WEAK | ' + counts.WEAK + ' | page exists, keyword only in body → title/H1 fix |');
    L.push('| GAP | ' + counts.GAP + ' | no page matches → new page |');
    L.push('');
    L.push('Opportunity = volume × (100 − difficulty)/100 — expected traffic, not raw volume.');
    L.push('');
    L.push('## Biggest gaps (no page matches)');
    L.push('');
    if (!counts.GAP) L.push('_None._');
    else {
      L.push('| keyword | volume | difficulty | opportunity | suggested path (category vote) | competitor |');
      L.push('|---|---|---|---|---|---|');
      for (const r of byVerdict('GAP').slice(0, TOP)) {
        L.push('| `' + r.keyword + '` | ' + fmt(r.volume) + ' | ' + r.difficulty + ' | ' + fmt(r.opportunity) + ' | '
          + (r.suggest ? '`' + r.suggest + '`' : '—') + ' | '
          + (r.competitorPosition ? '#' + r.competitorPosition + ' ' + r.competitorUrl.replace(/^https?:\/\//, '') : '—') + ' |');
      }
    }
    if (counts.IGNORE) {
      L.push('');
      L.push('_Excluded ' + counts.IGNORE + ' brand/navigational keyword(s) (google/xe/app…): no page can win those SERPs._');
    }
    L.push('');
    L.push('## Covered but weak (title/H1 does not say it — cheapest wins)');
    L.push('');
    if (!counts.WEAK) L.push('_None._');
    else {
      L.push('| keyword | volume | difficulty | opportunity | existing page |');
      L.push('|---|---|---|---|---|');
      for (const r of byVerdict('WEAK').slice(0, TOP)) {
        L.push('| `' + r.keyword + '` | ' + fmt(r.volume) + ' | ' + r.difficulty + ' | ' + fmt(r.opportunity) + ' | `' + r.page + '` |');
      }
    }
    L.push('');
    L.push('## Covered (ranking is an authority/exposure question, not content)');
    L.push('');
    L.push('| keyword | volume | difficulty | page |');
    L.push('|---|---|---|---|');
    for (const r of byVerdict('COVERED').slice(0, TOP)) {
      L.push('| `' + r.keyword + '` | ' + fmt(r.volume) + ' | ' + r.difficulty + ' | `' + r.page + '` |');
    }
    L.push('');
    L.push('## Method & honest limits');
    L.push('');
    L.push('- Matching is token-based on slug + title, with body text as secondary evidence only when the token is uncommon site-wide (a word in every page footer proves nothing).');
    L.push('- `GAP` means no page states the keyword in its title/slug — not that nothing similar exists. A "nearest page" column was tried and removed: a page sharing one incidental title word (an EV burn-rate page for "mortgage expense") reads like an answer and is not one. Check these by hand against the suggested path.');
    L.push('- `WEAK` is a hint to inspect, not a verdict: it means every token is on that page while the title names only part of the keyword.');
    L.push('- `COVERED` deliberately ignores SERP position: the site has pages for the head terms and still sits on page 3-5, so the bottleneck for those is authority/indexing, not another page.');
    L.push('- A `GAP` verdict is about **slug/title wording**, and it is not by itself a licence to build a page: [KEYWORD-TARGET-RESOLUTION.md](KEYWORD-TARGET-RESOLUTION.md) holds the per-row decision (95 of the B/C/D rows are answered by an existing owner page, only 2 have no honest owner). Check that table before creating any URL listed here, and prefer improving the named owner.');
    L.push('- Difficulty columns come from two different vendors (SEO Difficulty vs Competition Index) and are therefore comparable within a file, not across files.');
    L.push('- Re-run after adding pages: `node scripts/audit-keyword-gap.cjs` (the CSVs are committed under `data/keyword-gap/`).');
    L.push('');
    fs.writeFileSync(OUT_MD, L.join('\n'));

    console.log('keyword gap audit');
    console.log('  inputs        : ' + files.join(', '));
    console.log('  pages indexed : ' + pages.length);
    // IGNORE is printed too: without it the three verdicts do not add up to the
    // keyword count and the gap looks like a bug in the classifier.
    console.log('  keywords      : ' + rows.length + ' unique from ' + inputRows + ' input row(s)'
      + (duplicateKeywords.length ? ' (' + duplicateKeywords.length + ' duplicate keyword(s) merged)' : '')
      + '  (COVERED ' + counts.COVERED + ' / WEAK ' + counts.WEAK + ' / GAP ' + counts.GAP + ' / IGNORE ' + counts.IGNORE + ')');
    console.log('  top gaps:');
    for (const r of byVerdict('GAP').slice(0, 10)) console.log('    ' + String(r.volume).padStart(9) + '  ' + r.keyword + '  (diff ' + r.difficulty + ')');
    console.log('  top weak:');
    for (const r of byVerdict('WEAK').slice(0, 10)) console.log('    ' + String(r.volume).padStart(9) + '  ' + r.keyword + '  → ' + r.page);
    console.log('  report: ' + path.relative(ROOT, OUT_MD) + ' · data: ' + path.relative(ROOT, OUT_JSON)
      + ' · verdicts: ' + path.relative(ROOT, OUT_VERDICTS));
  }
  return 0;
}

// Exported for tests: the classification rules are heuristics that were tuned
// against real exports, so they need to stay pinned by unit tests.
module.exports = { stem, canon, keyTokens, isBrandOnly, distinctive, classify, buildIndex, BOILER_DF };

if (require.main === module) process.exit(main());
