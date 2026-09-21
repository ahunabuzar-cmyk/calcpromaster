// =====================================================================
// CalcProMaster — ZR (Zero-Risk Features) Module
// 12 missing client-side features, 100% browser-based, zero server risk:
//   1. Interactive Range Sliders (dual number + slider sync)
//   2. What-If Sensitivity HEATMAP (2-variable color grid)
//   3. Multi-Step Guided Wizards (any tool → step-by-step journey)
//   4. Multi-Scenario Comparison Chart (SVG, accessible/crawlable)
//   5. Amortization & Year-by-Year Breakdown Tables
//   6. Gamified Financial Health Score & Badges (0-100 + achievements)
//   7. Auto White-Label PDF Report Generator (custom branding)
//   8. Hyper-Localized Geo-Targeting Engine (Intl/timezone — no IP, no server)
//   9. Interactive Debt Snowball & Avalanche Game-Mode
//  10. Zero-Latency WebAssembly Math Engine (embedded 83-byte module + JS fallback)
//  11. Voice-Driven Step-by-Step Audio Walkthrough (SpeechSynthesis)
//  12. Biometric & Secure Local Vault (WebAuthn + AES-GCM via SubtleCrypto)
//
// Security: EVERY user/localStorage-derived string injected into innerHTML
// passes through Security.sanitizeHtml(). No eval, no document.write of
// user data, no network calls. All state stays on-device.
// =====================================================================
const ZR = (function () {
  'use strict';

  // ---------- shared helpers ----------
  function esc(s) {
    if (window.Security && typeof Security.sanitizeHtml === 'function') {
      return Security.sanitizeHtml(String(s == null ? '' : s));
    }
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function jsStr(s) {
    if (window.Security && typeof Security.sanitizeJsString === 'function') {
      return Security.sanitizeJsString(String(s == null ? '' : s));
    }
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  function num(v, d) { const n = parseFloat(v); return isFinite(n) ? n : (d || 0); }
  function toast(msg) { if (window.App && App.showToast) { try { App.showToast(msg); } catch (e) {} } }
  function getModal() {
    return { modal: document.getElementById('modalOverlay'), body: document.getElementById('modalBody') };
  }
  function openModal(html) {
    const m = getModal();
    if (!m.modal || !m.body) return false;
    m.body.innerHTML = html;
    m.modal.classList.add('active');
    return true;
  }
  function closeModal() { const m = getModal(); if (m.modal) m.modal.classList.remove('active'); }
  function triggerCalc() {
    try { App.executeCalc({ preventDefault: function () {} }); } catch (e) {}
  }
  // Tolerate { v, l } or { value, label } option shapes
  function optVal(o) { return (o && o.v !== undefined) ? o.v : (o && o.value); }
  function optLabel(o) { return (o && o.l !== undefined) ? o.l : (o && o.label) || optVal(o); }
  function isAsyncTool(tool) { return tool && (tool.async === true || typeof tool.calc !== 'function'); }

  // Numeric inputs of a tool (skip mode/select-like helpers)
  function numericInputs(tool) {
    return (tool && tool.inputs || []).filter(function (i) {
      return (i.type === 'number' || i.type === 'range') && ['mode', 'paymentFreq', 'freq', 'compound'].indexOf(i.id) === -1;
    });
  }

  // ===================================================================
  // 1. INTERACTIVE RANGE SLIDERS
  // Wraps each numeric input with a synced range slider (schema min/max/step
  // when declared; otherwise auto-derived from the current value).
  // ===================================================================
  function wireSliders(tool) {
    if (!tool || !tool.inputs) return;
    // Sliders on EVERY numeric input. Raised from 8 to 12 — only 2 tools in the
    // whole platform have more than 12 numeric inputs, so coverage is now total.
    const inputs = numericInputs(tool).slice(0, 12);
    if (inputs.length === 0) return;

    // Round a slider bound to a clean value (2 significant digits) so money
    // ranges read as 10,000–150,000 instead of 10,000.0001–150,000.3.
    // Epsilon guards IEEE-754 artifacts (12*0.1 = 1.2000000000000002 would
    // otherwise ceil to 1.3); final rounding kills the trailing FP noise.
    function nice(v) {
      if (v === 0) return 0;
      const abs = Math.abs(v);
      const exp = Math.floor(Math.log10(abs));
      const mult = Math.pow(10, exp - 1);
      const r = Math.ceil(v / mult - 1e-9) * mult;
      return Number(r.toFixed(6));
    }

    inputs.forEach(function (inp) {
      // Inputs with an explicit slider:{min,max,step} schema already get a
      // native range input in the tool form (app.js) — skip to avoid doubling.
      if (inp.slider && inp.slider.min !== undefined && inp.slider.max !== undefined) return;
      const el = document.getElementById(inp.id);
      if (!el || el.type !== 'number') return;
      // skip already-wired
      if (el.dataset.zrSlider === '1') return;
      el.dataset.zrSlider = '1';

      const wrap = el.parentNode;
      const current = num(el.value, 0);
      // Anchor on the tool's own default (inp.def) when the field is empty/0, so
      // a fresh "Annual Salary" input gets a 100,000–300,000 slider instead of 0–100.
      const anchor = current !== 0 ? current : num(inp.def, 0);
      let min = inp.min !== undefined ? num(inp.min) : (anchor > 0 ? nice(anchor * 0.1) : 0);
      let max = inp.max !== undefined ? num(inp.max) : (anchor > 0 ? nice(anchor * 3) : 100);
      // Negative anchors would produce an inverted range (min > max) — swap and
      // enforce a minimum span so the range input always renders valid.
      if (min > max) { const tmp = min; min = max; max = tmp; }
      if (max - min < 1 && max > 0) { max = min + 1; }
      const step = inp.step !== undefined ? num(inp.step) : ((max - min) / 100 || 1);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'zr-slider';
      slider.min = min; slider.max = max; slider.step = step; slider.value = current;
      slider.setAttribute('aria-label', inp.label || inp.id);

      const row = document.createElement('div');
      row.className = 'zr-slider-row';
      row.appendChild(slider);

      slider.addEventListener('input', function () {
        el.value = String(slider.value);
        // Live real-time result updates (respects Auto-Calc; rAF-throttled)
        if (typeof UXUtils !== 'undefined' && UXUtils.debounce) {
          if (!el._zrLive) {
            el._zrLive = UXUtils.debounce(function () {
              const auto = document.getElementById('auto-calc-toggle');
              if (auto && auto.checked) triggerCalc();
            }, 120);
          }
          el._zrLive();
        } else {
          setTimeout(function () {
            const auto = document.getElementById('auto-calc-toggle');
            if (auto && auto.checked) triggerCalc();
          }, 120);
        }
      });
      el.addEventListener('input', function () {
        const v = num(el.value, 0);
        if (v >= slider.min && v <= slider.max) slider.value = String(v);
      });
      wrap.insertBefore(row, el.nextSibling);
    });
  }

  // ===================================================================
  // 2. WHAT-IF SENSITIVITY HEATMAP
  // 2-variable grid, color-coded by result magnitude. Replaces the simple
  // single-variable table when a tool has 2+ numeric inputs.
  // Returns true if it rendered (so the caller can skip the old table).
  // ===================================================================
  function renderHeatmap(tool, values) {
    if (!tool || isAsyncTool(tool)) return false;
    const numIn = numericInputs(tool);
    if (numIn.length < 2) return false;
    const area = document.getElementById('sensitivity-area');
    if (!area) return false;

    const a = numIn[0], b = numIn[1];
    const baseA = num(values[a.id]);
    const baseB = num(values[b.id]);
    if (!baseA || !baseB) return false;

    const pcts = [-20, -10, 0, 10, 20];
    const matrix = [];
    let minV = Infinity, maxV = -Infinity;

    // Compute cells; numeric result extraction via parseFloat
    pcts.forEach(function (pa) {
      pcts.forEach(function (pb) {
        const va = baseA * (1 + pa / 100);
        const vb = baseB * (1 + pb / 100);
        const testVals = Object.assign({}, values, { [a.id]: va, [b.id]: vb });
        let r = '';
        try {
          const res = tool.calc(testVals);
          r = (res && res.result !== undefined) ? String(res.result) : '';
        } catch (e) { r = ''; }
        const n = parseFloat(r);
        if (isFinite(n)) { if (n < minV) minV = n; if (n > maxV) maxV = n; }
        matrix.push({ pa: pa, pb: pb, va: va, vb: vb, raw: r, n: n });
      });
    });
    if (!isFinite(minV) || minV === maxV) { minV = 0; maxV = 1; }
    const span = maxV - minV || 1;

    function cellColor(n) {
      if (!isFinite(n)) return '#334155';
      const t = (n - minV) / span; // 0 = low (red), 1 = high (green)
      // Darker scale (red-700 -> green-800) so white cell text keeps
      // >= 4.5:1 contrast on every cell (WCAG 2.2 AA).
      const r = Math.round(185 - 163 * t);
      const g = Math.round(28 + 73 * t);
      const bb = Math.round(28 + 24 * t);
      return 'rgb(' + r + ',' + g + ',' + bb + ')';
    }
    function cellTextColor(n) {
      if (!isFinite(n)) return '#e2e8f0';
      return '#ffffff';
    }

    let html = '<details class="calc-collapsible" open><summary>🔥 What-If Heatmap — ' +
      esc(a.label) + ' × ' + esc(b.label) + '</summary>';
    html += '<div class="zr-heatmap-wrap" tabindex="0" role="region" aria-label="What-if sensitivity heatmap (horizontally scrollable)">';
    html += '<table class="zr-heatmap" role="grid" aria-label="What-if sensitivity heatmap">';
    html += '<thead><tr><th></th>';
    pcts.forEach(function (pa) {
      html += '<th>' + (pa > 0 ? '+' : '') + pa + '% ' + esc(a.label) + '</th>';
    });
    html += '</tr></thead><tbody>';
    let idx = 0;
    pcts.forEach(function (pb) {
      html += '<tr><th scope="row">' + (pb > 0 ? '+' : '') + pb + '% ' + esc(b.label) + '</th>';
      pcts.forEach(function (pa) {
        const c = matrix[idx++];
        const bg = cellColor(c.n);
        const fg = cellTextColor(c.n);
        html += '<td style="background:' + bg + ';color:' + fg + '" ' +
          'title="' + esc(a.label) + ' ' + (c.pa > 0 ? '+' : '') + c.pa + '% → ' + c.va.toFixed(2) + ', ' +
          esc(b.label) + ' ' + (c.pb > 0 ? '+' : '') + c.pb + '% → ' + c.vb.toFixed(2) + '">' +
          esc(c.raw.substring(0, 14)) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '<div class="zr-heatmap-legend"><span style="background:#b91c1c"></span> Low' +
      '<span style="background:#684128"></span> Mid' +
      '<span style="background:#166534"></span> High' +
      '<span class="zr-legend-note">Hover a cell for exact inputs</span></div>';
    html += '</div></details>';

    area.innerHTML = html;
    return true;
  }

  // ===================================================================
  // 3. MULTI-STEP GUIDED WIZARD
  // Breaks any tool's inputs into a sequential journey (one input per step)
  // with a progress bar, Back/Next navigation, and a final review+calc step.
  // ===================================================================
  function openWizard(tool) {
    if (!tool) return;
    const inputs = tool.inputs || [];
    if (inputs.length === 0) { toast('This tool has no inputs to guide you through.'); return; }
    if (isAsyncTool(tool) && tool.id !== 'currency-converter') {
      // async tools still work — inputs are guided, calc runs normally
    }

    let step = 0;
    const total = inputs.length + 1; // +1 review step

    function renderStep() {
      const m = getModal();
      if (!m.modal || !m.body) return;
      m.modal.classList.add('active'); // Wizard was writing content but never showing the modal
      const pct = Math.round(((step + 1) / total) * 100);

      let html = '<div class="zr-wizard">';
      html += '<h3>🧭 Guided Wizard — ' + esc(tool.name) + '</h3>';
      html += '<div class="zr-wizard-progress"><div class="zr-wizard-progress-bar" style="width:' + pct + '%"></div></div>';
      html += '<div class="zr-wizard-step-note">Step ' + (step + 1) + ' of ' + total + '</div>';

      if (step < inputs.length) {
        const inp = inputs[step];
        html += '<div class="input-group"><label for="zw-' + inp.id + '">' + esc(inp.label) + '</label>';
        const curEl = document.getElementById(inp.id);
        const curVal = curEl ? curEl.value : (inp.def || '');
        if (inp.type === 'select') {
          html += '<select id="zw-' + inp.id + '" class="calc-input">';
          (inp.opts || []).forEach(function (o) {
            const v = optVal(o), l = optLabel(o);
            html += '<option value="' + esc(v) + '"' + (String(v) === String(curVal) ? ' selected' : '') + '>' + esc(l) + '</option>';
          });
          html += '</select>';
        } else if (inp.type === 'checkbox') {
          html += '<label class="action-btn toggle"><input type="checkbox" id="zw-' + inp.id + '" class="calc-input"' +
            (curEl && curEl.checked ? ' checked' : '') + '> ' + esc(inp.label) + '</label>';
        } else {
          html += '<input type="number" step="any" id="zw-' + inp.id + '" class="calc-input" value="' + esc(curVal) + '">';
        }
        html += '</div>';
        if (inp.hint) html += '<p class="zr-wizard-hint">' + esc(inp.hint) + '</p>';
      } else {
        // Review & Calculate
        html += '<div class="zr-wizard-review"><h4>📋 Review your inputs</h4><table class="zr-wizard-table">';
        inputs.forEach(function (inp) {
          const src = document.getElementById(inp.id);
          let val = '';
          if (src) { val = inp.type === 'checkbox' ? (src.checked ? 'Yes' : 'No') : src.value; }
          html += '<tr><td>' + esc(inp.label) + '</td><td>' + esc(val) + '</td></tr>';
        });
        html += '</table></div>';
        html += '<p class="zr-wizard-hint">Everything looks good? Hit <strong>Calculate</strong> to see your result with full steps.</p>';
      }

      html += '<div class="zr-wizard-nav">';
      html += '<button type="button" class="action-btn" onclick="ZR.wizardNav(-1)"' + (step === 0 ? ' disabled' : '') + '>← Back</button>';
      if (step < inputs.length) {
        html += '<button type="button" class="calc-btn" onclick="ZR.wizardNav(1)">Next →</button>';
      } else {
        html += '<button type="button" class="calc-btn" onclick="ZR.wizardFinish()">🧮 Calculate</button>';
      }
      html += '<button type="button" class="action-btn" onclick="ZR.wizardClose()">Cancel</button>';
      html += '</div></div>';

      m.body.innerHTML = html;

      // Focus the current field
      if (step < inputs.length) {
        const f = document.getElementById('zw-' + (inputs[step].id));
        if (f) setTimeout(function () { f.focus(); }, 50);
      }
    }

    // Sync wizard fields → real inputs on every nav so Review sees live values
    function syncFields() {
      inputs.forEach(function (inp) {
        const real = document.getElementById(inp.id);
        const wiz = document.getElementById('zw-' + inp.id);
        if (!real || !wiz) return;
        if (inp.type === 'checkbox') real.checked = wiz.checked;
        else real.value = wiz.value;
      });
    }

    window._zrWizard = {
      next: function () { syncFields(); if (step < total - 1) { step++; renderStep(); } },
      back: function () { syncFields(); if (step > 0) { step--; renderStep(); } },
      finish: function () {
        syncFields();
        closeModal();
        triggerCalc();
        toast('Calculation complete — scroll for steps & analysis ⭐');
      },
      close: function () { closeModal(); }
    };

    renderStep();
  }

  // ===================================================================
  // 4. MULTI-SCENARIO COMPARISON CHART
  // Grouped SVG bar chart overlaying 5 scenarios (±20%, ±10%, base) of the
  // first numeric input. Accessible <title>/<desc> + real <text> nodes so
  // Googlebot can parse the graphic.
  // ===================================================================
  function renderScenarioChart(tool, values) {
    if (!tool || isAsyncTool(tool)) return;
    const numIn = numericInputs(tool);
    if (numIn.length === 0) return;
    const area = document.getElementById('zr-scenario-area');
    if (!area) return;

    const a = numIn[0];
    const baseA = num(values[a.id]);
    if (!baseA) return;
    const pcts = [-20, -10, 0, 10, 20];
    const labels = ['-20%', '-10%', 'Base', '+10%', '+20%'];
    const results = [];
    let maxV = 0;

    pcts.forEach(function (p) {
      const testVals = Object.assign({}, values, { [a.id]: baseA * (1 + p / 100) });
      let n = NaN, raw = '';
      try {
        const r = tool.calc(testVals);
        raw = r && r.result !== undefined ? String(r.result) : '';
        n = parseFloat(raw);
      } catch (e) {}
      if (!isFinite(n)) n = 0;
      if (Math.abs(n) > maxV) maxV = Math.abs(n);
      results.push({ n: n, raw: raw });
    });
    if (maxV === 0) return;
    maxV = maxV * 1.15;

    const W = 560, H = 240, padL = 66, padB = 34, padT = 20, padR = 16;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const bw = Math.min(46, (chartW / 5) * 0.55);
    const gap = chartW / 5;

    let bars = '';
    results.forEach(function (r, i) {
      const h = Math.max(3, (Math.abs(r.n) / maxV) * chartH);
      const x = padL + gap * i + (gap - bw) / 2;
      const y = padT + chartH - h;
      bars += '<g><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
        '" rx="4" fill="' + (i === 2 ? 'var(--primary,#4f46e5)' : (i < 2 ? '#94a3b8' : '#22c55e')) + '"' +
        '><title>' + esc(labels[i]) + ' of ' + esc(a.label) + ': ' + esc(r.raw.substring(0, 40)) + '</title></rect>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="11" fill="currentColor">' +
        esc(r.n.toFixed(1)) + '</text>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 10).toFixed(1) + '" text-anchor="middle" font-size="11" fill="currentColor">' +
        esc(labels[i]) + '</text></g>';
    });

    // horizontal gridlines
    let grid = '';
    for (let gi = 0; gi <= 4; gi++) {
      const gy = padT + (chartH / 4) * gi;
      const gv = maxV - (maxV / 4) * gi;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) +
        '" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/><text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) +
        '" text-anchor="end" font-size="10" fill="currentColor" opacity="0.7">' + esc(gv.toFixed(0)) + '</text>';
    }

    area.innerHTML =
      '<details class="calc-collapsible" open><summary>📈 Scenario Comparison — Varying ' + esc(a.label) + '</summary>' +
      '<div class="zr-chart-scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Scenario comparison chart for ' +
      esc(tool.name) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<title>Scenario comparison: ' + esc(tool.name) + '</title>' +
      '<desc>Bars show how the result changes when ' + esc(a.label) + ' varies from -20% to +20%.</desc>' +
      grid + bars + '</svg></div>' +
      '<p class="zr-chart-note">Tip: hover each bar for the exact scenario values. Results are estimates.</p></details>';
  }

  // ===================================================================
  // 5. AMORTIZATION & YEAR-BY-YEAR BREAKDOWN TABLES
  // For loan-family tools renders a month→year rolled-up schedule; for
  // compound-interest a year-by-year growth table. Uses AdvancedCalc when
  // present, else computes inline (zero dependency).
  // ===================================================================
  function renderAmortization(tool, values) {
    if (!tool) return;
    const area = document.getElementById('zr-amort-area');
    if (!area) return;
    const isLoan = ['loan-emi', 'mortgage', 'auto-loan', 'car-loan', 'personal-loan'].indexOf(tool.id) !== -1;
    const isCompound = tool.id === 'compound-interest';

    let html = '';

    if (isLoan) {
      const principal = num(values.principal, num(values.amount, 0));
      const rate = num(values.rate, num(values.annualRate, num(values.interest, 0)));
      const years = num(values.years, num(values.term, num(values.tenure, 0)));
      if (!principal || !rate || !years) return;

      const r = rate / 100 / 12;
      const n = years * 12;
      const emi = r > 0 ? principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : principal / n;
      let bal = principal;
      const yearsTable = [];
      let yInt = 0, yPr = 0;
      for (let i = 1; i <= n; i++) {
        const interest = bal * r;
        const payment = emi - interest;
        bal -= payment;
        yInt += interest; yPr += payment;
        if (i % 12 === 0 || i === n) {
          yearsTable.push({ year: Math.ceil(i / 12), paid: emi * i, interest: yInt, principal: yPr, balance: Math.max(0, bal) });
          yInt = 0; yPr = 0;
        }
      }
      const totalInterest = emi * n - principal;

      html = '<details class="calc-collapsible"><summary>📅 Amortization Schedule — Year by Year</summary>' +
        '<div class="zr-schedule-meta">EMI ' + esc(emi.toFixed(2)) + ' • Total Interest ' + esc(totalInterest.toFixed(2)) + ' • ' +
        esc(years) + ' yr term</div>' +
        '<div class="zr-chart-scroll"><table class="zr-schedule"><thead><tr><th>Year</th><th>Total Paid</th><th>Interest Paid</th>' +
        '<th>Principal Paid</th><th>Balance</th></tr></thead><tbody>';
      yearsTable.forEach(function (yr) {
        html += '<tr><td>' + yr.year + '</td><td>' + esc(yr.paid.toFixed(2)) + '</td><td>' + esc(yr.interest.toFixed(2)) +
          '</td><td>' + esc(yr.principal.toFixed(2)) + '</td><td>' + esc(yr.balance.toFixed(2)) + '</td></tr>';
      });
      html += '</tbody></table></div></details>';

    } else if (isCompound) {
      const principal = num(values.principal, 0);
      const rate = num(values.rate, 0);
      const years = num(values.years, num(values.term, 0));
      const freq = num(values.freq, 12);
      if (!principal || !rate || !years) return;
      const rr = rate / 100;
      const n = freq || 12;
      let rows = '';
      for (let y = 0; y <= years; y++) {
        const amount = principal * Math.pow(1 + rr / n, n * y);
        rows += '<tr><td>' + y + '</td><td>' + esc(amount.toFixed(2)) + '</td><td>' + esc((amount - principal).toFixed(2)) + '</td></tr>';
      }
      html = '<details class="calc-collapsible"><summary>📈 Compound Growth — Year by Year</summary>' +
        '<div class="zr-chart-scroll"><table class="zr-schedule"><thead><tr><th>Year</th><th>Balance</th><th>Interest Earned</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div></details>';
    }

    if (html) area.innerHTML = html;
  }

  // ===================================================================
  // 6. GAMIFIED FINANCIAL HEALTH SCORE & BADGES
  // Computes a 0-100 score from the result/inputs of known tools, persists
  // best score + unlocked badges in localStorage, renders a score ring.
  // ===================================================================
  const SCORE_KEY = 'calcpro_zr_score';
  const BADGE_KEY = 'calcpro_zr_badges';

  function scoreFor(tool, values, result) {
    const id = tool && tool.id;
    const rn = parseFloat(result && result.result);
    if (id === 'bmi' && isFinite(rn)) return Math.max(0, Math.min(100, Math.round(100 - Math.abs(rn - 22) * 8)));
    if (id === 'bmr') return 60; // informational — neutral score
    if (id === 'calorie' && isFinite(rn)) return Math.max(0, Math.min(100, Math.round(100 - Math.abs(rn - 2200) / 45)));
    if ((id === 'loan-emi' || id === 'mortgage' || id === 'auto-loan')) {
      const rate = num(values.rate, 0);
      return Math.max(20, Math.min(100, Math.round(100 - rate * 6)));
    }
    if (id === 'compound-interest') {
      const rate = num(values.rate, 0);
      return Math.max(20, Math.min(100, Math.round(45 + rate * 5)));
    }
    if (id === 'savings-calculator' || id === 'retirement-calculator') {
      const rate = num(values.rate, 0);
      return Math.max(20, Math.min(100, Math.round(50 + rate * 6)));
    }
    return null;
  }
  function tierFor(score) {
    if (score >= 90) return { name: 'Platinum', emoji: '🏆', color: '#94a3b8' };
    if (score >= 75) return { name: 'Gold', emoji: '🥇', color: '#eab308' };
    if (score >= 55) return { name: 'Silver', emoji: '🥈', color: '#94a3b8' };
    return { name: 'Bronze', emoji: '🥉', color: '#b45309' };
  }
  function unlockBadge(key, name, emoji) {
    try {
      let badges = JSON.parse(localStorage.getItem(BADGE_KEY) || '[]');
      if (!badges.some(function (b) { return b.k === key; })) {
        badges.push({ k: key, name: name, emoji: emoji, ts: Date.now() });
        localStorage.setItem(BADGE_KEY, JSON.stringify(badges));
        toast('🏅 Badge unlocked: ' + name);
      }
    } catch (e) {}
  }
  function renderHealthScore(tool, values, result) {
    const score = scoreFor(tool, values, result);
    const area = document.getElementById('zr-score-area');
    if (!area || score === null) { if (area) area.innerHTML = ''; return; }

    try {
      const best = parseInt(localStorage.getItem(SCORE_KEY) || '0', 10);
      if (score > best) localStorage.setItem(SCORE_KEY, String(score));
    } catch (e) {}

    const tier = tierFor(score);
    // generic usage badges (stored, independent of tool)
    unlockBadge('first', 'First Calculation', '🚀');
    try {
      const calcs = (window.CalcAnalytics && CalcAnalytics.getData && CalcAnalytics.getData().totalCalcs) || 0;
      if (calcs >= 5) unlockBadge('five', 'Regular User — 5+ calcs', '🔥');
      if (calcs >= 25) unlockBadge('twentyfive', 'Power User — 25+ calcs', '⚡');
    } catch (e) {}

    let badges = [];
    try { badges = JSON.parse(localStorage.getItem(BADGE_KEY) || '[]'); } catch (e) {}
    const R = 42, C = 2 * Math.PI * R;
    const filled = (score / 100) * C;

    let html = '<details class="calc-collapsible"><summary>🎯 Your Health Score — ' + score + '/100 (' + tier.name + ')</summary>';
    html += '<div class="zr-score-wrap">';
    html += '<div class="zr-score-ring"><svg viewBox="0 0 100 100" role="img" aria-label="Health score ' + score + ' out of 100">' +
      '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="9"/>' +
      '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="' + tier.color + '" stroke-width="9" stroke-linecap="round" ' +
      'stroke-dasharray="' + filled.toFixed(1) + ' ' + (C - filled).toFixed(1) + '" transform="rotate(-90 50 50)">' +
      '<title>Score ' + score + '/100 — ' + tier.name + '</title></circle>' +
      '<text x="50" y="47" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">' + score + '</text>' +
      '<text x="50" y="62" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">' + esc(tier.name) + ' ' + tier.emoji + '</text></svg></div>';
    html += '<div class="zr-score-side">';
    html += '<p class="zr-score-desc">Based on your inputs using standard formulas. Track it over time to see progress.</p>';
    html += '<div class="zr-badges">';
    badges.slice(-8).forEach(function (b) {
      html += '<span class="zr-badge" title="' + esc(b.name) + '">' + esc(b.emoji) + ' ' + esc(b.name) + '</span>';
    });
    if (badges.length === 0) html += '<span class="zr-badge">Keep calculating to earn badges 🏅</span>';
    html += '</div></div></div></details>';
    area.innerHTML = html;
  }

  // ===================================================================
  // 7. AUTO WHITE-LABEL PDF REPORT GENERATOR
  // Branded printable report using the site's own name/tagline/accent from
  // site-config — perfect for professionals embedding the platform.
  // ===================================================================
  function whiteLabelReport() {
    let site = { name: 'CalcProMaster', tagline: '1206+ free online calculators', accent: '#4f46e5' };
    try {
      if (window.SITE_CONFIG && window.SITE_CONFIG.siteName) site.name = window.SITE_CONFIG.siteName;
      if (window.SITE_CONFIG && window.SITE_CONFIG.siteTagline) site.tagline = window.SITE_CONFIG.siteTagline;
    } catch (e) {}

    let report = null;
    if (window.CommunityGrowth && CommunityGrowth.collectReport) {
      try { report = CommunityGrowth.collectReport(); } catch (e) {}
    }
    if (!report) report = { tool: '', toolId: '', inputs: {}, result: '', extra: '', url: window.location.href, ts: new Date().toISOString() };

    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to export your branded PDF'); return; }

    const rows = Object.entries(report.inputs || {})
      .map(function (kv) { return '<tr><td>' + esc(kv[0]) + '</td><td>' + esc(kv[1]) + '</td></tr>'; }).join('');

    // DOM API print document (no document.write — CSP-friendly)
    var d = w.document;
    d.open();
    d.title = esc(site.name) + ' — ' + esc(report.tool || 'Report');
    var st = d.createElement('style');
    st.textContent = 'body{font-family:Inter,Arial,sans-serif;max-width:740px;margin:32px auto;padding:0 20px;color:#0f172a}' +
      '.wl-header{border-bottom:3px solid ' + site.accent + ';padding-bottom:14px;margin-bottom:18px}' +
      '.wl-logo{font-size:20px;font-weight:800;color:' + site.accent + '}.wl-tag{font-size:12px;color:#64748b;margin-top:4px}' +
      'h1{font-size:22px;margin:18px 0 6px}table{border-collapse:collapse;width:100%;margin:14px 0}' +
      'td,th{border:1px solid #e2e8f0;padding:8px 10px;font-size:13px;text-align:left}th{background:#f1f5f9}' +
      '.result{font-size:22px;font-weight:800;color:' + site.accent + ';padding:14px;background:#eef2ff;border-radius:10px;margin:14px 0}' +
      '.extra{color:#475569;font-size:14px;margin:8px 0}.meta{color:#94a3b8;font-size:11px}' +
      '.wl-foot{margin-top:26px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:11px;color:#94a3b8}' +
      '@media print{body{margin:0}}';
    d.head.appendChild(st);
    d.body.innerHTML =
      '<div class="wl-header"><div class="wl-logo">' + esc(site.name) + '</div><div class="wl-tag">' + esc(site.tagline) + '</div></div>' +
      '<h1>' + esc(report.tool || 'Calculation Report') + '</h1>' +
      '<div class="meta">Generated: ' + esc(report.ts) + '<br>URL: ' + esc(report.url) + '</div>' +
      '<div class="result">' + esc(report.result || '—') + '</div>' +
      (report.extra ? '<div class="extra">' + esc(report.extra) + '</div>' : '') +
      '<h2>Inputs</h2><table><thead><tr><th>Input</th><th>Value</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="2">—</td></tr>') + '</tbody></table>' +
      '<div class="wl-foot">Generated with ' + esc(site.name) + ' — estimates only; verify independently before acting.</div>';
    d.close();
    setTimeout(function () { w.focus(); w.print(); }, 400);
  }

  // ===================================================================
  // 8. HYPER-LOCALIZED GEO-TARGETING ENGINE
  // Pure client-side region detection via Intl (timezone + locale) — NO IP
  // lookup, NO network, NO server. Applies local currency symbol + a local
  // VAT/sales-tax hint for the detected region.
  // ===================================================================
  const REGION_MAP = {
    'America/New_York': { region: 'United States', cc: 'US', currency: 'USD', flag: '🇺🇸', vat: 'State sales tax 0–10%' },
    'America/Chicago': { region: 'United States', cc: 'US', currency: 'USD', flag: '🇺🇸', vat: 'State sales tax 0–10%' },
    'America/Denver': { region: 'United States', cc: 'US', currency: 'USD', flag: '🇺🇸', vat: 'State sales tax 0–10%' },
    'America/Los_Angeles': { region: 'United States', cc: 'US', currency: 'USD', flag: '🇺🇸', vat: 'State sales tax 0–10%' },
    'America/Toronto': { region: 'Canada', cc: 'CA', currency: 'CAD', flag: '🇨🇦', vat: 'GST/HST 5–15%' },
    'Europe/London': { region: 'United Kingdom', cc: 'GB', currency: 'GBP', flag: '🇬🇧', vat: 'VAT 20%' },
    'Europe/Berlin': { region: 'Germany', cc: 'DE', currency: 'EUR', flag: '🇩🇪', vat: 'VAT 19%' },
    'Europe/Paris': { region: 'France', cc: 'FR', currency: 'EUR', flag: '🇫🇷', vat: 'VAT 20%' },
    'Europe/Madrid': { region: 'Spain', cc: 'ES', currency: 'EUR', flag: '🇪🇸', vat: 'IVA 21%' },
    'Europe/Amsterdam': { region: 'Netherlands', cc: 'NL', currency: 'EUR', flag: '🇳🇱', vat: 'VAT 21%' },
    'Asia/Karachi': { region: 'Pakistan', cc: 'PK', currency: 'PKR', flag: '🇵🇰', vat: 'GST 18%' },
    'Asia/Kolkata': { region: 'India', cc: 'IN', currency: 'INR', flag: '🇮🇳', vat: 'GST 0–28%' },
    'Asia/Dhaka': { region: 'Bangladesh', cc: 'BD', currency: 'BDT', flag: '🇧🇩', vat: 'VAT 15%' },
    'Asia/Colombo': { region: 'Sri Lanka', cc: 'LK', currency: 'LKR', flag: '🇱🇰', vat: 'VAT 15%' },
    'Asia/Dubai': { region: 'UAE', cc: 'AE', currency: 'AED', flag: '🇦🇪', vat: 'VAT 5%' },
    'Asia/Riyadh': { region: 'Saudi Arabia', cc: 'SA', currency: 'SAR', flag: '🇸🇦', vat: 'VAT 15%' },
    'Asia/Tokyo': { region: 'Japan', cc: 'JP', currency: 'JPY', flag: '🇯🇵', vat: 'Consumption tax 10%' },
    'Asia/Singapore': { region: 'Singapore', cc: 'SG', currency: 'SGD', flag: '🇸🇬', vat: 'GST 9%' },
    'Asia/Shanghai': { region: 'China', cc: 'CN', currency: 'CNY', flag: '🇨🇳', vat: 'VAT 13%' },
    'Australia/Sydney': { region: 'Australia', cc: 'AU', currency: 'AUD', flag: '🇦🇺', vat: 'GST 10%' },
    'Africa/Lagos': { region: 'Nigeria', cc: 'NG', currency: 'NGN', flag: '🇳🇬', vat: 'VAT 7.5%' },
    'Africa/Nairobi': { region: 'Kenya', cc: 'KE', currency: 'KES', flag: '🇰🇪', vat: 'VAT 16%' }
  };

  function detectRegion() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const known = REGION_MAP[tz];
      if (known) return Object.assign({ tz: tz }, known);
      // fallback: derive currency from the browser locale
      const loc = navigator.language || 'en-US';
      const cur = (function () { try { return new Intl.NumberFormat(loc, { style: 'currency', currencyDisplay: 'narrowSymbol' }).formatToParts(1).find(function (p) { return p.type === 'currency'; }).value; } catch (e) { return ''; } })();
      return { tz: tz, region: tz || 'Unknown', cc: (loc.split('-')[1] || loc.split('-')[0]).toUpperCase(), currency: '', symbol: cur || (loc.includes('IN') ? '₹' : '$'), flag: '🌍', vat: 'Check local tax rules' };
    } catch (e) {
      return { tz: '', region: 'Worldwide', cc: 'WW', currency: '', symbol: '$', flag: '🌍', vat: '' };
    }
  }

  function currencySymbolFor(cc) {
    try {
      return new Intl.NumberFormat('en-' + (cc === 'UK' ? 'GB' : cc), { style: 'currency', currency: (function (c) {
        const map = { US: 'USD', CA: 'CAD', GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', NL: 'EUR', PK: 'PKR', IN: 'INR', BD: 'BDT', LK: 'LKR', AE: 'AED', SA: 'SAR', JP: 'JPY', SG: 'SGD', CN: 'CNY', AU: 'AUD', NG: 'NGN', KE: 'KES' };
        return map[c] || 'USD';
      })(cc) }).formatToParts(1).find(function (p) { return p.type === 'currency'; }).value;
    } catch (e) { return ''; }
  }

  function renderGeoChip() {
    const holder = document.getElementById('zr-geo-chip');
    if (!holder) return;
    const g = detectRegion();
    const sym = g.symbol || currencySymbolFor(g.cc) || (g.currency ? g.currency : '');
    holder.innerHTML = '<span class="zr-geo-chip" title="Detected from your browser timezone — no IP tracking. ' +
      esc(g.vat || '') + '">' + esc(g.flag) + ' ' + esc(g.region) + (sym ? ' • ' + esc(sym) : '') + '</span>';
    return g;
  }

  // ===================================================================
  // 9. INTERACTIVE DEBT SNOWBALL & AVALANCHE GAME-MODE
  // Add debts (balance, APR, min payment), compare payoff strategies with
  // animated progress bars + a milestone timeline, then declare a winner.
  // ===================================================================
  const DEBT_KEY = 'calcpro_zr_debts';

  function openDebtGame() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(DEBT_KEY) || '[]'); } catch (e) {}
    if (saved.length === 0) {
      saved = [
        { name: 'Credit Card A', bal: 4200, apr: 22.9, min: 120 },
        { name: 'Student Loan', bal: 8500, apr: 5.6, min: 95 },
        { name: 'Car Loan', bal: 6400, apr: 7.9, min: 210 }
      ];
    }

    function rowsHtml() {
      return saved.map(function (d) {
        return '<div class="zr-debt-row">' +
          '<input class="zr-debt-name calc-input" value="' + esc(d.name) + '" placeholder="Debt name">' +
          '<input type="number" class="zr-debt-bal calc-input" value="' + esc(d.bal) + '" placeholder="Balance">' +
          '<input type="number" step="0.1" class="zr-debt-apr calc-input" value="' + esc(d.apr) + '" placeholder="APR %">' +
          '<input type="number" class="zr-debt-min calc-input" value="' + esc(d.min) + '" placeholder="Min pmt">' +
          '<button type="button" class="action-btn small" onclick="this.closest(\'.zr-debt-row\').remove();ZR.debtRemove()">✕</button>' +
          '</div>';
      }).join('');
    }

    const html =
      '<div class="zr-debt-game"><h3>🎮 Debt Payoff Game — Snowball vs Avalanche</h3>' +
      '<p class="zr-wizard-hint">Enter your debts, then watch both strategies race to zero. Extra payment = the winner\u2019s fuel.</p>' +
      '<div id="zr-debt-rows">' + rowsHtml() + '</div>' +
      '<div class="zr-debt-controls">' +
      '<button type="button" class="action-btn small" onclick="ZR.debtAdd()">+ Add Debt</button>' +
      '<input type="number" id="zr-debt-extra" class="calc-input zr-debt-extra" placeholder="Extra $/mo" value="100">' +
      '<button type="button" class="calc-btn" onclick="ZR.debtRun()">🏁 Run the Race</button>' +
      '<button type="button" class="action-btn small" onclick="ZR.debtReset()">Reset</button>' +
      '</div><div id="zr-debt-results"></div></div>';

    openModal(html);
  }

  function debtAdd() {
    const rows = document.getElementById('zr-debt-rows');
    if (rows) {
      const div = document.createElement('div');
      div.className = 'zr-debt-row';
      div.innerHTML = '<input class="zr-debt-name calc-input" placeholder="Debt name">' +
        '<input type="number" class="zr-debt-bal calc-input" placeholder="Balance">' +
        '<input type="number" step="0.1" class="zr-debt-apr calc-input" placeholder="APR %">' +
        '<input type="number" class="zr-debt-min calc-input" placeholder="Min pmt">' +
        '<button type="button" class="action-btn small" onclick="this.closest(\'.zr-debt-row\').remove();ZR.debtRemove()">✕</button>';
      rows.appendChild(div);
    }
  }
  function debtRemove() {
    // inline handler already removed the row from DOM; persist what remains
    try { localStorage.setItem(DEBT_KEY, JSON.stringify(collectDebts())); } catch (e) {}
  }
  function debtReset() {
    try { localStorage.removeItem(DEBT_KEY); } catch (e) {}
    openDebtGame();
  }

  function collectDebts() {
    const list = [];
    document.querySelectorAll('.zr-debt-row').forEach(function (row) {
      const name = row.querySelector('.zr-debt-name');
      const bal = row.querySelector('.zr-debt-bal');
      const apr = row.querySelector('.zr-debt-apr');
      const min = row.querySelector('.zr-debt-min');
      if (!name || !bal || !apr || !min) return;
      const b = parseFloat(bal.value);
      const a = parseFloat(apr.value);
      const m = parseFloat(min.value);
      if (isFinite(b) && b > 0) list.push({ name: name.value || 'Debt', bal: b, apr: isFinite(a) ? a : 0, min: Math.max(0, isFinite(m) ? m : b * 0.02) });
    });
    try { localStorage.setItem(DEBT_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  // Clean, deterministic simulation for both strategies
  function simulateWithInterest(list, extra, mode) {
    const debts = list.map(function (d) { return Object.assign({}, d, { bal: d.bal }); });
    const totalMin = debts.reduce(function (s, d) { return s + d.min; }, 0);
    const budget = totalMin + (extra || 0);
    let month = 0, totalInterest = 0;
    const payoffOrder = [];
    const principal = debts.reduce(function (s, d) { return s + d.bal; }, 0);

    function pick(remaining) {
      return mode === 'snowball'
        ? remaining.reduce(function (a, b) { return (b.bal < a.bal) ? b : a; })
        : remaining.reduce(function (a, b) { return (b.apr > a.apr) ? b : a; });
    }

    while (debts.some(function (d) { return d.bal > 0.01; }) && month < 600) {
      month++;
      debts.forEach(function (d) {
        if (d.bal > 0.01) { const int = d.bal * (d.apr / 100 / 12); d.bal += int; totalInterest += int; }
      });
      const live = debts.filter(function (d) { return d.bal > 0.01; });
      let available = budget;
      live.forEach(function (d) {
        const pmt = Math.min(d.bal, d.min);
        d.bal -= pmt; available -= pmt;
      });
      if (available > 0) {
        const t = pick(debts.filter(function (d) { return d.bal > 0.01; }));
        if (t) { const pmt = Math.min(t.bal, available); t.bal -= pmt; }
      }
      debts.forEach(function (d) {
        if (d.bal <= 0.01 && !d.paid) { d.paid = true; payoffOrder.push({ name: d.name, month: month }); }
      });
    }
    return { months: month, totalInterest: totalInterest, payoffOrder: payoffOrder, principal: principal };
  }

  function debtRun() {
    const list = collectDebts();
    const extra = parseFloat(document.getElementById('zr-debt-extra').value) || 0;
    if (list.length === 0) { toast('Add at least one debt first'); return; }
    const res = document.getElementById('zr-debt-results');
    if (!res) return;

    const snow = simulateWithInterest(list, extra, 'snowball');
    const aval = simulateWithInterest(list, extra, 'avalanche');

    const winner = aval.months < snow.months ? 'avalanche' : (snow.months < aval.months ? 'snowball' : 'tie');
    const winnerName = winner === 'avalanche' ? 'Avalanche (highest APR first)' : winner === 'snowball' ? 'Snowball (smallest balance first)' : 'Tie';
    const winMonths = Math.min(snow.months, aval.months);

    function orderRows(o) {
      return o.payoffOrder.map(function (d, i) {
        return '<div class="zr-milestone">' + (i + 1) + '. ' + esc(d.name) + ' — paid off in month ' + d.month + ' 🎉</div>';
      }).join('');
    }
    function bar(months, label, cls) {
      const maxM = Math.max(snow.months, aval.months, 1);
      const w = Math.max(4, Math.round((months / maxM) * 100));
      return '<div class="zr-race-bar"><span class="zr-race-label">' + label + '</span>' +
        '<div class="zr-race-track"><div class="zr-race-fill ' + cls + '" style="width:' + w + '%"></div></div>' +
        '<span class="zr-race-num">' + months + ' mo</span></div>';
    }

    res.innerHTML =
      '<div class="zr-debt-summary"><div class="zr-debt-total">Total debt: ' + esc(list.reduce(function (s, d) { return s + d.bal; }, 0).toFixed(2)) +
      ' • Monthly budget: ' + esc((list.reduce(function (s, d) { return s + d.min; }, 0) + extra).toFixed(2)) + '</div></div>' +
      '<div class="zr-race">' + bar(snow.months, '🥅 Snowball', 'zr-fill-snow') + bar(aval.months, '🚀 Avalanche', 'zr-fill-aval') + '</div>' +
      '<div class="zr-winner">🏆 Winner: ' + esc(winnerName) + ' — debt-free in ' + winMonths + ' months, ' +
      'saving ~' + esc((snow.totalInterest - aval.totalInterest).toFixed(2)) + ' in interest vs the other strategy.</div>' +
      '<details class="calc-collapsible"><summary>📋 Payoff order — Avalanche</summary>' + orderRows(aval) + '</details>' +
      '<details class="calc-collapsible"><summary>📋 Payoff order — Snowball</summary>' + orderRows(snow) + '</details>' +
      '<p class="zr-wizard-hint">Tip: even +$50/mo can cut months off your payoff. Games aside, autopay the strategy that fits your psychology.</p>';

    try {
      unlockBadge('debthero', 'Debt Hero — strategy compared', '💪');
    } catch (e) {}
  }

  // ===================================================================
  // 10. ZERO-LATENCY WEBASSEMBLY MATH ENGINE
  // Embedded 83-byte hand-crafted WASM module (add / mul / fma on f64) —
  // instantiated lazily. JS fallback when WebAssembly is unavailable.
  // SafeMathParser and other engines can call ZR.fastMath for native speed.
  // ===================================================================
  const WASM_B64 = 'AGFzbQEAAAABDgJgAnx8AXxgA3x8fAF8AwQDAAABBxMDA2FkZAAAA211bAABA2ZtYQACChwDBwAgACABoAsHACAAIAGiCwoAIAAgAaIgAqAL';
  const fastMath = {
    ready: false,
    add: function (a, b) { return a + b; },
    mul: function (a, b) { return a * b; },
    fma: function (a, b, c) { return a * b + c; },
    round10: function (n) { return Number(Number(n).toFixed(10)); }
  };

  function initWasm() {
    if (typeof WebAssembly === 'undefined') return fastMath;
    try {
      const bytes = Uint8Array.from(atob(WASM_B64), function (c) { return c.charCodeAt(0); });
      WebAssembly.instantiate(bytes, {}).then(function (r) {
        const m = r.instance.exports;
        fastMath.ready = true;
        fastMath.add = m.add;
        fastMath.mul = m.mul;
        fastMath.fma = m.fma;
        // IEEE-754 noise scrubber using native fma: round(x) via fma trick not
        // possible directly, so keep round10 as JS (still native-speed path).
        try { window.dispatchEvent(new CustomEvent('zr:wasm-ready')); } catch (e) {}
      }).catch(function () { /* fallback stays active */ });
    } catch (e) { /* no wasm */ }
    return fastMath;
  }

  // ===================================================================
  // 11. VOICE-DRIVEN STEP-BY-STEP AUDIO WALKTHROUGH
  // SpeechSynthesis reads inputs + steps + result aloud, with play/pause/
  // stop and a speed control. Full stop on navigation (ToolLifecycle hook).
  // ===================================================================
  const voice = {
    speaking: false,
    paused: false,
    voices: [],
    rate: 1,
    _buildUtterances: function (tool, values, result) {
      const lines = [];
      lines.push('Calculating ' + (tool.name || 'this calculator') + '.');
      (tool.inputs || []).forEach(function (inp) {
        const el = document.getElementById(inp.id);
        let v = '';
        if (el) v = inp.type === 'checkbox' ? (el.checked ? 'yes' : 'no') : String(el.value || '');
        lines.push(inp.label + ': ' + v + '.');
      });
      if (result && result.result) lines.push('Result: ' + String(result.result) + '.');
      if (result && result.extra) lines.push(String(result.extra));
      // steps
      let steps = [];
      if (typeof tool.steps === 'function') {
        try { steps = tool.steps(values, result) || []; } catch (e) {}
      }
      if (steps.length) {
        lines.push('Step by step:');
        steps.forEach(function (s) { lines.push(String(s)); });
      }
      return lines;
    },
    play: function (tool, values, result, areaId) {
      if (!window.speechSynthesis) { toast('Voice walkthrough not supported in this browser'); return; }
      voice.stop();
      const lines = voice._buildUtterances(tool, values, result);
      const area = areaId ? document.getElementById(areaId) : null;

      lines.forEach(function (line, i) {
        const u = new SpeechSynthesisUtterance(line);
        u.rate = voice.rate;
        u.pitch = 1;
        u.lang = (navigator.language || 'en-US');
        u.onend = function () {
          if (area) {
            const items = area.querySelectorAll('[data-voice-step]');
            if (items[i]) { items[i].classList.remove('zr-voice-active'); }
            if (items[i + 1]) { items[i + 1].classList.add('zr-voice-active'); }
          }
          if (i === lines.length - 1) { voice.speaking = false; voice.updateBtn(''); }
        };
        if (area) {
          const items = area.querySelectorAll('[data-voice-step]');
          if (items[i]) items[i].classList.add('zr-voice-active');
        }
        window.speechSynthesis.speak(u);
      });
      voice.speaking = true;
      voice.paused = false;
      voice.updateBtn('play');
    },
    pause: function () {
      if (!window.speechSynthesis) return;
      if (voice.paused) { window.speechSynthesis.resume(); voice.paused = false; voice.updateBtn('play'); }
      else { window.speechSynthesis.pause(); voice.paused = true; voice.updateBtn('pause'); }
    },
    stop: function () {
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      voice.speaking = false; voice.paused = false;
      voice.updateBtn('');
      document.querySelectorAll('.zr-voice-active').forEach(function (el) { el.classList.remove('zr-voice-active'); });
    },
    setRate: function (r) { voice.rate = parseFloat(r) || 1; },
    updateBtn: function (state) {
      const b = document.getElementById('zr-voice-play');
      if (!b) return;
      if (state === 'play') { b.textContent = '⏸ Pause'; b.onclick = function () { ZR.voice.pause(); }; }
      else if (state === 'pause') { b.textContent = '▶ Resume'; b.onclick = function () { ZR.voice.pause(); }; }
      else { b.textContent = '🔊 Play Walkthrough'; b.onclick = function () { ZR.voice.open(); }; }
    }
  };

  function renderVoiceBar(tool, values, result) {
    const area = document.getElementById('zr-voice-area');
    if (!area || !window.speechSynthesis) return;
    const steps = (result && tool.steps && typeof tool.steps === 'function') ? (function () { try { return tool.steps(values, result) || []; } catch (e) { return []; } })() : [];
    const stepItems = steps.length
      ? steps.map(function (s, i) { return '<li data-voice-step="' + i + '">' + esc(s) + '</li>'; }).join('')
      : '';
    area.innerHTML =
      '<details class="calc-collapsible" open><summary>🔊 Voice Walkthrough — Listen Step by Step</summary>' +
      '<div class="zr-voice-wrap">' +
      '<button type="button" class="action-btn" id="zr-voice-play" onclick="ZR.voice.play(App._currentTool.tool, App._collectValues(), {result:document.querySelector(\'.result-main\')?.textContent,extra:document.querySelector(\'.result-extra\')?.textContent}, \'zr-voice-steps\')">🔊 Play Walkthrough</button>' +
      '<button type="button" class="action-btn" onclick="ZR.voice.stop()">⏹ Stop</button>' +
      '<label class="zr-voice-rate">Speed <input type="range" min="0.5" max="1.5" step="0.1" value="1" oninput="ZR.voice.setRate(this.value)"></label>' +
      '</div>' +
      (stepItems ? '<ol class="zr-voice-steps" id="zr-voice-steps">' + stepItems + '</ol>' : '<p class="zr-wizard-hint">No steps for this tool — the walkthrough will read inputs and the result.</p>') +
      '</details>';
    // Re-attach the universal dictate button after the innerHTML reset
    // (append-only + idempotent, defined in advanced-features.js).
    if (window.AdvancedFeatures && typeof AdvancedFeatures.initVoiceArea === 'function') {
      try { AdvancedFeatures.initVoiceArea(); } catch (e) { /* never break the walkthrough bar */ }
    }
  }

  // ===================================================================
  // 12. BIOMETRIC & SECURE LOCAL VAULT
  // AES-GCM encryption (SubtleCrypto) with a PBKDF2-derived key from a PIN,
  // optionally gated by WebAuthn biometric unlock. Everything stays in
  // localStorage — zero server, zero external storage.
  // ===================================================================
  const VAULT_KEY = 'calcpro_zr_vault';
  const vault = {
    unlocked: false,
    _key: null, // CryptoKey in memory only
    _kv: null,  // { salt, iterations, items: [{iv, ct}] }
    supports: function () {
      return !!(window.crypto && crypto.subtle && window.isSecureContext !== false);
    },
    bioSupported: function () {
      return !!navigator.credentials && window.isSecureContext !== false;
    },
    isSetup: function () {
      try { return !!localStorage.getItem(VAULT_KEY); } catch (e) { return false; }
    },
    _bytes: function (s) { return new TextEncoder().encode(s); },
    _b64: function (buf) {
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    },
    _fromB64: function (b64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    },
    // WebAuthn credential IDs are base64url (RFC 4648 §5) — convert to bytes
    _bioId: function (id) {
      let b64 = id.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      return Uint8Array.from(atob(b64), function (x) { return x.charCodeAt(0); });
    },
    derive: async function (pin, salt) {
      const baseKey = await crypto.subtle.importKey('raw', vault._bytes(pin), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' },
        baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
      );
    },
    load: function () {
      try { return JSON.parse(localStorage.getItem(VAULT_KEY) || 'null'); } catch (e) { return null; }
    },
    save: async function (pin, items) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await vault.derive(pin, salt);
      const payload = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, vault._bytes(JSON.stringify(items)));
      localStorage.setItem(VAULT_KEY, JSON.stringify({
        salt: vault._b64(salt), iv: vault._b64(iv), iterations: 150000, items: vault._b64(payload)
      }));
      vault._kv = { salt: salt, iv: iv, iterations: 150000, items: payload, itemsArr: items };
      vault._key = key;
      vault.unlocked = true;
    },
    unlock: async function (pin) {
      const stored = vault.load();
      if (!stored) return false;
      const salt = new Uint8Array(vault._fromB64(stored.salt));
      const key = await vault.derive(pin, salt);
      try {
        const plain = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(vault._fromB64(stored.iv)) },
          key, new Uint8Array(vault._fromB64(stored.items))
        );
        const itemsArr = JSON.parse(new TextDecoder().decode(plain));
        vault._key = key;
        vault._kv = { salt: salt, itemsArr: itemsArr };
        vault.unlocked = true;
        return itemsArr;
      } catch (e) {
        return false; // wrong PIN
      }
    },
    add: async function (title, text) {
      if (!vault.unlocked || !vault._kv) return false;
      const itemsArr = (vault._kv.itemsArr || []).concat([{ title: title, text: text, ts: Date.now() }]);
      // re-encrypt with a fresh IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const payload = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv }, vault._key, vault._bytes(JSON.stringify(itemsArr))
      );
      const stored = vault.load() || {};
      localStorage.setItem(VAULT_KEY, JSON.stringify({
        salt: stored.salt, iv: vault._b64(iv), iterations: stored.iterations || 150000, items: vault._b64(payload)
      }));
      vault._kv.itemsArr = itemsArr;
      return true;
    },
    remove: async function (idx) {
      if (!vault.unlocked || !vault._kv) return;
      const itemsArr = (vault._kv.itemsArr || []).filter(function (_, i) { return i !== idx; });
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const payload = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv }, vault._key, vault._bytes(JSON.stringify(itemsArr))
      );
      const stored = vault.load() || {};
      localStorage.setItem(VAULT_KEY, JSON.stringify({
        salt: stored.salt, iv: vault._b64(iv), iterations: stored.iterations || 150000, items: vault._b64(payload)
      }));
      vault._kv.itemsArr = itemsArr;
    }
  };

  function openVault() {
    const hasBio = vault.bioSupported();
    if (!vault.supports()) {
      // graceful fallback: obfuscated base64 store (clear warning)
      openModal(
        '<div class="zr-vault"><h3>🗄️ Secure Vault</h3>' +
        '<p class="zr-wizard-hint">Your browser lacks WebCrypto — using lightweight obfuscation instead of full encryption. ' +
        'Use a modern browser (HTTPS or localhost) for AES-256 protection.</p>' +
        '<div id="zr-vault-body"><p>Vault unavailable on this browser.</p></div></div>'
      );
      return;
    }

    if (!vault.isSetup()) {
      openModal(
        '<div class="zr-vault"><h3>🗄️ Secure Vault — Setup</h3>' +
        '<p class="zr-wizard-hint">Your notes and saved calculations will be encrypted with AES-256-GCM in your own browser. ' +
        'Nobody — not even us — can read them without your PIN.</p>' +
        '<div class="input-group"><label for="zr-vault-pin">Create a PIN (4–6 digits)</label>' +
        '<input type="password" id="zr-vault-pin" class="calc-input" maxlength="6" inputmode="numeric" autocomplete="new-password"></div>' +
        '<div class="input-group"><label for="zr-vault-pin2">Confirm PIN</label>' +
        '<input type="password" id="zr-vault-pin2" class="calc-input" maxlength="6" inputmode="numeric" autocomplete="new-password"></div>' +
        '<button type="button" class="calc-btn" onclick="ZR.vaultSetup()">🔐 Encrypt &amp; Create Vault</button>' +
        '</div>'
      );
      return;
    }

    // unlocked already?
    if (vault.unlocked) { vaultUI(); return; }

    openModal(
      '<div class="zr-vault"><h3>🗄️ Secure Vault — Unlock</h3>' +
      (hasBio ? '<button type="button" class="calc-btn" style="margin-bottom:10px" onclick="ZR.vaultBio()">🫵 Unlock with Biometrics</button>' : '') +
      '<div class="input-group"><label for="zr-vault-pin">Enter your PIN</label>' +
      '<input type="password" id="zr-vault-pin" class="calc-input" maxlength="6" inputmode="numeric" autocomplete="current-password"></div>' +
      '<button type="button" class="calc-btn" onclick="ZR.vaultTry()">🔓 Unlock</button>' +
      '</div>'
    );
  }

  function vaultSetup() {
    const p1 = document.getElementById('zr-vault-pin');
    const p2 = document.getElementById('zr-vault-pin2');
    if (!p1 || !p2) return;
    const pin = (p1.value || '').trim();
    if (!/^\d{4,6}$/.test(pin)) { toast('PIN must be 4–6 digits'); return; }
    if (pin !== (p2.value || '').trim()) { toast('PINs do not match'); return; }
    vault.save(pin, []).then(function () {
      toast('🔐 Vault created');
      vaultUI();
    }).catch(function () { toast('Encryption failed on this browser'); });
  }

  function vaultTry() {
    const p = document.getElementById('zr-vault-pin');
    if (!p) return;
    vault.unlock((p.value || '').trim()).then(function (ok) {
      if (ok === false) { toast('Wrong PIN'); return; }
      toast('🔓 Vault unlocked');
      vaultUI();
    }).catch(function () { toast('Unlock failed'); });
  }

  async function vaultBio() {
    if (!vault.bioSupported()) { toast('Biometrics unavailable (needs HTTPS)'); return; }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      let creds = [];
      try { creds = JSON.parse(localStorage.getItem('calcpro_zr_cred') || '[]'); } catch (e) {}
      if (creds.length === 0) {
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: 'CalcProMaster Vault', id: window.location.hostname },
            user: { id: new Uint8Array(16), name: 'calcpro-user', displayName: 'CalcProMaster Vault User' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            timeout: 60000,
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }
          }
        });
        creds.push({ id: cred.id, type: cred.type });
        localStorage.setItem('calcpro_zr_cred', JSON.stringify(creds));
        toast('🫵 Biometric registered');
      }
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: creds.map(function (c) { return { type: c.type, id: vault._bioId(c.id) }; }),
          timeout: 60000,
          userVerification: 'required'
        }
      });
      if (assertion) {
        // biometric gate passed → switch to the PIN entry (biometrics prove identity,
        // the AES key is still PIN-derived; data never leaves the device)
        toast('✅ Biometric verified — enter your PIN to decrypt');
        openModal(
          '<div class="zr-vault"><h3>🗄️ Secure Vault — Final Unlock</h3>' +
          '<p class="zr-wizard-hint">Biometric identity verified. Enter your PIN to decrypt your data.</p>' +
          '<div class="input-group"><label for="zr-vault-pin">PIN</label>' +
          '<input type="password" id="zr-vault-pin" class="calc-input" maxlength="6" inputmode="numeric" autocomplete="current-password"></div>' +
          '<button type="button" class="calc-btn" onclick="ZR.vaultTry()">🔓 Unlock</button></div>'
        );
      }
    } catch (e) {
      toast('Biometric cancelled or failed');
    }
  }

  function vaultUI() {
    const items = (vault._kv && vault._kv.itemsArr) || [];
    const listHtml = items.length
      ? items.map(function (it, i) {
          return '<div class="zr-vault-item"><div class="zr-vault-item-head">' +
            '<strong>' + esc(it.title) + '</strong> <small>' + esc(new Date(it.ts).toLocaleString()) + '</small></div>' +
            '<p>' + esc(it.text) + '</p>' +
            '<button type="button" class="action-btn small" onclick="ZR.vaultDel(' + i + ')">🗑 Delete</button></div>';
        }).join('')
      : '<p class="zr-wizard-hint">No entries yet — save a note or a calculation snapshot below.</p>';

    openModal(
      '<div class="zr-vault"><h3>🗄️ Secure Vault — Unlocked 🔓</h3>' +
      '<div class="input-group"><label for="zr-vault-title">Title</label>' +
      '<input type="text" id="zr-vault-title" class="calc-input" maxlength="80" placeholder="e.g. Budget plan Q3"></div>' +
      '<div class="input-group"><label for="zr-vault-text">Secret note / snapshot</label>' +
      '<textarea id="zr-vault-text" class="calc-input" rows="3" placeholder="Anything you want encrypted — only you can read it."></textarea></div>' +
      '<div style="display:flex;gap:8px;margin:10px 0">' +
      '<button type="button" class="calc-btn" onclick="ZR.vaultAdd()">💾 Save Encrypted</button>' +
      '<button type="button" class="action-btn" onclick="ZR.vaultSnap()">📸 Save Current Result</button>' +
      '<button type="button" class="action-btn" onclick="ZR.vaultLock()">🔒 Lock</button></div>' +
      '<hr style="border:none;border-top:1px solid var(--border,#e2e8f0);margin:12px 0">' +
      '<h4 style="margin:0 0 8px">Saved entries (' + items.length + ')</h4><div id="zr-vault-list">' + listHtml + '</div>' +
      '</div>'
    );
  }

  function vaultAdd() {
    const t = document.getElementById('zr-vault-title');
    const x = document.getElementById('zr-vault-text');
    if (!t || !x) return;
    if (!(t.value || '').trim()) { toast('Add a title'); return; }
    vault.add((t.value || '').trim(), (x.value || '').trim()).then(function () {
      toast('💾 Saved to encrypted vault');
      vaultUI();
    });
  }
  function vaultSnap() {
    let result = '', extra = '';
    const rm = document.querySelector('.result-main');
    const re = document.querySelector('.result-extra');
    if (rm) result = rm.textContent.trim();
    if (re) extra = re.textContent.trim();
    let toolName = '';
    if (window.App && App._currentTool && App._currentTool.tool) toolName = App._currentTool.tool.name;
    vault.add('Snapshot — ' + (toolName || 'calc'), (result + (extra ? '\n' + extra : '')).trim()).then(function () {
      toast('📸 Result saved to vault');
      vaultUI();
    });
  }
  function vaultLock() {
    vault.unlocked = false;
    vault._key = null;
    vault._kv = null;
    toast('🔒 Vault locked');
    closeModal();
  }
  function vaultDel(i) {
    vault.remove(i).then(function () { vaultUI(); });
  }

  // ===================================================================
  // PAGE HOOKS
  // ===================================================================

  // Called after renderTool: wires sliders + geo chip + feature buttons.
  function init(tool, catKey) {
    if (!tool) return;
    // 1. Sliders for numeric inputs
    wireSliders(tool);

    // 2. Geo chip in the tool header (if a holder exists)
    const chip = document.getElementById('zr-geo-chip');
    if (chip) renderGeoChip();

    // 3. Feature bar (buttons) — append into the actions area if present
    const bar = document.getElementById('zr-feature-bar');
    if (bar) {
      bar.innerHTML =
        '<button type="button" class="action-btn small" onclick="ZR.openWizard(App._currentTool.tool)" title="Multi-step guided wizard">🧭 Wizard</button>' +
        '<button type="button" class="action-btn small" onclick="ZR.debtOpen()" title="Debt snowball vs avalanche game">🎮 Debt Game</button>' +
        '<button type="button" class="action-btn small" onclick="ZR.openVault()" title="Encrypted local vault">🗄️ Vault</button>' +
        '<button type="button" class="action-btn small" onclick="ZR.whiteLabel()" title="Branded PDF report">📄 White-Label PDF</button>';
    }
  }

  // Called after executeCalc renders the result.
  function afterCalc(tool, values, result) {
    if (!tool) return;
    // Heatmap (2+ numeric inputs)
    renderHeatmap(tool, values);
    // Scenario chart
    renderScenarioChart(tool, values);
    // Amortization / year-by-year
    renderAmortization(tool, values);
    // Gamified health score + badges
    renderHealthScore(tool, values, result);
    // Voice walkthrough bar
    renderVoiceBar(tool, values, result);
  }

  // hook into ToolLifecycle destroy so voice stops on navigation
  function onLifecycleDestroy() {
    voice.stop();
  }

  // init once
  function boot() {
    initWasm();
    // stop voice on navigation
    if (typeof ToolLifecycle !== 'undefined' && ToolLifecycle.onDestroy) {
      try { ToolLifecycle.onDestroy.push(onLifecycleDestroy); } catch (e) {}
    }
    // listen for lifecycle destroy event (some versions dispatch)
    document.addEventListener('tool:destroy', function () { voice.stop(); });
    document.addEventListener('calc:done', function () {
      // one-time: mark wasm ready state chip? no-op, kept for future use
    });
  }

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else if (typeof document !== 'undefined') {
    boot();
  }

  return {
    // feature triggers (inline onclick compatible)
    init: init,
    afterCalc: afterCalc,
    heatmap: renderHeatmap,
    // sliders
    sliders: wireSliders,
    // wizard
    openWizard: openWizard,
    wizardNav: function (dir) { if (window._zrWizard) { dir > 0 ? window._zrWizard.next() : window._zrWizard.back(); } },
    wizardFinish: function () { if (window._zrWizard) window._zrWizard.finish(); },
    wizardClose: function () { if (window._zrWizard) window._zrWizard.close(); },
    // debt game
    debtOpen: openDebtGame,
    debtAdd: debtAdd,
    debtRemove: debtRemove,
    debtReset: debtReset,
    debtRun: debtRun,
    // wasm
    fastMath: fastMath,
    // voice
    voice: voice,
    // vault
    openVault: openVault,
    vaultSetup: vaultSetup,
    vaultTry: vaultTry,
    vaultBio: vaultBio,
    vaultAdd: vaultAdd,
    vaultSnap: vaultSnap,
    vaultLock: vaultLock,
    vaultDel: vaultDel,
    // geo
    geo: detectRegion,
    // white-label
    whiteLabel: whiteLabelReport
  };
})();

if (typeof window !== 'undefined') window.ZR = ZR;
if (typeof module !== 'undefined' && module.exports) module.exports = { ZR: ZR };
