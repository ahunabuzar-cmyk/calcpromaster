// Privacy-friendly local analytics - no external tracking
const CalcAnalytics = (function () {
  const KEY = 'calcpro_analytics';

  function load() {
    return JSON.parse(localStorage.getItem(KEY) || JSON.stringify({
      firstVisit: Date.now(), totalVisits: 0, totalCalcs: 0, tools: {}, lastVisit: Date.now(),
    }));
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function trackVisit() {
    const d = load();
    d.totalVisits = (d.totalVisits || 0) + 1;
    d.lastVisit = Date.now();
    save(d);
  }

  function trackCalc(toolId, toolName) {
    const d = load();
    d.totalCalcs = (d.totalCalcs || 0) + 1;
    d.tools[toolId] = d.tools[toolId] || { name: toolName, count: 0 };
    d.tools[toolId].count++;
    save(d);
  }

  function getData() { return load(); }

  function renderWidget() {
    const d = load();
    const el = document.getElementById('analytics-widget');
    if (!el) return;
    const topTools = Object.entries(d.tools || {}).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    el.innerHTML = `
      <div class="analytics-grid">
        <div class="analytics-card"><div class="analytics-num">${d.totalVisits || 0}</div><div class="analytics-label">Visits</div></div>
        <div class="analytics-card"><div class="analytics-num">${d.totalCalcs || 0}</div><div class="analytics-label">Calculations</div></div>
        <div class="analytics-card"><div class="analytics-num">${Object.keys(d.tools || {}).length}</div><div class="analytics-label">Tools Used</div></div>
        <div class="analytics-card"><div class="analytics-num">${Math.floor((Date.now() - d.firstVisit) / 86400000)}</div><div class="analytics-label">Days Active</div></div>
      </div>
      ${topTools.length ? `<div class="analytics-top"><h4>Most Used</h4>${topTools.map(([id, t]) => `<div class="analytics-tool-row"><span>${t.name}</span><span class="analytics-count">${t.count}</span></div>`).join('')}</div>` : ''}
    `;
  }

  return { trackVisit, trackCalc, getData, renderWidget };
})();
if (typeof window !== 'undefined') window.CalcAnalytics = CalcAnalytics;
