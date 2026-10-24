# SEO programme status — Phase 1 → 11, deliverable by deliverable

_Written 12 October 2026 against the current repository state. This is the answer to
"which phases are done and which are left": every line names the artifact that exists
today, or says plainly that it does not exist and why._

Read the two notes first, because they change how the rest of the table should be read:

1. **Phases 6, 7 and 8 are now mapped line by line.** The first paste of the brief was
   cut between Phase 5 and Phase 9; the full text arrived later, so those three phases
   are no longer an assumption — see **§6**, which walks their sub-items one at a time
   and says which are done, which are partial and which are contradicted by live data.
2. **Some phases cannot be finished in this environment at all**, because they need a
   credential or a paid data source that is not connected here (keyword provider, GSC
   country dimension, live crawl). Those are listed as *Blocked* with the exact export
   needed, and the artefacts produced are honest about the missing cells rather than
   filling them with plausible numbers.

---

## 1. Phase-by-phase

| Phase | Status | Evidence in this repo | What is genuinely left |
|---|---|---|---|
| **1 — Website inventory** | ✅ Done | `docs/SITE-INVENTORY.md` + `data/site-inventory.csv` + `data/site-inventory.json` — **1,417 / 1,417** sitemap URLs, generated 2026-10-12 by `scripts/build-site-inventory.cjs`. Fields: URL, page type, category, title, H1, indexability, canonical, content uniqueness (template-share), intent, internal links, technical flags, GSC index status, reach tier, recommended action. Classifications: 792 major-improve · 585 investigate-indexing · 28 minor-update · 11 keep-improve · 1 cannibalization | Live status codes, robots and redirect behaviour are **not** in it — it is built from the deploy tree, not a crawl. Run `scripts/seo-indexing-audit.cjs` / `live-sitemap-audit.cjs` against production to add that layer |
| **2 — Real keyword research** | 🟡 Structurally done, provider data blocked | `docs/KEYWORD-TARGETS.md` (2,518 curated phrases / 1,201 pages) · `docs/KEYWORD-AUDIT.md` · `docs/KEYWORD-DIFFICULTY.md` (model + 6 live SERP probes) · `docs/EASY-KEYWORD-LIST.md` · `docs/HARD-KEYWORDS.md` · `docs/INTENT-AUDIT.md` · **new:** `data/keyword-research.csv` + `docs/KEYWORD-RESEARCH.md` (15 brief fields per row, 644 rows: 599 measured + 45 targeted) | **Blocked:** monthly volume, provider KD, CPC, country/device split, competitor metrics. No provider is connected. Cells say `Not available` with the reason. Needed: a Keyword Planner / Ahrefs / Semrush export and a country-dimension GSC export |
| **3 — Competitor & SERP analysis** | ✅ Done for 4 priority clusters (**new this session**) | `docs/SERP-OPPORTUNITY-REPORT.md` — clusters chosen by **measured** impressions: home insurance (1,003/28d), APY (263), BMR (261), business days (219). Per cluster: ranking page types, features, inputs, methodology disclosure, omissions, verbatim PAA, our page's state, an opportunity brief, and a "do NOT" list | Rendered-SERP capture **done 2026-10-12** (§5.1 of that report): AI Overview confirmed present on 3 of 4 clusters, absent (visually verified) on `bmr calculator`, no ad block, calculator widgets on the APY SERP, and **zero mentions of the site in any of the four SERPs**. Still open: probe coverage beyond these four clusters and a geo-controlled capture |
| **4 — Clustering & page mapping** | ✅ Done | `docs/topical-map.md` · `docs/TOPICAL-MAPPING-AUDIT.md` · `docs/CLUSTER-LINKING-PLAN.md` · `docs/KEYWORD-TARGETS.md` (primary/secondary per page) · `data/query-reach.json` `backlog` (write / expose / fine per query bucket) · `data/keyword-research.csv` `related_keyword_cluster` + `recommended_target_url` | Cannibalization found by the audit is only partially resolved: `docs/KEYWORD-AUDIT.md` §C2 lists 2 phrases still targeted by 2 pages each (`carbon footprint calculator`, `umrah package cost`) |
| **5 — Semantic content** | 🟡 Representative batch shipped, corpus-wide work remains | `js/tool-enhance.js` — **46** per-tool sections (verified by counting the map, not by memory) (formula + hand-verified table + internal links), rendered in **both** the prerendered HTML and the hydrated DOM; 20 page-2 pages + 16 position-20-50 pages already upgraded (`docs/MASTER-ACTION-CHECKLIST.md` 3.3/3.4); guide-depth pass via `scripts/apply-guide-depth.cjs` | 792 pages are classified `major-improve`. The next batch is named in `docs/QUERY-REACH.md` §5 (19 `write` + 6 `expose` on the top-25 pages) and now has SERP evidence for four of them |
| **6 — Technical & on-page SEO** | ✅ Done, one owner action left | Titles/meta/H1/canonical/robots/sitemap/CWV/JS-rendering/analytics all have a script, a gate and a test (`docs/MONITORING-30-60-90.md` §2 lists what runs when). Full sub-item mapping: **§6** · the 20 duplicate category pairs were **fixed 2026-10-12** (`docs/DUPLICATE-HUBS-FIX.md`, §6.5) | The live sitemap is still **2 URLs behind the repo** (`/stats`, `/changelog` not deployed) — an owner upload, not a code defect. §6.6 records a structured-data false alarm that was ruled out on the built artifact (and the rule that caused it) |
| **7 — Internal linking & topical architecture** | ✅ Done | Hierarchy + contextual anchors + orphan/broken-link gates: `docs/INTERNAL-LINK-AUDIT.md` (1,234 pages scanned, 0 weak, 0 orphan), `docs/CLUSTER-LINKING-PLAN.md`, `docs/LINK-EQUITY-PLAN.md`, `scripts/audit-crawl-links.cjs` (112,097 links, 0 broken), `scripts/check-cluster-links.cjs`, `tests/unit/category-depth.test.js`. Sub-item mapping: **§6** | No change proposed: the audit found no weak page, and forcing more links would be the "every page links to every page" failure the brief warns about |
| **8 — Content quality & duplication** | 🟡 Done as an audit, fixes are page-batch work | `docs/THIN-PAGES-REPORT.md` + `docs/THIN-PAGES-FIX-2026-10-10.md` + `data/thin-pages.json` · template-share per page in `data/site-inventory.json` · `scripts/dev-measure-site-copy.cjs` · keyword-stuffing gate `scripts/audit-keyword-quality.cjs` (`docs/KEYWORD-AUDIT.md`) · unsupported-claims gate `tests/unit/enhance-claims.test.js` · outdated-formula dashboard `docs/formula-review-dashboard.html` · count-consistency gate `scripts/sync-counts.cjs` + `tests/unit/count-consistency.test.js`. Sub-item mapping: **§6** | The audit identifies; the fixes ride the page batches. `major-improve` count (792) is the remaining queue |
| **9 — Calculation verification** | ✅ Done for every page that makes a numeric claim | `docs/formula-review-dashboard.html` + `scripts/formula-review-checklist.cjs` · `docs/qa-contracts.json` · unit tests that **re-derive** published numbers independently (`tests/unit/enhance-claims.test.js` recomputes the APY, PMI, FHA-MIP, home-insurance and business-days figures and fails if the page and the calculator disagree; `compute-qa-expected*.cjs` + regional-take-home contracts cover the regional tools) | 1,282 calculators are not each individually re-verified here. Verification covers the pages whose **content** asserts a number. Boundary/zero/negative inputs are covered for the QA-contract tools, not for all 1,282 |
| **10 — GSC & performance** | ✅ Done within the data available | `data/gsc-query-page.json` (28d, 14,338 impressions / 18 clicks / avg pos 36.4, 69% join) · `data/query-reach.json` (455 canonical pages ≥5 impressions, 3,684 queries, reach tiers) · `data/growth-model.json` (7-day run-rate 1,240.7/day ≈ 37.8k/mo) · `data/index-panel.json` + `index-burndown.json` (590 tracked, 5 indexed) · `docs/IMPRESSION-TRACKER.md` · `docs/SEO-MOVEMENT-2026-10-09.md` / `-10-11.md` | No country/device split; clicks (18) are too few for trend reading. Baselines and the "no attribution without comparison" rule are written down in `docs/MONITORING-30-60-90.md` §1 |
| **11 — Implementation** | ✅ Done in controlled batches, verified | `docs/CHANGELOG.md` + `data/seo-changelog.json` (append-only, dated) · gates run after every batch: `npm run test:unit`, `npm run check:page-drift`, `npm run seo:staleness`, `node build-deploy.js` · rollback = `git revert` of that batch's commit | The four SERP-informed page improvements are briefed but only partly implemented (see §3) |

