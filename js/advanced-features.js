// Advanced features framework - live calc, scenarios, chaining, presets, pin/compare, batch, voice, share links, step-by-step, favorites, smart suggestions
const AdvancedFeatures = (function () {
  const FAV_KEY = 'calcpro_favorites';
  const PIN_KEY = 'calcpro_pinned';
  const CHAIN_KEY = 'calcpro_chain';
  const PRESET_KEY = 'calcpro_presets';
  const SHARE_KEY = 'calcpro_shared';

  // ---------- Favorites ----------
  function getFavorites() { return Security.safeGetItem(FAV_KEY, []); }
  // Purge stored favorites/pins/chain/scenarios/presets whose tool id was
  // merged or removed (SEO dedupe). Runs once at boot — never touches data
  // that still exists. Returns total entries removed across all stores.
  function purgeRemovedToolIds(ids) {
    const set = ids instanceof Set ? ids : new Set(ids || []);
    if (!set.size) return 0;
    let removed = 0;
    [FAV_KEY, PIN_KEY, CHAIN_KEY, SHARE_KEY].forEach(function (key) {
      try {
        const arr = Security.safeGetItem(key, []);
        if (!Array.isArray(arr) || !arr.length) return;
        const kept = arr.filter(function (x) {
          return !(x && x.id && set.has(x.id));
        });
        if (kept.length !== arr.length) {
          localStorage.setItem(key, JSON.stringify(kept));
          removed += arr.length - kept.length;
        }
      } catch (e) { /* non-fatal */ }
    });
    // Comparison scenarios are persisted with a toolId field — purge stale ones
    try {
      const scen = JSON.parse(localStorage.getItem('calcpro_comparison_scenarios') || '[]');
      if (Array.isArray(scen) && scen.length) {
        const kept = scen.filter(function (s) { return !(s && s.toolId && set.has(s.toolId)); });
        if (kept.length !== scen.length) {
          localStorage.setItem('calcpro_comparison_scenarios', JSON.stringify(kept));
          removed += scen.length - kept.length;
        }
      }
    } catch (e) { /* non-fatal */ }
    // Presets are stored as { toolId: [ {name, values, ts} ] } — drop whole keys
    try {
      const all = JSON.parse(localStorage.getItem(PRESET_KEY) || '{}');
      const keys = Object.keys(all);
      const keptKeys = keys.filter(function (k) { return !set.has(k); });
      if (keptKeys.length !== keys.length) {
        const keptObj = {};
        keptKeys.forEach(function (k) { keptObj[k] = all[k]; });
        localStorage.setItem(PRESET_KEY, JSON.stringify(keptObj));
        removed += keys.length - keptKeys.length;
      }
    } catch (e) { /* non-fatal */ }
    return removed;
  }
  function toggleFavorite(toolId, toolName, catKey) {
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.id === toolId);
    if (idx >= 0) favs.splice(idx, 1); else favs.unshift({ id: toolId, name: toolName, cat: catKey, ts: Date.now() });
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    return idx < 0;
  }
  function isFavorite(toolId) { return getFavorites().some(f => f.id === toolId); }
  function renderFavoritesBar() {
    const bar = document.getElementById('favorites-bar');
    if (!bar) return;
    const favs = getFavorites();
    if (favs.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    // XSS-hardening: favorites come from localStorage — escape both onclick args and text
    bar.innerHTML = '<span class="fav-label">★ Favorites:</span>' + favs.slice(0, 8).map(f =>
      `<button class="fav-chip" onclick="App.navigateToTool('${Security.sanitizeJsString(f.id)}', '${Security.sanitizeJsString(f.cat)}')">${Security.sanitizeHtml(f.name)}</button>`
    ).join('');
  }

  // ---------- Pin & Compare ----------
  function getPinned() { return Security.safeGetItem(PIN_KEY, []); }
  function pinResult(toolId, toolName, result, values) {
    const pinned = getPinned();
    pinned.unshift({ id: toolId, name: toolName, result: result.result, extra: result.extra, values, ts: Date.now() });
    if (pinned.length > 4) pinned.length = 4;
    localStorage.setItem(PIN_KEY, JSON.stringify(pinned));
    renderPinBar();
  }
  function unpinResult(idx) {
    const pinned = getPinned();
    pinned.splice(idx, 1);
    localStorage.setItem(PIN_KEY, JSON.stringify(pinned));
    renderPinBar();
  }
  function clearPinned() { localStorage.removeItem(PIN_KEY); renderPinBar(); }
  function renderPinBar() {
    const bar = document.getElementById('pin-bar');
    if (!bar) return;
    const pinned = getPinned();
    if (pinned.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    // XSS-hardening: pinned results are user-stored strings — escape before innerHTML
    bar.innerHTML = '<span class="pin-label">📌 Pinned:</span>' + pinned.map((p, i) =>
      `<div class="pin-chip"><span class="pin-name">${Security.sanitizeHtml(p.name)}</span><span class="pin-result">${Security.sanitizeHtml(String(p.result == null ? '' : p.result).substring(0, 40))}</span><button class="pin-close" onclick="AdvancedFeatures.unpinResult(${i})">×</button></div>`
    ).join('') + '<button class="pin-compare-btn" onclick="AdvancedFeatures.openCompare()">Compare</button><button class="pin-clear" onclick="AdvancedFeatures.clearPinned()">Clear</button>';
  }
  function openCompare() {
    const pinned = getPinned();
    if (pinned.length < 2) { App.showToast('Pin at least 2 results to compare'); return; }
    const modal = document.getElementById('compare-modal');
    const content = document.getElementById('compare-content');
    let html = '<table class="compare-table"><thead><tr><th>Calculator</th><th>Result</th><th>Details</th><th>Time</th></tr></thead><tbody>';
    pinned.forEach(p => {
      // XSS-hardening: pinned results are user-stored strings — escape before innerHTML
      html += `<tr><td>${Security.sanitizeHtml(p.name)}</td><td class="cmp-result">${Security.sanitizeHtml(String(p.result == null ? '' : p.result).substring(0, 60))}</td><td>${Security.sanitizeHtml(String(p.extra == null ? '' : p.extra).substring(0, 60))}</td><td>${new Date(p.ts).toLocaleTimeString()}</td></tr>`;
    });
    html += '</tbody></table>';
    content.innerHTML = html;
    modal.classList.add('active');
  }
  function closeCompare() { document.getElementById('compare-modal').classList.remove('active'); }

// ---------- Result Chaining ----------
function getChain() { return Security.safeGetItem(CHAIN_KEY, []); }
function addToChain(toolId, toolName, result, values) {
  const chain = getChain();
  chain.unshift({ id: toolId, name: toolName, result: result.result, values, ts: Date.now() });
  if (chain.length > 10) chain.length = 10;
  localStorage.setItem(CHAIN_KEY, JSON.stringify(chain));
}
function getChainValue(idx) {
  const chain = getChain();
  if (idx >= 0 && idx < chain.length) return chain[idx].result;
  return null;
}
function renderChainBar() {
  const bar = document.getElementById('chain-bar');
  if (!bar) return;
  const chain = getChain();
  if (chain.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  // XSS-hardening: chain entries carry calc results (can echo user input) — escape text + title attr
  bar.innerHTML = '<span class="chain-label">🔗 Recent Results (click to reuse):</span>' + chain.slice(0, 5).map((c, i) =>
    `<button class="chain-chip" onclick="AdvancedFeatures.useChainValue(${i})" title="${Security.sanitizeHtml(c.name)}: ${Security.sanitizeHtml(String(c.result == null ? '' : c.result))}">${Security.sanitizeHtml(c.name)}: ${Security.sanitizeHtml(String(c.result == null ? '' : c.result).substring(0, 30))}</button>`
  ).join('');
}
function useChainValue(idx) {
  const chain = getChain();
  const item = chain[idx];
  if (!item) return;
  const firstNumInput = document.querySelector('.calc-form input[type="number"]');
  if (firstNumInput) {
    const numMatch = String(item.result).match(/-?\d+\.?\d*/);
    if (numMatch) { firstNumInput.value = parseFloat(numMatch[0]); firstNumInput.dispatchEvent(new Event('input')); App.showToast('Value inserted: ' + numMatch[0]); }
  }
}

// ---------- Scenario Comparison Mode ----------
function getComparisonScenarios() { return Security.safeGetItem('calcpro_comparison_scenarios', []); }
function saveComparisonScenario(toolId, toolName, values, result) {
  const scenarios = getComparisonScenarios();
  scenarios.unshift({ toolId, toolName, values, result, ts: Date.now() });
  if (scenarios.length > 5) scenarios.length = 5;
  localStorage.setItem('calcpro_comparison_scenarios', JSON.stringify(scenarios));
}
function clearComparisonScenarios() { localStorage.removeItem('calcpro_comparison_scenarios'); }
function runComparison(tool, scenarios) {
  if (!tool || !scenarios.length) return { results: [], chart: '' };
  
  const results = scenarios.map((scenario, index) => {
    try {
      const out = tool.calc(scenario.values);
      return {
        index,
        label: scenario.name || `Scenario ${index + 1}`,
        values: scenario.values,
        result: out.result,
        extra: out.extra || '',
        chart: out.chart || '',
        success: true
      };
    } catch(e) {
      return {
        index,
        label: scenario.name || `Scenario ${index + 1}`,
        values: scenario.values,
        result: 'Error',
        extra: e.message,
        chart: '',
        success: false
      };
    }
  });
  
  // Generate comparison chart if we have numeric results
  let chart = '';
  const numericResults = results
    .filter(r => r.success && typeof r.result === 'number' || (typeof r.result === 'string' && !isNaN(parseFloat(r.result))))
    .map(r => {
      const num = typeof r.result === 'number' ? r.result : parseFloat(r.result);
      return num;
    });
  
  if (numericResults.length >= 2) {
    chart = Charts.bar(numericResults, results.filter(r => r.success).map(r => r.label));
  }

  return { results, chart };
}
function renderComparisonBar() {
  const bar = document.getElementById('comparison-bar');
  if (!bar) return;
  const scenarios = getComparisonScenarios();
  if (scenarios.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  // XSS-hardening: scenario names are user-stored strings — escape before innerHTML
  bar.innerHTML = '<span class="comp-label">📊 Comparison Scenarios:</span>' + scenarios.map((s, i) =>
    `<button class="comp-chip" onclick="AdvancedFeatures.loadComparisonScenario(${i})">${Security.sanitizeHtml(s.name || 'Scenario ' + (i+1))}</button>`
  ).join('') + '<button class="comp-clear" onclick="AdvancedFeatures.clearComparisonScenarios()">Clear</button><button class="comp-run" onclick="AdvancedFeatures.runComparisonMode()">Compare</button>';
}
function loadComparisonScenario(idx) {
  const scenarios = getComparisonScenarios();
  const s = scenarios[idx];
  if (!s) return;
  
  // Find the tool
  const tool = TOOL_MAP[s.toolId];
  if (!tool) { App.showToast('Tool not found'); return; }
  
  // Load values into form
  Object.entries(s.values).forEach(([k, v]) => {
    const el = document.getElementById(k);
    if (el) {
      if (el.type === 'checkbox') el.checked = v;
      else el.value = v;
      el.dispatchEvent(new Event('input'));
    }
  });
  
  App.showToast('Scenario loaded: ' + (s.name || `Scenario ${idx+1}`));
}
function runComparisonMode() {
  const scenarios = getComparisonScenarios();
  if (scenarios.length < 2) { App.showToast('Need at least 2 scenarios to compare'); return; }
  
  // Get the tool from the first scenario
  const tool = TOOL_MAP[scenarios[0].toolId];
  if (!tool) { App.showToast('Tool not found'); return; }
  
  // Run comparison
  const comparisonResult = runComparison(tool, scenarios);
  
  // Display results
  const modal = document.getElementById('compare-modal');
  const content = document.getElementById('compare-content');
  
  let html = `<h3>Comparison Results for ${tool.name}</h3>`;
  
  if (comparisonResult.chart) {
    html += `<div class="chart-area">${comparisonResult.chart}</div>`;
  }
  
  html += '<div class="comparison-results"><table class="compare-table"><thead><tr><th>Scenario</th><th>Inputs</th><th>Result</th><th>Details</th></tr></thead><tbody>';
  
  comparisonResult.results.forEach((result, index) => {
    const inputsStr = Object.entries(result.values)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
      
    html += `<tr>
      <td>${result.label}</td>
      <td>${inputsStr}</td>
      <td class="${result.success ? 'cmp-result' : 'error'}">${result.success ? result.result : 'Error: ' + result.extra}</td>
      <td>${result.success ? (result.extra || 'N/A') : 'Calculation failed'}</td>
    </tr>`;
  });
  
  html += '</tbody></table></div>';

  if (content) {
    content.innerHTML = html;
    modal.classList.add('active');
  }
}

  // ---------- Scenarios ----------
  let scenarios = [];
  function saveScenario(toolId, name, values, result) {
    scenarios.push({ toolId, name, values, result, ts: Date.now() });
    if (scenarios.length > 5) scenarios.shift();
  }
  function getScenarios() { return scenarios; }
  function clearScenarios() { scenarios = []; }
  function renderScenarioBar(tool) {
    const bar = document.getElementById('scenario-bar');
    if (!bar) return;
    if (scenarios.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = '<span class="scen-label">Scenarios:</span>' + scenarios.map((s, i) =>
      `<button class="scen-chip" onclick="AdvancedFeatures.loadScenario(${i})">${s.name}</button>`
    ).join('') + '<button class="scen-clear" onclick="AdvancedFeatures.clearScenarios()">Clear</button>';
  }
  function loadScenario(idx) {
    const s = scenarios[idx];
    if (!s) return;
    Object.entries(s.values).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if (el) {
        if (el.type === 'checkbox') el.checked = v;
        else el.value = v;
        el.dispatchEvent(new Event('input'));
      }
    });
    App.showToast('Scenario loaded: ' + s.name);
  }

  // ---------- Presets ----------
  function getPresets(toolId) {
    const all = JSON.parse(localStorage.getItem(PRESET_KEY) || '{}');
    return all[toolId] || [];
  }
  function savePreset(toolId, name, values) {
    const all = JSON.parse(localStorage.getItem(PRESET_KEY) || '{}');
    if (!all[toolId]) all[toolId] = [];
    all[toolId].push({ name, values, ts: Date.now() });
    localStorage.setItem(PRESET_KEY, JSON.stringify(all));
  }
  function deletePreset(toolId, idx) {
    const all = JSON.parse(localStorage.getItem(PRESET_KEY) || '{}');
    if (all[toolId]) { all[toolId].splice(idx, 1); localStorage.setItem(PRESET_KEY, JSON.stringify(all)); }
    renderPresetDropdown(toolId);
  }
  function renderPresetDropdown(toolId) {
    const dd = document.getElementById('preset-dropdown');
    if (!dd) return;
    const presets = getPresets(toolId);
    if (presets.length === 0) { dd.innerHTML = '<option value="">No saved presets</option>'; return; }
    // XSS-hardening: preset names are user-entered (prompt) + stored in localStorage — escape
    dd.innerHTML = '<option value="">Load preset...</option>' + presets.map((p, i) =>
      `<option value="${i}">${Security.sanitizeHtml(p.name)}</option>`
    ).join('');
  }
  function loadPreset(toolId, idx) {
    const presets = getPresets(toolId);
    const p = presets[idx];
    if (!p) return;
    Object.entries(p.values).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input')); }
    });
    App.showToast('Preset loaded: ' + p.name);
  }

  // ---------- Batch Mode ----------
  let batchMode = false;
  function toggleBatch() {
    batchMode = !batchMode;
    const area = document.getElementById('batch-area');
    const btn = document.getElementById('batch-toggle-btn');
    if (!area || !btn) return;
    if (batchMode) {
      btn.textContent = 'Exit Batch Mode';
      btn.classList.add('active');
      area.style.display = 'block';
      area.innerHTML = renderBatchUI();
    } else {
      btn.textContent = 'Batch Mode';
      btn.classList.remove('active');
      area.style.display = 'none';
    }
  }
  function renderBatchUI() {
    return `<div class="batch-ui">
      <p>Enter multiple values for the first input (one per line). Results will be calculated for each.</p>
      <textarea id="batch-input" rows="6" placeholder="100000\n200000\n300000"></textarea>
      <button onclick="AdvancedFeatures.runBatch()" class="calc-btn">Run Batch</button>
      <div id="batch-results"></div>
    </div>`;
  }
  function runBatch() {
    const input = document.getElementById('batch-input');
    if (!input || !input.value.trim()) return;
    const values = input.value.trim().split('\n').map(Number);
    const firstInput = document.querySelector('.calc-form input[type="number"]');
    if (!firstInput) { App.showToast('No numeric input found'); return; }
    const firstId = firstInput.id;
    let resultsHtml = '<table class="batch-table"><thead><tr><th>Input</th><th>Result</th></tr></thead><tbody>';
    // INP optimization: batch processing via microtask queue
    let index = 0;
    function processNext() {
      const startTime = performance.now();
      while (index < values.length && performance.now() - startTime < 5) {
        firstInput.value = values[index];
        if (App._currentTool && App._currentTool.tool.calc) {
          try {
            const allVals = App._collectValues();
            allVals[firstId] = values[index];
            const r = App._currentTool.tool.calc(allVals);
            // XSS-hardening: batch input values are raw user strings — escape
            resultsHtml += `<tr><td>${Security.sanitizeHtml(values[index])}</td><td>${Security.sanitizeHtml(String(r.result == null ? '' : r.result).substring(0, 60))}</td></tr>`;
          } catch(e) { resultsHtml += `<tr><td>${Security.sanitizeHtml(values[index])}</td><td class="error">Error</td></tr>`; }
        }
        index++;
      }
      if (index < values.length) {
        // Yield to browser for rendering, continue via microtask
        requestAnimationFrame(function() { setTimeout(processNext, 0); });
      } else {
        document.getElementById('batch-results').innerHTML = resultsHtml;
        App.showToast('Batch complete: ' + values.length + ' calculations');
      }
    }
    processNext();
  }

  // ---------- Voice Input ----------
  let recognition = null;
  function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    return true;
  }
  function startVoice(targetInputId) {
    if (!recognition && !initVoice()) { App.showToast('Voice input not supported'); return; }
    const input = document.getElementById(targetInputId);
    if (!input) return;
    recognition.onresult = function(e) {
      const transcript = e.results[0][0].transcript;
      const numMatch = transcript.match(/-?\d+\.?\d*/);
      if (numMatch) { input.value = numMatch[0]; input.dispatchEvent(new Event('input')); App.showToast('Voice: ' + numMatch[0]); }
      else App.showToast('No number detected in: ' + transcript);
    };
    recognition.onerror = function(e) { App.showToast('Voice error: ' + e.error); };
    recognition.start();
    App.showToast('Listening...');
  }

  // ---------- Shareable Links ----------
  function generateShareLink(tool, values) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => params.set(k, String(v)));
    const base = window.location.origin + window.location.pathname;
    return base + '?' + params.toString();
  }
  function loadFromUrl(tool) {
    const params = new URLSearchParams(window.location.search);
    if (params.toString() === '') return false;
    let applied = false;
    tool.inputs.forEach(inp => {
      const val = params.get(inp.id);
      if (val !== null) {
        const el = document.getElementById(inp.id);
        if (el) {
          if (inp.type === 'checkbox') el.checked = val === 'true';
          else if (inp.type === 'number') el.value = val;
          else el.value = val;
          applied = true;
        }
      }
    });
    return applied;
  }

  // ---------- Step-by-Step ----------
  function renderSteps(tool, values, result) {
    const area = document.getElementById('steps-area');
    if (!area) return;
    if (!tool.steps) { area.style.display = 'none'; return; }
    area.style.display = 'block';
    const steps = typeof tool.steps === 'function' ? tool.steps(values, result) : tool.steps;
    let html = '<details class="calc-collapsible steps-card" open><summary>📐 Formula & Step-by-Step Solution</summary><ol class="steps-list">';
    // XSS-hardening: step strings can echo user input values — escape each step
    // NaN guard: division-by-zero leaks "NaN" into step text; never show raw broken math.
    steps.forEach(s => {
      let stepStr = String(s == null ? '' : s);
      if (/\bNaN\b|\bundefined\b/i.test(stepStr)) {
        stepStr = stepStr.replace(/\bNaN\b|\bundefined\b/gi, '—');
      }
      html += `<li>${Security.sanitizeHtml(stepStr)}</li>`;
    });
    html += '</ol></details>';
    area.innerHTML = html;
  }

   // ---------- Smart Suggestions ----------
   function getSmartSuggestions(catKey, cat, currentTool) {
     const suggestions = [];
     if (currentTool.id === 'loan-emi') suggestions.push({ id: 'mortgage', name: 'Mortgage Calculator', reason: 'Planning a home purchase?' });
     if (currentTool.id === 'bmi') suggestions.push({ id: 'bmr', name: 'BMR Calculator', reason: 'Calculate your calorie burn' });
     if (currentTool.id === 'compound-interest') suggestions.push({ id: 'loan-emi', name: 'Loan EMI', reason: 'Compare investment vs loan' });
     if (currentTool.id === 'mortgage') suggestions.push({ id: 'home-afford', name: 'Home Affordability', reason: 'How much can you afford?' });
     if (currentTool.id === 'calorie') suggestions.push({ id: 'macros', name: 'Macro Calculator', reason: 'Plan your nutrition split' });
     if (currentTool.id === 'percentage') suggestions.push({ id: 'percent-change', name: 'Percentage Change', reason: 'Calculate increase/decrease' });
     if (currentTool.id === 'quadratic') suggestions.push({ id: 'scientific', name: 'Scientific Calculator', reason: 'More advanced math' });
     const filtered = suggestions.filter(s => s.id !== currentTool.id && cat.tools.some(t => t.id === s.id));
     if (filtered.length < 3) {
       cat.tools.filter(t => t.id !== currentTool.id).slice(0, 3 - filtered.length).forEach(t =>
         filtered.push({ id: t.id, name: t.name, reason: 'Related calculator' }));
     }
     return filtered.slice(0, 4);
   }

   // ---------- Scenario Comparison Mode ----------
   let comparisonScenarios = [];
   const COMPARISON_KEY = 'calcpro_comparison_scenarios';

   function loadComparisonScenarios() {
     comparisonScenarios = Security.safeGetItem(COMPARISON_KEY, []);
   }

   function saveComparisonScenarios() {
     localStorage.setItem(COMPARISON_KEY, JSON.stringify(comparisonScenarios));
   }

   function getComparisonScenarios() {
     loadComparisonScenarios();
     return comparisonScenarios;
   }

   function saveComparisonScenario(toolId, toolName, values, result) {
     loadComparisonScenarios();
     comparisonScenarios.push({ toolId, toolName, values, result, ts: Date.now() });
     if (comparisonScenarios.length > 3) comparisonScenarios.shift(); // Keep only last 3
     saveComparisonScenarios();
   }

   function clearComparisonScenarios() {
     comparisonScenarios = [];
     saveComparisonScenarios();
     renderComparisonBar();
   }

   function renderComparisonBar() {
     const bar = document.getElementById('comparison-bar');
     if (!bar) return;
     loadComparisonScenarios();
     if (comparisonScenarios.length === 0) { bar.style.display = 'none'; return; }
     bar.style.display = 'flex';
     // XSS-hardening: scenario toolNames are user-stored strings — escape before innerHTML
     bar.innerHTML = '<span class="comp-label">Comparison Scenarios:</span>' + comparisonScenarios.map((s, i) =>
       `<button class="comp-chip" onclick="AdvancedFeatures.loadComparisonScenario(${i})">${Security.sanitizeHtml(s.toolName)}</button>`
     ).join('') + '<button class="comp-clear" onclick="AdvancedFeatures.clearComparisonScenarios()">Clear</button>';
   }

   function loadComparisonScenario(idx) {
     loadComparisonScenarios();
     const scenario = comparisonScenarios[idx];
     if (!scenario) return;
     
     // Find the tool
     let tool = null;
     for (const [key, cat] of Object.entries(CALC_DATA)) {
       const found = cat.tools.find(t => t.id === scenario.toolId);
       if (found) { tool = found; break; }
     }
     
     if (!tool) return;
     
     // Load values
     Object.entries(scenario.values).forEach(([k, v]) => {
       const el = document.getElementById(k);
       if (el) {
         if (el.type === 'checkbox') el.checked = v;
         else el.value = v;
         el.dispatchEvent(new Event('input'));
       }
     });
     
     App.showToast('Scenario loaded: ' + scenario.toolName);
     // Auto-calculate if enabled
     if (document.getElementById('auto-calc-toggle') && document.getElementById('auto-calc-toggle').checked) {
       App.executeCalc({ preventDefault: () => {} });
     }
   }

   function runComparisonMode() {
     loadComparisonScenarios();
     if (comparisonScenarios.length < 2) {
       App.showToast('Need at least 2 scenarios to compare');
       return;
     }
     
     // Get the first scenario's tool to use for comparison
     let tool = null;
     let catKey = null;
     for (const [key, cat] of Object.entries(CALC_DATA)) {
       const found = cat.tools.find(t => t.id === comparisonScenarios[0].toolId);
       if (found) { tool = found; catKey = key; break; }
     }
     
     if (!tool) {
       App.showToast('Could not find tool for comparison');
       return;
     }
     
     // Run calculations for all scenarios
     const results = [];
     comparisonScenarios.forEach((scenario, index) => {
       try {
         const allVals = {};
         Object.entries(scenario.values).forEach(([k, v]) => {
           allVals[k] = v;
         });
         const r = tool.calc(allVals);
         results.push({ ...scenario, result: r });
       } catch(e) {
         results.push({ ...scenario, error: e.message });
       }
     });
     
     // Show comparison modal
     const modal = document.getElementById('compare-modal');
     const content = document.getElementById('compare-content');
     if (!modal || !content) return;
     
     let html = '<div class="comparison-results">';
     html += '<h3>Scenario Comparison: ' + tool.name + '</h3>';
     html += '<div class="comparison-table">';
     
     results.forEach((result, index) => {
       html += `<div class="comparison-scenario">`;
       html += `<h4>Scenario ${index + 1}: ${Security.sanitizeHtml(result.toolName)}</h4>`;
       if (result.error) {
         html += `<p class="error">Error: ${Security.sanitizeHtml(result.error)}</p>`;
       } else {
         html += `<div class="result-main">${Security.sanitizeHtml(result.result.result || '')}</div>`;
         if (result.result.extra) {
           html += `<div class="result-extra">${Security.sanitizeHtml(result.result.extra)}</div>`;
         }
         if (result.result.chart) {
           html += `<div class="chart-area">${result.result.chart}</div>`;
         }
       }
       html += `</div>`;
     });
     
     html += '</div>';
     
     // MASTER OVERLAY CHART: all scenarios on one SVG (multi-series comparison)
     const okResults = results.filter(r => !r.error);
     if (typeof Charts.overlay === 'function' && okResults.length >= 2) {
       const numInputs = (tool.inputs || []).filter(i => i.type === 'number');
       if (numInputs.length >= 2) {
         // Keep ORIGINAL scenario numbers so overlay labels match the detail charts below
         const series = okResults.map((r) => ({
           name: 'Scenario ' + (results.indexOf(r) + 1),
           data: numInputs.map(inp => Number(r.values[inp.id]) || 0)
         }));
         const labels = numInputs.map(i => i.label);
         html += `<div class="chart-comparison"><h4>📈 Master Comparison Chart</h4><div class="chart-area">${Charts.overlay(series, labels, { title: tool.name + ' — Scenario Input Comparison' })}</div></div>`;
       }
     }
     
     // Individual result charts
     if (results.every(r => !r.error && r.result.chart)) {
       html += `<div class="chart-comparison"><h4>Detail Charts</h4>`;
       results.forEach((result, index) => {
         html += `<div class="individual-chart"><h5>Scenario ${index + 1}</h5>${result.result.chart}</div>`;
       });
       html += '</div>';
     }
     
     html += '</div>';

     // ---- Solve-for across scenarios (additive reverse comparison) ----
     // Uses the shared verified SolveFor engine: for each scenario, find the
     // input value that produces a SHARED target result with other inputs fixed.
     const solvable = (typeof window.SolveFor === 'object' && SolveFor.solvableInputs)
       ? SolveFor.solvableInputs(tool)
       : [];
     if (solvable.length > 0) {
       html += '<div class="compare-solvefor" style="margin-top:18px;padding:14px;border:1px solid var(--border, #ddd);border-radius:10px">';
       html += '<h4>🎯 Solve For (across scenarios)</h4>';
       html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:10px">Pick a variable and a target result. Each scenario shows the input value needed to hit that target with its other inputs held fixed — every answer is verified against the original formula.</p>';
       html += '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end">';
       html += '<div class="input-group" style="min-width:180px"><label>Solve for:</label><select id="cmp-solve-var">';
       solvable.forEach(inp => {
         html += `<option value="${inp.id}">${inp.label}</option>`;
       });
       html += '</select></div>';
       html += '<div class="input-group" style="min-width:160px"><label>Target result:</label><input type="number" id="cmp-solve-target" step="any" placeholder="e.g. 1000"></div>';
       html += '<button class="calc-btn" id="cmp-solve-run" onclick="AdvancedFeatures.runCompareSolve()">Solve Scenarios</button>';
       html += '</div>';
       html += '<div id="cmp-solve-out" style="margin-top:12px"></div>';
       html += '</div>';
     }

     content.innerHTML = html;
     modal.classList.add('active');
   }

   function runCompareSolve() {
     loadComparisonScenarios();
     const out = document.getElementById('cmp-solve-out');
     if (!out) return;
     if (comparisonScenarios.length < 1) { out.innerHTML = '<div class="error">No scenarios to solve.</div>'; return; }
     let tool = null;
     for (const [key, cat] of Object.entries(CALC_DATA)) {
       const found = cat.tools.find(t => t.id === comparisonScenarios[0].toolId);
       if (found) { tool = found; break; }
     }
     if (!tool || typeof SolveFor.solve !== 'function') { out.innerHTML = '<div class="error">Cannot solve — engine or tool missing.</div>'; return; }
     const varId = document.getElementById('cmp-solve-var').value;
     const target = parseFloat(document.getElementById('cmp-solve-target').value);
     if (isNaN(target)) { out.innerHTML = '<div class="error">Enter a valid numeric target.</div>'; return; }
     const vLabel = (tool.inputs.find(i => i.id === varId) || {}).label || varId;
     const rows = comparisonScenarios.map((s, i) => {
       const res = SolveFor.solve(tool, Object.assign({}, s.values), varId, target);
       let cell;
       if (res.status === 'error' || res.status === 'none') {
         cell = '<span class="error">' + (res.message || 'No solution') + '</span>';
       } else {
         const val = (typeof res.value === 'number' && isFinite(res.value))
           ? res.value.toLocaleString('en-US', { maximumFractionDigits: 6 }) : String(res.value);
         const tag = res.status === 'multiple' ? '⚠ multiple' : (res.status === 'exact' ? '✓ exact' : '≈ approx');
         cell = `<strong>${val}</strong> <span style="font-size:12px;color:var(--text-light)">(${tag}${res.iterations ? ', ' + res.iterations + ' iters' : ''})</span>`;
         if (res.status === 'multiple' && Array.isArray(res.values) && res.values.length > 1) {
           cell += '<div style="font-size:12px;color:var(--text-light)">all: ' + res.values.map(v =>
             (typeof v === 'number' && isFinite(v)) ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : String(v)
           ).join(', ') + '</div>';
         }
       }
       return `<tr><td>${Security.sanitizeHtml(s.name || 'Scenario ' + (i + 1))}</td><td>${vLabel}</td><td>${cell}</td></tr>`;
     });
     out.innerHTML = '<table class="compare-table"><thead><tr><th>Scenario</th><th>Solve For</th><th>Required Value (target ' +
       Security.sanitizeHtml(String(target)) + ')</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
   }

  // ========== MICRO-INTERACTIONS (Premium UI) ==========

  // ---------- Animated Number Count-Up ----------
  function animateResultNumber(element, finalValue, duration) {
    if (!element) return;
    duration = duration || 800;
    
    // Extract number from string if needed
    let prefix = '';
    let suffix = '';
    let numStr = String(finalValue);
    const numMatch = numStr.match(/([\d.,\-]+)/);
    if (!numMatch) {
      element.textContent = finalValue;
      return;
    }
    const fullNum = numMatch[0].replace(/,/g, '');
    const numVal = parseFloat(fullNum);
    if (isNaN(numVal)) {
      element.textContent = finalValue;
      return;
    }
    
    prefix = numStr.substring(0, numStr.indexOf(numMatch[0]));
    suffix = numStr.substring(numStr.indexOf(numMatch[0]) + numMatch[0].length);
    
    const startTime = performance.now();
    const startVal = 0;
    const hasDecimal = fullNum.includes('.');
    const decimalPlaces = hasDecimal ? fullNum.split('.')[1].length : 0;
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = startVal + (numVal - startVal) * eased;
      
      let displayVal;
      if (hasDecimal) {
        displayVal = currentVal.toFixed(decimalPlaces);
      } else if (numVal >= 1000) {
        displayVal = Math.round(currentVal).toLocaleString();
      } else {
        displayVal = Math.round(currentVal).toString();
      }
      
      element.textContent = prefix + displayVal + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = finalValue;
        // Add a subtle highlight pulse on completion
        element.style.transition = 'color 0.3s';
        element.style.color = 'var(--primary)';
        setTimeout(() => { element.style.color = ''; }, 500);
      }
    }
    
    requestAnimationFrame(update);
  }

  // ---------- Success Micro-Animation (Confetti-Lite) ----------
  function showSuccessAnimation() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.style.cssText = 'position:fixed;top:0;left:0;right:0;height:200px;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);
    
    const colors = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
    const shapes = ['■', '●', '▲', '★', '♦'];
    
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const size = 4 + Math.random() * 6;
      const rotation = Math.random() * 360;
      
      piece.style.cssText = `
        position:absolute;
        top:-10px;
        left:${left}%;
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation:confettiDrop ${1 + Math.random() * 1}s ease-out ${delay}s forwards;
        transform:rotate(${rotation}deg);
        opacity:1;
      `;
      container.appendChild(piece);
    }
    
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 3000);
  }

  // ---------- 3D Card Tilt Effect ----------
  function initTiltEffect(containerSelector) {
    const containers = document.querySelectorAll(containerSelector || '.tilt-card');
    
    containers.forEach(container => {
      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / centerY * -8;
        const rotateY = (x - centerX) / centerX * 8;
        
        container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
      });
      
      container.addEventListener('mouseleave', () => {
        container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      });
    });
  }

  // ---------- 3D tilt for category/hub/tool cards (desktop/hover only) ----------
  // Touch devices skip tilt entirely — no transform jank while scrolling.
  function initCardTilt() {
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
    document.querySelectorAll('.tool-card, .hub-card').forEach(card => {
      if (card.classList.contains('tilt-card')) return;
      card.classList.add('tilt-card');
    });
    initTiltEffect('.tool-card, .hub-card');
  }

  // ---------- Skeleton Loading (Fake loading state while switching calculators) ----------
  function showSkeleton() {
    const main = document.getElementById('mainContent');
    if (!main) return;
    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:24px 20px">
        <div class="skeleton skeleton-text" style="width:200px"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-text long"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">
          <div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>
          <div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>
        </div>
        <div class="skeleton skeleton-btn" style="margin-top:16px"></div>
      </div>
    `;
  }

  function hideSkeleton() {
    // Skeleton is replaced by the actual render; no explicit action needed
  }

  // ---------- Animate SVG Chart Draw-In ----------
  function animateCharts() {
    const svgs = document.querySelectorAll('.chart-area svg');
    svgs.forEach(svg => {
      // Animate bar chart bars
      const bars = svg.querySelectorAll('rect');
      bars.forEach((bar, i) => {
        const height = bar.getAttribute('height');
        if (height) {
          bar.style.transformOrigin = 'bottom';
          bar.style.transform = 'scaleY(0)';
          bar.style.transition = `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s`;
          requestAnimationFrame(() => {
            bar.style.transform = 'scaleY(1)';
          });
        }
      });
      
      // Animate pie/donut chart paths
      const paths = svg.querySelectorAll('path');
      paths.forEach((path, i) => {
        path.style.opacity = '0';
        path.style.transition = `opacity 0.4s ease-out ${i * 0.1}s, transform 0.3s ease-out`;
        requestAnimationFrame(() => {
          path.style.opacity = '1';
        });
        // Hover effect
        path.addEventListener('mouseenter', () => {
          path.style.transform = 'scale(1.05)';
          path.style.filter = 'brightness(1.1)';
        });
        path.addEventListener('mouseleave', () => {
          path.style.transform = 'scale(1)';
          path.style.filter = '';
        });
      });
      
      // Animate line chart lines
      const lines = svg.querySelectorAll('line, polyline');
      lines.forEach(line => {
        const length = line.getTotalLength ? line.getTotalLength() : 0;
        if (length > 0) {
          line.style.strokeDasharray = length;
          line.style.strokeDashoffset = length;
          line.style.transition = 'stroke-dashoffset 1.5s ease-out';
          requestAnimationFrame(() => {
            line.style.strokeDashoffset = '0';
          });
        }
      });
      
      // Tooltip hover for data points
      const circles = svg.querySelectorAll('circle');
      circles.forEach((circle, i) => {
        const origR = circle.getAttribute('r') || '4';
        circle.style.transition = 'r 0.2s ease-out, fill 0.2s ease-out';
        circle.setAttribute('r', '0');
        circle.style.cursor = 'pointer';
        requestAnimationFrame(() => {
          circle.setAttribute('r', origR);
        });
        circle.addEventListener('mouseenter', () => {
          circle.setAttribute('r', String(parseFloat(origR) * 1.5));
          circle.style.fill = 'var(--primary)';
        });
        circle.addEventListener('mouseleave', () => {
          circle.setAttribute('r', origR);
          circle.style.fill = '';
        });
      });
    });
  }

  // ---------- Auto-init tilt on category cards ----------
  function initHomeAnimations() {
    // Add tilt-card class to category cards
    document.querySelectorAll('.category-card').forEach(card => {
      card.classList.add('tilt-card');
    });
    initTiltEffect('.category-card');
    // Tool cards also get the subtle 3D tilt on hover-capable devices
    initCardTilt();
    
    // Add staggered animation to tool cards
    document.querySelectorAll('.tool-card').forEach((card, i) => {
      card.style.animation = `fadeInUp 0.5s ease-out ${i * 0.05}s both`;
    });
  }

  // ---------- /MICRO-INTERACTIONS ----------

  // ---------- Auto-Calculate ----------
  function enableAutoCalc(tool) {
    tool.inputs.forEach(inp => {
      const el = document.getElementById(inp.id);
      if (!el) return;
      el.addEventListener('input', debounce(() => {
        if (document.getElementById('auto-calc-toggle') && document.getElementById('auto-calc-toggle').checked) {
          App.executeCalc({ preventDefault: () => {}, target: document.getElementById('calc-form') });
        }
      }, 400));
    });
  }
  function debounce(fn, ms) {
    let t; return function() { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), ms); };
  }

  // ---------- Achievement system ----------
  function getAchievements() {
    return Security.safeGetItem('calcpro_achievements', []);
  }
  function unlockAchievement(id) {
    const list = getAchievements();
    if (!list.includes(id)) { list.push(id); localStorage.setItem('calcpro_achievements', JSON.stringify(list)); }
  }
  function renderAchievements() {
    const ACHIEVEMENTS = {
      'first-calc': { name: '🌟 First Calculation', desc: 'Run your first calculation', icon: '🌟' },
      'calculator-explorer': { name: '🧭 Calculator Explorer', desc: 'Use 10 different calculators', icon: '🧭' },
      'finance-guru': { name: '💰 Finance Guru', desc: 'Use 5 finance calculators', icon: '💰' },
      'health-enthusiast': { name: '💪 Health Enthusiast', desc: 'Use 5 health calculators', icon: '💪' },
      'math-whiz': { name: '🔢 Math Whiz', desc: 'Use 5 math calculators', icon: '🔢' },
      'favorite-collector': { name: '⭐ Favorite Collector', desc: 'Save 10 favorites', icon: '⭐' },
      'scenario-planner': { name: '📊 Scenario Planner', desc: 'Compare 5 scenarios', icon: '📊' },
      'streak-3': { name: '🔥 3-Day Streak', desc: 'Visit 3 days in a row', icon: '🔥' },
      'streak-7': { name: '🔥 7-Day Streak', desc: 'Visit 7 days in a row', icon: '🔥' },
      'streak-30': { name: '🔥 30-Day Streak', desc: 'Visit 30 days in a row', icon: '🔥' }
    };
    const unlocked = getAchievements();
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    let html = '<h3>Achievements</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:16px 0">';
    Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
      const done = unlocked.includes(id);
      html += `<div style="padding:16px;background:${done ? 'var(--surface)' : 'var(--bg)'};border:1px solid ${done ? 'var(--primary-light)' : 'var(--border)'};border-radius:8px;opacity:${done ? 1 : 0.5}">
        <div style="font-size:28px;margin-bottom:8px">${ach.icon}</div>
        <div style="font-weight:700;font-size:14px">${ach.name} ${done ? '✅' : '🔒'}</div>
        <div style="font-size:12px;color:var(--text-light);margin-top:4px">${ach.desc}</div>
      </div>`;
    });
    html += '</div>';
    body.innerHTML = html;
    modal.classList.add('active');
  }

  // ---------- Achievement Checking ----------
  function checkAchievements(toolId, catKey) {
    const ach = getAchievements();
    const history = CalcHistory.getAll();
    const uniqueTools = new Set(history.map(h => h.toolId)).size;
    const favs = AdvancedFeatures.getFavorites().length;
    const scenarios = AdvancedFeatures.getComparisonScenarios().length;
    
    // First calculation
    if (history.length >= 1) unlockAchievement('first-calc');
    // Calculator explorer
    if (uniqueTools >= 10) unlockAchievement('calculator-explorer');
    // Category specific - count tools used in this category
    let catTools = 0;
    if (catKey && CALC_DATA[catKey]) {
      const catToolIds = new Set(CALC_DATA[catKey].tools.map(t => t.id));
      catTools = history.filter(h => catToolIds.has(h.toolId)).length;
    }
    if (catKey === 'finance' && catTools >= 5) unlockAchievement('finance-guru');
    if (catKey === 'health' && catTools >= 5) unlockAchievement('health-enthusiast');
    if (catKey === 'math' && catTools >= 5) unlockAchievement('math-whiz');
    // Favorites
    if (favs >= 10) unlockAchievement('favorite-collector');
    // Compare scenarios
    if (scenarios >= 5) unlockAchievement('scenario-planner');
    // Streaks
    const analytics = CalcAnalytics.getData();
    const visits = analytics.visits || [];
    const visitDates = visits.map(v => new Date(v).toDateString()).sort().reverse();
    let streak = 0;
    for (let i = 0; i < visitDates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (visitDates[i] === expected.toDateString()) streak++;
      else break;
    }
    if (streak >= 3) unlockAchievement('streak-3');
    if (streak >= 7) unlockAchievement('streak-7');
    if (streak >= 30) unlockAchievement('streak-30');
  }
  
  // ---------- Daily Financial Tip Widget ----------
  const TIPS = [
    'Pay yourself first: Set up automatic transfers to savings on payday.',
    'The 50/30/20 rule: 50% needs, 30% wants, 20% savings/debt.',
    'Compound interest is the 8th wonder of the world — start early!',
    'Emergency fund: Aim for 3-6 months of expenses in a high-yield savings account.',
    'Maximize employer 401(k) match — it\'s free money.',
    'High-interest debt (credit cards) should be paid off before investing.',
    'Diversify: Don\'t put all your eggs in one basket.',
    'Review your subscriptions monthly — cancel unused ones.',
    'Your credit score affects loan rates — check it annually for free.',
    'Inflation erodes cash value — invest to stay ahead.',
    'The rule of 72: Divide 72 by interest rate to estimate doubling time.',
    'Automate bill payments to avoid late fees.',
    'Negotiate bills — cable, internet, phone often have promotions.',
    'Buy term life insurance if you have dependents.',
    'Track spending for 30 days to find leaks in your budget.',
    'Roth IRA: Tax-free growth for retirement (income limits apply).',
    'HSA is a triple-tax-advantaged account for medical expenses.',
    'Rebalance your portfolio annually to maintain target allocation.',
    'Don\'t time the market — time in the market beats timing.',
    'Side hustles can accelerate financial goals significantly.'
  ];
  function getDailyTip() {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('calcpro_daily_tip');
    if (saved) {
      const { date, tip } = JSON.parse(saved);
      if (date === today) return tip;
    }
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    localStorage.setItem('calcpro_daily_tip', JSON.stringify({ date: today, tip }));
    return tip;
  }
  function buildDailyTipHTML() {
    const tip = getDailyTip();
    return `<div style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;padding:16px;border-radius:12px;margin-bottom:16px;font-size:14px;line-height:1.5"><strong>💡 Daily Tip:</strong> ${tip}</div>`;
  }
  function renderDailyTip() {
    const container = document.getElementById('daily-tip-widget');
    // Idempotent: renderHome() already inlines the tip in its SINGLE render pass;
    // re-rendering here would swap the visible widget after first paint and add
    // a layout shift (CLS). Only fill an empty container.
    if (!container || container.children.length) return;
    container.innerHTML = buildDailyTipHTML();
  }

  // ---------- Custom Units / Precision Control ----------
  const UNITS_KEY = 'calcpro_units_prefs';
  function getUnitsPrefs() {
    const d = Security.safeGetItem(UNITS_KEY, null);
    // numberLocale: 'intl' (1,000,000) or 'in' (10,00,000 lakh/crore) — auto-detects
    // Indian subcontinent browsers, user can override in Display Preferences.
    const base = (d && typeof d.system === 'string') ? d : { system: 'metric', precision: 2 };
    if (typeof base.numberLocale === 'undefined') {
      const autoIn = /\b(hi|mr|ta|te|kn|ml|gu|pa|bn|ur|sd)\b/.test((navigator.language || 'en').toLowerCase());
      base.numberLocale = autoIn ? 'in' : 'intl';
    }
    return base;
  }
  function setUnitsPrefs(prefs) {
    localStorage.setItem(UNITS_KEY, JSON.stringify(prefs));
  }
  function setNumberLocale(locale) {
    const prefs = getUnitsPrefs();
    prefs.numberLocale = locale;
    setUnitsPrefs(prefs);
    App.showToast(locale === 'in' ? 'Indian format: 10,00,000 (Lakh)' : 'International format: 1,000,000');
  }
  function renderUnitsSettings() {
    const prefs = getUnitsPrefs();
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    body.innerHTML = `
      <h3>Display Preferences</h3>
      <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
        <div>
          <label style="display:block;font-weight:600;margin-bottom:8px">Unit System</label>
          <label class="action-btn toggle" style="width:100%;justify-content:flex-start">
            <input type="radio" name="unit-system" value="metric" ${prefs.system === 'metric' ? 'checked' : ''} onchange="AdvancedFeatures.setUnitSystem('metric')"> Metric (kg, cm, km, L)
          </label>
          <label class="action-btn toggle" style="width:100%;justify-content:flex-start;margin-top:8px">
            <input type="radio" name="unit-system" value="imperial" ${prefs.system === 'imperial' ? 'checked' : ''} onchange="AdvancedFeatures.setUnitSystem('imperial')"> Imperial (lb, in, mi, gal)
          </label>
        </div>
        <div>
          <label style="display:block;font-weight:600;margin-bottom:8px">Number Format</label>
          <label class="action-btn toggle" style="width:100%;justify-content:flex-start">
            <input type="radio" name="number-locale" value="intl" ${prefs.numberLocale === 'intl' ? 'checked' : ''} onchange="AdvancedFeatures.setNumberLocale('intl')"> 🌍 International — 1,000,000
          </label>
          <label class="action-btn toggle" style="width:100%;justify-content:flex-start;margin-top:8px">
            <input type="radio" name="number-locale" value="in" ${prefs.numberLocale === 'in' ? 'checked' : ''} onchange="AdvancedFeatures.setNumberLocale('in')"> 🇮🇳 Indian — 10,00,000 (Lakh)
          </label>
        </div>
        <div>
          <label style="display:block;font-weight:600;margin-bottom:8px">Decimal Precision: <span id="precision-value">${prefs.precision}</span></label>
          <input type="range" id="precision-slider" min="0" max="6" value="${prefs.precision}" oninput="AdvancedFeatures.setPrecision(this.value)" style="width:100%;accent-color:var(--primary)">
        </div>
      </div>
    `;
    modal.classList.add('active');
  }
  function setUnitSystem(system) {
    const prefs = getUnitsPrefs();
    prefs.system = system;
    setUnitsPrefs(prefs);
    App.showToast('Unit system set to ' + system);
  }
  function setPrecision(val) {
    const prefs = getUnitsPrefs();
    prefs.precision = parseInt(val);
    setUnitsPrefs(prefs);
    document.getElementById('precision-value').textContent = val;
  }
  function formatNumber(num, prefs) {
    if (!isFinite(num)) return String(num);
    const locale = (prefs && prefs.numberLocale === 'in') ? 'en-IN' : undefined;
    return num.toLocaleString(locale, { minimumFractionDigits: prefs.precision, maximumFractionDigits: prefs.precision });
  }
  function convertUnits(value, fromUnit, toUnit) {
    // Basic conversions - can be extended
    const conversions = {
      'kg-lb': 2.20462, 'lb-kg': 0.453592,
      'cm-in': 0.393701, 'in-cm': 2.54,
      'm-ft': 3.28084, 'ft-m': 0.3048,
      'km-mi': 0.621371, 'mi-km': 1.60934,
      'l-gal': 0.264172, 'gal-l': 3.78541
    };
    const key = fromUnit + '-' + toUnit;
    return conversions[key] ? value * conversions[key] : value;
  }

  // ---------- Glossary Tooltips ----------
  const GLOSSARY = {
    'APR': 'Annual Percentage Rate - the yearly cost of a loan including fees',
    'EMI': 'Equated Monthly Installment - fixed payment amount made by a borrower',
    'Compound Interest': 'Interest calculated on initial principal and accumulated interest',
    'Simple Interest': 'Interest calculated only on the principal amount',
    'Amortization': 'Process of paying off debt with regular payments over time',
    'Principal': 'The original amount of money borrowed or invested',
    'NPV': 'Net Present Value - difference between present value of cash inflows and outflows',
    'IRR': 'Internal Rate of Return - discount rate that makes NPV equal to zero',
    'ROI': 'Return on Investment - measure of profitability relative to cost',
    'BMR': 'Basal Metabolic Rate - calories burned at rest',
    'BMI': 'Body Mass Index - weight-to-height ratio indicator',
    'TDEE': 'Total Daily Energy Expenditure - total calories burned per day',
    'VO2 Max': 'Maximum oxygen consumption during intense exercise',
    'BSA': 'Body Surface Area - calculated surface area of human body',
    'LTV': 'Loan-to-Value ratio - loan amount divided by property value',
    'DTI': 'Debt-to-Income ratio - monthly debt payments divided by gross income',
    'YTM': 'Yield to Maturity - total return anticipated on a bond if held to maturity',
    'Cap Rate': 'Capitalization Rate - net operating income divided by property value',
    'CAGR': 'Compound Annual Growth Rate - mean annual growth rate over a period',
    'Standard Deviation': 'Measure of data dispersion from the mean',
    'Variance': 'Average of squared differences from the mean',
    'Median': 'Middle value in a sorted dataset',
    'Percentile': 'Value below which a percentage of observations fall',
    'GCD': 'Greatest Common Divisor - largest integer dividing both numbers',
    'LCM': 'Least Common Multiple - smallest integer divisible by both numbers',
    'Determinant': 'Scalar value computed from a square matrix',
    'Logarithm': 'Inverse function of exponentiation',
    'Factorial': 'Product of all positive integers up to n (n!)',
    'Permutation': 'Arrangement of objects in a specific order',
    'Combination': 'Selection of objects without regard to order',
    'Modulo': 'Remainder after division of one number by another',
    'Complex Number': 'Number with real and imaginary parts (a + bi)',
    'Quadratic Equation': 'Equation of form ax² + bx + c = 0',
    'Discriminant': 'b² - 4ac in quadratic formula, determines root nature',
    'Heron\'s Formula': 'Area = √(s(s-a)(s-b)(s-c)) for triangle with sides a,b,c',
    'Pythagorean Theorem': 'a² + b² = c² for right triangle with hypotenuse c'
  };

  function initGlossaryTooltips() {
    const toolTip = document.createElement('div');
    toolTip.id = 'glossary-tooltip';
    toolTip.style.cssText = 'position:fixed;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;max-width:300px;font-size:13px;color:var(--text);box-shadow:var(--shadow-lg);pointer-events:none;opacity:0;transition:opacity 0.15s';
    document.body.appendChild(toolTip);

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-glossary]');
      if (!target) return;
      const term = target.dataset.glossary;
      const def = GLOSSARY[term];
      if (!def) return;
      toolTip.textContent = def;
      toolTip.style.opacity = '1';
      positionTooltip(target, toolTip);
    });

    document.addEventListener('mousemove', (e) => {
      const toolTip = document.getElementById('glossary-tooltip');
      if (toolTip.style.opacity === '1') {
        positionTooltip(document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-glossary]') || toolTip._lastTarget, toolTip, e);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget?.closest('[data-glossary]')) {
        const toolTip = document.getElementById('glossary-tooltip');
        toolTip.style.opacity = '0';
      }
    });
  }

  function positionTooltip(target, toolTip, e) {
    if (!target) return;
    toolTip._lastTarget = target;
    const rect = target.getBoundingClientRect();
    const ttRect = toolTip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - ttRect.width / 2;
    let top = rect.top - ttRect.height - 8;
    if (left < 8) left = 8;
    if (left + ttRect.width > window.innerWidth - 8) left = window.innerWidth - ttRect.width - 8;
    if (top < 8) top = rect.bottom + 8;
    toolTip.style.left = left + 'px';
    toolTip.style.top = top + 'px';
  }

  // ---------- Shareable Result Cards / Image Export ----------
  function generateResultCard(toolName, result, extra, chartSvg) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 800;
    const height = 500;
    canvas.width = width * 2; // 2x for retina
    canvas.height = height * 2;
    ctx.scale(2, 2);
    
    // Background
    const isDark = document.body.classList.contains('dark-theme');
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Header
    ctx.fillStyle = isDark ? '#3b82f6' : '#2563eb';
    ctx.fillRect(0, 0, width, 80);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(toolName, 30, 50);
    
    // Result
    ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(result, 30, 150);
    
    // Extra details
    if (extra) {
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText(extra, 30, 200);
    }
    
    // Chart if available
    if (chartSvg) {
      // We'll draw a placeholder for the chart
      ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
      ctx.fillRect(30, 230, width - 60, 200);
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chart visualization', width / 2, 330);
    }
    
    // Footer
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Calculated with CalcProMaster • ' + new Date().toLocaleDateString(), 30, height - 20);
    var _siteOrigin = (typeof window !== 'undefined' && window.SITE_CONFIG && window.SITE_CONFIG.domain) ? window.SITE_CONFIG.domain : 'calcpromaster.netlify.app';
    ctx.fillText(_siteOrigin, width - 30 - ctx.measureText(_siteOrigin).width, height - 20);
    
    return canvas.toDataURL('image/png');
  }
  
  function exportResultAsImage(toolName, result, extra) {
    const chartArea = document.querySelector('.chart-area svg');
    const chartSvg = chartArea ? chartArea.outerHTML : null;
    const dataUrl = generateResultCard(toolName, result, extra, chartSvg);
    
    const link = document.createElement('a');
    link.download = `${toolName.replace(/\s+/g, '-')}-result.png`;
    link.href = dataUrl;
    link.click();
    App.showToast('Result card saved as image!');
  }
  
  function copyResultCard(toolName, result, extra) {
    const chartArea = document.querySelector('.chart-area svg');
    const chartSvg = chartArea ? chartArea.outerHTML : null;
    generateResultCard(toolName, result, extra, chartSvg).then(dataUrl => {
      // Convert to blob and copy to clipboard
      fetch(dataUrl).then(res => res.blob()).then(blob => {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        App.showToast('Result card copied to clipboard!');
      });
    });
  }

  // ---------- CSV Export ----------
  // Downloads the current calculation inputs + result as a .csv file (client-side, zero server risk)
  function exportResultCSV(toolName, values, result) {
    // CSV formula-injection hardening: prefix cells that start with = + - @
    // with a single quote so Excel never evaluates user input as a formula.
    const esc = (v) => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const rows = [];
    rows.push([esc('Calculator'), esc(toolName)]);
    rows.push([esc('Date'), esc(new Date().toLocaleString())]);
    if (values && typeof values === 'object') {
      Object.entries(values).forEach(([k, v]) => rows.push([esc(k), esc(v)]));
    }
    if (result) {
      rows.push([esc('Result'), esc(result.result || '')]);
      if (result.extra) rows.push([esc('Details'), esc(result.extra)]);
      if (result.chart) {
        // Extract a text summary from the chart SVG for the CSV (labels + values)
        const doc = new DOMParser().parseFromString(result.chart, 'text/html');
        const summaries = Array.from(doc.querySelectorAll('[data-label], [data-value]')).map(el => {
          const lbl = el.getAttribute('data-label') || '';
          const val = el.getAttribute('data-value') || '';
          return lbl ? (lbl + ': ' + val) : val;
        }).filter(Boolean).slice(0, 20);
        if (summaries.length) rows.push([esc('Chart Data'), esc(summaries.join('; '))]);
      }
    }
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (String(toolName || 'calcpro').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'calcpro') + '-result.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    App.showToast('CSV downloaded!');
  }
  // Export the CURRENT on-screen calculation (reads live DOM state)
  function exportCurrentCSV() {
    const tool = App._currentTool && App._currentTool.tool;
    if (!tool) { App.showToast('Run a calculation first'); return; }
    const values = (typeof App._collectValues === 'function') ? App._collectValues() : {};
    const resultMain = document.querySelector('.result-main');
    const resultExtra = document.querySelector('.result-extra');
    // Scope the chart lookup to the result area so ZR's own chart areas never get picked up
    const resultArea = document.getElementById('result-area');
    const chartSvg = (resultArea ? resultArea.querySelector('.chart-area svg') : null) || document.querySelector('.chart-area svg');
    // Pass the REAL SVG outerHTML — it carries the data-label/data-value
    // attributes that exportResultCSV's DOMParser extracts into the CSV.
    exportResultCSV(tool.name, values, {
      result: resultMain ? resultMain.textContent.trim() : '',
      extra: resultExtra ? resultExtra.textContent.trim() : '',
      chart: chartSvg ? chartSvg.outerHTML : ''
    });
  }

  // ---------- Embed Widget Generator ----------
  function generateEmbedCode(toolId) {
    const tool = TOOL_MAP[toolId];
    if (!tool) return '';
    // FIX: base URL must be the ORIGIN only — window.location.pathname already
    // includes the current /category/tool on tool pages, which used to double the
    // path AND now trips the long-tail modifier router with a garbage modifier.
    const catKey = Object.entries(CALC_DATA).find(([k, c]) => c.tools.some(t => t.id === toolId))?.[0] || 'finance';
    const embedUrl = window.location.origin + '/' + catKey + '/' + toolId;
    const width = 600;
    const height = 800;
    // FIX: embedUrl has no query string yet, so the flag must be added with '?' not '&'.
    // sandbox: allow-scripts + allow-same-origin (SPA + localStorage) + allow-forms
    // (Enter-to-calculate) + allow-downloads (Export Image/CSV/PDF still work in the
    // widget); popups and top-navigation stay blocked → safe on any third-party site.
    return `<iframe src="${embedUrl}?embed=true" width="${width}" height="${height}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" style="border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)" title="${tool.name}"></iframe>`;
  }
  
  function showEmbedModal(toolId) {
    const tool = TOOL_MAP[toolId];
    if (!tool) return;
    const code = generateEmbedCode(toolId);
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    // Lazy iframe preview — loading the full SPA inside the modal on every open
    // blocked the main thread (heavy). Now the iframe only mounts on demand.
    body.innerHTML = `
      <h3>Embed ${tool.name}</h3>
      <p style="color:var(--text-light);font-size:14px;margin-bottom:16px">Copy this iframe code to embed this calculator on your website:</p>
      <textarea style="width:100%;height:120px;padding:12px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:12px" readonly onclick="this.select()">${Security.sanitizeHtml(code)}</textarea>
      <div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--text-light)">
        <strong>Live preview:</strong>
        <button id="embed-preview-btn" class="action-btn" style="margin-top:8px" onclick="AdvancedFeatures.loadEmbedPreview()">▶ Load Preview</button>
        <div id="embed-preview-area" style="margin-top:8px"></div>
      </div>
      <button class="action-btn" id="embed-copy-btn">Copy to Clipboard</button>
    `;
    // Copy button built with DOM API — the embed code contains double quotes
    // that would break an inline onclick attribute (unterminated template literal).
    var copyBtn = document.getElementById('embed-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(code).then(function () {
          App.showToast('Embed code copied!');
        }, function () {
          var ta = body.querySelector('textarea');
          if (ta) { ta.select(); document.execCommand('copy'); App.showToast('Embed code copied!'); }
        });
      });
    }
    modal.classList.add('active');
  }
  // Mounts the embed iframe only when the user asks — keeps the main thread free.
  function loadEmbedPreview() {
    const area = document.getElementById('embed-preview-area');
    const btn = document.getElementById('embed-preview-btn');
    if (!area) return;
    const cur = (window.App && App._currentTool && App._currentTool.tool) ? App._currentTool.tool : null;
    const tool = cur ? (TOOL_MAP[cur.id] || cur) : null;
    if (!tool) return;
    area.innerHTML = generateEmbedCode(tool.id);
    if (btn) btn.style.display = 'none';
  }

  // ---------- Goal-Seek / Reverse Calculator ----------
  function showGoalSeek(toolId) {
    const tool = TOOL_MAP[toolId];
    if (!tool) { App.showToast('Tool not found'); return; }
    
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    
    // Respect declared solve-for set (reverse.solveFor) — falls back to all numeric
    // inputs for tools without a declaration (generic numeric solve).
    const solvable = (typeof window.SolveFor === 'object' && SolveFor.solvableInputs)
      ? SolveFor.solvableInputs(tool)
      : tool.inputs.filter(i => i.type === 'number');
    if (solvable.length === 0) {
      App.showToast('No numeric input can be solved for on this calculator');
      return;
    }
    
    let html = '<h3>🎯 Reverse Calculate (Solve For)</h3>';
    html += '<p style="font-size:14px;color:var(--text-light);margin-bottom:16px">Keep the other inputs as-is, set your desired result, and we\'ll find the required value. Results are re-verified against the original formula.</p>';
    html += '<form onsubmit="AdvancedFeatures.runGoalSeek(event)">';
    html += '<input type="hidden" id="goal-seek-tool" value="' + toolId + '">';
    
    // Variable picker
    html += '<div class="input-group"><label>Solve for:</label><select id="goal-seek-variable" required>';
    solvable.forEach(inp => {
      html += `<option value="${inp.id}">${inp.label}</option>`;
    });
    html += '</select></div>';
    
    // Target value
    html += '<div class="input-group"><label>Target result value:</label><input type="number" id="goal-seek-target" step="any" required placeholder="e.g., 1000"></div>';
    
    html += '<button type="submit" class="calc-btn" style="margin-top:8px">🎯 Find Input Value</button>';
    html += '</form>';
    html += '<div id="goal-seek-result" style="margin-top:16px"></div>';
    
    body.innerHTML = html;
    modal.classList.add('active');
  }
  
  function runGoalSeek(e) {
    e.preventDefault();
    const toolId = document.getElementById('goal-seek-tool').value;
    const variable = document.getElementById('goal-seek-variable').value;
    const target = parseFloat(document.getElementById('goal-seek-target').value);
    
    if (isNaN(target)) { App.showToast('Enter a valid target value'); return; }
    
    const tool = TOOL_MAP[toolId];
    if (!tool) return;
    
    const resultDiv = document.getElementById('goal-seek-result');
    if (!resultDiv) return;
    
    // Get current values (other inputs stay fixed)
    const currentValues = App._collectValues();
    
    // Delegate to the safe SolveFor engine (analytical first, then bisection,
    // always verified by substituting back into the original calc).
    if (typeof window.SolveFor !== 'object' || typeof SolveFor.solve !== 'function') {
      resultDiv.innerHTML = '<div class="error">Reverse calculation engine not loaded.</div>';
      return;
    }
    
    const res = SolveFor.solve(tool, currentValues, variable, target);
    
    const variableLabel = tool.inputs.find(i => i.id === variable)?.label || variable;
    
    if (res.status === 'error' || res.status === 'none') {
      resultDiv.innerHTML = '<div class="error">' + (res.message || 'Could not find a solution. Try different inputs or change the target value.') + '</div>';
      return;
    }
    
    const displayVal = (typeof res.value === 'number' && isFinite(res.value))
      ? res.value.toLocaleString('en-US', { maximumFractionDigits: 6 })
      : String(res.value);
    
    // Status badge: exact (analytical) vs approximate (numerical) vs multiple solutions
    let badge = '';
    if (res.status === 'multiple') {
      badge = '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:#fff3cd;color:#856404;margin-bottom:8px">⚠ Multiple valid solutions</span>';
    } else if (res.status === 'exact') {
      badge = '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:#d4edda;color:#155724;margin-bottom:8px">✓ Exact solution (analytical)</span>';
    } else {
      badge = '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:#fff3cd;color:#856404;margin-bottom:8px">≈ Approximate solution (numerical)</span>';
    }
    
    // Verification line (Phase 10)
    const vf = res.verification;
    const verifyLine = (vf && vf.ok)
      ? '<p style="font-size:13px;color:var(--text-light);margin-top:8px">✓ Verified: substituting back gives ' + (isFinite(vf.got) ? vf.got.toLocaleString('en-US', { maximumFractionDigits: 4 }) : 'n/a') + ' (target ' + target.toLocaleString() + ')</p>'
      : '';
    
    // Multiple solutions listing
    let multiHtml = '';
    if (res.status === 'multiple' && Array.isArray(res.values) && res.values.length > 1) {
      multiHtml = '<p style="font-size:13px;color:var(--text-light);margin-top:8px">All solutions: ' + res.values.map(v => (typeof v === 'number' && isFinite(v)) ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : String(v)).join(', ') + '</p>';
    }
    
    const safeDisplay = String(displayVal).replace(/[<>&'"]/g, '');
    const safeVar = String(variable).replace(/[^a-zA-Z0-9_-]/g, '');
    const safeTarget = String(target).replace(/[^0-9.eE+-]/g, '');
    // Plain numeric value for the Apply button (HTML number inputs reject commas).
    const applyVal = (typeof res.value === 'number' && isFinite(res.value)) ? res.value : '';
    
    resultDiv.innerHTML = `
      <div class="explain-card">
        <h4>🎯 Reverse Calculate Result</h4>
        ${badge}
        <p>To get a result of <strong>${safeTarget}</strong>, set <strong>${variableLabel}</strong> to:</p>
        <div style="font-size:24px;font-weight:800;margin:12px 0;background:var(--primary-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${safeDisplay}</div>
        ${verifyLine}
        ${multiHtml}
        <p style="font-size:13px;color:var(--text-light)">Method: ${res.method === 'analytical' ? 'exact formula inverse' : 'numerical solver'}${res.iterations ? ' · ' + res.iterations + ' iterations' : ''}. Click below to apply this value to the calculator.</p>
        <button class="action-btn" onclick="document.getElementById('${safeVar}').value='${applyVal}';document.getElementById('${safeVar}').dispatchEvent(new Event('input'));document.getElementById('modalOverlay').classList.remove('active');App.executeCalc({preventDefault:()=>{}})">Apply Value & Calculate</button>
      </div>
    `;
  }

  return {
    getFavorites, toggleFavorite, isFavorite, renderFavoritesBar, purgeRemovedToolIds,
    getPinned, pinResult, unpinResult, clearPinned, renderPinBar, openCompare, closeCompare, runCompareSolve,
    getChain, addToChain, getChainValue, renderChainBar, useChainValue,
    saveScenario, getScenarios, clearScenarios, renderScenarioBar, loadScenario,
    getPresets, savePreset, deletePreset, renderPresetDropdown, loadPreset,
    toggleBatch, runBatch,
    initVoice, startVoice,
    generateShareLink, loadFromUrl,
    renderSteps,
    getSmartSuggestions,
    enableAutoCalc,
    initGlossaryTooltips,
    // Units / Precision
    getUnitsPrefs, setUnitsPrefs, renderUnitsSettings, setUnitSystem, setPrecision, setNumberLocale, formatNumber, convertUnits,
    // Achievements
    getAchievements, unlockAchievement, checkAchievements, renderAchievements,
    // Daily Tip
    getDailyTip, buildDailyTipHTML, renderDailyTip,
    // Shareable result cards
    generateResultCard, exportResultAsImage, copyResultCard,
    // CSV export
    exportResultCSV, exportCurrentCSV,
    // Embed widget
    generateEmbedCode, showEmbedModal, loadEmbedPreview,
    // Scenario comparison (localStorage-backed)
    getComparisonScenarios, saveComparisonScenario, clearComparisonScenarios,
    runComparison, renderComparisonBar, loadComparisonScenario, runComparisonMode, runCompareSolve,
    // Micro-interactions (Premium UI)
    animateResultNumber, showSuccessAnimation, initTiltEffect,
    showSkeleton, hideSkeleton, animateCharts, initHomeAnimations, initCardTilt,
    showGoalSeek, runGoalSeek,
  };
})();
if (typeof window !== 'undefined') window.AdvancedFeatures = AdvancedFeatures;
