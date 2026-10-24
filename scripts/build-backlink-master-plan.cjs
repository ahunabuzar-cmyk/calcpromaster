#!/usr/bin/env node
/* build-backlink-master-plan.cjs
 * Merges every existing backlink list in docs/, de-duplicates by domain, classifies
 * each entry into an honest quality tier, and writes:
 *   docs/BACKLINK-MASTER-PLAN.md
 *   docs/BACKLINK-MASTER-PLAN.docx
 * No dependencies. No plaintext passwords. White-hat framing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

/* ---------------- load + parse existing lists ---------------- */
const entries = [];
const push = (e) => entries.push(e);

// 1) The 500-pack markdown: "- **N. Name** — url — label — note"
const pack500 = path.join(DOCS, 'BACKLINK-500-MASTER-PACK.md');
if (fs.existsSync(pack500)) {
  let cat = '';
  for (const line of fs.readFileSync(pack500, 'utf8').split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s+\((\d+)\s+sites?\)/);
    if (h) { cat = h[1].trim(); continue; }
    const m = line.match(/^-\s+\*\*(.+?)\*\*\s+—\s+(\S+)\s+—\s+(.+?)(?:\s+—\s+(.+))?$/);
    if (m) push({ name: m[1].replace(/^\d+\.\s*/, '').trim(), url: m[2].trim(), login: m[3].trim(), note: (m[4] || '').trim(), cat });
  }
}

// 2) The 1000-queue CSV: category,site,url,login_needed,link_type,notes,priority
const queue = path.join(DOCS, 'BACKLINK-1000-QUEUE.csv');
if (fs.existsSync(queue)) {
  const rows = fs.readFileSync(queue, 'utf8').split(/\r?\n/);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.trim()) continue;
    const parts = r.split(',');
    if (parts.length < 4) continue;
    const [category, site, url, login, linkType, ...rest] = parts;
    push({ name: site.trim(), url: url.trim(), login: login.trim(), note: (linkType || '').trim() + (rest.length ? ' ' + rest.join(',').trim() : ''), cat: category.trim() });
  }
}

/* ---------------- de-duplicate by domain ---------------- */
function domainOf(u) {
  try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return u.toLowerCase(); }
}
const seen = new Map();
for (const e of entries) {
  const d = domainOf(e.url);
  if (!d) continue;
  if (!seen.has(d)) seen.set(d, e);
  else seen.get(d).dup = true; // same domain appears more than once
}
const uniq = [...seen.values()];

/* ---------------- honest classification ---------------- */
const AVOID_RE = /skip|dead\b|ab band|duplicate|paid hai|paid ho sakti|Cloudflare block|dhyan rakho|yahan kaam nahi|no kar|n\/a\b|corner|block karta|403/i;
function tierOf(e) {
  const blob = (e.name + ' ' + e.note + ' ' + e.login).toLowerCase();
  if (AVOID_RE.test(blob)) return 'AVOID';
  const d = domainOf(e.url);
  if (TIER_A.has(d)) return 'A';
  const cat = (e.cat || '').toUpperCase();
  if (/WEB2\.0|WEB2|PROFILE|AWESOME|PDF|FORUM|QA|STARTUP|INFRA|NICHE/.test(cat)) return 'B';
  return 'C';
}
const TIER_A = new Set([
  'producthunt.com', 'alternativeto.net', 'saashub.com', 'crunchbase.com', 'github.com',
  'news.ycombinator.com', 'reddit.com', 'indiehackers.com', 'dev.to', 'hashnode.com',
  'medium.com', 'linkedin.com', 'quora.com', 'stackshare.io', 'g2.com', 'capterra.com',
  'getapp.com', 'softwareadvice.com', 'trustradius.com', 'slant.co', 'libhunt.com',
  'openalternative.co', 'uneed.best', 'fazier.com', 'devhunt.org', 'microlaunch.net',
  'peerlist.io', 'startupstash.com', 'f6s.com', 'startupblink.com', '1000.tools',
  'postmake.io', 'sideprojectors.com', 'tinystartups.com', 'tinylaunch.com', 'about.me',
  'business.google.com', 'bingplaces.com', 'stackoverflow.com', 'peerlist.io'
]);
for (const e of uniq) e.tier = tierOf(e);
const A = uniq.filter((e) => e.tier === 'A');
const B = uniq.filter((e) => e.tier === 'B');
const C = uniq.filter((e) => e.tier === 'C');
const AVOID = uniq.filter((e) => e.tier === 'AVOID');

