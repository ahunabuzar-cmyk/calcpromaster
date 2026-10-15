#!/usr/bin/env node
// ============================================================
// CalcProMaster — keyword → target-page resolutions (reviewed)
// ------------------------------------------------------------
// docs/KEYWORD-IMPLEMENTATION-MAP.md decides the code (A–E) for every audited
// keyword, but 70 of the 97 B/C/D rows record NO target URL: the map says
// "resolve by internal linking/metadata first" and stops there. A decision with
// no page cannot be implemented, so this table resolves each of those rows to a
// real route from the live registry (js/data/*.js + js/seo-content.js
// canonicalPath). Nothing here invents a page: every route is an existing,
// sitemap-listed tool page, and the applier re-checks that before using it.
//
// The table is shared by:
//   • scripts/build-keyword-implementation-map.cjs — so `proposedUrl` is filled
//     and the map stops saying "no page — see the reason column";
//   • scripts/apply-keyword-targets.cjs — so the page actually gets improved.
// One source, so the decision and the implementation cannot drift apart.
//
// `route: null` means: no page genuinely owns this intent. Those rows are
// recorded as `no implementation` with a reason, exactly like the map's own E
// rule — never mapped to a near-miss page just to fill the column.
//
// Rule: the recording target wins. An entry here only overrides a row that
// recorded NO target, except where the comment says the recorded target was
// wrong (the audit flags those as WRONG_OWNER/NEEDS_META on an unrelated page).
// ============================================================
'use strict';

