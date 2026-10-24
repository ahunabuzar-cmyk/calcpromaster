# MASTER ACTION CHECKLIST — 200k / 30 din (calcpromaster.com)

> Har lever, har kaam, kis ka kaam, aur status — aik jagah. Taake koi item miss na ho.
> **Legend:** ✅ done · 🟡 agent kar sakta (bina login) · 🔴 sirf USER (login/deploy) · ⏳ time-dependent
> **Last updated:** 4 Oct 2026

---

## LEVER 1 — INDEXING VELOCITY (sab se bara)

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 1.1 | Internal links direct canonical form (301 hops hataye, ~1,360 links) | 🤖 | ✅ done (build verify PASS) |
| 1.2 | Orphan-page audit — koi page bina inlink na rahe | 🤖 | ✅ done (0 orphan, 784/784 healthy) |
| 1.3 | Sitemap = 1,413 URLs, fresh, quality-gate PASS | 🤖 | ✅ done |
| 1.4 | IndexNow (Bing/Yandex) — deploy ke baad ping | 🤖 | 🟡 ready (post-deploy) |
| 1.5 | **Request Indexing** — 44 URLs ka list ready, GSC mein submit | 👤 | 🔴 list ready: `docs/REQUEST-INDEXING-WEEK-2.md` |
| 1.6 | **Sitemap resubmit** GSC mein | 👤 | 🔴 pending |
| 1.7 | Fresh content signals — pages update (review-date stamp) | 🤖 | ✅ done (1,460 pages stamped 2026-10-04) |
| 1.8 | Weekly coverage re-pull (naye discovered pages) | 🤖 | 🟡 har Monday |

## LEVER 2 — QUALITY BACKLINKS (authority)

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 2.1 | Live backlinks (Dev.to ×5, Gist, GitLab, Bitbucket, CodePen, Hashnode, HackMD, WordPress, GitHub Pages) | 🤖+👤 | ✅ ~14 live |
| 2.2 | 578-site master pack (paste-ready) | 🤖 | ✅ `docs/BACKLINK-500-MASTER-PACK.md/.txt/.docx` |
| 2.3 | Har hafte 10-15 genuine platform submissions | 🤖+👤 | 🔴 chalu, login-wall par user |
| 2.4 | Guest posts + resource-page outreach emails | 🤖 | ✅ drafts ready: `docs/outreach-emails.md` (10 targets) + `docs/outreach-regional-2026-10-03.md` (5 naye regional) — bhejna user ka |
| 2.6 | GitHub Pages reference pages (unit-conversion-chart + percentage-reference + README) | 🤖+👤 | 🟡 staged: `docs/github-pages/` — repo root mein upload + index.html se link karna |
| 2.5 | awesome-finance PR #103 | 🤖 | ⏳ open (review ka wait) |

## LEVER 3 — CONTENT (rank karne ke liye)

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 3.1 | Har tool page: unique intro + AEO block + FAQ + HowTo schema | 🤖 | ✅ already (js/tool-intros.js + TOOL_SEO) |
| 3.2 | FaqPage/HowTo JSON-LD har page par | 🤖 | ✅ already |
| 3.3 | **Page-2 pages upgrade** — 20 targets | 🤖 | ✅ **20/20 done** — har page ko unique formula + verified data-table + internal links mile (`js/tool-enhance.js`), prerender AUR hydrated DOM dono mein (browser-verified). Sab 29 internal links resolve (0 404) |
| 3.4 | Position 20-50 pages par extra section/table | 🤖 | ✅ **36/36 done** — 20 page-2 + 16 position 20-50 pages (`js/tool-enhance.js`), formula + verified table + internal links, SSG + hydrated dono |
| 3.5 | 5 naye genuine regional pages (Kenya/Nigeria/Philippines/Bangladesh/Egypt take-home) | 🤖 | ✅ done — 5 tools + SEO, hand-verified outputs, 6 inbound links each, Egypt math fixed (net EGP 23,472) |
| 3.6 | 10 aur regional take-home/income-tax pages (Brazil/Mexico/Vietnam/Indonesia/Thailand/Colombia/Chile/Peru/Poland/Romania) | 🤖 | ✅ done — 10 tools + SEO, hand-verified outputs (BR 6,041 · MX ISR 3,452 · VN 26,215,000 · ID 9,365,000 · TH 38,421 · CO 10,374,000 · CL 1,225,173 · PE 4,200 · PL 5,790 · RO 4,680), QA contracts + independent tests added, quality-gate PASS |
| 3.7 | Not-indexed action plan (763 still-out URLs, 21 "slipped in") | 🤖 | ✅ done — `docs/NOT-INDEXED-ACTION-PLAN.md` + `data/not-indexed-plan.json` |
| 3.8 | Contextual internal-link graph audit (every tool page ≥3 contextual inlinks) | 🤖 | ✅ done — 1,234 pages scanned, 0 weak — `docs/INTERNAL-LINK-AUDIT.md` |

