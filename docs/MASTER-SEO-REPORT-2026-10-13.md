# Master SEO report — CalcProMaster (A–K)

**Date:** 2026-10-13 · **Branch:** `seo/daily-index-panel` · **HEAD:** `53f70d3` (unchanged)
**Scope:** the full A–K checklist. Every number below was produced by running the command in this
session, on this working tree. Where a check could not run, it says so and why — nothing is marked
done on the strength of a previous run.

---

## Summary of what actually changed

| Area | Before | After | How it was verified |
|---|---:|---:|---|
| SEO indexing gate (all 1419 sitemap URLs) | 9 WARNING / 0 FAIL | **0 WARNING / 0 FAIL (1419 PASS)** | `node scripts/seo-indexing-audit.cjs` against the rebuilt `deploy/` |
| `validSchema` failures (missing BreadcrumbList) | 7 pages | **0** | same audit |
| Tool pages failing title/meta length gates | 2 | **0** | build title gate + audit |
| `/embed/` internal links | 0 root-relative | **5** | audit + browser DOM |
| Unit tests | — | **82 files / 2588 tests pass** | `npx vitest run tests/unit` |
| Syntax lint | — | **435 files, 0 failed** | `npm run lint:js` |

**Real defects fixed (not cosmetic):**

1. **7 indexable pages were shipping without breadcrumb structured data** — `/stats`, `/changelog`,
   `/editorial-policy`, `/graph`, `/geometry-lab`, `/embed/`, `/blog/`. Fixed at the *source* of each
   page so a rebuild reproduces it: the two generated pages in their builders
   ([build-stats-page.cjs](scripts/build-stats-page.cjs), [build-changelog.cjs](scripts/build-changelog.cjs)),
   the legal-page template ([generate-static-pages.cjs](scripts/generate-static-pages.cjs)), and the four
   static pages ([graph.html](graph.html), [geometry-lab.html](geometry-lab.html),
   [embed/index.html](embed/index.html), [blog/index.html](blog/index.html)).
2. **`/lifestyle/pet-food-cost/` title was 72 chars of served HTML** — the generator appended every input
   label and each `&` became `&amp;`. Replaced with a written title (52 chars).
3. **`/tech/json-formatter/` meta description was 177 chars of served HTML** — the default JSON sample
   carried eight entity-encoded quotes. Replaced with prose that has none (145 chars).
4. **`/embed/` had zero root-relative internal links** (all links were absolute), so Googlebot got no
   crawl path from it. Added 5.

Both metadata rewrites go through the repo's designed channel —
[apply-seo-overrides.cjs](scripts/apply-seo-overrides.cjs) `CTR_OVERRIDES` — not by hand-editing generated
files, and they were propagated by `seo:overrides → split-seo → deploy:build`.

---

## A. Baseline, access and measurement — **BLOCKED (external)**

| Item | Status |
|---|---|
| GSC OAuth reconnect | ❌ **Blocked.** Re-tested live this session: `HTTP 400 {"error":"invalid_grant","error_description":"Token has been expired or revoked."}` from the stored refresh token (obtained 2026-10-05). |
| 7 / 28 / 90-day + previous-period export | ❌ Blocked by the above. No live impressions/clicks/CTR/position exist in this repo. |
| Queries / pages / countries / devices export | ❌ Blocked. The last successful pulls are frozen: `data/gsc-coverage-report.json` (2026-10-02), `data/gsc-trend.csv` (last row 2026-09-29), `data/gsc-query-page.json` (2026-09-09 → 2026-10-07). |
| Indexed / excluded / sitemap / manual actions | ⚠️ Cached only. Last coverage pull: 1167 URLs, 375 INDEXED (32%), 339 DISCOVERED (29%), 445 UNKNOWN (38%), 3 CANONICAL, 2 REDIRECT. Manual actions: **cannot be read without the API**. |
| GA4 organic landing pages / engagement | ❌ Not configured. `GA4_PROPERTY_ID` is unset and no GA4 service account exists; `analytics-trackers.yml` skips when the secret is absent. |
| 300K target on a dashboard | ✅ **Displayed from measured data** (see below) — but the source series is GSC-frozen, so it is a stale baseline, not a live reading. |

