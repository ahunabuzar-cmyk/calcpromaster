// Calculator of the Day Spotlight
const CalculatorOfTheDay = (function () {
  const STORAGE_KEY = 'calcpro_calc_of_day';
  const ROTATION_KEY = 'calcpro_calc_rotation';
  
  const DAILY_CALCULATORS = [
    { id: 'mortgage', cat: 'finance', highlight: 'Home Loan Expert', reason: 'Most popular mortgage calculator - plan your dream home' },
    { id: 'compound-interest', cat: 'finance', highlight: 'Wealth Builder', reason: 'Watch your money grow with compound interest magic' },
    { id: 'bmi', cat: 'health', highlight: 'Health Check', reason: 'Quick BMI assessment in seconds' },
    { id: 'loan-emi', cat: 'finance', highlight: 'Payment Planner', reason: 'Know your exact monthly payments before borrowing' },
    { id: 'percentage', cat: 'math', highlight: 'Daily Essential', reason: 'Discounts, tips, markups - solved instantly' },
    { id: 'retirement', cat: 'finance', highlight: 'Future Planner', reason: 'Calculate when you can retire comfortably' },
    { id: 'currency-converter', cat: 'finance', highlight: 'Global Traveler', reason: 'Real-time exchange rates for 150+ currencies' },
    { id: 'auto-loan', cat: 'finance', highlight: 'Car Buyer', reason: 'Smart financing before you visit the dealership' },
    { id: 'date-diff', cat: 'everyday', highlight: 'Time Tracker', reason: 'Exact days between any two dates' },
    { id: 'age', cat: 'everyday', highlight: 'Age Expert', reason: 'Precise age in years, months, and days' },
    { id: 'tip', cat: 'finance', highlight: 'Bill Splitter', reason: 'Fair tips and splits for group dining' },
    { id: 'quadratic', cat: 'math', highlight: 'Equation Solver', reason: 'Find roots of ax² + bx + c = 0 instantly' },
    { id: 'scientific', cat: 'math', highlight: 'Science Mode', reason: 'Full scientific calculator with 40+ functions' },
    { id: 'ohms-law', cat: 'science', highlight: 'Circuit Designer', reason: 'V = I × R for electrical calculations' },
    { id: 'ideal-gas', cat: 'science', highlight: 'Chemistry Lab', reason: 'PV = nRT for gas law problems' },
    { id: 'concrete', cat: 'everyday', highlight: 'Builder', reason: 'Yards of concrete for slabs, footings, walls' },
    { id: 'roi', cat: 'finance', highlight: 'Investor', reason: 'Return on investment percentage calculator' },
    { id: 'profit-margin', cat: 'business', highlight: 'Entrepreneur', reason: 'Margin vs markup - know your true profit' },
    { id: 'gpa', cat: 'education', highlight: 'Student', reason: 'Semester and cumulative GPA calculator' },
    { id: 'grade-needed', cat: 'education', highlight: 'Grade Planner', reason: 'What score do you need on the final?' },
    { id: 'password-generator', cat: 'tech', highlight: 'Security Pro', reason: 'Strong, memorable passwords instantly' },
    { id: 'qr-generator', cat: 'utilities', highlight: 'QR Creator', reason: 'Generate QR codes for links, text, WiFi' },
    { id: 'unit-converter', cat: 'utilities', highlight: 'Unit Master', reason: 'Length, weight, volume, temperature, speed' },
    { id: 'trip-fuel-cost', cat: 'everyday', highlight: 'Road Tripper', reason: 'Gas cost calculator for any journey' }
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
    const tool = getToolInfo(calc.id, calc.cat);
    if (!tool) return '';
    
    const usage = CalcAnalytics.getData().tools?.[calc.id]?.count || 0;
    const isFav = AdvancedFeatures.isFavorite ? AdvancedFeatures.isFavorite(calc.id) : false;
    
    return `
      <div class="calc-of-day-card">
        <div class="cod-badge">🌟 Calculator of the Day</div>
        <div class="cod-content">
          <div class="cod-icon">${getCategoryIcon(calc.cat)}</div>
          <div class="cod-info">
            <h3>${tool.name}</h3>
            <p class="cod-highlight">${calc.highlight}</p>
            <p class="cod-reason">${calc.reason}</p>
            <div class="cod-meta">
              <span class="cod-category">${getCategoryName(calc.cat)}</span>
              <span class="cod-usage">👁 ${usage.toLocaleString()} calculations</span>
              ${isFav ? '<span class="cod-fav">♥️ In your favorites</span>' : ''}
            </div>
          </div>
        </div>
        <button class="cod-action-btn" onclick="App.navigateToTool('${Security.sanitizeJsString(calc.id)}', '${Security.sanitizeJsString(calc.cat)}')">
          Open Calculator →
        </button>
        <div class="cod-share">
          <button onclick="CalculatorOfTheDay.shareCalcOfDay()" class="cod-share-btn" title="Share today's calculator">
            📤 Share
          </button>
          <button onclick="AdvancedFeatures.toggleFavorite('${calc.id}', '${tool.name}', '${calc.cat}'); CalculatorOfTheDay.renderSpotlight('${containerId}');" class="cod-fav-btn" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
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
  
  function init() {
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