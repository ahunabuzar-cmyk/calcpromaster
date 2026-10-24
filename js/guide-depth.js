/* ============================================================
 * Guide Depth Content — shared data module
 * ------------------------------------------------------------
 * Why this exists
 * ---------------
 * The 17 category guide pages (/guides/<cat>) were the thinnest
 * INDEXABLE pages on the site: 315-375 words of prose each, with
 * no FAQ section at all. They are also the deepest nodes in the
 * crawl graph for their category (every covered tool page links
 * back to its guide), so thinness there is expensive twice over —
 * the page itself looks weak to Google, and it is the junction
 * that feeds hundreds of tool pages.
 *
 * This module holds one genuinely unique block per guide:
 *   lede      — the idea that makes the whole cluster click (2 sentences)
 *   pitfalls  — 4 concrete ways these particular answers go wrong
 *   faqs      — 3 guide-level Q&A pairs (feeds FAQPage JSON-LD)
 *
 * Deliberately NOT the same copy as js/category-depth.js: that module
 * owns the /hub/<cat> comparison pages, and duplicating its text here
 * would create near-duplicate content across two page types. The two
 * modules cover different ground — hubs explain "what you can work
 * out", guides explain "where the answer goes wrong".
 *
 * Rules: no invented statistics, no per-tool claims we cannot check,
 * no "best/top" superlatives, no rates or limits that change yearly.
 * ============================================================ */
