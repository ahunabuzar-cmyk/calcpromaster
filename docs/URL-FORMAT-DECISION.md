# URL-format decision (U8) — review + 301 plan

> Reviewed 2026-10-14. Source: `node scripts/audit-url-format.cjs` → `data/url-format-audit.json`,
> `docs/URL-FORMAT-AUDIT.md`. Covers the 9 open `U8` warnings.

## What U8 flags

`U8` fires when the **category word is repeated inside the slug**: the URL already says the
category, and the slug says it again.

| # | URL | Category word repeated |
|---|---|---|
| 1 | `/business/business-roi/` | business |
| 2 | `/business/business-valuation/` | business |
| 3 | `/career/career-gap/` | career |
| 4 | `/career/career-break-runway/` | career |
| 5 | `/health/health-insurance-copay/` | health |
| 6 | `/family/family-budget/` | family |
| 7 | `/family/family-budget-simple/` | family |
| 8 | `/family/family-meal-cost/` | family |
| 9 | `/family/family-tree-generation/` | family |

0 FAIL, 9 WARN, 1419 URLs scanned.

## Two checks that decide whether renaming is worth it

**1. Are any of the nine already indexed?** They are absent from `data/gsc-coverage-report.json`
(1167 inspected URLs, tally: INDEXED 375 / DISCOVERED 339 / UNKNOWN 445 / CANONICAL 3 /
REDIRECT 2 / OTHER 3). Not one of the nine appears in any bucket, so Google has no indexed
version and there is no ranking equity to lose and no ranking to protect.

**2. Are any of them near-duplicates of a sibling?** Checked the built titles of the two closest
pairs — they are distinct intents, not duplicate pages:

| Pair | Built titles |
|---|---|
| `/family/family-budget/` vs `/family/family-budget-simple/` | "Family Monthly Budget: Income, Housing & Food Plan" vs "Family Budget Calculator: Quick Monthly Split" |
| `/business/business-roi/` vs `/business/business-valuation/` | "Business ROI: Revenue & Total Cost" vs "Business Valuation (Revenue Multiple): Annual" |
| `/career/career-gap/` vs `/career/career-break-runway/` | "Career Gap Impact Calculator: Current Salary, Gap" vs "Career Break Runway Calculator: Monthly expenses" |

So the repeated word is **cosmetic**, and it does not hide a cannibalization problem.

## Decision: do **not** rename

Reasoning, in order of weight:

1. **No ranking benefit.** Google does not penalise a slug that repeats its directory. The signal
   this warning measures is aesthetic; nothing in the GSC data connects these URLs to a
   performance problem.
2. **The rename is not local.** The slug *is* the tool id. `family-budget` is the id in
   `js/data/*.js`, the key in `js/seo-content.js` (`TOOL_SEO`), the id in `all-tool-ids.json`, the
   directory name in `deploy/`, the value echoed in the sitemap, the canonical tag, the internal
   links that point at it, and the key used by `data/*-overrides.json`. A rename has to move all of
   them in one commit or the registry, the sitemap and the count-consistency guard drift apart.
3. **The nine are not indexed.** Renaming an unindexed URL is the cheap moment to do it — but it is
   only cheap *because* nothing depends on the URL yet. The cost that remains is the code cascade,
   which is independent of indexing.
4. **The cost is not zero-risk.** `scripts/sync-counts.cjs` and `tests/unit/count-consistency.test.js`
   assert the registry, tool-id and sitemap counts agree; a partial rename shows up as a failing
   guard, and a silent one shows up as 404s in the internal-link graph.

**Net: cosmetic gain, registry-wide risk. Skip.**

## If a rename is ever done anyway — the 301 plan

The rename must be atomic and redirect-preserving. Per URL:

1. Change the tool `id` in `js/data/<category>.js` (e.g. `business-roi` → `roi`).
2. Update the `TOOL_SEO` key in `js/seo-content.js`, and the id in `all-tool-ids.json`.
3. Add **one** 301 in `_redirects`, old → new, extensionless → trailing slash:

   ```
   /business/business-roi   /business/roi/   301
   /business/business-roi/  /business/roi/   301
   ```

   Both forms are needed: the extensionless path is what crawlers already hold, and the
   trailing-slash form is what the internal links emit.
4. Regenerate and re-check, in this order:
   `npm run sitemap` → `npm run deploy:build` → `npm run check:sitemap-coverage`
   → `npm run seo:url-format` (expect 9 → 0) → `npm run check:counts` → `npm run test:unit`.
5. Do **not** chain redirects: if a later rename touches the same page, point the old rule
   straight at the newest URL and delete the intermediate hop.
6. Re-submit the sitemap in Search Console afterwards, and `node scripts/ping-indexnow.js` once the
   deploy is live.

Do all nine in **one** commit, never one at a time — a partial rename leaves the sitemap and the
registry disagreeing, which is exactly what `check:counts` exists to catch.
