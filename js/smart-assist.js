// ============================================================
// Smart Assist (S3) — plausibility warnings, draft autosave,
// opt-in reminders. Additive: never blocks calculation, never
// collects data, reminders are strictly opt-in (S3 #27).
// Dual-mode: window.SmartAssist in the browser, module.exports
// for tests. All rule/schedule logic is pure and unit-tested.
// ============================================================
(function () {
  'use strict';

  // ---------- Plausibility heuristics (S3 #26) ----------
  // Non-blocking inline warnings. Generic heuristics + field-name keywords.
  // Returns a human sentence or null. Pure.
  const RULES = [
    { test: (id, v) => /rate|interest|apr|roi|inflation/.test(id) && v > 40, msg: 'This rate looks unusually high — double-check it (most loan rates are well under 40%).' },
    { test: (id, v) => /rate|interest|apr|roi/.test(id) && v < 0, msg: 'A negative rate is unusual — if this is intentional (deflation), ignore this.' },
    { test: (id, v) => /age/.test(id) && (v > 110 || v < 1), msg: 'This age looks off — please double-check.' },
    { test: (id, v) => /weight/.test(id) && !/pound|lbs/.test(id) && v > 400, msg: 'That weight looks very high in kilograms — check the unit.' },
    { test: (id, v) => /height/.test(id) && v > 260 && !/inch|ft|feet/.test(id), msg: 'That height looks very high in centimeters — check the unit.' },
    { test: (id, v) => /salary|income|monthly/.test(id) && v > 0 && v < 100, msg: 'This amount looks very small for a salary/income — did you mean a yearly figure?' },
    { test: (id, v) => /principal|amount|price|loan|cost|total|budget/.test(id) && v < 0, msg: 'A negative amount was entered — amounts are usually positive.' },
    { test: (id, v) => /tenure|term|years|duration/.test(id) && v > 50, msg: 'A term over 50 years is unusual — double-check the length.' }
  ];

  function plausibility(inputId, value) {
    const v = Number(String(value).replace(/,/g, ''));
    if (!isFinite(v) || v === 0) return null;
    const id = String(inputId || '').toLowerCase();
    for (const r of RULES) {
      if (r.test(id, v)) return r.msg;
    }
    return null;
  }

  // Browser: debounce-wired warnings under each numeric input (one note el).
  function wirePlausibility(inputEl) {
    if (typeof document === 'undefined' || !inputEl || inputEl.type !== 'number' || inputEl.dataset.plausWired) return;
    inputEl.dataset.plausWired = '1';
    let t = null;
    inputEl.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        let note = document.getElementById(inputEl.id + '-plaus-note');
        const msg = plausibility(inputEl.id, inputEl.value);
        if (!msg) { if (note) note.style.display = 'none'; return; }
        if (!note) {
          note = document.createElement('small');
          note.id = inputEl.id + '-plaus-note';
          note.className = 'plaus-note';
          note.setAttribute('role', 'status');
          if (inputEl.parentElement) inputEl.parentElement.appendChild(note);
        }
        note.textContent = '⚠️ ' + msg;
        note.style.display = 'block';
      }, 350);
    });
  }

  // ---------- Draft autosave (S3 #28) ----------
  // Separate key namespace from presets/history: cpm_draft_<toolId>.
  // Debounced save on input; restore right after render; explicit Clear.
  function draftKey(toolId) { return 'cpm_draft_' + String(toolId); }

  function saveDraft(toolId, values) {
    if (typeof localStorage === 'undefined') return false;
    try {
      const clean = {};
      Object.keys(values || {}).forEach(k => { if (values[k] !== '' && values[k] != null) clean[k] = values[k]; });
      if (!Object.keys(clean).length) { localStorage.removeItem(draftKey(toolId)); return true; }
      localStorage.setItem(draftKey(toolId), JSON.stringify({ v: clean, at: Date.now() }));
      return true;
    } catch (e) { return false; }
  }

  function loadDraft(toolId) {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(draftKey(toolId));
      if (!raw) return null;
      const o = JSON.parse(raw);
      return (o && o.v && typeof o.v === 'object') ? o.v : null;
    } catch (e) { return null; }
  }

  function clearDraft(toolId) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(draftKey(toolId)); } catch (e) { /* private mode */ }
  }

  // Collect current numeric/select values from the live form (browser only).
  function collectFormValues() {
    if (typeof document === 'undefined') return {};
    const form = document.getElementById('calc-form');
    if (!form) return {};
    const out = {};
    form.querySelectorAll('input[type="number"], select').forEach(el => {
      if (el.id && !/-unit$|-slider$/.test(el.id)) out[el.id] = el.value;
    });
    return out;
  }

  // Browser: wire autosave + restore for the current tool.
  function wireDrafts(toolId) {
    if (typeof document === 'undefined') return;
    const form = document.getElementById('calc-form');
    if (!form || form.dataset.draftWired) return;
    form.dataset.draftWired = '1';
    let t = null;
    form.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { saveDraft(toolId, collectFormValues()); }, 500);
    });
    const draft = loadDraft(toolId);
    if (draft) {
      let restored = 0;
      Object.keys(draft).forEach(id => {
        const el = document.getElementById(id);
        if (el && (el.value === '' || el.value == null)) { el.value = draft[id]; restored++; }
      });
      if (restored) {
        let bar = document.getElementById('cpm-draft-bar');
        if (!bar && form.parentElement) {
          bar = document.createElement('div');
          bar.id = 'cpm-draft-bar';
          bar.style.cssText = 'font-size:12px;opacity:.75;margin:4px 0';
          bar.innerHTML = '↩ Restored ' + restored + ' unsaved value' + (restored > 1 ? 's' : '') + ' from your last visit. ' +
            '<button type="button" class="small-btn" onclick="SmartAssist.clearDraftBar(\'' + String(toolId) + '\')">Clear</button>';
          form.parentElement.insertBefore(bar, form);
        }
      }
    }
  }

  function clearDraftBar(toolId) {
    clearDraft(toolId);
    const bar = document.getElementById('cpm-draft-bar');
    if (bar) bar.remove();
    const form = document.getElementById('calc-form');
    if (form) form.querySelectorAll('input[type="number"]').forEach(el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
    if (window.App && typeof App.showToast === 'function') App.showToast('Draft cleared');
  }

  // ---------- Opt-in reminders (S3 #27) ----------
  // Pure schedule math (testable): next due date for monthly/weekly/one-off.
  function nextDue(kind, fromDate) {
    const d = new Date(fromDate.getTime());
    if (kind === 'weekly') { d.setDate(d.getDate() + 7); return d; }
    if (kind === 'monthly') {
      const day = d.getDate();
      d.setDate(1);            // avoid Date month-overflow (Jan 31 + 1mo = Mar 2)
      d.setMonth(d.getMonth() + 1);
      const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, dim)); // clamp to month end
      return d;
    }
    return null; // one-off reminders use a user-picked date instead
  }

  function reminderState(toolId) {
    if (typeof localStorage === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('cpm_reminder_' + toolId) || 'null'); } catch (e) { return null; }
  }

  function setReminder(toolId, kind) {
    if (typeof localStorage === 'undefined' || typeof Notification === 'undefined') return false;
    const go = function (perm) {
      if (perm !== 'granted') return false;
      try {
        localStorage.setItem('cpm_reminder_' + toolId, JSON.stringify({ kind: kind, next: nextDue(kind, new Date()).toISOString() }));
        return true;
      } catch (e) { return false; }
    };
    if (Notification.permission === 'granted') return go('granted');
    if (Notification.permission === 'denied') return false;
    return Notification.requestPermission().then(go).catch(() => false);
  }

  function cancelReminder(toolId) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem('cpm_reminder_' + toolId); } catch (e) { /* noop */ }
  }

  // Browser: on load, fire due reminders (max one per session per tool).
  function checkDueReminders() {
    if (typeof localStorage === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') return [];
    const fired = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('cpm_reminder_') !== 0) continue;
        const st = JSON.parse(localStorage.getItem(k) || 'null');
        if (!st || !st.next) continue;
        if (new Date(st.next).getTime() <= Date.now()) {
          const toolId = k.replace('cpm_reminder_', '');
          try { new Notification('CalcProMaster reminder', { body: 'Time for your ' + toolId.replace(/-/g, ' ') + ' check-in.' }); } catch (e) { /* noop */ }
          const nd = nextDue(st.kind, new Date());
          if (nd) localStorage.setItem(k, JSON.stringify({ kind: st.kind, next: nd.toISOString() }));
          else localStorage.removeItem(k);
          fired.push(toolId);
        }
      }
    } catch (e) { /* noop */ }
    return fired;
  }

  // renderTool hook: wire plausibility + drafts on the fresh form.
  function enhance(tool) {
    if (typeof document === 'undefined') return;
    try {
      const form = document.getElementById('calc-form');
      if (!form) return;
      form.querySelectorAll('input[type="number"]').forEach(wirePlausibility);
      if (tool && tool.id) wireDrafts(tool.id);
    } catch (e) { /* best-effort */ }
  }

  function init() {
    if (typeof document === 'undefined') return;
    try { checkDueReminders(); } catch (e) { /* noop */ }
  }

  // ---------- S3 #21: locale-based currency default ----------
  // Maps navigator.language region → currency code (no IP, no API, no network).
  // Manual override always wins if the calculator's select has a chosen value.
  const CURRENCY_BY_REGION = {
    PK: 'PKR', IN: 'INR', US: 'USD', GB: 'GBP', EU: 'EUR', BD: 'BDT', NG: 'NGN',
    AE: 'AED', SA: 'SAR', CA: 'CAD', AU: 'AUD', ZA: 'ZAR', KE: 'KES', PH: 'PHP',
    ID: 'IDR', MY: 'MYR', SG: 'SGD', LK: 'LKR', NP: 'NPR', TR: 'TRY', BR: 'BRL',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR'
  };
  function detectCurrency(lang, fallback) {
    var l = String(lang || '');
    var m = l.match(/-([A-Za-z]{2})(?:[-_]|$)/);
    if (m) {
      var code = CURRENCY_BY_REGION[m[1].toUpperCase()];
      if (code) return code;
    }
    return fallback || null;
  }

  const SmartAssist = {
    RULES, plausibility, wirePlausibility,
    draftKey, saveDraft, loadDraft, clearDraft, collectFormValues, wireDrafts, clearDraftBar,
    nextDue, reminderState, setReminder, cancelReminder, checkDueReminders,
    detectCurrency,
    enhance, init
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SmartAssist;
  if (typeof window !== 'undefined') window.SmartAssist = SmartAssist;
})();
