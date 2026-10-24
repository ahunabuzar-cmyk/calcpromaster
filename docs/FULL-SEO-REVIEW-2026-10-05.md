# Full SEO Review — calcpromaster.com

> **UPDATE (5 Oct 2026): R1 FIXED + DEPLOYED.** Naya build production par hai
> (`npx wrangler pages deploy deploy --project-name=calcpromaster`). Live `.com`
> ab slash-canonical (`/health/pf-ratio/`), trimmed titles, aur crawl-link boost
> serve kar raha hai — raw HTML se verified. Ab R2 (indexation), R3 (authority)
> aur Request Indexing pe focus karo.

**Date:** 5 October 2026
**Reviewer:** automated audit (live GSC API + live site inspection + repo build diff)
**Scope:** calcpromaster.com — 1282 calculators, 1415 sitemap URLs

---

## 0. TL;DR (seedha jawab)

Aapki site **rank nahi kar rahi** — yeh galat nahi hai, lekin **poori baat** yeh hai:

1. **Site rank KAR RAHI hai, magar page 3–4 par** — 28 din mein **8,600 impressions**, sirf **12 clicks**, average position **37.2**. Matlab Google dikhata hai par pehle page par nahi.
2. **Sabse bada blocker = jo code repository mein fix hai, wo LIVE nahi hai.** Live site ek **purana build** serve kar raha hai: galat canonical + purane lambe titles. Google abhi bhi purana version judge kar raha hai.
3. **Authority almost zero** — external backlinks ~0. 2–3 hafte purana domain + 0 links = competitive top-10 abhi realistic nahi.
4. **Sirf ~32% pages indexed** (375/1167) — naya domain, crawl budget throttle. Normal hai, temporary hai.

In teen cheezon ka fix, is order mein: **(A) naya build deploy karo → (B) 4–6 asli dofollow backlinks → (C) GSC se top pages ko Request Indexing.** Sab white-hat.

---

## 1. Review method (maine kaise audit kiya)

Ek proper full-site SEO review 6 layers par hota hai. Main ne yeh chalaye:

| # | Layer | Lever used | Status |
|---|---|---|---|
| 1 | **Ranking reality** (kaunse query pe kahan dikhte ho) | GSC Search Analytics API (28 din, fresh token) | ✅ |
| 2 | **Indexation** (kitne pages Google ke index mein) | `data/gsc-coverage-report.json` snapshot | ✅ |
| 3 | **Technical** (robots, sitemap, canonical, redirect, meta) | live `robots.txt` / `sitemap.xml` fetch + browser se head inspect | ✅ |
| 4 | **On-page** (title, meta, H1, internal links) | local build (`deploy/`) vs live page compare | ✅ |
| 5 | **Autority/off-page** (backlinks, brand) | `docs/offpage-seo-status.md` + GSC links | ⚠️ data mojood |
| 6 | **Content quality/scale** (thin/duplicate risk) | repo + sitemap shape analysis | ✅ |

Yeh method har baar chalayi ja sakti hai — neeche "Appendix" mein exact commands hain.

---

## 2. Live data snapshot (GSC, 28 din)

```
clicks = 12
impressions = 8,600
CTR = 0.1%
average position = 37.2
```

- **Impressions 8,600 hain par clicks 12** — matlab impressions zyadatar page 3–4 se aa rahe hain, jahan log click nahi karte.
- **Top pages** jaise `/health/pf-ratio/` (53 impr, pos 53), `/regional/canada-take-home-salary/` (30 impr, pos 54) — position 40–70.
- Jo thodi bahut **top-10** positions hain, wo sab **long-tail/brand** hain (e.g. `cron validate` pos 4, `education/semester-gpa` pos 1).

**Nateeja:** problem "index nahi" nahi, problem **"top-10 nahi"**.

---

## 3. Findings — impact ke hisaab se ranked

### 🔴 R1 — Live site PURANA build serve kar raha hai (SABSE BADA)

**Proof (aaj ka live inspection, browser se):**

| Page | LIVE canonical | LOCAL repo build canonical |
|---|---|---|
| `/auto/parking-cost/` | `…/auto/parking-cost` ❌ (bina slash) | `…/auto/parking-cost/` ✅ |
| `/health/pf-ratio/` | `…/health/pf-ratio` ❌ | `…/health/pf-ratio/` ✅ |

- Live homepage title: `CalcProMaster — 1282+ Free Online Calculators for Finance, Health, Math & More` (82 chars, purana)
- Local build title: `CalcProMaster — 1282+ Free Online Calculators` (trimmed, naya)

Yani repo mein fixes (title gate, slash-canonical, quality) pade hain, par **deploy nahi hue**. Google purana version crawl kar raha hai. **Yeh ek deploy se poori site ki freshness + canonical theek karta hai.**

> ⚠️ Deploy aapki permission se hi hoga — ye report sirf batati hai ke ye #1 lever hai.

### 🔴 R2 — Trailing-slash canonical contradiction (isliye har tool GSC mein DOUBLE dikhta hai)

Live tool page ka final URL `…/parking-cost/` (slash) hai — Cloudflare 301 karta hai slash form par.
Lekin live **canonical** `…/parking-cost` (bina slash) batata hai.

GSC page data mein har tool **do baar** hai:
- `/auto/bike-loan` (11 impr, pos 73.5) **aur** `/auto/bike-loan/` (27 impr, pos 56.9)
- `/auto/parking-cost` (40 impr, pos 16.7) **aur** `/auto/parking-cost/` (1 impr, pos 77)

Jab canonical aisi URL par point karta hai jo khud redirect ho jati hai, Google us canonical ko **ignore** kar deta hai → signal split, ranking dilute. **Local repo build already isko fix karta hai** (source mein `toSlashForm` hai — `scripts/ssg-pages.cjs` lines 606–617, comment bhi yahi cause likhta hai). Deploy hone par yeh consolidate ho jayega.

