# Keyword implementation status (B / C / D)

_Generated for the 2026-10-17 sitemap tree by `scripts/audit-keyword-implementation.cjs` from
`data/keyword-implementation-map.json`. Do not edit by hand — regenerate with `npm run seo:kw-impl`._

The implementation map decides **which page owns which keyword**. This audit checks whether that
decision is reachable in the **built** tree — the HTML a crawler receives — so a decision with no
page, or with the wrong page, is visible instead of sitting in the plan looking done.

## Totals

| Status | Rows | Meaning |
|---|---:|---|
| COVERED | 94 | page already names the keyword — nothing to change |
| NO_OWNER | 2 |  |
| **total** | **96** | |

| Code | Rows | COVERED | NEEDS_META | WRONG_OWNER | NO_TARGET | PAGE_MISSING |
|---|---:|---:|---:|---:|---:|---:|
| B | 34 | 34 | 0 | 0 | 0 | 0 |
| C | 55 | 53 | 0 | 0 | 0 | 0 |
| D | 7 | 7 | 0 | 0 | 0 | 0 |

## Work queue — pages that are the right owner but under-describe it

Nothing to change.

## Rows whose recorded decision cannot be implemented as written

None.

## Every row (nothing skipped)

| Code | Status | Keyword | Vol | Concept tokens | Target | Missing |
|---|---|---|---:|---|---|---|
| B | COVERED | `polypeptide calculator` | 301,000 | polypeptide | `/health/peptide-reconstitution/` | — |
| B | COVERED | `convert currency xe` | 246,000 | currency xe | `/finance/currency-converter/` | — |
| B | COVERED | `convert xe currency` | 246,000 | xe currency | `/finance/currency-converter/` | — |
| C | COVERED | `time card clock calculator` | 201,000 | time card clock | `/career/timesheet-hours` | — |
| B | COVERED | `mortgage expense calculator` | 201,000 | mortgage expense | `/finance/mortgage` | — |
| C | COVERED | `cd bank calculator` | 165,000 | cd bank | `/finance/cd-calculator` | — |
| B | COVERED | `bank certificate calculator` | 165,000 | bank certificate | `/finance/cd-calculator` | — |
| B | COVERED | `ft2 calculator` | 165,000 | squarefoot | `/conversion/area/` | — |
| C | COVERED | `ft squared calculator` | 165,000 | foot squared | `/conversion/area` | — |
| D | COVERED | `calculator for certificate of deposit` | 165,000 | certificate deposit | `/finance/cd-calculator` | — |
| B | COVERED | `certified deposit calculator` | 165,000 | certified deposit | `/finance/cd-calculator` | — |
| D | COVERED | `deposit certificate calculator` | 165,000 | deposit certificate | `/finance/cd-calculator` | — |
| D | COVERED | `certificate deposit calculator` | 165,000 | certificate deposit | `/finance/cd-calculator` | — |
| C | COVERED | `bmi calculator body mass index` | 110,000 | bmi body mass index | `/health/bmi` | — |
| C | COVERED | `day count` | 74,000 | day count | `/everyday/date-diff` | — |
| B | COVERED | `calendar calculator` | 60,500 | calendar | `/everyday/date-diff/` | — |
| B | COVERED | `yearly salary calculator` | 49,500 | yearly salary | `/lifestyle/parental-leave` | — |
| C | COVERED | `financial compound calculator` | 40,500 | financial compound | `/finance/compound-interest` | — |
| C | COVERED | `financial compounding calculator` | 40,500 | financial compound | `/finance/compound-interest` | — |
| C | COVERED | `interest percentage calculator` | 33,100 | interest percentage | `/finance/simple-interest` | — |
| B | COVERED | `ot calculator` | 22,200 | ot | `/career/overtime-pay` | — |
| C | COVERED | `time payroll calculator` | 22,200 | time salary | `/career/timesheet-hours` | — |
| B | COVERED | `pay time calculator` | 22,200 | salary time | `/career/timesheet-hours` | — |
| B | COVERED | `simplify calculator` | 18,100 | simplify | `/utilities/ratio-simplifier/` | — |
| C | COVERED | `compounded daily calculator` | 14,800 | compounded daily | `/finance/compound-interest` | — |
| C | COVERED | `desired weight calculator` | 14,800 | desired weight | `/health/ideal-body-weight` | — |
| C | COVERED | `simple loan calculator` | 14,800 | simple loan | `/finance/loan-emi` | — |
| C | COVERED | `loan calculator for business` | 14,800 | loan business | `/finance/loan-emi` | — |
| B | COVERED | `time adder` | 14,800 | time adder | `/career/timesheet-hours` | — |
| C | COVERED | `payment planner` | 12,100 | payment planner | `/finance/loan-emi` | — |
| B | COVERED | `fv calculator` | 9,900 | fv | `/finance/future-value/` | — |
| C | COVERED | `mortgage and tax calculator` | 9,900 | mortgage tax | `/finance/mortgage` | — |
| C | COVERED | `pricing generator` | 8,100 | price generator | `/business/pricing` | — |
| B | COVERED | `yearly income calculator` | 8,100 | yearly income | `/guides/income-tax` | — |
| C | COVERED | `savings calculator simple` | 6,600 | sav simple | `/finance/savings-goal` | — |
| C | COVERED | `percentage return calculator` | 6,600 | percentage return | `/finance/roi` | — |
| C | COVERED | `retirement plan estimator` | 5,400 | retirement plan | `/finance/retirement` | — |
| B | COVERED | `hour counter` | 5,400 | hour counter | `/career/timesheet-hours` | — |
| C | COVERED | `reverse tax calculator` | 4,400 | reverse tax | `/finance/sales-tax` | — |
| C | COVERED | `percentage discount calculator` | 4,400 | percentage discount | `/finance/discount` | — |
| C | COVERED | `daily interest calculator` | 4,400 | daily interest | `/finance/simple-interest` | — |
| B | COVERED | `calculate age by birthday` | 4,400 | age birthday | `/guides/age` | — |
| C | COVERED | `inflation salary calculator` | 3,600 | inflation salary | `/career/raise-calculator` | — |
| B | COVERED | `dob calculator` | 3,600 | dob | `/utilities/age-exact/` | — |
| D | COVERED | `compound investment calculator` | 3,600 | compound investment | `/finance/compound-interest` | — |
| C | COVERED | `investment calculator over time` | 3,600 | investment over time | `/finance/investment` | — |
| C | COVERED | `simple retirement calculator` | 3,600 | simple retirement | `/finance/retirement` | — |
| B | COVERED | `compounded monthly calculator` | 2,900 | compounded monthly | `/regional/post-office-savings` | — |
| C | COVERED | `share return calculator` | 2,400 | share return | `/finance/roi` | — |
| C | NO_OWNER | `calculator on this phone` | 2,400 | this phone | — | this phone |
| C | COVERED | `credit rate calculator` | 2,400 | credit rate | `/finance/apr-annual` | — |
| B | COVERED | `compounded annually calculator` | 2,400 | compounded annually | `/regional/post-office-savings` | — |
| D | COVERED | `retirement planner calculator` | 2,400 | retirement planner | `/finance/retirement` | — |
| B | COVERED | `compounding calculator yearly` | 2,400 | compound yearly | `/guides/cagr` | — |
| B | COVERED | `pv calculator` | 1,900 | pv | `/finance/present-value` | — |
| C | COVERED | `loan percentage calculator` | 1,900 | loan percentage | `/finance/apr-annual` | — |
| C | COVERED | `figure out interest rate on loan` | 1,900 | figure out interest rate loan | `/finance/apr-annual` | — |
| C | COVERED | `retirement budget calculator` | 1,900 | retirement budget | `/finance/retirement-withdrawal` | — |
| C | COVERED | `financial planning calculator` | 1,900 | financial plan | `/finance/retirement` | — |
| C | COVERED | `mortgage calculator how much can i qualify for` | 1,900 | mortgage much can qualify | `/finance/loan-qualify` | — |
| C | COVERED | `mortgage calculator how much do i qualify for` | 1,900 | mortgage much do qualify | `/finance/loan-qualify` | — |
| B | COVERED | `paycheck deduction calculator` | 1,900 | salary deductions | `/guides/career` | — |
| B | COVERED | `spending calculator retirement` | 1,900 | spend retirement | `/guides/retirement` | — |
| B | COVERED | `retirement expenditure calculator` | 1,900 | retirement expenditure | `/finance/retirement-withdrawal` | — |
| B | COVERED | `housing cost calculator` | 1,900 | hous cost | `/guides/baby-cost` | — |
| B | COVERED | `housing cost estimator` | 1,900 | hous cost | `/guides/baby-cost` | — |
| D | COVERED | `free online retirement planner` | 1,600 | retirement planner | `/finance/retirement` | — |
| C | COVERED | `compound retirement calculator` | 1,600 | compound retirement | `/finance/retirement` | — |
| C | COVERED | `compounding calculator retirement` | 1,600 | compound retirement | `/finance/retirement` | — |
| B | COVERED | `interest accrual calculator` | 1,600 | interest accrual | `/finance/loan-emi` | — |
| C | COVERED | `cash back calculator` | 1,300 | cash back | `/finance/credit-card-payoff` | — |
| C | COVERED | `roi calculation formula` | 1,300 | roi formula | `/finance/roi` | — |
| C | COVERED | `work schedule calculator` | 1,300 | work schedule | `/career/timesheet-hours` | — |
| C | COVERED | `concrete calculator formula` | 1,300 | concrete formula | `/everyday/concrete` | — |
| D | COVERED | `compound investments` | 1,300 | compound investment | `/finance/compound-interest` | — |
| C | COVERED | `future value of investment calculator` | 1,300 | future investment | `/finance/future-value` | — |
| C | COVERED | `retirement calculator growth` | 1,300 | retirement growth | `/finance/retirement` | — |
| B | COVERED | `age calendar` | 1,300 | age calendar | `/guides/age` | — |
| B | COVERED | `currency calculator xe` | 1,300 | currency xe | `/finance/currency-converter` | — |
| C | COVERED | `inflation wage calculator` | 1,000 | inflation salary | `/career/raise-calculator` | — |
| C | COVERED | `time and pay calculator` | 1,000 | time salary | `/career/timesheet-hours` | — |
| C | COVERED | `compound loan calculator` | 1,000 | compound loan | `/finance/loan-emi` | — |
| C | COVERED | `formula discount` | 1,000 | formula discount | `/finance/discount` | — |
| C | NO_OWNER | `calculator that shows work` | 1,000 | that show work | — | that show work |
| C | COVERED | `investment account calculator` | 1,000 | investment account | `/finance/investment` | — |
| C | COVERED | `compare loan calculator` | 1,000 | compare loan | `/finance/loan-comparison` | — |
| C | COVERED | `monthly investment calculator` | 1,000 | monthly investment | `/finance/investment-growth` | — |
| B | COVERED | `yearly interest calculator` | 1,000 | yearly interest | `/guides/compound-interest` | — |
| C | COVERED | `savings percentage calculator` | 880 | sav percentage | `/finance/savings-goal` | — |
| C | COVERED | `yearly payment calculator` | 880 | yearly payment | `/finance/loan-emi` | — |
| C | COVERED | `compound return calculator` | 880 | compound return | `/finance/cagr` | — |
| C | COVERED | `retirement financial calculator` | 880 | retirement financial | `/finance/retirement` | — |
| C | COVERED | `qualify for a mortgage calculator` | 880 | qualify mortgage | `/finance/loan-qualify` | — |
| B | COVERED | `yearly pay calculator` | 880 | yearly salary | `/lifestyle/parental-leave` | — |
| B | COVERED | `projected retirement calculator` | 880 | projected retirement | `/finance/retirement` | — |
| B | COVERED | `forex xe converter` | 880 | forex xe converter | `/finance/currency-converter` | — |

