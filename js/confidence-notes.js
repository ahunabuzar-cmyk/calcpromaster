// Confidence & Accuracy Notes for Calculator Results
const ConfidenceNotes = (function () {
  const CONFIDENCE_KEY = 'calcpro_confidence_notes';
  const ACCURACY_DATA = {
    'mortgage': {
      confidence: 'high',
      accuracy: '±$10-50/month',
      assumptions: [
        'Fixed interest rate for entire term',
        'No prepayment penalties',
        'Monthly compounding',
        'Property tax & insurance not included'
      ],
      limitations: [
        'Does not include PMI for <20% down',
        'Assumes 30-day months',
        'Rates may vary by lender/credit score'
      ],
      disclaimer: 'Estimate only. Actual payments vary by lender, location, and credit profile.'
    },
    'loan-emi': {
      confidence: 'high',
      accuracy: '±$5-20/month',
      assumptions: [
        'Fixed interest rate',
        'Monthly payments',
        'No processing fees included'
      ],
      limitations: [
        'Does not include insurance',
        'Rate may vary by credit score'
      ],
      disclaimer: 'EMI calculation excludes processing fees, insurance, and other charges.'
    },
    'compound-interest': {
      confidence: 'very-high',
      accuracy: '±$1-5',
      assumptions: [
        'Constant interest rate',
        'Regular compounding intervals',
        'No withdrawals or additional deposits'
      ],
      limitations: [
        'Market returns are not guaranteed',
        'Inflation not accounted for',
        'Tax implications not included'
      ],
      disclaimer: 'Investment returns are not guaranteed. Past performance ≠ future results.'
    },
    'retirement': {
      confidence: 'medium',
      accuracy: '±15-25%',
      assumptions: [
        'Constant annual return',
        'Regular contributions',
        'No early withdrawals'
      ],
      limitations: [
        'Market volatility not modeled',
        'Inflation reduces purchasing power',
        'Tax laws may change',
        'Life expectancy varies'
      ],
      disclaimer: 'Retirement projections are estimates. Consult a financial advisor.'
    },
    'bmi': {
      confidence: 'medium',
      accuracy: '±1-2 BMI points',
      assumptions: [
        'Standard adult body composition',
        'Height measured without shoes',
        'Weight measured in light clothing'
      ],
      limitations: [
        'Does not distinguish muscle vs fat',
        'Less accurate for athletes/elderly',
        'Ethnic variations not considered',
        'Not diagnostic for health conditions'
      ],
      disclaimer: 'BMI is a screening tool, not a diagnostic measure. Consult a healthcare provider.'
    },
    'bmr': {
      confidence: 'medium',
      accuracy: '±100-200 kcal/day',
      assumptions: [
        'Sedentary to moderate activity',
        'Normal thyroid function',
        'Thermoneutral environment'
      ],
      limitations: [
        'Individual metabolic variation ±15%',
        'Muscle mass significantly affects BMR',
        'Medical conditions not accounted for'
      ],
      disclaimer: 'BMR estimates vary. For precise measurement, use indirect calorimetry.'
    },
    'currency-converter': {
      confidence: 'high',
      accuracy: '±0.5-2%',
      assumptions: [
        'Mid-market exchange rate',
        'No bank/transfer fees',
        'Rate from open.er-api.com (1hr cache)'
      ],
      limitations: [
        'Banks add 1-3% markup',
        'Weekend rates may be stale',
        'Crypto rates highly volatile'
      ],
      disclaimer: 'Rates are indicative. Actual rates include fees and vary by provider.'
    },
    'percentage': {
      confidence: 'very-high',
      accuracy: 'Exact (mathematical)',
      assumptions: ['Standard arithmetic'],
      limitations: ['Floating-point precision limits'],
      disclaimer: 'Mathematically exact within JavaScript precision limits.'
    },
    'auto-loan': {
      confidence: 'high',
      accuracy: '±$10-30/month',
      assumptions: [
        'Fixed APR for loan term',
        'No prepayment penalty',
        'Down payment reduces principal'
      ],
      limitations: [
        'Dealer fees not included',
        'GAP insurance optional',
        'Credit score affects actual APR'
      ],
      disclaimer: 'Auto loan terms vary by dealer, credit union, and credit profile.'
    },
    'tax': {
      confidence: 'medium',
      accuracy: '±5-15%',
      assumptions: [
        'Current tax year brackets',
        'Standard deduction applied',
        'No complex deductions/credits'
      ],
      limitations: [
        'State/local taxes vary',
        'Tax laws change annually',
        'Does not handle AMT, capital gains'
      ],
      disclaimer: 'Tax estimates only. Consult CPA or tax professional for filing.'
    },
    'investment': {
      confidence: 'low',
      accuracy: '±20-40%',
      assumptions: [
        'Constant rate of return',
        'Regular contributions',
        'Reinvestment of dividends'
      ],
      limitations: [
        'Market returns are unpredictable',
        'Sequence of returns risk',
        'Fees & taxes reduce net returns'
      ],
      disclaimer: 'Investment projections are hypothetical. Not investment advice.'
    },
    'savings-goal': {
      confidence: 'medium',
      accuracy: '±10-20%',
      assumptions: [
        'Fixed interest rate',
        'Regular monthly deposits',
        'No withdrawals'
      ],
      limitations: [
        'Rate changes over time',
        'Emergency expenses not modeled',
        'Inflation erodes real value'
      ],
      disclaimer: 'Savings timelines are estimates. Adjust for real-world variability.'
    }
  };
  
  function getConfidenceData(toolId) {
    return ACCURACY_DATA[toolId] || getDefaultConfidence();
  }
  
  function getDefaultConfidence() {
    return {
      confidence: 'medium',
      accuracy: '±10-20%',
      assumptions: ['Standard calculation assumptions apply'],
      limitations: ['Results are estimates based on inputs provided'],
      disclaimer: 'For informational purposes only. Verify with professional.'
    };
  }
  
  function renderConfidencePanel(toolId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const data = getConfidenceData(toolId);
    const confidenceClass = `confidence-${data.confidence}`;
    const confidenceLabels = {
      'very-high': 'Very High',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    
    let html = `
      <div class="confidence-panel ${confidenceClass}">
        <div class="confidence-header">
          <span class="confidence-badge">
            <span class="confidence-dot"></span>
            Accuracy: ${confidenceLabels[data.confidence] || data.confidence}
          </span>
          <span class="accuracy-range">${data.accuracy}</span>
        </div>
        <div class="confidence-disclaimer">${data.disclaimer}</div>
        <details class="confidence-details">
          <summary>View Assumptions & Limitations</summary>
          <div class="confidence-section">
            <h4>✓ Key Assumptions</h4>
            <ul>${data.assumptions.map(a => `<li>${Security.sanitizeHtml(a)}</li>`).join('')}</ul>
          </div>
          <div class="confidence-section">
            <h4>⚠ Limitations</h4>
            <ul>${data.limitations.map(l => `<li>${Security.sanitizeHtml(l)}</li>`).join('')}</ul>
          </div>
        </details>
      </div>
    `;
    
    container.innerHTML = html;
    
    if (!document.getElementById('confidence-styles')) {
      injectStyles();
    }
  }
  
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'confidence-styles';
    style.textContent = `
      .confidence-panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin: 16px 0;
      }
      .confidence-panel.confidence-very-high { border-left: 4px solid #22c55e; }
      .confidence-panel.confidence-high { border-left: 4px solid #3b82f6; }
      .confidence-panel.confidence-medium { border-left: 4px solid #f59e0b; }
      .confidence-panel.confidence-low { border-left: 4px solid #ef4444; }
      .confidence-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .confidence-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
      }
      .confidence-very-high .confidence-badge { background: #dcfce7; color: #166534; }
      .confidence-high .confidence-badge { background: #dbeafe; color: #1e40af; }
      .confidence-medium .confidence-badge { background: #fef3c7; color: #92400e; }
      .confidence-low .confidence-badge { background: #fee2e2; color: #991b1b; }
      .confidence-dot {
        width: 8px; height: 8px; border-radius: 50%;
      }
      .confidence-very-high .confidence-dot { background: #22c55e; }
      .confidence-high .confidence-dot { background: #3b82f6; }
      .confidence-medium .confidence-dot { background: #f59e0b; }
      .confidence-low .confidence-dot { background: #ef4444; }
      .accuracy-range {
        font-size: 13px;
        color: var(--text-light);
        font-family: monospace;
      }
      .confidence-disclaimer {
        font-size: 13px;
        color: var(--text-light);
        margin-bottom: 12px;
        font-style: italic;
      }
      .confidence-details summary {
        cursor: pointer;
        font-weight: 600;
        color: var(--primary-color);
        padding: 8px 0;
      }
      .confidence-section { margin-top: 12px; }
      .confidence-section h4 {
        margin: 0 0 8px;
        font-size: 14px;
        color: var(--text);
      }
      .confidence-section ul {
        margin: 0; padding-left: 20px;
        font-size: 13px;
        color: var(--text-light);
        line-height: 1.8;
      }
    `;
    document.head.appendChild(style);
  }
  
  function autoAttachToResults() {
    var domTarget = document.getElementById('mainContent') || document.querySelector('main') || document.body;
    const observer = new MutationObserver(function () {
      document.querySelectorAll('.result-section, .calc-result, [data-tool-id]').forEach(function (el) {
        const toolId = el.dataset.toolId || el.getAttribute('data-tool-id');
        if (toolId && !el.querySelector('.confidence-panel')) {
          const panelId = 'confidence-' + toolId + '-' + Date.now();
          const div = document.createElement('div');
          div.id = panelId;
          el.appendChild(div);
          renderConfidencePanel(toolId, panelId);
        }
      });
    });
    observer.observe(domTarget, { childList: true, subtree: true });
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoAttachToResults);
    } else {
      autoAttachToResults();
    }
  }
  
  return { getConfidenceData, renderConfidencePanel, init };
})();
if (typeof window !== 'undefined') window.ConfidenceNotes = ConfidenceNotes;