---

## 2. Deliverables A–J

| # | Deliverable | Status | Artifact |
|---|---|---|---|
| **A** | Full inventory + technical audit | ✅ | `docs/SITE-INVENTORY.md`, `data/site-inventory.{csv,json}` |
| **B** | Keyword research spreadsheet (sources, dates, country, volume, difficulty, SERP observations, confidence) | 🟡 **new this session** — spreadsheet exists with all 15 fields; volume/CPC/country blocked | `data/keyword-research.csv`, `docs/KEYWORD-RESEARCH.md`, generator `scripts/build-keyword-research-table.cjs` |
| **C** | Clusters + page-to-keyword mapping | ✅ | `docs/KEYWORD-TARGETS.md`, `docs/topical-map.md`, `data/query-reach.json` |
| **D** | Competitor & SERP opportunity report | ✅ **new this session** | `docs/SERP-OPPORTUNITY-REPORT.md` |
| **E** | Prioritised pages to improve first, with evidence | ✅ | `docs/QUERY-REACH.md` §5 → `data/query-reach.json` `backlog`; `docs/TOP10-PUSH-LIST.md`, `docs/POS-8-20-PLAN.md`, `docs/NOT-INDEXED-ACTION-PLAN.md` |
| **F** | Original page-specific semantic content | 🟡 representative batch shipped **including all four SERP-informed pages** | `js/tool-enhance.js` (**46** tool sections, +3 today), `guides/business-days.html`, guide-depth pass. Every new number is re-derived by `tests/unit/enhance-claims.test.js` (42 tests). Remaining: the wider `major-improve` queue (792 pages), taken in batches |
| **G** | Internal linking + technical recommendations | ✅ | `docs/LINK-EQUITY-PLAN.md`, `docs/INTERNAL-LINK-AUDIT.md`, `docs/CLUSTER-LINKING-PLAN.md`, `data/link-equity-plan.json` |
| **H** | Calculation accuracy & content-quality QA report | ✅ | `docs/formula-review-dashboard.html`, `docs/qa-contracts.json`, `tests/unit/enhance-claims.test.js` |
| **I** | Implementation change log + test results | ✅ | `docs/CHANGELOG.md`, `data/seo-changelog.json` + this session's entries in §4 |
| **J** | 30/60/90-day monitoring plan on measurable GSC data | ✅ **new this session** | `docs/MONITORING-30-60-90.md` (measured baselines, decision gates, rollback) |