### 🟠 R3 — Sirf 32% pages indexed (375 / 1167)

- Snapshot (2026-10-02): **INDEXED 375 · UNKNOWN 445 · DISCOVERED 339 · CANONICAL 3 · REDIRECT 2**
- `Discovered + Unknown = 784` pages abhi index mein nahi.
- Cause: 2-hafte purana domain — Google naye site ka crawl budget throttle karta hai. Normal aur temporary.

Fix (white-hat): top pages ko GSC se **Request Indexing** (green/money pages pehle), already-indexed pages se not-indexed pages ko link, aur pages ko genuinely deepen karna.

### 🟠 R4 — Authority ≈ ZERO (off-page)

- Google mein external backlinks: **0**. SEMrush: 1 referring domain.
- 1,331-URL site + 0 authority = competitive "loan calculator" jaise terms top-10 mein aana realistic nahi.
- **No code change isse substitute nahi kar sakta.** Directory/editorial links hi base trust banayenge.
- Ready assets: `docs/directory-submission-pack.md`, `docs/alternativeto-listing.md`, `docs/reddit-community-answers.md`.

### 🟡 R5 — Scale / near-duplicate risk (1282 programmatic pages)

Itne zyada templated calculator pages Google ko "mass-produced thin content" jaisa lag sakte hain. Sab pages unique titles/formula rakhte hain (quality gate PASS), lekin **sirf wahi pages index karao jahan asli value ho** — baaki ko crawl hone do, zabardasti index karana nahi. 36 enhanced pages (`js/tool-enhance.js`) template ke liye best hain: real formula + verified data table + internal links.

### 🟡 R6 — Purana 503 damage (recovering)

Netlify pause hone par `.com` ne 503 serve kiya → Google ne crawl/trust khoya. Ab site 200 hai. Recovery ke liye: kuch nahi karna, bas **consistent 200** rakhna aur "Validate fix" GSC mein. **Kabhi hosting dobara pause na karo.**

### 🟡 R7 — Query/CTR profile

Impressions ka bada hissa ajeeb long-tail queries se aa raha hai (jaise `+mifflin st jeor equation women 10 weight 6.25 height 5 age 161`). Yeh low-intent/low-volume hain, isliye CTR 0.1%. Ismein jaan nahi — focus branded + mid-tail terms par hona chahiye.

---

## 4. Jo pehle se healthy hai (dobara mat karo)

- ✅ `robots.txt` — sab crawlers (Google, Bing, AI bots) allow; sitemap correct.
- ✅ `sitemap.xml` — 1415 URLs, 0 noindex entries (crawl budget waste nahi).
- ✅ Prerendered HTML (SEO-friendly), metadata `index, follow`.
- ✅ Internal links — har tool page par ≥3 contextual inlinks.
- ✅ Title gate (30–70 chars), quality gate, perf budgets — sab PASS.
- ✅ Editorial/reviewer pages mojood (E-E-A-T ke liye).

---

## 5. Action plan (priority order)

| # | Kaam | Kaun | Impact | Effort |
|---|---|---|---|---|
| **1** | **Naya build deploy karo** (live = repo) | Owner/agent (permission) | 🔥🔥🔥 | 1 command |
| 2 | Deploy ke baad GSC mein **top ~40 pages Request Indexing** | Owner (GSC) | 🔥🔥🔥 | 15 min |
| 3 | **Sitemap resubmit** GSC mein | Owner (GSC) | 🔥🔥 | 2 min |
| 4 | **AlternativeTo + Twelve.Tools** submissions (2 links, velocity rule) | Owner | 🔥🔥 | 30 min |
| 5 | 6 Reddit/community answers post karo (brand demand) | Owner | 🔥 | 1 hr |
| 6 | Not-indexed pages jo already-indexed pages se link karo | Agent | 🔥🔥 | agent |
| 7 | Next tier pages ko "enhanced" template do (formula+table) | Agent | 🔥 | agent |
| 8 | Weekly GSC coverage + position pull | Agent | — | monitor |

**Rule:** deploy ke bina 2–7 ka poora fayda nahi milega — pehla step deploy hai.

---

## 6. Honest expectation (jhooth nahi)

- **Hafta 1–2:** deploy + indexing → positions thodi improve (37 → ~28). Clicks thode badh sakte hain.
- **Hafta 4–8:** backlinks discover hone par mid-tail top-10 mein aana shuru.
- **3 mahine:** agar 15–30 referring domain ban gaye, to competitive terms realistic.
- **Naya domain + 0 authority:** competitive top-10 mein **4–8 hafte** normally lagte hain. Isse jaldi "loan calculator" #1 nahi hoga — koi bhi iska wada karne wala jhoota hai.

**KPIs (monthly):** indexed pages (375 → 700+), average position (37 → 25 → 15), referring domains (0 → 5 → 15 → 30), brand searches.

---

## 7. Appendix — exact review commands

```bash
cd C:/Users/ok/Documents/Calculator/project

# 1) Live ranking reality
node scripts/gsc-queries.cjs --days 28 --rows 100

# 2) Coverage / indexation
node scripts/monitor-gsc.cjs        # or: node scripts/gsc-indexing.cjs

# 3) Technical checks
#    open https://calcpromaster.com/robots.txt and /sitemap.xml in browser

# 4) Local build vs live (canonical/title diff)
grep -o '<link rel="canonical"[^>]*>' deploy/auto/parking-cost/index.html
#    then open the same URL live and inspect the page source

# 5) Link graph health
node scripts/link-graph-audit.cjs

# 6) Full build (regenerate deploy/ with all fixes)
node build-deploy.js
```
