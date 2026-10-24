# The 20 duplicate category hubs — evidence, fix, migration plan

_Written 2026-10-12. Replaces the "20 category pairs are duplicated — needs an owner
decision" line in [SEO-PHASE-STATUS.md](SEO-PHASE-STATUS.md) §6 as the record of what
was decided and what changed._

## 1. What the defect actually was

Every category ships **two** live, self-canonical, sitemap-listed pages:

| URL | H1 | 5-gram overlap with its pair (before) |
|---|---|---|
| `/<cat>/` | "Finance Calculators — Loan, EMI, Tax & SIP Tools" | 79.8% mean, 77.7–81.6% across the 20 pairs |
| `/hub/<cat>/` | "Finance Calculators Comparison" | (same measurement, both sides) |

Measured on the built tree with a 5-gram (Jaccard) comparison of the visible text of
`deploy/<cat>/index.html` against `deploy/hub/<cat>/index.html`.

The overlap was not accidental — the two page types rendered the **same three blocks**:

1. `CategoryMethodology.methodologyHtml(cat)` — also on every tool page in the category;
2. `CategoryDepth.faqHtml(cat)` — the identical category FAQ on both pages;
3. the same 48-tool catalog (category: `tool-card` grid at 100-char descriptions;
   hub: `hub-card` grid at 120-char descriptions).

What each page owned uniquely was small: the category page its `CAT_INTROS` paragraph and
the category guide link, the hub its `CategoryDepth.introHtml` ("what you can work out")
and — client-side only — a computed-value comparison table that the SSG never prerendered.

## 2. Evidence gathered before changing anything

| Evidence | Measurement |
|---|---|
| Overlap | mean **79.8%**, max 81.6% (lifestyle), min 77.7% (math) |
| Google's own view (URL Inspection, 2026-10-12) | `/finance/` → **"Alternate page with proper canonical tag"**, i.e. Google consolidated one member of a pair away. Hubs indexed 15/20, bare categories 6 of the 10 inspected |
| Structural role of `/<cat>/` | **BreadcrumbList on every tool page** points "Finance" → `/finance/`, and `/<cat>/<tool>/` is the tool URL family — it is the site's category node |
| Internal links | bare categories **15,624** inlinks vs hubs **1,485** (9 of the 20 bare categories sit in the sitewide nav; no hub does) |
| Search performance (GSC 28d, 2026-09-09→10-07) | bare categories 39 impressions / 0 clicks / 12 query rows; hubs 0 clicks but 19 query rows on 8 of the 20 (some at good positions: "calculator utilities" pos 3, "nutrition calculators" pos 9) |
| Both self-canonical + both in sitemap | confirmed live (`curl` + repo sitemap, 1,417 URLs) |

## 3. Why differentiate instead of merging (and not the other way round)

The brief's rule 7 forbids merge/redirect without an evidence-based reason and a migration
plan, and Phase 8 asks to "improve the information that makes each page meaningfully
different" rather than to reword or delete.

Merging was considered and rejected on the evidence:

- **Redirect `/hub/<cat>/` → `/<cat>/`** would delete 20 user-facing comparison views that
  tool pages link deliberately (`ssg-pages.cjs` adds "Compare all X calculators" to every
  tool page), would require rewriting **1,485 internal links** to avoid internal 301s (the
  repo's own link gate treats those as defects), and would remove URL patterns Google has
  already indexed (15/20 those hubs).
- **Redirect `/<cat>/` → `/hub/<cat>/`** would break the tool-URL hierarchy, 15,624
  inlinks, the breadcrumb chain on 1,282 tool pages, and the sitemap shape — for no measured
  gain.
- Google's preference is **mixed** (it kept the hub for the finance pair; it kept the bare
  page for the other 19 pairs it indexed), so "Google picked X" does not support either
  direction strongly enough to justify a destructive migration.

What was left is the actual defect: **two pages shipping the same blocks**. That is fixable
without losing a URL, a link or a page.

## 4. The fix: one owner per block

