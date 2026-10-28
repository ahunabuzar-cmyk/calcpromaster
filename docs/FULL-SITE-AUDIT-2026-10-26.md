# Full Site Audit — CalcProMaster (calcpromaster.com)

_Report date: 2026-10-26 · Format: Markdown (no .docx) · Scope: the whole site, nothing skipped_

Aap ne paanch cheezein poochi thi. Ye report un paanchon ka jawab deti hai — **measure ki
gayi evidence ke saath, yaad se nahi**. Har number ka source command neeche likha hai
(§8), taake aap khud dobara chala kar check kar sakein.

| # | Sawal | Verdict | Ek line mein |
|---|-------|---------|--------------|
| 1 | Duplicate content + competitive keywords? | **1 asli bug mila — FIX ho gaya** | 18 locale × 1,422 = ~25,600 duplicate URLs crawler ko serve ho rahe the |
| 2 | Site hack hui hai? | **NAHI** | Published artifact mein koi injected content nahi |
| 3 | Crawl / index nahi ho raha? | **Root cause mila — FIX ho gaya** | Crawl budget duplicate locale URLs par jal raha tha; baaki 0 fixable blocker |
| 4 | Technically broken? | **NAHI** | 20 gates + 2,899 unit + 62 browser tests — 1 baseline drift thi, wo bhi theek |
| 5 | Competitors powerful hain? | **HAAN — aur strategy us hisaab se pehle se set hai** | Head terms brand-wall hain; 1,189 easy long-tails hi asli battleground |

**Is pass mein 6 files badli/bani** (§7). Sab kuch dobara verify kiya (§6).

---

## 1. Duplicate content + competitive keywords

### 1.1 🐛 Asli bug: localized URLs ne ~25,600 duplicate pages serve kiye

Ye sabse bara finding tha, aur ye pehle kisi report mein nahi tha.

Site ka language switcher 18 locale prefixes banata hai (`/es/`, `/hi/`, `/ur/`, `/fr/`,
`/de/`, `/pt/`, `/ar/`, `/ru/`, `/ja/`, `/zh/`, `/ko/`, `/it/`, `/nl/`, `/tr/`, `/id/`,
`/vi/`, `/th/`, `/bn/`). `deploy/` mein **koi locale folder nahi hai** — in URLs ko
`functions/_middleware.js` ka SPA fallback English shell (`index.html`) serve karta tha.

Crawler ko kya milta tha, ye measured:

| Cheez | Value | Matlab |
|---|---|---|
| `<html lang>` | `en` | English |
| `<link rel=canonical>` | `https://calcpromaster.com/` | Home page khud ko canonical keh raha tha |
| hreflang tags | **0** (poore site mein) | Koi localization signal hi nahi |
| Reachable permutations | 18 prefix × ~1,422 routes ≈ **25,600** | Har ek ek hi English home page ka clone |

Yani Google ke liye ye 25,600 alag URLs the jinme **same content** tha — classic
duplicate-content + crawl-budget waste. Site 1,420 pages index karane ki koshish kar rahi
thi jabke crawler ko 25,600+ URLs dikh rahe the.

**Fix** — `functions/_middleware.js` mein `X-Robots-Tag: noindex, follow`:

- Locale paths par header lagta hai (`withLocaleNoindex()`), HTML shell, SPA fallback aur
  normal asset responses — teenon raaston par.
- **`noindex`, redirect nahi** — is liye jo user apna localized link share kare, wo ab bhi
  khulta hai aur uska language mein render hota hai. Sirf search ko offer nahi hota.
- Consistency verified: poore site mein **0 hreflang tags** hain, is liye "hreflang →
  noindex page" jaisa contradictory GSC error ban hi nahi sakta. Aur locale URLs sitemap
  mein bhi nahi hain (**0 / 1420**).
- 2 naye unit tests (`tests/unit/redirect-middleware.test.js` — deep link + bare locale home
  + SPA-fallback case). Total middleware tests 24, sab pass.

### 1.2 200 non-sitemap pages — sab **jaan-boojh kar** noindex

