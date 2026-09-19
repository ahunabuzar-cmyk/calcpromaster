// ====== CalcProMaster Lazy Data Loader ======
// Splits the 20 tool-suite data files into:
//   - EAGER (4 popular categories): <script defer> in index.html — loaded with the shell.
//     On PRERENDERED TOOL PAGES the build keeps only the page's OWN category tag and
//     drops the other three (plus their preloads), so a tool page boots ~55% lighter.
//     Dropped eager categories are re-fetched on demand via ensure() below — identical
//     contract to the LAZY set.
//   - LAZY (16 remaining categories): fetched ON-DEMAND the first time the user opens a
//     category page, tool page, or hub for that category — then cached in memory.
// Result: first paint downloads ~55% fewer data bytes (gzip) + 13 fewer requests.
//
// Safety guarantees:
//   - ensure(catKey) is idempotent and returns a Promise (resolves true if already loaded).
//   - A failed/404 load resolves with `false` — callers fall back to their existing
//     "not found" path (404 page) instead of crashing. CALC_DATA entry stays empty.
//   - No eval()/Function() — plain script-tag injection, CSP-safe.
//   - window.DataLoader.isLazy(catKey) lets router/render code guard BEFORE reading tools.
window.DataLoader = (function () {
  // catKey -> data filename (without .js) + global const name the file declares
  var LAZY = {
    construction: { file: 'construction', constName: 'CONSTRUCTION_TOOLS' },
    business:     { file: 'business',     constName: 'BUSINESS_TOOLS' },
    education:    { file: 'education',    constName: 'EDUCATION_TOOLS' },
    utilities:    { file: 'utilities',    constName: 'UTILITY_TOOLS' },
    lifestyle:    { file: 'lifestyle',    constName: 'LIFESTYLE_TOOLS' },
    regional:     { file: 'regional',     constName: 'REGIONAL_TOOLS' },
    food:         { file: 'food-nutrition', constName: 'FOOD_NUTRITION_TOOLS' },
    fitness:      { file: 'fitness-exercise', constName: 'FITNESS_TOOLS' },
    auto:         { file: 'auto-transport', constName: 'AUTO_TRANSPORT_TOOLS' },
    career:       { file: 'career-freelance', constName: 'CAREER_TOOLS' },
    homegarden:   { file: 'home-garden',  constName: 'HOME_GARDEN_TOOLS' },
    tech:         { file: 'tech-digital', constName: 'TECH_TOOLS' },
    family:       { file: 'parenting-family', constName: 'FAMILY_TOOLS' },
    science:      { file: 'science',      constName: 'SCIENCE_TOOLS' },
    engineering:  { file: 'engineering',  constName: 'ENGINEERING_TOOLS' },
    conversion:   { file: 'conversion',   constName: 'CONVERSION_TOOLS' }
  };
  // Eager categories: normally shipped as <script defer> in the shell. On prerendered
  // tool pages the build keeps only the page's own category tag; the others listed here
  // can be re-fetched at idle or on navigation through the same load() path as LAZY.
  // (The data files expose window.<CONST> so injected execution can be picked up.)
  var EAGER = {
    finance:  { file: 'finance',  constName: 'FINANCE_TOOLS' },
    health:   { file: 'health',   constName: 'HEALTH_TOOLS' },
    math:     { file: 'math',     constName: 'MATH_TOOLS' },
    everyday: { file: 'everyday', constName: 'EVERYDAY_TOOLS' }
  };
  var loading = {};   // catKey -> Promise
  var loaded = {};    // catKey -> true
  var failed = {};    // catKey -> true

  function specFor(catKey) { return LAZY[catKey] || EAGER[catKey]; }
  function isLazy(catKey) { return !!specFor(catKey); }
  function isEager(catKey) { return !!EAGER[catKey]; }

  // True when the category's tools are already usable in CALC_DATA — either because
  // the shell's <script defer> executed at boot, or a previous ensure() injected it.
  function isLoaded(catKey) {
    if (loaded[catKey]) return true;
    try {
      var cat = window.CALC_DATA && window.CALC_DATA[catKey];
      return !!(cat && Array.isArray(cat.tools) && cat.tools.length > 0);
    } catch (e) { return false; }
  }

  // Inject the category data script, then hydrate CALC_DATA + ALL_TOOLS + TOOL_MAP.
  function load(catKey) {
    var spec = specFor(catKey);
    if (!spec) return Promise.resolve(false);
    if (isLoaded(catKey)) { loaded[catKey] = true; return Promise.resolve(true); }
    if (loading[catKey]) return loading[catKey];
    if (failed[catKey]) return Promise.resolve(false);

    loading[catKey] = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/data/' + spec.file + '.js';
      s.onload = function () {
        try {
          var arr = window[spec.constName];
          if (!Array.isArray(arr)) {
            // Script executed but the expected global is missing (e.g. const-declared
            // data without a window assignment) — treat as a failed load so the
            // router falls back to 404 instead of silently rendering an empty page.
            failed[catKey] = true;
            loading[catKey] = null;
            resolve(false);
            return;
          }
          if (window.CALC_DATA && window.CALC_DATA[catKey]) {
            window.CALC_DATA[catKey].tools = arr;
            // Rebuild flattened lookup so search / TOOL_MAP / counts see the tools.
            if (typeof window.refreshCalcData === 'function') window.refreshCalcData();
          }
          loaded[catKey] = true;
          resolve(true);
        } catch (e) {
          failed[catKey] = true;
          resolve(false);
        }
      };
      s.onerror = function () {
        failed[catKey] = true;
        loading[catKey] = null;
        resolve(false);
      };
      document.body.appendChild(s);
    });
    return loading[catKey];
  }

  function ensure(catKey) {
    if (!specFor(catKey)) return Promise.resolve(true); // non-data route
    return load(catKey);
  }

  // Warm every category in the background (used on first user interaction).
  function loadAll() {
    var keys = Object.keys(LAZY).concat(Object.keys(EAGER));
    return Promise.all(keys.map(function (k) { return load(k).catch(function () { return false; }); }));
  }

  function loadAllIdle() {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(function () { loadAll(); }, { timeout: 3000 });
    } else {
      setTimeout(loadAll, 1200);
    }
  }

  return { isLazy: isLazy, isEager: isEager, isLoaded: isLoaded, ensure: ensure, loadAll: loadAll, loadAllIdle: loadAllIdle };
})();
