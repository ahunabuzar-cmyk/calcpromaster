// Main data file - combines all calculator categories and static pages
//
// CRASH-PROOF DATA LOADER (safeTools): each category's tools array lives in its
// own file (js/data/*.js) which declares a top-level const (e.g. FINANCE_TOOLS).
// If ANY data file ever fails to load (404, filename mismatch, script error),
// the bare identifier reference would throw a ReferenceError and take down the
// WHOLE app (stuck Loading). The call sites below guard with `typeof` — which is
// the ONE operator that never throws on an undeclared identifier — so a missing
// file only empties THAT category and logs a console warning; every other
// calculator keeps working.
// NOTE: must NOT use eval()/Function() here — the site's CSP (script-src without
// unsafe-eval) blocks them on Netlify, which would empty EVERY category in prod.
function safeTools(value, name) {
  if (!Array.isArray(value)) {
    try { console.error('[CalcProMaster] Missing tools array: ' + name + ' — check script tag / filename in index.html'); } catch (e) {}
    return [];
  }
  return value;
}

const CALC_DATA = {
  finance: { name: 'Finance', icon: '💰', tools: safeTools(typeof FINANCE_TOOLS !== 'undefined' ? FINANCE_TOOLS : [], 'FINANCE_TOOLS') },
  health: { name: 'Health & Fitness', icon: '❤️', tools: safeTools(typeof HEALTH_TOOLS !== 'undefined' ? HEALTH_TOOLS : [], 'HEALTH_TOOLS') },
  math: { name: 'Math', icon: '🔢', tools: safeTools(typeof MATH_TOOLS !== 'undefined' ? MATH_TOOLS : [], 'MATH_TOOLS') },
  everyday: { name: 'Everyday', icon: '📅', tools: safeTools(typeof EVERYDAY_TOOLS !== 'undefined' ? EVERYDAY_TOOLS : [], 'EVERYDAY_TOOLS') },
  science: { name: 'Science', icon: '🔬', tools: safeTools(typeof SCIENCE_TOOLS !== 'undefined' ? SCIENCE_TOOLS : [], 'SCIENCE_TOOLS') },
  engineering: { name: 'Engineering', icon: '⚙️', tools: safeTools(typeof ENGINEERING_TOOLS !== 'undefined' ? ENGINEERING_TOOLS : [], 'ENGINEERING_TOOLS') },
  construction: { name: 'Construction', icon: '🏗️', tools: safeTools(typeof CONSTRUCTION_TOOLS !== 'undefined' ? CONSTRUCTION_TOOLS : [], 'CONSTRUCTION_TOOLS') },
  conversion: { name: 'Conversion', icon: '📏', tools: safeTools(typeof CONVERSION_TOOLS !== 'undefined' ? CONVERSION_TOOLS : [], 'CONVERSION_TOOLS') },
  business: { name: 'Business', icon: '📊', tools: safeTools(typeof BUSINESS_TOOLS !== 'undefined' ? BUSINESS_TOOLS : [], 'BUSINESS_TOOLS') },
  education: { name: 'Education', icon: '🎓', tools: safeTools(typeof EDUCATION_TOOLS !== 'undefined' ? EDUCATION_TOOLS : [], 'EDUCATION_TOOLS') },
  utilities: { name: 'Utilities', icon: '🛠️', tools: safeTools(typeof UTILITY_TOOLS !== 'undefined' ? UTILITY_TOOLS : [], 'UTILITY_TOOLS') },
  lifestyle: { name: 'Lifestyle & Home', icon: '🏠', tools: safeTools(typeof LIFESTYLE_TOOLS !== 'undefined' ? LIFESTYLE_TOOLS : [], 'LIFESTYLE_TOOLS') },
  regional: { name: 'Regional (India/PK/UAE)', icon: '🌏', tools: safeTools(typeof REGIONAL_TOOLS !== 'undefined' ? REGIONAL_TOOLS : [], 'REGIONAL_TOOLS') },
  food: { name: 'Food & Nutrition', icon: '🍎', tools: safeTools(typeof FOOD_NUTRITION_TOOLS !== 'undefined' ? FOOD_NUTRITION_TOOLS : [], 'FOOD_NUTRITION_TOOLS') },
  fitness: { name: 'Fitness & Exercise', icon: '💪', tools: safeTools(typeof FITNESS_TOOLS !== 'undefined' ? FITNESS_TOOLS : [], 'FITNESS_TOOLS') },
  auto: { name: 'Auto & Transport', icon: '🚗', tools: safeTools(typeof AUTO_TRANSPORT_TOOLS !== 'undefined' ? AUTO_TRANSPORT_TOOLS : [], 'AUTO_TRANSPORT_TOOLS') },
  career: { name: 'Career & Freelance', icon: '💼', tools: safeTools(typeof CAREER_TOOLS !== 'undefined' ? CAREER_TOOLS : [], 'CAREER_TOOLS') },
  homegarden: { name: 'Home & Garden', icon: '🏡', tools: safeTools(typeof HOME_GARDEN_TOOLS !== 'undefined' ? HOME_GARDEN_TOOLS : [], 'HOME_GARDEN_TOOLS') },
  tech: { name: 'Tech & Digital', icon: '💻', tools: safeTools(typeof TECH_TOOLS !== 'undefined' ? TECH_TOOLS : [], 'TECH_TOOLS') },
  family: { name: 'Parenting & Family', icon: '👨‍👩‍👧‍👦', tools: safeTools(typeof FAMILY_TOOLS !== 'undefined' ? FAMILY_TOOLS : [], 'FAMILY_TOOLS') },
};