`deploy/` mein 1,620 HTML pages hain, sitemap mein 1,420. Baaki 200 ka audit:

| Qism | Count | Status |
|---|---|---|
| Programmatic variants (`/finance/amortization/10-years-150000/` …) | 180 | ✅ `noindex, follow` + canonical parent par |
| Utility pages (`/favorites/`, `/compare/`, `/history/`, `/cookies`) | 4 | ✅ `noindex, follow` |
| `/embed/*` (iframes for doosri sites) | 9 | ✅ non-indexable by design |
| `/404`, `/og-image`, `/qa-dashboard`, `/googled1ac20b54b36e7cf` | 4 | ✅ (verification file indexable rehna **chahiye**) |
| **Indexable + sitemap se bahar** | **0** | — |

**Nateeja: ek bhi orphan indexable page nahi hai.** Ye page-by-page check kiya gaya tha,
count se nahi maana gaya.

### 1.3 N-gram duplication — regression nahi

| Metric | Baseline (10-19) | Aaj (10-26) | Verdict |
|---|---|---|---|
| Site duplicate share | 40.7% | 40.6% | ✅ behtar |
| Pages >40% duplicated | 949 | 947 | ✅ behtar |
| Duplicate titles | 0 | 0 | ✅ |
| Duplicate meta descriptions | 0 | 0 | ✅ |
| Pages under 400 words | 1 | 1 | ✅ |

`npm run seo:dup:compare` → **"no regression against the baseline"**.

Sabse shared blocks (1,285 tool pages par 96.7%) **template boilerplate** hain —
"your data never leaves your device", methodology line, editorial-policy line. Ye
intentional chrome hai, body copy nahi; budget + gate dono maujood hain.

### 1.4 Category ↔ hub duplication — PASS

20 category/hub pairs, mean overlap **52.1%**, max **58.4%** (limit 65%). Fix se pehle
~79.8% tha (`docs/DUPLICATE-HUBS-FIX.md`). Gate: `npm run check:category-dup`.

### 1.5 Cannibalization — 0 actionable

4,674 query→page pairs · 89 queries 2+ pages par split (joined impressions ka 4.6%) ·
**D1 consolidate 30 · D2 differentiate 77 · D3 guide-link missing 14 → 0** ·
**actionable (≥3 impressions weaker page par): 0**.

D1/D2 owner decisions hain (report hoti hain, auto-apply nahi) — `docs/CANNIBALIZATION-REPORT.md`.

### 1.6 Competitive/hard keywords — portfolio saaf

| Tier | Phrases | Meaning |
|---|---|---|
| 🟢 EASY (abhi jeeto) | **1,189** | 4+ words + intent qualifier — kam strong brands |
| 🟡 MEDIUM | 1,654 | 3 words — thodi links chahiye |
| 🔴 HARD (park) | **0** | head terms — brand wall |

1,285 tool pages par 2,843 targeted phrases. **7 pages** ke paas hard side-keyword tha —
saaton ke paas pehle se own EASY primary maujood hai. **Sirf 3 pages sirf hard par khade
the**, un teenon ke liye ek-ek easy replacement attached hai (`docs/HARD-KEYWORDS.md` §2).

Keyword gap: **476 covered · 26 weak (title/H1 fix — sabse sasta) · 81 gap (naya page)**.

---

## 2. Hack hui hai? — **NAHI**

`scripts/audit-site-security.cjs` (is pass mein naya likha) `deploy/` ke 3,042 files par
chalta hai — 1,620 HTML pages, published artifact — aur compromise ke wo nishaan dhoondta
hai jo HTML mein chhoote hain.

| Check | Finding |
|---|---|
| Hidden link blocks (display:none / visibility:hidden / font-size:0 / text-indent:-9999) | **0** |
| Spam pages (pharma/casino/judi/sbobet/hacked-by vocabulary) | **0** |
| Foreign-script title spam (non-i18n page par) | **0** |
| Injected iframes (allowlist se bahar) | **0** |
| JS redirects off-allowlist hosts par | **0** |
| Unexpected `<meta http-equiv=refresh>` | **0** |
| Files jo ship nahi hone chahiye (.php, .exe, .zip, .sh, .jsp, .aspx …) | **0** |
| Risky scripts (eval / new Function / atob / unescape / document.write / fromCharCode) | **0** |

