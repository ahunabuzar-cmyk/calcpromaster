/* ============================================================
 * Category Depth Content — shared data module
 * ------------------------------------------------------------
 * Why this exists
 * ---------------
 * The 20 comparison hub pages (/hub/<cat>/) were ~300-650 words of
 * boilerplate (breadcrumb + methodology note + a card grid). Google
 * crawled them but did not index them ("Crawled - currently not
 * indexed"), and they are the main link junction feeding every tool
 * page in their category — so thinness there is expensive twice over.
 *
 * This module holds one genuinely unique block per category:
 *   intro  — what this category is for (2-3 sentences)
 *   uses   — 4 concrete things you can actually work out
 *   faqs   — 3 category-specific Q&A pairs (feeds FAQPage JSON-LD)
 *
 * Used by BOTH the static site generator (scripts/ssg-pages.cjs) and
 * the client (js/category-hub.js) so the prerendered HTML and the
 * hydrated DOM stay identical — same contract as
 * js/category-methodology.js.
 *
 * Rules: no invented statistics, no per-tool claims we cannot check,
 * no "best/top" superlatives, and never hardcode a tool count (the
 * caller passes the live count so it cannot go stale).
 * ============================================================ */
(function (root) {
  'use strict';

  var DEPTH = {
    finance: {
      intro: 'These calculators cover the money maths that decides most household outcomes: what a loan really costs, what a deposit grows into, and what a tax bill leaves behind. Every result shows the formula inputs it used, so you can change one number and see exactly which part of the answer moved.',
      uses: [
        'Build a full amortisation schedule — payment, interest split and total cost — for any loan, mortgage or car finance deal.',
        'Compare two borrowing options side by side instead of comparing only the headline interest rate.',
        'Project savings and investments with compound growth, regular contributions and a stated rate.',
        'Work out tax, take-home pay and the break-even point between alternatives such as renting and buying.'
      ],
      faqs: [
        { q: 'How is a loan EMI actually calculated?', a: 'The standard amortisation formula sets the payment so that the loan balance reaches zero after the final period. Each payment covers that period\'s interest first, and whatever is left reduces the principal — which is why the interest share falls and the principal share rises over the term. The calculator shows that split for every period rather than only the final total.' },
        { q: 'What happens to the total cost if I prepay part of a loan?', a: 'Prepayment always reduces the principal, so it removes the interest that principal would have accrued for the rest of the term. The saving is far larger in the early years, when most of each payment is still interest. Running the schedule with and without the prepayment shows the difference in total interest directly.' },
        { q: 'Does a lower interest rate always mean a cheaper loan?', a: 'Not on its own. Fees, the repayment frequency and how long you actually keep the loan all change the total. Two offers with different rates can swap places once fees and term are included, so compare total cost — not just the rate — before deciding.' }
      ]
    },
    health: {
      intro: 'Health calculators turn measurements you already have — height, weight, age, activity — into the standard clinical estimates: BMI, resting metabolic rate, body fat and heart-rate zones. They are screening and planning tools, not diagnoses, and the assumptions behind each formula are stated so you can judge how well it fits you.',
      uses: [
        'Check BMI and see how it sits against the published healthy range for your height.',
        'Estimate daily calorie needs from BMR plus an activity multiplier, rather than a fixed guess.',
        'Estimate body-fat percentage from tape measurements using the Navy method.',
        'Convert a target weekly weight change into a realistic daily calorie adjustment.'
      ],
      faqs: [
        { q: 'Why can BMI call a fit athlete "overweight"?', a: 'BMI only compares weight with height. Muscle is denser than fat, so a muscular person can carry a high BMI with low body fat. That is why BMI is useful for populations and rough screening, but should be read alongside a body-fat estimate and waist measurement for individuals.' },
        { q: 'Which metabolic-rate formula should I use?', a: 'Mifflin-St Jeor is the most widely used modern estimate and is generally closer for most adults than the older Harris-Benedict equation. Both are estimates from population data, so treat the result as a starting point and adjust it against what actually happens to your weight over a few weeks.' },
        { q: 'How accurate are heart-rate training zones?', a: 'Zone methods rely on an estimated maximum heart rate, and the common "220 minus age" rule can be off by 10-15 beats for an individual. Zones built on a measured maximum — or on heart-rate reserve — are noticeably better than ones built on the age estimate alone.' }
      ]
    },
    math: {
      intro: 'These are the working tools behind school and everyday maths: percentages and fractions, algebra rearrangements, geometry, and descriptive statistics. Results follow standard order of operations and textbook identities, and every step is shown so the working can be checked by hand.',
      uses: [
        'Convert between percentages, fractions and decimals, and work out percentage increase or decrease.',
        'Solve for the missing quantity in an equation instead of rearranging it on paper.',
        'Get area, perimeter, volume and surface area for the standard 2D and 3D shapes.',
        'Summarise a data set with mean, median, mode, range and standard deviation.'
      ],
      faqs: [
        { q: 'What is the difference between percentage change and percentage points?', a: 'Percentage points measure the gap between two percentages directly — going from 4% to 6% is 2 percentage points. Percentage change measures that gap relative to the starting value — the same move is a 50% increase. Mixing the two up is one of the most common reporting errors.' },
        { q: 'Why does my calculator give a different answer to my spreadsheet?', a: 'Almost always order of operations or rounding. Multiplication and division are evaluated before addition and subtraction, so an expression written without brackets can be read two ways. This calculator shows the intermediate steps, which makes it obvious which reading was used.' },
        { q: 'When should I use standard deviation instead of range?', a: 'Range is easy to read but is driven entirely by the two most extreme values. Standard deviation uses every value, so it describes the spread more faithfully — especially when one outlier would otherwise dominate. Range is still the clearer choice when you only have a handful of readings.' }
      ]
    },
    everyday: {
      intro: 'Everyday calculators answer the small questions that come up constantly: how old someone is to the day, how much time is left before a deadline, what a tip or split bill comes to, and how a recipe scales. They use standard calendar and measurement conventions so the answer matches what a calendar or measuring jug would say.',
      uses: [
        'Find the exact age or elapsed time between two dates, in years, months and days.',
        'Count working days between dates, excluding weekends.',
        'Split a bill or add a tip and see each person\'s share.',
        'Scale a recipe up or down while keeping the ratios intact.'
      ],
      faqs: [
        { q: 'How are leap years handled in date differences?', a: 'The calculators count actual calendar days, so 29 February is included when it falls inside the range. Durations are then broken into years, months and days using real month lengths rather than assuming every month is the same size — which is why the same 365-day gap can read as different month-and-day totals depending on when it starts.' },
        { q: 'Is a date difference inclusive or exclusive of the end date?', a: 'The result counts the span from the start date up to — but not including — the end date, the same convention a countdown uses. If you need the number of days a stay or event covers, add one day to include the final date.' },
        { q: 'Why does my rounded total differ from adding up rounded numbers?', a: 'Rounding each value first and then adding gives a slightly different answer from adding accurately and rounding once at the end. Rounding the final result is the more accurate approach, and is what these calculators do.' }
      ]
    },
    science: {
      intro: 'These calculators apply standard physics and chemistry relationships — density, molarity, energy, wave motion and lab conversions — carrying units through the working. Constants and unit systems follow SI conventions, and assumptions such as standard temperature are labelled rather than hidden.',
      uses: [
        'Find density, mass or volume from the other two for solids, liquids and gases.',
        'Prepare a solution: convert between mass, moles, molarity and volume.',
        'Work out kinetic, potential or thermal energy with units carried through.',
        'Relate wave speed, frequency and wavelength for sound and electromagnetic waves.'
      ],
      faqs: [
        { q: 'Which gas assumptions do these calculators use?', a: 'Gas calculations assume ideal-gas behaviour, with molar volume quoted at a stated temperature and pressure — usually standard conditions. Real gases drift from this near high pressure or low temperature, so treat the result as an ideal-case figure and note the conditions alongside it.' },
        { q: 'How many significant figures should I keep?', a: 'Keep one more digit than your least precise input during the working, then round the final answer to match that least precise input. Rounding at every intermediate step compounds error, so hold the extra digit until the end.' },
        { q: 'Why do my units not cancel out?', a: 'That is the quickest way to catch a mistake. If the units left over are not the units you expected — for example grams where you wanted moles — then a conversion factor was inverted or omitted. Writing the units next to every number makes this visible immediately.' }
      ]
    },
    engineering: {
      intro: 'Engineering calculators cover the repetitive checks that appear in electrical, mechanical and civil work: Ohm\'s law and power, conductor sizing, beam loading, torque and material estimates. Inputs and outputs keep their units, and where a published table or code reference applies it is named.',
      uses: [
        'Solve voltage, current, resistance and power from any two known values.',
        'Size a conductor from current, run length and acceptable voltage drop.',
        'Estimate beam load, reaction and deflection for common support arrangements.',
        'Convert between torque units and relate torque, speed and power.'
      ],
      faqs: [
        { q: 'Do these results include a safety factor?', a: 'No — the calculators return the raw computed value. Safety factors belong to the design code you are working to, not to the formula, so apply the factor your standard requires rather than assuming one is built in. Never use a calculated figure as a substitute for the governing code or a qualified engineer\'s check.' },
        { q: 'Why does wire gauge change so much between AWG and mm²?', a: 'AWG is a logarithmic scale that gets larger as the number gets smaller, while mm² is a direct area measurement. They are not linearly interchangeable, so always convert with a table rather than a ratio — and check whether a quoted gauge is the conductor area or the overall cable size.' },
        { q: 'How much voltage drop is acceptable on a run?', a: 'Common guidance targets a few per cent of nominal voltage at the far end, with tighter limits for sensitive loads, but the exact figure comes from your local wiring rules. The calculator shows the drop for a given conductor and length so you can compare it against the limit that applies to you.' }
      ]
    },
    construction: {
      intro: 'Construction calculators turn measurements into material quantities: concrete volume, rebar length, roofing squares, flooring area and paint coverage. They use trade-standard estimating methods, state the waste allowance separately, and let you move between metric and imperial without losing the ratio.',
      uses: [
        'Work out concrete volume for slabs, footings and columns, with a waste allowance on top.',
        'Estimate rebar quantity and cut length from grid spacing and bar size.',
        'Convert roof area into squares and bundles for ordering.',
        'Get paint or flooring coverage from room dimensions and the number of coats.'
      ],
      faqs: [
        { q: 'How much waste allowance should I add?', a: 'It depends on the shape of the work: straightforward slabs usually allow around 5-10%, while cut-heavy work such as tiling or complex formwork can waste much more. Ordering slightly over is far cheaper than a second delivery mid-pour, so add the allowance deliberately rather than rounding up by feel.' },
        { q: 'Should I order bagged concrete or ready-mix?', a: 'Roughly, bagged mix becomes uneconomic past about a cubic metre — the bag count and mixing time grow faster than the cost of a truck. Below that, bagged mix is convenient and easier to place in small or awkward spots. The volume figure is what decides it, so calculate that first.' },
        { q: 'Do the calculators handle both metric and imperial?', a: 'Yes. You can enter dimensions in one system and read the material quantities in whichever units your supplier uses, because the underlying volume is converted rather than recalculated. That avoids the rounding drift you get from converting the dimensions first.' }
      ]
    },
    conversion: {
      intro: 'Unit conversion calculators move a value between measurement systems — length, mass, volume, temperature, speed, area and digital data — using exact defined factors where they exist and published approximations where they do not. The factor used is shown with the result so you can see how much rounding is involved.',
      uses: [
        'Convert length, mass and volume between metric and imperial units.',
        'Convert temperatures between Celsius, Fahrenheit and Kelvin.',
        'Convert cooking volumes and weights for recipe scaling.',
        'Move between decimal and binary data units such as gigabytes and gibibytes.'
      ],
      faqs: [
        { q: 'Why does a "1 TB" drive show less space than expected?', a: 'Drive capacity is usually quoted in decimal units (1 TB = 1,000 GB) while operating systems report binary units (1 TiB = 1,024 GiB). The difference is about 9%, and it explains almost every "missing space" complaint. Convert using the same base the label uses before comparing.' },
        { q: 'Temperature is a special case — why?', a: 'Because Celsius and Fahrenheit have different zero points as well as different step sizes, temperature is a shift-and-scale conversion rather than a simple ratio. Kelvin, by contrast, shares Celsius\'s step size, so only the offset is needed.' },
        { q: 'Are the conversion factors exact?', a: 'Defined relationships — such as inch to millimetre, or pound to kilogram — are exact and used at full precision. Older or customary measures, especially cooking volumes, vary by country and are approximations, which is why weight is the more reliable way to scale a recipe.' }
      ]
    },
    business: {
      intro: 'These calculators cover the operating numbers behind a small business: margin and markup, break-even volume, customer acquisition cost, lifetime value and cash runway. Each one separates the inputs you control from the assumptions you cannot, so a result can be challenged rather than just accepted.',
      uses: [
        'Convert between cost, price, margin and markup without mixing up the two percentages.',
        'Find the break-even unit volume from fixed costs, price and variable cost.',
        'Compare customer acquisition cost with lifetime value to judge whether growth pays for itself.',
        'Project cash runway from current balance, revenue and monthly burn.'
      ],
      faqs: [
        { q: 'What is the difference between margin and markup?', a: 'Markup is measured against cost; margin is measured against price. A product bought for 60 and sold for 100 has a 40 margin (40% of the price) but a 66.7% markup on cost. Quoting one while your accountant uses the other is a common and expensive mix-up.' },
        { q: 'What ratio of CAC to LTV is healthy?', a: 'A widely used rule of thumb is that lifetime value should be around three times acquisition cost, with payback inside a year for most small businesses. The right figure depends on your margins and how much cash you must fund up front, so treat it as a starting benchmark, not a target to hit exactly.' },
        { q: 'Should break-even use gross or net margin?', a: 'Break-even volume is usually calculated on contribution margin — price minus variable cost per unit — because fixed costs are covered by that contribution. Using net margin, which already includes fixed costs, double-counts them and understates the volume you need.' }
      ]
    },
    education: {
      intro: 'Education calculators handle the numbers that decide grades and course plans: weighted GPA, the score needed on a final exam, test percentages and study-time budgeting. They follow the credit-weighting and rounding conventions that schools and universities commonly publish, with the method shown alongside the result.',
      uses: [
        'Convert letter grades and credits into a weighted GPA on the 4.0 scale.',
        'Work out the mark needed on a final exam to reach a target course grade.',
        'Convert between raw marks, percentages and grade boundaries.',
        'Spread study hours across subjects by weight and deadline.'
      ],
      faqs: [
        { q: 'Why is a weighted GPA different from a plain average?', a: 'Weighted GPA multiplies each grade by the credits that course carries before averaging, so a four-credit course moves the total far more than a one-credit elective. A plain average treats every course equally, which can overstate progress in a light timetable.' },
        { q: 'How is the score needed on a final exam calculated?', a: 'The calculation works backwards from your target: the final exam must supply whatever share of the overall grade is still missing after your current coursework. Entering the exam\'s weight and your current mark makes the target explicit — including the cases where the grade is already secured or already out of reach.' },
        { q: 'Do different institutions use different scales?', a: 'Yes. The 4.0 scale, weighted scales that reward advanced courses, and percentage-based systems all coexist, and cut-offs for each letter grade vary by country and institution. Always check your own handbook, and use these tools to compare options rather than as an official transcript.' }
      ]
    },
    utilities: {
      intro: 'Utility calculators are the small technical helpers that do not fit anywhere else: QR codes, password strength, colour conversion, text counts and hash-style utilities. Everything runs locally in your browser — nothing you type is sent anywhere — which is why they are safe for tokens and client data.',
      uses: [
        'Generate a QR code for a link or short text and download it as an image.',
        'Estimate password strength and see how character set and length change the crack time.',
        'Convert between hex, RGB and HSL colour values.',
        'Count words, characters and reading time for a piece of text.'
      ],
      faqs: [
        { q: 'Is the text I paste into these tools uploaded anywhere?', a: 'No. The QR, password and text utilities run entirely in your browser using local JavaScript. That makes them suitable for one-off links, generated passwords and client material — but note that anything you paste into a page can still be captured by browser extensions you have installed.' },
        { q: 'What makes a password strong — length or complexity?', a: 'Length matters more. Every extra character multiplies the number of combinations, while adding a symbol to a short password only widens it slightly. A long passphrase of unrelated words usually beats a short string of substituted characters, and it is easier to remember.' },
        { q: 'Why might a QR code fail to scan?', a: 'Usually too much data in too small a print, or insufficient contrast — scanners need a clear dark-on-light pattern with a quiet margin. Shorter content and a physically larger code are the two most effective fixes; the error-correction level trades capacity for tolerance of smudges or partial coverage.' }
      ]
    },
    lifestyle: {
      intro: 'Lifestyle calculators handle the planning maths around daily life: moving costs, sharing rent fairly, scaling recipes and pet care timelines. They state their assumptions plainly, because most of these answers depend on choices — how far, how many people, how much cushion — rather than on fixed formulas.',
      uses: [
        'Build a moving budget including the fixed costs people forget, such as deposits and utilities.',
        'Split rent by income share instead of by an equal head count.',
        'Scale a recipe while keeping the ratios intact.',
        'Convert a pet\'s age into a comparable human-life stage for care planning.'
      ],
      faqs: [
        { q: 'Why are lifestyle results presented as ranges?', a: 'Because the inputs genuinely vary. Moving quotes, food costs and care prices differ by city and by supplier, so a single number would imply precision that does not exist. The calculators return a range with the assumptions visible, which is more useful for budgeting than a false exact figure.' },
        { q: 'Is splitting rent by income fairer than splitting equally?', a: 'It depends what you agreed. Income-share splitting keeps each person\'s housing cost at the same proportion of their pay, which suits couples and shared houses with very different earnings. Equal splitting is simpler and keeps the arrangement neutral — the tool just makes the numbers behind either choice clear.' },
        { q: 'Can I rely on these figures for a real budget?', a: 'Use them as a planning starting point and then replace the assumptions with your own quotes. The value is in seeing which items dominate the total, so you know where to negotiate — usually the few large fixed costs rather than the many small ones.' }
      ]
    },
    regional: {
      intro: 'Regional calculators cover the deposit, tax and payroll rules for India, Pakistan and the Gulf: fixed and recurring deposits, PPF, GST, zakat and local salary structures. Rates and thresholds are labelled as published estimates that change, so always re-check the current notification before you rely on a figure.',
      uses: [
        'Project fixed or recurring deposit maturity with the actual compounding frequency.',
        'Calculate GST as exclusive or inclusive of the quoted price.',
        'Work out income tax and take-home pay under the regimes available to you.',
        'Calculate zakat on savings and holdings against the nisab threshold.'
      ],
      faqs: [
        { q: 'How current are the rates used here?', a: 'Rates, slabs and thresholds are entered from published sources and treated as inputs, not as live values — they change with each budget or policy update. The calculators let you enter the current rate yourself, which keeps the arithmetic correct even when a published figure has moved on.' },
        { q: 'What is the difference between GST inclusive and exclusive?', a: 'Exclusive means the quoted price is before tax, so the tax is added on top. Inclusive means the tax is already inside the quoted price, so it must be backed out rather than added — otherwise you overcharge by the tax on the tax. The calculator shows both directions because invoices use both conventions.' },
        { q: 'How is zakat calculated on gold and savings?', a: 'Zakat applies to eligible wealth held for a lunar year that exceeds the nisab threshold, at the standard rate. Gold and silver are valued at current market weight, and savings are counted at their balance. Because nisab and rates are religious requirements rather than adjustable estimates, verify them with a qualified scholar before paying.' }
      ]
    },
    food: {
      intro: 'Food and nutrition calculators turn labels and recipes into daily numbers: calories, macronutrient splits, net carbs and scaled ingredient amounts. They use standard energy conversions and nutrition conventions, and separate measured values from the general guidelines that surround them.',
      uses: [
        'Estimate daily calorie needs, then split them into protein, carbohydrate and fat.',
        'Check net carbohydrates for a low-carb or ketogenic plan.',
        'Scale a recipe up or down while keeping the ratios and seasoning sensible.',
        'Compare a serving against your daily targets rather than reading a label in isolation.'
      ],
      faqs: [
        { q: 'Where do the calorie-per-gram figures come from?', a: 'The standard factors — about 4 kcal per gram of protein and carbohydrate, 9 kcal per gram of fat, and 7 kcal per gram of alcohol — come from the Atwater system. They are averages across foods, so a label\'s measured value can differ slightly from one calculated from macros.' },
        { q: 'What exactly are net carbs?', a: 'Net carbs are total carbohydrate minus fibre, and sometimes minus sugar alcohols, on the basis that fibre is largely undigested. Rules differ by country and some products subtract more than others, so use one consistent method when comparing foods rather than mixing label conventions.' },
        { q: 'Should I weigh ingredients or use volume measures?', a: 'Weighing is more accurate, especially for anything that settles or packs down such as flour, sugar and grated cheese. Volume measures can vary by a third or more depending on how the ingredient is scooped, which is enough to change a bake noticeably.' }
      ]
    },
    fitness: {
      intro: 'Fitness calculators convert training inputs into the numbers you plan around: running pace and split times, estimated one-rep maximum, heart-rate zones and calories burned. Each uses a named, published formula with its assumptions stated, because training formulas describe averages rather than individuals.',
      uses: [
        'Turn a target finish time into per-kilometre or per-mile split paces.',
        'Estimate a one-rep maximum from a set you actually completed.',
        'Set heart-rate training zones from age, resting rate and the zone method you prefer.',
        'Estimate calories burned from activity, duration and body weight.'
      ],
      faqs: [
        { q: 'How accurate is a one-rep max estimate?', a: 'Estimates from a set of three to ten reps are reasonably reliable, which is exactly why they are used — they avoid testing a true single-rep maximum. Accuracy falls as the rep count rises above about ten, and the estimate describes the average lifter, so treat it as a training target and progress cautiously.' },
        { q: 'Why do my measured max heart rate and the age formula disagree?', a: 'Because the age formula is a population average with a wide spread across individuals. If you have a measured maximum from a test or a hard effort, use that: zones built on a real maximum, or on heart-rate reserve, reflect your own physiology instead of the average.' },
        { q: 'Are calories-burned figures exact?', a: 'No. They are estimates from activity type, duration and body weight, and wearable devices add further error. They are most useful for comparing activities and for tracking trends over time, not as an exact ledger of your energy balance.' }
      ]
    },
    auto: {
      intro: 'Auto and transport calculators cover the running-cost side of driving: fuel or charging cost per trip, running cost per mile, finance payments and depreciation. They use the efficiencies and prices you enter, so a result can be re-run after any price change instead of going stale.',
      uses: [
        'Cost a specific journey from distance, fuel efficiency and current price per litre or gallon.',
        'Compare the running cost of a petrol car with an electric one over the same mileage.',
        'Estimate monthly finance payments and total interest for a vehicle loan.',
        'Project vehicle value over time so depreciation is budgeted rather than discovered at trade-in.'
      ],
      faqs: [
        { q: 'Should I compare fuel economy in mpg or L/100km?', a: 'They measure different ratios, so the "better" unit depends on what you are doing. Miles per gallon is distance per volume and is easier for range planning; litres per 100 km is volume per distance and is linear, which makes consumption differences easier to compare fairly between vehicles.' },
        { q: 'How is EV charging cost calculated?', a: 'Charging cost is battery capacity added, divided by charging efficiency, multiplied by your tariff. Home charging on an off-peak rate is usually far cheaper per mile than public fast charging, so the same car can have very different running costs depending on where it is charged.' },
        { q: 'Do cars really lose that much value in the first year?', a: 'New cars typically lose a significant share of their value as soon as they are registered, then continue depreciating more slowly. Exact rates vary widely by model, condition and market, so treat the depreciation curve as a planning shape and adjust it with real local resale prices.' }
      ]
    },
    career: {
      intro: 'Career calculators handle pay and work arrangements: converting between hourly, daily and annual rates, pricing freelance work, comparing job offers and checking whether a side project actually pays. They make the hidden assumptions explicit — working hours, holidays, unpaid admin time — because that is where offers are usually miscompared.',
      uses: [
        'Convert an hourly rate to an annual salary, and back again.',
        'Price a freelance day rate so it covers tax, holidays and non-billable time.',
        'Compare two job offers on total value rather than base salary alone.',
        'Test whether a side project is profitable after real costs and hours.'
      ],
      faqs: [
        { q: 'Why is the annual figure based on 2,080 hours?', a: 'That is 40 hours a week for 52 weeks, which is the standard full-time convention for converting an hourly rate to a salary. It ignores holidays and paid leave, so your effective hourly rate for hours actually worked is usually higher — the calculator shows both readings so the comparison is honest.' },
        { q: 'What should a freelancer charge compared with a salaried rate?', a: 'A freelance rate has to cover what an employer would otherwise provide: holidays, sick time, equipment, training and the hours spent on admin and finding work that are never billed. Dividing a salary by 2,080 therefore understates a sustainable freelance rate, often substantially.' },
        { q: 'How should I compare offers with different benefits?', a: 'Put everything on the same basis: convert each benefit to a yearly cash value — pension contribution, insurance, leave days at your daily rate — then compare totals. A slightly lower base salary with stronger benefits and more leave can easily win, and only a like-for-like total makes that visible.' }
      ]
    },
    homegarden: {
      intro: 'Home and garden calculators turn room and plot measurements into quantities and costs: paint and wallpaper, lighting, air-conditioning capacity, soil volume and DIY material estimates. They follow standard estimating practice with waste allowances shown separately, so you order once rather than twice.',
      uses: [
        'Work out paint litres from wall area, number of coats and coverage per litre.',
        'Estimate wallpaper rolls from room dimensions and pattern repeat.',
        'Size a room air conditioner from floor area, ceiling height and sun exposure.',
        'Calculate soil or mulch volume for beds from area and depth.'
      ],
      faqs: [
        { q: 'How much extra paint should I buy?', a: 'Allow for the second coat and a small margin for touch-ups and absorption on new or porous surfaces. Coverage figures on the tin assume ideal conditions, and a textured wall can absorb noticeably more, so rounding up one litre is usually cheaper than an unplanned second trip.' },
        { q: 'Is the "size by floor area" rule enough for air conditioning?', a: 'It is a starting point, not the answer. Ceiling height, glazing area, which way the room faces, insulation and occupancy all change the cooling load, sometimes by a large margin. Use the area rule to shortlist a capacity and then adjust for those factors before buying.' },
        { q: 'Do I need to allow for pattern repeat on wallpaper?', a: 'Yes — a large repeat means every strip after the first must be matched, so more of each roll is trimmed away. The calculation should divide usable roll length by the strip height after adding the repeat, which is why two rooms of identical area can need different roll counts.' }
      ]
    },
    tech: {
      intro: 'Tech and digital calculators deal with computing numbers that are easy to get wrong: download and transfer time, data usage, storage units, password strength and hosting economics. They are explicit about the unit conventions involved, because base-2 versus base-10 and bits versus bytes cause most of the confusion.',
      uses: [
        'Estimate how long a download or transfer will take at a stated connection speed.',
        'Convert between storage units and see the difference between decimal and binary prefixes.',
        'Project data usage across a month from per-day activity.',
        'Check whether hosting or infrastructure costs are covered by expected traffic and revenue.'
      ],
      faqs: [
        { q: 'Why does a 100 Mbps connection not download 100 MB per second?', a: 'Because connection speeds are quoted in megabits and file sizes in megabytes, and there are eight bits to a byte. So 100 Mbps is about 12.5 MB/s at best, before protocol overhead and server limits reduce it further in practice.' },
        { q: 'Why is a terabyte drive smaller than a terabyte?', a: 'Manufacturers use decimal prefixes (1 TB = 1,000 GB) while many operating systems report binary ones (1 TiB = 1,024 GiB). Both are correct — they just measure differently, which is why the same drive shows roughly 9% less space than its label.' },
        { q: 'Are transfer-time estimates optimistic?', a: 'Usually yes, because they assume the full bandwidth is available and stable. Overhead, other traffic on the connection, distance to the server and disk write speed all reduce the real figure. Treat the estimate as a best case and expect the actual transfer to be somewhat longer.' }
      ]
    },
    family: {
      intro: 'Family calculators support the long-horizon planning that is hardest to judge by eye: predicting a child\'s adult height, building a family budget, saving toward education and estimating childcare costs. They use published growth and finance methods with clearly stated assumptions, and are planning aids rather than advice.',
      uses: [
        'Estimate a child\'s adult height from parents\' heights and the child\'s current age.',
        'Build a family budget that separates fixed commitments from flexible spending.',
        'Project how much to save monthly to reach a future education cost.',
        'Estimate childcare costs for the hours and arrangement you actually need.'
      ],
      faqs: [
        { q: 'How accurate is a predicted adult height?', a: 'The widely used mid-parental method gives a reasonable central estimate, but genetics is only part of the picture — nutrition, health and timing of puberty all shift the outcome. It is most useful read as a range rather than a single number, and it is not a medical assessment.' },
        { q: 'What growth assumptions do the savings projections make?', a: 'A constant rate of return, with contributions made on a fixed schedule and no withdrawals. Real returns vary year to year and inflation changes what the future amount is worth, so run the projection at two or three different rates to see how much the plan depends on the assumption.' },
        { q: 'Can I rely on these figures for a financial decision?', a: 'They are planning estimates built from the inputs you provide, not regulated financial advice. Use them to understand the shape and scale of a decision, then verify the specifics — costs, tax treatment and product terms — with a qualified professional before committing.' }
      ]
    }
  };

  function depthFor(catKey) {
    return DEPTH[catKey] || null;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Intro + "what you can work out" list. Rendered ABOVE the tool grid.
  // Deliberately NAME-FREE heading: the SSG's CAT_NAME and the client's
  // CALC_DATA names disagree for 6 categories (health, lifestyle, regional,
  // fitness, career, family), so interpolating a name here would make the
  // prerendered HTML and the hydrated DOM differ. Uniqueness lives in the
  // body copy, which is per-category and identical on both sides.
  function introHtml(catKey, opts) {
    var d = DEPTH[catKey];
    if (!d) return '';
    var html = '<div class="explain-card seo-guide hub-depth">';
    html += '<h2>What you can work out with these calculators</h2>';
    html += '<p>' + escHtml(d.intro) + '</p>';
    html += '<ul class="hub-uses">';
    for (var i = 0; i < d.uses.length; i++) html += '<li>' + escHtml(d.uses[i]) + '</li>';
    html += '</ul></div>';
    return html;
  }

  // FAQ section. Rendered BELOW the tool grid (mirrored by faqSchema()).
  function faqHtml(catKey) {
    var d = DEPTH[catKey];
    if (!d || !d.faqs.length) return '';
    var html = '<div class="explain-card seo-guide"><h2>Frequently asked questions</h2><div class="seo-faqs">';
    for (var i = 0; i < d.faqs.length; i++) {
      html += '<h3>' + escHtml(d.faqs[i].q) + '</h3><p>' + escHtml(d.faqs[i].a) + '</p>';
    }
    html += '</div></div>';
    return html;
  }

  // Comparison table — the block that makes a /hub/<cat>/ page something other
  // than a second copy of /<cat>/.
  //
  // Columns describe what each calculator DOES and what it NEEDS, taken from the
  // real registry entries (name, desc, input labels). Input *labels* are the only
  // numbers-adjacent thing here — no result values are invented for a page that
  // cannot run the calculator, and every row links its own tool page so the hub
  // still carries the crawl paths the old 48-card grid provided.
  //
  // Heading is deliberately NAME-FREE for the same reason as introHtml: the
  // SSG's CAT_NAME and the client's CALC_DATA names disagree for 6 categories,
  // so interpolating a name would make prerender and hydrate diverge.
  function compareTableHtml(catKey, tools) {
    if (!catKey || !tools || tools.length < 2) return '';
    var rows = '';
    var withInputs = 0;
    for (var i = 0; i < tools.length; i++) {
      var t = tools[i];
      if (!t || !t.id || !t.name) continue;
      var labels = [];
      var inputs = t.inputs || [];
      for (var j = 0; j < inputs.length && labels.length < 5; j++) {
        if (inputs[j] && inputs[j].label) labels.push(escHtml(inputs[j].label));
      }
      if (labels.length) withInputs++;
      rows += '<tr>';
      rows += '<td class="tool-name"><a href="/' + catKey + '/' + String(t.id).replace(/[^a-zA-Z0-9_-]/g, '') + '/">' + escHtml(t.name) + '</a></td>';
      rows += '<td>' + escHtml(String(t.desc || '')) + '</td>';
      rows += '<td>' + (labels.length ? labels.join(' · ') : 'Enter your own values') + '</td>';
      rows += '</tr>';
    }
    if (!rows) return '';
    var html = '<div class="explain-card seo-guide">';
    html += '<h2>Compare calculators by what you enter</h2>';
    html += '<p>One row per calculator: what it works out and the inputs it asks for. '
      + 'Open any row to use the calculator itself.</p>';
    html += '<div class="comparison-table-wrap" role="region" tabindex="0" aria-label="Comparison table: what each calculator works out and what you enter (scrollable)">';
    html += '<table class="comparison-table hub-compare-table"><thead><tr>'
      + '<th>Calculator</th><th>What it works out</th><th>What you enter</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>';
    html += '</div></div>';
    // A table with no input labels anywhere would be a claim we cannot support.
    return withInputs >= 2 ? html : '';
  }

  // Convenience: the full block in reading order.
  function depthHtml(catKey, opts) {
    return introHtml(catKey, opts) + faqHtml(catKey);
  }

  // FAQPage JSON-LD matching the rendered FAQ section (schema must not claim
  // questions the page does not show).
  function faqSchema(catKey) {
    var d = DEPTH[catKey];
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
    DEPTH: DEPTH,
    depthFor: depthFor,
    introHtml: introHtml,
    faqHtml: faqHtml,
    compareTableHtml: compareTableHtml,
    depthHtml: depthHtml,
    faqSchema: faqSchema
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CategoryDepth = api;
})(typeof window !== 'undefined' ? window : this);