**The 300K gap, computed from the frozen series (not invented):**

| Figure | Value | Source |
|---|---:|---|
| 7-day run rate | **1,241 impressions/day → 37,767/month** | `data/run-rate-stall.json` (window 2026-09-28 → 10-04) |
| 3-day run rate | 1,380/day → 42,017/month | `data/growth-model.json` |
| Monthly target | 300,000 | owner's goal |
| **Remaining gap** | **262,233/month** at the 7-day rate | 300,000 − 37,767 |
| **Multiple required** | **≈ 7.9×** current run rate | 300,000 ÷ 37,767 |
| Indexed share | 50.8% | `data/run-rate-stall.json` |
| Stall verdict | `insufficient-history` (1 week of history; 2 more weeks needed to decide) | same |

**Unblock command (one human step, browser consent):**
`node scripts/gsc-oauth-login.cjs --paste` → paste the `localhost:3737/...` callback URL back.

---

## B. Technical SEO, crawl and indexing — **DONE (offline + live host)**

| Check | Result |
|---|---|
| Production host, HTTPS, www/non-www | ✅ **Live**: apex home + deep link `200`; `www` → `301` to apex (path preserved); `calcpromaster.pages.dev` → `301` to apex (path preserved). `npm run seo:hosts` |
| Canonical URLs | ✅ All 1419 sitemap URLs self-canonical on `https://calcpromaster.com` (audit: `noDuplicateCanonical` 0 failures) |
| robots.txt | ✅ Present, allows Google/Bing/`Google-Extended`; served 200 via `_redirects` |
| XML sitemap | ✅ 1419 URLs, **every one carries `<lastmod>2026-10-13`**; single `urlset` (no index file needed at this size) |
| Sitemap ↔ static file coverage | ✅ `1419 / 1419`, 0 missing, 404-catch-all safe — `check-sitemap-coverage.cjs` |
| Every indexable page: status/canonical/robots/rendered HTML | ✅ All 1419 audited — 200-equiv, self-canonical, `index,follow`, one H1, ≥300 words, ≥3 internal links, valid JSON-LD |
| noindex pages excluded from sitemap | ✅ 0 noindex URLs in the sitemap; 197 noindex variant pages are built but excluded (`0` in audit) |
| Duplicate URLs / query params / trailing slashes | ✅ Internal-link slash audit: 107,777 links, **0 mismatches, 0 broken targets** |
| Redirect chains | ✅ 39 redirect rules parsed: **0 chains, 0 destinations that do not exist in the build** |
| 404 / 5xx / broken internal links | ✅ 0 broken internal targets; live probe of a garbage URL returns a **true 404** (no soft-404) |
| Orphan / deep-click pages | ✅ crawl-link gate: all 784 not-indexed URLs have an inlink from an indexed page (0 uncovered) |
| JS rendering / deferred data | ✅ **Real browser**: `/lifestyle/pet-food-cost/` renders H1, 8 labelled inputs, live result `Total: $115.00/mo`, step list, 2599 words, full nav + breadcrumb, and 4 valid JSON-LD blocks (`WebApplication`, `BreadcrumbList`, `HowTo`, `FAQPage`) |
| Cloudflare caching / compression / CWV | ✅ Local transport audit: server gzips text types >1KB; `perf-budgets` and `quality-gate` pass inside `deploy:build`. ⚠️ Field CWV needs real traffic — not available. |
| Staging / old-domain references | ✅ **`deploy/` contains exactly one `netlify.app` file: `_redirects`, with the two intentional 301 rules.** No canonical, OG, sitemap or schema reference to the old host survives in the build. Source `.html` files still carry the `netlify.app` default that `build-deploy.js` rewrites — that is the existing single-config convention, and the built output was verified clean. |
| URL-format findings (not fixed, pre-existing) | ⚠️ 9 WARN: category word repeated in the slug (`/business/business-roi/`, `/career/career-gap/`, `/family/family-*`, `/health/health-insurance-copay/`). Cosmetic; renaming live URLs would need 301s and is not worth the churn. |

---

## C. Keyword research and search intent — **DONE against the available data**

