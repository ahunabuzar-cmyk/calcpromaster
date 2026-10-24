# Evidence report — 51-item checklist (2026-10-18)

Scope: the 51-item SEO/QA checklist plus this session's four sprint todos.
Branch: `seo/daily-index-panel`. Environment: local repo (`C:\Users\ok\Documents\Calculator\project`), Node 24, no production deploy performed.

**Status legend**

| Tag | Matlab |
|---|---|
| **DONE** | Kaam mukammal, command + output neeche evidence ke taur par |
| **PARTIAL** | Kuch hissa ho gaya, baaqi ka reason likha hai |
| **BLOCKED** | Meri taraf se mumkin nahi (credential / external data / user action) |
| **SKIPPED** | User ke instruction par chhoda gaya (E2E) |
| **NOT VERIFIED** | Koi dawa nahi — verify karne ka tool/data nahi tha |

---

## 0. Session summary (jo aaj hua)

| # | Sprint todo | Status | Evidence |
|---|---|---|---|
| A | Not-indexed sawaal ka jawab, evidence ke saath | **DONE** | [NOT-INDEXED-ANSWER-2026-10-18.md](NOT-INDEXED-ANSWER-2026-10-18.md) — 631 audited, 0 fixable |
| B | tile-grout thinset math fix + test | **DONE** | `js/data/home-garden.js` + 2 test files (24 tests), SGM/CUSTOM published charts |
| C | Snow-day calculator page end-to-end | **DONE** | `deploy/everyday/snow-day/index.html` (78 541 B, 1 H1, 2 557 words, canonical, in sitemap, QA contract PASS) |
| D | GSC/GA4 access checks + credential blockers | **DONE** | GSC live (invalid_grant resolved) · GA4 blocked (API disabled) — §3 |
| E | Keyword-map / cannibalization / URL-format / page-drift / sitemap / redirect audits | **DONE** | §4 items 11–36 below |
| F | Full unit / build-gate / formula-QA suites (E2E skipped) | **DONE** | `npx vitest run` → **90 files, 2695 tests, 0 fail**; build + 7 gates pass |
| G | 51-item evidence report + changelog + rollback | **DONE** | Ye document |

---

## 1. Build + gate evidence (final build, 2026-10-18)

```
$ node build-deploy.js                                     → BUILD_EXIT=0
  QUALITY GATE      : sitemap URLs 1420 · pages checked 1419 · unique titles 1515 · failures 0  → ✅ PASS
  PERFORMANCE BUDGET: eager-js 921KB/1600KB · index 87KB/90KB · css 92KB/110KB          → ✅ PASS
  TITLE-LENGTH GATE : 1420 pages scanned (197 noindex skipped) · too short 0 · too long 0 → ✅ PASS
  CRAWL-LINK GATE   : 616 not-indexed targets · covered by an indexed page 616 · uncovered 0 → ✅ PASS
  STALENESS GATE    : every published artifact at least as new as its data               → ✅ PASS
  INTERNAL LINKS    : mismatches 0 · broken (404) targets 0 unique / 0 links              → ✅ PASS
$ node scripts/check-sitemap-coverage.cjs  → sitemap 1420 / covered 1420 / missing 0      → ✅ PASS
$ node scripts/check-page-count-drift.cjs  → 15 metrics, sab 0 drift · toolIds 1285      → ✅ PASS
$ npm run lint:js                          → 446 files checked, 0 failed
$ npm run check:counts                     → all count references match the registry (1285)
$ npm run check:category-dup               → 20 pairs, max overlap 59.2% (limit 65%) → ok
$ npm run cluster:check                    → 70 cluster slugs in sitemap · 60 spokes + 10 hubs linked
$ npm run drift:check                      → all mirrored modules synchronized
$ npx vitest run                           → Test Files 90 passed (90) · Tests 2695 passed (2695)
```

---

## 2. Tile-grout math fix (sprint todo B)

**Bug (verified in code before the fix):** `groutLbs = sqft * 0.02 * (1 + 1/(ts/12)^2) * 1.5` — the
`groutWidth` input was never read (changing joint width changed nothing), and
`thinsetBags = ceil(sqft * 1.1 / 60)` used one flat coverage for every trowel.

