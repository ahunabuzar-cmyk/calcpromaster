// ============================================================
// Mobile Ease + Decision Ease (S11 #78-83 + S12 #84-90)
//   #78 thumb-zone placement rule (primary actions)
//   #80 tap-target audit math (44x44 minimum)
//   #81 keep-result-visible-above-keyboard math
//   #82 pull-to-refresh gating (list pages only)
//   #84 guided wizard "Which calculator do I need?"
//   #85 before-you-calculate checklist per calculator
//   #86 color-coded interpretation scale (range mapping)
//   #87 one-line plain-language result summary
//   #89 estimate/accuracy note (uses existing ConfidenceNotes data)
//   #90 horizontal milestone timeline builder
// Pure logic exported for tests; DOM wiring in decide-ui.js.
// ============================================================
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Decide = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- #78 thumb zone: bottom third of viewport height ----
  function inThumbZone(y, viewportH) {
    return y >= viewportH * (2 / 3);
  }

  // ---- #80 tap-target audit ----
  // Returns list of elements failing the 44x44 minimum (with 2px tolerance).
  function auditTapTargets(elements) {
    var MIN = 44;
    var fail = [];
    for (var i = 0; i < (elements || []).length; i++) {
      var el = elements[i];
      var w = el.width || 0;
      var h = el.height || 0;
      if (w < MIN - 2 || h < MIN - 2) fail.push({ id: el.id || el.tag || 'el', w: w, h: h });
    }
    return fail;
  }

  // ---- #81 keyboard-overlap math ----
  // How far to scroll so the result box stays visible above the keyboard.
  function scrollAboveKeyboard(resultBottomY, keyboardH, viewportH) {
    var visibleBottom = viewportH - keyboardH;
    if (resultBottomY <= visibleBottom - 8) return 0; // already clear
    return Math.round(resultBottomY - visibleBottom + 8);
  }

  // ---- #82 pull-to-refresh gate ----
  function pullToRefreshAllowed(pageKind, scrollY) {
    if (pageKind !== 'category' && pageKind !== 'home' && pageKind !== 'guides') return false;
    return scrollY <= 0;
  }

  // ---- #84 guided wizard: 2-3 question flow over registry data ----
  // Node shape: {q, options:[{label, next|answer}]}
  function recommend(categories, answers) {
    // answers: { task, area, shape } — task: money|health|math|build|convert|date
    var task = answers.task;
    var area = answers.area; // finance: loan/save/plan; health: weight/food/fitness; generic per task
    var MAP = {
      money: {
        loan: 'finance/loan-emi',
        save: 'finance/savings-goal',
        plan: 'finance/retirement',
      },
      health: {
        weight: 'health/bmi',
        food: 'food-nutrition/calories-burned',
        fitness: 'fitness-exercise/one-rep-max',
      },
      math: {
        algebra: 'math/percentage',
        geometry: 'math/triangle-area',
        stats: 'math/mean-median-mode',
      },
      build: {
        material: 'construction/concrete-calculator',
        area: 'construction/paint-coverage',
        cost: 'construction/tile-calculator',
      },
      convert: {
        length: 'conversion/length-converter',
        weight: 'conversion/weight-converter',
        temp: 'conversion/temperature-converter',
      },
      date: {
        age: 'date-time/age-calculator',
        days: 'date-time/date-difference',
        work: 'date-time/business-days',
      },
    };
    var row = MAP[task];
    var slug = row && row[area];
    if (!slug) return null;
    // resolve against the real registry: return the first matching id
    for (var cat in (categories || {})) {
      var tools = categories[cat].tools || [];
      for (var i = 0; i < tools.length; i++) {
        if (cat + '/' + tools[i].id === slug) return { id: tools[i].id, cat: cat, name: tools[i].name };
      }
    }
    return null;
  }

  // ---- #85 before-you-calculate checklist ----
  var CHECKLISTS = {
    finance: [
      'The loan amount or price',
      'The interest rate (annual %)',
      'The term in years or months',
      'Any fees or down payment',
    ],
    health: [
      'Your height and weight (accurate units)',
      'Age and sex where the tool asks',
      'Recent, rested measurements for vital signs',
    ],
    construction: [
      'Measurements in one unit system',
      'Material dimensions or coverage rate',
      'Wastage allowance (usually 5-10%)',
    ],
    default: [
      'The input values the form asks for',
      'Units matching the field labels',
    ],
  };

  function checklist(catKey) {
    return CHECKLISTS[catKey] || CHECKLISTS.default;
  }

  // ---- #86 interpretation scale ----
  // ranges: [{max, label, level}] ascending; value placed on scale.
  // level: good | ok | warn | bad — mapped to accessible label + color token.
  function interpret(ranges, value) {
    if (!ranges || !ranges.length) return null;
    for (var i = 0; i < ranges.length; i++) {
      if (value <= ranges[i].max) {
        return { label: ranges[i].label, level: ranges[i].level, pct: scalePct(ranges, value) };
      }
    }
    var last = ranges[ranges.length - 1];
    return { label: last.label, level: last.level, pct: 100 };
  }

  function scalePct(ranges, value) {
    if (!ranges.length) return 0;
    var lo = ranges[0].base != null ? ranges[0].base : 0;
    var hi = ranges[ranges.length - 1].max;
    // above the last band max => 100% (off-scale high), never negative
    if (value > hi) return 100;
    if (value < lo) return 0;
    if (hi <= lo) return 0;
    return Math.round(((value - lo) / (hi - lo)) * 100);
  }

  // Built-in scales for tools with established public ranges.
  var SCALES = {
    bmi: [
      { base: 0, max: 18.5, label: 'Underweight', level: 'warn' },
      { max: 25, label: 'Healthy weight', level: 'good' },
      { max: 30, label: 'Overweight', level: 'ok' },
      { max: 100, label: 'Obesity range', level: 'warn' },
    ],
    dti: [
      { base: 0, max: 20, label: 'Very comfortable', level: 'good' },
      { max: 36, label: 'Manageable', level: 'ok' },
      { max: 43, label: 'Stretching it', level: 'warn' },
      { max: 100, label: 'High risk', level: 'bad' },
    ],
  };

  // ---- #87 one-line summary builder ----
  function oneLineSummary(toolName, headline, headlineValue) {
    if (!headline) return '';
    return 'In short: ' + headline + ' is ' + headlineValue + '.';
  }

  // ---- #89 estimate note (shared copy, honest wording) ----
  var ESTIMATE_NOTE = 'This is an estimate computed from the values you entered, using standard assumptions. Real-world results can differ when taxes, fees, or conditions not modeled here apply.';

  // ---- #90 milestone timeline ----
  // stages: [{label, date|offsetMonths, note}]
  function buildTimeline(stages, startISO) {
    if (!stages || !stages.length) return [];
    var start = startISO ? new Date(startISO) : new Date();
    return stages.map(function (s, i) {
      var d = s.date ? new Date(s.date) : addMonths(start, s.offsetMonths || 0);
      return {
        label: s.label,
        note: s.note || '',
        iso: isNaN(d) ? null : d.toISOString().slice(0, 10),
        position: Math.round(((i + 1) / stages.length) * 100),
        first: i === 0,
        last: i === stages.length - 1,
      };
    });
  }

  function addMonths(d, n) {
    var out = new Date(d.getTime());
    var day = out.getDate();
    out.setMonth(out.getMonth() + n);
    if (out.getDate() < day) out.setDate(0); // clamp month overflow (Jan 31 + 1mo)
    return out;
  }

  return {
    inThumbZone: inThumbZone,
    auditTapTargets: auditTapTargets,
    scrollAboveKeyboard: scrollAboveKeyboard,
    pullToRefreshAllowed: pullToRefreshAllowed,
    recommend: recommend,
    checklist: checklist,
    interpret: interpret,
    SCALES: SCALES,
    oneLineSummary: oneLineSummary,
    ESTIMATE_NOTE: ESTIMATE_NOTE,
    buildTimeline: buildTimeline,
  };
});
