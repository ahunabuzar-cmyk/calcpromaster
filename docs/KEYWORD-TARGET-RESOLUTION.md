# Keyword target resolution (B / C / D)

_Generated for the 2026-10-17 sitemap tree by `scripts/apply-keyword-targets.cjs`. Do not edit by hand — regenerate with `npm run seo:targets`._

Every B/C/D row from [KEYWORD-IMPLEMENTATION-MAP.md](KEYWORD-IMPLEMENTATION-MAP.md) resolved to a real owner page,
then improved: the keyword is answered by a rendered FAQ on that page (tool pages also get it in their `lsi` target list).
A row is left `NO_OWNER` only when no page can honestly answer it — never mapped to a near-miss page to fill the column.

| Result | Rows |
|---|---:|
| improved (FAQ + lsi added) | 80 |
| already applied | 9 |
| no honest owner | 2 |
| **total** | **91** |

Nothing was invented: every answer is built from the tool's own registry row (name, input labels, steps flag),
and every route is re-checked against the live `js/seo-content.js` canonical paths before use.

## Every row

| Code | Keyword | Vol | Status | Owner | How resolved |
|---|---|---:|---|---|---|
| B | `polypeptide calculator` | 301,000 | IMPROVED | /health/peptide-reconstitution/ | map |
| B | `convert currency xe` | 246,000 | IMPROVED | /finance/currency-converter/ | map |
| B | `convert xe currency` | 246,000 | IMPROVED | /finance/currency-converter/ | map |
| B | `mortgage expense calculator` | 201,000 | IMPROVED | /finance/mortgage/ | reviewed-table — mortgage expense = the monthly payment the mortgage page totals |
| C | `cd bank calculator` | 165,000 | IMPROVED | /finance/cd-calculator/ | reviewed-table — CD = certificate of deposit |
| B | `bank certificate calculator` | 165,000 | IMPROVED | /finance/cd-calculator/ | map |
| B | `ft2 calculator` | 165,000 | IMPROVED | /conversion/area/ | map |
| C | `ft squared calculator` | 165,000 | IMPROVED | /conversion/area/ | reviewed-table — square feet is an area unit — the area converter, same owner as the ft2 row |
| D | `calculator for certificate of deposit` | 165,000 | IMPROVED | /finance/cd-calculator/ | map |
| B | `certified deposit calculator` | 165,000 | IMPROVED | /finance/cd-calculator/ | reviewed-table — confused phrasing for certificate of deposit — the CD page |
| D | `deposit certificate calculator` | 165,000 | IMPROVED | /finance/cd-calculator/ | map |
| D | `certificate deposit calculator` | 165,000 | IMPROVED | /finance/cd-calculator/ | map |
| C | `bmi calculator body mass index` | 110,000 | IMPROVED | /health/bmi/ | reviewed-table — the BMI page, already the registry owner |
| B | `calendar calculator` | 60,500 | IMPROVED | /everyday/date-diff/ | map |
| B | `yearly salary calculator` | 49,500 | IMPROVED | /lifestyle/parental-leave/ | map |
| C | `financial compound calculator` | 40,500 | IMPROVED | /finance/compound-interest/ | reviewed-table — compound interest is the exact tool |
| C | `financial compounding calculator` | 40,500 | IMPROVED | /finance/compound-interest/ | reviewed-table — same intent, word order only |
| C | `interest percentage calculator` | 33,100 | IMPROVED | /finance/simple-interest/ | reviewed-table — interest as a percentage of principal is the simple-interest tool |
| B | `ot calculator` | 22,200 | IMPROVED | /career/overtime-pay/ | reviewed-table — OT = overtime; /career/overtime-pay/ is the dedicated tool |
| B | `simplify calculator` | 18,100 | IMPROVED | /utilities/ratio-simplifier/ | map |
| C | `compounded daily calculator` | 14,800 | IMPROVED | /finance/compound-interest/ | reviewed-table — the compound page takes the compounding frequency (incl. daily) |
| C | `desired weight calculator` | 14,800 | IMPROVED | /health/ideal-body-weight/ | reviewed-table — a desired/target weight is the ideal-body-weight tool |
| C | `simple loan calculator` | 14,800 | IMPROVED | /finance/loan-emi/ | reviewed-table — a "simple" loan is the plain EMI/amortisation the loan page does |
| C | `loan calculator for business` | 14,800 | IMPROVED | /finance/loan-emi/ | reviewed-table — the loan maths is identical; the business framing is context, not a different formula |
| B | `time adder` | 14,800 | IMPROVED | /career/timesheet-hours/ | reviewed-table — adding durations is what the timesheet tool does (start/end → total hours) |
| C | `payment planner` | 12,100 | IMPROVED | /finance/loan-emi/ | reviewed-table — a payment planner schedules loan payments; the EMI page is the payment schedule calculator |
| B | `fv calculator` | 9,900 | IMPROVED | /finance/future-value/ | map |
| C | `mortgage and tax calculator` | 9,900 | IMPROVED | /finance/mortgage/ | reviewed-table — mortgage payment + tax/escrow is the mortgage page |
| C | `pricing generator` | 8,100 | IMPROVED | /business/pricing/ | reviewed-table — the Pricing Calculator generates a selling price from unit cost + target margin — the arithmetic intent; the price-list-software intent is not claimed |
| B | `yearly income calculator` | 8,100 | ALREADY | /guides/income-tax/ | map |
| C | `savings calculator simple` | 6,600 | IMPROVED | /finance/savings-goal/ | reviewed-table — simple saving towards a target is the savings-goal tool |
| C | `percentage return calculator` | 6,600 | IMPROVED | /finance/roi/ | reviewed-table — percentage return = ROI |
| C | `retirement plan estimator` | 5,400 | IMPROVED | /finance/retirement/ | reviewed-table — a retirement plan estimate is the retirement tool |
| B | `hour counter` | 5,400 | IMPROVED | /career/timesheet-hours/ | reviewed-table — the recorded target (/everyday/distance-pace) counts hours only as a by-product of pace; the hours tool is the real owner |
| C | `reverse tax calculator` | 4,400 | IMPROVED | /finance/sales-tax/ | reviewed-table — reverse tax = working back from a gross amount; the sales-tax page does gross/net |
| C | `percentage discount calculator` | 4,400 | IMPROVED | /finance/discount/ | reviewed-table — discount as a percentage is the discount tool |
| C | `daily interest calculator` | 4,400 | IMPROVED | /finance/simple-interest/ | reviewed-table — per-day interest is the simple-interest page with a daily term |
| B | `calculate age by birthday` | 4,400 | ALREADY | /guides/age/ | map |
| C | `inflation salary calculator` | 3,600 | IMPROVED | /career/raise-calculator/ | reviewed-table — same intent as the wage row — real versus nominal salary |
| B | `dob calculator` | 3,600 | IMPROVED | /utilities/age-exact/ | map |
| D | `compound investment calculator` | 3,600 | IMPROVED | /finance/compound-interest/ | reviewed-table — code D cluster with "compound investments" — one shared page owns both |
| C | `investment calculator over time` | 3,600 | IMPROVED | /finance/investment/ | reviewed-table — growth over time is the investment tool |
| C | `simple retirement calculator` | 3,600 | IMPROVED | /finance/retirement/ | reviewed-table — the retirement tool with defaults is the simple case |
| B | `compounded monthly calculator` | 2,900 | IMPROVED | /regional/post-office-savings/ | map |
| C | `share return calculator` | 2,400 | IMPROVED | /finance/roi/ | reviewed-table — a share return is an ROI calculation |
| C | `calculator on this phone` | 2,400 | NO_OWNER | — | reviewed-table — navigational/device intent (the phone's own calculator app) — no calculation to own |
| C | `credit rate calculator` | 2,400 | IMPROVED | /finance/apr-annual/ | reviewed-table — the credit rate = APR; the annual-rate tool is the owner |
| B | `compounded annually calculator` | 2,400 | IMPROVED | /regional/post-office-savings/ | map |
| D | `retirement planner calculator` | 2,400 | IMPROVED | /finance/retirement/ | reviewed-table — code D cluster with "free online retirement planner" — one page owns both |
| B | `compounding calculator yearly` | 2,400 | ALREADY | /guides/cagr/ | map |
| B | `pv calculator` | 1,900 | IMPROVED | /finance/present-value/ | reviewed-table — PV is the standard finance abbreviation for present value |
| C | `loan percentage calculator` | 1,900 | IMPROVED | /finance/apr-annual/ | reviewed-table — the percentage on a loan is the APR |
| C | `figure out interest rate on loan` | 1,900 | IMPROVED | /finance/apr-annual/ | reviewed-table — solving for the rate is what the APR/annual-rate page does |
| C | `retirement budget calculator` | 1,900 | IMPROVED | /finance/retirement-withdrawal/ | reviewed-table — spending in retirement is the withdrawal tool |
| C | `financial planning calculator` | 1,900 | IMPROVED | /finance/retirement/ | reviewed-table — long-horizon financial planning is the retirement tool |
| C | `mortgage calculator how much do i qualify for` | 1,900 | IMPROVED | /finance/loan-qualify/ | reviewed-table — same intent as the other qualify row — the qualification tool |
| B | `paycheck deduction calculator` | 1,900 | ALREADY | /guides/career/ | map |
| B | `spending calculator retirement` | 1,900 | ALREADY | /guides/retirement/ | map |
| B | `retirement expenditure calculator` | 1,900 | IMPROVED | /finance/retirement-withdrawal/ | reviewed-table — retirement spending is the withdrawal tool |
| B | `housing cost calculator` | 1,900 | ALREADY | /guides/baby-cost/ | map |
| B | `housing cost estimator` | 1,900 | ALREADY | /guides/baby-cost/ | map |
| D | `free online retirement planner` | 1,600 | IMPROVED | /finance/retirement/ | reviewed-table — code D cluster with "retirement planner calculator" — one page owns both |
| C | `compound retirement calculator` | 1,600 | IMPROVED | /finance/retirement/ | reviewed-table — compounding into retirement is the retirement tool |
| C | `compounding calculator retirement` | 1,600 | IMPROVED | /finance/retirement/ | reviewed-table — same intent as the compound-retirement row |
| B | `interest accrual calculator` | 1,600 | IMPROVED | /finance/loan-emi/ | map |
| C | `cash back calculator` | 1,300 | IMPROVED | /finance/credit-card-payoff/ | reviewed-table — cash back is a card reward — the card page is the closest honest owner |
| C | `roi calculation formula` | 1,300 | IMPROVED | /finance/roi/ | reviewed-table — the ROI page carries the formula and the calculator |
| C | `work schedule calculator` | 1,300 | IMPROVED | /career/timesheet-hours/ | reviewed-table — a work schedule is a set of timesheets — hours per day/week |
| C | `concrete calculator formula` | 1,300 | IMPROVED | /everyday/concrete/ | reviewed-table — the concrete page carries the volume formula |
| D | `compound investments` | 1,300 | IMPROVED | /finance/compound-interest/ | reviewed-table — code D cluster with "compound investment calculator" — one shared page owns both |
| C | `future value of investment calculator` | 1,300 | IMPROVED | /finance/future-value/ | reviewed-table — future value is the exact tool |
| C | `retirement calculator growth` | 1,300 | IMPROVED | /finance/retirement/ | reviewed-table — projected growth is the retirement tool |
| B | `age calendar` | 1,300 | ALREADY | /guides/age/ | map |
| B | `currency calculator xe` | 1,300 | IMPROVED | /finance/currency-converter/ | reviewed-table — same generic currency-conversion intent; brand not targeted |
| C | `inflation wage calculator` | 1,000 | IMPROVED | /career/raise-calculator/ | reviewed-table — wage vs inflation is the real-terms raise the raise tool computes |
| C | `compound loan calculator` | 1,000 | IMPROVED | /finance/loan-emi/ | reviewed-table — a loan is amortised, not compounded; the loan page is the honest owner and explains the difference |
| C | `formula discount` | 1,000 | IMPROVED | /finance/discount/ | reviewed-table — the discount formula lives on the discount page |
| C | `calculator that shows work` | 1,000 | NO_OWNER | — | reviewed-table — cross-cutting feature (every tool shows its working via the steps panel), not one page's intent |
| C | `investment account calculator` | 1,000 | IMPROVED | /finance/investment/ | reviewed-table — account balance over time is the investment tool |
| C | `loan calculator monthly` | 1,000 | IMPROVED | /finance/loan-emi/ | registry-match — strict all-token registry match: loan-emi |
| C | `compare loan calculator` | 1,000 | IMPROVED | /finance/loan-comparison/ | reviewed-table — side-by-side loan comparison is the dedicated page |
| C | `monthly investment calculator` | 1,000 | IMPROVED | /finance/investment-growth/ | reviewed-table — monthly contributions with growth is the investment-growth tool |
| B | `yearly interest calculator` | 1,000 | ALREADY | /guides/compound-interest/ | map |
| C | `savings percentage calculator` | 880 | IMPROVED | /finance/savings-goal/ | reviewed-table — savings as a percentage of income sits on the savings-goal page |
| C | `yearly payment calculator` | 880 | IMPROVED | /finance/loan-emi/ | reviewed-table — the annual payment on a loan is the loan page run over 12 months |
| C | `compound return calculator` | 880 | IMPROVED | /finance/cagr/ | reviewed-table — a compound return is CAGR |
| C | `retirement financial calculator` | 880 | IMPROVED | /finance/retirement/ | reviewed-table — the retirement tool |
| C | `qualify for a mortgage calculator` | 880 | IMPROVED | /finance/loan-qualify/ | reviewed-table — affordability/qualification is the loan-qualify tool |
| B | `yearly pay calculator` | 880 | IMPROVED | /lifestyle/parental-leave/ | map |
| B | `projected retirement calculator` | 880 | IMPROVED | /finance/retirement/ | reviewed-table — a projection is the retirement tool |
| B | `forex xe converter` | 880 | IMPROVED | /finance/currency-converter/ | reviewed-table — generic forex-conversion intent; the brand name ("xe") is not targeted |
