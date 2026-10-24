# REQUEST INDEXING — PRIORITY LIST (refreshed 4 Oct 2026)

> **Source:** refreshed from `data/not-indexed-plan.json` (GSC coverage data).
> These pages are already **known to Google** but not yet indexed
> ("Discovered - currently not indexed" or "URL is unknown to Google").
> **How to use:** GSC -> URL Inspection -> paste each URL -> "Request Indexing".
> Google allows roughly 10-12 a day, so this list fits in four days.

**Rule:** no shortcuts. We are only telling Google that a real, useful page
exists and should be crawled. This is 100% white-hat and uses Google's own tool.

Ranking note: pages that already earn impressions come first — they convert
crawl budget into traffic fastest.

---

## DAY 1 — Pages already earning impressions (12)

1. https://calcpromaster.com/finance/pmi-calculator/
2. https://calcpromaster.com/finance/closing-costs/
3. https://calcpromaster.com/finance/fha-loan/
4. https://calcpromaster.com/finance/us-income-tax/
5. https://calcpromaster.com/finance/payroll-tax/
6. https://calcpromaster.com/finance/credit-utilization/
7. https://calcpromaster.com/finance/apy-calculator/
8. https://calcpromaster.com/finance/rent-affordability/
9. https://calcpromaster.com/finance/cost-basis-avg/
10. https://calcpromaster.com/finance/uk-income-tax/
11. https://calcpromaster.com/finance/australia-income-tax/
12. https://calcpromaster.com/conversion/thermal-conductivity/

## DAY 2 — High-demand finance depth (12)

13. https://calcpromaster.com/finance/tax-loss-harvest/
14. https://calcpromaster.com/finance/dso/
15. https://calcpromaster.com/finance/dividend-yield/
16. https://calcpromaster.com/finance/dividend-reinvestment/
17. https://calcpromaster.com/business/cac/
18. https://calcpromaster.com/family/family-budget-simple/
19. https://calcpromaster.com/family/school-supplies/
20. https://calcpromaster.com/tech/aspect-ratio/
21. https://calcpromaster.com/engineering/orifice-flow/
22. https://calcpromaster.com/finance/retirement/
23. https://calcpromaster.com/finance/irr/
24. https://calcpromaster.com/finance/inflation/

## DAY 3 — Core finance cluster (12)

25. https://calcpromaster.com/finance/home-afford/
26. https://calcpromaster.com/finance/loan-qualify/
27. https://calcpromaster.com/finance/break-even/
28. https://calcpromaster.com/finance/markup/
29. https://calcpromaster.com/finance/discount/
30. https://calcpromaster.com/finance/future-value/
31. https://calcpromaster.com/finance/dividend/
32. https://calcpromaster.com/finance/fire/
33. https://calcpromaster.com/finance/rental-yield/
34. https://calcpromaster.com/finance/investment-growth/
35. https://calcpromaster.com/finance/savings-comparison/
36. https://calcpromaster.com/finance/interest-only/

## DAY 4 — Core finance cluster (continued) (12)

37. https://calcpromaster.com/finance/emergency-fund/
38. https://calcpromaster.com/finance/bond-yield/
39. https://calcpromaster.com/finance/retirement-income/
40. https://calcpromaster.com/finance/college-cost/
41. https://calcpromaster.com/finance/canada-income-tax/
42. https://calcpromaster.com/finance/bond-price/
43. https://calcpromaster.com/finance/annuity-payout/
44. https://calcpromaster.com/finance/rule-of-72/
45. https://calcpromaster.com/finance/retirement-withdrawal/
46. https://calcpromaster.com/finance/inflation-adjusted/
47. https://calcpromaster.com/finance/times-interest-earned/
48. https://calcpromaster.com/finance/ebitda/

---

## After submitting

- **Sitemap resubmit** in GSC (Sitemaps -> resubmit `sitemap.xml`) — same day.
- **Re-check coverage weekly** (Monday): re-run `node scripts/build-not-indexed-plan.cjs`
  and `node scripts/internal-links-boost.cjs`; the "slipped in" column is the real meter.
- **Do not** re-request the same URL more than once; Google ignores repeats and it
  wastes the daily quota.

## Status of the other levers (agent side, done)

- Internal links: **0 orphans, all 784 have more than 2 static inlinks** (audit clean).
- Sitemap: 1413 URLs, 0 noindex, quality gate PASS.
- Freshness: review-date stamped on every page at build.
