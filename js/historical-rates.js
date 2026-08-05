// Historical Rate Context for Financial Calculators
const HistoricalRateContext = (function () {
  const CACHE_KEY = 'calcpro_historical_rates';
  const CACHE_TTL = 86400000; // 24 hours
  
  const HISTORICAL_DATA = {
    mortgage_rates: {
      label: 'US 30-Year Fixed Mortgage Rate',
      unit: '%',
      source: 'Freddie Mac PMMS',
      data: {
        '2020': [3.72, 3.45, 3.23, 3.13, 3.15, 3.16, 3.01, 2.94, 2.87, 2.83, 2.77, 2.71],
        '2021': [2.65, 2.73, 3.02, 3.06, 2.96, 2.98, 2.88, 2.87, 2.90, 3.07, 3.10, 3.11],
        '2022': [3.22, 3.76, 4.17, 4.72, 5.10, 5.52, 5.30, 5.13, 5.89, 6.66, 6.58, 6.36],
        '2023': [6.15, 6.32, 6.54, 6.39, 6.35, 6.71, 6.81, 7.09, 7.19, 7.63, 7.44, 6.95],
        '2024': [6.69, 6.77, 6.82, 7.10, 7.03, 6.95, 6.86, 6.73, 6.46, 6.44, 6.78, 6.60]
      }
    },
    fed_funds_rate: {
      label: 'Federal Funds Rate',
      unit: '%',
      source: 'Federal Reserve',
      data: {
        '2020': [1.75, 1.75, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
        '2021': [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
        '2022': [0.25, 0.25, 0.50, 0.50, 1.00, 1.75, 2.50, 2.50, 3.25, 4.00, 4.00, 4.50],
        '2023': [4.50, 4.75, 5.00, 5.00, 5.25, 5.25, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50],
        '2024': [5.50, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50, 5.00, 4.75, 4.50, 4.25]
      }
    },
    treasury_10y: {
      label: '10-Year Treasury Yield',
      unit: '%',
      source: 'US Treasury',
      data: {
        '2020': [1.88, 1.56, 0.87, 0.64, 0.65, 0.66, 0.54, 0.53, 0.68, 0.87, 0.84, 0.93],
        '2021': [1.11, 1.44, 1.74, 1.63, 1.58, 1.47, 1.25, 1.30, 1.52, 1.55, 1.45, 1.51],
        '2022': [1.78, 1.83, 2.34, 2.71, 2.84, 3.01, 2.67, 2.88, 3.83, 4.05, 3.88, 3.87],
        '2023': [3.79, 3.92, 3.47, 3.42, 3.65, 3.84, 3.96, 4.25, 4.57, 4.88, 4.33, 3.88],
        '2024': [3.95, 4.25, 4.20, 4.68, 4.49, 4.40, 4.22, 3.89, 3.78, 4.15, 4.35, 4.10]
      }
    },
    cpi_inflation: {
      label: 'CPI Inflation Rate (YoY)',
      unit: '%',
      source: 'BLS',
      data: {
        '2020': [2.5, 2.3, 1.5, 0.3, 0.1, 0.6, 1.0, 1.3, 1.4, 1.2, 1.2, 1.4],
        '2021': [1.4, 1.7, 2.6, 4.2, 5.0, 5.4, 5.4, 5.3, 5.4, 6.2, 6.8, 7.0],
        '2022': [7.5, 7.9, 8.5, 8.3, 8.6, 9.1, 8.5, 8.3, 8.2, 7.7, 7.1, 6.5],
        '2023': [6.4, 6.0, 5.0, 4.9, 4.0, 3.0, 3.2, 3.7, 3.7, 3.2, 3.1, 3.4],
        '2024': [3.1, 3.2, 3.5, 3.4, 3.3, 3.0, 2.9, 2.5, 2.4, 2.6, 2.7, 2.7]
      }
    },
    savings_rate: {
      label: 'Personal Savings Rate',
      unit: '%',
      source: 'BEA',
      data: {
        '2020': [7.6, 8.4, 12.9, 33.8, 24.7, 19.5, 18.6, 14.7, 14.3, 13.6, 12.9, 13.5],
        '2021': [20.5, 13.1, 11.8, 9.6, 10.5, 10.1, 9.3, 9.4, 7.9, 7.1, 6.9, 7.2],
        '2022': [6.4, 6.2, 5.8, 5.6, 5.2, 5.0, 5.0, 5.1, 4.8, 4.5, 4.2, 3.9],
        '2023': [4.6, 4.6, 4.5, 4.3, 4.5, 4.3, 3.5, 3.9, 4.6, 3.8, 3.9, 3.7],
        '2024': [3.8, 3.6, 3.2, 3.4, 3.5, 3.5, 3.4, 3.3, 3.5, 4.1, 4.2, 4.4]
      }
    }
  };
  
  let cache = null;
  let cacheTime = 0;
  
  function getHistoricalRates(type) {
    return HISTORICAL_DATA[type] || null;
  }
  
  function getAllRateTypes() {
    return Object.keys(HISTORICAL_DATA);
  }
  
  function getRateHistory(type, years = 5) {
    const rateData = getHistoricalRates(type);
    if (!rateData) return null;
    
    const currentYear = new Date().getFullYear();
    const result = { label: rateData.label, unit: rateData.unit, source: rateData.source, series: [] };
    
    for (let y = currentYear - years + 1; y <= currentYear; y++) {
      const yearData = rateData.data[String(y)];
      if (yearData) {
        yearData.forEach((val, m) => {
          result.series.push({
            date: `${y}-${String(m + 1).padStart(2, '0')}`,
            value: val,
            year: y,
            month: m + 1
          });
        });
      }
    }
    return result;
  }
  
  function getCurrentRate(type) {
    const history = getRateHistory(type, 1);
    if (!history || !history.series.length) return null;
    return history.series[history.series.length - 1].value;
  }
  
  function getRateAtDate(type, dateStr) {
    const history = getRateHistory(type, 10);
    if (!history) return null;
    const match = history.series.find(d => d.date === dateStr);
    return match ? match.value : null;
  }
  
  function calculateRateChange(type, months = 12) {
    const history = getRateHistory(type, 2);
    if (!history || history.series.length < months + 1) return null;
    
    const current = history.series[history.series.length - 1].value;
    const past = history.series[history.series.length - 1 - months].value;
    const change = current - past;
    const pctChange = past !== 0 ? ((change / Math.abs(past)) * 100).toFixed(1) : 0;
    
    return { current, past, change: change.toFixed(2), pctChange, trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
  }
  
  function renderRateContextPanel(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const history = getRateHistory(type, 5);
    const currentRate = getCurrentRate(type);
    const change12m = calculateRateChange(type, 12);
    const rateData = getHistoricalRates(type);
    
    if (!history || !rateData) {
      container.innerHTML = '<p class="no-data">No historical data available</p>';
      return;
    }
    
    const sparkline = generateSparkline(history.series.slice(-24).map(s => s.value));
    
    container.innerHTML = `
      <div class="rate-context-panel">
        <div class="rate-header">
          <h4>${Security.sanitizeHtml(rateData.label)}</h4>
          <span class="rate-source">Source: ${Security.sanitizeHtml(rateData.source)}</span>
        </div>
        <div class="rate-current">
          <span class="rate-value">${currentRate !== null ? currentRate.toFixed(2) : 'N/A'}${rateData.unit}</span>
          <span class="rate-change ${change12m ? change12m.trend : ''}">
            ${change12m ? (change12m.change > 0 ? '+' : '') + change12m.change + rateData.unit + ' (' + change12m.pctChange + '%) YoY' : ''}
          </span>
        </div>
        <div class="rate-sparkline">${sparkline}</div>
        <details class="rate-history-details">
          <summary>View ${history.series.length}-month history</summary>
          <div class="rate-history-table">
            <table>
              <thead><tr><th>Date</th><th>Rate${rateData.unit}</th><th>Change</th></tr></thead>
              <tbody>
                ${history.series.slice(-12).reverse().map((d, i, arr) => {
                  const prev = arr[i + 1];
                  const chg = prev ? (d.value - prev.value).toFixed(2) : '—';
                  return `<tr><td>${d.date}</td><td>${d.value.toFixed(2)}</td><td class="${chg > 0 ? 'up' : chg < 0 ? 'down' : ''}">${chg !== '—' ? (chg > 0 ? '+' : '') + chg : chg}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </details>
        <p class="rate-disclaimer">Historical data for context only. Not a forecast. ${rateData.label} varies by lender, credit profile, and market conditions.</p>
      </div>
    `;
    
    if (!document.getElementById('rate-context-styles')) {
      injectStyles();
    }
  }
  
  function generateSparkline(values) {
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 200, height = 40;
    const stepX = width / (values.length - 1 || 1);
    
    let path = `M 0 ${height - ((values[0] - min) / range) * height}`;
    values.forEach((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      path += ` L ${x} ${y}`;
    });
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${width - stepX}" cy="${height - ((values[values.length - 1] - min) / range) * height}" r="3" fill="var(--primary)"/>
    </svg>`;
  }
  
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'rate-context-styles';
    style.textContent = `
      .rate-context-panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin: 16px 0;
      }
      .rate-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .rate-header h4 { margin: 0; font-size: 15px; }
      .rate-source { font-size: 11px; color: var(--text-light); }
      .rate-current { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
      .rate-value { font-size: 28px; font-weight: 700; color: var(--text); }
      .rate-change { font-size: 13px; padding: 4px 8px; border-radius: 12px; font-weight: 600; }
      .rate-change.up { background: #fee2e2; color: #dc2626; }
      .rate-change.down { background: #dcfce7; color: #16a34a; }
      .rate-change.flat { background: #f3f4f6; color: #6b7280; }
      .rate-sparkline { height: 40px; margin: 8px 0 12px; }
      .rate-history-details summary { cursor: pointer; font-weight: 600; color: var(--primary); padding: 8px 0; }
      .rate-history-table { overflow-x: auto; margin-top: 8px; }
      .rate-history-table table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .rate-history-table th, .rate-history-table td { padding: 6px 10px; text-align: right; border-bottom: 1px solid var(--border); }
      .rate-history-table th { background: var(--bg); font-weight: 600; }
      .rate-history-table td:first-child { text-align: left; }
      .rate-history-table td.up { color: #dc2626; }
      .rate-history-table td.down { color: #16a34a; }
      .rate-disclaimer { font-size: 11px; color: var(--text-light); margin-top: 12px; font-style: italic; }
    `;
    document.head.appendChild(style);
  }
  
  function autoAttachToCalculators() {
    const rateCalcs = ['mortgage', 'auto-loan', 'refinance', 'home-afford', 'compound-interest', 'retirement', 'investment'];
    var domTarget = document.getElementById('mainContent') || document.querySelector('main') || document.body;
    const observer = new MutationObserver(function () {
      document.querySelectorAll('.calc-result-panel, .result-section').forEach(function (el) {
        var toolEl = el.closest('[data-tool-id]');
        var toolId = toolEl ? toolEl.dataset.toolId : null;
        if (!toolId) toolId = document.body.dataset.currentTool;
        if (toolId && rateCalcs.indexOf(toolId) !== -1 && !el.querySelector('.rate-context-panel')) {
          var type = (['mortgage', 'auto-loan', 'refinance', 'home-afford'].indexOf(toolId) !== -1) 
            ? 'mortgage_rates' : 'fed_funds_rate';
          var panelId = 'rate-context-' + toolId + '-' + Date.now();
          var div = document.createElement('div');
          div.id = panelId;
          el.appendChild(div);
          renderRateContextPanel(type, panelId);
        }
      });
    });
    observer.observe(domTarget, { childList: true, subtree: true });
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoAttachToCalculators);
    } else {
      autoAttachToCalculators();
    }
  }
  
  return { 
    getHistoricalRates, 
    getRateHistory, 
    getCurrentRate, 
    getRateAtDate,
    calculateRateChange,
    renderRateContextPanel,
    init,
    getAllRateTypes
  };
})();

if (typeof window !== 'undefined') window.HistoricalRateContext = HistoricalRateContext;