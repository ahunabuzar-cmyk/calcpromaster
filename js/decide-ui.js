// ============================================================
// Decide UI wiring (S12) — browser-side glue over js/decide.js.
//   #87 one-line plain-language summary above the result
//   #86 color-coded interpretation scale (BMI / DTI built-ins)
//   #89 accuracy/estimate note on estimate-based tools
//   #90 milestone timeline for multi-stage results (loan payoff)
//   #81 keep-result-visible-above-keyboard (focusin guard)
// All inserts are additive; any failure is swallowed so the
// calculator result render can never break. Node-safe no-op.
// ============================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return; // Node/test safety
  var D = window.Decide;
  if (!D) return;

  // Tools with a built-in interpretation scale: value recomputed from the
  // SAME inputs the calculator used (no second source of truth).
  var SCALED = {
    'finance/debt-ratio': {
      scale: 'dti',
      pick: function (v) { var inc = +v.income || 0; return inc > 0 ? ((+v.debts || 0) / inc) * 100 : NaN; },
      headline: 'your debt-to-income ratio'
    },
    'health/bmi': {
      scale: 'bmi',
      pick: function (v) { var m = (+v.height || 0) / 100; return m > 0 ? (+v.weight || 0) / (m * m) : NaN; },
      headline: 'your BMI'
    }
  };

  // #90 tools where a timeline of payoff milestones is genuinely useful
  var TIMELINE_TOOLS = { 'loan-emi': true, 'car-loan-emi': true, 'personal-loan-emi': true, 'home-loan-emi': true };

  // Tools whose output is an estimate by nature (honest #89 note)
  var ESTIMATE_TOOLS = { 'retirement': true, 'savings-goal': true, 'college-cost': true, 'inflation': true, 'calories-burned': true, 'bmr': true, 'tdee': true };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function firstNumeric(resultStr) {
    var m = String(resultStr == null ? '' : resultStr).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function pageKey() {
    var p = '/';
    try { p = (window.Router && typeof window.Router.getPath === 'function') ? window.Router.getPath() : '/'; } catch (e) {}
    var parts = String(p).split('?')[0].split('#')[0].split('/').filter(Boolean);
    return parts.length >= 2 ? parts[0] + '/' + parts[1] : (parts[0] || '');
  }

  // ---------- main hook (called from App.executeCalc after render) ----------
  function afterCalc(tool, values, resultArea) {
    if (!tool || !values || !resultArea) return;
    var main = resultArea.querySelector('.result-main');
    if (!main) return;

    // #87 one-line summary (once per render)
    if (!resultArea.querySelector('.cp-inshort')) {
      var headVal = String(main.textContent || '').replace(/^[^:]*:\s*/, '').trim();
      var headline = (SCALED[tool.cat + '/' + tool.id] && SCALED[tool.cat + '/' + tool.id].headline) || 'the result';
      if (headVal) {
        var line = document.createElement('p');
        line.className = 'cp-inshort';
        line.textContent = 'In short: ' + headline + ' is ' + headVal + '.';
        main.insertAdjacentElement('beforebegin', line);
      }
    }

    // #86 interpretation scale where a public range exists
    var key = tool.cat + '/' + tool.id;
    var cfg = SCALED[key];
    if (cfg && !resultArea.querySelector('.cp-scale')) {
      var num = cfg.pick(values);
      var res = D.interpret(D.SCALES[cfg.scale], num);
      if (res && isFinite(res.pct)) {
        var labels = D.SCALES[cfg.scale].map(function (r) { return r.label; });
        var wrap = document.createElement('div');
        wrap.className = 'cp-scale';
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', 'Result ' + res.label + ' on the ' + cfg.scale.toUpperCase() + ' scale');
        wrap.innerHTML =
          '<div class="cp-scale-track"><span class="cp-scale-dot" style="left:' + res.pct + '%"></span></div>' +
          '<div class="cp-scale-labels">' + labels.map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '</div>' +
          '<p class="cp-scale-note">Your value falls in: <strong>' + esc(res.label) + '</strong></p>';
        main.insertAdjacentElement('afterend', wrap);
      }
    }

    // #89 estimate/confidence note (once per render)
    if (ESTIMATE_TOOLS[tool.id] && !resultArea.querySelector('.cp-estimate-note')) {
      var note = document.createElement('p');
      note.className = 'cp-estimate-note';
      note.textContent = D.ESTIMATE_NOTE;
      resultArea.appendChild(note);
    }

    // #90 payoff timeline for amortized loans
    if (TIMELINE_TOOLS[tool.id] && !resultArea.querySelector('.cp-timeline')) {
      var months = (+values.years || 0) * 12 || (+values.months || 0);
      var every = firstNumeric(main.textContent); // periodic payment
      if (months > 0 && every != null && every > 0) {
        var stages = [
          { label: 'Loan starts', offsetMonths: 0, note: 'First payment due' },
          { label: '25% paid', offsetMonths: Math.round(months / 4), note: '' },
          { label: 'Halfway', offsetMonths: Math.round(months / 2), note: 'Interest share now falling' },
          { label: 'Debt-free', offsetMonths: months, note: 'Loan fully paid' }
        ];
        var tl = D.buildTimeline(stages);
        if (tl && tl.length) {
          var ul = document.createElement('ul');
          ul.className = 'cp-timeline';
          ul.setAttribute('aria-label', 'Loan payoff milestones');
          ul.innerHTML = tl.map(function (s) {
            return '<li' + (s.last ? ' data-milestone="debt-free"' : '') + '><span class="tl-date">' + esc(s.iso || '') + '</span>' + esc(s.label) +
              (s.note ? '<br><span>' + esc(s.note) + '</span>' : '') + '</li>';
          }).join('');
          resultArea.appendChild(ul);
        }
      }
    }
  }

  // ---------- #81 keyboard-overlap guard (delegated, survives re-renders) ----------
  var kbdWired = false;
  function wireKeyboardGuard() {
    if (kbdWired) return;
    kbdWired = true;
    document.addEventListener('focusin', function (e) {
      var el = e.target;
      if (!el || !el.closest || !el.closest('#calc-form')) return;
      if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT') return;
      var vd = window.visualViewport;
      var kbdH = vd ? Math.max(0, window.innerHeight - vd.height - (vd.offsetTop || 0)) : 0;
      if (kbdH < 80) return; // desktop / no meaningful on-screen keyboard
      var r = document.getElementById('result-area');
      if (!r || r.hidden) return;
      var bottom = r.getBoundingClientRect().bottom;
      var need = D.scrollAboveKeyboard(bottom, kbdH, window.innerHeight);
      if (need > 0) {
        try { window.scrollBy({ top: need, behavior: 'smooth' }); } catch (err) { window.scrollBy(0, need); }
      }
    }, true);
  }

  function init() { wireKeyboardGuard(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ---------- #85 before-you-calculate checklist (called from renderTool) ----------
  function renderChecklist(tool) {
    try {
      var list = D.checklist(tool.cat || '');
      if (!list || !list.length) return '';
      return '<details class="cp-checklist"><summary>✅ Before you calculate — have this ready</summary><ul>' +
        list.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul></details>';
    } catch (e) { return ''; }
  }

  window.DecideUI = { afterCalc: afterCalc, renderChecklist: renderChecklist, pageKey: pageKey, SCALED: SCALED, TIMELINE_TOOLS: TIMELINE_TOOLS, ESTIMATE_TOOLS: ESTIMATE_TOOLS };
})();