/* ---------------- markdown build ---------------- */
const NAME = 'CalcProMaster';
const SITE_URL = 'https://calcpromaster.com';
const TAGLINE = '1,282 free calculators that show every formula and step';
const DESC = 'CalcProMaster is a free library of 1,282 calculators covering finance, health, math, construction and everyday math. Every calculator shows the exact formula and every calculation step - no black-box answers. No signup, no paywall, 100% in-browser.';
const SHORT = '1,282 free online calculators - loan EMI, mortgage, BMI, percentage, GPA and more. Every formula shown, every step explained. Free forever.';
const KEYWORDS = 'free online calculators, loan EMI calculator, mortgage calculator, BMI calculator, percentage calculator, GPA calculator, compound interest calculator, calorie calculator, free math tools, step by step calculator';
const BIO = 'Building CalcProMaster, 1,282 free online calculators that show every formula and step. ' + SITE_URL;

const M = [];
const H1 = (t) => M.push('# ' + t, '');
const H2 = (t) => M.push('## ' + t, '');
const H3 = (t) => M.push('### ' + t, '');
const P = (t) => M.push(t, '');
const BUL = (t) => M.push('- ' + t);

H1('CalcProMaster - Backlink Master Plan (Quality-First, Google-Safe)');
P('Generated 2026-10-04 from every existing list in docs/ (500-pack + 1000-queue), de-duplicated by domain and split into honest quality tiers.');
P('Total unique free targets found: **' + uniq.length + '**  (Tier A ' + A.length + ' / Tier B ' + B.length + ' / Tier C ' + C.length + ' / do-not-use ' + AVOID.length + ').');

H2('0. Pehle sach: "2000 backlinks" kyun galat target hai');
P('Main seedha batauunga, kyunki aap ne khud kaha tha "Google ka rule break na ho":');
BUL('**2000 hand-verified high-quality free sites exist nahi karte.** Duniya me genuinely acchi, free, relevant backlink sources ki tadaad sainkdon me hai, hazaron me nahi.');
BUL('**2000 mass submissions = link scheme.** Google ki spam policy (link spam) me "excessive link exchanges" aur "low-quality directory/profile links at scale" saaf likha hai. Ye aap ke naye domain par **manual action / devalue penalty** ka seedha risk hai.');
BUL('**Naye domain par spike = red flag.** 2-hafte purane site par ek hafte me 2000 links = algorithm ke liye unnatural. Isi liye velocity cap zaroori hai.');
P('Toh is doc ka number 2000 nahi - ye **' + uniq.length + ' real targets** hain, aur in me se bhi sirf **Tier A + B (~' + (A.length + B.length) + ')** worth doing hain. Ye zyada honest hai aur zyada mehfooz.');

H2('1. Tee link engines (asli scaling yahin se aati hai)');
H3('Engine 1 - Directories & communities (ye doc)');
P('One-off listings. Har ek = ek backlink. Safe, par limited. Ye base trust layer banati hain, shortcut nahi.');
H3('Engine 2 - Link magnets (ye hazaron links de sakta hai, white-hat)');
BUL('Embeddable calculator widgets (aap ka /embed/ already mojood) - har blogger jahan embed kare = ek natural editorial link. Ye "2000" ka **legit** raasta hai.');
BUL('Free data study / infographic (e.g. "cost of living calculator data 2026") - journalists aur bloggers khud link karte hain.');
BUL('Open-source repo + awesome-list PRs - developer community link karti hai.');
H3('Engine 3 - Editorial / digital PR');
P('HARO-style quotes, guest posts, resource-page outreach. Nofollow ya dofollow - dono brand + crawl signal dete hain.');

H2('2. Safe daily cadence (aap 4-5/din chahte the)');
P('4-5/din chalega, **par sirf mixed tiers me**, aur pehle 2 hafte dheere:');
BUL('Week 1-2: 2/din (Tier A only) - foundation');
BUL('Week 3-4: 3/din (Tier A + B)');
BUL('Month 2+: 4-5/din (A + B + link-magnet outreach), never more than ~3 new directory links/day');
P('Roz ek tracker row likho: docs/backlink-tracker.csv (Platform, URL, DR, Status, Date, Anchor, Notes).');

