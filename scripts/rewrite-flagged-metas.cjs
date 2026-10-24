/* ============================================================
 * rewrite-flagged-metas.cjs
 * ------------------------------------------------------------
 * Replaces the 183 auto-generated ("Free X: enter the Y and get
 * a Z. Every step shown, nothing leaves your browser.") meta
 * descriptions with hand-written, benefit-led copy.
 *
 * Source of truth: js/seo-content.js  (then run split-seo.cjs)
 * Dry run by default. WRITE=1 persists.
 *
 *   node scripts/rewrite-flagged-metas.cjs          # preview
 *   WRITE=1 node scripts/rewrite-flagged-metas.cjs  # apply
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const DESC = {
  // ---------- business ----------
  'invoice-due-date': 'Work out an invoice due date and the late fee it accrues from the amount owed and the days overdue — free, instant, with every step shown.',
  'conversion-rate': 'Turn total visitors and conversions into a conversion rate, with the percentage and the full per-step working shown in your browser.',
  'break-even-revenue': 'Find the revenue a business must earn to break even from fixed costs, price and variable cost — the formula and each step shown instantly.',
  'depreciation': 'Calculate straight-line depreciation from asset cost, salvage value and useful life, with the yearly charge and closing book value itemised step by step.',
  'market-share': 'Work out market share from your revenue and the total market revenue, with the percentage and the complete calculation shown instantly.',

  // ---------- career ----------
  'bonus-calc': 'Estimate a bonus or commission payout from base salary and bonus percentage, with the gross figure and each step of the maths shown instantly.',
  'freelance-hourly-rate': 'Turn a desired annual income into a freelance hourly rate, allowing for billable hours, overheads and time off — every figure itemised and shown.',
  'commission-plan': 'Work out sales commission earnings from sales volume and commission rate, with the payout and the full per-step calculation shown in your browser.',
  'redundancy-pay': 'Estimate statutory redundancy pay from age, weekly pay and years of service, with each band of the calculation itemised and shown step by step.',
  'severance-calc': 'Estimate a severance package from annual salary and years of service, with the multiplier, total payout and full working shown instantly.',

  // ---------- education ----------
  'sat-score': 'Estimate a total SAT score from the Math and Reading and Writing sections, with the section breakdown and percentile range shown step by step.',
  'graduation-date': 'Project a graduation date from your start date and course length, with term breaks and the resulting month and year worked out step by step.',
  'percentile-rank': 'Find the percentile rank of a score within a set of results, with the rank, its position in the group and the full working shown instantly.',

  // ---------- engineering ----------
  'stress-strain': 'Calculate stress and strain from applied force and cross-section area, with the resulting MPa, strain and Young\u2019s modulus shown step by step.',
  'voltage-drop': 'Work out voltage drop along a cable run from current, length and conductor size, with the percentage loss and each step of the maths shown.',
  'power-factor': 'Calculate power factor from real and apparent power, with the phase angle, reactive power and the full working shown instantly in your browser.',
  'gear-ratio': 'Work out the gear ratio between driver and driven gears from tooth counts, with the output speed and torque change shown step by step.',
  'battery-life': 'Estimate how long a battery will last from its capacity and the device\u2019s current draw, with runtime and the full calculation shown instantly.',
  'impedance': 'Calculate impedance from resistance and reactance, with the magnitude in ohms, the phase angle and each step of the maths shown.',
  'belt-length': 'Work out the belt length needed for a two-pulley drive from pulley diameters and centre distance, with the formula and each step shown.',
  'spring-rate': 'Calculate spring rate from applied force and deflection, with the stiffness in newtons per metre and the full per-step calculation shown instantly.',
  'rc-time-constant': 'Find the RC time constant from resistance and capacitance, with the charging time and the full working shown instantly in your browser.',
  'section-modulus': 'Calculate the section modulus of a beam section from its width and depth, with the geometric properties and each step of the maths shown.',

  // ---------- finance ----------
  'quick-ratio': 'Work out the quick ratio from cash, receivables and current liabilities, with the liquidity figure and the full calculation shown step by step.',
  't-bill': 'Calculate the price and yield of a Treasury bill from face value, days to maturity and the discount rate, with each step of the maths shown.',
  'net-operating-income': 'Work out net operating income from gross rental income, vacancy losses and operating expenses, with the annual NOI and each step shown.',
  'apr-annual': 'Calculate the true APR on a loan from the amount, fees and points, with the cost of borrowing and the full per-step calculation shown.',
  'retirement': 'Estimate your retirement fund from current savings, monthly contributions and expected return, with the projected pot and each step shown.',
  'investment': 'Project the future value of an investment from the initial amount, annual return and years, with compounding and every step of the maths shown.',
  'savings-goal': 'Work out the monthly amount to save to hit a goal in a set time, with the target, timeline and full per-step calculation shown instantly.',
  'tax': 'Estimate income tax from your earnings, filing status and deductions, with the bracket-by-bracket breakdown and effective rate shown step by step.',
  'inflation': 'See how inflation erodes the value of money over time, turning a present amount into its future equivalent with each step of the maths shown.',
  'net-worth-calculator': 'Add up total assets and total liabilities to get net worth, with the balance-sheet breakdown and each step of the calculation shown.',
  'refinance': 'Decide whether refinancing a mortgage is worth it from the new rate, closing costs and remaining term, with break-even time and steps shown.',
  'break-even': 'Find the break-even point in units from fixed costs, price per unit and variable cost, with the formula and each step of the maths shown.',
  'cash-flow': 'Work out monthly cash flow from income and expenses, with the surplus or shortfall and the full per-step calculation shown in your browser.',
  'discount': 'Calculate a discounted price from the original price and discount percentage, with the amount saved and each step of the maths shown instantly.',
  'present-value': 'Discount a future sum back to today from the future value, discount rate and periods, with the present value and every step shown.',
  'future-value': 'Compound a present amount forward from the rate and number of periods, with the future value and each step of the calculation shown.',
  'amortization': 'Build a full loan amortization schedule from the amount, rate and term, with each payment split into interest and principal and shown step by step.',
  'dividend': 'Work out annual dividend income from the number of shares and the dividend per share, with the total payout and each step of the maths shown.',
  'mortgage-payoff': 'See how extra payments shorten a mortgage and cut interest, with the payoff date, interest saved and the full calculation shown step by step.',
  'bond-price': 'Calculate a bond price from face value, coupon rate, yield and years to maturity, with the present value of each cash flow shown step by step.',
  'dividend-yield': 'Work out dividend yield from the annual dividend and share price, with the percentage return and the full per-step calculation shown instantly.',
  'enterprise-value': 'Calculate enterprise value from market cap, total debt and cash, with the takeover valuation and each step of the maths shown.',
  'sharpe-ratio': 'Work out the Sharpe ratio from portfolio return, risk-free rate and volatility, with the risk-adjusted figure and every step shown.',
  'closing-costs': 'Estimate closing costs on a home purchase from the price, down payment and loan type, with each fee itemised and the total shown step by step.',
  'cap-rate': 'Work out the cap rate on a property from net operating income and value, with the yield percentage and the full calculation shown instantly.',
  'price-to-earnings': 'Calculate the P/E ratio from share price and earnings per share, with the valuation multiple and each step of the maths shown in your browser.',
  'savings-rate': 'Work out your savings rate from monthly take-home pay and the amount saved, with the percentage and the full calculation shown step by step.',
  'current-ratio-finance': 'Calculate the current ratio from current assets and current liabilities, with the liquidity figure and each step of the maths shown instantly.',
  'operating-margin': 'Work out operating margin from revenue and operating income, with the profitability percentage and the full per-step calculation shown.',
  'portfolio-return': 'Calculate the weighted return of a portfolio from each holding\u2019s weight and return, with the blended result and every step shown instantly.',
  'prorated-rent': 'Work out prorated rent from the monthly rent and the days occupied, with the partial-month amount and each step of the maths shown.',
  'sortino-ratio': 'Calculate the Sortino ratio from portfolio return, risk-free rate and downside deviation, with the risk-adjusted figure and every step shown.',
  'risk-reward-ratio': 'Work out the risk-reward ratio of a trade from entry, target and stop, with the potential gain against risk and each step shown instantly.',
  'position-size': 'Calculate a position size from account size, risk per trade and stop distance, with the share count and the full calculation shown step by step.',
  'stop-loss': 'Work out a stop-loss price from the entry price and stop distance, with the risk per share and the full per-step calculation shown instantly.',
  'cost-basis-avg': 'Calculate the average cost basis of a holding from each purchase\u2019s shares and price, with the blended figure and every step shown.',
  'ev-ebitda': 'Work out the EV/EBITDA multiple from enterprise value and EBITDA, with the valuation ratio and each step of the calculation shown instantly.',
  'peg-ratio': 'Calculate the PEG ratio from the P/E ratio and expected growth rate, with the growth-adjusted valuation and every step of the maths shown.',
  'free-cash-flow': 'Work out free cash flow from operating cash flow and capital expenditure, with the available cash figure and each step shown step by step.',
  'asset-turnover': 'Calculate asset turnover from revenue and total assets, with how hard the asset base works and the full per-step calculation shown instantly.',
  'effective-tax-rate': 'Work out the effective tax rate from total tax paid and taxable income, with the real percentage and each step of the calculation shown.',
  'portfolio-beta': 'Calculate the beta of a portfolio from each holding\u2019s weight and beta, with the blended volatility measure and every step shown instantly.',
  'yield-to-worst': 'Work out yield to worst across a bond\u2019s call and maturity scenarios, with the lowest yield and each step of the calculation shown.',
  'duration-bond': 'Calculate modified duration from Macaulay duration and yield, with the price sensitivity to rates and the full working shown step by step.',

  // ---------- fitness ----------
  'running-pace': 'Work out running pace and split times from distance and target finish, with per-kilometre splits and each step of the maths shown.',
  'flexibility-score': 'Score a sit-and-reach flexibility test against age-based norms, with the rating, comparison and full calculation shown instantly.',
  'cycling-speed': 'Work out cycling time from distance and average speed, with the estimated ride duration and each step of the calculation shown instantly.',
  'max-heart-rate': 'Estimate maximum heart rate from age using standard formulas, with the training zones derived from it and each step shown.',
  'one-rep-max': 'Estimate your one-rep max from a weight lifted and reps performed, with the projected 1RM and each step of the calculation shown instantly.',
  'training-max': 'Work out a training max from your one-rep max, with the working weight for programming and each step of the maths shown instantly.',
  'stride-length': 'Estimate stride length from your height, with the average step and the full per-step calculation shown instantly in your browser.',

  // ---------- health ----------
  'ovulation-calculator': 'Estimate the fertile window from cycle length, period date and luteal phase, with ovulation day and each step of the calculation shown.',
  'cholesterol-ratio': 'Work out the total-cholesterol-to-HDL ratio from your lipid numbers, with the risk category and each step of the calculation shown.',
  'nap-planner': 'Plan a nap that fits a full sleep cycle from the current time and your sleep need, with the best wake-up time and steps shown.',
  'body-fat': 'Estimate body fat percentage from weight, waist and neck measurements, with the result, category and full working shown step by step.',
  'ideal-body-weight': 'Estimate ideal body weight from height using standard formulas, with the healthy range and each step of the calculation shown instantly.',
  'pregnancy': 'Estimate a pregnancy due date from the last menstrual period, with gestational age and each step of the calculation shown in your browser.',
  'ovulation': 'Estimate the ovulation date from the last period and cycle length, with the fertile window and each step of the calculation shown instantly.',
  'fatigue-score': 'Score fatigue from sleep, energy and workload inputs, with the severity band and each step of the calculation shown instantly.',
  'sleep-debt': 'Work out sleep debt from the hours needed each night and the hours actually slept, with the accumulated shortfall and steps shown.',
  'glycemic-load': 'Calculate glycemic load from a food\u2019s glycemic index, carbs and serving size, with the blood-sugar impact and each step shown.',
  'anion-gap': 'Calculate the anion gap from sodium, chloride and bicarbonate, with the result and each step of the clinical calculation shown instantly.',
  'ponderal-index': 'Calculate the ponderal index from weight and height, with the body-composition index and each step of the calculation shown instantly.',

  // ---------- homegarden ----------
  'room-area': 'Work out room area and flooring needs from length and width, with square footage, waste allowance and each step of the maths shown.',
  'deck-stain': 'Estimate deck stain and sealant from the deck area and number of coats, with litres or gallons needed and each step shown step by step.',
  'curtain-length': 'Work out curtain panel length and fabric from window height and heading style, with the drop and yardage and each step shown.',
  'rug-size': 'Find the right rug size for a room from its length and width, with the best fit and each step of the calculation shown instantly.',
  'garden-soil': 'Work out garden soil and mulch volume from bed length, width and depth, with cubic yards needed and each step of the maths shown.',
  'plant-spacing': 'Work out how many plants you need from bed size and spacing, with the grid count and each step of the calculation shown instantly.',
  'cabinet-door': 'Work out cabinet and drawer front sizes from the opening dimensions, with the door widths and each step of the calculation shown.',
  'tile-grout': 'Estimate tile grout and mortar from the tiled area and grout line width, with the quantities needed and each step of the maths shown.',
  'pool-size': 'Work out pool water volume from length, width and depth, with gallons or litres and each step of the calculation shown instantly.',
  'compost-bin': 'Work out the compost bin size you need from household waste and turning frequency, with the volume and each step shown instantly.',

  // ---------- lifestyle ----------
  'water-usage': 'Work out monthly water usage and cost from household habits, with gallons used, the bill estimate and each step shown step by step.',
  'coffee-habit': 'See what a daily coffee habit costs over a year, with the annual spend, opportunity cost invested and each step of the maths shown.',
  'pet-food-cost': 'Work out the monthly cost of feeding a pet from food, treats and extras, with the annual total and each step of the calculation shown.',

  // ---------- math ----------
  'lcm-gcd': 'Find the LCM and GCD of two or more numbers, with the factor breakdown and each step of the working shown instantly in your browser.',
  'variance-sd': 'Calculate variance and standard deviation from a data set, with the mean, spread and each step of the working shown step by step.',
  'dot-cross-product': 'Calculate the dot and cross product of two vectors, with the magnitude, direction and each step of the working shown instantly.',
  'quartile': 'Find the quartiles and interquartile range of a data set, with Q1, Q2, Q3 and each step of the working shown instantly in your browser.',
  'scientific': 'Run advanced scientific calculations with trig, logs, powers and roots, with the expression and each step of the working shown.',
  'percentage': 'Work out percentages, percentage change and percentage of a number, with each step of the working shown instantly in your browser.',
  'logarithm': 'Calculate logarithms in any base, with the exponent, the change-of-base working and each step of the maths shown instantly in your browser.',
  'exponent': 'Calculate powers and exponents including negative and fractional indices, with each step of the working shown instantly in your browser.',
  'complex': 'Add, subtract, multiply and divide complex numbers, with the modulus, argument and each step of the working shown step by step.',
  'surface-area-3d': 'Calculate the surface area of common 3D shapes from their dimensions, with the formula and each step of the working shown.',
  'golden-ratio': 'Explore the golden ratio from a Fibonacci index, with the converging value and each step of the working shown instantly in your browser.',
  'sample-size': 'Work out the minimum sample size for a survey from confidence level and margin of error, with the formula and each step shown.',
  'harmonic-mean': 'Calculate the harmonic mean of a data set, with the reciprocal working and each step of the calculation shown instantly in your browser.',
  'significant-figures': 'Round a number to a chosen number of significant figures, with the rule applied and each step of the working shown instantly.',
  'midpoint': 'Find the midpoint between two points, with the coordinates, distance and each step of the working shown instantly in your browser.',
  'weighted-average': 'Calculate a weighted average from values and their weights, with the contribution of each and every step of the working shown.',
  'covariance': 'Calculate the covariance of two data sets, with the direction of the relationship and each step of the working shown step by step.',
  'expected-value': 'Calculate expected value from outcomes and their probabilities, with the weighted sum and each step of the working shown instantly.',
  'direct-variation': 'Solve direct variation problems from known pairs, with the constant of proportionality and each step of the working shown.',
  'circle-through-points': 'Find the circumradius and circle through three points, with the centre, radius and each step of the working shown instantly.',
  'inscribed-angle': 'Calculate an inscribed angle from its central angle, with the circle theorem applied and each step of the working shown instantly.',
  'digital-root': 'Find the digital root of any number, with the repeated digit-sum working and every step of the calculation shown instantly in your browser.',

  // ---------- regional ----------
  'stamp-duty': 'Estimate stamp duty and registration costs on a property purchase, with each slab of duty and the total shown step by step.',
  'wedding-budget-shaadi': 'Plan a shaadi budget from venue, catering and decoration costs, with each category, the grand total and every step shown in rupees.',
  'zakat-calculator': 'Work out zakat due on cash, gold, silver and investments, with the nisab check, 2.5% rate and each step of the calculation shown.',
  'stamp-duty-india': 'Estimate stamp duty and registration charges in India from the property value and state rate, with each step of the calculation shown.',
  'gold-rate': 'Work out the value of gold from its weight and the rate per gram, with the total in rupees and each step of the calculation shown instantly.',
  'gratuity': 'Estimate gratuity from last drawn basic plus DA and years of service, with the formula and each step of the calculation shown step by step.',

  // ---------- tech ----------
  'text-counter': 'Count words, characters, sentences and reading time as you type, with the live breakdown and each measure shown instantly.',
  'data-usage': 'Estimate monthly data usage from streaming, browsing and downloads, with the total in GB and each activity\u2019s share shown step by step.',
  'video-size': 'Estimate video file size from duration, resolution and bitrate, with the GB needed and each step of the calculation shown instantly.',
  'cable-length': 'Work out the optimal cable run length from the distance and signal type, with the recommendation and each step of the calculation shown.',

  // ---------- utilities ----------
  'tip-split': 'Split a bill and add a tip from the total, tip percentage and number of people, with each person\u2019s share shown step by step.',
  'gcd-lcm': 'Find the GCD and LCM of two numbers, with the factor breakdown and each step of the working shown instantly in your browser.',
  'shipping-cost': 'Estimate shipping cost from parcel weight, distance and service level, with the charge and each step of the calculation shown instantly.',
  'mileage-calc': 'Work out mileage reimbursement from miles driven and the IRS rate, with the deductible amount and each step of the maths shown.',
  'age-exact': 'Calculate exact age in years, months and days between two dates, with the breakdown and each step of the calculation shown instantly.',

  // ---------- auto ----------
  'fuel-cost': 'Work out the fuel cost of a journey from distance, mileage and fuel price, with litres used and each step of the maths shown.',
  'ev-charging-cost': 'Estimate the cost to charge an EV from battery size, charge added and electricity rate, with the per-charge cost and steps shown.',
  'tire-size': 'Compare tyre sizes from width, profile and rim diameter, with the diameter change, speedo error and each step of the maths shown.',
  'commute-cost': 'Work out the daily and monthly cost of your commute from distance, fuel and days per week, with each step of the calculation shown.',
  'trip-time': 'Estimate trip time from distance, average speed and rest breaks, with driving time, breaks and arrival time shown step by step.',
  'parking-cost': 'Work out parking cost from the daily rate and days per month, with the monthly and yearly total and each step of the maths shown.',
  'stopping-distance': 'Work out stopping distance from speed and reaction time, with the thinking and braking distances and each step of the maths shown.',
  'auto-fare': 'Estimate an auto-rickshaw fare from distance, base fare and per-kilometre rate, with the total and each step of the calculation shown.',
  'cargo-volume': 'Work out cargo volume from the load\u2019s length, width and height, with the total in cubic feet and each step of the maths shown.',
  'toll-cost': 'Work out monthly toll costs from the number of toll points and average toll, with the total and each step of the calculation shown.',

  // ---------- construction ----------
  'wall-area': 'Work out wall area from length and height, with the area, paint or board coverage and each step of the calculation shown instantly.',
  'septic-size': 'Size a septic tank from the number of bedrooms and occupants, with the gallons needed and each step of the calculation shown instantly.',
  'soffit-area': 'Work out soffit area from the building length and width, with the total square footage and each step of the calculation shown instantly.',
  'rafter-length': 'Work out rafter length from the horizontal run and rise, with the slope, length and each step of the calculation shown step by step.',

  // ---------- everyday ----------
  'carbon': 'Estimate your carbon footprint from travel, home energy and diet, with the tonnes of CO\u2082e and each contribution shown step by step.',
  'fitness-age': 'Estimate fitness age from your actual age and resting heart rate, with the comparison and each step of the calculation shown instantly.',
  'business-days': 'Count business days between two dates, excluding weekends and holidays, with the working days and each step shown step by step.',
  'leap-year': 'Check whether a year is a leap year, with the divisibility rules applied and each step of the check shown instantly in your browser.',
  'meeting-cost': 'Work out the true cost of a meeting from attendees, hourly rates and duration, with the total and each step of the calculation shown.',

  // ---------- food ----------
  'fast-food-calories': 'Estimate fast-food calories from your order, with the item-by-item breakdown and the meal total shown instantly in your browser.',
  'baking-converter': 'Convert baking ingredients and substitutions with the correct ratios, with the scaled amounts and each step of the maths shown.',
  'caffeine-daily': 'Work out daily caffeine intake from coffee, tea and other drinks, with the milligrams and each drink\u2019s share shown step by step.',

  // ---------- family ----------
  'childcare-cost-annual': 'Estimate annual childcare costs from weekly fees and care type, with the monthly and yearly total and each step shown step by step.',
  'kid-allowance': 'Work out an age-appropriate allowance from your child\u2019s age and the base rate, with the weekly amount and each step of the maths shown.',
  'school-supplies': 'Budget for back-to-school supplies from a per-child list, with the total for all children and each item\u2019s cost shown step by step.',

  // ---------- position 20-50 targets (Oct 2026) ----------
  'pipe-volume': 'Work out the water a pipe holds from its inner diameter and length, with the volume in cubic feet, gallons and litres shown step by step.',
  'pf-ratio': 'Calculate the PaO2/FiO2 ratio from arterial oxygen and the fraction inspired, with the oxygenation band and each step of the working shown.',
  'insulation': 'Work out how much insulation you need from the area, target R-value and thickness, with the volume and each step of the calculation shown instantly.',
  'swim-pace': 'Work out swim pace per 100 m from total time and distance, with the split, projected times and each step of the calculation shown instantly.',
  'pump-power': 'Work out pump hydraulic and shaft power from flow rate, head and efficiency, with the motor size and each step of the calculation shown instantly.',
  'rowing-split': 'Work out your rowing split per 500 m from distance and time, with the pace, power estimate and each step of the calculation shown instantly.',
  'bike-loan': 'Work out the monthly EMI on a motorcycle loan from the price, rate and term, with the interest total and each step of the calculation shown.',
  'tow-capacity': 'Work out how much you can safely tow from the GCWR, truck weight and payload, with the remaining capacity and each step shown step by step.',
  'vacation-budget': 'Plan a vacation budget from flights, hotel, food and activities, with each line item, the trip total and every step shown instantly in your browser.',
  'water-tank': 'Work out water tank capacity from its length, width and height, with the volume in cubic metres and litres and each step of the maths shown.',
  'moving-truck': 'Estimate the moving truck size you need from your furnished rooms, with the volume in cubic feet and each step of the calculation shown instantly.',
  'siding-squares': 'Work out how many siding squares you need from wall area, openings and waste, with the total in squares and each step of the calculation shown.',

  // ---------- science ----------
  'cloud-base-lcl': 'Estimate the cloud base height from surface temperature and dew point, with the LCL in metres and each step of the calculation shown instantly.',
  'osmotic-pressure': 'Calculate osmotic pressure from molarity, temperature and the van\u2019t Hoff factor, with the result and each step of the working shown step by step.',
  'pressure': 'Calculate pressure from force and area, with the result in pascals and each step of the physics working shown instantly.',
  'kinetic-energy': 'Calculate kinetic energy from mass and velocity, with the joules, the formula and each step of the working shown in your browser.',
  'momentum': 'Calculate momentum from mass and velocity, with the result in kg\u00b7m/s and each step of the physics working shown instantly.',
  'half-life': 'Calculate how much of a substance remains after a given time from its half-life, with the decay working and each step shown.',
  'wavelength': 'Calculate wavelength from wave speed and frequency, with the result in metres and each step of the working shown instantly.',
  'acceleration': 'Calculate acceleration from initial and final velocity over time, with the result in m/s\u00b2 and each step of the working shown.',
  'velocity': 'Calculate velocity from distance and time, with the result in m/s and each step of the physics working shown instantly in your browser.',
  'specific-heat': 'Calculate heat energy from mass, specific heat capacity and temperature change, with the joules and each step of the working shown.',
  'frequency': 'Calculate frequency from the period of a wave or signal, with the result in hertz and each step of the working shown instantly.',
  'molar-mass': 'Calculate the molar mass of a compound from its chemical formula, with the atomic-mass breakdown and each step shown step by step.',
  'escape-velocity': 'Calculate escape velocity from a planet\u2019s mass and radius, with the result in km/s and each step of the physics working shown.',
  'molarity': 'Calculate molarity from moles of solute and volume of solution, with the result in mol/L and each step of the working shown.',
  'power-electrical': 'Calculate electrical power from voltage and current, with the result in watts and each step of the physics working shown instantly.',
  'wave-speed': 'Calculate wave speed from frequency and wavelength, with the result in m/s and each step of the physics working shown instantly.',
  'friction': 'Calculate friction force from the normal force and coefficient of friction, with the result in newtons and each step of the working shown.',
  'calorimetry': 'Calculate heat energy in a calorimetry problem from mass, specific heat and temperature change, with every step of the working shown.',
  'air-density': 'Calculate air density from pressure and temperature, with the result in kg/m\u00b3 and each step of the physics working shown instantly.',
  'angular-momentum': 'Calculate angular momentum from moment of inertia and angular velocity, with the result and each step of the working shown.',
  'buffer-ph': 'Calculate the pH of a buffer from the acid\u2019s pKa and the base-to-acid ratio, with the Henderson\u2013Hasselbalch working shown step by step.',
  'dew-point': 'Calculate dew point from air temperature and relative humidity, with the result in \u00b0C and each step of the calculation shown instantly.'
};

function escRe(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }

const FILE = path.join(ROOT, 'js', 'seo-content.js');
let src = fs.readFileSync(FILE, 'utf8');
const before = src;

let applied = 0;
const missing = [];
for (const [id, desc] of Object.entries(DESC)) {
  const re = new RegExp(
    "('" + escRe(id) + "':\\s*\\{\"title\":\"[^\"]*\",\"metaDesc\":\")([^\"]*)(\",\"canonicalPath\")"
  );
  if (!re.test(src)) { missing.push(id); continue; }
  const jsonDesc = JSON.stringify(desc).slice(1, -1);
  src = src.replace(re, '$1' + jsonDesc.replace(/\$/g, '$$$$') + '$3');
  applied++;
}

// Validate lengths (Google shows ~155; keep 120-158)
const tooLong = Object.entries(DESC).filter(([, d]) => d.length > 158).map(([k, d]) => k + ':' + d.length);
const tooShort = Object.entries(DESC).filter(([, d]) => d.length < 120).map(([k, d]) => k + ':' + d.length);

console.log('overrides defined :', Object.keys(DESC).length);
console.log('applied           :', applied);
console.log('missing in source :', missing.length, missing.slice(0, 10).join(', '));
console.log('too long (>158)   :', tooLong.length, tooLong.join(', '));
console.log('too short (<120)  :', tooShort.length, tooShort.join(', '));

if (process.env.WRITE === '1') {
  if (missing.length) { console.error('ABORT: some ids not found in source.'); process.exit(1); }
  if (src === before) { console.log('No change.'); process.exit(0); }
  fs.writeFileSync(FILE, src);
  console.log('WRITTEN: js/seo-content.js');
} else {
  console.log('\nDry run. Re-run with WRITE=1 to apply.');
}
