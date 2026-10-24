# Cannibalization report — measured from Search Console query→page data

**Generated:** 2026-10-23 · by `node scripts/audit-cannibalization.cjs`
**Window:** 2026-09-16 → 2026-10-14 (28 days, GSC query→page export)

A pair appears here only when **two distinct pages of this site collected impressions for the same query**.
Trailing-slash variants are collapsed first — `/x` and `/x/` are counted as one page, because production
308-redirects the non-slash form onto the slash form (verified by HEAD probe). Keyword lists, title
clustering and keyword-field overlap are proxies and are audited separately
(`docs/KEYWORD-AUDIT.md` C2 = 0, `docs/INTENT-AUDIT.md` I1).

## Headline

| | Value |
|---|---|
| query→page pairs scanned | 4465 |
| distinct queries | 4141 |
| queries split across 2+ pages | **81** |
| impressions sitting on split queries | 458 of 11567 joined (**4%**) |
| D1 consolidate (same-category tool↔tool) | 20 |
| D1 already clustered + cross-linked | 3 |
| D2 differentiate (cross-category tool↔tool) | 16 |
| D2 already clustered + cross-linked | 2 |
| D3 guide link missing (actionable) | 2 |
| D3 guide↔tool, already linked (by design) | 19 |
| D4 hub/category landing (by design) | 13 |
| D5 one page dominant — no work justified | 1 |
| D6 region variants of one category (by design) | 37 |

**Actionable pairs** (decision D1/D2, or a missing guide→tool link, with ≥3 impressions still reaching the weaker page): **0**.

## Top split queries by impressions

| Impressions | Query | Pages (impressions · avg position) |
|---|---|---|
| 70 | vacation cost calculator | `/lifestyle/vacation-savings` 40 · 17.9<br>`/family/vacation-with-kids` 30 · 25.9 |
| 40 | mifflin st jeor calculator | `/health/bmr-mifflin` 34 · 5.1<br>`/guides/bmr` 6 · 120.1 |
| 24 | savings account dividend calculator | `/finance/dividend-yield` 14 · 30.1<br>`/finance/dividend` 10 · 19.1 |
| 23 | take home pay calculator | `/regional/dubai-salary` 11 · 139.9<br>`/regional/uk-take-home-salary` 7 · 185.4<br>`/regional/canada-take-home-salary` 2 · 155<br>`/regional/pk-salary` 1 · 100.5<br>`/regional/saudi-take-home-salary` 1 · 90<br>`/regional/switzerland-take-home-salary` 1 · 93 |
| 19 | salary calculator | `/regional/saudi-take-home-salary` 6 · 16.4<br>`/regional/dubai-salary` 4 · 139.1<br>`/regional/pk-salary` 3 · 179.1<br>`/regional/switzerland-take-home-salary` 3 · 42<br>`/regional/ireland-take-home-salary` 2 · 91.7<br>`/regional/singapore-cpf` 1 · 109.5 |
| 16 | baby cost calculator | `/guides/baby-cost` 14 · 14.9<br>`/lifestyle/baby-cost` 2 · 14.2 |
| 13 | payroll calculator | `/regional/dubai-salary` 11 · 173.7<br>`/regional/singapore-cpf` 2 · 140.8 |
| 12 | load testing calculator | `/tech/load-test-users` 11 · 85.7<br>`/hub/engineering` 1 · 27 |
| 12 | workout calculator | `/hub/fitness` 7 · 175.4<br>`/fitness` 5 · 159.5 |
| 9 | vacation budget calculator | `/everyday/vacation-budget` 8 · 26.2<br>`/lifestyle/vacation-savings` 1 · 118.5 |
| 9 | yearly salary calculator | `/regional/dubai-salary` 8 · 135.5<br>`/regional/pk-salary` 1 · 108 |
| 8 | income tax calculator | `/finance/tax` 4 · 72.5<br>`/finance/canada-income-tax` 3 · 57.2<br>`/regional/dubai-salary` 1 · 36 |
| 7 | floor calculator | `/homegarden/room-area` 5 · 177.5<br>`/construction/flooring` 2 · 111.7 |
| 7 | flooring calculator | `/homegarden/room-area` 6 · 152.8<br>`/construction/flooring` 1 · 66 |
| 7 | gold silver ratio calculator | `/regional/gold-silver` 6 · 130.3<br>`/regional/gold-silver-ratio` 1 · 97.5 |

## Actionable pairs

None. Every split query is either a hub/category landing page doing its navigation job, a guide that
already links its calculator, or a query where one page holds ≥80% of the impressions.

## How the decision rules were applied

| Rule | Meaning | Action |
|---|---|---|
| D1 CONSOLIDATE | same-category tools with the same inputs competing for one query | pick an owner, then 301 the loser — **owner decision, not applied automatically** |
| D2 DIFFERENTIATE | cross-category tools sharing one intent | keep both pages, make the intent wording and internal links distinct (cluster link = the fix) |
| D3 LINK_GUIDE | a guide ranks for the query behind its calculator | the guide must link the calculator (missing link = the defect) |
| D4 BY_DESIGN | hub / category landing vs a tool | navigation intent vs tool intent; no change |
| D5 ACCEPT | one page holds ≥80% of impressions and ≥10× the other | record and move on |
| D6 LOCALE_BY_DESIGN | two pages of one category that differ by a country/region token | each targets its own country query; no change |

## Not a defect (measured, so it is not reported as one)

- **`/x` vs `/x/`**: Google holds both forms in its data, but production 308-redirects the non-slash form,
  and every internal link plus every canonical uses the slash form. Collapsed here before pairing.
- **Same-region salary pages** (`/regional/<country>-take-home-salary`): the generic query "salary calculator"
  is split across them by design — each page targets its own country intent.

## Reproduce

```bash
node build-deploy.js                        # deploy/ must exist (guide link check)
npm run seo:gsc-join                        # refresh data/gsc-query-page.json
node scripts/audit-cannibalization.cjs       # this report
node scripts/audit-cannibalization.cjs --fail-on-actionable   # exit 1 on any actionable pair
```