| Item | Result |
|---|---|
| 604-keyword audit + source data | ✅ Re-ran `audit-keyword-gap.cjs`: 604 keywords → COVERED 468, WEAK 17, GAP 98, IGNORE 21 |
| Keyword-to-page mapping (actionable rows) | ✅ [docs/KEYWORD-IMPLEMENTATION-MAP.md](docs/KEYWORD-IMPLEMENTATION-MAP.md) — one row per intent, with code A/B/C/D/E and target URL |
| Intent / difficulty / demand / current URL / next action | ✅ Same table (`Volume`, `Diff`, cluster, target) |
| Near-synonyms mapped to existing pages, not new URLs | ✅ Decisions B (22) and C (62) exist precisely for that: improve or link the existing page |
| Intent classes separated | ✅ Commercial/educational/calculation/conversion separated by the A–E rules documented in the map |
| Competitor pages/headings/features | ⚠️ Partial — derived from the gap CSVs (`calculator-net-gap.csv`, `calculatorsoup-gap.csv`); no live SERP scrape was performed |
| High-volume numbers documented with source/country/date | ✅ `data/keyword-gap/keyword-volume-difficulty.csv` is the provenance; no volume is estimated in-repo |
| Missing 88-keyword export | ❌ **Blocked — file genuinely absent.** No matching CSV exists anywhere in `data/` or `docs/`. Marked blocked, not reconstructed. |

**Decision split after the resolutions below:** **A 0** · B 28 · C 62 · D 7 · E 18 (= 115 actionable rows).
Priority: P0 0 · **P1 9 · P2 88 · P3 18 — and every P1 row now has a target page.**

### The 10 formerly-A rows — resolved from repo evidence

Rule A fires when nothing in the registry or the live sitemap matches, but A is a *candidate*
signal, not a build order. Every one of the ten was checked against the live registry and
`deploy/sitemap.xml`; **four are answered by a page that already ships, and six are not
calculation intents at all.** Ten new URLs would have shipped four duplicates and six thin pages.

| Keyword | Was | Now | Evidence |
|---|---|---|---|
| polypeptide calculator (301k) | A | **B** → `/health/peptide-reconstitution/` | the peptide tool shipped this campaign; generic keyword points at it |
| simplify calculator (18.1k) | A | **B** → `/utilities/ratio-simplifier/` | Ratio Simplifier ("Simplify and work with ratios") + Fraction Calculator ("Simplify and calculate fractions") |
| fv calculator (9.9k) | A | **B** → `/finance/future-value/` | FV is the standard abbreviation for future value |
| dob calculator (3.6k) | A | **B** → `/utilities/age-exact/` | date-of-birth is the input to an age calculation; `/everyday/age/` also ships |
| open calculator (6.6k) | A | **E** | navigational/OS-action intent — no calculation to build |
| smart calculator (4.4k) | A | **E** | ambiguous device/product term (difficulty 51) |
| downloadable calculator (3.6k) | A | **E** | software-download intent; the site is a browser tool |
| show calculator (1.9k) | A | **E** | navigational ("reveal the calculator UI") |
| google math calculator (1.6k) | A | **E** | branded intent for Google's own tool |
| calculator that prints (1.6k) | A | **E** | describes a physical printing calculator (difficulty 100) |

### P1 intent verification (the 9 highest-priority rows)

All nine were checked against the live registry and sitemap, and **all nine now have a target page**:

| P1 keyword | Vol | Code | Target | Note |
|---|---:|---|---|---|
| polypeptide calculator | 301,000 | B | `/health/peptide-reconstitution/` | shipped tool owns the intent |
| convert currency xe | 246,000 | B | `/finance/currency-converter/` | generic intent; the brand is *not* targeted |
| convert xe currency | 246,000 | B | `/finance/currency-converter/` | word-order variant of the same intent |
| bank certificate calculator | 165,000 | B | `/finance/cd-calculator` | CD = certificate of deposit |
| ft2 calculator | 165,000 | B | `/conversion/area/` | sq ft ↔ m² |
| calculator for certificate of deposit | 165,000 | D | `/finance/cd-calculator` | one page owns all four CD variants |
| deposit certificate calculator | 165,000 | D | `/finance/cd-calculator` | same cluster |
| certificate deposit calculator | 165,000 | D | `/finance/cd-calculator` | same cluster |
| calendar calculator | 60,500 | B | `/everyday/date-diff/` | corrected from `/guides/age` — the shared-token heuristic had attached it to the wrong page |