(function (root) {
  'use strict';

  var GUIDES = {
    business: {
      lede: 'Business maths rewards being explicit about which base a number is divided by: the same profit can be a 20% margin or a 25% markup, and a break-even point is only as honest as the fixed costs that went into it.',
      pitfalls: [
        'Using revenue and cost as if they were the same base — margin divides profit by the selling price, markup divides it by the cost, so 20% margin is a 25% markup.',
        'Leaving fixed costs out because they are paid monthly while the price is per unit — convert both to the same period before dividing.',
        'Treating profit as cash, which is why a profitable month on 60-day invoice terms can still miss a payroll run.',
        'Wanting a target margin but applying a markup percentage, which quietly underprices every sale.'
      ],
      faqs: [
        { q: 'Should I price with margin or markup?', a: 'Use margin to judge a sale (profit as a share of the price you charged) and markup to price off cost (profit as a share of what you paid). Pricing from a target margin is the safer habit: price = cost ÷ (1 − margin), so a 30% margin on a $70 cost is $100, not $91.' },
        { q: 'Does break-even include tax?', a: 'Break-even as normally written covers operating costs only, so it is a pre-tax line. Profit tax is charged on profit, not on the point where profit becomes zero, so folding it into the break-even calculation would double-count it. Keep the two questions separate and apply tax afterwards.' },
        { q: 'Why does my spreadsheet disagree with a break-even calculator?', a: 'Almost always one of three inputs: rounding of contribution margin per unit, whether owner pay and loan repayments sit in fixed costs, or a different period. Put every figure on the same monthly or annual basis, list what is and is not counted, and then compare the two results.' }
      ]
    },
    family: {
      lede: 'Family planning maths spans decades, so the assumption dominates the answer: the growth rate you hold for eighteen years matters far more than a rounding difference in this month\u2019s contribution.',
      pitfalls: [
        'Comparing a future education cost with today\u2019s fees, ignoring what today\u2019s money will be worth by then.',
        'Assuming one constant return while the plan actually holds cash and equities in different proportions over time.',
        'Budgeting from gross pay when every recurring bill is paid from take-home pay, which overstates what is really available.',
        'Counting only recurring costs while the one-offs — deposits, equipment, travel — stay invisible until they arrive.'
      ],
      faqs: [
        { q: 'How much faith should I put in a predicted adult height?', a: 'Treat it as a midpoint, not a forecast. The standard mid-parental method uses only parents\u2019 heights, while nutrition, health and the timing of puberty all shift the outcome. Read the result as a range, and take any growth concern to a clinician rather than a calculator.' },
        { q: 'What return should I assume in a long savings projection?', a: 'Run at least three: a low, a middle and a high figure. The point of the exercise is to see whether the plan still works when the middle estimate disappoints. A plan that only succeeds at the optimistic rate is not a plan, it is a hope.' },
        { q: 'Is a family budget in these tools financial advice?', a: 'No. They are planning estimates built from the inputs you supply, using methods that are stated on the page. They help you see the shape and scale of a decision. Verify costs, tax treatment and product terms — and take regulated advice where it applies — before committing money.' }
      ]
    },
    everyday: {
      lede: 'Everyday calculations fail on conventions rather than arithmetic: whether "in three months" means the same day number, whether the end date is counted, and whether a recipe actually scales linearly.',
      pitfalls: [
        'Adding days across months without the calendar — months differ in length, so +30 days is not the same as +1 month.',
        'Counting an end date as exclusive when the question meant inclusive (or the reverse), which shifts an age or deadline by a day.',
        'Scaling leavening, salt and spice linearly with a recipe when the pan size did not change with the batch.',
        'Splitting a bill before the tip, or adding the tip after the split, which changes what each person actually pays.'
      ],
      faqs: [
        { q: 'Why is an age off by one day?', a: 'Because of whether the birthday itself counts. Age in years is whole years completed, so the day of birth completes the first year, while "days lived" counts elapsed time. Same dates, different convention. Check which one the question is asking before calling either answer wrong.' },
        { q: 'Why do working-day counts differ between tools?', a: 'They disagree on public holidays and on whether the end date is included. A pure Monday-to-Friday count of a full year gives 260 weekdays (261 in some years, when the year starts mid-week), and any tool that says otherwise is folding in holidays or counting an endpoint.' },
        { q: 'Can I just double a recipe?', a: 'For most ingredients yes, but watch three: leavening and salt, which do not always scale linearly with volume; pan size, because depth changes baking time; and strong spices, where doubling can overwhelm. Scaling the numbers is the easy part, reading the result is the skill.' }
      ]
    },
    auto: {
      lede: 'Vehicle maths is dominated by two inputs people estimate badly: real-world consumption rather than the test-cycle figure, and how much of the driving is urban stop-start rather than open road.',
      pitfalls: [
        'Using the manufacturer\u2019s consumption figure, which is measured under ideal test conditions and is usually optimistic in daily use.',
        'Comparing purchase prices when depreciation, insurance, tyres and servicing are most of what separates two cars over five years.',
        'Mixing units — miles with km/L, litres with gallons — so every result is off by a fixed factor.',
        'Ignoring charging and refuelling losses, which add roughly a tenth to the electricity an EV actually draws.'
      ],
      faqs: [
        { q: 'Why is real-world fuel use worse than the published figure?', a: 'Test cycles run at moderate speeds with no traffic, no air-conditioning and no cold starts. Real driving adds all of those. The gap is largest for short urban trips and smallest for steady motorway running, which is why two owners of the same car can report very different economy.' },
        { q: 'How do I compare an EV with a petrol car fairly?', a: 'Put both on the same annual distance, then use a real consumption figure for each and the actual price you pay per kWh and per litre. Electricity price, charging losses and where you charge matter more than the sticker efficiency, and purchase price is a separate question from running cost.' },
        { q: 'How is depreciation estimated?', a: 'Most calculators apply a constant annual percentage to the remaining value, which gives a smooth curve. Real depreciation is front-loaded and uneven — the first year and the first owner take the largest hit — so treat the result as a shape rather than a resale quote.' }
      ]
    },
    science: {
      lede: 'Scientific calculators are only as good as their units: the gas laws want kelvin and pascals, mole calculations want a matching molar mass, and most formulas carry conditions that are easy to violate by accident.',
      pitfalls: [
        'Entering temperatures in Celsius where the equation requires kelvin — every gas-law style formula needs absolute temperature.',
        'Pairing grams with a molar mass and then reporting the result as if it were a concentration per litre.',
        'Rounding at each intermediate step, so error accumulates before the final significant figures are chosen.',
        'Applying a formula outside the range it was derived for, such as an ideal-gas estimate near condensation.'
      ],
      faqs: [
        { q: 'How many significant figures should I report?', a: 'As many as the least precise input supports. If one measurement is 2.1 (two figures) and another is 12.35, the answer carries two. Round only at the end — rounding in the middle is what makes a hand calculation disagree with the calculator by more than the measurement error.' },
        { q: 'Why does temperature have to be in kelvin?', a: 'Because the gas laws are proportional to absolute temperature: halving the kelvin value halves the volume at constant pressure, which is only true on a scale that starts at absolute zero. Celsius has an arbitrary zero, so using it produces answers that are wrong by a fixed offset.' },
        { q: 'When do the standard approximations stop working?', a: 'Each formula has conditions printed with it for a reason. Ideal-gas estimates drift as pressure rises or as a gas approaches condensation; small-angle approximations fail past roughly fifteen degrees; frictionless and massless assumptions fail as soon as real hardware is involved. Check the condition before trusting the number.' }
      ]
    },
    utilities: {
      lede: 'Utility calculators answer small questions where the unit convention is the whole answer: bits versus bytes, decimal versus binary prefixes, and what a "strong" password is actually measuring.',
      pitfalls: [
        'Reading a connection speed in megabits as if it were megabytes — divide by eight before estimating how long a download takes.',
        'Comparing a drive\u2019s advertised capacity (decimal) with what the operating system reports (binary), which differ by roughly 9%.',
        'Judging a password by character classes alone rather than by the search space its length creates.',
        'Converting colour codes without checking the working colour space, so the hex value looks right and the rendered colour does not.'
      ],
      faqs: [
        { q: 'What download speed do I need for a 4 GB file in 10 minutes?', a: 'Work backwards in consistent units. 4 GB is about 32,000 megabits, and 10 minutes is 600 seconds, so you need roughly 53 Mbps of sustained throughput. Protocol overhead and server limits mean the connection should be comfortably faster than the number you calculate.' },
        { q: 'Why does a 1 TB drive show less than 1 TB?', a: 'Drive makers use decimal prefixes, where 1 TB means 1,000 GB, while many operating systems report binary units, where 1 TiB means 1,024 GiB. Both numbers describe the same space. The visible shortfall is the gap between the two conventions, not missing storage.' },
        { q: 'Does a password strength meter measure entropy?', a: 'Most measure a checklist plus an estimate of the search space implied by length and character set, which is not the same as true entropy. Length raises the search space fastest, which is why a long passphrase usually beats a short scramble of symbols — and why any password reused elsewhere should be considered weak.' }
      ]
    },
    food: {
      lede: 'Nutrition maths lives or dies on the portion: whether a label figure is per 100 g or per serving, whether the ingredient is weighed raw or cooked, and whether the batch actually scales linearly.',
      pitfalls: [
        'Comparing a per-100 g label value with a per-serving recipe figure without converting the weight first.',
        'Using raw weights for foods that lose water when cooked — cooked meat is roughly a quarter lighter than the same piece raw.',
        'Scaling salt and leavening straight with the batch when only the quantity changed, not the pan or the rise time.',
        'Reading calorie estimates as exact when labels are permitted to differ from the stated value.'
      ],
      faqs: [
        { q: 'Why do my macros add up to more calories than the label?', a: 'Because the label rounds. Protein and carbohydrate are about 4 kcal per gram and fat about 9, so multiplying the rounded gram figures and adding them can land a few percent away from the stated total. Neither number is wrong; they are rounded at different stages.' },
        { q: 'How much does cooking change a weight?', a: 'It depends on the method and the food. Grilled or roasted meat loses roughly a quarter of its weight as water and fat, while grains and pasta gain weight by absorbing water. That is why a nutrition plan has to say whether it counts raw or cooked, and use the same one throughout.' },
        { q: 'Are carb limits from keto calculators exact?', a: 'No. The threshold at which a person stays in ketosis varies with activity, insulin sensitivity and how the carbs are timed. The calculators give a commonly used starting range, and the honest way to use it is as a starting point to adjust against how you actually respond.' }
      ]
    },
    'tax-salary': {
      lede: 'Salary and tax maths is a marginal calculation, not an average one: the rate that applies to your next unit of income is not the rate that applied to your whole income.',
      pitfalls: [
        'Multiplying total income by the top bracket rate instead of applying each rate to the band it covers.',
        'Budgeting from gross pay when every recurring payment leaves from net pay.',
        'Ignoring the deductions that are capped, or that stop once a threshold is reached, which moves the effective rate.',
        'Comparing two salaries without accounting for allowances, pension matching, leave and local levies.'
      ],
      faqs: [
        { q: 'Why does my average tax rate look lower than my marginal rate?', a: 'Because brackets are applied in bands. Only the income above each threshold is taxed at the higher rate, so the average rate across all income is always below the rate on the last slice. The marginal rate is the right one for a decision about earning or giving up one more unit.' },
        { q: 'Can a raise ever leave me with less take-home pay?', a: 'Not from bracket rates alone — with banded rates every extra unit of income is taxed at some rate below 100%, so take-home pay still rises. A real reduction requires something else: a benefit or allowance that is withdrawn once income passes a threshold. That is where the effect people describe actually comes from.' },
        { q: 'What do these calculators leave out?', a: 'They model the income tax and the social contributions you enter, at the rates you set. Investment income, capital gains, reliefs, local or state taxes and employer-side contributions are separate questions. Use the result for salary planning, then check your specific jurisdiction\u2019s rules before deciding.' }
      ]
    },
    homegarden: {
      lede: 'Home and garden estimating is a coverage-and-waste problem: the area is easy, and the honest part of the answer is the allowance you add for offcuts, second coats and settling.',
      pitfalls: [
        'Using floor area for paint when walls have their own area — perimeter × height, minus windows and doors.',
        'Forgetting that most finishes need two coats, and that a primer can change how far the topcoat goes.',
        'Buying mulch or topsoil by area while the depth is the factor that turns area into volume.',
        'Sizing an air conditioner on floor area alone when ceiling height, insulation, glazing and sun exposure drive the load.'
      ],
      faqs: [
        { q: 'How much extra should I buy for waste?', a: 'For paint, plan on the number of coats plus a small margin for touch-ups, and round up to the tin sizes available. For flooring and tiling add roughly a tenth, more for a diagonal or herringbone layout and for a first attempt. Offcuts are cheaper than a second order that does not match the batch.' },
        { q: 'How do I turn area into soil volume?', a: 'Multiply area by depth in the same units. A 10 m² bed at 5 cm deep needs 0.5 m³, and at 20 cm it needs 2 m³. Bags are usually sold by volume, so convert once and you can compare bags against a bulk delivery on price without guessing.' },
        { q: 'Why is air-conditioner sizing not just square metres?', a: 'Because two rooms of the same size can need very different cooling. Ceiling height changes the volume of air, insulation and glazing change how much heat enters, and orientation changes the solar load. Square metres is a starting sanity check, not the sizing calculation.' }
      ]
    },
    lifestyle: {
      lede: 'Lifestyle calculators almost always compare two options, so the work sits in listing what each option really costs rather than in the arithmetic.',
      pitfalls: [
        'Comparing a monthly rent with a monthly mortgage payment while leaving out the deposit, fees, insurance and maintenance.',
        'Splitting shared costs by headcount when incomes or actual usage differ a lot.',
        'Ignoring the recurring costs of a pet or a move that arrive annually rather than monthly.',
        'Mixing one-off savings with annual figures, which flatters whichever option you were hoping for.'
      ],
      faqs: [
        { q: 'What does rent-versus-buy leave out?', a: 'It cannot know your horizon, your local market, or how much you value being able to move. The calculator compares the money: rent plus deposit returns against mortgage payments, fees, maintenance and the eventual sale. Put a realistic holding period in, because a short one usually favours renting.' },
        { q: 'What is a fair way to split shared costs?', a: 'Pick the basis deliberately: evenly, by income share, or by usage. Each is defensible and they give different answers, so write down which one the household agreed to. The arguments come from mixing bases month to month, not from the arithmetic itself.' },
        { q: 'Why do pet cost estimates vary so much?', a: 'Because they combine a fixed baseline — food, insurance, routine care — with costs that are lumpy and unpredictable: emergencies, boarding, dental work. The calculators give the baseline well and the surprises badly, which is why a contingency matters more here than in most budgets.' }
      ]
    },
    career: {
      lede: 'Career maths turns a headline salary or rate into hourly, monthly and after-cost numbers, which is usually the point at which two apparently equal offers stop looking equal.',
      pitfalls: [
        'Comparing an annual salary with a day rate without converting both to the same working pattern.',
        'Setting a freelance rate from a target income while forgetting holidays, admin and non-billable time.',
        'Comparing offers on base pay alone when allowances, pension matching and leave differ substantially.',
        'Ignoring contribution thresholds when moving between employment and self-employment.'
      ],
      faqs: [
        { q: 'What multiplier turns a day rate into an annual salary?', a: 'Use the days you can actually bill, not the days in the year. Five-day weeks minus holidays, sickness and non-billable work lands most freelancers somewhere around 200-230 billable days, so a daily rate multiplied by the full 260 overstates the annual equivalent considerably.' },
        { q: 'Why is my effective hourly rate lower than I expected?', a: 'Because paid hours are a fraction of worked hours. Quoting, invoicing, learning, travel and waiting for payment all consume time that no client pays for. Estimate the billable share honestly — if it is half, your effective hourly rate is half the headline figure, and your rate needs to reflect that.' },
        { q: 'How should I compare two job offers?', a: 'Convert both to a total annual value: base, guaranteed bonus, pension or provident matching, allowances, leave and any benefit with a cash equivalent. Then weigh the parts that do not have a number — commute, flexibility, growth. Compare totals first, then adjust for what you actually care about.' }
      ]
    },
    'math-statistics': {
      lede: 'Maths answers are only wrong when a convention was assumed rather than stated: order of operations, whether a change is relative or absolute, and whether the spread is a range or a standard deviation.',
      pitfalls: [
        'Evaluating an expression left to right, so 2 + 3 × 4 becomes 20 instead of 14.',
        'Confusing percentage points with percentage change — going from 4% to 6% is 2 points but a 50% increase.',
        'Rearranging an equation by moving terms without inverting the operation that connects them.',
        'Using the population standard deviation for a sample, or the sample formula for a full population.'
      ],
      faqs: [
        { q: 'Which order of operations does the calculator use?', a: 'Brackets first, then exponentiation, then multiplication and division left to right, then addition and subtraction left to right. That is the standard convention. Most disagreements with a spreadsheet come from an expression written without brackets that can honestly be read two ways — add the brackets and the ambiguity disappears.' },
        { q: 'Which standard deviation should I use?', a: 'If the numbers are the whole population, divide by n. If they are a sample used to estimate a wider population, divide by n − 1. The sample version is larger, because it corrects for estimating the mean from the same data, and the gap shrinks as the sample grows.' },
        { q: 'Why does my calculator disagree with a spreadsheet at the last digit?', a: 'Rounding and floating-point representation. Spreadsheets hold a finite number of binary digits, so values such as 0.1 are stored approximately, and display rounding hides that until a comparison or a sum exposes it. For money, round to the smallest unit deliberately rather than relying on display.' }
      ]
    },
    regional: {
      lede: 'Regional calculators pair a local instrument with local rules, and those rules move: rates, slabs and limits are revised, so every result is only current for the period it models.',
      pitfalls: [
        'Applying the current year\u2019s slabs or rates to a past year, or a past year\u2019s to the current one.',
        'Pairing an annual rate with the wrong compounding frequency — quarterly and monthly recurring deposits differ.',
        'Reading an advertised return as guaranteed when it is a ceiling, an average or a historical figure.',
        'Comparing instruments without accounting for how each is taxed and how long the money is locked in.'
      ],
      faqs: [
        { q: 'What is the difference between a fixed deposit and a recurring deposit?', a: 'A fixed deposit puts one lump sum in for a term, so interest compounds on the whole amount from day one. A recurring deposit adds a fixed amount every month, so each instalment earns for a different length of time. Same rate, different total interest — the recurring deposit earns roughly half on the same nominal principal.' },
        { q: 'Why do provident and small-savings rates change?', a: 'Governments reset them periodically against a reference — usually government bond yields or a formula tied to them. That is why a plan built on today\u2019s rate is a projection, not a promise. Model a lower rate too, and check whether the plan still holds if the rate resets downwards.' },
        { q: 'How much does compounding frequency matter?', a: 'Less than people expect at the same stated rate. Going from annual to quarterly compounding raises the effective annual yield by a small fraction of a percent, while going from 6% to 7% changes the outcome far more. Frequency matters most when the term is long and the amount large, and it rarely changes which instrument wins.' }
      ]
    },
    engineering: {
      lede: 'Engineering calculators carry safety and tolerance assumptions with them: a load, a beam or a wire figure is a starting point for a design, never a substitute for the standard the design has to meet.',
      pitfalls: [
        'Using a nominal load or capacity and ignoring the safety factor the applicable code requires.',
        'Applying a three-phase current formula to a single-phase circuit, or the reverse.',
        'Ignoring temperature and grouping derating, which lowers a cable\u2019s real capacity below its table value.',
        'Treating a simplifying assumption — point load, uniform section, ideal behaviour — as if it were exact.'
      ],
      faqs: [
        { q: 'Why do calculators and code tables disagree?', a: 'Tables are conservative by construction: they already include installation conditions, derating and required safety margins for a range of situations. A calculator solving the ideal case will therefore give a different number. Design to the standard, and use the calculator to understand the relationship between the inputs.' },
        { q: 'What is a safety factor for?', a: 'It covers what the calculation cannot: material variation, construction tolerance, fatigue, unexpected loads and the consequences of failure. It is chosen by standard or by engineering judgement, not by the calculator, and it is the reason a component is specified well above the theoretical minimum.' },
        { q: 'How do I know my units are consistent?', a: 'Write the units into the equation and cancel them. Ohm\u2019s law works with volts, amps and ohms; a length used in the same formula must be in the matching base unit, not switched between millimetres and metres. If the units of the result are not what you expected, the inputs are inconsistent.' }
      ]
    },
    'health-fitness': {
      lede: 'Health calculators convert measurements into population estimates, and the population is the point: each formula is a best fit for a group, not a measurement of you.',
      pitfalls: [
        'Reading BMI as an individual diagnosis when it was calibrated on populations and misreads muscular builds.',
        'Applying an activity multiplier to a metabolic rate and then eating back exercise calories a second time.',
        'Building heart-rate zones on the age estimate when a measured maximum is available.',
        'Weighing daily and reacting to water swings, which move far faster than fat does.'
      ],
      faqs: [
        { q: 'Should I trust BMI or body fat?', a: 'They answer different questions. BMI compares weight with height across a population, which is useful for screening and hopeless for a muscular individual. A body-fat estimate or waist measurement says more about an individual. Read BMI as a first filter, then use a measure that accounts for composition.' },
        { q: 'Which metabolic-rate formula should I pick?', a: 'Mifflin-St Jeor is the most widely used modern estimate and is usually closer than the older Harris-Benedict figures for most adults. Both are population fits with a typical error of a few percent either way, so the honest approach is to start from the estimate and adjust it against what your weight actually does over three to four weeks.' },
        { q: 'How accurate are calorie and zone estimates?', a: 'Good enough to plan with, not good enough to treat as exact. Metabolic estimates can be off by a few hundred calories a day between individuals, and the common "220 minus age" heart-rate rule can miss by ten to fifteen beats. Zones built on a measured maximum, or on heart-rate reserve, are noticeably better.' }
      ]
    },
    construction: {
      lede: 'Construction estimating is a waste-and-tolerance problem: the material arithmetic is straightforward, and the difference between a quote and a shortage lives in the allowances.',
      pitfalls: [
        'Ordering the exact calculated volume with no allowance for spillage, uneven ground or over-excavation.',
        'Mixing bag yield with ready-mix volume — a bag\u2019s nominal size sounds like more concrete than it actually places.',
        'Computing area from plan dimensions without adding the waste of the real laying pattern.',
        'Forgetting that materials arrive in standard unit sizes, so the practical order rounds up anyway.'
      ],
      faqs: [
        { q: 'How much extra material should I order?', a: 'As a rule of thumb, add around a tenth for slabs and footings on prepared ground, more where the sub-base is uneven or the pour is at a shallow thickness. Too little means a cold joint you cannot undo, so the waste allowance is cheap insurance rather than slack estimating.' },
        { q: 'How does slab thickness change the material?', a: 'Directly and linearly: doubling the thickness doubles the volume for the same area. That is why thickness is the first number to pin down, and why a centimetre of extra thickness across a large area costs noticeably more than the same centimetre in a small one.' },
        { q: 'How many bags make a cubic metre?', a: 'It depends entirely on the bag weight and the mix strength, which is why bag counts should be taken from the product\u2019s own stated yield rather than a generic figure. Divide the required volume by the yield printed on the bag, then round up — and remember that ready-mix is usually cheaper once the volume is large.' }
      ]
    },
    'loans-mortgages': {
      lede: 'Loan maths is an amortisation calculation rather than a multiplication: the payment is sized so the balance reaches zero, and the split between interest and principal changes in every single period.',
      pitfalls: [
        'Comparing offers on the headline rate when fees, repayment frequency and term all change the total cost.',
        'Estimating total interest as payment × periods minus principal, which is close but ignores fees and any rate change.',
        'Assuming an extra payment shortens the term by a fixed amount rather than removing the interest on the principal it clears.',
        'Quoting an advertised rate without checking what the comparison figure includes and what it leaves out.'
      ],
      faqs: [
        { q: 'Why is almost all of my early payment interest?', a: 'Because interest is charged on the outstanding balance, and at the start the balance is at its largest. Each payment clears that period\u2019s interest first, and only what remains reduces the principal. As the balance falls, the interest share falls with it and the principal share rises.' },
        { q: 'Does prepaying always save money?', a: 'It always reduces the interest that principal would have accrued, so the saving is real — but whether it is worth it depends on fees and on what else the money would do. Some loans charge an early-repayment penalty, and an emergency fund or a higher-rate debt may be the better use of the same cash.' },
        { q: 'Fixed or variable — what does the calculator assume?', a: 'A fixed rate for the whole term, unless you change it. Real variable loans reset, so the projection is only as good as the rate path you enter. Run a scenario a couple of points higher to see whether the payment stays affordable, because that is the risk the fixed-versus-variable decision is really about.' }
      ]
    }
  };

  function guideFor(name) {
    return GUIDES[name] || null;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // One-sentence framing paragraph. Rendered immediately after the page's
  // existing intro paragraph (before "How the math works").
  function ledeHtml(name) {
    var d = GUIDES[name];
    if (!d) return '';
    return '<p class="guide-lede">' + escHtml(d.lede) + '</p>';
  }

  // "Where these answers go wrong" list + FAQ block. Rendered between the
  // guide card and the "Try the matching calculators" heading.
  function pitfallsHtml(name) {
    var d = GUIDES[name];
    if (!d || !d.pitfalls.length) return '';
    var html = '<h2>Where these answers go wrong</h2><ul class="guide-pitfalls">';
    for (var i = 0; i < d.pitfalls.length; i++) html += '<li>' + escHtml(d.pitfalls[i]) + '</li>';
    html += '</ul>';
    return html;
  }

  // FAQ section. Mirrored exactly by faqSchema().
  function faqHtml(name) {
    var d = GUIDES[name];
    if (!d || !d.faqs.length) return '';
    var html = '<h2>Frequently asked questions</h2><div class="seo-faqs">';
    for (var i = 0; i < d.faqs.length; i++) {
      html += '<h3>' + escHtml(d.faqs[i].q) + '</h3><p>' + escHtml(d.faqs[i].a) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function depthHtml(name) {
    return pitfallsHtml(name) + faqHtml(name);
  }

  // FAQPage JSON-LD matching the rendered FAQ section exactly.
  function faqSchema(name) {
    var d = GUIDES[name];
    if (!d || !d.faqs.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: d.faqs.map(function (f) {
        return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
      })
    };
  }

  var api = {
    GUIDES: GUIDES,
    guideFor: guideFor,
    ledeHtml: ledeHtml,
    pitfallsHtml: pitfallsHtml,
    faqHtml: faqHtml,
    depthHtml: depthHtml,
    faqSchema: faqSchema
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GuideDepth = api;
})(typeof window !== 'undefined' ? window : this);
