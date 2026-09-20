// ============================================================
// Visual Polish (S2) — accent picker, onboarding tour, gauge,
// what-if chart. Additive only: never touches calculation, and
// every animation respects prefers-reduced-motion (S6 #46).
// Dual-mode: window.VisualPolish in the browser, module.exports
// for tests. Pure helpers are DOM-free and unit-testable.
// ============================================================
(function () {
  'use strict';

  // ---------- Accent palettes (S2 #5) ----------
  // Each palette derives the three CSS vars from one base hue so dark mode
  // and gradients stay coherent. Apply is site-wide via documentElement.
  const ACCENT_PALETTES = [
    { id: 'indigo', label: 'Indigo (default)', base: '#4f46e5', dark: '#4338ca', light: '#818cf8' },
    { id: 'emerald', label: 'Emerald', base: '#059669', dark: '#047857', light: '#34d399' },
    { id: 'blue', label: 'Ocean Blue', base: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
    { id: 'rose', label: 'Rose', base: '#e11d48', dark: '#be123c', light: '#fb7185' },
    { id: 'amber', label: 'Amber', base: '#d97706', dark: '#b45309', light: '#fbbf24' },
    { id: 'violet', label: 'Violet', base: '#7c3aed', dark: '#6d28d9', light: '#a78bfa' }
  ];

  function paletteById(id) {
    return ACCENT_PALETTES.find(p => p.id === id) || ACCENT_PALETTES[0];
  }

  function applyAccent(paletteId, doc) {
    const p = paletteById(paletteId);
    if (typeof document === 'undefined' && !doc) return p; // pure mode (tests)
    const d = doc || document;
    const root = d.documentElement;
    root.style.setProperty('--primary', p.base);
    root.style.setProperty('--primary-dark', p.dark);
    root.style.setProperty('--primary-light', p.light);
    root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, ' + p.base + ', ' + p.dark + ')');
    root.style.setProperty('--primary-gradient-soft', 'linear-gradient(135deg, ' + p.light + ', ' + p.base + ')');
    try { localStorage.setItem('cpm_accent', p.id); } catch (e) { /* private mode */ }
    return p;
  }

  function savedAccent() {
    try { return localStorage.getItem('cpm_accent'); } catch (e) { return null; }
  }

  function renderAccentPicker() {
    const saved = savedAccent();
    return '<div>' +
      '<label style="display:block;font-weight:600;margin-bottom:8px">Accent Color</label>' +
      '<div role="group" aria-label="Accent color" style="display:flex;gap:8px;flex-wrap:wrap">' +
      ACCENT_PALETTES.map(p =>
        '<button type="button" class="accent-swatch" data-accent="' + p.id + '" ' +
        'aria-label="' + p.label + '" title="' + p.label + '" ' +
        'style="width:32px;height:32px;border-radius:50%;border:' + (saved === p.id ? '3px' : '2px') + ' solid var(--text,#1e293b);background:' + p.base + ';cursor:pointer" ' +
        'onclick="VisualPolish.setAccent(\'' + p.id + '\')"></button>').join('') +
      '</div></div>';
  }

  function setAccent(paletteId) {
    const p = applyAccent(paletteId);
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.accent-swatch').forEach(b => {
        b.style.borderWidth = b.dataset.accent === paletteId ? '3px' : '2px';
      });
      if (window.App && typeof App.showToast === 'function') App.showToast('Accent color updated');
    }
    return p;
  }

  function initAccent() {
    const saved = savedAccent();
    if (saved && saved !== 'indigo') applyAccent(saved);
  }

  // ---------- Onboarding tour (S2 #9) ----------
  // 3 steps, first visit only, fully dismissible, keyboard-safe (Esc closes),
  // and a no-op when prefers-reduced-motion is on (steps still shown, no anim).
  const TOUR_STEPS = [
    { sel: '#globalSearchBtn, #navSearch, .search-bar input', title: 'Find any calculator', body: 'Press Ctrl+K or use the search bar — it understands typos and plain questions like "how much house can I afford".', key: 'tour-search' },
    { sel: '.tool-actions .favorite-btn, [data-fav], #favBtn', title: 'Save favorites', body: 'Star the calculators you use often — they appear at the top for quick access.', key: 'tour-favorites' },
    { sel: '#darkModeToggle, .theme-toggle, [data-theme-toggle]', title: 'Dark mode', body: 'Switch to a dark theme any time — your choice is remembered.', key: 'tour-theme' }
  ];

  function tourSeen() {
    try { return localStorage.getItem('cpm_tour_done') === '1'; } catch (e) { return true; }
  }

  function markTourDone() {
    try { localStorage.setItem('cpm_tour_done', '1'); } catch (e) { /* private mode */ }
  }

  function reduceMotion() {
    return (typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
  }

  // Pure: which steps exist on this page? (testable without DOM)
  function tourStepsFor(selectorsPresent) {
    return TOUR_STEPS.filter(s => selectorsPresent.some(sel => s.sel.split(', ').includes(sel)));
  }

  function startTour() {
    if (typeof document === 'undefined' || tourSeen()) return false;
    markTourDone();
    const steps = TOUR_STEPS.map(s => ({ step: s, el: document.querySelector(s.sel) })).filter(x => x.el);
    if (!steps.length) return false;
    const rm = reduceMotion();
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-tour';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Site tour');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    let i = 0;
    const card = () => {
      const s = steps[i].step;
      return '<div style="background:var(--surface,#fff);color:var(--text,#1e293b);border-radius:14px;max-width:380px;width:100%;padding:20px;' + (rm ? '' : 'animation:tourPop .25s ease-out;') + 'box-shadow:0 12px 40px rgba(0,0,0,.35)">' +
        '<div style="font-size:12px;opacity:.6;margin-bottom:6px">Step ' + (i + 1) + ' of ' + steps.length + '</div>' +
        '<h3 style="margin:0 0 8px">' + s.title + '</h3>' +
        '<p style="margin:0 0 14px;opacity:.85">' + s.body + '</p>' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<button type="button" id="tour-skip" class="small-btn">Skip</button>' +
        '<button type="button" id="tour-next" class="calc-btn">' + (i === steps.length - 1 ? 'Got it' : 'Next') + '</button>' +
        '</div></div>';
    };
    const render = () => { overlay.innerHTML = card(); wire(); };
    const close = () => { overlay.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    const wire = () => {
      overlay.querySelector('#tour-skip').onclick = close;
      overlay.querySelector('#tour-next').onclick = () => { if (i === steps.length - 1) close(); else { i++; render(); } };
    };
    document.addEventListener('keydown', esc);
    document.body.appendChild(overlay);
    render();
    return true;
  }

  // ---------- SVG gauge (S2 #7) ----------
  // Pure string builder: circular progress 0..100 with a readable label.
  function gauge(pct, opts) {
    const o = opts || {};
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    const size = o.size || 120;
    const stroke = o.stroke || 10;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    const color = o.color || 'var(--primary, #4f46e5)';
    const track = o.track || 'rgba(100,116,139,.25)';
    const label = o.label != null ? String(o.label) : (Math.round(p) + '%');
    const sub = o.sub ? '<text x="50%" y="62%" text-anchor="middle" font-size="' + Math.round(size / 11) + '" fill="currentColor" opacity=".65">' + escXml(o.sub) + '</text>' : '';
    return '<svg class="cpm-gauge" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + escXml(o.aria || (label + ' progress')) + '">' +
      '<circle cx="50%" cy="50%" r="' + r + '" fill="none" stroke="' + track + '" stroke-width="' + stroke + '"/>' +
      '<circle cx="50%" cy="50%" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 50% 50%)"/>' +
      '<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="' + Math.round(size / 5.5) + '" font-weight="700" fill="currentColor">' + escXml(label) + '</text>' +
      sub + '</svg>';
  }

  function escXml(s) {
    return String(s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
  }

  // ---------- What-if line chart (S2 #3) ----------
  // Pure: build SVG polyline points from a series. No chart library — a few
  // KB of SVG, lazy-rendered only on tools that opt in via tool.chart = true
  // wiring (loan-emi, savings, investment).
  function lineChart(series, opts) {
    const o = opts || {};
    const w = o.width || 320, h = o.height || 140, pad = o.pad || 18;
    const pts = (series || []).filter(n => typeof n === 'number' && isFinite(n));
    if (pts.length < 2) return '';
    const min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    const span = (max - min) || 1;
    const stepX = (w - pad * 2) / (pts.length - 1);
    const coords = pts.map((v, i) => [
      (pad + i * stepX).toFixed(1),
      (h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)
    ]);
    const line = coords.map(c => c.join(',')).join(' ');
    const area = pad + ',' + (h - pad) + ' ' + line + ' ' + (w - pad) + ',' + (h - pad);
    return '<svg class="cpm-whatif" viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="' + escXml(o.aria || 'Projection chart') + '">' +
      '<polygon points="' + area + '" fill="var(--primary, #4f46e5)" opacity=".12"/>' +
      '<polyline points="' + line + '" fill="none" stroke="var(--primary, #4f46e5)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // Amortization series helper (pure) — remaining balance per year.
  function balanceSeries(principal, annualRatePct, years) {
    const P = Number(principal), r = (Number(annualRatePct) || 0) / 100 / 12, n = Math.round((Number(years) || 1) * 12);
    if (!isFinite(P) || P <= 0 || n <= 0) return [];
    const pmt = r > 0 ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
    let bal = P;
    const out = [bal];
    for (let m = 1; m <= n; m++) {
      bal = r > 0 ? bal * (1 + r) - pmt : bal - pmt;
      out.push(Math.max(0, bal));
    }
    return out;
  }

  // Browser bootstrap: accent from storage + first-visit tour (idle).
  function init() {
    if (typeof document === 'undefined') return;
    initAccent();
    if (typeof window !== 'undefined' && window.requestAnimationFrame && !reduceMotion()) {
      window.requestAnimationFrame(() => setTimeout(startTour, 1200));
    } else {
      setTimeout(startTour, 1200);
    }
  }

  // ---------- afterCalc hook (S2 #3/#7) ----------
  // Called from app.js after a successful calculation. Adds, where they make
  // sense: (a) a what-if balance-over-time line chart on loan-type tools,
  // (b) a circular gauge when a percentage-ish result exists. Fully additive,
  // swallow-all-errors, and skips entirely under reduced-motion.
  const CHART_TOOLS = {
    'loan-emi': ['principal', 'rate', 'years'],
    'home-loan': ['principal', 'rate', 'years'],
    'car-loan-emi': ['principal', 'rate', 'years'],
    'personal-loan-emi': ['principal', 'rate', 'years'],
    'mortgage': ['principal', 'rate', 'years'],
    'savings-goal': ['goal', 'rate', 'years'],
    'compound-interest': ['principal', 'rate', 'years']
  };

  function firstNum(values, keys) {
    for (const k of keys) {
      const v = Number(values[k]);
      if (isFinite(v) && v > 0) return v;
    }
    return null;
  }

  function afterCalc(tool, values, result) {
    if (typeof document === 'undefined' || reduceMotion()) return;
    try {
      const area = document.getElementById('resultArea') || document.querySelector('.calc-result-panel');
      if (!area) return;
      let viz = document.getElementById('cpm-visual-viz');
      if (viz) viz.remove();
      const keys = CHART_TOOLS[tool && tool.id];
      const parts = [];
      if (keys) {
        const P = firstNum(values, keys.slice(0, 1).concat(['amount', 'principal', 'goal']));
        const R = firstNum(values, keys.slice(1, 2).concat(['rate', 'interest']));
        const Y = firstNum(values, keys.slice(2, 3).concat(['years', 'term']));
        if (P && Y) {
          const series = balanceSeries(P, R || 0, Y);
          const svg = lineChart(series, { aria: 'Remaining balance over the full term' });
          if (svg) parts.push('<div class="viz-block"><div class="viz-title">Balance over time</div>' + svg +
            '<div class="viz-x"><span>Now</span><span>' + Y + ' yr</span></div></div>');
        }
      }
      const res = result && result.result;
      if (typeof res === 'string' && res.includes('%')) {
        const num = parseFloat(res.replace(/[^0-9.]/g, ''));
        if (isFinite(num) && num >= 0 && num <= 100) {
          parts.push('<div class="viz-block viz-gauge">' + gauge(num, { label: res, aria: 'Result: ' + res, size: 110 }) + '</div>');
        }
      }
      if (!parts.length) return;
      viz = document.createElement('div');
      viz.id = 'cpm-visual-viz';
      viz.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:12px';
      viz.innerHTML = parts.join('');
      area.appendChild(viz);
    } catch (e) { /* never break calculation */ }
  }

  const VisualPolish = {
    ACCENT_PALETTES, paletteById, applyAccent, savedAccent,
    renderAccentPicker, setAccent, initAccent,
    TOUR_STEPS, tourSeen, markTourDone, tourStepsFor, startTour, reduceMotion,
    gauge, escXml, lineChart, balanceSeries, afterCalc, CHART_TOOLS, init
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = VisualPolish;
  if (typeof window !== 'undefined') window.VisualPolish = VisualPolish;
})();