// Flatten all tools for quick lookup
const ALL_TOOLS = [];
Object.values(CALC_DATA).forEach(cat => { cat.tools.forEach(t => ALL_TOOLS.push(t)); });

const TOOL_MAP = {};
ALL_TOOLS.forEach(t => { TOOL_MAP[t.id] = t; });

// Rebuildable live count — refreshCalcData() updates this as lazy categories load.
let TOTAL_CALCULATORS = ALL_TOOLS.length;

// Static pages
const STATIC_PAGES = {
  '': { title: 'CalcProMaster - 1201+ free online calculators', desc: 'Free advanced online calculators for finance, health, math, science, business and more. Step-by-step solutions, charts, and smart features.', type: 'home' },
  'about': { title: 'About CalcProMaster', desc: 'Learn about CalcProMaster - your comprehensive calculator resource with 1201+ tools across 20 categories.', type: 'about' },
  'privacy': { title: 'Privacy Policy', desc: 'CalcProMaster privacy policy. Calculations run locally in your browser; optional analytics and advertising only with your consent.', type: 'privacy' },
  'terms': { title: 'Terms of Service', desc: 'CalcProMaster Terms of Service. Free calculator tools provided as-is without warranty.', type: 'terms' },
  'disclaimer-finance': { title: 'Financial Disclaimer', desc: 'CalcProMaster financial calculators are for educational purposes only. Not financial advice.', type: 'disclaimer' },
  'disclaimer-health': { title: 'Health Disclaimer', desc: 'CalcProMaster health calculators are for informational purposes only. Not medical advice.', type: 'disclaimer' },
  'disclaimer-general': { title: 'General Disclaimer', desc: 'CalcProMaster provides calculators as-is. Results may not be accurate for all situations.', type: 'disclaimer' },
  'cookies': { title: 'Cookie Policy', desc: 'CalcProMaster cookie policy. We use minimal local storage, no tracking cookies.', type: 'cookies' },
  'contact': { title: 'Contact CalcProMaster', desc: 'Get in touch with the CalcProMaster team for questions, feedback, or bug reports.', type: 'contact' },
  'editorial-policy': { title: 'Editorial Policy', desc: 'How CalcProMaster content is written, verified and corrected — published formulas, hand-checked examples, automated QA on every build.', type: 'editorial-policy' },
  'guides': { title: 'Educational Guides & How-To Articles', desc: 'Free step-by-step guides explaining how common calculations work — percentages, loan EMIs, age, BMI and more — with formulas and worked examples.', type: 'guides' },
  'favorites': { title: 'Your Favorites', desc: 'Your saved favorite calculators on CalcProMaster.', type: 'favorites' },
  'history': { title: 'Calculation History', desc: 'View your past calculations on CalcProMaster.', type: 'history' },
  'compare': { title: 'Compare Results', desc: 'Compare your pinned calculation results side by side.', type: 'compare' },
  '404': { title: 'Page Not Found', desc: 'The page you are looking for does not exist.', type: '404' },
};