## LEVER 4 — CTR / TITLES

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 4.1 | **183 weak meta descriptions** flagged (`node scripts/analyze-meta-desc.cjs`) — auto-generated ones computed default values dikhati hain (jaise "parking costs of $330.00/mo"). Inhe clean, benefit-led copy se replace karna. **Note: ye CTR/clicks barhata hai, impressions nahi.** | 🤖 | ✅ done — 183/183 rewritten, analyzer ab **0 of 1219** flagged (`scripts/rewrite-flagged-metas.cjs`) |
| 4.1b | Top-30 pages title + meta rewrite (number/year/benefit) | 🤖 | ✅ done — 26 titles rewritten (`scripts/rewrite-top-titles.cjs`), sab ≤60 chars |
| 4.2 | Schema already present — verify | 🤖 | ✅ done |
| 4.3 | CTR monitor + iterate (data-driven) | 🤖 | 🟡 weekly |

## LEVER 5 — BRAND / DISCOVER

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 5.1 | Reddit post (r/InternetIsBeautiful) | 👤 | ✅ live |
| 5.2 | HN Show / Product Hunt launch | 👤 | 🟡 drafts ready |
| 5.3 | YouTube Shorts (1-3) | 👤 | 🟡 pending |
| 5.4 | Brand query growth monitor ("calcpromaster") | 🤖 | 🟡 weekly |

## LEVER 6 — TECHNICAL (already bharosa-mand)

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 6.1 | Prerendered HTML har page (86KB, title, H1, 40+ paras) | 🤖 | ✅ |
| 6.2 | Canonical correct, robots allow, trailing-slash 301 | 🤖 | ✅ |
| 6.3 | Core Web Vitals / perf budgets | 🤖 | ✅ PASS |
| 6.4 | netlify.app → .com 301 | 🤖 | ✅ |
| 6.5 | Stale netlify.app canonicals in repo source (build par replace ho jate hain) | 🤖 | ✅ live sahi |

## LEVER 7 — REPORTING / PROOF

| # | Kaam | Kaun | Status |
|---|---|---|---|
| 7.1 | Weekly impressions tracker (GSC API, real numbers) | 🤖 | ✅ `npm run` tracker — `docs/IMPRESSION-TRACKER.md` |
| 7.2 | Monthly final report (200k vs actual) | 🤖 | 🟡 Day 29 |
| 7.3 | Honest probability tracking | 🤖 | ✅ `docs/FULL-30-DAY-200K-PLAN.md` §1 |

---

## 🔴 SIRF AAP KAR SAKTE HAIN (3 blockers — inse sab rukta hai)

1. **Netlify deploy** — naya `deploy/` folder upload karo (internal-link fix live karne ke liye). ~2 min.
2. **Google Search Console** login → sitemap resubmit + Request Indexing (roz 12 URLs). ~4 min.
3. **Backlink platforms** — jab agent login-wall par rokay, aap ~20 sec mein login karo.

## ❌ JO KABHI NAHI KARENGE (Google-safe guardrail)

Paid/PBN links · doorway/thin mass pages · cloaking · keyword stuffing ·
fake traffic/bots · duplicate deploy · auto comment/forum spam ·
Indexing API ka galat use (ye sirf JobPosting/BroadcastEvent ke liye hai).

---

## ABHI KI STATE (2 Oct 2026)

| Metric | Value |
|---|---|
| Monthly run-rate | ~31,000 impressions |
| 200k progress | 15.5% |
| Indexed pages | 375 / 1,167 (32%) |
| Orphan pages | 0 |
| Quality gate | PASS |
| Live backlinks | ~14 |
| Deploy status | 🔴 pending (user) — handoff: `docs/DEPLOY-HANDOFF.md` (2 min drag-drop) |

