#!/usr/bin/env node
// ============================================================
// CalcProMaster — Query reach (kitne keywords par ek page rank karta hai)
// ------------------------------------------------------------
// Sawal: "ek page ko hundreds of keywords mil sakte hain?" — jawab data se.
//
// GSC ka query→page join (data/gsc-query-page.json) batata hai ke ek page
// *asli mein* kitne alag queries par impressions le raha hai. Wo hi "reach"
// hai — aur wahi wo number hai jo 200k/300k impressions ke target ko chalta
// hai. Ek page jitni zyada queries par (aur jitni oonchi position par) appear
// karta hai, utni zyada impressions.
//
// Ye script teen cheezein naapta hai, teeno measured (proxy nahi):
//   1. Per-page reach  — distinct queries, impressions/query, head vs long-tail
//   2. Reach leak      — wahi content do URL variants (/x aur /x/) par bant kar
//                        apni hi signal split kar raha hai
//   3. Gap             — aaj ke impressions se 200k/300k/month tak ka multiple,
//                        aur semantic expansion ke liye missing intent buckets
//
// Output: data/query-reach.json  +  docs/QUERY-REACH.md
// Usage : node scripts/build-query-reach.cjs [--top 25] [--min-impr 5]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JOIN_FILE = path.join(ROOT, 'data', 'gsc-query-page.json');
const PAGE_FILE = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const OUT_JSON = path.join(ROOT, 'data', 'query-reach.json');
const OUT_DOC = path.join(ROOT, 'docs', 'QUERY-REACH.md');

const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const SITE_ORIGIN = 'https://calcpromaster.com';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : dflt;
};
const TOP = arg('--top', 25);
const MIN_IMPR = arg('--min-impr', 5);