H2('3. Universal paste-ready content (har site me yehi, par ek sentence badal do)');
P('Site name: ' + NAME);
P('URL: ' + SITE_URL);
P('Tagline / short: ' + SHORT);
P('Long description: ' + DESC);
P('Keywords: ' + KEYWORDS);
P('Bio: ' + BIO);
P('**Rule:** har platform par description ka ek sentence badlo - identical text do jagah = weak signal. Anchor 90% brand (CalcProMaster) ya naked URL rakho, keyword anchor sirf jab editorially natural ho.');
P('**Security:** is doc me koi password nahi hai. Purane 500-pack me plaintext password tha - usko delete karo; har site par strong **unique** password rakho (password manager).');

H2('4. Tier A - highest quality first (' + A.length + ' targets)');
P('Ye sabse pehle karo. High-DR, relevant, mostly dofollow ya strong brand signal.');
A.forEach((e, i) => BUL('**' + (i + 1) + '. ' + e.name + '** - ' + e.url + ' - ' + e.login + (e.note ? ' - ' + e.note : '')));

H2('5. Tier B - solid, use with care (' + B.length + ' targets)');
P('Web 2.0 / profiles / awesome-list PRs / forums. Useful, par inka weight kam hai - quality content ke saath hi karo, blast nahi.');
B.forEach((e, i) => BUL('**' + (i + 1) + '. ' + e.name + '** - ' + e.url + ' - ' + e.login + (e.note ? ' - ' + e.note : '')));

H2('6. Tier C - volume layer, CAP it (' + C.length + ' targets)');
P('Bookmarks / general directories / local / comments. Ye Google ke liye weakest signals hain. Inme 4-5/din se zyada na karo, warna spam footprint banta hai. Zyada se zyada 2-3 hafte me khatam karo, phir ruk jao.');
C.forEach((e, i) => BUL('**' + (i + 1) + '. ' + e.name + '** - ' + e.url + ' - ' + e.login + (e.note ? ' - ' + e.note : '')));

H2('7. DO NOT USE (' + AVOID.length + ' entries) - spam/dead/paid');
P('Ye list intentionally alag rakhi hai. In par submit karne se fayda nahi, ya nuksaan ho sakta hai (paid links Google policy violation).');
AVOID.forEach((e, i) => BUL(e.name + ' - ' + e.url + (e.note ? ' (' + e.note + ')' : '')));

H2('8. Verification & tracker');
BUL('Har submit se pehle URL ek baar curl karke check karo (site chal rahi hai?).');
BUL('Har submission ka row docs/backlink-tracker.csv me likho.');
BUL('Har hafte: kitne Live hue (approval email inbox + spam dekho).');
BUL('Koi bhi site jo 30 din me approve na ho - chhod do, dobara spam mat karo.');

H2('9. Honest expectation');
P('Directory links = base trust layer. Rank movement 4-8 hafte me. Asli tez asar tab jab: (a) domain 200 ho, (b) GSC Request Indexing chale, (c) 4-6 asli editorial links (widget embeds / data study / guest post) milein.');

const md = M.join('\n') + '\n';
const mdOut = path.join(DOCS, 'BACKLINK-MASTER-PLAN.md');
fs.writeFileSync(mdOut, md);
console.log('WROTE', path.relative(ROOT, mdOut), md.length, 'chars');
console.log('TIERS: A=' + A.length + ' B=' + B.length + ' C=' + C.length + ' AVOID=' + AVOID.length + ' TOTAL=' + uniq.length);
if (process.env.DEBUG_TIERS) { console.log('A domains:', A.map((e) => domainOf(e.url)).join(',')); console.log('uniq sample:', uniq.slice(0, 8).map((e) => domainOf(e.url) + '=>' + e.tier).join(', ')); }

/* ---------------- DOCX ---------------- */
const { convert } = require('./md-to-docx.cjs');
const docxOut = path.join(DOCS, 'BACKLINK-MASTER-PLAN.docx');
fs.writeFileSync(docxOut, convert(md));
console.log('WROTE', path.relative(ROOT, docxOut), fs.statSync(docxOut).size, 'bytes');
