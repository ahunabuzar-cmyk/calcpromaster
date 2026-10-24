# URL-format audit

**Generated:** 2026-10-23 · by `node scripts/audit-url-format.cjs`
**Scope:** every URL in the built `deploy/sitemap.xml` (~1420 URLs).

Third-party panels report "pages with a poorly formatted URL" as a count with no stated rule,
so the rule set is written down here and applied mechanically. Nothing in this report is
hand-asserted: re-run the script and the numbers reproduce.

## Result

| | Count |
|---|---|
| URLs scanned | 1420 |
| FAIL (real defect) | **0** |
| WARN (judgement call) | 9 |
| INFO (reported only) | 26 |

## Rules

| # | Severity | Rule |
|---|---|---|
| U1 | FAIL | uppercase character |
| U2 | FAIL | underscore |
| U3 | FAIL | space / percent-encoding |
| U4 | FAIL | .html suffix |
| U5 | FAIL | query string or fragment |
| U6 | FAIL | double slash |
| U7 | FAIL | non-slug character |
| U8 | WARN | category word repeated in the slug |
| U9 | WARN | path over 75 characters |
| U10 | INFO | stop word in the slug (reported, never a finding) |

## Findings

| URL | Rule | Severity | Detail |
|---|---|---|---|
| `/blog/rule-of-72` | U10 | INFO | stop word in the slug |
| `/auto/trade-in-value/` | U10 | INFO | stop word in the slug |
| `/auto/power-to-weight/` | U10 | INFO | stop word in the slug |
| `/business/business-roi/` | U8 | WARN | category word "business" repeated in the slug |
| `/business/business-valuation/` | U8 | WARN | category word "business" repeated in the slug |
| `/career/career-gap/` | U8 | WARN | category word "career" repeated in the slug |
| `/career/career-break-runway/` | U8 | WARN | category word "career" repeated in the slug |
| `/career/interview-to-offer-tracker/` | U10 | INFO | stop word in the slug |
| `/everyday/day-of-year/` | U10 | INFO | stop word in the slug |
| `/everyday/day-of-week/` | U10 | INFO | stop word in the slug |
| `/everyday/statute-of-limitations/` | U10 | INFO | stop word in the slug |
| `/everyday/cost-of-living-compare/` | U10 | INFO | stop word in the slug |
| `/finance/loan-to-value/` | U10 | INFO | stop word in the slug |
| `/finance/rule-of-72/` | U10 | INFO | stop word in the slug |
| `/finance/cost-of-debt/` | U10 | INFO | stop word in the slug |
| `/finance/price-to-earnings/` | U10 | INFO | stop word in the slug |
| `/finance/cost-of-living/` | U10 | INFO | stop word in the slug |
| `/finance/yield-to-maturity/` | U10 | INFO | stop word in the slug |
| `/finance/price-to-rent/` | U10 | INFO | stop word in the slug |
| `/finance/debt-to-equity/` | U10 | INFO | stop word in the slug |
| `/finance/yield-to-worst/` | U10 | INFO | stop word in the slug |
| `/finance/rule-of-40/` | U10 | INFO | stop word in the slug |
| `/finance/cost-of-delay/` | U10 | INFO | stop word in the slug |
| `/finance/power-of-attorney-cost/` | U10 | INFO | stop word in the slug |
| `/fitness/steps-to-distance/` | U10 | INFO | stop word in the slug |
| `/health/health-insurance-copay/` | U8 | WARN | category word "health" repeated in the slug |
| `/math/law-of-sines/` | U10 | INFO | stop word in the slug |
| `/math/law-of-cosines/` | U10 | INFO | stop word in the slug |
| `/math/coefficient-of-variation/` | U10 | INFO | stop word in the slug |
| `/family/family-budget/` | U8 | WARN | category word "family" repeated in the slug |
| `/family/family-budget-simple/` | U8 | WARN | category word "family" repeated in the slug |
| `/family/family-meal-cost/` | U8 | WARN | category word "family" repeated in the slug |
| `/family/family-tree-generation/` | U8 | WARN | category word "family" repeated in the slug |
| `/science/speed-of-sound/` | U10 | INFO | stop word in the slug |
| `/science/moment-of-inertia/` | U10 | INFO | stop word in the slug |

## Decision on the U10 rows — the stop-word slugs are not defects

**Verdict: keep all 26. Rename nothing, add no redirect.**

A stop word in the slug is the standard thing an off-the-shelf crawler reports as a
"poorly formatted URL". On this site it flags terms that are named that way in the
finance and maths literature — `price-to-earnings`, `yield-to-maturity`, `rule-of-72`,
`cost-of-living`, `law-of-sines`, `moment-of-inertia`, `day-of-year`. The stop word is
part of the term. Removing it produces `price-earnings`, which is a different phrase and
matches neither the query nor the page heading, so every one of these would lose its
exact-match token, need a 301 pair in `_redirects`, and invalidate whatever crawl signal
the path has earned — to turn a reported warning into no change in defect count.

The one URL in this family that IS a defect is `abuDhabi` (U1 uppercase + U7 non-slug
character). It is fixed at source and carries a 301 in `_redirects`; the remaining FAIL
count above is what the *build* emits, not what the live host serves.

## Decision on the U8 warnings — keep the URLs, no 301s

**Verdict: accept every WARN. Rename nothing, add no redirect.**

A repeated category word is not a defect: it is how the phrase is searched
("business roi", "family budget", "career gap"), the URL still matches the page title and H1,
and U8 is a WARN precisely because it is a judgement call — which is why `--fail-on-issue`
exits 0 on it. Renaming would need nine new 301 pairs in `_redirects` plus a sweep of the
build's ~107k internal hrefs, would discard whatever crawl signal the paths have earned,
and would remove the exact-match token from the slug — a net loss for zero defect fixed.

There are **0** FAIL findings on this run, so the gate needs no redirect work today.
If a rename is ever wanted, the mechanical plan is: add a `from → to` pair per renamed path to
`_redirects`, drop the old path from `sitemap.xml`, then re-run `node scripts/check-host-redirects.cjs`
and `node build-deploy.js` until both report 0.

## Reproduce

```bash
node build-deploy.js                 # build deploy/ first
node scripts/audit-url-format.cjs     # this report
node scripts/audit-url-format.cjs --fail-on-issue   # exit 1 on any FAIL
```