### 2.1 Off-allowlist outbound hosts — citations hain, injected links nahi

36 hosts mile. Sab **primary sources** hain jinhe `js/confidence-notes.js` cite karta hai:

| Host | Links | Qism |
|---|---|---|
| www.consumerfinance.gov | 66 | US regulator |
| www.federalreserve.gov | 64 | Central bank |
| www.irs.gov | 49 | Tax authority |
| www.investor.gov | 26 | SEC investor education |
| fred.stlouisfed.org | 17 | St. Louis Fed data |
| nist.gov, cdc.gov, who.int, nih.gov, ftc.gov, dol.gov, bls.gov, nhtsa.gov, occ.gov, finra.org, imf.org, bipm.org, khanacademy.org, investopedia.com … | 1–11 each | Standards / regulators / education |

Ye "review leads" ke tor par print hote hain — **kabhi build fail nahi karte**, kyunki naya
citation (jaise irs.gov) add karna ek legitimate reason hai.

### 2.2 Do risky-script hits — verified legitimate

`/qa-dashboard` par `atob()` aur `unescape()` mile. Wajah: ye internal QA page har
calculator ka **source code** page par print karta hai, aur Base64 Encode/Decode
calculator apna hi `atob`/`btoa`/`unescape` formula string ke andar dikhata hai. Rule ke
liye ek documented exemption add ki (`RISKY_SCRIPT_EXEMPT`), aur exemption
`exemptedRiskyScripts` ke tor par **output mein visible** rehti hai — chhupai nahi jati.

### 2.3 Fix — check ab permanent hai

Scanner ko CI mein daal diya (`npm run audit:security:check`, build ke baad chalta hai,
artifact upload ke saath). Naya injection finding aaya to build **fail** hoga.

### 2.4 Honest limit

Ye scan **published artifact** ko prove karta hai — CDN hack ya runtime-only payload is se
nazar nahi aata. Jo baat confidently kahi ja sakti hai: jo hum publish karte hain usme kuch
inject nahi hai.

---

## 3. Crawl / index nahi ho raha

### 3.1 Site-side sab theek hai

| Check | Result |
|---|---|
| Sitemap URLs | 1,420 |
| Sitemap URLs statically covered | **1,420 / 1,420** (0 missing) |
| Sitemap URLs jo live 200 + `<title>` dete hain | **1,420 / 1,420** |
| Index-ready (SEO indexing audit) | **1,420 / 1,420** — 0 fail, 0 warn, 0 noindex |
| Head criteria (10/10) | **1,420 / 1,420** |
| Canonical | Koi page do URL forms par answer nahi karta; har canonical self-reference; 0 link redirect par depend |
| Internal links checked | 114,313 — **0 broken** |
| Redirect targets | 38 — sab resolve |

### 3.2 Asli index status (Google Search Console se)

| Metric | Value |
|---|---|
| Indexed | **952** |
| Not indexed | **923** (50.8% indexed) |
| Not-indexed reasons | URL unknown to Google **374** · Discovered–not indexed **255** · Crawled–not indexed **2** |
| Run-rate | 290–564 impressions/week (snapshots ke darmiyan) |

`docs/NOT-INDEXED-FULL-AUDIT.md`: 631 not-indexed pages audit hue → **0 fixable technical
blocker**. Sab clean hain (built, `index,follow`, self-canonical, titled, sitemap mein).

`docs/DISCOVERED-FALLBACK-ANALYSIS.md`: 133 ka "Discovered → unknown" backslide ek
**two-way queue churn** tha (133 ne chhoda, 105 ne pakda — net −28), page-level defect
nahi. Inlinks dono groups mein **median 14** the — links se ye fallback explain nahi hota.