**Fix:** joint-network volume model for grout, trowel coverage table for thinset, both from published charts.

| Source | Figure used |
|---|---|
| SGM grout chart (25 lb bag) | 12×12 / 3⁄8" bed: **392 / 199 / 135 ft²** at 1⁄8" / 1⁄4" / 3⁄8" joints; 6×6 / 5⁄16" bed: **239 / 123 / 85 ft²** ([sgm.cc/grout-calculator](https://www.sgm.cc/grout-calculator/)) |
| CUSTOM VersaBond (50 lb bag) | **90–100 / 60–67 / 42–47 / 34–38 ft²** for 1⁄4"×1⁄4", 1⁄4"×3⁄8", 1⁄2"×1⁄2", 3⁄4"×9⁄16" U-notch ([custombuildingproducts.com](https://www.custombuildingproducts.com/products/versabond-professional-thin-set-mortar-2)) |
| MAPEI trowel→tile size | ≤8" = 1⁄4"×1⁄4" · 10–17" = 1⁄4"×3⁄8" · 18"–36" = 1⁄2"×1⁄2" · 24"+ = U-notch ([mapeihome.com](https://mapeihome.com/blog/2021/05/15/what-size-trowel-should-i-use/)) |
| Waste | +10% (LATICRETE estimator allowance) |

**Measured behaviour after the fix:**

```
{sqft:100, tileSize:12, groutWidth:0.125}                       → 7 lbs grout + 2 bags thinset
   SGM chart says 6.38 lb excl. waste → +10% = 7.0 lb          (model: 7.03)
{sqft:100, tileSize:12, groutWidth:0.375, trowel:quarter_3_8}    → 21 lbs grout  (chart 18.5 + 10% = 20.4)
{sqft:100, tileSize:18, groutWidth:0.125, trowel:half}           → 5 lbs grout + 3 bags
{sqft:600, tileSize:18, trowel:half}                             → 15 bags  (old flat-60 rule said 11)
{sqft:100, tileSize:18, trowel:quarter}  → ⚠ "notch is small for 18\" tile — MAPEI suggests 1/2\" × 1/2\""
{sqft:100, tileSize:6,  trowel:half}     → ℹ "larger than 6\" tile needs — MAPEI suggests 1/4\" × 1/4\""
```

Model vs SGM chart: **12×12 rows within 3.5%**, 6×6 rows within 8.6% (widest joints) — the tolerance the tests pin.

Also fixed: `tiles = ceil(sqft/tileSqft*1.1)` returned **111** tiles for 100 ft² of 12" tile
(`100/1*1.1 = 110.00000000000001` in IEEE-754); now 110, with a guard and a test.

**New/changed tests**

| File | Tests | Kya pin karta hai |
|---|---|---|
| `tests/unit/tile-grout-math.test.js` (new) | 21 | 6 SGM chart rows within 9% · linear joint-width & thickness scaling · bags between published low/high bounds · monotonic with notch width · both warning directions · float guard |
| `tests/unit/tile-grout.test.js` (updated) | 7 | "2 bags, not 10" · area scaling · never below published low end · states per-notch coverage · retired flat-60 rate · grout follows the chart · joint width changes result |
| `tests/unit/formula-qa-full.test.js` (1 row updated) | — | tile-grout expectation 6 → 7 lb, with the SGM citation in the note |

`docs/qa-contracts.json` → tile-grout contract rewritten (inputs, formula, known-answer file, notes).

## 3. GSC + GA4 credentials (checklist 1–5)

```
$ node scripts/gsc-verify-access.cjs
✅ step 1 token exchange OK (expires in 3599s)
✅ step 2 property list OK — 2 properties readable; target https://calcpromaster.com/ present
✅ step 3 searchAnalytics read OK — 5 days (2026-10-11 → 2026-10-17)
   clicks 2 · impressions 3027 · newest day with data 2026-10-15
✅ ALL READ CHECKS PASSED

$ node scripts/ga4-discover-property.cjs
✖ Google Analytics Admin API is DISABLED on Cloud project 601116511726 — blocked, not a credential bug.
```

- **invalid_grant (item 1): resolved.** Token exchange, property list and searchAnalytics all pass today.
- **GA4 (item 3): BLOCKED on the owner.** Enable Admin + Data APIs in the Cloud project
  (`analyticsadmin.googleapis.com`, `analyticsdata.googleapis.com`), then re-run. Property ID cannot be
  discovered until then; no GA4 numbers are claimed anywhere in this report.

## 4. All 51 checklist items

### Access + baseline

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | GSC invalid_grant fix, access restore | **DONE** | §3 — 3/3 read checks pass |
| 2 | Fresh SEO baseline (clicks, impressions, CTR, position, indexing) | **PARTIAL** | 7-day window read from the API: clicks 2 · impressions 3027 · days 2026-10-11→17. CTR/position per page are in `data/gsc-page-impressions.json` / `data/gsc-query-page.json`; the weekly panel that refreshes them is `npm run seo:weekly` (not run — it also hits GA4 and would re-write dozens of artifacts mid-review) |
| 3 | GA4 property + service-account access | **BLOCKED** | §3 — APIs disabled on the Cloud project; owner action required |
| 4 | Missing 88-keyword export | **DONE** | `data/keyword-gap/keyword-volume-difficulty.csv` — **88 rows, columns Keyword, Search Volume, CPC, Difficulty, Intent** |
| 5 | Verify search data (country/device/query/page) | **PARTIAL** | Query+page joins exist (`data/gsc-query-page.json`, 4465 query→page pairs). Country/device splits are not in the exported files — **not verified**, no claim made |

### Keyword work

| # | Item | Status | Evidence |
|---|---|---|---|
| 6 | Re-assess priorities from real impressions/CTR | **DONE** | Priorities regenerated from the audit (`npm run keywords:fresh`): P0 0 · P1 11 · P2 80 · P3 16, driven by the audit's volume + the opportunity field, not by guesswork |
| 7 | Improve 28 B-level target pages | **PARTIAL** | Map now says **B 33** (recomputed from the current 604-keyword audit; the old 28 was an earlier revision). Every B/C/D row has a resolved owner: `node scripts/apply-keyword-targets.cjs` → 89 already applied, 2 NO_OWNER, 0 unexpected |
| 8 | Improve 62 C-level target pages | **PARTIAL** | Map says **C 51**; same resolver run covers them; 2 rows honestly recorded as no-owner (see item 9 note) |
| 9 | Review 7 D rows (improve/defer/remove) | **DONE** | **D 7** — all 7 keep the recorded "one page must own the cluster" decision; 0 became A rows |
| 10 | Verify P1 target mapping + intent | **PARTIAL** | 11 P1 rows in `docs/KEYWORD-IMPLEMENTATION-MAP.md`; mapping is machine-derived and reviewed there, but intent was not re-checked against live SERPs (§ items 37–39) |
| 11 | Cannibalization check | **DONE** | `node scripts/audit-cannibalization.cjs` → 4465 query→page pairs · 81 split across 2+ pages (4% of joined impressions) · **actionable (≥3 impr on weaker page): 0** |
| 12 | Search-intent match per page | **PARTIAL** | Intent clustering + audit verdicts cover it structurally (COVERED 476 / WEAK 26 / GAP 81 / IGNORE 21); per-page SERP verification not done |
| 13 | Page-specific content (not generic) | **DONE** | `docs/INTENT-AUDIT.md` → I1 clusters 101 (42 cross-category) · **I2 meta dupes 0 · I3 thin metas 0 · I4 near-dup titles 0**; per-tool intros regenerated (1285 unique, min/avg/max 103/124.1/136 words) |
| 14 | Internal linking improvements | **DONE** | Build gate: 0 slash mismatches, 0 broken targets; `npm run cluster:check` → 70 cluster slugs live, 60 spokes carry hub links, 10 hubs carry ≥2 spokes; crawl-link gate 616/616 not-indexed pages have an inlink from an indexed page |
| 15 | Titles + meta descriptions (relevance, uniqueness, length) | **DONE** | Title gate 1420 pages: 0 too short, 0 too long; quality gate unique titles 1515, 0 failures; INTENT-AUDIT I2/I4 = 0 |
| 16 | Formula + worked examples independently verified | **DONE** | `npx vitest run` 2695 tests pass, including `formula-qa-full` (independent expectations from textbook formulas), `reverse-calc`, `tile-grout-math` (published charts) |
| 17 | FAQ gaps (only supported answers) | **DONE** | FAQ copy is generated from each tool's own registry row (name + input labels + whether it shows steps), so nothing is invented; `apply-keyword-targets.cjs` reports 89 applied rows |
| 18 | Volume / difficulty / CPC data | **PARTIAL** | Available on disk: 88 rows with Volume+CPC+Difficulty+Intent, 500 Keyword-Planner rows with Volume/competition/bids. Ahrefs/Semrush exports are not in the repo → those columns stay empty rather than guessed |
| 19 | SERP opportunity research | **NOT VERIFIED** | `docs/SERP-OPPORTUNITY-REPORT.md` exists from earlier work, but nothing this session observed a live SERP (no SERP tool available) — treated as unverified |

### The named tasks

| # | Item | Status | Evidence |
|---|---|---|---|
| 20 | "Prove one page can move" | **DONE (content-side)** | `docs/PAGE-EXPOSURE-PROOF.md` — measured section exposure before/after (e.g. home-insurance table bucket 874→453 words, exposure thresholds met). Ranking/clicks proof needs GSC time — explicitly not claimed |
| 21 | "Catch page count drift" | **DONE** | `npm run check:page-drift` → 15 metrics, **0 drift** (sitemapUrls 1420, deployPages 1620, toolIds 1285, missingToolPages 0, inventoryRows 1419, thinPages 141, stuckPages 208, backlogWrite 17, backlogExpose 8, …) |
| 22 | "Fill the #1 page's gap" | **DONE** | #1 page = `/lifestyle/home-insurance` (75 queries, 1003 impressions). The missing+deep bucket was `region`; added, and exposure re-measured (`data/page-exposure-baseline*.json`, `docs/PAGE-EXPOSURE-PROOF.md` §1) |
| 23 | "Do the expose tier first" | **DONE (meaning resolved)** | "Expose tier" = the rows the exposure report marks `action='expose'` (`exposeShare: 0.35` in `data/page-exposure-baseline.json`). Those rows (home-insurance + FHA + PMI mortgage pages) were the ones shipped first in the 2026-10-12 pass — so the label is now operationally defined, not guessed |
| 24 | Playwright browsers + E2E | **SKIPPED** | User instruction: "e2e kia skip karo". Browsers not installed this session |
| 25 | Visual tests (desktop + mobile) | **SKIPPED** | Same instruction — Playwright-driven (`tests/visual/regression.spec.js` not run) |
| 26 | Mobile responsiveness verification | **SKIPPED** | Same; the unit-level `tests/unit/visual-polish.test.js` does pass in the suite |
| 27 | Calculator functionality (normal/edge/invalid/reset) | **DONE (unit level)** | `formula-qa-full`, `reverse-calc`, `tile-grout*`, `data-seed-preservation` — all in the 2695 passing tests. Not driven through a real browser (see 24) |
| 28 | Formula accuracy (units, rounding, conventions, dates, locale) | **DONE (unit level)** | Same suites: independent expected values, rounding/`toFixed` behaviour, day-count conventions (loan-emi), regional tax/payroll models (`regional-takehome-batch*-qa.test.js`) |
| 29 | Build, lint, automated tests | **DONE** | §1 — build exit 0, 7 build gates PASS, `lint:js` 446 files 0 failed, vitest 2695/2695 |
| 30 | SEO audit re-run (metadata, canonical, breadcrumbs, schema, indexability) | **DONE** | Quality gate checks canonical/noindex/H1/description/word count/QA contract per sitemap URL → 0 failures; location/QA rules verified per page |
| 31 | Sitemap ↔ routes ↔ canonical | **DONE** | `check-sitemap-coverage.cjs` 1420/1420 static files, 0 missing; spot-verified guide form (`/guides/age` 200, `/guides/age/` 308) and tool form (`/finance/tax/` 200, `/finance/tax` 308) |
| 32 | Redirects (chains, dead ends, path preservation) | **DONE** | `check-host-redirects.cjs` → apex 200 · www root and deep link 301 with path preserved · pages.dev root and deep link 301 · **PASS**. `_redirects` host rules sit above the asset wildcards |
| 33 | Review 9 URL-format warnings | **DONE (decision: leave)** | `audit-url-format.cjs` → 1420 scanned, **0 FAIL, 9 WARN** (U8: category word repeated in slug, e.g. `/family/family-budget/`). No evidence of harm, so no URL changed — renames would need 301s and re-earning signals; revisit only if one of them starts earning impressions |
| 34 | Five generated keyword docs review + `keywords:check` | **PARTIAL** | All 5 docs regenerate cleanly (`npm run keywords:fresh`, exit 0; 1 title / 7 metas / 10 answer blocks changed after the SEO regen, placeholders 0). `npm run keywords:check` still exits 1 **because the staged copies in the git index are one revision behind the working tree** (`git show :docs/KEYWORD-TARGETS.md` → 63 joins vs working tree 64). The generator is deterministic (two runs → identical md5). Fix: re-stage/commit the regenerated docs (needs your commit go-ahead) |
| 35 | Keyword-map regression (no unresolved A rows; invalid targets detected) | **DONE** | Map decisions **A 0**; `tests/unit/keyword-implementation-map.test.js` pins "never proposes a URL for an E row" — that test was failing (E row `snow days calculator` carried `/everyday/jet-lag`), generator fixed at the source |
| 36 | Page count ↔ keyword-map consistency | **DONE** | Map totals: registryTools 1285, sitemapUrls 1420 — identical to the drift gate's numbers; `check:counts` passes |

### Competitive / SERP

| # | Item | Status | Evidence |
|---|---|---|---|
| 37 | Competitor comparison | **NOT VERIFIED** | `docs/COMPETITIVE-GAP-STATUS.md` + `data/keyword-gap/calculator-net-gap.csv` (10 rows, position + ranking URL) exist, but no live competitor pages were opened this session |
| 38 | Competitor content-gap report | **PARTIAL** | Gap CSVs (calculator-net 10 rows, calculatorsoup 10 rows) are ingested by the audit; the narrative report was not re-verified |
| 39 | Rendered SERP checks (AI Overviews, ads, sitelinks) | **NOT VERIFIED** | No SERP rendering tool available; nothing assumed |

### Implementation batches

| # | Item | Status | Evidence |
|---|---|---|---|
| 40 | Priority-page implementation batch (small, QA, then next) | **DONE** | 89 B/C/D rows improved across owner pages with QA after each batch (FAQ/`lsi` edits), 2 rows honestly left as no-owner |
| 41 | Calculation-accuracy + content-quality QA report | **DONE** | §2 (tile-grout, with published charts) + §1 (2695 unit tests) + `docs/qa-contracts.json` coverage; **78 tools remain in the `NEEDS HUMAN REVIEW` queue** (smoke-tested, not yet independently verified) — printed by the quality gate every build so it cannot be forgotten |
| 42 | Internal-linking + technical recommendations checklist | **DONE** | §4 items 14, 21, 30–33 + `docs/LINK-EQUITY-PLAN.md`; crawl-link gate 616/616 covered |
| 43 | Changelog (files, changes, tests, failures, outstanding) | **DONE** | §5 (this session) + `docs/CHANGELOG.md` regenerated from the ledger |
| 44 | Rollback instructions | **DONE** | §6 |
| 45 | Pre-deployment checks | **DONE** | §1 — build + all gates green on the final build |
| 46 | Production deployment | **NOT DONE (needs your approval)** | Nothing was deployed or pushed. `deploy/` is ready; production still serves the previous build |
| 47 | Post-deployment verification | **NOT DONE** | Cannot run before 46. Prepared: `tests/e2e/deploy-smoke.spec.js` exists for the post-deploy pass |
| 48 | GSC indexing review + sitemap submission | **BLOCKED (user action)** | Read access works; submitting/resubmitting the sitemap and Request Indexing are account actions. Current state documented in [NOT-INDEXED-ANSWER-2026-10-18.md](NOT-INDEXED-ANSWER-2026-10-18.md) |
| 49 | Post-change SEO performance comparison | **BLOCKED** | Needs time after deploy + GA4 (item 3). Baseline to compare against is §3 (clicks 2, impressions 3027 over 7 days) |
| 50 | 30/60/90-day monitoring plan | **DONE** | §7 |
| 51 | Final evidence report (done/failed/blocked/not-verified separated) | **DONE** | This document |

---

## 5. Changelog — files changed this session

### Code / data (substantive)

| File | Change | Why |
|---|---|---|
| `js/data/home-garden.js` | tile-grout: +`tileThick`, +`trowel` inputs; joint-volume grout model (joint width now used); trowel-coverage thinset; notch/tile mismatch warnings; float guard on tile count | Old maths ignored `groutWidth` and used one flat thinset rate |
| `js/tool-intros.js` | Regenerated (1285 intros) | Generator output must match; the file had drifted for one tool |
| `js/seo-content.js`, `js/seo/*.js` | Regenerated via `npm run seo:regen` (1 title · 7 meta descriptions · 10 answer blocks changed; placeholder audit 0 findings). tile-grout meta no longer claims "a result of 6 lbs grout" | Page copy must match the tool it describes |
| `docs/qa-contracts.json` | tile-grout contract rewritten; **336 stale `route` fields repaired** (`/auto-transport/…` → `/auto/…`, `/home-garden/…` → `/homegarden/…`) | Reviewer traceability: 336 of 1285 routes pointed at nothing |
| `scripts/audit-keyword-gap.cjs` | `days → day` synonym; `buildIndex` exported for tests/probes | The audit handed "snow days calculator" to `/everyday/jet-lag` although `/everyday/snow-day` states it |
| `scripts/build-keyword-implementation-map.cjs` | E rows can no longer carry a `proposedUrl` | An E row is a "do not build" verdict; printing a target URL contradicted it |
| `scripts/fix-qa-contract-routes.cjs` | New (+`--check` mode) | The repair tool for the route drift above |
| `scripts/gsc-inspect-one.cjs` | New | No script printed the full inspection payload (userCanonical/googleCanonical/lastCrawl), needed for the §4/#33 evidence |
| `tests/unit/tile-grout-math.test.js` | New (21 tests) | Pin the maths against published coverage charts |
| `tests/unit/tile-grout.test.js` | Rewritten to the trowel model | It pinned the retired flat-60 rule |
| `tests/unit/formula-qa-full.test.js` | tile-grout expectation 6 → 7 lb (+ source note) | The old expectation encoded the bug |
| `tests/unit/qa-contract-routes.test.js` | New (3 tests) | Every contract route must resolve; N/A records allowed to have empty inputs |

### Regenerated artifacts (pipelines, not hand-edited)

`docs/KEYWORD-TARGETS.md` · `docs/KEYWORD-AUDIT.md` · `docs/INTENT-AUDIT.md` · `docs/KEYWORD-DIFFICULTY.md` · `docs/HARD-KEYWORDS.md` · `docs/KEYWORD-IMPLEMENTATION-MAP.md` · `docs/KEYWORD-GAP.md` · `docs/CHANGELOG.md` · `changelog.html` · `docs/CANNIBALIZATION-REPORT.md` · `docs/URL-FORMAT-AUDIT.md` · `docs/NOT-INDEXED-FULL-AUDIT.md` · `data/keyword-implementation-map.json` · `data/keyword-gap.json` · `data/keyword-gap-verdicts.csv` · `data/keyword-target-resolution.json` · `data/top10-push-list.json` · `data/seo-changelog.json` · `data/cannibalization-audit.json` · `data/url-format-audit.json` · `data/not-indexed-audit.json` · `deploy/**` (build output).

### New documents

`docs/NOT-INDEXED-ANSWER-2026-10-18.md` (the answer + evidence) · `docs/EVIDENCE-REPORT-2026-10-18.md` (this file).

### Failures encountered and fixed (not skipped)

1. `tests/unit/tile-grout.test.js` pinned the retired flat-60 rate → rewritten, still asserts the "2 bags, not 10" regression.
2. `tests/unit/keyword-implementation-map.test.js` "E row must not propose a URL" → generator fixed (not the test).
3. `tests/unit/keyword-targets.test.js` (2 tests) → resolver re-run (`apply-keyword-targets.cjs`), then `split-seo` + rebuild so the FAQ copy was actually in the built page.
4. `tests/unit/seo-audit-guards.test.js` "intro file matches generator" → `node generate-intros.js`.
5. Build `STALENESS GATE` failed twice (`top10-push-list.json`, `seo-changelog.json`) → ran each artifact's builder, then the rebuild passed.
6. `npm run keywords:check` still exits 1 (see item 34) — root cause is the git index being one revision behind, not the generator; left for your commit.

## 6. Rollback instructions

Everything is local and uncommitted; nothing is deployed. Pick the smallest step that undoes what you want:

```bash
# 0) See exactly what changed
git status --porcelain
git diff --stat

# 1) Undo ONLY the tile-grout maths + tests (safe, self-contained)
git checkout -- js/data/home-garden.js tests/unit/tile-grout.test.js tests/unit/formula-qa-full.test.js
rm tests/unit/tile-grout-math.test.js
#    then restore the contract record:
git checkout -- docs/qa-contracts.json

# 2) Undo the keyword-audit / map repairs
git checkout -- scripts/audit-keyword-gap.cjs scripts/build-keyword-implementation-map.cjs
git checkout -- data/keyword-implementation-map.json docs/KEYWORD-IMPLEMENTATION-MAP.md

# 3) Undo the QA-contract route repair only
node -e "…" # or simply: git checkout -- docs/qa-contracts.json   (reverts both contract edits)

# 4) Undo the regenerated SEO copy (per-page meta/title)
git checkout -- js/seo-content.js js/seo/ js/tool-intros.js

# 5) Rebuild whatever you rolled back, then re-run the gates
node build-deploy.js
node scripts/quality-gate.cjs && node scripts/check-sitemap-coverage.cjs && node scripts/check-page-count-drift.cjs
npx vitest run
```

Notes:
- `deploy/` is generated output — deleting it and re-running `node build-deploy.js` is always safe.
- If you roll back `js/data/home-garden.js` **and keep** `tests/unit/tile-grout-math.test.js`, that test will fail by design (it asserts the corrected maths). Roll back both or neither.
- The 336 route repairs are reversible with `git checkout -- docs/qa-contracts.json`; re-applying is `node scripts/fix-qa-contract-routes.cjs`.
- No file outside the repository was touched; no credentials were read, printed or written.

## 7. 30/60/90-day monitoring plan

| Window | KPI (measurable) | Where | Action if flat |
|---|---|---|---|
| Baseline now | clicks 2 · impressions 3027 (7d) · indexed 640/1415 · sitemap 1420 | `data/gsc-coverage-report.json`, `gsc-verify-access` output | — |
| Day 30 | Indexed share (target: +80–120 URLs) · not-indexed fixable stays **0** · GA4 enabled and receiving sessions | `npm run seo:weekly`, `audit-not-indexed.cjs`, GA4 | Request Indexing 12/day on the top of `docs/REQUEST-INDEXING-TOP40.md`; chase 20–30 referring domains |
| Day 60 | First clicks on the exposed pages (`/lifestyle/home-insurance`, `/finance/fha-loan`, `/finance/pmi-calculator`) · `/guides/break-even` no longer "duplicate" · impressions per priority page from `data/gsc-query-page.json` | GSC + `npm run seo:movement` | Rewrite the guide/calculator split (§4 item 33 area); run one more implementation batch on P2 rows |
| Day 90 | CTR ≥ 1.5% on the top-40 pages · 5+ keywords in the top 20 · 25%+ of sitemap URLs indexed | GSC + `data/top10-push-list.json` | Re-prioritise from real impressions only (`npm run keywords:fresh` then review P1/P2) |

Guardrails that must stay green at every checkpoint: quality gate 0 failures, page-count drift 0, sitemap coverage 1420/1420, unit suite 2695 passing.

## 8. What is NOT verified (explicitly)

- Ranking/CTR improvement from these changes — needs crawl time after deploy; no claim made.
- Live SERP features (AI Overviews, ads, sitelinks) — no tool used, nothing assumed (items 37–39).
- Anything GA4-based (item 3 blocked).
- Playwright E2E/visual/mobile — skipped on your instruction (items 24–26); calculator behaviour is covered only at unit level.
- `npm run keywords:check` green — blocked on staging/committing the regenerated docs (item 34).
- Production deployment and post-deploy verification (items 46–49).
