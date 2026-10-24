/* ============================================================
 * Category Methodology + Reviewer Bylines — shared data module
 * ------------------------------------------------------------
 * Used by BOTH the static site generator (scripts/ssg-pages.cjs)
 * and the client (js/app.js) so the pre-rendered HTML and the
 * hydrated DOM stay identical.
 *
 * REVIEWERS are intentionally EMPTY. A byline is rendered only when
 * a real, named reviewer with credentials is set here — we never
 * invent reviewer names or credentials. The owner can fill these in.
 * ============================================================ */
(function (root) {
  'use strict';

  var METHODOLOGY = {
    finance: 'Standard financial formulas — amortisation, compound interest, present and future value, tax brackets — using the same conventions banks and tax authorities publish. Rates and thresholds are clearly labelled and dated.',
    health: 'Published, peer-reviewed formulas such as BMI, BMR (Mifflin-St Jeor), body-fat and dosage conventions. Results are estimates and never a substitute for professional medical advice.',
    math: 'Established algebraic and geometric identities and numerical methods, evaluated with the same order of operations used in textbooks.',
    everyday: 'Straightforward arithmetic, date and unit logic, using standard calendar and measurement conventions.',
    science: 'SI-based physical constants and standard scientific formulas, with units carried through the working.',
    engineering: 'Standard engineering formulas and material properties from published handbooks, with safety factors noted where they apply.',
    construction: 'Trade-standard estimating formulas and code-referenced tables (conduit fill, offsets, load estimates), with material allowances stated.',
    conversion: 'Exact or published conversion factors, applied with the standard significant-figure rules.',
    business: 'Common business and marketing formulas (CAC, LTV, margin, break-even, rate cards) using widely published benchmark methods.',
    education: 'Published cost-of-attendance, aid and loan-amortisation methods, with sources and assumptions stated.',
    utilities: 'Standard utility formulas such as energy use, cost per unit and efficiency, using published tariffs as inputs only.',
    lifestyle: 'Everyday planning formulas with clearly stated assumptions and ranges.',
    regional: 'Region-specific rules and rates for India, Pakistan and the Gulf, sourced from published rates and clearly labelled as estimates that change.',
    food: 'Published nutrition data and standard macro and calorie methods, using accepted energy conversions.',
    fitness: 'Published exercise-science formulas for calories, one-rep-max and pace, with the assumptions stated.',
    auto: 'Standard vehicle formulas for fuel use, running costs and depreciation, using published efficiencies as inputs.',
    career: 'Published pay, points and screening conventions (immigration points tests, ATS heuristics, negotiation bands), labelled as guidance.',
    homegarden: 'Standard home and garden estimating formulas (payback, area, yield, maintenance allowances) with the assumptions stated.',
    tech: 'Standard digital and computing formulas, including the correct base-2 versus base-10 units.',
    family: 'Family and parenting planning formulas using published schedules and clearly stated assumptions.',
    conversion_default: 'Documented public formulas, hand-checked against worked examples.',
    _default: 'Documented public formulas, hand-checked against worked examples and covered by automated tests on every build.'
  };

  // Set a category (or '_default') to an object like
  // { name: 'Jane Doe', credentials: 'CFP', url: '/about' } to show a
  // "Reviewed by" byline on that category. Empty by default — no invented names.
  var REVIEWERS = {
    finance: null,
    health: null,
    _default: null
  };

  // Merge owner-provided reviewers (generated from data/reviewers.json by
  // scripts/apply-reviewers.cjs). If the generated file is absent, nothing is
  // merged and no bylines render — we never invent names.
  try {
    var provided = null;
    if (typeof module !== 'undefined' && module.exports) {
      provided = require('./reviewers-data.js');
    } else if (root && root.__CPM_REVIEWERS__) {
      provided = root.__CPM_REVIEWERS__;
    }
    if (provided && typeof provided === 'object') {
      for (var rk in provided) {
        if (Object.prototype.hasOwnProperty.call(provided, rk)) REVIEWERS[rk] = provided[rk];
      }
    }
  } catch (e) { /* reviewers-data.js not generated yet — show no bylines */ }

  function methodologyFor(catKey) {
    return METHODOLOGY[catKey] || METHODOLOGY._default;
  }

  function reviewerFor(catKey) {
    return REVIEWERS[catKey] || REVIEWERS._default || null;
  }

  function bylineHtml(catKey) {
    var r = reviewerFor(catKey);
    if (!r || !r.name) return '';
    var cred = r.credentials ? ', ' + r.credentials : '';
    var name = r.url ? '<a href="' + r.url + '">' + r.name + '</a>' : r.name;
    return '<div class="tool-byline"><strong>Reviewed by ' + name + cred + '</strong></div>';
  }

  function methodologyHtml(catKey) {
    return '<div class="tool-methodology"><strong>Methodology:</strong> ' + methodologyFor(catKey) + '</div>';
  }

  var CategoryMethodology = {
    METHODOLOGY: METHODOLOGY,
    REVIEWERS: REVIEWERS,
    methodologyFor: methodologyFor,
    reviewerFor: reviewerFor,
    bylineHtml: bylineHtml,
    methodologyHtml: methodologyHtml
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CategoryMethodology;
  if (typeof window !== 'undefined') window.CategoryMethodology = CategoryMethodology;
})(typeof window !== 'undefined' ? window : globalThis);