Index regressions: **798 transitions, 0 regressions, 0 new not-candidates, 0
duplicate-canonical**.

### 3.3 Root cause jo **hamare** control mein tha — aur fix ho gaya

Yahi asli jawab hai: site apne 1,420 pages index karane ki koshish kar rahi thi, jabke
crawler ko **~25,600 duplicate locale URLs** dikh rahe the (§1.1). Crawl budget wahan jal
raha tha. Wo duplication hata di gayi.

Bacha hua kaam page-side **nahi** hai (§9 mein owner actions).

---

## 4. Technically broken? — **NAHI**

### 4.1 Gates (sab PASS)

| Gate | Result |
|---|---|
| JS syntax | 493 files, **0 failed** |
| Whole-site bug audit (1,619 pages) | duplicate IDs **0** · broken links **0** · title issues **0** · duplicate titles **0** · desc issues **0** · duplicate descs **0** · h1 issues **0** · canonical mismatch **0** · JSON-LD errors **0** · missing alt **0** · insecure self-links **0** |
| Built-page audit | 1,515 routes · low-inlink (>1) **0** · social-tag problems **0** · schema defects **0** |
| Structured data | 3,054 JSON-LD blocks — **sab parse** |
| Sitemap coverage + 404 catch-all | ✅ PASS |
| Canonical URLs | ✅ PASS |
| URL format | **0 FAIL** (sirf WARN/INFO: category word repeat, stop words) |
| Quality gate (sitemap eligibility) | 1,420/1,420 · failures **0** |
| SEO overrides rendered | 74 CTR overrides + 67 label repairs — ✅ |
| SEO placeholders | **0** findings (10 classes) |
| Performance budgets | eager JS 0/1600KB · index.html 37/50KB · styles 89/110KB · fonts 69/120KB · sitemap 250/600KB → ✅ |
| Live routing (deploy/ HTTP par serve karke) | 43 prefixes 200 · 5 assets correct content-type · 1,420 sitemap URLs 200 · 38 redirects · unknown paths **true 404** (soft-404 shell nahi) |
| Soft 404 | 24 redirect · 2 not-found · 10 SPA shell (by design, client-rendered) |

### 4.2 Tests

| Suite | Result |
|---|---|
| Unit (`vitest`) | **2,899 pass / 104 files** |
| Browser smoke (`playwright`, deploy artifact) | **62 pass / 2 skip** — 1,285 calculator routes 200+HTML, mobile 375px no overflow, BMI + loan-emi + temperature compute, share-URL state, `_redirects` rules |

### 4.3 Ek gate red thi — wajah fix ki gayi

`npm run check:page-drift` par: `hundredsPages 1 → 2`, `backlogExpose 8 → 9`.
Ye **code regression nahi** thi — GSC export 9 din aage badh gaya
(`data/gsc-page-impressions.json` refresh), aur wo do **reach** metrics data se chalti hain.
Structural counts (sitemap URLs, deploy pages, tool ids, missing pages, duplicate `<loc>`)
mein **zero drift** tha. Documented remediation (`-- --update`) se baseline refresh kiya,
gate ab PASS.

### 4.4 🐛 Freshness bug mila — FIX ho gaya (E-E-A-T)

`build-deploy.js` `deploy/` ko **har build par delete aur rebuild** karta hai. Is liye
mtime-based guard hamesha "fresh" lagta tha, aur `stampReviewDates()` **har build par
saare 1,620 pages ko aaj ki date** de deta tha. Measured 2026-10-25: **3 files** badli, aur
**har page** keh raha tha "Last reviewed: 2026-10-25".

Ye ek freshness signal hai jise Google ke paas trust karne ki koi wajah nahi thi (aur
editorial policy khud cosmetic redating forbid karti hai).

**Fix:** mtime ki jagah **content hash** (`data/review-dates.json` ledger). Unchanged
content apni purani date rakhta hai; sirf asli edit date ko hilata hai. Schema
`dateModified` bhi isi date ke saath lockstep mein rehta hai.