## LATEST — Market-gap backlog shipped (4 Oct 2026)

48 naye calculators ship ho gaye (batches 1-6), registry **1,282** tools.
Deliverables:
- `docs/MARKET-GAP-STATUS.md` — 49/49 items Done, disclaimer column, verification.
- `docs/COMPETITIVE-GAP-STATUS.md` — 12 competitive items, honest status.
- Multi-property data model: `js/portfolio-store.js` (+ unit tests).

Verification: quality gate PASS, perf budgets PASS, full unit suite **1,938 passing (40 files)**.
Sitemap 1,413 URLs. Sab tests green — koi regression nahi.

Ab bhi user ka: Cloudflare deploy + domain + GSC login + SPF/DMARC (dekho
`docs/HOSTING-MIGRATION-CLOUDFLARE.md`).


## LATEST — Competitive-gap build-out (4 Oct 2026, part 2)

- Item 1 Done: function grapher `/graph` (`js/grapher.js`).
- Item 3 Done: interactive geometry `/geometry-lab` (`js/geometry-lab.js`).
- Item 8 Done: visible `Last reviewed` on every page (verified).
- Item 12 Done: per-calculator rating (`js/trust-extras.js`).
- Items 5/7/9/11 Partial (documented, never faked); 6 Blocked (paid); 10 Deferred (doc).

Registry 1,282 · sitemap 1,415 · quality gate PASS · unit suite 1,958 passing (43 files).


## LATEST — New pages linked, methodology notes, bylines (4 Oct 2026, part 3)

Char kaam, sab agent-done (bina login):

- **New pages linked**: `/graph` aur `/geometry-lab` ab site nav (header) aur
  footer mein, aur **Math category page** par ek featured callout (prerendered +
  client-rendered — `index.html`, `js/app.js`, `scripts/ssg-pages.cjs`,
  `styles.css`). 2 links each, white-hat, no doorway.
- **Per-category methodology notes**: shared module `js/category-methodology.js`
  — har tool page aur har category page par "Methodology:" note. Item 9 → **Done**.
- **Reviewer byline system**: same module — "Reviewed by <name>, <credentials>"
  byline sirf real reviewer set hone par render hota hai; **jaan-boojh kar khali**
  (koi fake naam nahi). Item 7 → **Done**. Guide: `docs/REVIEWER-BYLINES.md`.
- **Browser-verified** on built `deploy/` artifact: `/graph` plot + re-plot OK,
  `/geometry-lab` drag → live measurements OK, `/math` callout + methodology OK.

Registry 1,282 · sitemap 1,415 · quality gate PASS · perf budgets PASS ·
unit suite 1,958 passing (44 files, +6 new).

Cloudflare: agent ke paas koi Cloudflare tool/access **nahi** — dashboard user ke
liye preview mein khol diya (login user karega), phir `npm run deploy:cf`.

## LATEST — Hubs methodology, reviewer flow, graph links (4 Oct 2026, part 4)

- **Methodology on hubs**: per-category methodology note ab `/hub/<cat>` par
  (SSG + client) aur 11 category guide pages (`guides/*.html`, rebuilt).
- **Reviewer flow (owner-friendly)**: sirf `data/reviewers.json` edit karo →
  `scripts/apply-reviewers.cjs` `js/reviewers-data.js` banata hai →
  `js/category-methodology.js` dono (Node + browser) mein padhta hai. Build
  pipeline mein auto-run. Default khali = koi byline nahi (fake naam NAHI).
  Guide: `docs/REVIEWER-BYLINES.md`. Tests: `tests/unit/reviewer-flow.test.js`.
- **Graph/geometry links from math tools**: `js/tool-enhance.js` mein 8 math
  tools (quadratic, cubic-equation, trigonometry, slope, slope-intercept,
  triangle, pythagorean, circle) ab `/graph` ya `/geometry-lab` ko in-content
  link karte hain — sab 16 links resolve (0 404).

Cloudflare: `calcpromaster` Pages project ban gaya; wrangler authenticated
(ahunabuzar@gmail.com, `pages:write`) → agent ne deploy kar diya.
Baqi sirf user: custom domain + nameservers (details handoff mein).
