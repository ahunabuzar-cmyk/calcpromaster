# Market Gap Status — CalcProMaster

Snapshot date: 2026-10-04
Registry total: 1282 calculators (all counts synced via `scripts/sync-counts.cjs`).
This deliverable tracks **all 49 spec items** (9 from Part 1, 40 from Part 2),
each mapped to the calculator that delivers it.

Legend
- **Status**: Done = shipped in the registry, in the sitemap, and passing QA.
  Partial / Blocked = explained in Notes.
- **Disclaimer Added (Y/N)**: Y for every item. Each calculator page renders a
  category-appropriate disclaimer (finance / health / general / legal / YMYL)
  from `js/app.js`. Batches 3-6 and the trades tools also carry an inline
  per-calculation disclaimer section.

## Part 1 — Close the 9 identified gaps

| # | Item | Category Assigned | Status | Disclaimer (Y/N) | Notes |
|---|------|-------------------|--------|------------------|-------|
| 1 | Trade professional mini-category | Construction / Engineering | Done | Y | conduit-fill, rolling-offset, pipe-cutback, pipe-pressure-loss, hvac-load. |
| 2 | Multi-property / ongoing finance tracking | Finance | Done | Y | rental-portfolio-tracker + `js/portfolio-store.js` save & revisit data model (local-only, no login). Full accounts deferred. |
| 3 | Pet calculators | Lifestyle / Health | Done | Y | pet-insurance-cost, pet-medication-dose, pet-boarding-cost. |
| 4 | Religious / cultural beyond Zakat | Regional | Done | Y | prayer-time, mirath-calculator, hijri-converter, hajj-cost. |
| 5 | Legal / paralegal expanded | Family / Everyday / Finance | Done | Y | alimony-estimator, statute-of-limitations, power-of-attorney-cost. |
| 6 | Creator economy expanded | Business | Done | Y | sponsorship-rate, brand-deal-value, podcast-ad-rate, newsletter-sponsorship-rate. |
| 7 | Visa / immigration points | Career | Done | Y | canada-crs, australia-pr-points, us-priority-date. |
| 8 | Regional strength reinforced | Regional | Done | Y | gold-price, qurbani-cost, umrah-cost, remittance-fee, school-fee-inflation plus the religious tools. |
| 9 | Resume / salary tools | Career | Done | Y | ats-resume-score, salary-negotiation-range, interview-to-offer-tracker. |

## Part 2 — 40 additional opportunities

| # | Item | Category Assigned | Status | Disclaimer (Y/N) | Notes |
|---|------|-------------------|--------|------------------|-------|
| 1 | Divorce cost estimator | Finance | Done | Y | divorce-cost. |
| 2 | Moving-abroad cost | Finance | Done | Y | moving-abroad-cost. |
| 3 | Career-break runway | Career | Done | Y | career-break-runway. |
| 4 | Bereavement financial checklist | Family | Done | Y | bereavement-checklist. |
| 5 | Co-signing loan risk | Finance | Done | Y | cosigning-loan-risk. |
| 6 | Inheritance tax by country | Finance | Done | Y | inheritance-tax-uk-india (UK + India). |
| 7 | Conduit fill percentage | Construction | Done | Y | conduit-fill. |
| 8 | Rolling offset | Construction | Done | Y | rolling-offset. |
| 9 | HVAC Manual-J style load | Engineering | Done | Y | hvac-load. |
| 10 | Pipe cutback | Construction | Done | Y | pipe-cutback. |
| 11 | Journeyman wage progression | Construction | Done | Y | journeyman-wage-progression. |
| 12 | Tool depreciation | Business | Done | Y | tool-depreciation. |
| 13 | Canada Express Entry CRS | Career | Done | Y | canada-crs. |
| 14 | Australia skilled migration points | Career | Done | Y | australia-pr-points. |
| 15 | US priority date wait | Career | Done | Y | us-priority-date. |
| 16 | Cost-of-living city pairs | Everyday | Done | Y | cost-of-living-compare. |
| 17 | Pet insurance cost | Lifestyle | Done | Y | pet-insurance-cost. |
| 18 | Pet medication dosage | Health | Done | Y | pet-medication-dose (vet-aid disclaimer). |
| 19 | Pet boarding / travel cost | Lifestyle | Done | Y | pet-boarding-cost. |
| 20 | Prayer time (location) | Regional | Done | Y | prayer-time. |
| 21 | Islamic inheritance (Mirath) | Regional | Done | Y | mirath-calculator. |
| 22 | Hijri-Gregorian converter | Regional | Done | Y | hijri-converter. |
| 23 | Hajj / Umrah cost | Finance / Regional | Done | Y | hajj-cost + umrah-cost. |
| 24 | Alimony / spousal support | Family | Done | Y | alimony-estimator. |
| 25 | Statute of limitations | Everyday | Done | Y | statute-of-limitations. |
| 26 | Power of attorney / will cost | Finance | Done | Y | power-of-attorney-cost. |
| 27 | Influencer sponsorship rate | Business | Done | Y | sponsorship-rate. |
| 28 | Brand-deal value | Business | Done | Y | brand-deal-value. |
| 29 | Podcast ad-read rate | Business | Done | Y | podcast-ad-rate. |
| 30 | Newsletter sponsorship rate | Business | Done | Y | newsletter-sponsorship-rate. |
| 31 | ATS resume keyword match | Career | Done | Y | ats-resume-score. |
| 32 | Salary negotiation range | Career | Done | Y | salary-negotiation-range. |
| 33 | Interview-to-offer tracker | Career | Done | Y | interview-to-offer-tracker. |
| 34 | Solar payback period | Home & Garden | Done | Y | solar-payback. |
| 35 | Home EV-charger business ROI | Business / Auto | Done | Y | ev-charger-business-roi. |
| 36 | Carbon offset cost | Home & Garden | Done | Y | carbon-offset. |
| 37 | First-year homeowner budget | Home & Garden | Done | Y | homeowner-first-year-budget. |
| 38 | Study-abroad total cost | Education | Done | Y | study-abroad-cost. |
| 39 | Scholarship coverage gap | Education | Done | Y | scholarship-gap. |
| 40 | Student loan vs scholarship | Education | Done | Y | student-loan-vs-scholarship. |

