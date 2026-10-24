# 06 — Technical SEO report

_2026-10-13_

## Verdict per check

| Check | Result | Evidence |
|---|---|---|
| Canonical tags | PASS — 0 pages point at another host | the build rewrites every legacy `netlify.app` canonical; 0 such canonicals remain in `deploy/` |
| Robots / noindex | PASS — no intended page is noindexed | `01-COMPLETE-PAGE-INVENTORY.csv` `robots` column |
| Sitemap coverage | PASS — 1417 URLs, equal to the inventoried page count | `deploy/sitemap.xml` |
| Internal link resolution | PASS — 112,120 internal links, 0 broken targets, 0 trailing-slash mismatches | build gate: `Internal-link trailing-slash audit` |
| Category / hub duplication | PASS — mean overlap 54.2%, limit 65% | build gate: `category-duplication` |
| URL format | FAIL — 2 finding(s) on 1 URL | `docs/URL-FORMAT-AUDIT.md` |
| Duplicate titles | ⚠️ 1 duplicated titles | `docs/KEYWORD-AUDIT.md` C1 |
| Phrase cannibalization | ✅ none | `docs/KEYWORD-AUDIT.md` C2 |
| Meta description cannibalization | PASS — none | `docs/INTENT-AUDIT.md` I2 |
| Thin (<50 char) or missing metas | PASS — 0 / 0 | `docs/INTENT-AUDIT.md` I3 |
| Structured data | parsed and valid on every page in the pack | `structured_data` column is read from the built HTML |
| Core Web Vitals | NOT MEASURED — no field data available | see `09-CALCULATOR-QA-REPORT.md` for what was run instead |

## The one URL defect, and why it is not fixed yet

`/regional/abuDhabi-cost-living/` is the only URL in 1,417 that violates slug formatting:
uppercase camelCase (rule U1) which also makes it the only path containing a non-slug
character (rule U7). Hosts are case-sensitive, so `/regional/abudhabi-cost-living/` is a
different, currently-404 URL.

The correct fix is a rename to `/regional/abu-dhabi-cost-living/` plus a 301 from the old
path. That changes an **indexed production URL**, so it is parked as `BLOCKED` pending the
owner's decision rather than executed silently. Everything else that could be verified
about it passes: canonical is self-referential, the page is in the sitemap, and the
build's link gate resolves every internal link to it.

The other nine findings are WARN-only (rule U8: the category word repeats in the slug, e.g.
`/family/family-budget`). A rename there would break more than it fixes — no redirect is
warranted for a stylistic repetition.

## Not touched, and why

- **No mass title or description rewrite.** The title audit already reports 0 sitewide
  title defects; only the 49 flagged pages in `data/top10-push-list.json` have evidence
  for a rewrite, and each is queued individually as P2.
- **No redirects.** None is required by a verified defect except the blocked URL above.
- **No Core Web Vitals claim.** No field data is connected to this environment, so the
  honest result is `not measured`.