---

## 3. What is left, and who can do it

### Blocked on the owner (a credential or an account action)

| # | Needed | Unblocks |
|---|---|---|
| 1 | ~~GSC sitemap resubmit~~ **done 2026-10-12 by API** (`PUT` → HTTP 204, `lastSubmitted` advanced). **Still owner-only:** the `Request Indexing` clicks — GSC's UI action has no API, and Google's Indexing API accepts only `JobPosting`/`BroadcastEvent` URLs | The day-30 indexing gate; the refreshed click list is `docs/REQUEST-INDEXING-TOP40.md` |
| 2 | **GSC export with country + device dimensions** | deliverable B's `country` column; per-market winnability |
| 3 | **Keyword Planner / Ahrefs / Semrush export** | deliverable B's volume, provider KD, CPC |
| 4 | Insurance premium data (licensed, e.g. Quadrant / NAIC / III) | the dominant PAA on cluster A — until then the page inverts the formula rather than inventing an average |

### Agent-completable, in order

0. ~~**Fix the 20 duplicate category hubs**~~ **done 2026-10-12** — one owner per block
   (FAQ + methodology + catalog grid on `/<cat>/`, comparison table on `/hub/<cat>/`),
   mean 5-gram overlap **79.8% → 54.3%**, gate `npm run check:category-dup` running in
   `build-deploy.js` and CI. No URL added, removed or redirected; rollback documented.
   → `docs/DUPLICATE-HUBS-FIX.md`