// Cloudflare Pages ki serving rule, local build tree se padee gayi:
//   deploy/<path>/index.html  → /path/ native 200, /path 308 → /path/
//   deploy/<path>.html        → /path native 200, /path/ 308 → /path
// Isi se pata chalta hai ke live kaun sa form canonical hai, bina network call
// ke — aur isi ke against sitemap ka form check hota hai.
function nativeFormFromTree(relPath, existsSync = fs.existsSync) {
  const dir = path.join(ROOT, 'deploy', relPath.replace(/^\//, ''));
  const isDir = existsSync(dir);
  const dirIndex = isDir ? existsSync(path.join(dir, 'index.html')) : false;
  const isFile = existsSync(dir + '.html');
  if (dirIndex && isFile) return 'both';
  if (dirIndex) return 'slash';
  if (isFile) return 'noslash';
  if (isDir) return 'slash';          // directory without index → Cloudflare serves /path/
  return 'unknown';
}

// ---------- reach tiers (distinct queries per page) ----------
// Ye bands usi baat ko label karte hain jo user pooch raha tha: koi page
// "hundreds of keywords" par hai ya 1-3 par atka hua hai.
const TIERS = [
  { tier: 'hundreds', min: 100 },  // business-days jaisa: 100+ distinct queries
  { tier: 'broad', min: 30 },
  { tier: 'growing', min: 10 },
  { tier: 'thin', min: 4 },
  { tier: 'stuck', min: 0 },
];

// Intent buckets: ek page "semantically poor" hai agar uski queries sirf ek
// hi shakal mein aati hain (sirf "x calculator") aur baaki sawal/modifier/
// variant forms gayab hain. Har bucket ke trigger words se check hota hai ke
// wo intent page par already maujood hai ya nahi — ye tailwind nahi, sirf ek
// deterministic scan hai jise test kiya ja sakta hai.
const INTENT_BUCKETS = [
  { key: 'question', label: 'Sawal (how/what/why…)', triggers: ['how', 'what', 'why', 'when', 'which', 'does', 'do', 'is', 'are', 'can', 'should'] },
  { key: 'formula', label: 'Formula / method', triggers: ['formula', 'equation', 'method', 'calculation', 'derive', 'math'] },
  { key: 'table', label: 'Table / chart', triggers: ['table', 'chart', 'graph', 'matrix', 'list'] },
  { key: 'example', label: 'Worked example', triggers: ['example', 'sample', 'worked', 'case'] },
  { key: 'comparison', label: 'Comparison', triggers: ['vs', 'versus', 'compare', 'comparison', 'alternative', 'better'] },
  { key: 'modifier', label: 'Free / online / best', triggers: ['free', 'online', 'best', 'accurate', 'exact', 'easy', 'simple'] },
  { key: 'period', label: 'Period variant (per day/month/year)', triggers: ['daily', 'monthly', 'annual', 'yearly', 'weekly', 'per day', 'per month', 'per year', 'inflation'] },
  { key: 'region', label: 'Region / year variant', triggers: ['uk', 'us', 'usa', 'canada', 'australia', 'india', 'europe', '2025', '2026', '2027'] },
];

// Page ka asli dikhne wala text: script/style/attributes hata do. Warna `=`
// jaisa trigger har `href="…"` par match kar jata hai aur coverage jhooti 100%
// dikhane lagti hai (ye ghalti pakri gayi thi — is liye ye helper maujood hai).
function visibleText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(?:rsquo|#39|apos);/gi, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Content-side triggers. Tag-level (table, sawal heading) raw HTML par, baqi
// visible text par — kyunki intent page ke *dikhte hue* content se aata hai.
const CONTENT_SIGNALS = {
  table: { raw: /<table[\s>]/i },
  question: { raw: /<h[23][^>]*>[^<]*\b(how|what|why|when|which)\b/i },
  // Ek stated formula ka signal: lafz, ya ×/÷ (calculator page ka asli nishan,
  // markup mein aata hi nahi), ya digits ke darmiyan `*`/`x`, ya `= 12`-jaisa.
  formula: { text: /(formula|equation)/, equation: /[\u00d7\u00f7]|\d+\s*[*x]\s*\d+|=\s*\$?\d/ },
  example: { text: /\bexample\b/ },
  comparison: { text: /(\bvs\b|versus|compared with|comparison)/ },
  modifier: { text: /\b(free|no signup|no login|accurate|exact|instant)\b/ },
  period: { text: /\b(daily|monthly|annual|yearly|per month|per year|inflation)\b/ },
  region: { text: /\b(uk|usa|canada|australia|india|europe)\b/ },
};

// Kya page ke ANDAR us intent ka asli section maujood hai? Isi se pata chalta
// hai ke backlog "content likho" hai ya "content already hai, usay query tak
// pahunchao" — dono bilkul alag kaam hain.
function contentCoverage(html) {
  const raw = String(html || '');
  const text = visibleText(raw);
  const present = [];
  const missing = [];
  for (const b of INTENT_BUCKETS) {
    const sig = CONTENT_SIGNALS[b.key];
    const hit = !sig ? false
      : sig.raw ? sig.raw.test(raw)
      : sig.text && sig.equation ? (sig.text.test(text) || sig.equation.test(text))
      : sig.text.test(text);
    (hit ? present : missing).push({ key: b.key, label: b.label });
  }
  return { present, missing, coverage: +(present.length / INTENT_BUCKETS.length).toFixed(3) };
}

// Dono taraf ko milaa kar action banao. Yehi asli work-list hai:
//   write    → content bhi nahi, query bhi nahi  → section likho
//   expose   → content hai magar query nahi     → andar se link/index/wording
//   fine     → query already aa rahi hai        → kuch mat karo
function planAction(queryMissing, contentMissing) {
  const q = new Set(queryMissing);
  const c = new Set(contentMissing);
  const write = [...q].filter((k) => c.has(k));
  const expose = [...q].filter((k) => !c.has(k));
  return {
    write,
    expose,
    action: write.length ? 'write' : expose.length ? 'expose' : 'fine',
  };
}

// ---------- pure helpers (unit-tested) ----------

// GSC pair pages absolute URL + trailing slash deta hai; page export bare path.
// Dono ko ek hi key par laao warna join toot jata hai.
function normPage(u) {
  const raw = String(u || '').split('#')[0].split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  if (raw === '') return '/';
  return raw.replace(/\/+$/, '') || '/';
}

function reachTier(distinctQueries) {
  for (const t of TIERS) if (distinctQueries >= t.min) return t.tier;
  return 'stuck';
}

// Pair rows (query → page) ko canonical page par group karo. Raw variants alag
// se count hote hain so split ko pakra ja sake.
function groupPairsByPath(pairs) {
  const byPath = new Map();
  for (const p of pairs || []) {
    if (!p || !p.page || !p.query) continue;
    const key = normPage(p.page);
    let e = byPath.get(key);
    if (!e) {
      e = { path: key, variants: new Map(), queryMap: new Map(), pairImpressions: 0, pairClicks: 0 };
      byPath.set(key, e);
    }
    e.pairImpressions += p.impressions || 0;
    e.pairClicks += p.clicks || 0;
    e.variants.set(p.page, (e.variants.get(p.page) || 0) + (p.impressions || 0));
    const q = e.queryMap.get(p.query) || { query: p.query, impressions: 0, clicks: 0, position: 0, count: 0 };
    q.impressions += p.impressions || 0;
    q.clicks += p.clicks || 0;
    q.position += p.position || 0;
    q.count += 1;
    e.queryMap.set(p.query, q);
  }
  return byPath;
}

// Ek canonical path ka pura reach picture.
function pageReach(entry, authoritativeImpressions) {
  const queries = [...entry.queryMap.values()]
    .map((q) => ({ ...q, position: q.count ? q.position / q.count : 0 }))
    .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
  const distinctQueries = queries.length;
  const pairImpressions = entry.pairImpressions;
  const impressions = Number.isFinite(authoritativeImpressions) && authoritativeImpressions > 0
    ? authoritativeImpressions
    : pairImpressions;
  const variants = [...entry.variants.entries()]
    .map(([url, impressions]) => ({ url, impressions }))
    .sort((a, b) => b.impressions - a.impressions);

  const head = queries[0] || null;
  const top3 = queries.slice(0, 3).reduce((s, q) => s + q.impressions, 0);
  const longTail = queries.filter((q) => q.impressions <= 2);
  const longTailImpressions = longTail.reduce((s, q) => s + q.impressions, 0);

  return {
    path: entry.path,
    distinctQueries,
    tier: reachTier(distinctQueries),
    impressions,
    pairImpressions,
    clicks: entry.pairClicks,
    impressionsPerQuery: distinctQueries ? +(impressions / distinctQueries).toFixed(2) : 0,
    headQuery: head ? head.query : null,
    headImpressions: head ? head.impressions : 0,
    top3Share: impressions ? +(top3 / impressions).toFixed(3) : 0,
    longTailQueries: longTail.length,
    longTailShare: distinctQueries ? +(longTail.length / distinctQueries).toFixed(3) : 0,
    longTailImpressions,
    positions: {
      p1to3: queries.filter((q) => q.position > 0 && q.position <= 3).length,
      p4to10: queries.filter((q) => q.position > 3 && q.position <= 10).length,
      p11to20: queries.filter((q) => q.position > 10 && q.position <= 20).length,
      p21plus: queries.filter((q) => q.position > 20).length,
    },
    variantCount: variants.length,
    variants,
    splitSignal: variants.length > 1,
    minorityImpressions: variants.slice(1).reduce((s, v) => s + v.impressions, 0),
    queries,
  };
}

// Wo canonical paths jahan ek hi content do ya zyada URL par impressions le
// raha hai — yani signal split. Ye "hundreds of keywords" ke raste mein sab se
// sasti rukavat hai: pehle consolidate, phir expand.
function variantSplits(pages) {
  return pages
    .filter((p) => p.splitSignal)
    .map((p) => ({
      path: p.path,
      impressions: p.impressions,
      variantCount: p.variantCount,
      variants: p.variants,
      minorityImpressions: p.minorityImpressions,
      // Kitna hissa chhote variant par pada hai — consolidate karne par ye
      // ek hi page ki taraf aata hai.
      minorityShare: p.variants.length > 1
        ? +(p.variants.slice(1).reduce((s, v) => s + v.impressions, 0) / (p.variants.reduce((s, v) => s + v.impressions, 0) || 1)).toFixed(3)
        : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// Page ki queries scan karke batao kaunse intent buckets already cover hain aur
// kaunse gayab hain. Jo gayab hai wahi semantic expansion ka asli backlog hai.
function intentCoverage(queries) {
  const blob = (queries || []).map((q) => String(q.query || '').toLowerCase());
  const present = [];
  const missing = [];
  for (const b of INTENT_BUCKETS) {
    const hit = blob.some((q) => b.triggers.some((t) => q === t || q.includes(t)));
    (hit ? present : missing).push({ key: b.key, label: b.label });
  }
  return { present, missing, coverage: +(present.length / INTENT_BUCKETS.length).toFixed(3) };
}

// Ek split ka verdict: kya ye config ki galti hai ya sirf consolidation lag?
//  - config-mismatch: sitemap/canonical ka form aur live 200-serving form alag
//    hain → ye asli bug hai, fix karo.
//  - consolidation-lag: config sahi hai (sitemap form = live 200 form), magar
//    GSC ke 28-din window mein purana variant abhi bhi impressions le raha hai
//    → koi config change nahi, sirf snapshots-over-snapshots shrink watch karo.
function classifySplit({ winnerIsSlash, nativeForm, sitemapHasSlash, sitemapHasNoSlash }) {
  const sitemapForm = sitemapHasSlash && !sitemapHasNoSlash ? 'slash'
    : sitemapHasNoSlash && !sitemapHasSlash ? 'noslash'
    : sitemapHasSlash && sitemapHasNoSlash ? 'both' : 'none';
  if (sitemapForm === 'none') return { verdict: 'not-in-sitemap', sitemapForm, winnerMatchesConfig: false };
  if (nativeForm === 'both') return { verdict: 'config-mismatch', sitemapForm, winnerMatchesConfig: false };
  const winnerMatchesConfig = nativeForm === (winnerIsSlash ? 'slash' : 'noslash');
  return {
    verdict: sitemapForm === nativeForm ? 'consolidation-lag' : 'config-mismatch',
    sitemapForm,
    winnerMatchesConfig,
  };
}

// Aaj ke measured impressions se target tak ka multiple + roz kya chahiye.
// Do base alag rakhe jate hain kyunki ye site ke apne docs mein bhi alag hain:
//  - API window (28-din average) — purana, migration se pehle ke sifar dinon se
//    neeche khincha hua
//  - 7-din run-rate — aaj ki asli speed
// Dono par 200k/300k ka multiple dikhao, warna ek number doosre se takrata hai.
function targetGap({ impressions, days, targets, runRateMonthly }) {
  const perDay = days ? impressions / days : 0;
  const perMonth = perDay * 30;
  const at = (base) => targets.map((t) => ({
    monthly: t,
    perDay: +(t / 30).toFixed(1),
    multiple: base > 0 ? +(t / base).toFixed(2) : null,
  }));
  return {
    measuredImpressions: impressions,
    windowDays: days,
    perDay: +perDay.toFixed(1),
    perMonth: Math.round(perMonth),
    targets: at(perMonth),
    runRateMonthly: Number.isFinite(runRateMonthly) ? runRateMonthly : null,
    targetsFromRunRate: Number.isFinite(runRateMonthly) ? at(runRateMonthly) : null,
  };
}

// ---------- report ----------

// Markdown inline-code span without literal backticks in source (keeps the
// generator free of fragile escaping).
const md = (s) => '\u0060' + s + '\u0060';
function fmtPct(x) { return x === null || x === undefined ? '—' : (x * 100).toFixed(1) + '%'; }
function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }

function buildDoc(report) {
  const t = report.target;
  const L = [];
  L.push('# Query reach — ek page kitne keywords par rank karta hai');
  L.push('');
  L.push(`> Auto-generated by \`node scripts/build-query-reach.cjs\` · window **${report.window.startDate} → ${report.window.endDate}** (${report.window.days} din).`);
  L.push('> Ye **measured** hai — GSC ka query→page join, koi proxy nahi. Numbers GSC ki truncation ke hisse hain, is liye ye **floor** hain, ceiling nahi.');
  L.push('');
  L.push('`INDEX-VELOCITY.md` speed naapta hai (kitne naye pages index hue), ye report **reach** naapta hai — ek page kitni queries par, kitni position par, kitni impressions le raha hai. Impressions = indexed pages × per-page reach. Dono doc milkar batate hain ke 200k/300k kis cheez se banega.');
  L.push('');
  L.push('## 1. Target ka arithmetic (measured base se)');
  L.push('');
  L.push('Do base hamesha saath dikhte hain, warna ek number doosre se takra jata hai (detail: `GROWTH-MODEL.md` §1):');
  L.push('');
  L.push('| Base | Window | Impressions | /day | /month |');
  L.push('|---|---|---|---|---|');
  L.push(`| GSC API window (28-din average) | ${report.window.startDate} → ${report.window.endDate} | ${fmtNum(t.measuredImpressions)} | ${fmtNum(t.perDay)} | ${fmtNum(t.perMonth)} |`);
  if (t.runRateMonthly) {
    L.push(`| 7-din run-rate (aaj ki speed) | last 7d | — | ${fmtNum(t.runRateMonthly / 30)} | ${fmtNum(t.runRateMonthly)} |`);
  }
  L.push('');
  L.push('> Join coverage: is window ki **' + fmtNum(report.totals.pairImpressions) + '** impressions query→page pairs tak trace hoti hain (' + fmtPct(report.totals.joinCoverage) + ') — baaki GSC ki apni truncation hai, site ka bug nahi. Reach ke per-page numbers isi traced hisse se bante hain, is liye wo **floor** hain.');
  L.push('');
  L.push('| Target / month | Impressions / day | Multiple (28-d average) | Multiple (7-d run-rate) |');
  L.push('|---|---|---|---|');
  t.targets.forEach((x, i) => {
    const rr = t.targetsFromRunRate ? t.targetsFromRunRate[i].multiple : null;
    L.push(`| ${fmtNum(x.monthly)} | ${fmtNum(x.perDay)} | **${x.multiple}x** | ${rr === null ? '—' : `**${rr}x**`} |`);
  });
  L.push('');
  L.push(`**Seedhi baat:** 200,000/month ke liye **${fmtNum(t.targets[0] && t.targets[0].perDay)}/din** chahiye. 28-din average base par wo **${t.targets[0] ? t.targets[0].multiple : '?'}x**, aur aaj ke 7-din run-rate par **${t.targetsFromRunRate && t.targetsFromRunRate[0] ? t.targetsFromRunRate[0].multiple : '?'}x**. Ye guarantee nahi hai — ye sirf arithmetic hai. 30 din mein doubling bhi 2x hai, is liye ye ek month ka kaam nahi. Har din ka multiple reach, position aur indexing teeno se banta hai, ek lever se nahi.`);
  L.push('');
  L.push('## 2. Reach tiers — kitne pages kitni queries par hain');
  L.push('');
  L.push('| Tier | Distinct queries | Pages | Impressions |');
  L.push('|---|---|---|---|');
  for (const row of report.tierTable) {
    L.push(`| \`${row.tier}\` | ${row.range} | ${fmtNum(row.pages)} | ${fmtNum(row.impressions)} |`);
  }
  L.push('');
  L.push(`Property par **${fmtNum(report.totals.canonicalPages)}** canonical pages, **${fmtNum(report.totals.distinctQueries)}** distinct queries, average **${report.totals.avgQueriesPerPage} queries/page**. Top 25 pages ka average **${report.totals.avgQueriesTop25}** hai — matlab reach bahut uneven hai: kuch pages sainkdon queries par hain, baaki 1-3 par atke.`);
  L.push('');
  L.push('## 3. Top pages — reach ke hisaab se');
  L.push('');
  L.push('| # | Path | Queries | Impr | Impr/query | Tier | Head query | pos ≤10 | long-tail share |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  report.topPages.forEach((p, i) => {
    const head = p.headQuery ? p.headQuery.slice(0, 40) : '—';
    L.push(`| ${i + 1} | ${md(p.path)} | **${p.distinctQueries}** | ${fmtNum(p.impressions)} | ${p.impressionsPerQuery} | ${p.tier} | ${head} | ${p.positions.p1to3 + p.positions.p4to10} | ${fmtPct(p.longTailShare)} |`);
  });
  L.push('');
  L.push('`impr/query` chhota hona ye batata hai ke reach chaude hai magar patli — hundreds of queries par 1-2 impressions. `impr/query` bara + queries kam = head par depend karta hua page. Dono ki alag dawa hai: pehle ko position chahiye, doosre ko naya content.');
  L.push('');
  L.push('_Caveat:_ `Queries` sirf un pairs se banta hai jo GSC ke query→page join mein aaye (window impressions ka ' + fmtPct(report.totals.joinCoverage) + '), jab ke `Impr` authoritative per-page export se aata hai jahan maujood ho — is liye ye do alag truncation hain aur `impr/query` apne aap mein ek ratio nahi, ek upper bound hai.');
  L.push('');
  L.push('## 4. Reach leak — do URL, ek content (cannibalization)');
  L.push('');
  L.push(`**${fmtNum(report.splits.length)}** canonical paths aise hain jahan ek hi content **do URL variants** (\`/x\` aur \`/x/\`) par impressions le raha hai — window ke andar **${fmtNum(report.splitLeak.impressions)}** impressions split hain.`);
  L.push('');
  L.push('Ye section ek trap se bachata hai: split dekh kar 301 add karna **ghalat** hota hai agar redirect pehle se maujood ho. Is liye har split ka verdict bhi naapta hai — sitemap/canonical ka form vs live serving ka form (local build tree se derived, network call nahi):');
  L.push('');
  L.push('| Verdict | Paths | Matlab |');
  L.push('|---|---|---|');
  L.push(`| \`config-mismatch\` | **${fmtNum(report.splitLeak.configMismatch)}** | sitemap form ≠ live 200 form → asli bug, fix karo |`);
  L.push(`| \`consolidation-lag\` | **${fmtNum(report.splitLeak.consolidationLag)}** | config sahi hai; GSC ka 28-din window purana variant abhi gin raha hai → sirf watch karo |`);
  if (report.splitLeak.notInSitemap) L.push(`| \`not-in-sitemap\` | **${fmtNum(report.splitLeak.notInSitemap)}** | URL sitemap mein hi nahi → sitemap coverage check karo |`);
  L.push('');
  if (report.splitLeak.consolidationLag === report.splits.length) {
    L.push('**Aaj ka verdict: poori split consolidation-lag hai — koi config change nahi chahiye.** Live site pe non-canonical variant pehle se 308 ho raha hai aur sitemap canonical form list kartta hai, is liye ye number waqt ke saath girna chahiye. Action ye hai: har hafte \`data/query-reach.json\` ka \`splitLeak.impressions\` compare karo — gir raha hai to theek hai; **barh raha hai to** tab config-mismatch dhoondo.');
  } else {
    L.push('**Verdict: kuch splits config-mismatch hain** (ya \`not-in-sitemap\`) — pehle wahi theek karo, kyunki un par 301 ka asar turant aata hai. Baqi consolidation-lag hain; unhe sirf watch karo.');
  }
  L.push('');
  L.push('| Path | Variants | Impr (total) | Minority share | Verdict |');
  L.push('|---|---|---|---|---|');
  report.splits.slice(0, 15).forEach((s) => {
    // Trailing slash ko dikhao — warna dono variants ek jaise lagte hain.
    const vs = s.variants.map((v) => `${(v.url.replace(/^https?:\/\/[^/]+/, '') || '/')} (${v.impressions})`).join(' · ');
    L.push(`| ${md(s.path)} | ${vs} | ${fmtNum(s.impressions)} | ${fmtPct(s.minorityShare)} | ${s.verdict} |`);
  });
  L.push('');

  L.push('');
  L.push('## 5. Semantic expansion backlog — do taraf ka scan');
  L.push('');
  L.push('Ek page "semantically poor" lagta hai jab uski queries sirf ek shakal mein aati hain. Lekin ek hi bucket do bilkul alag wajah se missing ho sakta hai, aur dono ka ilaaj ulta hai. Is liye do scan chalte hain — **queries** (GSC join) aur **content** (page ka prerendered HTML):');
  L.push('');
  L.push('| Action | Matlab | Kaam |');
  L.push('|---|---|---|');
  L.push('| `write` | content bhi nahi, query bhi nahi | us intent ka asli section likho (formula + hand-verified table / sawal ka jawab) |');
  L.push('| `expose` | content maujood hai, query nahi | kuch mat likho — section ko copy mein upar lao, exact query wording use karo, andar se link do; page already eligible hai |');
  L.push('| `fine` | query already aa rahi hai | kuch mat karo |');
  L.push('');
  L.push(`Top ${report.backlog.length} pages par: **${fmtNum(report.backlogSummary.write)} \`write\`** · **${fmtNum(report.backlogSummary.expose)} \`expose\`** · **${fmtNum(report.backlogSummary.fine)} \`fine\`** — kul ${fmtNum(report.backlogSummary.writeBuckets)} buckets likhne hain aur ${fmtNum(report.backlogSummary.exposeBuckets)} sirf expose karne hain.`);
  L.push('');
  L.push('| Path | Reach | Query coverage | Content coverage | Action | Buckets |');
  L.push('|---|---|---|---|---|---|');
  report.backlog.slice(0, TOP).forEach((b) => {
      const buckets = b.action === 'write' ? b.writeLabels : b.action === 'expose' ? b.exposeLabels : [];
    const shown = buckets.slice(0, 4).join(', ') + (buckets.length > 4 ? ` (+${buckets.length - 4})` : '');
    L.push(`| ${md(b.path)} | ${b.distinctQueries} q · ${fmtNum(b.impressions)} impr | ${fmtPct(b.queryCoverage)} | ${b.contentCoverage === null ? '— (HTML nahi mila)' : fmtPct(b.contentCoverage)} | **${b.action}** | ${shown || '—'} |`);
  });
  L.push('');
  L.push('> `write` = naya section (formula + table + worked example jaise `js/tool-enhance.js` mein already kuch tools ke liye hai). `expose` = content pehle se page par hai magar us shakal ki query nahi aa rahi — wahan likhna waste hai, wording + internal link + crawl theek karo. Ye list keyword-stuffing ka license nahi: har section ka jawab page ke apne numbers se ban-na chahiye.');
  L.push('');
  L.push('## 6. Decision rules');
  L.push('');
  L.push('- **`stuck`/`thin` page jiski impressions ≥ min** → §5 ka `write`/`expose` action dekho; `expose` pehle karo (sasta), `write` baad mein.');
  L.push('- **`broad`/`hundreds` par bhi impr/query kam** → page sahi queries par hai magar position kam; index-velocity ka `moving` verdict dekho aur position par kaam karo (title/intro/copy), naya content nahi.');
  L.push('- **Growth model ke saath padho** → 200k/300k = indexed pages × per-page reach. Dono barhane ka apna waqt hai.');
  L.push('- **Split `config-mismatch` ho** → sitemap form live 200 form se milao (\`node scripts/check-sitemap-coverage.cjs\` + \`npm run seo:hosts\`).\n- **Split `consolidation-lag` ho** → kuch mat karo; agle snapshot se compare karo. Ye apne aap girta hai.');
  L.push('');
  L.push('## 7. Reproduce');
  L.push('');
  L.push('```bash');
  L.push('node scripts/gsc-queries.cjs --days 28     # fresh query→page join (GSC creds chahiye)');
  L.push('node scripts/build-query-reach.cjs          # reach + leak + backlog');
  L.push('```');
  L.push('');
  return L.join('\n');
}

function main() {
  if (!fs.existsSync(JOIN_FILE)) {
    console.error('missing data/gsc-query-page.json — pehle `node scripts/gsc-queries.cjs` chalao');
    process.exit(1);
  }
  const join = JSON.parse(fs.readFileSync(JOIN_FILE, 'utf8'));
  const pairs = join.pairs || [];
  const days = join.days || 28;

  // Authoritative per-page impressions (jahan maujood ho).
  const authoritative = new Map();
  if (fs.existsSync(PAGE_FILE)) {
    const pe = JSON.parse(fs.readFileSync(PAGE_FILE, 'utf8'));
    for (const [p, v] of Object.entries(pe.pages || {})) authoritative.set(normPage(p), v.impressions || 0);
  }

  const byPath = groupPairsByPath(pairs);
  const pages = [...byPath.values()]
    .map((e) => pageReach(e, authoritative.get(e.path)))
    .filter((p) => p.impressions >= MIN_IMPR)
    .sort((a, b) => b.impressions - a.impressions || b.distinctQueries - a.distinctQueries);

  const allPages = [...byPath.values()].map((e) => pageReach(e, authoritative.get(e.path)));
  const tierTable = TIERS.map((t, i) => {
    const upper = i === 0 ? Infinity : TIERS[i - 1].min - 1;
    const inTier = allPages.filter((p) => p.distinctQueries >= t.min && p.distinctQueries <= upper);
    return {
      tier: t.tier,
      range: upper === Infinity ? `${t.min}+` : `${t.min}–${upper}`,
      pages: inTier.length,
      impressions: inTier.reduce((s, p) => s + p.impressions, 0),
    };
  });

  const totalImpressions = Math.max(
    allPages.reduce((s, p) => s + p.pairImpressions, 0),
    join.coverage && join.coverage.pairImpressions || 0,
  );
  const distinctQueries = new Set(pairs.map((p) => p.query)).size;
  const topPages = pages.slice(0, TOP);
  const avg = (arr) => (arr.length ? +(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(1) : 0);

  // Property-level impressions (GSC API totals) = target-ka asli base. Join
  // impressions (pairs) sirf utna hissa hai jo query→page tak trace hua.
  const propertyImpressions = (join.totals && join.totals.impressions) || totalImpressions;
  const joinCoverage = propertyImpressions > 0 ? +(totalImpressions / propertyImpressions).toFixed(3) : 0;

  // 7-din run-rate (agar uska tracker chal chuka hai) — ye GROWTH-MODEL.md ke
  // saath consistent rehne ke liye hai, warna do doc alag multiple batate hain.
  let runRateMonthly = null;
  const rrFile = path.join(ROOT, 'data', 'run-rate-stall.json');
  if (fs.existsSync(rrFile)) {
    try {
      const rr = JSON.parse(fs.readFileSync(rrFile, 'utf8'));
      if (Number.isFinite(rr.runRate7PerMonth)) runRateMonthly = rr.runRate7PerMonth;
    } catch (e) { /* optional input */ }
  }

  // Page ka HTML local build se padho (deploy/). Ye content-side coverage deta
  // hai — query-side se milaa kar action banta hai.
  const readPageHtml = (relPath) => {
    const base = path.join(ROOT, 'deploy', relPath.replace(/^\//, ''));
    for (const cand of [path.join(base, 'index.html'), base + '.html']) {
      if (fs.existsSync(cand)) return fs.readFileSync(cand, 'utf8');
    }
    return null;
  };

  const backlog = topPages
    .map((p) => {
      const qc = intentCoverage(p.queries);
      const html = readPageHtml(p.path);
      const cc = html === null ? null : contentCoverage(html);
      const queryMissing = qc.missing.map((m) => m.key);
      const action = cc === null
        ? { write: queryMissing, expose: [], action: 'write' }
        : planAction(queryMissing, cc.missing.map((m) => m.key));
      const label = (keys) => keys.map((k) => (INTENT_BUCKETS.find((b) => b.key === k) || {}).label || k);
      return {
        path: p.path,
        distinctQueries: p.distinctQueries,
        impressions: p.impressions,
        queryCoverage: qc.coverage,
        contentCoverage: cc ? cc.coverage : null,
        htmlFound: cc !== null,
        action: action.action,
        writeLabels: label(action.write),
        exposeLabels: label(action.expose),
      };
    })
    .sort((a, b) => {
      const rank = { write: 0, expose: 1, fine: 2 };
      return rank[a.action] - rank[b.action] || b.impressions - a.impressions;
    });

  const backlogSummary = {
    pages: backlog.length,
    write: backlog.filter((b) => b.action === 'write').length,
    expose: backlog.filter((b) => b.action === 'expose').length,
    fine: backlog.filter((b) => b.action === 'fine').length,
    writeBuckets: backlog.reduce((s, b) => s + b.writeLabels.length, 0),
    exposeBuckets: backlog.reduce((s, b) => s + b.exposeLabels.length, 0),
  };

  // Sitemap ka URL form (network call nahi — committed sitemap.xml). Kuch nahi
  // mila to sab verdict `not-in-sitemap` hain, jo apne aap bata deta hai ke
  // sitemap local nahi hai (CI mein) — jhoote fix ki taraf nahi bhejta.
  const sitemapLocs = new Set();
  if (fs.existsSync(SITEMAP_FILE)) {
    for (const m of fs.readFileSync(SITEMAP_FILE, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapLocs.add(m[1].trim());
  }
  const splits = variantSplits(allPages).map((s) => {
    const winnerIsSlash = s.variants[0].url.endsWith('/');
    return {
      ...s,
      ...classifySplit({
        winnerIsSlash,
        nativeForm: nativeFormFromTree(s.path),
        sitemapHasSlash: sitemapLocs.has(SITE_ORIGIN + s.path + '/'),
        sitemapHasNoSlash: sitemapLocs.has(SITE_ORIGIN + s.path),
      }),
    };
  });
  const splitLeak = {
    paths: splits.length,
    impressions: splits.reduce((sum, s) => sum + s.minorityImpressions, 0),
    configMismatch: splits.filter((s) => s.verdict === 'config-mismatch').length,
    consolidationLag: splits.filter((s) => s.verdict === 'consolidation-lag').length,
    notInSitemap: splits.filter((s) => s.verdict === 'not-in-sitemap').length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'data/gsc-query-page.json',
    window: { days, startDate: join.startDate, endDate: join.endDate },
    minImpressions: MIN_IMPR,
    totals: {
      canonicalPages: allPages.length,
      rawVariantPages: new Set(pairs.map((p) => p.page)).size,
      distinctQueries,
      pairImpressions: totalImpressions,
      propertyImpressions,
      joinCoverage,
      avgQueriesPerPage: avg(allPages.map((p) => p.distinctQueries)),
      avgQueriesTop25: avg(topPages.map((p) => p.distinctQueries)),
    },
    target: targetGap({ impressions: propertyImpressions, days, targets: [200000, 300000], runRateMonthly }),
    tierTable,
    topPages: topPages.map((p) => ({ ...p, queries: undefined })),
    splitLeak,
    splits,
    backlogSummary,
    backlog,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(OUT_DOC, buildDoc(report));

  console.log(`query reach: ${report.totals.canonicalPages} canonical pages · ${report.totals.distinctQueries} distinct queries · ${fmtNum(report.totals.pairImpressions)} impressions (${days}d)`);
  console.log(`tiers: ${tierTable.map((t) => `${t.tier}=${t.pages}`).join(' · ')}`);
  console.log(`variant splits: ${report.splits.length} paths (${fmtNum(report.splitLeak.impressions)} impr split) · config-mismatch=${report.splitLeak.configMismatch} · consolidation-lag=${report.splitLeak.consolidationLag}`);
  console.log(`target: 28d base ${fmtNum(report.target.perMonth)}/month → 200k=${report.target.targets[0].multiple}x · 300k=${report.target.targets[1].multiple}x` + (report.target.runRateMonthly ? ` | run-rate base ${fmtNum(report.target.runRateMonthly)}/month → 200k=${report.target.targetsFromRunRate[0].multiple}x` : ''));
  console.log(`backlog: ${backlogSummary.pages} pages → write=${backlogSummary.write} expose=${backlogSummary.expose} fine=${backlogSummary.fine} (${backlogSummary.writeBuckets} buckets to write, ${backlogSummary.exposeBuckets} to expose)`);
  console.log(`report: docs/QUERY-REACH.md · data/query-reach.json`);
}

if (require.main === module) main();

module.exports = {
  TIERS,
  INTENT_BUCKETS,
  normPage,
  reachTier,
  groupPairsByPath,
  pageReach,
  variantSplits,
  intentCoverage,
  visibleText,
  contentCoverage,
  planAction,
  targetGap,
  classifySplit,
  buildDoc,
};
