// ====== Shared tool data aggregator ======
// Imports the 20 vanilla-JS tool-suite files (single source of truth, lives in ../js/data)
// and exposes them in the classic CALC_DATA / TOOL_MAP shape for the Next.js app.
// Safe to import on the server (SSR metadata) and on the client (engine lookup) —
// the calc()/steps() functions only touch browser globals (Charts/Security/...) at
// call time, never at module load.

import financeTools from '@calcpro-js/data/finance.js';
import healthTools from '@calcpro-js/data/health.js';
import mathTools from '@calcpro-js/data/math.js';
import everydayTools from '@calcpro-js/data/everyday.js';
import scienceTools from '@calcpro-js/data/science.js';
import engineeringTools from '@calcpro-js/data/engineering.js';
import constructionTools from '@calcpro-js/data/construction.js';
import conversionTools from '@calcpro-js/data/conversion.js';
import businessTools from '@calcpro-js/data/business.js';
import educationTools from '@calcpro-js/data/education.js';
import utilityTools from '@calcpro-js/data/utilities.js';
import lifestyleTools from '@calcpro-js/data/lifestyle.js';
import regionalTools from '@calcpro-js/data/regional.js';
import foodTools from '@calcpro-js/data/food-nutrition.js';
import fitnessTools from '@calcpro-js/data/fitness-exercise.js';
import autoTools from '@calcpro-js/data/auto-transport.js';
import careerTools from '@calcpro-js/data/career-freelance.js';
import homeGardenTools from '@calcpro-js/data/home-garden.js';
import techTools from '@calcpro-js/data/tech-digital.js';
import familyTools from '@calcpro-js/data/parenting-family.js';

const CATEGORY_DEFS = {
  finance: { name: 'Finance', icon: '💰', tools: financeTools },
  health: { name: 'Health & Fitness', icon: '❤️', tools: healthTools },
  math: { name: 'Math', icon: '🔢', tools: mathTools },
  everyday: { name: 'Everyday', icon: '📅', tools: everydayTools },
  science: { name: 'Science', icon: '🔬', tools: scienceTools },
  engineering: { name: 'Engineering', icon: '⚙️', tools: engineeringTools },
  construction: { name: 'Construction', icon: '🏗️', tools: constructionTools },
  conversion: { name: 'Conversion', icon: '📏', tools: conversionTools },
  business: { name: 'Business', icon: '📊', tools: businessTools },
  education: { name: 'Education', icon: '🎓', tools: educationTools },
  utilities: { name: 'Utilities', icon: '🛠️', tools: utilityTools },
  lifestyle: { name: 'Lifestyle & Home', icon: '🏠', tools: lifestyleTools },
  regional: { name: 'Regional (India/PK/UAE)', icon: '🌏', tools: regionalTools },
  food: { name: 'Food & Nutrition', icon: '🍎', tools: foodTools },
  fitness: { name: 'Fitness & Exercise', icon: '💪', tools: fitnessTools },
  auto: { name: 'Auto & Transport', icon: '🚗', tools: autoTools },
  career: { name: 'Career & Freelance', icon: '💼', tools: careerTools },
  homegarden: { name: 'Home & Garden', icon: '🏡', tools: homeGardenTools },
  tech: { name: 'Tech & Digital', icon: '💻', tools: techTools },
  family: { name: 'Parenting & Family', icon: '👨‍👩‍👧‍👦', tools: familyTools },
};

// Category SEO metadata (mirrors the vanilla data.js)
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

const ALL_TOOLS = Object.values(CATEGORY_DEFS).flatMap((cat) => cat.tools);

const TOOL_MAP = {};
for (const t of ALL_TOOLS) TOOL_MAP[t.id] = t;

const TOTAL_CALCULATORS = ALL_TOOLS.length;

export function getCategory(key) {
  return CATEGORY_DEFS[key] || null;
}

export function getTool(categoryKey, toolId) {
  const cat = CATEGORY_DEFS[categoryKey];
  if (!cat) return null;
  return cat.tools.find((t) => t.id === toolId) || null;
}

export function getToolById(toolId) {
  return TOOL_MAP[toolId] || null;
}

export function getCategoryMeta(key) {
  return CATEGORY_META[key] || null;
}

export { CATEGORY_DEFS, ALL_TOOLS, TOOL_MAP, TOTAL_CALCULATORS };
