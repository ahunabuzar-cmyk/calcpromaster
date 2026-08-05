// Prefetching likely-next calculators based on category
const Prefetch = (function () {
  const PREFETCHED = new Set();
  const CATEGORY_RELATED = {
    finance: ['mortgage', 'compound-interest', 'loan-emi', 'retirement', 'investment', 'auto-loan'],
    health: ['bmi', 'bmr', 'calorie', 'body-fat', 'heart-rate', 'ideal-body-weight'],
    math: ['scientific', 'quadratic', 'percentage', 'fraction', 'statistics', 'triangle'],
    science: ['ohms-law', 'ideal-gas', 'wavelength', 'molarity', 'ph-calculator'],
    engineering: ['voltage-drop', 'power-factor', 'gear-ratio', 'torque', 'led-resistor'],
    construction: ['concrete', 'wall-area', 'roof-area', 'drywall', 'gravel'],
    conversion: ['length', 'weight', 'volume', 'speed', 'temperature'],
    business: ['roi', 'profit-margin', 'cash-flow', 'ltv', 'cac', 'break-even'],
    education: ['gpa', 'cgpa', 'final-grade', 'study-planner', 'reading-speed'],
    everyday: ['age', 'date-diff', 'trip-fuel-cost', 'tip', 'cooking-conversion'],
    utilities: ['qr-code', 'password-generator', 'color-converter', 'base64', 'uuid'],
    everyday: ['age', 'date-diff', 'fuel-cost', 'tip', 'cooking-conversion']
  };

  function getRelatedTools(catKey) {
    const related = CATEGORY_RELATED[catKey] || [];
    const cat = CALC_DATA[catKey];
    if (!cat) return related;
    // Add first 3 tools from same category
    cat.tools.slice(0, 3).forEach(t => {
      if (!related.includes(t.id)) related.push(t.id);
    });
    return related;
  }

  function prefetchCategory(catKey) {
    const tools = getRelatedTools(catKey);
    tools.forEach(toolId => {
      if (!PREFETCHED.has(toolId)) {
        PREFETCHED.add(toolId);
        // In a real SPA, this would preload the tool's data
        // For now, we just mark it as prefetched
      }
    });
  }

  function initPrefetchOnHover() {
    // Prefetch when hovering over category cards
    document.addEventListener('mouseover', (e) => {
      const catCard = e.target.closest('.category-card');
      if (catCard) {
        const onclick = catCard.getAttribute('onclick');
        if (onclick) {
          const match = onclick.match(/App\.navigate\('([^']+)'\)/);
          if (match) {
            prefetchCategory(match[1]);
          }
        }
      }
      // Prefetch when hovering over tool cards
      const toolCard = e.target.closest('.tool-card');
      if (toolCard) {
        const onclick = toolCard.getAttribute('onclick');
        if (onclick) {
          const match = onclick.match(/App\.navigateToTool\('([^']+)'/);
          if (match) {
            PREFETCHED.add(match[1]);
          }
        }
      }
    }, { passive: true });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPrefetchOnHover);
  } else {
    initPrefetchOnHover();
  }

  return { prefetchCategory, getRelatedTools };
})();
if (typeof window !== 'undefined') window.Prefetch = Prefetch;