| Block | Owner after the change | Evidence it is gone from the other page |
|---|---|---|
| Category FAQ (+ `FAQPage` JSON-LD) | `/<cat>/` | moved in `scripts/ssg-pages.cjs` (category loop) and `js/app.js` `renderCategory()` |
| Methodology note | `/<cat>/` + every tool page | removed from the hub loop and from `js/category-hub.js` |
| 48-card catalog grid | `/<cat>/` | hub grid removed from both the SSG hub and the client hub renderer |
| "What you can work out" (depth intro) | `/hub/<cat>/` | was already hub-only |
| **Comparison table** (`compareTableHtml`) | `/hub/<cat>/` | new shared block in `js/category-depth.js`, rendered by the SSG **and** the client |

The new table is built from the **real registry entries** — tool name, its own description,
and its own input labels (`Calculator | What it works out | What you enter`). No number is
invented for a page that cannot run the calculators; a table is refused entirely
(`compareTableHtml` returns `''`) unless at least two tools carry real input labels. Every
row still links its tool page, so the hub keeps the crawl paths the old card grid provided.

The heading is deliberately name-free ("Compare calculators by what you enter") because the
SSG's `CAT_NAME` and the client's `CALC_DATA` disagree for six categories — the same reason
`introHtml` is name-free, so prerendered HTML and hydrated DOM stay identical.

## 5. Measured result

| Measure | Before | After |
|---|---|---|
| Mean 5-gram overlap (20 pairs) | 79.8% | **54.2%** |
| Max overlap | 81.6% | **60.4%** (conversion) |
| Hub words | ~1,950 | ~2,180 (table adds real content) |
| Category words | ~1,720 | ~1,860 (FAQ moved in) |
| Shared blocks between a pair | 3 (methodology, FAQ, grid) | **0** |
| Tool inlinks from the hub page | 48 cards | 48 table rows (unchanged) |
| URLs removed / redirected | — | **none** |

`npm run check:category-dup` prints this table per pair and fails if any pair
- shares a block ownership (FAQ/methodology/grid on the hub, or the comparison table on the
  category page), or
- exceeds **65%** overlap, or
- leaves either page with fewer than 150 unique 5-grams.

**Gate runs in:** `build-deploy.js` (build aborts on failure) and `.github/workflows/ci.yml`
(`npm run check:category-dup`). Unit coverage: `tests/unit/category-duplication.test.js`.

## 6. Migration plan / rollback

Nothing about the URLs moved, so there is no redirect map to maintain:

1. **Deploy** the rebuilt `deploy/` folder. Both URL patterns stay live and self-canonical.
   No redirect entries were added to `_redirects`.
2. **Watch** `/finance/` (and the other 19 pairs) in GSC. The index-regression alert
   (`docs/INDEX-REGRESSIONS.md`) reports `Alternate page with proper canonical tag` for any
   category URL; that entry is recorded as *known and addressed* in
   `data/index-regressions-ledger.json` with the reason and the re-arm instruction.
3. **Re-arm the alert** by deleting that ledger entry once Google has re-crawled both URLs.
   If a second consecutive snapshot still reports alternate-canonical for a pair, the
   remaining options (in order) are: a `rel=canonical` on the hub → category, then a 301.
   Both are deliberately *not* done now — they need the new evidence first.
4. **Rollback** is a single `git revert` of the batch that touched `scripts/ssg-pages.cjs`,
   `js/category-hub.js`, `js/app.js` and `js/category-depth.js`, followed by a rebuild. No
   data or URL is lost either way.

## 7. Known limitations of this fix

- 54% overlap (measured on the built tree, i.e. after `crawl-link-boost` adds its
  cross-links; the pre-boost SSG output measures 54.3%) is *lower*, not low: two pages that deliberately list the same 60 tools will
  always share tool names and one-line descriptions. The gate's job is to keep the pair from
  drifting back toward "same page twice", not to reach zero.
- Google may still prefer one member of a pair for a query. Differentiation removes the
  *duplicate-content* cause; it does not manufacture demand for a "compare X calculators"
  query that may not exist. Hub impressions are currently 0 clicks.
- The screenshot-level rendering of the new table (mobile scroll, sticky header) is not
  covered by this change; `tests/e2e/hub-tables.spec.js` still asserts real computed values
  client-side, and the client renderer keeps its own computed table in addition to the new
  SSG table.