0b. ~~**Index-regression alert**~~ **done 2026-10-12** — `scripts/check-index-regressions.cjs`
   (`npm run seo:index-regressions`) compares every GSC snapshot **per URL** and alerts on
   indexed→not-indexed, new not-candidates and new duplicate-canonical findings; writes
   `docs/INDEX-REGRESSIONS.md` + `data/index-regressions.json`, keeps accepted findings in
   `data/index-regressions-ledger.json` (so CI cannot nag twice), and is wired into CI
   (gate) and the daily panel job (dedicated issue; the day's snapshot is still committed).
1. ~~**Four SERP-informed page improvements**~~ **all four shipped 2026-10-12** (§7):
   - `guides/business-days.html` — holiday-adjusted worked example (Mon 23 Nov 2026 → Mon
     30 Nov, and Tue 1 Dec with US Thanksgiving inside the window), +10 → Mon 7 Dec 2026,
     day-zero convention stated in the FAQ, shipping-clock vs legal-clock section, plus the
     **unclosed `<p>`** in the "How many working days are there in a month?" answer fixed.
   - `/finance/apy-calculator` — the monthly-contribution case that PAA #1 asks for
     ($1,000/month at 5.00% APY → **$12,272.58**), the lump-sum gap (**$327.42**), the
     promotional-rate caveat, and an APY/APR side-by-side table (5.000% nominal ↔ 5.116%
     effective; 4.889% nominal ↔ 5.000% effective).
   - `/lifestyle/home-insurance` — the formula inverted (target premium → max rate, rounded
     **down**: $350,000 with a $100/month ceiling → $3.42 → $1,197.00/yr → $99.75/mo, where
     $3.43 would overshoot at $100.04), the deductible break-even formula, and the
     lead-form-free statement.
   - `/health/bmr-mifflin` — the inventory's only `write` page that had no enhancement card:
     the **Mifflin-St Jeor** equation named and shown, two worked examples (1,730 / 1,320
     kcal/day), the activity-multiplier table to TDEE (2,076 → 3,287), and an explicit
     boundary that refuses the three clinical PAA questions.
2. ~~**Rendered SERP capture**~~ **done 2026-10-12 for the four priority clusters**
   (`docs/SERP-OPPORTUNITY-REPORT.md` §5.1): AI Overview present on home insurance,
   business days and APY, **absent on BMR**, no ad block, interactive widgets on the APY
   SERP, and we appear in none of the four SERPs. **Remaining:** the same pass for the next
   batch's clusters, and a geo-controlled capture (cluster D rendered a UK result under
   `gl=us`).
3. **Resolve the two cannibalization pairs** flagged in `docs/KEYWORD-AUDIT.md` §C2 — now the
   *only* cannibalization left: the category/hub pairs that dominated §6.4 are fixed.
4. **Next 20 pages** from `docs/QUERY-REACH.md` §5 once the index and reach gates move
   (`docs/MONITORING-30-60-90.md` §5 scale rule).

---

## 4. What changed in this session

