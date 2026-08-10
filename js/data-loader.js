// ====== CalcProMaster Lazy Data Loader ======
// Splits the 20 tool-suite data files into:
//   - EAGER (7 popular categories): <script defer> in index.html — loaded with the shell
//   - LAZY (13 niche categories): fetched ON-DEMAND the first time the user opens a
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
    family:       { file: 'parenting-family', constName: 'FAMILY_TOOLS' }
  };
  var loading = {};   // catKey -> Promise
  var loaded = {};    // catKey -> true
  var failed = {};    // catKey -> true

  function isLazy(catKey) { return !!LAZY[catKey]; }
  function isLoaded(catKey) { return !!loaded[catKey]; }

  // Inject the category data script, then hydrate CALC_DATA + ALL_TOOLS + TOOL_MAP.
  function load(catKey) {
    var spec = LAZY[catKey];
    if (!spec) return Promise.resolve(false);
    if (loaded[catKey]) return Promise.resolve(true);
    if (loading[catKey]) return loading[catKey];
    if (failed[catKey]) return Promise.resolve(false);

    loading[catKey] = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/data/' + spec.file + '.js';
      s.onload = function () {
        try {
          var arr = window[spec.constName];
          if (Array.isArray(arr) && window.CALC_DATA && window.CALC_DATA[catKey]) {
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
    if (!LAZY[catKey]) return Promise.resolve(true); // eager categories always ready
    return load(catKey);
  }

  // Warm every lazy category in the background (used on home via requestIdleCallback).
  function loadAll() {
    var keys = Object.keys(LAZY);
    return Promise.all(keys.map(function (k) { return load(k).catch(function () { return false; }); }));
  }

  function loadAllIdle() {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(function () { loadAll(); }, { timeout: 3000 });
    } else {
      setTimeout(loadAll, 2000);
    }
  }

  return { isLazy: isLazy, isLoaded: isLoaded, ensure: ensure, loadAll: loadAll, loadAllIdle: loadAllIdle };
})();
