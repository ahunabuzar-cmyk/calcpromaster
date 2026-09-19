/*!
 * Cluster map — cross-category intent clusters (C1–C8).
 * Source of truth for "related calculators" cluster links on both render
 * paths (build-time SSG in scripts/ssg-pages.cjs and SPA in js/app.js).
 *
 * Derived from docs/INTENT-AUDIT.md (I1: 41 cross-category intent clusters);
 * only C1–C8 are wired. Every slug here is validated against sitemap.xml by
 * scripts/check-cluster-links.cjs — add a page there first, then here.
 *
 * Dual-mode: required by Node (build scripts) and sets window.__CLUSTERS__
 * in the browser (loaded as a plain <script> before app.js uses it).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.__CLUSTERS__ = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      id: 'C1',
      label: 'Loans & mortgages',
      hub: 'finance/loan-emi',
      spokes: [
        'finance/mortgage', 'finance/amortization', 'finance/auto-loan',
        'auto/car-loan-emi', 'auto/lease-vs-buy', 'finance/balloon-payment',
        'finance/biweekly-mortgage', 'finance/interest-only', 'finance/fha-loan',
        'finance/va-loan', 'finance/graduated-payment', 'finance/mortgage-payoff',
        'finance/pmi-calculator', 'finance/closing-costs',
        'regional/home-loan-emi-india'
      ]
    },
    {
      id: 'C2',
      label: 'Health metrics',
      hub: 'health/bmi',
      spokes: [
        'health/bmr', 'health/bmr-mifflin', 'health/calorie', 'health/tdee-macro',
        'health/total-body-water', 'health/ideal-body-weight', 'health/ideal-weight',
        'everyday/calorie-counter', 'fitness/calories-burned',
        'fitness/body-fat-fitness', 'food/keto-macro'
      ]
    },
    {
      id: 'C3',
      label: 'Income tax',
      hub: 'finance/tax',
      spokes: [
        'finance/us-income-tax', 'finance/uk-income-tax',
        'finance/canada-income-tax', 'finance/australia-income-tax',
        'regional/pk-income-tax', 'career/tax-refund', 'career/freelance-budget',
        'family/teen-budget'
      ]
    },
    {
      id: 'C4',
      label: 'Concrete & volumes',
      hub: 'construction/concrete-slab',
      spokes: [
        'construction/concrete-bags', 'construction/excavation',
        'construction/gravel', 'construction/gravel-driveway',
        'construction/gravel-tonnage', 'construction/soil',
        'everyday/concrete', 'homegarden/raised-bed-soil'
      ]
    },
    {
      id: 'C5',
      label: 'Budgeting',
      hub: 'finance/envelope-budget',
      spokes: [
        'family/family-budget', 'family/family-budget-simple',
        'everyday/budget-allocator', 'finance/cash-flow', 'finance/debt-ratio',
        'finance/loan-qualify'
      ]
    },
    {
      id: 'C6',
      label: 'Grading & academics',
      hub: 'education/gpa',
      spokes: [
        'education/cgpa', 'education/grade-needed', 'education/semester-gpa',
        'education/gpa-target'
      ]
    },
    {
      id: 'C7',
      label: 'Crypto',
      hub: 'finance/crypto-profit',
      spokes: ['finance/crypto-gains']
    },
    {
      id: 'C8',
      label: 'Refinance & equity',
      hub: 'finance/refinance',
      spokes: ['finance/home-equity', 'finance/pmi-drop', 'career/remortgage-calc']
    }
  ];
}));