**Verification (aaj, full rebuild ke saath):** 3 pages ko ledger mein jaan-boojh kar
`2020-01-01` set kiya → poora build chalaya → **wahi 3 pages apni 2020 date ke saath
reh gaye**, baaki sab ne build date li. Mechanism proved. Phir ledger restore kar ke
dobara build kiya — sab pages 2026-10-26 par clean hain (koi artificial date nahi bachi).

---

## 5. Competitors powerful hain?

**Ji haan — aur ye pehle se measure kiya hua hai, anuman nahi.**

### 5.1 Head terms = brand wall

6 live SERP probes (2026-09-19, Google) — site **kisi bhi probed keyword par top-10 mein
nahi** hai. Jo rank karte hain: **calculator.net, omnicalculator, calculator soup,
Khan Academy, Symbolab, MathPapa, Groww, NerdWallet** — DR 70–90 brands.

Probe verdicts: `home loan emi + monthly prepayment` EASY-MEDIUM · `concrete volume cubic
yards` HARD · `cgpa to percentage` MEDIUM · `quadratic solver with steps` HARD (`6/10`
education giants) · `gravel driveway tons` MEDIUM-HARD · `bmr calculator for women over 50`
MEDIUM (exact phrase par **koi page target nahi kar raha** — best intent gap).

### 5.2 Jahan jeeta ja sakta hai

Winnable pattern — **niche microsites giants ko harate hain jab query poori tarah
specified ho**: `smartemicalc.com`, `cgpatopercentge.com`, `cgpa2percent.com`. Isi liye
portfolio par **0 hard primaries** hain aur **1,189 EASY** targets, har ek ka apna page
maujood. **Gap authority/links ka hai, content ka nahi.** YMYL finance heads
(loan/EMI/CAGR/FD) explicitly excluded — wahan har probe mein 5+ fintech brands hain.

### 5.3 Bharosay ke saath improve karne wale pages (measured demand, kamzoor position)

| Page | Impressions (28d) | Distinct queries | Clicks |
|---|---|---|---|
| `/lifestyle/home-insurance` | 1,003 | 75 | **0** |
| `/finance/apy-calculator` | 263 | 63 | — |
| `/health/bmr-mifflin` | 261 | 77 | — |
| `/guides/business-days` | 219 | 165 | — |

Naya content likhne se pehle **inhi** pages ko theek karna chahiye.

### 5.4 Competitive-gap items (benchmark vs leading sites)

**8 Done** (grapher, step-by-step working, geometry lab, live currency, bylines,
methodology notes, ratings, review dates) · **3 Partial** (live reference rate — keyless
free benchmark API nahi hai; usage counter — sirf real data par render hota hai; byline —
ships empty on purpose, koi invented name nahi) · **1 Deferred** (TWA packaging) ·
**1 Blocked** (user accounts — paid backend + auth decision, owner ka faisla chahiye).

---

## 6. Verification (is report ke numbers kahan se aaye)

Sab figures rebuilt `deploy/` tree se aaj liye gaye:

```
node build-deploy.js
npm run test:unit                        # 2,899 pass / 104 files
npx playwright test tests/e2e/deploy-smoke.spec.js --config=playwright.deploy.config.js
                                         # 62 pass / 2 skip

node scripts/audit-site-security.cjs --fail        # 0 injection findings
node scripts/audit-site-bugs.cjs                   # 1,619 pages · 0 across 11 checks
node scripts/audit-built-pages.cjs                 # 1,515 routes · 0 defects
node scripts/check-canonical-urls.cjs              # 114,313 links · PASS
node scripts/check-structured-data.cjs             # 3,054 blocks · PASS
node scripts/check-sitemap-coverage.cjs            # 1,420/1,420
node scripts/check-page-count-drift.cjs            # 0 drift
node scripts/audit-head-criteria.cjs               # 1,420/1,420 · 0 failures
node scripts/audit-seo-placeholders.cjs            # 0 findings
node scripts/audit-url-format.cjs --fail-on-issue  # 0 FAIL
node scripts/audit-cannibalization.cjs             # 0 actionable
node scripts/perf-budgets.cjs                      # ALL PASS
node scripts/quality-gate.cjs                      # failures 0
node scripts/verify-seo-overrides.cjs              # 141 overrides rendered
node scripts/live-routing-guard.cjs                # ALL PASS
node scripts/syntax-check.js                       # 493 files · 0 failed
npm run seo:dup:compare                            # no regression
```