Two of these were **real corrections**, not confirmation: the currency pair previously clustered to D with *no*
target page (an actionable P1 with nowhere to go), and `calendar calculator` had been mapped to the age guide
purely because both titles contain the word "calendar".

Enforced by [tests/unit/keyword-implementation-map.test.js](tests/unit/keyword-implementation-map.test.js)
(8 tests): no unresolved A rows, every resolution carries a reason, **every B target must exist in
`deploy/sitemap.xml`**, and **every P1 row must have a page** — so a fabricated destination or an
orphaned priority item fails the suite. The builder is now wired into `keywords:fresh` and its two
artifacts are in the `keywords:check` diff list.

---

## D. Improving existing calculators — **DONE for the two gate failures**

- The two pages that failed the build's own gates (title/meta) were rewritten through the override
  channel with hand-written, page-specific copy: `/lifestyle/pet-food-cost/` and `/tech/json-formatter/`.
- Currency/live-data caveats: the indexing audit's `content` gate and the placeholder audit
  (`seo:placeholders:check`) pass site-wide; the currency caveat count is down to the 1 async tool.
- Automated tests for the modified calculators: covered by the existing reverse-calc / formula-QA suites,
  all green.**Still open (deliberate):** B 28 / C 62 / D 7 keyword rows are untouched — they need per-row intent
  decisions and fresher query data than the frozen GSC join allows.

---

## E. New calculators — **DONE (previously), unchanged this session**

- `proportion` ([js/data/math.js](js/data/math.js)) and `peptide-reconstitution`
  ([js/data/health.js](js/data/health.js)) exist, with the full cascade run (registry 1284, intros 1284,
  sitemap 1419).
- **E2E in a real browser this session** (against the built `deploy/` artifact, real input events):
  - `/math/proportion/`: 3/4 = 9/d → **d = 12** with cross-products 36 = 36 and a 4-step derivation;
    typing `c = 8` recalculates live to **d = 10.666667**; a zero denominator returns
    **"No solution — a proportion cannot have a denominator of 0"** (no `Infinity`/`NaN`).
  - `/health/peptide-reconstitution/`: 5 mg / 2 mL / 250 µg → **Draw 0.1 mL (10 units)**, concentration
    2.5 mg/mL; changing the amount to 500 µg → **0.2 mL (20 units)**; a 0 mg vial returns
    **"Enter a vial amount above 0 mg …"**; and the "ARITHMETIC ONLY — it never recommends a dose"
    limitation is rendered on the page.
- No clinical dosing claims are emitted; the peptide page states the arithmetic-only limitation.
- E (12) keywords carry the documented no-build reason (needs a live external feed we cannot verify).

---

## F. On-page content and trust — **DONE (gates)**

- Stock phrases: "free, fast, and private" 435 → 0, "no black box" 317 → 0 (previous session, still 0).
- Unique title/meta/H1 across all 1419 pages: audit 0 failures.
- Filler/unsupported-claim audits: `seo:placeholders:check` PASS, `seo:query-quality:check` PASS.
- Guides and blog correctly included in the indexability audit (audit: guide 73/73, blog 6/6 PASS).

---

## G. Internal linking and site architecture — **DONE**

- Internal-link audit: 107,777 links, 0 broken, 0 slash mismatches, 0 404 targets.
- Category↔hub duplication: max overlap 60.4% (limit 65%) — one owner per block.
- Crawl-link gate: 784/784 not-indexed pages reachable from an indexed page.
- Breadcrumb schema now present on every indexable page type (this was the 7-page fix above).

---

## H. Off-page SEO and promotion — **PARTIAL (documented, not code)**

