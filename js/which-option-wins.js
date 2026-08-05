// Optimization recommender - financial calculator options comparison
const OptimizeCalculatorOptions = (function () {
  const CACHE_KEY = 'calcpro_optimizer_cache';
  
  function calculateOptionFitness(inputs, tool) {
    const factors = [];
    
    if (tool.id === 'mortgage') {
      const monthly = inputs['loan_amount'] * (inputs['rate'] / 100) / 12;
      const years = 30;
      const total = monthly * years * 12;
      factors.push({ factor: Math.min(total / (inputs['loan_amount'] * 1.2), 1), weight: 0.4 });
      factors.push({ factor: Math.min(1 - inputs['down_payment'] / (inputs['loan_amount'] || 1), 1), weight: 0.3 });
      factors.push({ factor: Math.min(inputs['rate'], 6) / 6, weight: 0.3 });
    } else if (tool.id === 'compound-interest') {
      const amount = inputs['principal'] * Math.pow(1 + inputs['rate'] / 100 / 12, inputs['years'] * 12);
      factors.push({ factor: Math.min(amount / (inputs['principal'] * 2), 1), weight: 0.5 });
      factors.push({ factor: Math.min(inputs['rate'], 12) / 12, weight: 0.5 });
    }
    
    return {
      totalFitness: factors.reduce((sum, f) => sum + f.factor * f.weight, 0),
      factors
    };
  }
  
  function findBestOptions(inputs, toolId) {
    if (toolId === 'mortgage') {
      const options = [
        { name: 'Standard', rate: 4.5, down: 20 },
        { name: 'Minimal', rate: 5.5, down: 10 },
        { name: 'Premium', rate: 3.5, down: 25 }
      ];
      return options.map(o => ({
        name: o.name,
        rate: o.rate,
        down: o.down,
        score: calculateOptionFitness({ ...inputs, rate: o.rate, down_payment: o.down }, { id: toolId }).totalFitness
      })).sort((a, b) => b.score - a.score);
    } else if (toolId === 'compound-interest') {
      const options = [
        { name: '3 months', years: 0.25 },
        { name: '6 months', years: 0.5 },
        { name: '1 year', years: 1 }
      ];
      return options.map(o => ({
        name: o.name,
        years: o.years,
        score: calculateOptionFitness({ ...inputs, years: o.years }, { id: toolId }).totalFitness
      })).sort((a, b) => b.score - a.score);
    }
    return [];
  }
  
  function renderOptimizationResults(toolId, inputs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const options = findBestOptions(inputs, toolId);
    if (options.length === 0) {
      container.innerHTML = '<p class="no-data">No optimization options available.</p>';
      return;
    }
    container.innerHTML = `
      <div class="optimization-results">
        <h3>Which Option Wins</h3>
        <p class="optim-desc">Best performing options based on your inputs:</p>
        <div class="optim-cards">
          ${options.map((opt, i) => `
            <div class="optim-card ${i === 0 ? 'top-ranked' : ''}">
              <div class="optim-rank">#${i + 1}</div>
              <h4>${Security.sanitizeHtml(opt.name)}</h4>
              <div class="optim-details">
                ${Object.entries(opt).map(([k, v]) => {
                  if (k === 'score' || !v) return '';
                  // XSS-hardening: option values can echo user inputs — escape key + value
                  return `<div class="optim-detail">
                    <span class="optim-key">${Security.sanitizeHtml(k)}:</span>
                    <span class="optim-value">${Security.sanitizeHtml(typeof v === 'number' ? v.toFixed(2) : v)}</span>
                  </div>`;
                }).filter(Boolean).join('')}
              </div>
              <div class="optim-score">Score: ${(opt.score * 100).toFixed(1)}%</div>
            </div>
          `).join('')}
        </div>
        <div class="optim-note"><strong>Note:</strong> Options ranked by estimated performance.</div>
      </div>
    `;
  }
  
  function getCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; }
  }
  
  function setCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }
  
  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
  }
  
  return { calculateOptionFitness, findBestOptions, renderOptimizationResults, getCache, setCache, clearCache };
})();
if (typeof window !== 'undefined') window.OptimizeCalculatorOptions = OptimizeCalculatorOptions;