Supporting evidence files: `data/site-security-audit.json`,
`data/duplicate-content-report.json`, `data/cannibalization-audit.json`,
`data/index-burndown.json`, `data/page-count-baseline.json`, `seo-indexing-audit.json`.

---

## 7. Kya badla (is pass mein)

| File | Change | Kyun |
|---|---|---|
| [functions/_middleware.js](../functions/_middleware.js) | Locale paths par `X-Robots-Tag: noindex, follow` | ~25,600 duplicate English-clone URLs search se hataane ke liye |
| [tests/unit/redirect-middleware.test.js](../tests/unit/redirect-middleware.test.js) | 2 naye tests (deep link, bare locale home, SPA fallback) | Fix lock karna taake wapas na toote |
| [build-deploy.js](../build-deploy.js) | mtime ki jagah content-hash review-date stamp + `data/review-dates.json` | Har build par 1,620 pages ki cosmetic redating band |
| [scripts/audit-site-security.cjs](../scripts/audit-site-security.cjs) | **Naya** — injection/hack scanner, `--fail` mode, documented exemption | Hack-check reproducible + CI-gated |
| [package.json](../package.json) | `audit:security`, `audit:security:check` scripts | Scanner ko command banane ke liye |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Security gate + artifact upload (build ke baad) | Check permanent — naya injection build fail karega |
| [data/page-count-baseline.json](../data/page-count-baseline.json) | Baseline refresh (`-- --update`) | 9 din ka GSC data drift; structural counts unchanged |

---

## 8. Jo abhi bhi baaki hai — aur **sirf aap** kar sakte hain

Ye repo se nahi ho sakta; in par report imaandaar hai:

1. **GSC → Request Indexing** — top URLs ke liye, ~12/din. Site-side sab clean hai, baaki
   Google ka crawl budget hai. (`docs/REQUEST-INDEXING-TOP40.md`)
2. **3–5 asli backlinks** — yahi crawl appetite badhata hai aur EASY keywords ko unki
   position dilata hai. Service-side, repo se bahar.
3. **Custom domain** — hosted subdomain har EASY keyword ka ceiling cap karta hai
   (`docs/CUSTOM-DOMAIN-PLAN.md`).
4. **User accounts ka faisla** — blocked item; paid backend + auth chahiye, is liye
   poocha ja raha hai (`docs/COMPETITIVE-GAP-STATUS.md` item 6).
5. **Real reviewer ka naam** — byline jaan-boojh kar empty ship hoti hai; koi invented
   name nahi dala jayega (`docs/REVIEWER-BYLINES.md`).
6. **Naya outbound citation host add karte waqt** `npm run audit:security` chalayein, taake
   allowlist update ho jaye.
7. **81 keyword gaps** — naye pages ka kaam (audit nahi, content project);
   `docs/KEYWORD-GAP.md` mein poori list + volume/difficulty ke saath hai.

---

## 9. Imaandaar limits (jo ye report prove **nahi** karti)

- Repo mein **live ranking / search-volume / backlink data nahi hai**. Keyword difficulty
  ek structural proxy + 6 live probes hai — asli numbers GSC credentials ke saath aayenge
  (`docs/api-credentials-setup.md`).
- Security scan **published artifact** check karta hai; CDN-level ya runtime-only
  compromise is se nazar nahi aata.
- 10 SPA shell responses par soft-404 static check **decide nahi kar sakta** (`--render`
  browser chahiye). Live routing guard ne alag se confirm kiya ke unknown paths **true 404**
  dete hain.
- Ek GSC snapshot reality se peeche ho sakta hai — ek transition ek **hint** hai, verdict
  nahi. Do consecutive snapshots ek jaisi hon to evidence banti hai.