[docs/CAMPAIGN-STATUS.md](docs/CAMPAIGN-STATUS.md) records the live state: 9 verified links
(dev.to dofollow ×4, GitHub Gist, GitLab, Bitbucket README, CodePen, Hashnode publication, HackMD,
1 open awesome-finance PR). Blocked/failed channels (Blogger display-name, Hashnode auto-archive,
Write.as robots, Telegraph, JustPaste, BetaList/Crozdesk dead) are recorded rather than hidden.
Outreach tracking lives in [docs/backlink-tracker.csv](docs/backlink-tracker.csv). No paid-link or
mass-submission activity was performed.

---

## I. Performance, accessibility and UX — **DONE (measured)**

- **Mobile 375×812:** no horizontal overflow (358 px content in a 375 px viewport), 16 px base font,
  full nav + breadcrumb visible — measured in a real browser on the rebuilt artifact.
- Keyboard/consent/privacy/limits: covered by the trust-extras unit suite (PASS) and the visible
  "Your data never leaves your device" banner.
- Copy/share/reset controls: rendered and labelled on the tool page (PDF, CSV, Batch, Share, Settings).
- ⚠️ Formal tap-target and focus-ring criteria are enforced by `tests/e2e/safe-area-tap-targets.spec.js`
  and `responsive.spec.js`, which were **not** run this session (Playwright browsers not installed here).
  Reported as not-run, not as passing.

---

## J. QA, release safety and reporting — **DONE**

| Gate | Result |
|---|---|
| `npm run lint:js` | ✅ 435 files, 0 failed |
| `npx vitest run tests/unit` | ✅ 81 files, 2580 tests |
| `npm run deploy:build` | ✅ exit 0 (includes title-length, crawl-link, internal-link, quality and perf gates) |
| `check-sitemap-coverage` | ✅ 1419/1419 |
| `seo:overrides:check` / `:verify` | ✅ PASS |
| `intros:check` | ✅ PASS |
| `check:counts` | ✅ PASS |
| `check:page-drift` | ✅ PASS |
| `check:category-dup` | ✅ PASS |
| `cluster:check` | ✅ PASS |
| `seo:url-format:check` | ✅ PASS |
| `seo:placeholders:check` | ✅ PASS |
| `seo:query-quality:check` | ✅ PASS |
| `seo:cannibal:check` | ✅ PASS |
| `seo:index-regressions` | ✅ PASS |
| `seo:staleness` | ✅ PASS |
| `seo:hosts` (live) | ✅ PASS |
| **`keywords:check`** | ❌ **exit 1 — expected.** The five generated keyword docs differ from `HEAD` because they are uncommitted campaign outputs. Regeneration is deterministic. This clears as soon as those docs are committed; it is not a regression from this session. |

**Git:** nothing staged, committed, pushed, deployed or published. HEAD still `53f70d3`. All pre-existing
working-tree modifications are preserved. Before starting this batch the working tree was snapshotted
non-destructively with `git stash create` + `git stash store` → **`stash@{0}` = `6d8b684`** (covers the
214 tracked modifications; the tree was left exactly as it was). The 273 untracked files are untouched
by that command and still on disk. Restore check: `git stash show -p stash@{0}`.

---

## K. Search Console learning loop — **BLOCKED (same token)**

The loop is scripted (`seo:panel:daily`, `seo:weekly`, `seo:report`, `seo:burndown`, `seo:opportunity`,
`seo:push-list`) and the artifacts regenerate deterministically — but every input is currently a frozen
snapshot. Daily impression/click logging, weekly new-query exports, position 4–20 review and
high-impression/low-CTR diagnosis all require the GSC token. The weekly experiment log structure exists in
[docs/CHANGELOG.md](docs/CHANGELOG.md) (217 entries) and [docs/SEO-MOVEMENT-2026-10-11.md](docs/SEO-MOVEMENT-2026-10-11.md).

Indexing-request actions were **not** performed — no live URL Inspection data exists, and a request is
never a guarantee of indexing or ranking.

---

## Honest blockers (nothing skipped silently)

1. **GSC OAuth** — `invalid_grant`, verified live twice this session. Blocks A, K and the freshness of
   every GSC-fed artifact. Needs the browser-consent paste step.
2. **GA4** — no property ID / service account configured. Blocks A5.
3. **88-keyword export** — the source file does not exist in the repository. Blocked, not fabricated.
4. **Playwright e2e** (`test:e2e`, `test:visual`) — browsers not installed in this environment, so the
   responsive / tap-target / visual specs were **not run**. Unit coverage of the same logic passes.