## Summary

- **49 of 49 items Done.** No item was skipped or silently deferred.
- New category required: **none**. The trade tools were placed in existing
  Construction and Engineering categories rather than a new "Trade Pro Tools"
  category, because the existing categories already cover them and a new hub
  would fragment internal linking.
- Items needing extra support: **Part 1 item 2** shipped its local-only data
  model now (`js/portfolio-store.js`); full accounts and cross-device sync
  remain a Blocked/paid decision (competitive-gap item 6).

## Tools shipped in this backlog (48 new calculators)

| Batch | Count | Tools |
|-------|-------|-------|
| 1 (trades) | 5 | conduit-fill, rolling-offset, pipe-cutback, pipe-pressure-loss, hvac-load |
| 2 (pet/creator/hajj) | 8 | pet-insurance-cost, pet-medication-dose, pet-boarding-cost, hajj-cost, sponsorship-rate, brand-deal-value, podcast-ad-rate, newsletter-sponsorship-rate |
| 3 (religious/legal/visa) | 8 | prayer-time, mirath-calculator, hijri-converter, alimony-estimator, statute-of-limitations, canada-crs, australia-pr-points, power-of-attorney-cost |
| 4 (life/home/education/career) | 12 | divorce-cost, moving-abroad-cost, career-break-runway, cosigning-loan-risk, solar-payback, ev-charger-roi, carbon-offset, homeowner-first-year-budget, study-abroad-cost, scholarship-gap, ats-resume-score, salary-negotiation-range |
| 5 (remaining Part 2 + portfolio) | 10 | bereavement-checklist, inheritance-tax-uk-india, journeyman-wage-progression, tool-depreciation, us-priority-date, cost-of-living-compare, interview-to-offer-tracker, ev-charger-business-roi, student-loan-vs-scholarship, rental-portfolio-tracker |
| 6 (regional reinforcement) | 5 | gold-price, qurbani-cost, umrah-cost, remittance-fee, school-fee-inflation |

## Verification

- Registry count 1282, consistent across `index.html`, `js/data.js`,
  `js/site-config.js` and `count-consistency.test.js`.
- No duplicate tool ids across all `js/data/*.js` files (checked).
- Sitemap: 1413 URLs (1282 tools across 20 categories), quality gate PASS.
- Performance budgets: ALL PASS (eager-js 1358/1600KB, index 79/90KB).
- Full unit suite: 1938 passing across 40 files.
- Independent known-answer tests: market-gap-qa (19), qa2 (16), qa3 (20),
  qa4 (15), qa5 (6), plus portfolio-store (8).