// Category meta for SEO
const CATEGORY_META = {
  finance: { title: 'Finance Calculators', desc: 'Free financial calculators for loans, mortgages, investments, taxes, retirement and more.' },
  health: { title: 'Health & Fitness Calculators', desc: 'Calculate BMI, BMR, calories, body fat, heart rate and other health metrics.' },
  math: { title: 'Math Calculators', desc: 'Scientific calculators, algebra, geometry, statistics and more math tools.' },
  everyday: { title: 'Everyday Calculators', desc: 'Age, date, fuel cost, cooking and other everyday life calculators.' },
  science: { title: 'Science Calculators', desc: 'Physics, chemistry and general science calculators.' },
  engineering: { title: 'Engineering Calculators', desc: 'Electrical, mechanical and civil engineering calculators.' },
  construction: { title: 'Construction Calculators', desc: 'Building and construction material calculators.' },
  conversion: { title: 'Unit Conversion Calculators', desc: 'Convert length, weight, volume, speed and more.' },
  business: { title: 'Business Calculators', desc: 'ROI, profit margin, cash flow, CAC, LTV and other business metrics.' },
  education: { title: 'Education Calculators', desc: 'GPA, test scores, study planners and other education tools.' },
  utilities: { title: 'Utility Calculators', desc: 'QR codes, passwords, color converters and other handy tools.' },
  lifestyle: { title: 'Lifestyle & Home Calculators', desc: 'Moving, rental, cooking, pet care and everyday home calculators.' },
  regional: { title: 'Regional Calculators (India/PK/UAE)', desc: 'FD, RD, PPF, GST, income tax and regional finance calculators.' },
  food: { title: 'Food & Nutrition Calculators', desc: 'Calories, macros, keto, BMI, meal planning and nutrition trackers.' },
  fitness: { title: 'Fitness & Exercise Calculators', desc: 'Running pace, 1RM, heart rate, calories burned and workout planners.' },
  auto: { title: 'Auto & Transport Calculators', desc: 'Fuel cost, EV charging, car loan, depreciation and mileage calculators.' },
  career: { title: 'Career & Freelance Calculators', desc: 'Salary converter, freelance rate, job offer compare and side hustle profit.' },
  homegarden: { title: 'Home & Garden Calculators', desc: 'Paint, wallpaper, lighting, AC size, garden soil and DIY project calculators.' },
  tech: { title: 'Tech & Digital Calculators', desc: 'Download time, data usage, password strength, domain value and tech ROI.' },
  family: { title: 'Parenting & Family Calculators', desc: 'Child height prediction, family budget, college savings, childcare cost and estate planning.' },
};

// Rebuild the flattened lookup maps after a lazy category file hydrates.
// Called by js/data-loader.js on script onload. ALL_TOOLS/TOOL_MAP are rebuilt
// from the (now populated) CALC_DATA so search, TOOL_MAP lookups, related-tools
// matching, and the live total count all see the new tools immediately.
function refreshCalcData() {
  ALL_TOOLS.length = 0;
  Object.keys(CALC_DATA).forEach(function (key) {
    CALC_DATA[key].tools.forEach(function (t) { ALL_TOOLS.push(t); });
  });
  Object.keys(TOOL_MAP).forEach(function (k) { delete TOOL_MAP[k]; });
  ALL_TOOLS.forEach(function (t) { TOOL_MAP[t.id] = t; });
  TOTAL_CALCULATORS = ALL_TOOLS.length;
  if (typeof window !== 'undefined') {
    window.ALL_TOOLS = ALL_TOOLS;
    window.TOOL_MAP = TOOL_MAP;
    window.TOTAL_CALCULATORS = TOTAL_CALCULATORS;
  }
}

if (typeof window !== 'undefined') {
  window.CALC_DATA = CALC_DATA;
  window.ALL_TOOLS = ALL_TOOLS;
  window.TOOL_MAP = TOOL_MAP;
  window.TOTAL_CALCULATORS = TOTAL_CALCULATORS;
  window.STATIC_PAGES = STATIC_PAGES;
  window.CATEGORY_META = CATEGORY_META;
  window.refreshCalcData = refreshCalcData;
}