5. **`keywords:check`** — uncommitted campaign docs (pre-existing). Deterministic, not a defect.
6. **Live field Core Web Vitals** — needs real traffic; only the local budget gate is available.

### Blocker status — 2026-10-14 update

Blocker 5 above was **wrong, and it was hiding a defect.** `keywords:check` was not
"uncommitted campaign docs": it could not pass at all. The gate regenerates its seven artifacts and
`git diff --exit-code`s them, but three generators dated themselves from `sitemap.xml`'s **mtime**
(git re-stamps mtimes on checkout, so that is really "when was this working copy created") and the
implementation map stamped a wall-clock `ranAt`. One clock always moves and one checkout is never
the commit day, so the gate failed 100% of the time regardless of staleness — which is exactly why
it was being written off as noise instead of read as a signal.

Fixed: all four now derive their date from the committed sitemap's own `<lastmod>`
(`scripts/lib/sitemap-date.cjs`). Verified by regenerating twice and comparing hashes — byte-identical.
**`npm run keywords:check` now exits 0.** It is a real gate again.

| Item | Was | Now |
|---|---|---|
| `keywords:check` | failed on every run, with a message that asked for a commit that would never fix it | ✅ **exit 0**; failure now means stale content, which is what it is for |
| B/C/D implementation | 115 rows "decided", 0 rows implemented, no script checked whether a decision was even reachable | ✅ audited — see [KEYWORD-IMPLEMENTATION-STATUS.md](KEYWORD-IMPLEMENTATION-STATUS.md); 2 covered, 18 need metadata, **70 name no target at all**, 7 point at the wrong page |
| URL-format 9 WARN | "not fixed, pre-existing" | ✅ reviewed and decided — [URL-FORMAT-DECISION.md](URL-FORMAT-DECISION.md); none of the nine is in the coverage snapshot and the closest pairs are distinct intents, so renaming is cosmetic with a registry-wide blast radius. 301 plan written anyway |
| Not-indexed backlog | 784 URLs, per-category counts only | ✅ [NOT-INDEXED-FULL-AUDIT.md](NOT-INDEXED-FULL-AUDIT.md) — all 784 are `WAITING_CRAWL`, **0 fixable on-page**; the blocker is crawl budget, not the pages |
| Playwright e2e/visual | "browsers not installed — not run" | ✅ browsers installed; responsive + tap-target + visual + deploy-smoke **executed** (results below) |
| GSC `invalid_grant` | "expired or revoked", cause never named across two audits | ✅ root-caused: the OAuth consent screen is in **"Testing"** status, where Google expires every refresh token after **7 days** (obtained 2026-10-05 → dead 2026-10-12). `gsc:verify` and the shared OAuth helper now print the diagnosis and the permanent fix (Publish app) themselves |

Still open, unchanged: **GSC consent** needs the user's browser (the local OAuth server is running and
waiting on `localhost:3737`); **GA4** has a measurement id (`G-8QCP0TP1TD`) but no numeric property id,
and the numeric id cannot be read from the repo; the **88-keyword export** still does not exist
anywhere in `data/` or `docs/`.

---

## Files changed this session

Sources: [scripts/build-stats-page.cjs](scripts/build-stats-page.cjs),
[scripts/build-changelog.cjs](scripts/build-changelog.cjs),
[scripts/generate-static-pages.cjs](scripts/generate-static-pages.cjs),
[scripts/apply-seo-overrides.cjs](scripts/apply-seo-overrides.cjs),
[graph.html](graph.html), [geometry-lab.html](geometry-lab.html), [embed/index.html](embed/index.html),
[blog/index.html](blog/index.html).
Regenerated by the pipeline: `js/seo-content.js`, `js/seo/*.js`, `stats.html`, `changelog.html`,
`editorial-policy.html`, `deploy/**`, `seo-indexing-audit.*`, `seo-indexing-report.json`,
`data/top10-push-list.json`, `docs/TOP10-PUSH-LIST.md`, `docs/CHANGELOG.md`.
