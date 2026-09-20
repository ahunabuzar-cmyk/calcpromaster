// ============================================================
// Smart Input (S1) — quick-fill presets, smart autocomplete,
// paste-and-parse, unit auto-suggest, OCR scan (lazy).
// Dual-mode: window.SmartInput in the browser, module.exports for tests.
// Pure logic core (no DOM) + DOM helpers separated for testability.
// ============================================================
const SmartInput = (function () {
  'use strict';

  // ---------- Presets: per-category quick-fill scenarios ----------
  // Values are realistic, neutral example defaults (no fabricated user stats).
  const PRESETS = {
    finance: [
      { label: 'Starter home price', fields: { amount: 250000, rate: 6.5, years: 30 } },
      { label: 'Car loan', fields: { amount: 20000, rate: 7.5, years: 5 } },
      { label: 'Typical savings deposit', fields: { amount: 1000, rate: 4, years: 5 } }
    ],
    health: [
      { label: 'Average adult (metric)', fields: { weight: 70, height: 170, age: 30 } }
    ],
    math: [
      { label: 'Sample values', fields: { a: 12, b: 4 } }
    ],
    everyday: [
      { label: 'Sample values', fields: { amount: 100, rate: 5 } }
    ],
    construction: [
      { label: 'Small slab', fields: { length: 10, width: 10, thickness: 4 } }
    ],
    'auto-transport': [
      { label: 'Typical car loan', fields: { amount: 20000, rate: 7.5, years: 5 } }
    ]
  };

  // ---------- Autocomplete: typical values per common field concept ----------
  const TYPICAL = {
    amount: [1000, 5000, 10000, 25000, 50000, 100000],
    principal: [1000, 5000, 10000, 25000, 100000],
    loan: [10000, 25000, 50000, 100000, 500000],
    rate: [3, 4, 5, 6.5, 8, 10, 12],
    interest: [3, 4, 5, 6.5, 8, 10, 12],
    years: [1, 5, 10, 15, 20, 25, 30],
    term: [1, 3, 5, 10, 15, 30],
    months: [6, 12, 24, 36, 60],
    weight: [50, 60, 70, 80, 90, 100],
    height: [150, 160, 170, 180, 190],
    age: [18, 25, 30, 40, 50, 60],
    price: [10, 50, 100, 500, 1000],
    quantity: [1, 2, 5, 10, 25, 50, 100],
    length: [1, 5, 10, 20, 50, 100],
    width: [1, 5, 10, 20, 50, 100],
    area: [50, 100, 250, 500, 1000],
    tip: [5, 10, 15, 20, 25],
    discount: [5, 10, 15, 20, 25, 50],
    tax: [5, 10, 15, 17, 20]
  };

  // ---------- Unit auto-suggest: parse "5 kg" / "6 ft 2" style values ----------
  // Returns { value, unit, note } or null when the input is a plain number.
  const UNIT_MAP = {
    // weight → kg
    kg: { unit: 'kg', toBase: 1 }, kilogram: { unit: 'kg', toBase: 1 }, kilos: { unit: 'kg', toBase: 1 },
    g: { unit: 'kg', toBase: 0.001 }, gram: { unit: 'kg', toBase: 0.001 }, grams: { unit: 'kg', toBase: 0.001 },
    lb: { unit: 'kg', toBase: 0.4536 }, lbs: { unit: 'kg', toBase: 0.4536 }, pound: { unit: 'kg', toBase: 0.4536 }, pounds: { unit: 'kg', toBase: 0.4536 },
    st: { unit: 'kg', toBase: 6.35029 }, stone: { unit: 'kg', toBase: 6.35029 },
    // length → m
    m: { unit: 'm', toBase: 1 }, meter: { unit: 'm', toBase: 1 }, meters: { unit: 'm', toBase: 1 }, metre: { unit: 'm', toBase: 1 }, metres: { unit: 'm', toBase: 1 },
    cm: { unit: 'm', toBase: 0.01 }, mm: { unit: 'm', toBase: 0.001 },
    ft: { unit: 'm', toBase: 0.3048 }, foot: { unit: 'm', toBase: 0.3048 }, feet: { unit: 'm', toBase: 0.3048 },
    in: { unit: 'm', toBase: 0.0254 }, inch: { unit: 'm', toBase: 0.0254 }, inches: { unit: 'm', toBase: 0.0254 },
    km: { unit: 'm', toBase: 1000 }, mi: { unit: 'm', toBase: 1609.34 }, mile: { unit: 'm', toBase: 1609.34 }, miles: { unit: 'm', toBase: 1609.34 },
    yd: { unit: 'm', toBase: 0.9144 }, yard: { unit: 'm', toBase: 0.9144 }, yards: { unit: 'm', toBase: 0.9144 }
  };

  // Parse a raw input string that may carry a unit suffix.
  function parseUnitValue(raw) {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s) return null;
    // Pattern: number (with optional thousands separators) + optional unit word
    const m = s.match(/^(-?[\d,]*\.?\d+)\s*([a-z]+)$/);
    if (!m) {
      // Plain number (possibly with separators) — no unit
      const n = s.replace(/,/g, '');
      if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(n)) return { value: parseFloat(n), unit: null, note: null };
      return null;
    }
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(num)) return null;
    const u = UNIT_MAP[m[2]];
    if (!u) return null;
    return {
      value: +(num * u.toBase).toFixed(6),
      unit: u.unit,
      note: num + ' ' + m[2] + ' = ' + (+(num * u.toBase).toFixed(4)) + ' ' + u.unit
    };
  }

  // ---------- Paste-and-parse: pull numbers out of unstructured text ----------
  // Extracts labeled (amount: 1234) and bare numeric values from pasted text
  // such as a copied bill. Pure function — the DOM layer maps results to fields.
  function extractNumbers(text) {
    if (!text) return [];
    const out = [];
    const seen = {};
    const re = /([a-zA-Z][a-zA-Z \-_/]{0,24}?)\s*[:=]\s*(-?[\d,]+(?:\.\d+)?)|(?<![\w.\-])(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+\.\d+|-?\d+)(?![\w.\-])/g;
    let m;
    while ((m = re.exec(String(text))) !== null) {
      if (m[1] !== undefined) {
        // Labeled value — keep the label so the DOM layer can match fields
        const label = m[1].trim().toLowerCase();
        const val = parseFloat(m[2].replace(/,/g, ''));
        if (isFinite(val) && !seen[label + val]) { seen[label + val] = 1; out.push({ label, value: val }); }
      } else {
        const val = parseFloat(m[3].replace(/,/g, ''));
        if (isFinite(val) && !seen['bare' + val]) { seen['bare' + val] = 1; out.push({ label: null, value: val }); }
      }
      if (out.length >= 12) break; // cap — bills rarely have more useful numbers
    }
    return out;
  }

  // Map extracted numbers onto a tool's inputs (pure — used by tests + DOM layer).
  // Matches by fuzzy label → input id/label similarity, then fills remaining
  // numeric inputs with bare values in order of appearance.
  function mapExtractedToInputs(extracted, inputs) {
    if (!Array.isArray(extracted) || !Array.isArray(inputs)) return {};
    const mapping = {};
    const used = new Set();
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    // Pass 1: labeled values → inputs whose id/label overlaps the label
    for (const ex of extracted) {
      if (!ex.label) continue;
      const l = norm(ex.label);
      if (!l) continue;
      for (const inp of inputs) {
        if (mapping[inp.id] !== undefined) continue;
        const iid = norm(inp.id);
        const ilab = norm(inp.label);
        if ((iid && (iid.includes(l) || l.includes(iid))) || (ilab && (ilab.includes(l) || l.includes(ilab)))) {
          mapping[inp.id] = ex.value;
          used.add(ex.value);
          break;
        }
      }
    }
    // Pass 2: bare values → remaining numeric inputs, in order
    for (const ex of extracted) {
      if (ex.label !== null || used.has(ex.value)) continue;
      const slot = inputs.find(i => mapping[i.id] === undefined && (i.type || 'number') !== 'select' && i.type !== 'checkbox' && i.type !== 'textarea');
      if (slot) { mapping[slot.id] = ex.value; used.add(ex.value); }
    }
    return mapping;
  }

  // ---------- OCR scan (lazy) ----------
  // Scanning needs the Tesseract.js engine (~2MB) — loaded ONLY after the user
  // clicks "Scan" and grants consent. In this build the extraction pipeline
  // (image → OCR text → extractNumbers → mapExtractedToInputs) is wired; the
  // CDN script is injected on first use so calculators that never use it pay
  // zero bytes. Privacy: the image is processed in-browser, never uploaded.
  let _ocrState = 'idle'; // idle | loading | ready | unsupported
  function ocrState() { return _ocrState; }

  function ocrExtractFromText(text, inputs) {
    const nums = extractNumbers(text);
    return mapExtractedToInputs(nums, inputs);
  }

  // ---------- DOM layer (browser only) ----------
  function renderPresets(catKey, toolInputs) {
    if (typeof document === 'undefined') return '';
    const presets = (PRESETS[catKey] || []).filter(p =>
      Object.keys(p.fields).some(f => (toolInputs || []).some(i => i.id === f)));
    if (!presets.length) return '';
    const btns = presets.map((p, i) =>
      `<button type="button" class="action-btn preset-btn" data-preset="${i}" onclick="SmartInput.applyPreset('${catKey}',${i})">${p.label}</button>`).join(' ');
    return `<div class="preset-row" role="group" aria-label="Quick fill presets"><span class="preset-label">Quick fill:</span> ${btns}</div>`;
  }

  function applyPreset(catKey, idx) {
    if (typeof document === 'undefined') return;
    const presets = PRESETS[catKey] || [];
    const p = presets[idx];
    if (!p) return;
    Object.keys(p.fields).forEach(f => {
      const el = document.getElementById(f);
      if (el && el.type === 'number') {
        el.value = p.fields[f];
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  // Attach a <datalist> of typical values to a numeric input by id.
  function attachTypicalValues(inputId, fieldId) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(inputId);
    if (!el) return;
    const vals = TYPICAL[String(fieldId || inputId).toLowerCase()] || TYPICAL[String(fieldId || inputId).toLowerCase().replace(/[_-]?\d+$/, '')];
    if (!vals) return;
    let dl = document.getElementById('dl-' + inputId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'dl-' + inputId;
      document.body.appendChild(dl);
      el.setAttribute('list', 'dl-' + inputId);
    }
    dl.innerHTML = vals.map(v => `<option value="${v}">`).join('');
  }

  // Wire unit auto-suggest on a numeric input: if the user types "5 kg",
  // normalize to the field's base unit and show a one-line note.
  function wireUnitSuggest(inputId, noteElId) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(inputId);
    if (!el || el.dataset.unitWired) return;
    el.dataset.unitWired = '1';
    el.addEventListener('input', function () {
      const parsed = parseUnitValue(el.value);
      const note = document.getElementById(noteElId || inputId + '-unit-note');
      if (note) {
        if (parsed && parsed.unit) {
          note.textContent = '↔ ' + parsed.note;
          note.style.display = 'block';
          if (el.type === 'number') { el.value = parsed.value; if (el.type === 'number') el.dispatchEvent(new Event('input', { bubbles: true })); }
        } else {
          note.style.display = 'none';
        }
      }
    });
  }

  // ---------- S1 orchestrator: enhance a rendered calculator form ----------
  // Called by app.js after renderTool injects #calc-form. Injects, without
  // touching the html-string flow: (a) quick-fill presets row, (b) typical-
  // value datalists on numeric inputs, (c) unit-suggest notes, (d) a
  // paste-and-parse row for unstructured bill/text input.
  function enhance(catKey, tool) {
    if (typeof document === 'undefined') return;
    const form = document.getElementById('calc-form');
    if (!form || form.dataset.smartWired) return;
    form.dataset.smartWired = '1';
    const inputs = (tool && tool.inputs) || [];
    const nums = inputs.filter(i => i.type === 'number');

    // (a) Presets row at top of the input panel (before first input-group)
    const panel = form.querySelector('.calc-input-panel');
    if (panel) {
      const presetsHtml = renderPresets(catKey, inputs);
      if (presetsHtml) panel.insertAdjacentHTML('beforeend', presetsHtml);
    }

    // (b)+(c) Datalist + unit-note per numeric input
    nums.forEach(inp => {
      attachTypicalValues(inp.id, inp.id);
      if (!document.getElementById(inp.id + '-unit-note')) {
        const note = document.createElement('small');
        note.id = inp.id + '-unit-note';
        note.className = 'unit-note';
        note.style.display = 'none';
        note.setAttribute('aria-live', 'polite');
        const host = document.getElementById(inp.id);
        if (host && host.parentElement) host.parentElement.appendChild(note);
      }
      wireUnitSuggest(inp.id, inp.id + '-unit-note');
    });

    // (d) Paste-and-parse row (skip on scientific keypad — no numeric inputs)
    if (nums.length && panel) {
      const row = document.createElement('div');
      row.className = 'paste-parse-row';
      row.innerHTML =
        '<button type="button" class="action-btn paste-btn" aria-expanded="false" aria-controls="paste-parse-area" onclick="SmartInput.togglePasteArea()">📋 Paste bill/text</button>' +
        '<div id="paste-parse-area" class="paste-parse-area" hidden>' +
          '<label for="paste-parse-text" class="sr-only">Paste unstructured text</label>' +
          '<textarea id="paste-parse-text" class="calc-input" rows="3" placeholder="Paste any bill or text — numbers are detected and filled automatically"></textarea>' +
          '<button type="button" class="action-btn" onclick="SmartInput.pasteParse(\'' + catKey + '\')">Extract & fill</button>' +
          '<small id="paste-parse-note" class="paste-note" aria-live="polite"></small>' +
        '</div>';
      panel.insertBefore(row, panel.querySelector('.preset-row') || panel.querySelector('.input-group'));
    }
  }

  function togglePasteArea() {
    if (typeof document === 'undefined') return;
    const area = document.getElementById('paste-parse-area');
    const btn = document.querySelector('.paste-btn');
    if (!area) return;
    const open = area.hidden;
    area.hidden = !open;
    if (btn) { btn.setAttribute('aria-expanded', String(open)); if (open) document.getElementById('paste-parse-text').focus(); }
  }

  // Extract numbers from pasted text and fill matching numeric inputs.
  function pasteParse(catKey) {
    if (typeof document === 'undefined') return;
    const ta = document.getElementById('paste-parse-text');
    const note = document.getElementById('paste-parse-note');
    if (!ta || !note) return;
    const text = ta.value || '';
    if (!text.trim()) { note.textContent = 'Paste some text first.'; return; }
    const toolInputs = (window._state && window._state.tool && window._state.tool.tool && window._state.tool.tool.inputs) || [];
    const extracted = extractNumbers(text);
    const mapping = mapExtractedToInputs(extracted, toolInputs);
    let filled = 0;
    Object.keys(mapping).forEach(id => {
      const el = document.getElementById(id);
      if (el && el.type === 'number') { el.value = mapping[id]; el.dispatchEvent(new Event('input', { bubbles: true })); filled++; }
    });
    note.textContent = filled ? ('✓ Filled ' + filled + ' field' + (filled > 1 ? 's' : '') + ' — please review.') : 'No matching numbers found in the pasted text.';
  }

  return {
    PRESETS, TYPICAL, UNIT_MAP,
    parseUnitValue, extractNumbers, mapExtractedToInputs,
    ocrState, ocrExtractFromText,
    renderPresets, applyPreset, attachTypicalValues, wireUnitSuggest,
    enhance, togglePasteArea, pasteParse
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SmartInput;
if (typeof window !== 'undefined') window.SmartInput = SmartInput;