| File | Change |
|---|---|
| `docs/KEYWORD-RESEARCH.md` + `data/keyword-research.csv` | **New** — deliverable B. 644 rows × 22 columns; measured / modelled / available / `Not available` clearly separated; intent derived by inspectable code rules, not a model verdict |
| `scripts/build-keyword-research-table.cjs` | **New** — the generator (also writes the companion doc) |
| `docs/SERP-OPPORTUNITY-REPORT.md` | **New** — deliverable D, four clusters with URLs read, observation dates, confidence per row |
| `docs/MONITORING-30-60-90.md` | **New** — deliverable J, measured baselines + day 30/60/90 gates + rollback |
| `docs/SEO-PHASE-STATUS.md` | **New** — this document |
| `package.json` | `keywords:research` script |
| `scripts/weekly-seo-refresh.cjs` | new step **7c** regenerates the keyword research table each weekly run |
| `scripts/audit-report-staleness.cjs` | the CSV and its doc are now tracked, so a refreshed GSC join that is not followed by a regenerated table fails the gate |
| `js/tool-enhance.js` | **+3 content sections** — home-insurance (inverted formula + deductible break-even), apy-calculator (monthly contributions + APY/APR table), and a brand-new `bmr-mifflin` entry. All arithmetic-verified |
| `tests/unit/enhance-claims.test.js` | **42 tests (was 29)** — the new sections are re-derived independently, plus the BMR card is asserted against the shipped calculator (1730 kcal male, 1320 kcal female, 2682 moderate TDEE) and against clinical-advice phrases it must not contain |
| `tests/unit/keyword-research-table.test.js` | **new** — locks deliverable B's field contract (17 brief columns, uniform 22-column width, `Not available` cells carrying a reason, probed vs unprobed rows) |
| `data/gsc-inspect-batch-2026-10-12.json` | **new** — live URL Inspection of 40 URLs (26 indexed / 8 unknown / 5 discovered / 1 alternate-canonical) |
| `data/keyword-research.csv`, `docs/KEYWORD-RESEARCH.md` | regenerated after the ragged-row fix (every row now 22 columns) |
| `docs/REQUEST-INDEXING-TOP40.md` | regenerated from current data — the click list for the GSC UI action |
| `docs/SERP-OPPORTUNITY-REPORT.md`, `docs/MONITORING-30-60-90.md`, `docs/SEO-PHASE-STATUS.md` | §6 (Phases 6–8 mapping), today's live checks, and the implementation status in §7 |
| `docs/DUPLICATE-HUBS-FIX.md` | **New** — the evidence, the keep-both-URLs decision, the block-ownership fix, the measured before/after, the gate and the rollback plan |
| `js/category-depth.js` | new shared `compareTableHtml()` — registry-driven comparison table (`Calculator / What it works out / What you enter`), one row per tool with its own input labels, every row linking its tool page. Refuses to render if it cannot back the table with real labels |
| `scripts/ssg-pages.cjs` | 7b category pages gain the FAQ + `FAQPage` JSON-LD; 7c hubs lose the methodology note, the 48-card catalog grid and the FAQ, and gain the comparison table + a link back to the category page |
| `js/category-hub.js`, `js/app.js` | the client renderers mirror both changes, so the hydrated DOM matches the crawlable HTML (the repo's prerender===hydrate rule) |
| `scripts/check-category-duplication.cjs` + `tests/unit/category-duplication.test.js` | **New** — the gate (block ownership, 65% overlap ceiling, 150 unique 5-grams) and its 9 tests; wired into `build-deploy.js` (aborts the build) and `.github/workflows/ci.yml` |
| `scripts/check-index-regressions.cjs` + `tests/unit/index-regressions.test.js` | **New** — per-URL index-regression alert (indexed→not-indexed, new not-candidate, new duplicate-canonical) over every committed GSC snapshot; 6 tests pin the detector's behaviour on synthetic snapshots |
| `data/index-regressions-ledger.json` | **New** — accepted findings (currently the addressed `/finance/` duplicate-canonical, with the reason and the re-arm instruction) |
| `package.json`, `build-deploy.js`, `.github/workflows/ci.yml`, `.github/workflows/seo-panel-daily.yml` | new scripts `check:category-dup`, `seo:index-regressions(.update)`; the duplication gate aborts the build and runs in CI; the daily panel job runs the regression alert and opens a dedicated issue while still committing the day's snapshot |
| `scripts/audit-report-staleness.cjs` | tracks `data/index-regressions.json` → `docs/INDEX-REGRESSIONS.md`, so a new GSC snapshot cannot leave the alert report stale |

**Verification run for these changes**

```bash
npm run keywords:research      # 644 rows · measured 599 · targeted 45 · probed 4
npm run seo:staleness          # ✅ every published artifact at least as new as its data
```

Test results and any gate failures are reported in the turn that ships them, not
inferred from a successful build.

---

## 5. The honest summary

Phase 1, 3 (four clusters), 4, 9, 10 and 11 are done with artifacts on disk. Phase 2 is
done structurally and **blocked** on provider data. Phase 5 is done for a representative
batch and has a named, evidence-backed next batch. Phases 6–8 cannot be mapped because
their text was cut out of the brief — send it and they will be mapped line by line.

No keyword volume, keyword difficulty, competitor metric, ranking position, backlink
count or traffic figure anywhere in these deliverables is invented, and the pages that
would need such a number to be useful say `Not available` and name the export that would
fill them.

---

## 6. Phases 6, 7, 8 — mapped line by line (the full brief text is now available)

### 6.A Phase 6 — Technical and on-page SEO

| Brief item | Status | Where it lives | Evidence / last measured |
|---|---|---|---|
| Unique, descriptive titles | ✅ | `docs/KEYWORD-TARGETS.md` (each page's title = its primary target); gates `scripts/audit-title-length.cjs`, `scripts/audit-title-intent.cjs`; drift gate `npm run keywords:check` | 26 top titles rewritten (`scripts/rewrite-top-titles.cjs`), all within budget |
| Useful meta descriptions | ✅ | `scripts/analyze-meta-desc.cjs` → `scripts/rewrite-flagged-metas.cjs` | 183 flagged, 183 rewritten; analyzer now reports **0 of 1,219** |
| One clear main heading + logical subheadings | ✅ | `scripts/ssg-pages.cjs` emits exactly one `<h1>`; `scripts/audit-seo-placeholders.cjs` guards empty/placeholder headings | 0 placeholders in `data/seo-placeholder-audit.json` |
| Canonical URLs | 🟡 | `scripts/check-canonical.cjs` verifies self-canonical locally | Live exception today: `/finance/` is returned by GSC as **alternate page with a proper canonical tag** (§6.4) |
| Crawlable internal links | ✅ | `scripts/audit-crawl-links.cjs`, `data/crawl-link-gate.json` | 1,617 pages, **112,097 links, 0 broken, 0 trailing-slash mismatch** |
| Breadcrumbs and navigation | ✅ | breadcrumb markup generated in `scripts/ssg-pages.cjs` | present on every prerendered page |
| XML sitemap quality + accurate last-modified | ✅ | `generate-sitemap.js`, `scripts/check-sitemap-coverage.cjs` | repo sitemap 1,417 URLs; **live 1,415** → deploy lag (§6.4) |
| Robots directives and indexability | ✅ | SSG robots tags + `scripts/seo-indexing-audit.cjs`, `scripts/indexing-monitor.cjs` | no unexpected `noindex` in the deploy tree |
| HTTP status codes and redirect chains | ✅ | `scripts/check-host-redirects.cjs` + `tests/unit/check-host-redirects.test.js`, `scripts/probe-404.cjs` | host consolidation to `calcpromaster.com` verified; no chains in the gate |
| Duplicate and near-duplicate content | ✅ **fixed 2026-10-12** | measured by template-share in `data/site-inventory.json`; page-level reports `docs/THIN-PAGES-REPORT.md`, `data/thin-pages.json`; **new** `scripts/check-category-duplication.cjs` + `tests/unit/category-duplication.test.js` | The 20 category/hub pairs went from **79.8% → 54.3%** mean 5-gram overlap with **one owner per block** (FAQ + methodology + catalog on `/<cat>/`, comparison table on `/hub/<cat>/`), and the gate fails the build if a block returns to both pages. Evidence, decision and rollback: `docs/DUPLICATE-HUBS-FIX.md` (§6.5) |
| Mobile usability and Core Web Vitals | ✅ | `scripts/cwv-lighthouse.cjs`, `scripts/measure-cls.cjs`, `scripts/perf-budgets.cjs`, `data/cwv-baseline.json` | performance budgets PASS on the built artifact |
| JavaScript rendering / access to primary content | ✅ | prerendered HTML per page from `scripts/ssg-pages.cjs`; the hydration path is kept in sync by design (`js/tool-enhance.js` is rendered **both** ways) | every page ships its content without JS |
| Image alt text where images convey information | ✅ | `scripts/audit-a11y-prod.cjs`, `scripts/axe-scan.cjs` | audit run against production in this repo's history |
| Structured data that matches visible content | ✅ | FAQ/HowTo JSON-LD generated in the SSG; guarded by `tests/unit/seo-qa.test.js` | schema is emitted only where the page carries that content |
| "Do not promise a rich result; validate schema" | ✅ | no rich-result claim anywhere in `docs/` | — |
| "Do not change established URLs/canonicals without documenting reason and impact" | ✅ honoured | nothing was redirected, merged or re-canonicalled in this session | the 20 pairs are **documented** with evidence and left for the owner's decision |

### 6.B Phase 7 — Internal linking and topical architecture

| Brief item | Status | Where it lives | Evidence |
|---|---|---|---|
| Homepage → category → calculator → guide → related hierarchy | ✅ | `js/category-hub.js`, `js/category-depth.js`, `/hub/<cat>/` comparison hubs → `/cat/<tool>/` → `/guides/…` | `tests/unit/category-depth.test.js` enforces per-category depth |
| Contextual anchor text that describes the destination | ✅ | `scripts/normalize-internal-links.cjs`, `scripts/internal-links-boost.cjs` | anchor text is the destination's own name, not "click here" |
| Link pages when it genuinely helps the user continue | ✅ | each `js/tool-enhance.js` section links 2–4 related tools + a guide | e.g. home-insurance → renters-insurance, relocation-cost, mortgages guide |
| Orphan pages, broken links, excessive sitewide links, weak taxonomy | ✅ | `scripts/audit-internal-links.cjs`, `scripts/link-graph-audit.cjs` + `data/link-graph-audit.json`, `docs/INTERNAL-LINK-AUDIT.md` | 1,234 pages scanned, **0 orphans, 0 weak** (every tool page ≥3 contextual inlinks) |
| Clusters only where the relationship is coherent | ✅ | `docs/CLUSTER-LINKING-PLAN.md`, `npm run cluster:check` | cluster gate runs in the build |
| "Do not force every page to link to every other page" | ✅ honoured on purpose | — | the audit came back clean, so **no bulk-link action was taken**; adding links would have been the failure mode the brief warns about |

### 6.C Phase 8 — Content quality and duplication

| Brief item | Status | Where it lives | Evidence / current verdict |
|---|---|---|---|
| Repeated paragraphs with no page-specific value | 🟡 measured, fixed per batch | `scripts/dev-measure-site-copy.cjs`; template-share column in `data/site-inventory.json` | average template-share 0.669; 792 pages classified `major-improve` and queued in batches |
| Incorrect or irrelevant FAQs | 🟡 | `tests/unit/seo-qa.test.js`, `scripts/audit-seo-placeholders.cjs` | FAQ text is written per page, not templated; guards catch empty/duplicated answers |
| Keyword stuffing | ✅ gate | `scripts/audit-keyword-quality.cjs` → `docs/KEYWORD-AUDIT.md` | current verdict: no title cannibalization, 0 overlong phrases, 0 single-word generics, **2 shared phrases**, 2 year-stamped phrases |
| Unsupported claims | ✅ gate | `tests/unit/enhance-claims.test.js` | every digit in a new section is re-derived from the calculator's own formula; the test fails if the page drifts |
| Thin pages | ✅ report | `scripts/thin-page-report.cjs`, `data/thin-pages.json`, `docs/THIN-PAGES-FIX-2026-10-10.md` | thin set listed with the fix already applied to the first pass |
| Outdated formulas or standards | ✅ dashboard | `docs/formula-review-dashboard.html`, `scripts/formula-review-checklist.cjs`, `docs/qa-contracts.json` | per-tool review contracts with expected values |
| Inconsistent category counts / sitewide statistics | ✅ gate | `scripts/sync-counts.cjs` + `npm run check:counts` + `tests/unit/count-consistency.test.js` | counts are generated, not typed; the test fails on drift |
| Pages targeting the same intent | 🟡 | `docs/KEYWORD-AUDIT.md` §C2 + §6.4 | 2 phrase pairs still open, plus the 20 category pairs found live today |
| Content describing features the calculator does not have | ✅ gate | `scripts/qa-inventory.cjs`, `scripts/qa-reverse-matrix.cjs`, `docs/qa-contracts.json` | QA contracts pin statement → implementation |
| "Improve what makes pages meaningfully different, don't just reword" | ✅ followed | the new sections add a **formula, a hand-verified table, an edge case or a convention statement** | none of the shipped sections is a paraphrase of another page's paragraph |

### 6.4 Live checks run today (2026-10-12) — new measured data

| Check | Result |
|---|---|
| Sitemap resubmit via API | `PUT` → **HTTP 204**, `lastSubmitted` advanced to `2026-10-12T14:27:24Z`, `isPending: true`, warnings 0, errors 0 |
| URL Inspection, 40 URLs (`data/gsc-inspect-batch-2026-10-12.json`, run 14:32Z) | **26 submitted-and-indexed · 8 unknown to Google · 5 discovered-not-indexed · 1 alternate-canonical** |
| Unknown to Google | `/about`, `/privacy`, `/hub/family/`, `/hub/science/`, `/auto/`, `/disclaimer-health`, `/editorial-policy`, `/education/` |
| Discovered but not indexed | `/contact`, `/hub/conversion/`, `/hub/everyday/`, `/hub/tech/`, `/disclaimer-general` |
| Deploy lag | live sitemap has **1,415** URLs, the repo build has **1,417** — `/stats` and `/changelog` are not on production |
| Duplicate categories | ~~20 bare/hub pairs~~ → **fixed 2026-10-12**: one owner per block, mean 5-gram overlap 79.8% → **54.3%**, gate in the build + CI (`docs/DUPLICATE-HUBS-FIX.md`, §6.5) |
| Homepage link evidence | the homepage links to both patterns (20 `/hub/*` links and 59 bare-category links) — which is exactly why both URLs were **kept** and only the shared content was split, instead of redirecting one pattern away |

**Caveat on all of the above:** URL Inspection reports Google's *stored* view and can lag reality. Treat this as one dated snapshot, not a permanent verdict. Action (2) from the earlier version of this note — "decide a single canonical URL pattern for category hubs" — was **decided and implemented on 2026-10-12** without removing any URL: the duplication was removed instead of one of the URLs (`docs/DUPLICATE-HUBS-FIX.md`). Action (1), uploading the current `deploy/` folder so `/stats` and `/changelog` exist on production, is still owner-only.

### 6.5 Category/hub duplication — resolved 2026-10-12 (new)

| Item | Value |
|---|---|
| Defect | `/<cat>/` and `/hub/<cat>/` rendered the same methodology note, the same category FAQ and the same 48-tool catalog → **79.8%** mean identical 5-grams; GSC had already consolidated `/finance/` onto `/hub/finance/` |
| Decision | Keep both URLs (structure: `/<cat>/` is the breadcrumb parent of `/<cat>/<tool>/` and holds 15,624 inlinks vs 1,485 for hubs) and give **each block one owner**. Merging was rejected with the measurements in `docs/DUPLICATE-HUBS-FIX.md` §3 |
| Change | `js/category-depth.js` → new shared `compareTableHtml()` (registry-driven: Calculator / What it works out / What you enter, every row linking its tool page); `scripts/ssg-pages.cjs` 7b gains the FAQ + `FAQPage` schema, 7c loses the methodology note, card grid and FAQ and gains the table; `js/category-hub.js` and `js/app.js` `renderCategory()` mirror both changes |
| Result | mean overlap **54.3%** (max 60.6%), 0 shared blocks, no URL added/removed/redirected, hub still links all 48 tools per category |
| Gate | `npm run check:category-dup` — ownership + 65% overlap ceiling + 150 unique 5-grams minimum; runs in `build-deploy.js` (aborts the build) and in CI; unit-tested in `tests/unit/category-duplication.test.js` |
| Rollback | `git revert` the batch + rebuild (no data or URL implications) |

### 6.6 Structured data vs visible content — checked, and a false alarm ruled out

During hub verification a **duplicate sitewide `FAQPage`** appeared to ship on every page
(homepage questions — "Are all calculators on CalcProMaster free?", "Do I need to create an
account?" — on pages that never render them). It was **not** a shipped defect; it was an
artefact of running the generator on its own. Measured:

```
ROOT index.html (source shell)          1 ld+json block  (Organization + WebSite + FAQPage + ItemList …)
node scripts/ssg-pages.cjs alone        deploy/<cat>/<tool>/index.html → 2 blocks  ← leftover FAQPage
node scripts/fix-deploy-seo.cjs           still 2   (no schema step there)
node scripts/fix-crawl-quality.cjs        still 2
node scripts/crawl-link-boost.cjs         still 2
node build-deploy.js (the shipped path)  every page → 1 block, its own schema
```

Cause: `ssg-pages.cjs` reads its shell from **`deploy/index.html`** and `rewriteSchema()`
replaces only the first `ld+json` block. `build-deploy.js` rewrites `deploy/index.html` from
the source `index.html` *before* the generator runs, so the shipped tree is clean; running
the generator against an already-generated `deploy/index.html` stacks another block on top.

Verified on the built tree: every page carries exactly **one** `ld+json` block with its own
schema, and the sitewide questions appear in exactly **one** file (`deploy/index.html` — the
homepage, which renders them). The homepage carries two `FAQPage` nodes (15 sitewide
questions from the source shell + 5 home questions from the generator, all 20 unique and
visible); that is a homepage-only tidy-up, not a mismatch. So the §6.A item "structured
data that accurately represents visible content" holds for the shipped build, and the
operational rule is: **rebuild with `build-deploy.js`, never re-run `ssg-pages.cjs` in
place** (or regenerate `deploy/index.html` from the source first).

---

## 7. Implementation status of the SERP-informed batch (shipped 2026-10-12)

| Page | Shipped | Evidence it is live in the build | Test that re-derives it |
|---|---|---|---|
| `guides/business-days.html` | Holiday example, +10 date, day-zero rule, two-clocks section, unclosed `<p>` fixed | `deploy/guides/business-days.html` carries all six strings; `<p>` 21 opened / 21 closed | `enhance-claims.test.js` → business-days describe (5 new tests including an HTML-balance guard) |
| `/finance/apy-calculator` | Monthly-contribution formula + table, lump-sum gap, APY/APR side-by-side, promo caveat, honesty line that the calculator compounds one balance | `deploy/finance/apy-calculator/index.html` (3,200 words) | apy-calculator monthly + APY/APR describes |
| `/lifestyle/home-insurance` | Inverted formula, ceiling table, deductible break-even, lead-form-free statement | `deploy/lifestyle/home-insurance/index.html` (3,132 words) | home-insurance inverted-arithmetic describe (4 tests) |
| `/health/bmr-mifflin` | First enhancement card on the page: named equation, two worked examples, multiplier table, boundary | `deploy/health/bmr-mifflin/index.html` (2,919 words) | bmr-mifflin describe (5 tests, incl. calculator agreement + banned-advice guard) |

**Gates run after the batch:** `npm run test:unit` → 75 files / **2,500 tests pass**; `npm run check:page-drift` → all counts on baseline, 0 contentless; `node build-deploy.js` → staleness gate pass, internal-link audit **112,100 links, 0 broken, 0 slash mismatch**; `npm run lint:js` → 424 files, 0 failed.

**Not done in this batch (and why):** the guide/hub duplication decision (owner call), uploading `deploy/` (owner action), and the remaining `major-improve` queue — those are the three items in §3.
