// Category Hub Pages with Comparison Tables
const CategoryHub = (function () {
  // v2: schema changed to REAL computed values (was hardcoded mock data in v1).
  // Bumped key so any stale v1 cache (fake numbers) is discarded immediately.
  const STORAGE_KEY = 'calcpro_category_hubs_v2';
  const DAILY_KEY = 'calcpro_calc_of_day';
  
  let hubData = {};
  let routesRegistered = false;
  
  function init() {
    loadHubData();
    registerHubRoutes();
  }
  
  function loadHubData() {
    try {
      hubData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      hubData = {};
    }
    // Stale cache detection: too old OR tool counts don't match the live source
    // (e.g. after adding new calculators). Mismatch = regenerate from real calc().
    let stale = !hubData.lastUpdated || Date.now() - hubData.lastUpdated > 86400000;
    if (!stale && hubData.categories) {
      for (const [catKey, cat] of Object.entries(CALC_DATA)) {
        const cached = hubData.categories[catKey];
        if (!cached || cached.tools.length !== cat.tools.length) { stale = true; break; }
      }
    }
    if (stale) generateHubData();
  }
  
  function generateHubData() {
    hubData = { categories: {}, lastUpdated: Date.now() };
    
    Object.entries(CALC_DATA).forEach(([catKey, cat]) => {
      const tools = cat.tools.map(t => {
        const analytics = CalcAnalytics.getData();
        const usage = analytics.tools?.[t.id]?.count || 0;
        return {
          id: t.id,
          name: t.name,
          description: t.desc || '',
          usage: usage,
          icon: getCategoryIcon(catKey)
        };
      }).sort((a, b) => b.usage - a.usage);
      
      hubData.categories[catKey] = {
        id: catKey,
        name: cat.name,
        icon: getCategoryIcon(catKey),
        description: cat.desc || (window.CATEGORY_META && CATEGORY_META[catKey] && CATEGORY_META[catKey].desc) || '',
        tools: tools,
        comparisonTable: generateComparisonTable(catKey, tools)
      };
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hubData));
  }
  
  function getCategoryIcon(catKey) {
    const icons = {
      finance: '💰', health: '🏥', math: '📐', everyday: '🔧',
      science: '🔬', engineering: '⚙️', construction: '🏗️',
      conversion: '🔄', business: '📊', education: '🎓', utilities: '🛠️'
    };
    return icons[catKey] || '📊';
  }
  
  function findTool(toolId) {
    for (const [k, cat] of Object.entries(CALC_DATA)) {
      const t = cat.tools.find(x => x.id === toolId);
      if (t) return t;
    }
    return null;
  }

  // Build the tool's default input values (same defaults the form pre-fills)
  function buildDefaultValues(tool) {
    const values = {};
    (tool.inputs || []).forEach(inp => {
      values[inp.id] = inp.type === 'checkbox' ? (inp.def === true || inp.def === 1 || inp.def === 'true') : inp.def;
    });
    return values;
  }

  // Run the tool's REAL calc with defaults and return a plain-text summary.
  // Async tools (promise-returning) fall back to the desc — the comparison
  // table is a static snapshot and must never show a promise as a value.
  function computeToolResult(tool) {
    if (!tool || typeof tool.calc !== 'function') return null;
    try {
      const values = buildDefaultValues(tool);
      const raw = tool.calc(values);
      if (raw && typeof raw.then === 'function') return null; // async tool
      return raw || null;
    } catch (e) { return null; }
  }

  function stripHtml(s) {
    return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Extract a CLEAN single value for a comparison field from the tool's REAL
  // computed output. Works by matching labeled segments of the output text
  // ("Payment: $2,051.65 / monthly", "Total Interest: $23,099.19"), then falls
  // back to unit-pattern regexes for common computed concepts. Every number is
  // produced live by the tool's calc() — never hardcoded.
  function extractFromOutput(tool, field) {
    const r = computeToolResult(tool);
    if (!r) return null;
    const text = stripHtml((r.result || '') + ' | ' + (r.extra || ''));
    if (!text) return null;
    const f = String(field || '').toLowerCase().trim();
    if (!f || f === 'result') return null;

    // 1) Labeled segment match — split on '|', check each "Label: value" segment
    const segs = text.split('|');
    const fWords = f.split(/\s+/).filter(w => w.length >= 3);
    for (const seg of segs) {
      const m = seg.match(/^\s*([^:]{2,40}?):\s*(.+?)\s*$/);
      if (!m) continue;
      const label = m[1].toLowerCase();
      const hit = fWords.length > 0 && (fWords.every(w => label.indexOf(w) !== -1) ||
        fWords.some(w => label.indexOf(w) !== -1 && label.length <= w.length + 6));
      if (!hit) continue;
      // Return the value part (strip leading punctuation, cap length, and drop
      // redundant trailing " / monthly"-style unit noise)
      return m[2].replace(/^[^\w$%.+-]+/, '').replace(/\s*\/\s*[^/]*$/, '').slice(0, 24);
    }
    // 2) Unit-pattern fallback for concepts without labeled output segments
    const pats = {
      'roi': /roi:?\s*\$?([-\d,]+(?:\.\d+)?)%?/i,
      'volume': /(?:volume|concrete|excavat|gravel|soil|mulch):?\s*([\d,]+(?:\.\d+)?)\s*m³/i,
      'power': /power:?\s*([\d,]+(?:\.\d+)?)/i,
      'grade': /grade:?\s*([A-F][+-]?)/i,
      'bmi': /bmi:?\s*([\d.]+)/i,
      'percentage': /([\d.]+)%/i
    };
    for (const k in pats) {
      if (f.indexOf(k) !== -1) {
        const mm = text.match(pats[k]);
        if (mm) return mm[1];
      }
    }
    return null;
  }

  // Fields that represent COMPUTED output metrics. For these the value extracted
  // from the tool's live result wins over any same-named input — a tool like
  // Mortgage has a solve-mode "Monthly Payment" INPUT (a target, default 2000)
  // but the comparison column should show the ACTUAL computed payment.
  const OUTPUT_FIELDS = ['monthly payment', 'total interest', 'total payment', 'roi', 'volume', 'power', 'grade', 'bmi', 'percentage', 'output'];

  // REAL value for a field: input label match or extraction from the tool's live
  // computed output. No hardcoded/static mock data — every number is live.
  function getFieldValue(tool, field) {
    if (!tool) return '—';
    const label = String(field || '').toLowerCase().trim();
    // 0) Result column — the REAL computed output from default inputs
    if (label === 'result') {
      const r = computeToolResult(tool);
      return r && r.result ? stripHtml(r.result) : '—';
    }
    // 1) Computed-output metrics: prefer the live computed value first
    if (OUTPUT_FIELDS.indexOf(label) !== -1) {
      const ov = extractFromOutput(tool, field);
      if (ov !== null && ov !== undefined && ov !== '') return ov;
    }
    // 2) Input label match — show the tool's actual default input value
    const inp = (tool.inputs || []).find(i => String(i.label || '').toLowerCase().indexOf(label) !== -1);
    if (inp) {
      const v = buildDefaultValues(tool)[inp.id];
      if (inp.type === 'select') {
        const opt = (inp.opts || []).find(o => String(o.v) === String(v));
        return opt ? opt.l : String(v === undefined || v === null ? '' : v);
      }
      if (inp.type === 'checkbox') return v ? 'Yes' : 'No';
      return String(v === undefined || v === null ? '' : v);
    }
    // 3) Labeled extraction from the REAL computed output (Payment, Total
    // Interest, ROI...). '—' when this tool genuinely doesn't produce the field
    // (never duplicated result blobs across columns).
    const v = extractFromOutput(tool, field);
    return v !== null && v !== undefined && v !== '' ? v : '—';
  }

  function generateComparisonTable(catKey, tools) {
    if (tools.length < 2) return null;
    
    const topTools = tools.slice(0, 5);
    const commonFields = getCommonFields(catKey);
    
    return {
      headers: ['Calculator', ...commonFields],
      rows: topTools.map(t => {
        // Dedupe: a tool that doesn't own a field would otherwise repeat its whole
        // result blob in every column. Keep the first occurrence, blank the rest.
        const seen = {};
        const values = commonFields.map(f => {
          const v = getFieldValue(findTool(t.id), f);
          if (v === '—') return v;
          if (seen[v]) return '—';
          seen[v] = true;
          return v;
        });
        return { name: t.name, id: t.id, values };
      })
    };
  }
  
  function getCommonFields(catKey) {
    const fields = {
      finance: ['Loan Amount', 'Interest Rate', 'Term', 'Monthly Payment'],
      health: ['Weight', 'Height', 'Age', 'Result'],
      math: ['Input A', 'Input B', 'Operation', 'Result'],
      everyday: ['Input 1', 'Input 2', 'Operation', 'Result'],
      science: ['Value 1', 'Value 2', 'Constant', 'Result'],
      engineering: ['Voltage', 'Current', 'Resistance', 'Power'],
      construction: ['Length', 'Width', 'Height', 'Volume'],
      conversion: ['From Unit', 'To Unit', 'Value', 'Result'],
      business: ['Revenue', 'Cost', 'Margin', 'ROI'],
      education: ['Score 1', 'Score 2', 'Weight', 'Grade'],
      utilities: ['Input', 'Format', 'Operation', 'Output']
    };
    return fields[catKey] || ['Input', 'Output'];
  }
  
  function renderHubPage(catKey, attempt) {
    attempt = attempt || 0;
    // Self-healing boundary — catch corrupted hub data, repair silently
    // Max 2 retries to prevent infinite recursion if recovery also fails
    try {
      return _renderHubPageSafe(catKey);
    } catch (err) {
      if (attempt >= 2) {
        try { if (typeof window._pushCrash === 'function') window._pushCrash(err, 'CategoryHub.renderHubPage-FATAL'); } catch(e) {}
        return '<div class="hub-error">Category temporarily unavailable</div>';
      }
      // Wipe corrupted hub cache only
      try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
      // Dispatch to Sentry crash log
      try {
        if (typeof window._pushCrash === 'function') {
          window._pushCrash(err, 'CategoryHub.renderHubPage(' + catKey + ')');
        }
      } catch(e) {}
      // Reset to clean state and re-render
      hubData = { categories: {}, lastUpdated: Date.now(), popularTools: [] };
      return renderHubPage(catKey, attempt + 1);
    }
  }
  
  function _renderHubPageSafe(catKey) {
    const cat = hubData.categories[catKey];
    if (!cat) return '<div class="hub-error">Category not found</div>';
    
    let html = `
      <div class="category-hub">
        <header class="hub-header">
          <h1>${cat.icon} ${cat.name} Calculators</h1>
          <p class="hub-desc">${cat.description}</p>
          <div class="hub-stats">
            <span>${cat.tools.length} Calculators</span>
            <span>Updated ${new Date(hubData.lastUpdated).toLocaleDateString()}</span>
          </div>
        </header>
    `;
    
    if (cat.comparisonTable) {
      html += renderComparisonTable(cat.comparisonTable);
    }
    
    html += '<h2>' + Security.sanitizeHtml(cat.name) + ' Calculators</h2>';
    html += '<div class="hub-tools-grid">';
    cat.tools.forEach(t => {
      html += `
        <article class="tool-card hub-card reveal" onclick="App.navigateToTool('${Security.sanitizeJsString(t.id)}', '${Security.sanitizeJsString(catKey)}')">
          <div class="tool-icon">${t.icon}</div>
          <h3>${Security.sanitizeHtml(t.name)}</h3>
          <p>${Security.sanitizeHtml(t.description)}</p>
          <div class="tool-meta">
            <span class="usage">👁 ${t.usage} uses</span>
            <span class="go-btn">Open →</span>
          </div>
        </article>
      `;
    });
    html += '</div></div>';
    
    return html;
  }
  
  function renderComparisonTable(table) {
    let html = '<div class="comparison-table-wrap" role="region" tabindex="0" aria-label="Calculator comparison table (scrollable)"><table class="comparison-table"><thead><tr>';
    table.headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    table.rows.forEach(row => {
      html += '<tr>';
      html += `<td class="tool-name"><strong>${row.name}</strong></td>`;
      row.values.forEach(v => html += `<td>${v}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }
  
  function registerHubRoutes() {
    if (!window.App || routesRegistered) return;
    routesRegistered = true;
    const originalNavigate = window.App.navigate;
    window.App.navigate = function(route) {
      if (route && route.startsWith('hub/')) {
        const catKey = route.split('/')[1];
        renderCategoryHub(catKey);
        return;
      }
      return originalNavigate.apply(this, arguments);
    };
  }
  
  function renderCategoryHub(catKey) {
    const main = document.getElementById('main-content') || document.querySelector('main');
    if (main) {
      main.innerHTML = renderHubPage(catKey);
      window.scrollTo(0, 0);
    }
    // Scroll-reveal + 3D tilt for hub cards (skipped for reduced-motion/touch)
    if (window.App && typeof App.initScrollReveal === 'function') {
      try { App.initScrollReveal(); } catch (e) {}
    }
    if (window.AdvancedFeatures && typeof AdvancedFeatures.initCardTilt === 'function') {
      try { AdvancedFeatures.initCardTilt(); } catch (e) {}
    }
  }
  
  function getHubData() {
    return hubData;
  }
  
  // Refresh the cached hub data against the CURRENT CALC_DATA (used after lazy
  // category files hydrate — the init-time cache may have empty niche categories).
  function refresh() {
    loadHubData();
  }

  return { init, renderHubPage, renderCategoryHub, getHubData, refresh };
})();
if (typeof window !== 'undefined') window.CategoryHub = CategoryHub;