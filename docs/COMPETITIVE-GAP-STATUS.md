# Competitive Gap Status — CalcProMaster

Snapshot date: 2026-10-04
Scope: Spec A, Part 2 — twelve competitive-gap items benchmarked against
leading calculator sites. Status values: **Done**, **Partial**, **Deferred**
(a decision), **Blocked** (needs an owner decision or a paid service).

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 1 | Interactive graphing tool (plot y = f(x)) | **Done** | `graph.html` + `js/grapher.js`. Dependency-free expression parser (powers, trig, logs, implicit multiplication) and a canvas plotter. 7 unit tests. Live at `/graph`. |
| 2 | Inline step-by-step working | **Done** | Every tool returns a `steps()` array; `AdvancedFeatures.renderSteps` renders it inline under the result. All batches 1-6 tools ship steps. |
| 3 | Interactive geometry (draggable figures) | **Done** | `geometry-lab.html` + `js/geometry-lab.js`. Drag three triangle vertices; sides, angles, perimeter and area update live. 7 unit tests. Live at `/geometry-lab`. |
| 4 | Live currency rate + source label | **Done** | `js/currency.js` `fetchLiveRates()` uses open.er-api.com then frankfurter.app, caches locally, falls back to static rates; `js/confidence-notes.js` labels the source and time. |
| 5 | Live reference interest rate | **Partial** | `TrustExtras.referenceRate()` returns a clearly labeled, sourced reference. No reliable keyless free benchmark API exists, so a true live feed needs a paid data source; flagged rather than faked. |
| 6 | Optional user accounts | **Blocked** | Requires accounts = paid backend + auth decisions. Owner must choose first. The multi-property data model (`js/portfolio-store.js`) already works without login. |
| 7 | Author / reviewer bylines | **Done** | Every tool page carries an editorial "About this page" block, and `js/category-methodology.js` renders a "Reviewed by <name>, <credentials>" byline **only** when a real reviewer is configured in `REVIEWERS`. It ships empty on purpose — no invented names — so the byline stays absent until the owner supplies a real one. See `docs/REVIEWER-BYLINES.md`. |
| 8 | Visible "Last updated" on tool pages | **Done** | `build-deploy.js` stamps `Last reviewed: <date>` into every prerendered page (1,465 pages stamped on this build, verified in `deploy/`). |
| 9 | Per-category methodology note | **Done** | `js/category-methodology.js` supplies a methodology paragraph for all 20 categories. It is rendered on **every tool page** (by the SSG into prerendered HTML and by `js/app.js` on hydrate) and on **every category page** — e.g. the Math page shows the algebra/geometry identity note. Kept in sync by the shared module. |
| 10 | TWA (PWA-to-Store) packaging | **Deferred** | Evaluated in `docs/TWA-PACKAGING-EVALUATION.md`. Feasible but deferred: needs a paid Play account and a signing key, and adds little until the site is indexed and stable. |
| 11 | Honest usage counter | **Partial** | `TrustExtras.usageFor()` renders a count ONLY when real data is injected (`window.__CPM_USAGE__`). It never invents numbers; with no data source configured it renders nothing. |
| 12 | Per-calculator rating | **Done** | `js/trust-extras.js` adds a 5-star rating under each result (hook: `calc:done`), stored on the device only, shown honestly with a clear privacy note. |

## Notes

- **Item 6 is Blocked** on an owner decision (accounts = paid service). Per
  project rules, no paid service is added without asking first.
- **Items 5, 7, 9, 11 are Partial** and explained above; none are silently
  skipped. Items 5 and 11 are truthful by construction (labeled reference;
  count only when real).
- **Item 10 is Deferred** with a written evaluation, not dropped.

## Shipped this pass

| Artifact | Purpose |
|---|---|
| `graph.html` + `js/grapher.js` | Item 1 — function grapher |
| `geometry-lab.html` + `js/geometry-lab.js` | Item 3 — interactive geometry |
| `js/trust-extras.js` | Items 11 + 12 — honest usage counter + rating |
| `js/category-methodology.js` | Items 7 + 9 — per-category methodology note + reviewer byline (shared SSG + client) |
| `docs/REVIEWER-BYLINES.md` | Item 7 — how to add a real reviewer |
| `docs/TWA-PACKAGING-EVALUATION.md` | Item 10 — packaging evaluation |
| `Last reviewed` stamp (already in `build-deploy.js`) | Item 8 — verified working |
| Nav + footer + `/math` category links | `/graph` and `/geometry-lab` linked site-wide (nav, footer, and the Math category page) |

## Verification

- Sitemap: 1,415 URLs, quality gate PASS (both new pages meet the 300-word bar).
- Performance budgets: ALL PASS (eager-js 1366/1600KB, index 79/90KB).
- Unit suite: all passing across 44 files (grapher 7, geometry-lab 7,
  trust-extras 6, category-methodology 6 included).
- Browser-verified on the built `deploy/` artifact: `/graph` plots `x^2-2` and
  re-plots `sin(x)*3` after clicking Plot (no error); `/geometry-lab` updates
  side/angle/perimeter/area live when a vertex is dragged; `/math` shows the
  featured-tools callout and the methodology note with working links.
