// Calculator of the Day Spotlight
const CalculatorOfTheDay = (function () {
  const STORAGE_KEY = 'calcpro_calc_of_day';
  const ROTATION_KEY = 'calcpro_calc_rotation';
  
  // `name` is carried HERE, not looked up in CALC_DATA. The card renders above
  // the fold on the homepage, where only the four popular data chunks are
  // loaded — a rotation pick from science/tech/utilities/business/education used
  // to return '' on the first pass, kick a 68KB category fetch, and fill the card
  // a second later. That late fill pushed everything below it down (CLS 0.088)
  // and made finance.js 65% unused JavaScript on every homepage load. Names are
  // verified against js/data/*.js by tests/unit/calculator-of-day-names.test.js.
  const DAILY_CALCULATORS = [
    { id: 'mortgage', cat: 'finance', name: 'Mortgage Calculator', highlight: 'Home Loan Expert', reason: 'Most popular mortgage calculator - plan your dream home' },
    { id: 'compound-interest', cat: 'finance', name: 'Compound Interest Calculator', highlight: 'Wealth Builder', reason: 'Watch your money grow with compound interest magic' },
    { id: 'bmi', cat: 'health', name: 'BMI Calculator', highlight: 'Health Check', reason: 'Quick BMI assessment in seconds' },
    { id: 'loan-emi', cat: 'finance', name: 'Loan EMI Calculator', highlight: 'Payment Planner', reason: 'Know your exact monthly payments before borrowing' },
    { id: 'percentage', cat: 'math', name: 'Percentage Calculator', highlight: 'Daily Essential', reason: 'Discounts, tips, markups - solved instantly' },
    { id: 'retirement', cat: 'finance', name: 'Retirement Calculator', highlight: 'Future Planner', reason: 'Calculate when you can retire comfortably' },
    { id: 'currency-converter', cat: 'finance', name: 'Currency Converter', highlight: 'Global Traveler', reason: 'Real-time exchange rates for 150+ currencies' },
    { id: 'auto-loan', cat: 'finance', name: 'Auto Loan Calculator', highlight: 'Car Buyer', reason: 'Smart financing before you visit the dealership' },
    { id: 'date-diff', cat: 'everyday', name: 'Date Difference Calculator', highlight: 'Time Tracker', reason: 'Exact days between any two dates' },
    { id: 'age', cat: 'everyday', name: 'Age Calculator', highlight: 'Age Expert', reason: 'Precise age in years, months, and days' },
    { id: 'tip', cat: 'finance', name: 'Tip Calculator', highlight: 'Bill Splitter', reason: 'Fair tips and splits for group dining' },
    { id: 'quadratic', cat: 'math', name: 'Quadratic Equation Solver', highlight: 'Equation Solver', reason: 'Find roots of ax² + bx + c = 0 instantly' },
    { id: 'scientific', cat: 'math', name: 'Scientific Calculator', highlight: 'Science Mode', reason: 'Full scientific calculator with 40+ functions' },
    { id: 'ohms-law', cat: 'science', name: "Ohm's Law Calculator", highlight: 'Circuit Designer', reason: 'V = I × R for electrical calculations' },
    { id: 'ideal-gas', cat: 'science', name: 'Ideal Gas Law', highlight: 'Chemistry Lab', reason: 'PV = nRT for gas law problems' },
    { id: 'concrete', cat: 'everyday', name: 'Concrete Calculator', highlight: 'Builder', reason: 'Yards of concrete for slabs, footings, walls' },
    { id: 'roi', cat: 'finance', name: 'ROI Calculator', highlight: 'Investor', reason: 'Return on investment percentage calculator' },
    { id: 'profit-margin', cat: 'business', name: 'Profit Margin Calculator', highlight: 'Entrepreneur', reason: 'Margin vs markup - know your true profit' },
    { id: 'gpa', cat: 'education', name: 'GPA Calculator', highlight: 'Student', reason: 'Semester and cumulative GPA calculator' },
    { id: 'grade-needed', cat: 'education', name: 'Final Grade Needed (Weighted)', highlight: 'Grade Planner', reason: 'What score do you need on the final?' },
    { id: 'password-generator', cat: 'tech', name: 'Strong Password Generator', highlight: 'Security Pro', reason: 'Strong, memorable passwords instantly' },
    { id: 'qr-generator', cat: 'utilities', name: 'QR Code Generator', highlight: 'QR Creator', reason: 'Generate QR codes for links, text, WiFi' },
    { id: 'unit-converter', cat: 'utilities', name: 'Universal Unit Converter', highlight: 'Unit Master', reason: 'Length, weight, volume, temperature, speed' },
    { id: 'trip-fuel-cost', cat: 'everyday', name: 'Trip Fuel Cost Calculator', highlight: 'Road Tripper', reason: 'Gas cost calculator for any journey' }
  ];
  
  let currentCalc = null;
  let rotationIndex = 0;
  
  function getTodaysCalculator() {
    const today = new Date().toDateString();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (stored.date === today && stored.calc) {
        return stored.calc;
      }
    } catch (e) {}
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const calc = DAILY_CALCULATORS[dayOfYear % DAILY_CALCULATORS.length];
    
    const data = { date: today, calc, index: dayOfYear % DAILY_CALCULATORS.length };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    return calc;
  }
  
function renderSpotlight(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.style.display = 'block';
    container.innerHTML = buildSpotlightHTML(containerId);
  }

  // Builds the spotlight card HTML as a pure string (no DOM write) so the home
  // page can embed it in its SINGLE render pass — late injection of the card
  // after mainContent.innerHTML is set causes layout shift (CLS) on mobile.
  function buildSpotlightHTML(containerId) {
    const calc = getTodaysCalculator();
    const tool = getToolInfo(calc.id, calc.cat) || (calc.name ? { name: calc.name, cat: calc.cat } : null);
    if (!tool) {
      // Daily pick lives in a lazily-loaded category (science/tech/utilities/etc.)
      // and its data hasn't arrived yet: load it on demand, then re-render the
      // spotlight. First pass still returns '' so the home render stays pure.
      if (window.DataLoader && DataLoader.isLazy(calc.cat) && !DataLoader.isLoaded(calc.cat)) {
        DataLoader.ensure(calc.cat).then(function (ok) {
          if (ok) renderSpotlight(containerId);
        }).catch(function () {});
      }
      return '';
    }
    
    const usage = CalcAnalytics.getData().tools?.[calc.id]?.count || 0;
    const isFav = AdvancedFeatures.isFavorite ? AdvancedFeatures.isFavorite(calc.id) : false;
    
    return `
      <div class="calc-of-day-card">
        <div class="cod-badge">🌟 Calculator of the Day</div>
        <div class="cod-content">
          <div class="cod-icon">${getCategoryIcon(calc.cat)}</div>
          <div class="cod-info">
            <h2>${tool.name}</h2>
            <p class="cod-highlight">${calc.highlight}</p>
            <p class="cod-reason">${calc.reason}</p>
            <div class="cod-meta">
              <span class="cod-category">${getCategoryName(calc.cat)}</span>
              <span class="cod-usage">👁 ${usage.toLocaleString()} calculations</span>
              ${isFav ? '<span class="cod-fav">♥️ In your favorites</span>' : ''}
            </div>
          </div>
        </div>
        <button type="button" class="cod-action-btn" data-tool-id="${Security.sanitizeHtml(calc.id)}" data-cat="${Security.sanitizeHtml(calc.cat)}">
          Open Calculator →
        </button>
        <div class="cod-share">
          <button type="button" class="cod-share-btn" title="Share today's calculator">
            📤 Share
          </button>
          <button type="button" class="cod-fav-btn" data-tool-id="${Security.sanitizeHtml(calc.id)}" data-tool-name="${Security.sanitizeHtml(tool.name)}" data-cat="${Security.sanitizeHtml(calc.cat)}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            ${isFav ? '♥️' : '🤍'}
          </button>
        </div>
      </div>
    `;
  }
  
  function getToolInfo(toolId, catKey) {
    const cat = CALC_DATA[catKey];
    if (!cat) return null;
    return cat.tools.find(t => t.id === toolId) || null;
  }
  
  function getCategoryIcon(catKey) {
    const icons = {
      finance: '💰', health: '🏥', math: '📐', everyday: '🔧',
      science: '🔬', engineering: '⚙️', construction: '🏗️',
      conversion: '🔄', business: '📊', education: '🎓', utilities: '🛠️'
    };
    return icons[catKey] || '📊';
  }
  
  function getCategoryName(catKey) {
    const cat = CALC_DATA[catKey];
    return cat?.name || catKey;
  }
  
  function shareCalcOfDay() {
    const calc = getTodaysCalculator();
    const tool = getToolInfo(calc.id, calc.cat);
    const text = `🌟 Calculator of the Day: ${tool.name}\n${calc.reason}\nTry it free at CalcProMaster!`;
    
    if (navigator.share) {
      navigator.share({ title: 'Calculator of the Day', text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        App.showToast('Copied to clipboard!');
      });
    }
  }
  
  function getTodaysCalc() {
    return getTodaysCalculator();
  }
  
  function getAllRotation() {
    return DAILY_CALCULATORS;
  }
  
  // Delegated, not inline: this card is injected into the homepage DOM, so
  // inline onclick attributes here were 3 of the handlers a crawler audit found
  // in the served HTML. One listener covers every re-render.
  function bindDelegates() {
    if (document._cpCodDelegate) return;
    document._cpCodDelegate = true;
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.cod-action-btn, .cod-share-btn, .cod-fav-btn') : null;
      if (!btn) return;
      if (btn.classList.contains('cod-action-btn')) {
        if (window.App && App.navigateToTool) App.navigateToTool(btn.getAttribute('data-tool-id'), btn.getAttribute('data-cat'));
      } else if (btn.classList.contains('cod-share-btn')) {
        shareCalcOfDay();
      } else if (btn.classList.contains('cod-fav-btn')) {
        if (window.AdvancedFeatures && AdvancedFeatures.toggleFavorite) {
          AdvancedFeatures.toggleFavorite(btn.getAttribute('data-tool-id'), btn.getAttribute('data-tool-name'), btn.getAttribute('data-cat'));
        }
        var host = btn.closest('[id]');
        renderSpotlight(host ? host.id : 'calc-of-day-spotlight');
      }
    });
  }

  function init() {
    bindDelegates();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        renderSpotlight('calc-of-day-spotlight');
      });
    } else {
      renderSpotlight('calc-of-day-spotlight');
    }
  }
  
  return { 
    init, 
    renderSpotlight, 
    buildSpotlightHTML,
    getTodaysCalc, 
    getAllRotation,
    shareCalcOfDay 
  };
})();

if (typeof window !== 'undefined') window.CalculatorOfTheDay = CalculatorOfTheDay;