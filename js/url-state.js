// ====== URLStateManager (Pillar 1: Stateful URLs) ======
// On calculate: serialize tool inputs into the URL query string via History API
// (replaceState — no history spam, shareable, back/forward-safe).
// On tool load: if query params exist, auto-fill the inputs and auto-calculate.
const URLStateManager = (function () {
  var PARAM_PREFIX = ''; // all input ids are used verbatim as query keys

  // Serialize current input values into a query object { inputId: value }
  function serializeValues(tool, values) {
    var params = {};
    if (!tool || !tool.inputs) return params;
    tool.inputs.forEach(function (inp) {
      var v = values[inp.id];
      if (v === undefined || v === null || v === '') return;
      if (inp.type === 'checkbox') params[inp.id] = v ? 'true' : 'false';
      else params[inp.id] = String(v);
    });
    return params;
  }

  // Push input values to the URL (replaceState so back-button isn't flooded)
  function pushState(tool, values) {
    if (!tool) return;
    try {
      var params = serializeValues(tool, values);
      var qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
      var base = window.location.pathname;
      if (qs !== window.location.search) {
        history.replaceState(null, '', base + qs);
      }
    } catch (e) { /* URL writing is best-effort */ }
  }

  // Read query params; return { toolId, values } if present
  function readState() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (!params.toString()) return null;
      var values = {};
      params.forEach(function (v, k) { values[k] = v; });
      return { values: values };
    } catch (e) { return null; }
  }

  // Auto-fill tool inputs from query params. Returns true if any applied.
  function restore(tool) {
    var state = readState();
    if (!state) return false;
    var applied = false;
    (tool.inputs || []).forEach(function (inp) {
      var raw = state.values[inp.id];
      if (raw === undefined || raw === null) return;
      var el = document.getElementById(inp.id);
      if (!el) return;
      if (inp.type === 'checkbox') el.checked = (raw === 'true');
      else if (inp.type === 'number') el.value = String(parseFloat(raw) || 0);
      else el.value = raw;
      applied = true;
    });
    return applied;
  }

  // NOTE: pushState() already clears the query string when all params are empty
  // (base + '' = pathname), so a separate clear helper would be redundant.

  return {
    pushState: pushState,
    restore: restore,
    readState: readState,
    serializeValues: serializeValues
  };
})();

if (typeof window !== 'undefined') window.URLStateManager = URLStateManager;
if (typeof module !== 'undefined' && module.exports) module.exports = { URLStateManager };
