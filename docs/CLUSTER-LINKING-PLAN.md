# Cluster Linking Plan — CalcProMaster

**Date:** 2026-09-19 · **Status:** plan (nothing deployed) · **Evidence:** `docs/INTENT-AUDIT.md` (I1: 41 cross-category intent clusters), live crawl of related-links behavior.

## 1. Current state (what already exists)

- Every tool page has **"Similar Calculators"** (6 links) built by `getRelated()` / SPA `renderRelated()`: **same-category neighbors first**, then keyword overlap.
- Guides embed links to their calculator; hubs list every tool in the category.
- **Gap:** the same-category-first heuristic never links across categories, but the real intent clusters DO cross categories (the I1 audit proves it: 41 cross-category clusters). A visitor on `/finance/loan-emi` never sees `/auto/car-loan-emi` or `/regional/home-loan-emi-india`; Google sees those intents as separate islands.

## 2. Priority clusters (hub → spokes)

Rule: hub = the page that should win the head query; spokes get "part of this cluster" links FROM hub and siblings. Cross-category links go in the related block via an explicit override map, not by rewriting the heuristic blindly.

### C1 — Loans & mortgages (biggest cluster: 16 pages)
- **Hub:** `/finance/loan-emi`
- **Spokes:** `/finance/mortgage`, `/finance/amortization`, `/finance/auto-loan`, `/auto/car-loan-emi`, `/auto/lease-vs-buy`, `/finance/balloon-payment`, `/finance/biweekly-mortgage`, `/finance/interest-only`, `/finance/fha-loan`, `/finance/va-loan`, `/finance/graduated-payment`, `/finance/mortgage-payoff`, `/finance/pmi-calculator`, `/finance/closing-costs`, `/regional/home-loan-emi-india`
- Guide spokes: `/guides/loan-emi`, `/guides/mortgage` (existing guide slugs)

### C2 — Health metrics (BMR/Calorie/TDEE: 12+ pages)
- **Hub:** `/health/bmi`
- **Spokes:** `/health/bmr`, `/health/bmr-mifflin`, `/health/calorie`, `/health/tdee-macro`, `/health/total-body-water`, `/health/ideal-body-weight`, `/health/ideal-weight`, `/everyday/calorie-counter`, `/fitness/calories-burned`, `/fitness/body-fat-fitness`, `/food/keto-macro`
- Guides: `/guides/bmr`

### C3 — Income tax (9 pages)
- **Hub:** `/finance/tax`
- **Spokes:** `/finance/us-income-tax`, `/finance/uk-income-tax`, `/finance/canada-income-tax`, `/finance/australia-income-tax`, `/regional/pk-income-tax`, `/career/tax-refund`, `/career/freelance-budget`, `/family/teen-budget`

### C4 — Construction volume (6 pages)
- **Hub:** `/construction/concrete`
- **Spokes:** `/construction/concrete-bags`, `/construction/excavation`, `/construction/gravel`, `/construction/gravel-driveway`, `/construction/gravel-tonnage`, `/construction/soil`, `/everyday/concrete`, `/homegarden/raised-bed-soil`

### C5 — Budgeting (6 pages)
- **Hub:** `/finance/envelope-budget` (50/30/20) — or `/family/family-budget` if consolidation happens (see INTENT-AUDIT I4 history)
- **Spokes:** `/family/family-budget`, `/family/family-budget-simple`, `/everyday/budget-allocator`, `/finance/cash-flow`, `/finance/debt-ratio`, `/finance/loan-qualify`

### C6 — Grading & academics (8 pages)
- **Hub:** `/education/gpa`
- **Spokes:** `/education/cgpa`, `/education/grade-needed`, gpa-conversion spokes in `/education/`, guide `/guides/gpa`

### C7 — Crypto (2 pages + guides)
- **Hub:** `/finance/crypto-profit`
- **Spokes:** `/finance/crypto-gains`, crypto guides

### C8 — Refinance & equity (4 pages)
- **Hub:** `/finance/refinance`
- **Spokes:** `/finance/home-equity`, `/finance/pmi-drop`, `/career/remortgage-calc`

## 3. Implementation (when approved — NOT done in this change)

1. Add `scripts/cluster-map.cjs` exporting the C1–C8 map above (single source of truth).
2. `scripts/ssg-pages.cjs` → in `getRelated()`: after same-category picks, **prepend up to 2 same-cluster cross-category links** from the map (marked "Part of: Loans & mortgages"). Keep 6 total.
3. `js/app.js` → `renderRelated()`: same behavior (load map via `window.__CLUSTERS__` emitted into data.js by build, or inline require in build).
4. Hub pages get a "Cluster guide" line linking both directions (hub→spokes exists via hub listing; spokes→hub added by step 2–3).
5. Guides: each cluster guide already links its calculator; add 2 sibling-guide links.
6. Verify: `node scripts/audit-title-intent.cjs` unchanged; new script `scripts/check-cluster-links.cjs` asserts every spoke carries ≥1 hub link (wire into CI later).

## 4. Expected impact & effort

- **Effort:** ~half a day (map + two render paths + checker).
- **Impact:** distributes link equity inside each intent island (supports the EASY-tier keywords in `docs/KEYWORD-DIFFICULTY.md`), lifts pages/crawl depth, and gives Google explicit cluster topology. This is the cheapest remaining on-page lever after the title fixes.

## 5. Honest note

These clusters come from title/keyword co-occurrence (I1 audit) — not from real query data. When GSC unlocks, re-rank clusters by actual impressions before investing beyond C1–C3.