const MANUAL_TARGETS = {
  // ---- time / payroll / pay (the largest cluster: 201k–1k, all "hours × pay") ----
  'time card clock calculator': { route: '/career/timesheet-hours/', note: 'a time card is a timesheet — /career/timesheet-hours/ works out hours from start/end times' },
  'time payroll calculator': { route: '/career/timesheet-hours/', note: 'payroll time = hours worked → the timesheet hours tool' },
  'pay time calculator': { route: '/career/timesheet-hours/', note: 'pay-for-time is the timesheet-hours calculation' },
  'time adder': { route: '/career/timesheet-hours/', note: 'adding durations is what the timesheet tool does (start/end → total hours)' },
  'time and pay calculator': { route: '/career/timesheet-hours/', note: 'hours and pay → timesheet hours, then overtime page for the rate' },
  'work schedule calculator': { route: '/career/timesheet-hours/', note: 'a work schedule is a set of timesheets — hours per day/week' },
  'ot calculator': { route: '/career/overtime-pay/', note: 'OT = overtime; /career/overtime-pay/ is the dedicated tool' },
  'hour counter': { route: '/career/timesheet-hours/', note: 'the recorded target (/everyday/distance-pace) counts hours only as a by-product of pace; the hours tool is the real owner' },
  'inflation wage calculator': { route: '/career/raise-calculator/', note: 'wage vs inflation is the real-terms raise the raise tool computes' },
  'inflation salary calculator': { route: '/career/raise-calculator/', note: 'same intent as the wage row — real versus nominal salary' },
  'payment planner': { route: '/finance/loan-emi/', note: 'a payment planner schedules loan payments; the EMI page is the payment schedule calculator' },
  'yearly payment calculator': { route: '/finance/loan-emi/', note: 'the annual payment on a loan is the loan page run over 12 months' },

  // ---- loan / mortgage / credit ----
  'mortgage expense calculator': { route: '/finance/mortgage/', note: 'mortgage expense = the monthly payment the mortgage page totals' },
  'simple loan calculator': { route: '/finance/loan-emi/', note: 'a "simple" loan is the plain EMI/amortisation the loan page does' },
  'loan calculator for business': { route: '/finance/loan-emi/', note: 'the loan maths is identical; the business framing is context, not a different formula' },
  'figure out interest rate on loan': { route: '/finance/apr-annual/', note: 'solving for the rate is what the APR/annual-rate page does' },
  'compound loan calculator': { route: '/finance/loan-emi/', note: 'a loan is amortised, not compounded; the loan page is the honest owner and explains the difference' },
  'compare loan calculator': { route: '/finance/loan-comparison/', note: 'side-by-side loan comparison is the dedicated page' },
  'qualify for a mortgage calculator': { route: '/finance/loan-qualify/', note: 'affordability/qualification is the loan-qualify tool' },
  'mortgage calculator how much can i qualify for': { route: '/finance/loan-qualify/', note: 'same intent as the other qualify row — the qualification tool' },
  'mortgage calculator how much do i qualify for': { route: '/finance/loan-qualify/', note: 'same intent as the other qualify row — the qualification tool' },
  'credit rate calculator': { route: '/finance/apr-annual/', note: 'the credit rate = APR; the annual-rate tool is the owner' },
  'cash back calculator': { route: '/finance/credit-card-payoff/', note: 'cash back is a card reward — the card page is the closest honest owner' },
  'reverse tax calculator': { route: '/finance/sales-tax/', note: 'reverse tax = working back from a gross amount; the sales-tax page does gross/net' },

  // ---- interest / compound / investment / savings ----
  'financial compound calculator': { route: '/finance/compound-interest/', note: 'compound interest is the exact tool' },
  'financial compounding calculator': { route: '/finance/compound-interest/', note: 'same intent, word order only' },
  'compounded daily calculator': { route: '/finance/compound-interest/', note: 'the compound page takes the compounding frequency (incl. daily)' },
  'interest percentage calculator': { route: '/finance/simple-interest/', note: 'interest as a percentage of principal is the simple-interest tool' },
  'daily interest calculator': { route: '/finance/simple-interest/', note: 'per-day interest is the simple-interest page with a daily term' },
  'percentage return calculator': { route: '/finance/roi/', note: 'percentage return = ROI' },
  'roi calculation formula': { route: '/finance/roi/', note: 'the ROI page carries the formula and the calculator' },
  'share return calculator': { route: '/finance/roi/', note: 'a share return is an ROI calculation' },
  'future value of investment calculator': { route: '/finance/future-value/', note: 'future value is the exact tool' },
  'investment calculator over time': { route: '/finance/investment/', note: 'growth over time is the investment tool' },
  'investment account calculator': { route: '/finance/investment/', note: 'account balance over time is the investment tool' },
  'monthly investment calculator': { route: '/finance/investment-growth/', note: 'monthly contributions with growth is the investment-growth tool' },
  'compound investment calculator': { route: '/finance/compound-interest/', note: 'code D cluster with "compound investments" — one shared page owns both' },
  'compound investments': { route: '/finance/compound-interest/', note: 'code D cluster with "compound investment calculator" — one shared page owns both' },
  'compound return calculator': { route: '/finance/cagr/', note: 'a compound return is CAGR' },
  'savings calculator simple': { route: '/finance/savings-goal/', note: 'simple saving towards a target is the savings-goal tool' },
  'savings percentage calculator': { route: '/finance/savings-goal/', note: 'savings as a percentage of income sits on the savings-goal page' },
  'percentage discount calculator': { route: '/finance/discount/', note: 'discount as a percentage is the discount tool' },
  'formula discount': { route: '/finance/discount/', note: 'the discount formula lives on the discount page' },

  // ---- deposit / conversion / health / date ----
  'certified deposit calculator': { route: '/finance/cd-calculator/', note: 'confused phrasing for certificate of deposit — the CD page' },
  'cd bank calculator': { route: '/finance/cd-calculator/', note: 'CD = certificate of deposit' },
  'ft squared calculator': { route: '/conversion/area/', note: 'square feet is an area unit — the area converter, same owner as the ft2 row' },
  'concrete calculator formula': { route: '/everyday/concrete/', note: 'the concrete page carries the volume formula' },
  'bmi calculator body mass index': { route: '/health/bmi/', note: 'the BMI page, already the registry owner' },
  'desired weight calculator': { route: '/health/ideal-body-weight/', note: 'a desired/target weight is the ideal-body-weight tool' },
  'day count': { route: '/everyday/date-diff/', note: 'counting days between dates is the date-difference tool' },
  'mortgage and tax calculator': { route: '/finance/mortgage/', note: 'mortgage payment + tax/escrow is the mortgage page' },
  'annual percentage calculator': { route: '/finance/apr-annual/', note: 'annual percentage rate = APR' },
  'loan percentage calculator': { route: '/finance/apr-annual/', note: 'the percentage on a loan is the APR' },
  'forex xe converter': { route: '/finance/currency-converter/', note: 'generic forex-conversion intent; the brand name ("xe") is not targeted' },
  'currency calculator xe': { route: '/finance/currency-converter/', note: 'same generic currency-conversion intent; brand not targeted' },
  'pv calculator': { route: '/finance/present-value/', note: 'PV is the standard finance abbreviation for present value' },

  // ---- retirement (one page owns the whole family) ----
  'retirement plan estimator': { route: '/finance/retirement/', note: 'a retirement plan estimate is the retirement tool' },
  'simple retirement calculator': { route: '/finance/retirement/', note: 'the retirement tool with defaults is the simple case' },
  'retirement planner calculator': { route: '/finance/retirement/', note: 'code D cluster with "free online retirement planner" — one page owns both' },
  'free online retirement planner': { route: '/finance/retirement/', note: 'code D cluster with "retirement planner calculator" — one page owns both' },
  'compound retirement calculator': { route: '/finance/retirement/', note: 'compounding into retirement is the retirement tool' },
  'compounding calculator retirement': { route: '/finance/retirement/', note: 'same intent as the compound-retirement row' },
  'retirement calculator growth': { route: '/finance/retirement/', note: 'projected growth is the retirement tool' },
  'projected retirement calculator': { route: '/finance/retirement/', note: 'a projection is the retirement tool' },
  'retirement financial calculator': { route: '/finance/retirement/', note: 'the retirement tool' },
  'financial planning calculator': { route: '/finance/retirement/', note: 'long-horizon financial planning is the retirement tool' },
  'retirement budget calculator': { route: '/finance/retirement-withdrawal/', note: 'spending in retirement is the withdrawal tool' },
  'retirement expenditure calculator': { route: '/finance/retirement-withdrawal/', note: 'retirement spending is the withdrawal tool' },

  // ---- price generation ----
  // "pricing generator" splits two ways: a SaaS that generates a price *list*, and
  // the arithmetic that generates a selling price from a cost and a target margin.
  // /business/pricing is literally that calculator (unit cost + desired margin →
  // price), so it owns the arithmetic intent. The software/template intent is not
  // claimed anywhere — the page cannot answer it and does not pretend to.
  'pricing generator': { route: '/business/pricing/', note: 'the Pricing Calculator generates a selling price from unit cost + target margin — the arithmetic intent; the price-list-software intent is not claimed' },

  // ---- no honest single-page owner: recorded, not faked ----
  'calculator on this phone': { route: null, note: 'navigational/device intent (the phone\'s own calculator app) — no calculation to own' },
  'calculator that shows work': { route: null, note: 'cross-cutting feature (every tool shows its working via the steps panel), not one page\'s intent' }
};

module.exports = { MANUAL_TARGETS };
