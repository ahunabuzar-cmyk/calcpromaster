// Category Hub Pages with Comparison Tables
const CategoryHub = (function () {
  const STORAGE_KEY = 'calcpro_category_hubs';
  const DAILY_KEY = 'calcpro_calc_of_day';
  
  let hubData = {};
  
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
    if (!hubData.lastUpdated || Date.now() - hubData.lastUpdated > 86400000) {
      generateHubData();
    }
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
        description: cat.desc || '',
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
  
  function generateComparisonTable(catKey, tools) {
    if (tools.length < 2) return null;
    
    const topTools = tools.slice(0, 5);
    const commonFields = getCommonFields(catKey);
    
    return {
      headers: ['Calculator', ...commonFields],
      rows: topTools.map(t => ({
        name: t.name,
        id: t.id,
        values: commonFields.map(f => getFieldValue(t.id, f))
      }))
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
  
  function getFieldValue(toolId, field) {
    const mockData = {
      'mortgage': { 'Loan Amount': '$300,000', 'Interest Rate': '6.5%', 'Term': '30 years', 'Monthly Payment': '$1,896' },
      'loan-emi': { 'Loan Amount': '$25,000', 'Interest Rate': '8%', 'Term': '5 years', 'Monthly Payment': '$507' },
      'compound-interest': { 'Principal': '$10,000', 'Rate': '7%', 'Time': '10 years', 'Final Amount': '$20,096' },
      'bmi': { 'Weight': '70 kg', 'Height': '175 cm', 'Age': '30', 'Result': '22.9 (Normal)' },
      'calorie': { 'Weight': '70 kg', 'Height': '175 cm', 'Age': '30', 'Result': '2,000 cal/day' }
    };
    return mockData[toolId]?.[field] || '—';
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
    
    html += '<div class="hub-tools-grid">';
    cat.tools.forEach(t => {
      html += `
        <article class="tool-card hub-card" onclick="App.navigateToTool('${Security.sanitizeJsString(t.id)}', '${Security.sanitizeJsString(catKey)}')">
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
    let html = '<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr>';
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
    if (!window.App) return;
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
  }
  
  function getHubData() {
    return hubData;
  }
  
  return { init, renderHubPage, renderCategoryHub, getHubData };
})();
if (typeof window !== 'undefined') window.CategoryHub = CategoryHub;