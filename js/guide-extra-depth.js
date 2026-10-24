/* ============================================================
 * CalcProMaster — authored extra depth for thin guides
 * ------------------------------------------------------------
 * Each entry adds 2-4 guide-specific sections (heading + paragraphs) that
 * scripts/apply-guide-extra-depth.cjs injects above the FAQ heading, between
 * markers. This is the editorial half of the "62 guides depth" item: the
 * computed worked example (scripts/apply-guide-worked-examples.cjs) shows what
 * the calculator returns, and these sections explain what the reader still has
 * to decide — which input is usually wrong, what the tool deliberately does not
 * model, and how the result is commonly misread.
 *
 * Rules for adding content here:
 *   · facts only, and only ones that hold across regions (say "some markets"
 *     rather than inventing a local rule)
 *   · no keyword stuffing, no repeated sentence shapes across guides
 *   · link to a calculator only when the guide's own page already links it
 * ============================================================ */
'use strict';

const PACK = {
  'protein-intake': {
    sections: [
      ['Where the 1.6 g/kg figure comes from', [
        'The 0.8 g/kg in the table is the RDA — the intake that keeps almost everyone in nitrogen balance, i.e. the floor that prevents deficiency. It was never a target for people who train. Meta-analyses of resistance-training trials put the point where extra protein stops adding muscle at roughly 1.6 g/kg per day, with a confidence interval that reaches about 2.2.',
        'That gap matters when reading contradictory advice: a dietitian quoting 0.8 and a coach quoting 2.0 can both be right about different questions. Deficiency prevention and muscle gain are separate targets with separate evidence bases.',
      ]],
      ['Protein quality is a second variable', [
        'Grams are only half the story. Digestibility and amino-acid profile decide how much of those grams the body can actually use, which is why plant-based eaters are usually advised to aim 10-20% higher than the bands above and to combine sources across the day rather than in one meal.',
        'Leucine is the switch most often discussed: roughly 2.5 g in a sitting is the threshold associated with triggering muscle protein synthesis, which is why 30 g of whey and 30 g of rice protein are not interchangeable even though the labels match.',
      ]],
      ['Cooked weight versus raw weight', [
        'Food databases disagree about protein because they disagree about water. Chicken breast is about 23 g of protein per 100 g raw and about 31 g per 100 g cooked, because cooking removes water and concentrates everything else. Weighing cooked food against a raw-weight table inflates your total by a third.',
        'Pick one basis and stay on it. If you weigh food as it goes on the plate, use cooked values; if you portion before cooking, use raw values. The same trap applies to rice, lentils and pasta, where the water gain is far larger than in meat.',
      ]],
      ['What this calculator cannot know', [
        'Kidney disease, pregnancy, liver conditions and some medications change protein targets, and none of them are inputs here. Intakes up to about 2 g/kg are well studied in healthy adults; that sentence does not transfer to someone with reduced kidney function, whose target belongs to a clinician.',
        'It also cannot tell you whether you are eating enough overall. Protein targets are usually set inside a calorie target, and a person in a large deficit will lose muscle on a "correct" protein number if the deficit is too aggressive. Treat the grams as one constraint, not the whole plan.',
      ]],
    ],
  },

  'wedding-budget': {
    sections: [
      ['Guest count drives most of the total', [
        'Catering, seating, invitations, favours and transport all scale with headcount, so the guest list is the single biggest lever in the budget — usually 55-70% of the spend once venue capacity forces a larger hall. Cutting twenty guests typically removes more cost than renegotiating any single vendor.',
        'Build the budget from cost per guest outward rather than from a venue package inward. A per-head figure makes the trade-offs visible: an extra 50 guests at a realistic all-in rate is a number you can compare against the honeymoon you were planning.',
      ]],
      ['The costs that arrive after the wedding', [
        'Photography albums, thank-you gifts, courier and shipping, clothing alterations and the final vendor payments often land in the month after the event, when the budget spreadsheet has already been closed. Reserving 5-8% of the total for post-event bills prevents a card balance carrying into the marriage.',
        'Service charge and tax are the other quiet addition: in many markets the quoted per-plate price excludes both, and 15-25% on top is normal. Ask every vendor whether their quote is inclusive, and write the answer into the contract rather than the conversation.',
      ]],
      ['Contingency is a line item, not pessimism', [
        'A 10% contingency is the working norm for events, because weddings reliably produce changes: an extra guest table, a longer rental window, a broken prop replaced the week of. Budgeting zero contingency does not save 10% — it just moves the overrun onto credit.',
        'If the contingency goes unspent, it becomes the honeymoon fund. Framing it that way makes it easier to hold, and easier to defend when a relative suggests one more upgrade.',
      ]],
      ['Cash flow beats the headline total', [
        'Vendors are usually paid in deposits across 6-12 months, while savings arrive monthly. A budget that fits the total but not the deposit schedule still fails, so map every payment date against the months you actually have money.',
        'Family contributions belong on that timeline too, with a date and an amount. A promised contribution that arrives after the final payment is not a contribution to the wedding — it is a loan you did not agree to.',
        "Keep one running document with every payment date and amount, shared with whoever is contributing. Verbal agreements about who covers what are the most common source of friction, and a written schedule settles them before the day rather than after it.",
      ]],
    ],
  },

  'fuel-cost': {
    sections: [
      ['Mileage is the input people guess wrong', [
        'Most drivers quote the figure from the brochure, not from their own car. Measure it at the pump: fill the tank, reset the trip meter, drive normally, fill again at the same pump, and divide distance by the litres (or gallons) it took to refill. Two or three tanks averaged is enough.',
        'City driving with short trips, air-conditioning and cold starts can be 20-30% worse than the highway number. If most of your driving is a school run, use the city figure or the calculation will understate the cost of every trip.',
      ]],
      ['Price per litre is not the price you pay', [
        'The pump price changes weekly and varies by station, so a trip costed at last month\'s price is already stale. Cost the round trip at the highest price you have seen recently: the difference is a few percent, and it is the direction the error usually runs.',
        'For a recurring commute, calculate the monthly cost rather than the per-trip cost. Monthly fuel is a fixed line in most household budgets even though the underlying maths is variable, and seeing it that way makes carpooling or a route change comparable.',
      ]],
      ['What the fuel number leaves out', [
        'Fuel is roughly a third to a half of what a car costs to run. Tolls, parking, servicing, tyres, insurance and depreciation do not appear in a fuel calculator, and on a long commute the depreciation per kilometre can exceed the fuel per kilometre.',
        'That does not make the fuel figure useless — it is the right number for "what will this trip cost me today". It is the wrong number for "can I afford this car", which needs the ownership total.',
      ]],
      ['Idling and load are real costs', [
        'An engine idling in traffic burns fuel for zero distance, so a route with fewer stops often beats a shorter route. Air-conditioning adds a measurable load, more so in small engines and in stop-start traffic than on the highway.',
        'Roof racks, full boots and under-inflated tyres all raise consumption. None of them are inputs in a fuel calculator, which is why the tool is a good estimate and a poor substitute for your own three-tank measurement.',
      ]],
    ],
  },

  'hourly-rate': {
    sections: [
      ['Salary divided by hours is not your rate', [
        'The usual shortcut divides annual salary by 2,080 hours. That number is the cost of an hour to your employer, not the value of an hour to you: it ignores unpaid overtime, the commute, and the fact that a salaried role usually includes work you would not do for free.',
        'Divide by the hours you actually work in a year — including the evenings — and add the value of benefits you would otherwise buy (health cover, pension contribution, equipment). The honest comparison number is usually higher than the naive one.',
      ]],
      ['The employer cost multiplier', [
        'A salaried employee costs the employer roughly 1.2-1.4 times the gross salary once payroll taxes, benefits, equipment, software and admin are included. That is why contractors charge more per hour than employees earn per hour without being overpaid.',
        'If you are pricing freelance work against a salary you used to earn, apply that multiplier before comparing. Ignoring it is the most common reason a new freelancer underprices by 30% and only notices a year later.',
      ]],
      ['Billable hours are a fraction of worked hours', [
        'Freelancers rarely bill more than 60-70% of their working time. Admin, invoicing, sales, learning and gaps between projects are real hours that earn nothing, so the billable rate has to cover them.',
        'That is the arithmetic behind the common advice to set a freelance rate at roughly twice the equivalent hourly wage. It is not a markup on skill — it is the cost of the unbilled hours.',
      ]],
      ['A floor, a target and a walk-away number', [
        'Three numbers are more useful than one. The floor covers costs and the minimum you need to stay solvent; the target is what you quote; the walk-away is the point below which the work damages you financially or blocks better work.',
        'Revisit all three when your costs change, and raise the target for new clients before raising it for existing ones. Long-standing clients can be moved with notice and a reason; new clients only ever see the current number.',
        "Review all three once a year, and after any large change in costs. A rate set two years ago against a different rent and a different software stack is a number you have outgrown without noticing, and the gap is paid by your evenings.",
      ]],
    ],
  },

  'screen-time': {
    sections: [
      ['What actually counts as screen time', [
        'A single total hides the difference between active and passive use. Reading, writing code, video calls and editing are effortful; autoplay video and background scrolling are not, and they are the hours most people want back.',
        'Count background exposure too — a television left on, a second screen beside the laptop, a phone face-up on the desk. Those minutes rarely appear in app-based screen-time reports even though they shape sleep and attention.',
      ]],
      ['The 20-20-20 rule and its limits', [
        'Every 20 minutes, look at something 20 feet away for 20 seconds. The evidence for it is modest but the mechanism is sound: sustained near focus reduces blinking, and reduced blinking dries the eyes, which is what most "screen fatigue" actually is.',
        'It helps with eye comfort; it does not offset sleep loss, sedentary hours or doomscrolling. Treat it as one small countermeasure among several rather than a way to earn more screen time.',
      ]],
      ['Sleep is the part worth protecting', [
        'The blue-light effect on melatonin is real but smaller than headlines suggest. The bigger sleep problem is timing and arousal: a stimulating feed at midnight delays sleep because the brain is engaged, not only because the screen is bright.',
        'A practical rule beats a perfect one: a fixed stop time for the phone, with the charger outside the bedroom. If you want to keep reading on a screen, set the device to a warm, dim profile an hour before bed and keep the content calm.',
      ]],
      ['Turning a total into a budget', [
        'A daily cap on total minutes is hard to keep because not all minutes are equal. Budget by category instead — work, messaging, video, scrolling — and set the cap on the category you want to shrink, which is usually the one with no end state.',
        'Measure a normal week before changing anything. Most people underestimate their total by an hour or more, and a baseline makes the first reduction noticeable instead of theoretical.',
        "Review weekly rather than daily. A single heavy day is noise; a week above the budget every week is the pattern worth changing, and it is far easier to act on than a number that moves every few hours.",
      ]],
    ],
  },

  'ev-vs-petrol': {
    sections: [
      ['Compare ownership, not sticker price', [
        'An electric car usually costs more to buy and less to run. The comparison only means something when both sides include purchase price or finance cost, insurance, servicing, tyres, fuel or electricity, and resale value at the point you would sell.',
        'Depreciation is the largest single line for most new cars and the one people leave out. If resale values in your market are uncertain for one of the two, widen the range rather than picking the number that favours your preferred answer.',
      ]],
      ['Electricity tariff is the EV mileage', [
        'Running cost depends on consumption (kWh per 100 km, typically 15-20 for a car), the tariff you actually pay, and how much charging happens at home. Home charging on a low domestic slab is dramatically cheaper than public fast charging on a per-unit basis.',
        'If your tariff has slabs, the marginal unit matters, not the average. Adding an EV can push a household into a higher slab, which quietly raises the cost of the last units — include that if your usage is already near a threshold.',
      ]],
      ['Where petrol still wins', [
        'Long-distance routes with sparse charging, very high annual mileage on motorways, and markets where resale or battery support is uncertain all favour the combustion car today. So does a household that cannot charge at home and relies on public infrastructure.',
        'The break-even is usually annual distance: below a threshold, the higher purchase price never gets repaid. Above it, running cost dominates. That threshold is what the comparison should produce, not a single verdict.',
      ]],
      ['Battery health is a slow-moving input', [
        'Capacity loss of roughly 1-2% a year is normal, faster with frequent fast charging and extreme heat. It affects range long before it affects usability, and it affects resale value more than it affects daily driving.',
        'Warranty terms (often 8 years to 70% capacity) are worth reading before comparing two used EVs. Two cars at the same price with different remaining warranty are not the same purchase.',
        "Home charging equipment is a cost too, and installation can be significant if the parking space is far from the meter. Put it in the first year of the comparison rather than treating it as infrastructure that arrives for free.",
      ]],
    ],
  },

  'ac-size': {
    sections: [
      ['Tonnage is capacity, not comfort', [
        'One ton of cooling is about 3,517 watts, or 12,000 BTU per hour. The number describes how much heat the unit can remove, so it has to be matched to the room\'s heat load rather than to its floor area alone.',
        'A room can be small and still need a large unit: a west-facing wall, a glass façade, an uninsulated roof or a kitchen all add load that square footage cannot express. That is why two rooms of the same size can need different tonnage.',
      ]],
      ['What adds heat load', [
        'Sun on glazing, especially west and south, is usually the largest single factor after area. Insulation, ceiling height, the number of occupants (roughly 400-600 BTU per person) and appliances — a computer, a television, an oven — all add to the total.',
        'Ventilation matters too: an open doorway to a hot corridor can undo a correctly sized unit. Fix the envelope before buying a bigger machine, because cooling a leaky room is a permanent running cost.',
      ]],
      ['Oversizing is a real failure mode', [
        'A unit that is too large cools the air quickly, reaches the setpoint and switches off, leaving the room cold and clammy because it never ran long enough to remove humidity. Short cycling also wears the compressor and uses more energy than a steady run.',
        'Undersizing fails differently: the unit runs continuously, never reaches the setpoint on the hottest days, and consumes maximum power while doing it. Both errors are expensive; the correct size is the one that runs steadily at design conditions.',
      ]],
      ['Inverter units change the arithmetic', [
        'An inverter air conditioner varies compressor speed instead of switching on and off, so it holds a temperature rather than chasing it. That makes slight oversizing less harmful than with fixed-speed units, and it makes part-load efficiency the number to compare.',
        'Check the seasonal efficiency rating rather than the headline tonnage when comparing two units. Two 1.5-ton inverters from different years can differ by a third in electricity use over a summer.',
        "Servicing matters as much as the rating. A clogged filter and a fouled coil can add close to a fifth to consumption within one season, which is a larger effect than the gap between two closely matched models.",
      ]],
    ],
  },

  'freelance-rate-card': {
    sections: [
      ['A rate card is a reference, not a promise', [
        'The number you publish sets expectations, but what you actually earn is the average across projects after discounts, scope creep and unpaid revisions. Track the effective hourly rate on completed work for a quarter before deciding the card is wrong.',
        'If the card says one number and the invoices average 35% lower, the problem is usually quoting, not pricing. A higher headline rate with disciplined scope often produces the same income with fewer hours.',
      ]],
      ['Price the outcome where you can', [
        'Hourly pricing punishes speed: the faster you get at a task, the less it pays. Fixed pricing for a defined deliverable rewards the experience that makes you fast, provided the scope is written down and the revision rounds are capped.',
        'Keep an hourly rate as the internal yardstick. Divide the fixed price by your realistic hours; if the result is below your floor, the project is a donation regardless of how the invoice is worded.',
      ]],
      ['Scope creep has a price and a process', [
        'Most creep arrives as a small request that feels unreasonable to refuse. A written scope with a named number of revisions, and a stated additional rate beyond it, makes the conversation about the agreement rather than about your willingness.',
        'Say the sentence once, early: "That is outside the agreed scope — I can add it for X." Clients respect it more than silence, and the projects that survive it are usually the better ones.',
      ]],
      ['Raising rates without losing the roster', [
        'Raise for new clients immediately, and give existing clients notice with a date. A 10-15% increase with 30-60 days of warning is rarely the reason a good client leaves; a surprise increase is.',
        'If a long-standing client cannot absorb it, offer a reduced scope at the old price rather than a permanent discount on the full service. That keeps the rate card intact and lets the client choose what to keep.',
        "Review the card once a year against your costs and your actual invoiced average. A rate that has not moved in three years is a discount you never decided to give, and it compounds against you on every new project.",
      ]],
    ],
  },

  'currency-conversion': {
    sections: [
      ['Mid-market is the honest baseline', [
        'The mid-market rate is the midpoint between buy and sell prices on the wholesale market — the number you see on a search result. No bank or card gives you that rate, but it is the only fair yardstick for comparing what each provider actually charges.',
        'Quote every option as a percentage away from mid-market. A provider offering "zero commission" and a rate 2.5% off mid-market is charging 2.5%, whatever the label says.',
      ]],
      ['Spread, fee and markup are three different costs', [
        'The spread is the gap between the rate you are offered and mid-market. The fee is the explicit charge. The markup is a hidden adjustment baked into the rate. A cheap-looking fee often sits on top of a wide spread.',
        'Add all three before comparing. For a transfer, the only number that matters is how much lands in the recipient\'s account after every charge, which is why the total-cost comparison beats any fee table.',
      ]],
      ['Cash, card and transfer behave differently', [
        'A card usually gives a good rate plus a foreign-transaction fee of 1-3%, and it settles at the rate on the day the transaction clears, not the day you spent it. Cash at a bureau has a visible spread and no fee, which is often worse for small amounts and better for nothing.',
        'Bank transfers carry a fixed fee that dominates small amounts. Below a few hundred units, the fixed fee is the whole story; above a few thousand, the spread is.',
      ]],
      ['Timing and rounding', [
        'Rates move continuously, so any conversion is a snapshot. For a recurring payment, a difference of 2% in the rate is worth more than most fee negotiations, and nobody can predict it reliably — which argues for consistency rather than timing.',
        'Rounding rules also vary: some providers round the rate to four decimals, some round the final amount. On large sums that difference is visible, so compare the final credited amount rather than the quoted rate.',
        "Keep the receipt for each transfer. If the credited amount differs from the estimate, the receipt shows whether the gap came from the rate, from a correspondent-bank fee, or from a charge applied by the receiving bank.",
      ]],
    ],
  },

  'paint-coverage': {
    sections: [
      ['Measure wall area, then subtract openings', [
        'Perimeter times ceiling height gives gross wall area. Subtract doors (about 1.8 m² each) and windows (about 1.5 m²), then add the ceiling separately if it is being painted. Measure each room and sum, because a single average wall height across a house drifts badly with high-ceilinged rooms.',
        'Sloped ceilings, stairwells and gables are the usual source of a 10-15% underestimate. For those, measure the actual shapes rather than applying a rule of thumb — a staircase wall can be twice the area its footprint suggests.',
      ]],
      ['Two coats is the standard, primer is separate', [
        'Coverage figures on a can describe one coat on a smooth, sealed surface. A colour change, a porous wall or a repairs-heavy wall needs primer plus two finish coats, which is roughly three times the paint a single-coat estimate implies.',
        'Deep colours and strong reds often need a tinted primer and three coats. Budget for that before choosing the colour, not after the first coat looks patchy.',
      ]],
      ['Coverage varies with surface and application', [
        'Smooth sealed plaster can reach 12-14 m² per litre; textured, porous or previously unpainted surfaces can fall to 8-10. Roller versus spray, and how much the painter loads the roller, changes the number by another 10%.',
        'Use the manufacturer\'s coverage for the specific product, then subtract 10% as a working margin. Buying one extra can is cheaper than a second trip mid-job and a visible batch difference on the last wall.',
      ]],
      ['Buy in the right can size', [
        'Paint is usually cheaper per litre in larger cans, but only if you will use it. Leftover paint stores for years if the lid is sealed and the can is kept from freezing, which makes a larger can sensible for a whole-house job and wasteful for one wall.',
        'Keep the batch code and a small amount of each colour for touch-ups. Colour matching a year later is approximate at best, and a labelled jar from the original batch is the only reliable repair.',
      ]],
    ],
  },
  'tip': {
    sections: [
      ['Tip on the subtotal or on the total?', [
        `US tipping convention applies the percentage to the pre-tax subtotal, because the tip rewards service rather than the tax authority. Applying it after tax adds a few percent of tax to the tip: harmless in practice, but it is not what the norms describe, and on a large table it is a visible difference.`,
        `Outside the US the whole question is different. In much of Europe a service charge is already inside the menu price and an extra tip is optional rounding; in many parts of Asia and the Gulf, tipping is discretionary and sometimes not expected at all. Applying US percentages everywhere overpays in some countries and under-reads local custom in others.`,
      ]],
      ['Service charge, cover charge and the bill you actually get', [
        `A service charge on the bill is usually distributed to staff, so tipping on top of it means paying twice for the same service. Check whether the line says service charge or discretionary service charge: the first is normally pooled, the second can be removed on request.`,
        `Card terminals often present tip percentages calculated on the post-tax total, sometimes starting at 25%. Nothing forces you to accept the suggested number, but it is worth knowing that the default is set by the terminal, not by the restaurant.`,
      ]],
      ['Splitting a bill fairly', [
        `Equal splits are fast and usually fine among friends with similar orders. They stop being fair when one person had a starter, two drinks and a dessert while another had a main and water: the difference can easily be a third of the bill.`,
        `The workable compromise is to split the shared items evenly and each person's own items individually, then apply the tip and tax proportionally to what each person ordered. That is arithmetic nobody wants to do at the table, which is exactly what a bill-splitting calculator is for.`,
      ]],
      ['Tipping when something went wrong', [
        `A bad kitchen and a bad server are different problems. Slow food that the server warned you about is not a service failure; being ignored for forty minutes is. Tipping communicates service, so a reduced tip with a quiet explanation reaches the right person, while stiffing the server over the kitchen reaches the wrong one.`,
        `If the bill itself is wrong, fix the bill first. Percentages calculated on a disputed total compound the error, and a corrected invoice is a much easier conversation than a corrected tip.`,
      ]],
    ],
  },

  'profit-margin': {
    sections: [
      ['Margin and markup are not the same percentage', [
        `Margin divides profit by the selling price; markup divides it by the cost. A 20% margin is a 25% markup, and a 50% markup is a 33% margin. The gap widens as the numbers grow, which is why a business that prices from cost and reports from revenue can look profitable on paper and run out of cash.`,
        `The rule that prevents the confusion: to hit a target margin, divide cost by (1 minus the margin), not multiply cost by (1 plus the margin). A 30% margin on a 70 cost is 100, while a 30% markup gives 91 and quietly loses nine points of margin on every sale.`,
      ]],
      ['Gross margin hides the costs that sink businesses', [
        `Gross margin counts only the direct cost of the goods or hours sold. Rent, salaries, software, marketing and payment fees sit below it. A product at 60% gross margin can still lose money if the fixed base is large relative to volume.`,
        `That is why break-even belongs next to margin: margin says how much each sale contributes, break-even says how many sales are needed to cover the fixed base. Either number alone leaves half the picture out.`,
      ]],
      ['Discounts cost more margin than they look', [
        `A 10% discount on a 30% margin product removes a third of the profit, not a tenth. The reason is that margin is calculated on the reduced price while cost is unchanged, so the percentage of profit falls faster than the percentage of price.`,
        `Before discounting, compute the margin after the discount and the volume increase needed to hold profit. Most discounts do not generate that volume, which is why promotional pricing needs a target rather than a habit.`,
      ]],
      ['Taxes, returns and payment fees', [
        `Margin is normally calculated before tax on profit, but sales tax, card fees and returns all reduce what actually arrives. Card fees of 2-3% come straight off the top; a return costs the shipping twice and the payment fee usually stays with you.`,
        `Include them when comparing channels. A marketplace that charges 15% commission can still beat your own store if your store loses 5% to fees, 3% to returns and a fixed cost to acquisition.`,
      ]],
    ],
  },

  'grade-needed': {
    sections: [
      ['Work backwards from the weighted total', [
        `Most courses compute a final grade as a weighted sum, so the question is not what score the last exam needs, but what weighted contribution is still missing. Convert the target grade into points, subtract what is already locked in, and divide by the weight of what remains.`,
        `If the remaining weight is small, the answer can exceed 100 and the target is arithmetically impossible. That is useful information before the exam rather than after it, because it shifts the plan to the courses where the gap can still be closed.`,
      ]],
      ['What counts as already locked in', [
        `Only completed work with a released grade is locked. An assignment submitted but unmarked, a participation mark awarded at the end, or a dropped lowest quiz all change the denominator, and every one of them is a common source of a wrong answer.`,
        `Ask for the syllabus weighting rather than assuming equal weights. A course where the final is 40% behaves completely differently from one where it is 15%, and students routinely plan for the wrong one.`,
      ]],
      ['Rounding, curving and grade boundaries', [
        `Institutions round differently: some round the final percentage, some round each component, some apply a curve after rounding. A student sitting at 89.4 can pass or fail a 90 boundary depending on which rule the registrar uses.`,
        `Treat the calculator's output as a target with a margin, not a precise threshold. Aim a point above the boundary you need, then confirm the rounding rule with the instructor.`,
      ]],
      ['What-if planning', [
        `Run the calculation at three outcomes for the remaining work — a realistic score, a good day and a bad day. The spread tells you whether the course is already decided or genuinely still open, which is more useful than a single number.`,
        `If even the bad-day case clears the target, spend the revision time elsewhere. If the good-day case barely clears it, that course is where the next week goes.`,
      ]],
    ],
  },

  'inflation': {
    sections: [
      ['The index is an average, not your basket', [
        `A consumer price index tracks a weighted basket that represents an average household. Your basket is different: rent, school fees, fuel, medical costs and imported electronics carry weights that may be far higher or lower than the national average.`,
        `That is why personal inflation can run several points above or below the headline figure for years. If most of your spending is rent and food in a market where both rose faster than the index, the official number understates what happened to you.`,
      ]],
      ['Nominal, real and the difference that matters', [
        `A salary rise of 6% against 8% inflation is a pay cut in real terms. Nominal figures describe the number on the payslip; real figures describe what it buys. Comparing one to the other is how people conclude they are better off while their savings rate falls.`,
        `The same applies to investment returns. A 10% return in a year of 9% inflation is roughly a 1% real gain before tax, which is why long-run planning should use real returns rather than headline ones.`,
      ]],
      ['Compounding works against you over decades', [
        `At 6% inflation, prices roughly double in twelve years and quadruple in twenty-four. A retirement target expressed in today's money has to be inflated to the year you will spend it, not compared directly with a corpus built in nominal terms.`,
        `This is the single most common retirement planning error: a corpus that looks large today is measured against today's prices while being spent at tomorrow's.`,
      ]],
      ['Deflation and disinflation are not the same', [
        `Disinflation is a slower rate of increase, not a fall in prices. Headlines that say inflation fell from 8% to 5% still mean prices rose 5%. Deflation, an actual fall in the price level, is rarer and brings its own problems: deferred spending, debt that grows in real terms.`,
        `Read the direction and the level separately. A falling rate is better than a rising one, but it is not the same as prices returning to where they were.`,
      ]],
    ],
  },

  'sip': {
    sections: [
      ['Monthly investing versus a lump sum', [
        `A systematic plan invests a fixed amount on a schedule, so it buys more units when prices are low and fewer when they are high. That averaging reduces the risk of investing everything at a peak, at the cost of holding cash that could have been invested earlier.`,
        `With a lump sum available, investing it immediately has historically beaten spreading it out in most markets, because markets rise more often than they fall. Regular investing wins on behaviour, not on arithmetic: it works because people keep doing it.`,
      ]],
      ['Step-up contributions matter more than fund choice', [
        `Raising the contribution by 10% a year, in line with income, changes the final corpus far more than a one-point difference in expense ratio over a normal career. The reason is that later contributions are invested for less time, so early increases compound the longest.`,
        `Fees still matter, just second. A one-point annual fee on a thirty-year plan removes roughly a fifth of the final value, which is worth checking once and then ignoring.`,
      ]],
      ['The return you quote is not the return you get', [
        `Fund factsheets show point-to-point or annualised returns for a period that has already ended. Your own return depends on when each instalment went in, which is why an XIRR calculated from your actual cash flows is the honest number.`,
        `A plan that started before a crash can show a low trailing return while the money invested after the crash did very well. Judging the strategy on the headline number alone misreads both.`,
      ]],
      ['Inflation and the target corpus', [
        `A corpus built at 12% nominal over twenty years looks impressive until it is deflated at 6%. Planning in real terms keeps the target honest: decide the monthly income you want in today's money, then solve for the corpus that produces it.`,
        `Also decide what happens at the end of the accumulation period. A plan with no withdrawal rule is a savings habit, not a retirement plan.`,
      ]],
    ],
  },

  'gst-sales-tax': {
    sections: [
      ['Inclusive and exclusive prices', [
        `A price quoted exclusive of tax needs the rate added; a price quoted inclusive already contains it, so the tax is the price multiplied by rate divided by one plus rate, not simply the rate. Mixing the two conventions on one invoice is the most common arithmetic error in small-business bookkeeping.`,
        `If a customer is quoted 100 inclusive at 18%, the tax is 15.25 and the net is 84.75. Applying 18% to 100 would overstate the tax by nearly three points and understate the net.`,
      ]],
      ['Input credit changes the real cost', [
        `A registered business usually reclaims the tax it paid on purchases against the tax it collects on sales. For them, the tax is a cash-flow item rather than a cost. An unregistered consumer cannot reclaim anything, so the same rate is a real cost.`,
        `That asymmetry explains why business-to-business pricing often quotes exclusive of tax while retail pricing must show the inclusive amount. It is also why comparing quotes from registered and unregistered suppliers needs care.`,
      ]],
      ['Multiple rates and mixed baskets', [
        `Where a jurisdiction applies different rates by category, a single basket can contain several. The right method is to apply each rate to its own line and sum the tax, not to average the rates across the basket.`,
        `Bundled goods and services are the hard case: a package that includes a standard-rated item and an exempt one may need to be split on the invoice, depending on local rules. When in doubt, show the lines separately.`,
      ]],
      ['Rounding and invoice totals', [
        `Tax is usually rounded at the invoice level or per line, and the two can differ by a small amount on a long invoice. Pick the method your accounting system uses and stay consistent, because a mismatch between the invoice and the return is an audit question even when the amount is trivial.`,
        `Keep the rate, the taxable base and the tax amount visible on every invoice. A total alone cannot be reconciled later, and reconstruction is where the errors appear.`,
      ]],
    ],
  },
  'math-statistics': {
    sections: [
      ['Mean, median and mode answer different questions', [
        `The mean adds every value and divides by the count, so a single extreme value pulls it. The median is the middle value and does not care how extreme the outlier is. The mode is the most frequent value, useful for categories rather than measurements.`,
        `Income is the classic example: average income sits well above the typical income because a small number of very large incomes drag the mean up. When a headline says average, ask which one was computed.`,
      ]],
      ['Standard deviation versus standard error', [
        `Standard deviation describes how spread out the individual observations are. Standard error describes how uncertain the estimated mean is, and it shrinks as the sample grows. Reporting one as the other makes results look far more precise than they are.`,
        `The rough rule: about two thirds of a normal distribution lies within one standard deviation of the mean, and about 95% within two. That is a description of the data, not a confidence claim about the mean.`,
      ]],
      ['Sample and population are not interchangeable', [
        `Population variance divides by n; sample variance divides by n minus one, because a sample mean is itself estimated and sits closer to its own data than the true mean would. With large samples the difference is negligible; with ten observations it is not.`,
        `Most calculators let you choose. Choose based on what you have: all the values that exist, or a sample drawn from a larger group.`,
        `Always report the sample size with the result. A mean of 12 with a standard error of 4 and a mean of 12 with a standard error of 0.5 are very different claims, and the mean on its own cannot tell the two apart.`,
      ]],
    ],
  },

  'electricity-bill': {
    sections: [
      ['Units, slabs and the marginal rate', [
        `A unit is one kilowatt-hour: a 1,000-watt appliance running for one hour. Slab tariffs charge a different rate per unit depending on how much you use, so the bill is a sum of bands rather than units multiplied by one price.`,
        `That structure makes the rate you pay for the last unit higher than your average rate. Adding a large appliance changes the last band, which is why the extra cost is often bigger than a simple per-unit estimate predicts.`,
      ]],
      ['Fixed charges and taxes', [
        `Most bills include a fixed monthly charge, a meter charge and a duty or tax on the total. These do not scale with usage, so a low-usage month still carries a floor, and they explain why halving consumption rarely halves the bill.`,
        `Read the bill structure once and write down the fixed portion. It is the number to compare when deciding whether a small solar install or a tariff change is worth it.`,
      ]],
      ['Estimating an appliance honestly', [
        `Watts times hours gives watt-hours, then divide by 1,000 for units. The catch is that nameplate watts are a maximum: an air conditioner on inverter control, a fridge cycling on and off, or a laptop idling all draw less than the label.`,
        `For anything with a duty cycle, use a plug-in energy meter for a week rather than the label. For small electronics, the label is close enough and the numbers are too small to matter.`,
        `Standby load is the other hidden line: routers, televisions and chargers left plugged in can add 5-15 units a month across a household. Small per device, paid every month, and removable with a switched extension.`,
      ]],
    ],
  },

  'everyday': {
    sections: [
      ['What this category is for', [
        `These calculators handle the arithmetic that comes up weekly rather than once a year: splitting a bill, converting a recipe, working out a discount, checking a unit price. The maths is simple, which is exactly why an error is easy to make and hard to notice.`,
        `The guides exist because the formula is rarely the hard part. Deciding which base to divide by, whether tax is already included, and which unit the answer should be in is where most mistakes happen.`,
      ]],
      ['The units trap', [
        `Everyday calculations mix units constantly: millilitres and cups, grams and ounces, kilometres and miles, per-hour and per-month. Converting after the calculation is not the same as converting the inputs first, especially where a rate is involved.`,
        `Pick one unit system before you start and convert every input into it. A recipe scaled in cups but baked in millilitres will be wrong even if each individual conversion was correct.`,
      ]],
      ['Rounding at the right step', [
        `Round only at the end. Rounding a unit price to two decimals before multiplying by a large quantity can shift the total by more than the rounding itself, and the error grows with quantity.`,
        `For money, keep the exact value through the calculation and round the final amount to the currency's smallest unit. For cooking, one decimal place is usually more precision than the measuring tools provide.`,
        `Watch the currency as well. Some currencies round to whole units at the moment of payment, so a calculated 1,249.6 becomes 1,250 whether or not the underlying arithmetic was right.`,
      ]],
    ],
  },

  'discount': {
    sections: [
      ['Stacked discounts multiply, they do not add', [
        `Two successive 20% discounts are not 40% off. The second discount applies to the already-reduced price, so the total reduction is 36%. Three 20% discounts give 48.8%. The gap grows with every additional layer.`,
        `Retailers sometimes present the sum of the percentages because it sounds larger. The honest comparison is the final price, and that is the number to calculate before deciding.`,
      ]],
      ['Discount, markup and margin run in different directions', [
        `A 25% discount can be undone by a 33% markup, not a 25% one, because the two percentages are taken on different bases. Confusing them is how a sale price gets set below cost while looking reasonable on a spreadsheet.`,
        `If you know the cost and the target margin, price from the margin formula rather than adding a discount-reversal percentage. The arithmetic is short and the error is expensive.`,
      ]],
      ['Tax, coupons and the order of operations', [
        `Whether tax is applied before or after a discount changes the amount, and jurisdictions differ. A coupon that reduces the taxable base lowers the tax too; a coupon applied after tax does not.`,
        `Check the order on the receipt before disputing a total. The discrepancy is usually sequencing rather than an overcharge, and knowing which one it is tells you who to ask.`,
        `Returns complicate it further. Refunding a discounted item at its original price is a common dispute, and the outcome depends on the store's written policy rather than on the arithmetic. Keep the receipt that shows the price actually paid.`,
      ]],
    ],
  },

  'ohms-law': {
    sections: [
      ['The three forms you actually use', [
        `Voltage equals current times resistance, current equals voltage divided by resistance, and power equals voltage times current. Every other form is algebra on those three. Writing them down before substituting numbers prevents the most common mistake, which is dividing by the wrong quantity.`,
        `Power also appears as current squared times resistance and as voltage squared divided by resistance. Those two are handy when the value you know is current or voltage rather than both.`,
      ]],
      ['Series and parallel change the rules', [
        `In series, resistances add and the same current flows through each element, so voltage divides across them. In parallel, voltage is common and the currents add, so the equivalent resistance is smaller than the smallest branch.`,
        `Two equal resistors in parallel give half the resistance, not double. That single fact explains most incorrect answers about household wiring and loudspeaker loads.`,
      ]],
      ['Real components are not ideal', [
        `A resistor has a tolerance, a wire has resistance per metre, and a supply has internal resistance that drops voltage under load. At low currents these are noise; at high currents they decide whether the circuit works.`,
        `Heat matters too: resistance rises with temperature in most conductors, so a component that measures correctly cold can behave differently when it is running.`,
        `Wire gauge is the practical version of this. A cable rated for a current at one length may overheat at another, because resistance rises with length and heating rises with the square of the current.`,
      ]],
    ],
  },

  'fd-ppf-sip': {
    sections: [
      ['Three products, three different contracts', [
        `A fixed deposit locks a lump sum for a term at a stated rate. A public provident fund is a long-horizon, government-backed account with annual contribution limits and a lock-in. A systematic investment plan buys market-linked units monthly. The comparison is not which return is highest, but which contract matches the money's job.`,
        `Money needed in two years does not belong in a market-linked plan regardless of expected return, because the horizon cannot absorb a drawdown. Money not needed for fifteen years is poorly served by a product that barely beats inflation.`,
      ]],
      ['Tax treatment changes the ranking', [
        `Interest on deposits is usually taxed as income each year, while some long-term accounts are exempt and market-linked gains are taxed at their own rates with their own holding periods. A pre-tax comparison can therefore reverse once tax is applied.`,
        `Compare post-tax returns at your own marginal rate. The difference between two products is often smaller than the difference between two taxpayers.`,
      ]],
      ['Liquidity is a feature with a price', [
        `A deposit can usually be broken with a penalty; a provident fund allows partial withdrawal only under rules; market-linked units can be sold but may carry exit loads and capital-gains consequences.`,
        `Price that flexibility before choosing. An emergency fund parked in a locked product is not an emergency fund, and breaking the lock at the wrong moment can cost more than the extra return.`,
      ]],
    ],
  },

  'macro-calculator': {
    sections: [
      ['Calories set the size, macros set the composition', [
        `A macro split divides a calorie target into protein, carbohydrate and fat. It cannot fix a calorie target that is wrong for your goal: 40/30/30 of too many calories still gains fat, and the same split of too few still loses muscle.`,
        `Set protein from body weight first (roughly 1.6-2.2 g/kg for active people), then fat as a minimum (about 0.6-1 g/kg for hormones and absorption), and give the remainder to carbohydrate. That order keeps the essential parts covered.`,
      ]],
      ['Grams versus percentages', [
        `Percentages look tidy but scale badly: the same 30% protein is a different gram amount for a 1,600 and a 3,200 calorie plan. People with very different body sizes should not share a percentage split.`,
        `Fix protein in grams, then express the rest as percentages for convenience. The plan becomes both comparable and portable.`,
      ]],
      ['Adherence beats the perfect ratio', [
        `A split you can hold for months outperforms an optimal one you abandon in three weeks. That usually means fewer rules and more repeatable meals rather than precise percentages.`,
        `Track for a week to see what your current intake actually looks like before changing anything. Most people are surprised by fat or by liquid calories, not by protein.`,
        `Prepping two or three repeatable meals removes most of the daily decision-making. A plan built around food you actually cook is more likely to survive a busy week than an ideal split built around recipes you never make.`,
      ]],
    ],
  },

  'ideal-weight': {
    sections: [
      ['Formulas describe populations, not people', [
        `Ideal-weight formulas were built from insurance and military data to describe average healthy weights for heights. They were never designed to tell an individual what to weigh, and they disagree with each other by several kilograms for the same height.`,
        `Treat the output as a reference band. Body composition, frame size, age and training history all sit outside the formula, and none of them are wrong for being outside it.`,
      ]],
      ['BMI and ideal weight measure different things', [
        `BMI relates weight to height squared and says nothing about muscle or fat distribution. Ideal-weight formulas usually add a frame adjustment. Someone with substantial muscle can be over an ideal-weight figure and metabolically healthy; someone with low muscle can be inside it and not.`,
        `Waist measurement and body-fat percentage add information that height-and-weight numbers cannot. Use them together rather than choosing the easiest one.`,
      ]],
      ['Targets for real goals', [
        `For health outcomes, a 5-10% reduction from current weight already improves blood pressure and glucose control in most people with excess weight. Aiming directly at a formula number skips the part with the best evidence.`,
        `For performance, the target is a body composition and a rate of change, not a scale weight. Losing more than about 1% of body weight a week usually costs muscle.`,
      ]],
    ],
  },

  'sleep-cycles': {
    sections: [
      ['Cycles are about 90 minutes, roughly', [
        `Sleep runs in cycles of roughly 70-110 minutes, moving through light sleep, deep sleep and REM. Waking at the end of a cycle usually feels better than waking in the middle of deep sleep, which is the whole basis of cycle-based bedtime suggestions.`,
        `The length varies by person and by night, so a calculator gives a starting point rather than a schedule. If you consistently wake groggy at a calculated time, shift the bedtime by 15 minutes rather than abandoning sleep tracking.`,
      ]],
      ['Sleep debt is not repaid one for one', [
        `An hour lost does not require exactly an hour recovered, and weekend catch-up sleep does not fully erase a week of restriction. Cognitive performance and glucose handling stay measurably worse after several short nights even when subjective tiredness fades.`,
        `The practical target is consistency: a fixed wake time, including weekends, does more for sleep quality than optimising the exact number of cycles.`,
      ]],
      ['The inputs that actually move sleep', [
        `Light in the morning, darkness in the evening, caffeine cut-off roughly eight hours before bed, and a cool room matter more than most apps suggest. Alcohol shortens the time to fall asleep and then fragments the second half of the night.`,
        `A bedtime calculator can tell you when to be in bed. It cannot compensate for a 4 pm espresso, and no schedule survives an inconsistent wake time.`,
      ]],
    ],
  },

  'water-intake': {
    sections: [
      ['Where the eight-glasses figure comes from', [
        `The eight-glasses rule is a rough population heuristic, not a physiological target. Fluid needs vary with body mass, activity, climate and diet, and roughly a fifth of daily fluid normally comes from food.`,
        `The widely used reference intakes are around 2.7 litres a day for women and 3.7 for men in temperate conditions, including fluid from food and other drinks. That is a total, not an instruction to drink that much water.`,
      ]],
      ['Thirst, urine colour and exercise', [
        `Thirst is a reliable signal for healthy adults at rest, though it lags during hard exercise and in heat. Pale straw-coloured urine is a reasonable practical check; completely clear urine usually means you are drinking more than you need.`,
        `For exercise, add roughly 400-800 ml per hour of moderate activity, more in heat, and include electrolytes when sessions run past an hour or sweating is heavy.`,
      ]],
      ['When more water is not better', [
        `Drinking far beyond need can dilute blood sodium, which is dangerous and has caused deaths in endurance events and water-drinking contests. The condition is rare but the direction of the risk matters: more is not automatically safer.`,
        `People with heart, kidney or liver conditions are commonly given fluid restrictions, and a generic calculator is the wrong tool for them.`,
      ]],
    ],
  },
  'age': {
    sections: [
      ['Age maths looks trivial until the boundaries', [
        `An age calculator subtracts dates, and the part that goes wrong is the month and day comparison: someone born on 31 March is 30 years and 0 days old on 31 March, not 29 years and 12 months. Handle the month-end cases and the answer stops surprising you.`,
        `Leap years matter for exact day counts, not for years. A person born on 29 February has a birthday question every non-leap year, and different systems answer it differently: some count 1 March, some 28 February.`,
      ]],
      ['Legal and administrative ages', [
        `Most legal thresholds are defined on the birthday, not on the day before, and some jurisdictions use local time while others use the date of registration. For documents, the date on the certificate is the one that counts, whatever the calculation says.`,
        `School admission cut-offs are a separate rule again and often use a fixed date rather than the birthday itself. Check the rule you are subject to rather than the general formula.`,
      ]],
      ['Days, weeks and the calendar you count in', [
        `Day counts between two dates differ depending on whether the first day is included and whether weekends count. Contracts usually state their convention explicitly for exactly this reason.`,
        `For anything financial or legal, use the convention written in the document. For curiosity, the difference of one day rarely matters, but for an eligibility window it can decide the outcome.`,
      ]],
    ],
  },

  'bmr': {
    sections: [
      ['BMR is a resting measurement', [
        `Basal metabolic rate is the energy needed at complete rest to keep organs running. Predictive equations estimate it from weight, height, age and sex, and they carry an error of roughly 10% against measured values in an individual.`,
        `That error is why the first two weeks of any calorie plan are a test rather than a prescription. Use the estimate as a starting point, then adjust based on what the scale and your energy levels actually do.`,
      ]],
      ['Activity multipliers are the weak link', [
        `Total daily energy is BMR times an activity factor. The factor is a coarse category, and people routinely choose one that is too high: an office job with three gym sessions is not the same as a job on your feet all day.`,
        `If your weight is stable, you already know your maintenance calories empirically. That number beats any multiplier, and it is easy to estimate from two weeks of intake and weight change.`,
      ]],
      ['Muscle, age and the direction of drift', [
        `BMR falls with age partly because muscle mass falls, and it rises with muscle mass independently of exercise during the measurement. Resistance training changes body composition and, over years, the resting burn.`,
        `Crash dieting lowers it too, through lost muscle and adaptive thermogenesis. That is why the same calorie intake stops producing loss after a long deficit, and why a diet break or a slower rate is often the better move.`,
      ]],
    ],
  },

  'food': {
    sections: [
      ['What this category covers', [
        `These calculators handle portion maths, recipe scaling, nutrition per serving and food-cost comparisons. The formulas are simple; the difficulty is in units, serving sizes and whether a label describes the food as sold or as eaten.`,
        `Because the inputs are small numbers, a mistake of one unit silently doubles the answer. Reading the label carefully is a larger part of the work than the arithmetic.`,
      ]],
      ['Raw, cooked and drained', [
        `Rice roughly triples in weight when cooked, pasta doubles, and meat loses about a quarter of its weight to moisture. A nutrition table built on raw weight cannot be applied to a cooked portion without adjusting for that water.`,
        `Canned goods add another state: drained weight is not the same as the label weight. For anything sold in brine or syrup, use the drained figure the label provides.`,
      ]],
      ['Serving size versus portion size', [
        `A label serving is an administrative unit chosen by the manufacturer, and it is frequently smaller than what people eat. Two servings in a bottle is common and easy to miss.`,
        `Multiply by the number of servings you actually ate, not by the number in the package. That single step fixes most of the discrepancy between tracked intake and observed results.`,
      ]],
    ],
  },

  'auto': {
    sections: [
      ['What this category covers', [
        `Fuel cost, mileage, trip cost, EV comparisons, tyre and lease maths. These tools all depend on one number people guess badly: the real consumption of their own vehicle, measured over several tanks rather than read from a brochure.`,
        `Use the calculator for a decision, not for precision. A range of plausible inputs, run three times, tells you more than one run with an optimistic mileage.`,
      ]],
      ['The costs that sit outside the tank', [
        `Fuel is only part of running a car. Depreciation, insurance, servicing, tyres, parking and tolls are all per-kilometre costs that a fuel calculator deliberately excludes, and on a new car depreciation usually exceeds fuel.`,
        `If the question is whether to drive or take a train, fuel and tolls are the right comparison. If the question is whether to own a car, the full ownership total is the only honest one.`,
      ]],
      ['Units and regional differences', [
        `Mileage is quoted in miles per gallon in some markets and litres per 100 km in others, and the two move in opposite directions: higher mpg is better, lower litres per 100 km is better. Mixing them silently inverts the conclusion.`,
        `Fuel prices and gallon sizes also differ: a US gallon is about 3.785 litres and an imperial gallon about 4.546. When comparing figures from different countries, convert the unit before comparing the value.`,
      ]],
    ],
  },

  'debt-ratio': {
    sections: [
      ['What the ratio measures', [
        `A debt-to-income ratio divides total monthly debt payments by gross monthly income. Lenders use it as one signal of repayment capacity, usually alongside credit history, employment stability and the size of the down payment.`,
        `Because it uses gross income, two people with the same ratio can have very different amounts left after tax, rent and living costs. A comfortable ratio on paper can still be a tight month in practice.`,
      ]],
      ['Which debts belong in the numerator', [
        `Recurring obligations count: mortgage or rent payments, loan instalments, credit-card minimums, car finance, student loans. Utility bills and groceries usually do not, though some lenders include them in affordability assessments.`,
        `Using minimum payments understates the burden for someone paying off a card aggressively. If you pay more than the minimum, calculate the ratio with the amount you actually pay as well as the minimum, and see how far apart they are.`,
      ]],
      ['Lowering the ratio before applying', [
        `The fastest lever is usually eliminating a small instalment outright rather than reducing a large one slightly: closing a card balance removes its minimum payment from the numerator entirely.`,
        `The second lever is income documentation. Overtime and bonuses count differently across lenders, so a ratio computed on base salary alone is the conservative version and the one worth planning against.`,
      ]],
    ],
  },

  'family': {
    sections: [
      ['What this category covers', [
        `Child costs, baby budgets, school-fee planning, family budgeting and time-and-cost trade-offs. The numbers are estimates by definition, because the largest variables are childcare arrangements and local prices rather than any formula.`,
        `Use the tools to build a range: a low case where a relative provides childcare, and a high case with full-time paid care. The gap between those two is usually the biggest number on the page.`,
      ]],
      ['The costs that arrive in year one', [
        `Recurring costs get planned; one-off costs get forgotten. A cot, a pram, a car seat, feeding equipment, clothing that fits for three months, and medical bills that insurance may not fully cover all land in the first year.`,
        `Add a contingency for the first six months specifically. It is the period with the least sleep and the least patience for financial admin, and the period when unplanned purchases are most likely.`,
      ]],
      ['Planning beyond the first year', [
        `Childcare usually peaks in the pre-school years and then falls, while school fees and activities rise later. A cost that stays flat across eighteen years is almost certainly wrong; model it in phases.`,
        `Education costs inflate faster than general prices in many markets, so a future-fee estimate should use an education-specific inflation rate rather than the headline index.`,
      ]],
    ],
  },

  'homegarden': {
    sections: [
      ['What this category covers', [
        `Paint, flooring, tiles, grout, lawn seed, soil and fertiliser quantities. These are area-and-volume calculations, where the common failure is measuring one surface and multiplying by a rule of thumb instead of measuring each surface.`,
        `They are also the tools most likely to be used while standing in a shop, so the output needs a buying recommendation in whole units rather than a decimal quantity.`,
      ]],
      ['Waste allowance is not padding', [
        `Cuts, breakages, pattern matching and offcuts mean flooring and tiles need 5-10% extra, and diagonal or herringbone layouts need 10-15%. Buying exactly the measured area guarantees a second order and often a different batch.`,
        `Paint is different: a spare litre is useful for touch-ups, but five spare litres are wasted money. Buy whole cans against the computed coverage, not against the wall area.`,
      ]],
      ['Coverage figures are best-case', [
        `A coverage rate printed on a can or bag assumes an ideal substrate: smooth, sealed, dry and applied at the stated thickness. Rough concrete, fresh plaster and porous brick all absorb more.`,
        `For a first coat on a new surface, plan on 20-30% more material than the rated coverage. For a second coat on the same surface, the rated figure is usually closer to reality.`,
      ]],
    ],
  },

  'tax-salary': {
    sections: [
      ['Gross, taxable and take-home are three numbers', [
        `Gross salary is the headline. Taxable income is gross minus the allowances and deductions the jurisdiction permits. Take-home is taxable income after tax, plus any non-taxable components. Confusing any two of them produces a wrong answer that looks plausible.`,
        `Employer contributions to retirement or insurance are often outside gross salary but have value, so a comparison of two offers on gross alone can miss a real difference.`,
      ]],
      ['Slabs, surcharges and marginal rates', [
        `Progressive systems tax bands of income at increasing rates, so your marginal rate applies only to the last band. A raise that crosses a threshold is never a pay cut in absolute terms, though it can reduce the net gain sharply.`,
        `Surcharges on high incomes and phase-outs of allowances can push the effective marginal rate above the headline top rate. Those are the cases where a calculator beats a rule of thumb.`,
      ]],
      ['Deductions are worth more at a higher rate', [
        `A deduction reduces taxable income, so its value equals the amount times your marginal rate. The same charitable donation saves twice as much tax for someone in a 30% band as for someone in a 15% band.`,
        `A credit reduces tax directly and is worth the same to everyone. Mixing the two when comparing options is a common planning mistake.`,
      ]],
    ],
  },

  'lifestyle': {
    sections: [
      ['What this category covers', [
        `Time, habits, subscriptions, screen time, sleep and everyday trade-offs that have a number behind them. The calculators exist to make a vague intention measurable, not to prescribe behaviour.`,
        `Treat the first result as a baseline. The useful comparison is your number against your own number next month, not against an ideal published somewhere.`,
      ]],
      ['Measure before optimising', [
        `Most lifestyle changes fail because they start with the change rather than the measurement. A week of honest tracking usually reveals that the suspected problem is not the expensive one, or that a small recurring cost outweighs a dramatic one-off.`,
        `Track the thing you can actually influence. Hours of sleep are measurable; sleep quality is reported. Both matter, but only one gives you a number to move.`,
      ]],
      ['Subscriptions and recurring costs', [
        `Recurring charges are the easiest to accumulate and the hardest to notice, because each individual amount is small and the payment is automatic. Listing them once a quarter and cancelling the unused ones is a reliable saving.`,
        `Annual plans are cheaper per month but only if you keep using the service for the year. The break-even is usually a few months, which is shorter than most people assume.`,
      ]],
    ],
  },

  'net-worth': {
    sections: [
      ['Assets minus liabilities, at one moment', [
        `Net worth is a snapshot: everything you own that has a resale or account value, minus everything you owe. It is not a measure of income or of financial health on its own, and it can fall while your income rises.`,
        `Count assets at what they would realistically fetch, not at what you paid. A car is worth its resale value, not its purchase price, and a house should be counted net of selling costs if you would have to sell to realise it.`,
      ]],
      ['What to include and what to leave out', [
        `Include bank balances, investments at market value, retirement accounts, property at a conservative estimate, and vehicles. Exclude personal possessions with no resale market, and exclude income you have not received.`,
        `On the liability side, include mortgage principal, loan balances, credit-card balances and any tax owed. A mortgage is a liability even when the house is an appreciating asset; netting them is what the calculation does.`,
      ]],
      ['Trend beats the number', [
        `A single net-worth figure says little without context. Measured every quarter, it shows whether the direction is up and whether the growth comes from saving or from asset prices, which are very different kinds of progress.`,
        `Liquid net worth, excluding property and retirement accounts, is the version that answers whether you could handle a job loss. Keep both numbers; they answer different questions.`,
      ]],
    ],
  },
  'utilities': {
    sections: [
      ['What this category covers', [
        `Electricity, gas and water bills, plus appliance running costs and tariff comparisons. The arithmetic is simple, but the tariff structure rarely is: slabs, fixed charges, duties and time-of-use rates all change what a unit actually costs.`,
        `Read one real bill before using any calculator in this category. The fixed portion and the tax lines explain most of the gap between an estimate and what arrives in the post.`,
      ]],
      ['Slabs make the last unit the expensive one', [
        `In a slab tariff, each band has its own rate, so the bill is the sum of bands rather than units times one price. The rate on your final unit can be several times the rate on your first.`,
        `That is why adding a large appliance often costs more than a per-unit estimate suggests, and why reducing usage in a high band saves more per unit than reducing it in a low one.`,
      ]],
      ['Appliance estimates and duty cycles', [
        `Watts times hours is the formula, but nameplate watts are a maximum. A fridge cycles, an inverter air conditioner modulates, and a laptop idles well below its charger rating.`,
        `For anything that runs for hours, measure it for a week with a plug-in meter. For a phone charger or a router, the label is close enough and the total is too small to justify the effort.`,
      ]],
    ],
  },

  'career': {
    sections: [
      ['What this category covers', [
        `Salary versus hourly comparison, take-home pay, freelance rates, notice periods, leave and the cost of a commute. These tools answer questions that are usually decided on a feeling, which is why the numbers are worth having.`,
        `Compare like with like: gross with gross, take-home with take-home, and hours actually worked with hours actually worked. Most career calculations go wrong at that first step.`,
      ]],
      ['Total compensation, not base salary', [
        `A pension contribution, health cover, a training budget, paid leave and a flexible arrangement all have a cash value. Two offers that differ by 10% in base can reverse once those are priced.`,
        `Price them at what replacing them would cost you, not at what they cost the employer. That is the number that matters if you are choosing between the two.`,
      ]],
      ['The hours behind the number', [
        `A salaried role with 50-hour weeks pays less per hour than the same salary with 40-hour weeks. Unpaid overtime and a long commute are the two largest hidden deductions from an effective hourly rate.`,
        `Calculate the effective rate before comparing roles, and calculate it on a normal week rather than on a busy one. The normal week is what you will actually live.`,
      ]],
    ],
  },

  'body-fat': {
    sections: [
      ['Every field method has an error band', [
        `Skinfold calipers, bioelectrical impedance scales and tape-based formulas all estimate body fat indirectly, and each carries an error of several percentage points against a DEXA scan. The absolute number is less reliable than the trend.`,
        `Measure under the same conditions each time: same time of day, same hydration, same device or caliper site. A change of three points measured consistently means more than an absolute value measured once.`,
      ]],
      ['Athletes break the formulas', [
        `Formulas built on general populations tend to overestimate body fat in muscular people and underestimate it in people with low muscle mass, because they infer composition from weight, height and a circumference.`,
        `If you train seriously, compare your result against athletic ranges rather than general ones, and treat a single measurement as one data point in a series.`,
      ]],
      ['What the number is good for', [
        `Body fat percentage is useful for tracking change over months and for setting realistic composition goals. It is not a health diagnosis, and it does not capture fat distribution, which is what actually drives metabolic risk.`,
        `Waist circumference and waist-to-height ratio are cruder but better validated for health risk. Use them alongside body fat rather than instead of it.`,
      ]],
    ],
  },

  'engineering': {
    sections: [
      ['What this category covers', [
        `Beam loading, torque, power, pressure, flow, gear ratios and electrical relationships. These are design aids, not substitutes for a code check: every real structure or machine has safety factors, material limits and local regulations behind it.`,
        `Use the calculator to size a first estimate, then verify against the governing standard. A number from a web tool is a starting point, not a certification.`,
      ]],
      ['Units are the first failure mode', [
        `Engineering formulas assume consistent units: newtons and metres, or kilonewtons and millimetres, but rarely a mixture. Mixing them produces an answer that is wrong by a factor of a thousand and looks entirely plausible.`,
        `Convert every input before substituting, and write the unit next to the result. If the unit does not make sense, the number does not either.`,
      ]],
      ['Safety factors are not padding', [
        `A safety factor covers uncertainty in loads, material properties, workmanship and consequences of failure. It is chosen by code or by a qualified engineer, and reducing it to save material is how structures fail.`,
        `The same applies to electrical and thermal work: the margin is part of the design, not an inefficiency to be optimised away.`,
      ]],
    ],
  },

  'credit-card-minimum': {
    sections: [
      ['The minimum payment is designed to be slow', [
        `Minimum payments are usually a small percentage of the balance, often 1-3%, sometimes with a floor amount. As the balance falls, the minimum falls with it, so the repayment curve flattens and the term stretches.`,
        `That is why a balance can take a decade or more to clear at the minimum while the interest keeps compounding. The minimum is a contractual requirement, not a repayment plan.`,
      ]],
      ['Interest is charged on the daily balance', [
        `Most cards charge interest from the transaction date on purchases once you carry a balance, not from the statement date. The annual rate divided by 365 is applied to each day's balance, which is why paying earlier in the cycle saves more than paying later.`,
        `New purchases usually lose their interest-free period while a balance is carried. That detail is the reason a card used for both borrowing and everyday spending becomes expensive quickly.`,
      ]],
      ['A workable order of repayment', [
        `Highest rate first minimises total interest; smallest balance first maximises the number of closed accounts. Both work, and the better one is the one you will finish.`,
        `Then stop adding. A fixed payment with new spending on the same card usually produces a flat balance, which feels like failure even when the maths is working.`,
      ]],
    ],
  },

  'heart-rate-zones': {
    sections: [
      ['The age formula is a population average', [
        `The 220 minus age estimate of maximum heart rate has a standard deviation of roughly 10-12 beats per minute. For a 40-year-old, the plausible maximum spans something like 160 to 200, which moves every zone derived from it.`,
        `A measured maximum from a field test or a lab is far better if you train seriously. The formula is a placeholder, and zones built on it inherit its error.`,
      ]],
      ['Zones as percentages of maximum', [
        `Common bands run from 50-60% for recovery, 60-70% for aerobic base, 70-80% for tempo and 80-90%+ for threshold and VO2 work. The boundaries are conventions, not sharp physiological switches.`,
        `Heart rate also drifts upward during a long effort at constant pace, from heat and dehydration. Judging effort by pace or power as well as heart rate prevents chasing a number that is moving for reasons unrelated to intensity.`,
      ]],
      ['Medication and individual variation', [
        `Beta blockers and some other medications lower heart rate directly, which makes any age-based zone wrong. So does a naturally high or low resting rate.`,
        `Use perceived effort as a cross-check, and treat chest pain, unusual breathlessness or dizziness as a reason to stop rather than a zone to push through.`,
      ]],
    ],
  },

  'construction': {
    sections: [
      ['What this category covers', [
        `Concrete volume, brick and block counts, plaster and mortar quantities, steel weight and area take-offs. The formulas are simple; the estimates go wrong on waste, openings and the difference between nominal and actual material sizes.`,
        `Order from a measured take-off plus a stated allowance, and keep the allowance explicit so the next job can reuse the number.`,
      ]],
      ['Nominal sizes are not actual sizes', [
        `A 4x2 timber is not 4 inches by 2 inches, a nominal brick includes the mortar joint, and a 50 kg bag of cement yields a fixed volume of concrete only at a stated mix. Working from the nominal figure without checking the actual one is the most common source of over-ordering.`,
        `Check the supplier's actual dimensions for the batch you are buying. Regional standards differ, and a specification copied from another country can be wrong on the first delivery.`,
      ]],
      ['Waste, access and sequence', [
        `Concrete is ordered in whole truckloads and cannot be stored, so an underestimate means a cold joint and an overestimate means paid-for waste. Small pours usually justify a 5-10% allowance.`,
        `For blocks and tiles, waste depends on the pattern and on how many cuts the layout needs. A simple running bond wastes far less than a diagonal or feature layout.`,
      ]],
    ],
  },

  'business': {
    sections: [
      ['What this category covers', [
        `Break-even, margin, markup, pricing, runway, invoice factoring and unit economics. These are the numbers a small business needs weekly, and the ones most often calculated once and never updated.`,
        `Pick the cadence first: margin per sale, break-even per month, runway per quarter. A number with no review rhythm stops being a decision tool.`,
      ]],
      ['Fixed and variable costs behave differently', [
        `A variable cost moves with each sale and belongs in the contribution margin. A fixed cost is paid whether or not you sell anything, and belongs in the break-even denominator. Putting rent into the per-unit cost makes every unit look unprofitable at low volume.`,
        `Some costs are step-fixed: they jump at a threshold, such as a second employee or a larger warehouse. Model them as steps rather than as smooth growth.`,
      ]],
      ['Cash is not profit', [
        `Profit is recognised when work is done; cash arrives when the customer pays. A profitable month on 60-day terms can still miss payroll, which is why a cash-flow forecast sits beside the profit calculation.`,
        `Runway is the more useful number for a young business: months of cash at the current burn. It converts a vague worry into a deadline you can plan against.`,
      ]],
    ],
  },

  'science': {
    sections: [
      ['What this category covers', [
        `Physics and chemistry calculations: motion, energy, concentration, molarity, gas laws and half-life. The formulas are exact; the answers depend entirely on consistent units and on whether the model applies to the situation.`,
        `Use them for coursework and for quick estimates, and check the assumptions in the guide before trusting a number in a real system.`,
      ]],
      ['Significant figures and rounding', [
        `A result cannot be more precise than its inputs. Reporting 4.7382 from inputs given to two significant figures is a claim about measurement precision that the data does not support.`,
        `Carry full precision through the calculation and round only the final answer, to the precision of the least precise input. That is the convention most exam boards and journals expect.`,
      ]],
      ['When the model stops applying', [
        `Ideal gas behaviour fails at high pressure and low temperature. Simple projectile motion ignores drag, which matters beyond short ranges. Half-life assumes first-order kinetics, which not every reaction follows.`,
        `Knowing the boundary of a model is part of using it. An answer outside the model is not wrong arithmetic; it is the wrong tool.`,
      ]],
    ],
  },

  'retirement': {
    sections: [
      ['The corpus is a function of three numbers', [
        `How much you save, how long it compounds, and what return it earns. Of the three, the saving rate is the one you control and the one that moves the result most in the early years; returns dominate later, when the balance is large.`,
        `A useful sanity check is the safe withdrawal rate: a corpus of roughly 25 times your annual spending supports a long retirement at about 4% a year, before fees and taxes.`,
      ]],
      ['Inflation turns a big number into a small one', [
        `A retirement corpus is spent over decades, so it has to be expressed in the prices of the years it will be spent. At 6% inflation, a monthly need of 100 today becomes about 320 in twenty years.`,
        `Do the planning in today's money with a real return, or in future money with a nominal return. Mixing the two is the error that makes a plan look comfortable when it is not.`,
      ]],
      ['Sequencing risk and the order of returns', [
        `Two portfolios with identical average returns can produce very different retirements depending on whether the bad years arrive early. Withdrawing from a falling portfolio locks in losses that later gains cannot recover.`,
        `That is the argument for a cash buffer of one to three years of spending at the start of retirement, so withdrawals do not force sales during a drawdown.`,
      ]],
    ],
  },
  'regional': {
    sections: [
      ['Local units are not conversions of metric units', [
        `A marla, a kanal, a bigha, a maund and a tola are traditional units whose exact size varies by region and sometimes by district. Unlike a mile, they have no single international definition, so a figure copied from another city can be wrong by a double-digit percentage.`,
        `Check the local standard before converting. Where a calculator offers a regional unit, it states the definition it used; where it does not, treat the answer as approximate.`,
      ]],
      ['Large-number names differ by system', [
        `Lakh and crore are 100,000 and 10,000,000 in the South Asian system, while million and billion follow the short scale used in most English-speaking countries. A figure of 1.2 billion is 120 crore, not 12 crore.`,
        `When sending a number across systems, write the digits as well as the word. That single habit prevents most of the expensive misunderstandings in cross-border contracts.`,
      ]],
      ['Local tax and payroll rules change the answer', [
        `Take-home pay, sales tax and property charges are set locally and change with each budget. A calculator that does not name the tax year is giving you a historical answer.`,
        `Use the guide's stated assumptions as a checklist, then confirm the current rates with the authority. The structure of the calculation travels; the rates do not.`,
      ]],
    ],
  },

  'health-fitness': {
    sections: [
      ['What this category covers', [
        `BMI, body fat, BMR, calorie needs, protein targets, heart-rate zones and hydration. The formulas are well known; what they share is a wide margin of individual error, because they infer a whole body from a few measurements.`,
        `Use them to establish a starting point and to track direction. A single reading is a data point, not a verdict.`,
      ]],
      ['Screening tools versus diagnostic tools', [
        `BMI was designed to describe populations, not to diagnose individuals. It misses muscle mass, fat distribution and ethnicity-specific risk thresholds, all of which change the interpretation.`,
        `If a number on this site worries you, the next step is a measurement with a clinician, not a stricter calculation. These tools organise information; they do not replace assessment.`,
      ]],
      ['Consistency beats precision', [
        `Weigh yourself at the same time of day, under the same conditions, and look at the weekly average. Day-to-day changes are mostly water and food, and reacting to them produces decisions that make no sense over a month.`,
        `The same applies to body fat and heart rate: repeatable conditions matter more than the absolute accuracy of the method.`,
      ]],
    ],
  },

  'npv-vs-irr': {
    sections: [
      ['The two measures can disagree, and NPV wins', [
        `NPV discounts every cash flow at your required rate and reports the value added in money. IRR reports the rate at which NPV would be zero. When a project has unconventional cash flows, the IRR can be multiple or nonexistent, while NPV stays well defined.`,
        `For choosing between projects, NPV is the decision rule: a positive NPV at the hurdle rate means the project beats the alternative use of the capital. IRR is a communication tool, useful because it is a percentage.`,
      ]],
      ['The reinvestment assumption', [
        `IRR implicitly assumes interim cash flows are reinvested at the IRR itself, which is optimistic for a project returning 30%. NPV assumes reinvestment at the discount rate, which is the more defensible assumption.`,
        `The gap matters most for long projects with large early cash flows. Modified IRR addresses it by assuming reinvestment at the cost of capital, at the price of one more assumption to explain.`,
      ]],
      ['Scale and timing', [
        `A small project can show a high IRR and add less value than a larger project with a lower one. Comparing percentages across different sizes hides the difference in absolute money, which is what actually compounds.`,
        `Use IRR to rank projects of similar scale, and NPV to decide how much capital to commit.`,
      ]],
    ],
  },

  'cagr': {
    sections: [
      ['CAGR is a smoothing device, not a return you earned', [
        `Compound annual growth rate converts a start value and an end value into the constant yearly rate that would connect them. It says nothing about the path: two investments with the same CAGR can have completely different volatility.`,
        `That is why a fund advertising a 12% CAGR may have spent two of those years down 30%. The number is truthful and incomplete at the same time.`,
      ]],
      ['Start and end points decide the answer', [
        `CAGR is extremely sensitive to the endpoints. Choosing a start date just before a crash or an end date just after a rally changes the result by several points without any change in the underlying business.`,
        `Compare CAGR over identical periods, and look at rolling returns if you want to know how reliable a fund's growth has been.`,
      ]],
      ['CAGR versus XIRR', [
        `CAGR assumes a single lump sum invested at the start. A monthly investment plan has many cash flows, so the correct measure is XIRR, which accounts for the timing of each contribution.`,
        `Using CAGR for a systematic plan usually overstates or understates the return depending on whether the market rose or fell during the contribution period.`,
      ]],
    ],
  },

  'debt-payoff': {
    sections: [
      ['Avalanche versus snowball', [
        `The avalanche method pays the highest interest rate first and minimises total interest. The snowball method pays the smallest balance first and maximises momentum. The arithmetic favours avalanche; the psychology often favours snowball.`,
        `Both require the same thing: a fixed total payment every month, with the minimum on everything and the surplus concentrated on one debt. Without that constraint neither method works.`,
      ]],
      ['Interest accrues daily', [
        `Most revolving credit charges interest on the average daily balance, so a payment made on day 3 saves more than the same payment on day 25. The monthly statement hides this by summarising a single figure.`,
        `Paying twice a month, or simply paying as soon as income arrives, reduces the balance that interest is charged on without changing the amount paid.`,
      ]],
      ['Consolidation only helps if the rate falls', [
        `Rolling several balances into one loan lowers the monthly payment, which is not the same as lowering the cost. A longer term at a slightly lower rate can increase total interest.`,
        `Compare total interest paid under both arrangements, not the monthly figure. And check whether the consolidation loan is secured: turning unsecured debt into secured debt puts an asset at risk.`,
      ]],
    ],
  },

  'zakat': {
    sections: [
      ['What is counted, and what is not', [
        `Zakat is due on wealth that has been held for one lunar year above the nisab threshold: cash, bank balances, gold and silver, business inventory, and investments held for trade. A primary residence, personal vehicle and household furnishings are not zakatable.`,
        `Debts you owe that are due now reduce the base. Debts owed to you are included if you expect to recover them. The details vary between schools of jurisprudence, so confirm the treatment of anything unusual.`,
      ]],
      ['The nisab and the lunar year', [
        `The nisab is the value of 87.48 grams of gold or 612.36 grams of silver, and most scholars recommend using the silver threshold because it is lower and includes more people in the obligation.`,
        `The hawl is one lunar year, about 354 days, not a solar year. Fixing a date in the Islamic calendar each year avoids the drift that comes from using a Gregorian anniversary.`,
      ]],
      ['The rate and the timing', [
        `The rate is 2.5% of the net zakatable wealth, or one fortieth. It is calculated on the wealth at the end of the hawl, not on income during the year.`,
        `Many people pay in Ramadan for convenience, which is permitted, but the amount still reflects the wealth at the due date. Choosing a date and keeping a simple annual record makes the calculation repeatable.`,
      ]],
    ],
  },

  'loans-mortgages': {
    sections: [
      ['What this category covers', [
        `EMI, amortisation, affordability, refinancing, prepayment and rent-versus-buy. They all rest on one structure: a payment that covers interest first and principal second, with the interest share falling over time.`,
        `Understanding that schedule explains why early prepayment saves so much and why a small rate change moves the total by more than expected.`,
      ]],
      ['The rate is not the only cost', [
        `Processing fees, insurance, valuation charges, stamp duty and prepayment penalties all sit outside the quoted rate. An annual percentage rate is meant to include them; a headline rate is not.`,
        `Compare the APR and the total cost over the term, not the monthly payment. A longer term lowers the payment and raises the total, which is the trade the lender is selling.`,
      ]],
      ['Fixed, floating and the risk you carry', [
        `A fixed rate transfers interest-rate risk to the lender and prices that transfer in. A floating rate is cheaper at the start and exposes you to repricing, which matters most when the loan is large relative to income.`,
        `Affordability should be tested at the highest plausible rate, not the current one. A payment that only works at today's rate is a plan with a single point of failure.`,
      ]],
    ],
  },

  'passwords': {
    sections: [
      ['Length beats complexity', [
        `A password's strength comes from the number of guesses an attacker needs, and every added character multiplies that number. A long passphrase of ordinary words usually beats a short string of symbols that has to be written down.`,
        `Entropy estimates assume random selection. Human-chosen substitutions, like replacing o with zero, are already in every cracking dictionary and add far less than the formula suggests.`,
      ]],
      ['Reuse is the real risk', [
        `A single breach exposes every account that shares the password, and credential-stuffing attacks test leaked pairs automatically. Unique passwords per account matter more than any individual password's complexity.`,
        `A password manager makes unique passwords practical. The master password then becomes the one credential worth memorising carefully, and it should never be used anywhere else.`,
      ]],
      ['Two-factor and breach checks', [
        `A second factor defeats most credential-stuffing attacks regardless of password strength. An authenticator app or a hardware key is stronger than SMS, which can be intercepted or SIM-swapped.`,
        `Check your email against a breach notification service occasionally, and change any password that appears in one. Rotating every password on a schedule is less useful than reacting to actual exposure.`,
      ]],
    ],
  },

  'rent-vs-buy': {
    sections: [
      ['The comparison is a horizon problem', [
        `Buying front-loads costs — down payment, fees, stamp duty — and builds equity slowly. Renting costs less upfront and invests nothing. The break-even horizon is where the accumulated equity overtakes the invested difference, and it is usually measured in years, not months.`,
        `If you might move within three years, transaction costs alone often decide the answer. Model your realistic horizon, not the one you hope for.`,
      ]],
      ['The costs people leave out of owning', [
        `Maintenance of roughly 1% of property value a year, property tax, insurance, service charges and the opportunity cost of the down payment all belong on the owning side. Renters carry none of them directly.`,
        `On the renting side, include rent inflation and the fact that rent is paid with after-tax money, exactly like a mortgage payment.`,
      ]],
      ['Leverage and risk', [
        `A mortgage is leverage: a 10% rise in property value on a 20% down payment is a 50% return on equity, and a 10% fall is a 50% loss. That asymmetry is the reason buying can be excellent or ruinous depending on timing.`,
        `Renting is not throwing money away, and buying is not automatically an investment. The right answer depends on horizon, mobility and how much of your net worth the down payment represents.`,
      ]],
    ],
  },

  'unit-conversion': {
    sections: [
      ['Exact definitions and approximate factors', [
        `Some conversions are exact by definition: an inch is 25.4 millimetres, a pound is 0.45359237 kilograms. Others depend on the substance: a cup of flour and a cup of water do not weigh the same, and a US cup is not a metric cup.`,
        `Use exact factors for length, mass and volume of liquids. Use a density table for anything dry and bulky, or weigh it.`,
      ]],
      ['Temperature is not a simple multiplication', [
        `Celsius and Fahrenheit have different zero points as well as different step sizes, so converting requires an offset: F equals C times 9/5 plus 32. Applying a multiplier alone is the most common conversion error there is.`,
        `Kelvin shares the Celsius step size but starts at absolute zero, so it needs an offset of 273.15 and no multiplication.`,
      ]],
      ['Rounding after converting', [
        `Convert first, round second. Rounding an input and then converting compounds two errors, and it is easy to spot in a recipe or a specification where the tolerance is tight.`,
        `Carry more digits than you need through the calculation, then round the final value to the precision the original measurement supported.`,
      ]],
    ],
  },

  'salary': {
    sections: [
      ['Gross, net and the gap between them', [
        `The gap between gross salary and take-home is made of income tax, social insurance, retirement contributions and any employer-specific deductions. The size of that gap varies enormously between jurisdictions and between income levels.`,
        `Compare offers on net where you will actually live and work. A higher gross in a higher-tax location can leave less in your account, and the difference is often larger than the salary gap that prompted the comparison.`,
      ]],
      ['Allowances and benefits have different tax treatment', [
        `Housing, transport and meal allowances are taxed differently across jurisdictions, and some are exempt up to a limit. A package with a large allowance can be worth more than the headline figure suggests, or less if it is fully taxable.`,
        `Ask for the breakdown in writing before comparing. The structure of a package is part of its value, not a detail to settle after accepting.`,
      ]],
      ['Overtime, bonus and variable pay', [
        `Bonuses are often taxed at a higher withholding rate and reconciled later, which makes the first payslip after a bonus look punitive. Overtime rules depend on employment status and local law, not on the contract's wording alone.`,
        `Plan on base salary and treat variable pay as upside. A budget that requires the bonus to work is a budget with no margin.`,
      ]],
    ],
  },

  'gpa': {
    sections: [
      ['Credit hours make it a weighted average', [
        `A GPA is the sum of grade points times credit hours, divided by total credit hours. A four-credit course therefore moves the average twice as much as a two-credit course, which is why a single heavy course can dominate a semester.`,
        `Calculating with equal weights is the most common GPA error, and it usually flatters a semester with one bad heavy course and penalises one with a good heavy course.`,
      ]],
      ['Scales are not interchangeable', [
        `A 4.0 scale, a 10-point scale and a percentage are different representations, and conversion tables are approximate at best. Employers and universities usually recalculate from transcripts rather than trusting a converted figure.`,
        `Report the scale alongside the number. A 3.6 out of 4.0 and a 3.6 out of 5.0 are very different results that look identical without the denominator.`,
      ]],
      ['Retakes, withdrawals and pass-fail', [
        `Institutions differ on whether a repeated course replaces the old grade, averages with it, or keeps both on the transcript. A withdrawal may or may not affect the GPA while still affecting academic standing.`,
        `Read the policy before planning a retake. Replacing a failing grade can lift a GPA substantially; averaging it may barely move it.`,
      ]],
    ],
  },
  // ---- added: the 14 guides that previously shipped without authored depth.
  // These are also the pages Search Console shows impressions for, so the
  // sections target the misreadings those queries actually hit.
  'bmi': {
    sections: [
      ['BMI screens populations, not people', [
        'BMI is weight divided by height squared, and its cut-offs come from population mortality curves, not from an individual risk test. That is why a muscular athlete lands in "overweight" while an older adult with little muscle can read "normal" while carrying a high body-fat percentage.',
        'Read it as the first question, not the answer: it tells you whether height and weight are proportionate, and nothing about where the weight sits or what it is made of.',
      ]],
      ['The cut-offs are not the same everywhere', [
        'The World Health Organization puts overweight at 25 and obesity at 30. Many Asian-Pacific guidelines use 23 and 27.5, because cardiometabolic risk rises at a lower BMI in South and East Asian populations. The same body can be labelled differently by two clinics using two published tables.',
        'If you are comparing your number to a chart, check which table the chart uses. A 24 is "normal" on one and "overweight" on the other, and neither is wrong for its own population.',
      ]],
      ['Pair it with a waist measurement', [
        'Waist circumference catches the risk BMI misses: fat around the organs behaves differently from fat under the skin. Waist-to-height ratio is the simplest version of that check — keep your waist under about half your height.',
        'A trend over months is more useful than any single reading. Weight fluctuates one to two kilograms a day with food, salt and hydration, so compare weekly averages rather than individual mornings.',
      ]],
    ],
  },
  'emi': {
    sections: [
      ['Why the payment never changes', [
        'The EMI formula solves for a constant payment that clears both interest and principal over n months: payment = principal × r ÷ (1 − (1 + r)^−n), where r is the monthly rate. Because the payment is fixed, the interest share falls and the principal share rises every month without any input from you.',
        'That is also why the total interest is not simply principal × rate × years. Interest is charged on the declining balance, so the true cost sits lower than the naive multiplication, and the difference grows with the term.',
      ]],
      ['The quoted rate is not the cost of borrowing', [
        'An 8.5% annual rate divided by twelve is 0.708% a month, which compounds to about 8.84% a year — the effective rate. Fees push it further: a processing fee deducted from disbursal means you receive less than the principal the EMI is calculated on, and the effective cost rises accordingly.',
        'When two lenders quote the same rate, compare the annual percentage rate and the fee schedule, not the headline number. A 0.25% rate difference over twenty years is worth more than most fee waivers.',
      ]],
      ['Prepayment is worth most early', [
        'Every extra payment goes straight against principal, which removes all future interest that principal would have earned. In year two of a twenty-year loan that is a large amount; in year eighteen it is a few months of interest.',
        'Whether the lender allows it without charge is a separate question — some markets and loan types apply prepayment penalties, and floating-rate home loans are often treated differently from fixed personal loans.',
      ]],
    ],
  },
  'mortgage': {
    sections: [
      ['Principal and interest is not the monthly cost', [
        'The payment this calculator returns covers principal and interest only. A real monthly outgo usually adds property tax, homeowners insurance, and — below a down-payment threshold — mortgage insurance, plus any association fee. Those extras can add 20-40% to the number on the screen.',
        'Budget against the full figure. A payment that fits your income before escrow can fail to fit after it, and escrow amounts change every year as assessments and insurance premiums move.',
      ]],
      ['Fixed and adjustable carry different risks', [
        'A fixed rate locks the interest for the whole term, so the risk is opportunity cost if rates fall. An adjustable rate starts lower and resets on a schedule, so the risk is the payment itself — and the reset usually arrives whether or not your income has kept up.',
        'If you take an adjustable product, model the payment at the capped rate, not the teaser rate. The affordability question is whether you can carry the worst case for a few years, not the first year.',
      ]],
      ['The term changes cost far more than the rate', [
        'Going from a 20-year to a 30-year term cuts the payment by roughly a fifth and raises total interest by well over half. Shortening the term does the reverse and raises the monthly obligation, which is where most affordability problems actually start.',
        'A middle path is a longer term with deliberate extra principal payments. It keeps the required payment low while recovering much of the interest saving — provided the extra payments actually happen.',
      ]],
    ],
  },
  'percentage': {
    sections: [
      ['Percent changes multiply, they do not add', [
        'A 10% rise followed by a 10% fall leaves you 1% below where you started, because the second change applies to the larger base. That single fact explains most of the disagreements people have about "getting back to even" after a loss.',
        'To recover a 20% loss you need a 25% gain, not 20%: the required gain is loss ÷ (1 − loss). The deeper the drawdown, the more asymmetric the recovery becomes.',
      ]],
      ['Percentage points are not percent', [
        'A rate moving from 5% to 7% has risen 2 percentage points, which is a 40% increase in the rate itself. Both statements are true and they answer different questions — which is why headlines about "a 40% rise in rates" and "a 2-point rise" describe the same event.',
        'Use points when the quantity is itself a percentage (interest rates, tax rates, unemployment). Use percent when the quantity is a count, a price or a size.',
      ]],
      ['Stacked discounts apply in sequence', [
        'Twenty percent off and then a further ten percent off is 28% off, not 30%: the second discount applies to the already-reduced price. The formula is 1 − (1 − a)(1 − b).',
        'The same logic works in reverse for tax. To strip a tax out of a gross figure, divide by 1 + the rate instead of subtracting the rate from the total — 120 gross at 20% is 100 net, not 96.',
      ]],
    ],
  },
  'compound-interest': {
    sections: [
      ['Frequency changes the effective rate', [
        'A nominal 6% compounded monthly is not 6% a year: (1 + 0.06/12)^12 − 1 gives 6.17%. Daily compounding gives 6.18%, and continuous compounding tops out at e^0.06 − 1, or 6.18% as well — the gains shrink quickly after monthly.',
        'That is why regulators require an annual equivalent figure. Compare products on the effective annual rate, otherwise a monthly-compounded headline beats a quarterly one on presentation alone.',
      ]],
      ['The rule of 72 is a sanity check', [
        'Dividing 72 by the annual return gives the years to double: 8% doubles in about nine years. It is accurate to within a few percent for returns between roughly 4% and 12%, and it fails badly outside that band.',
        'Use it to check a calculator rather than replace one. If a tool says a 6% investment doubles in eight years, either the rate or the compounding assumption is wrong.',
      ]],
      ['Nominal growth is not purchasing power', [
        'A 7% return with 3% inflation grows real wealth at about 3.9% a year, not 4% — the exact figure is (1.07 ÷ 1.03) − 1. Over thirty years that small difference is worth several percent of the final balance.',
        'Model inflation explicitly when the goal is a future purchase. A retirement number computed in today money and a number computed in future money can differ by more than the contribution itself.',
      ]],
    ],
  },
  'break-even': {
    sections: [
      ['Contribution margin is the number that matters', [
        'Break-even units are fixed costs divided by the contribution margin — price minus variable cost per unit. A product priced at 40 with 25 of variable cost contributes 15, so 6,000 of fixed cost needs 400 units.',
        'Dividing fixed costs by revenue instead is the classic error: it ignores the cost of making each unit and produces a break-even that is always too optimistic.',
      ]],
      ['Fixed costs are only fixed inside a range', [
        'Rent, salaries and software are fixed within a capacity band. Add enough volume and you need another shift, another machine or another warehouse, and the fixed line steps up. Break-even computed at one capacity level does not hold at the next.',
        'Re-run the calculation at the volume you actually expect, not the volume you hope for. The step where fixed costs jump is often closer than it looks.',
      ]],
      ['Margin of safety tells you how much room there is', [
        'Margin of safety is (actual sales − break-even sales) ÷ actual sales. Ten percent means a one-tenth drop in revenue wipes out profit; forty percent means the business can absorb a bad quarter.',
        'Track it as a trend. A shrinking margin of safety is an early signal that variable costs or discounts are eating the contribution, long before the profit line turns negative.',
      ]],
    ],
  },
  'business-days': {
    sections: [
      ['Holidays are local, weekends are not universal', [
        'The working week is Monday to Friday in most of Europe and the Americas, Sunday to Thursday in parts of the Gulf, and Saturday to Thursday in Israel. A count that assumes a five-day week is wrong for a large share of the world.',
        'Public holidays are worse: they are set per country and often per state, and some move with lunar calendars. No general-purpose counter can know your jurisdiction, so treat any result near a holiday cluster as provisional.',
      ]],
      ['Counting conventions change the answer by a day', [
        'Does the start date count as day zero or day one? Does a deadline that lands on a weekend move forward to Monday or back to Friday? Contracts answer these questions explicitly because the difference is a day — and sometimes a penalty.',
        'This calculator moves weekend hits forward to the next business day, which matches the common "following business day" convention. If your contract says "preceding" or "modified following", the date shifts.',
      ]],
      ['Where business-day counts actually get used', [
        'Settlement cycles, notice periods, payment terms, shipping windows and visa processing all run on business days rather than calendar days. A 30-business-day term is roughly six calendar weeks, not one month.',
        'Half-days and bank holidays that close only part of the market are the usual source of disputes. If money movement depends on the date, confirm the calendar with the counterparty rather than relying on a generic counter.',
      ]],
    ],
  },
  'calories': {
    sections: [
      ['An estimate is a hypothesis, not a prescription', [
        'Predictive equations carry roughly a 10% error against measured expenditure, which is several hundred calories a day. Two people with identical inputs can differ by more than the deficit they are trying to create.',
        'That is why the plan needs a test: eat the estimate for two to three weeks, weigh daily, and compare weekly averages. If weight is flat, the estimate is your maintenance, whatever the formula said.',
      ]],
      ['Pick a rate you can hold', [
        'Roughly 7,700 kcal is stored in a kilogram of body fat, so a 500 kcal daily deficit predicts about 0.45 kg a week on paper. Real loss runs faster at first — glycogen and water leave with the first week of restriction — and slower later as the body gets smaller.',
        'Half a percent to one percent of bodyweight per week is the range most people can sustain without losing muscle or abandoning the plan. Faster deficits mostly test willpower, and willpower has a budget.',
      ]],
      ['The body adapts, and labels are approximate', [
        'A smaller body burns less at rest, and there is an additional adaptive component: measured expenditure often falls further than the weight change alone predicts. The same intake that produced loss in month one can produce a plateau in month four.',
        'Logged intake is also usually under-reported, and packaged portions are allowed a margin of error on the label. If the scale disagrees with the arithmetic for three weeks, trust the scale and adjust the target.',
      ]],
    ],
  },
  'concrete': {
    sections: [
      ['Order by volume, then convert carefully', [
        'Ready-mix is sold by cubic metres or cubic yards, bags by weight. An 80 lb bag yields about 0.6 cubic feet, a 50 lb bag about 0.375 — the yields differ enough that mixing up the two sizes is a common way to come up short mid-pour.',
        'Calculate the geometric volume first, then add waste. Five to ten percent covers spillage, uneven subgrade and the little that stays in the mixer; a slab on a rough base needs the upper end.',
      ]],
      ['Thickness is the biggest lever on volume', [
        'Volume scales linearly with slab thickness, so a 4-inch slab and a 5-inch slab of the same footprint differ by 25%. A patio that looks close in size can be a full truck load apart depending on the thickness specification.',
        'Footings and pads need their own cross-section. A trapezoidal footing uses the average of the two parallel widths times depth times length, not the top width alone.',
      ]],
      ['Short loads are the expensive mistake', [
        'Running out mid-pour means a cold joint and a second delivery, both of which cost more than the surplus you would have thrown away. For anything structural, order slightly over and have a place to dump the remainder.',
        'Reinforcement, formwork and labour are separate line items and often exceed the concrete itself. The calculator tells you the material volume, not the project cost.',
      ]],
    ],
  },
  'gear-ratio': {
    sections: [
      ['The ratio is a trade, not a free gain', [
        'Gear ratio is driven teeth divided by drive teeth. A higher ratio multiplies torque at the wheel and lowers speed for the same engine rpm; a lower ratio does the opposite. Energy is conserved, so the extra pull is paid for in revolutions.',
        'Output rpm is input rpm divided by the ratio, and torque is input torque multiplied by it, minus losses. That is why a low first gear feels strong and why top gear feels weak at low speed.',
      ]],
      ['Tyres and wheels change the real gearing', [
        'The final drive ratio is only half of it: a larger rolling radius lowers the effective ratio, so bigger tyres make the vehicle longer-legged and slower to accelerate. A tyre size change can undo a sprocket change entirely.',
        'Road speed follows from engine rpm, overall ratio and rolling circumference. If you are chasing a specific cruise rpm, calculate all three together rather than changing one and testing.',
      ]],
      ['Where the ratio matters most', [
        'Off-road and towing use low ratios for control at low speed; highway economy uses tall ratios to keep rpm down. Racing sits in between and is decided by where the engine makes power, not by a single optimum number.',
        'Peak torque and peak power occur at different rpm, so the useful question is what the ratio does across the rev range you actually use. A ratio that is perfect at peak power can be unpleasant everywhere else.',
      ]],
    ],
  },
  'income-tax': {
    sections: [
      ['Marginal rates apply to slices, not the whole income', [
        'Progressive brackets tax each slice of income at its own rate. Moving into a higher bracket raises the rate on the income above the threshold, not on everything below it, so a raise never reduces take-home pay.',
        'The average rate is total tax divided by total income, and it is always lower than the marginal rate. Confusing the two is the most common reason people overestimate what a raise is worth.',
      ]],
      ['Deductions and credits are not the same thing', [
        'A deduction reduces taxable income, so its value is the deduction times your marginal rate. A credit reduces the tax itself, so its value is the full amount. A 1,000 credit is worth more than a 1,000 deduction unless your marginal rate is 100%.',
        'That difference explains why some reliefs are refundable and others are not, and why the order in which they apply can change the answer.',
      ]],
      ['Withholding is an estimate, and rules are local', [
        'Employers withhold against an assumed annual income, so bonuses, second jobs and mid-year changes routinely produce a refund or a bill. The calculation here estimates the liability, not the amount your employer will deduct.',
        'Brackets, surcharges, local levies and social contributions differ by country and often by region. Use the rates that apply to your own jurisdiction; a result computed on another country\u2019s brackets is a demonstration, not advice.',
      ]],
    ],
  },
  'baby-cost': {
    sections: [
      ['Split the budget into one-off and recurring', [
        'The setup costs — cot, pram, car seat, clothes, feeding equipment — arrive in a burst before birth and then stop. The recurring costs — nappies, formula or food, childcare, healthcare — are smaller per month but compound for years.',
        'Keep them in separate columns. A budget that mixes them looks alarming in month one and understates the years that follow.',
      ]],
      ['Childcare usually dominates the total', [
        'In most cities, full-time childcare for one child costs more per year than everything else in the list combined. It is also the line most sensitive to a decision: one parent reducing hours, grandparents helping, or a nursery versus a childminder changes the total more than any purchase.',
        'Price it before the birth, in your own area, with the hours you actually expect to work. Averages from another country are not a plan.',
      ]],
      ['Later children cost less, then more again', [
        'A second child reuses equipment and clothes, so the one-off column shrinks sharply. Childcare often does not: two places cost nearly twice one, though some providers discount siblings.',
        'Costs also step up at school age with activities, transport and meals, and again at secondary level. Model the first five years in detail and the rest as a band rather than a single number.',
      ]],
    ],
  },
  'random-numbers': {
    sections: [
      ['Not every random number is safe to use', [
        'A general-purpose generator such as Math.random is fine for a raffle or a dice roll and unsuitable for passwords, tokens or anything an attacker can profit from guessing. Cryptographic generators are slower precisely because they resist prediction.',
        'The distinction is predictability, not appearance. A sequence can look random to a human and be fully determined by a seed an attacker can recover.',
      ]],
      ['Watch the range mapping', [
        'Taking a raw random integer modulo a range introduces bias whenever the range does not divide the generator space evenly — the low values come up slightly more often. Rejection sampling avoids it.',
        'The bias is tiny for a game and meaningful for a lottery-sized draw. If the fairness of the draw matters, use a generator that handles the mapping for you.',
      ]],
      ['Seeds, reproducibility and streaks', [
        'A seeded generator replays the same sequence every time, which is what makes simulations testable. An unseeded one gives a different run each time, which is what makes shuffles fair.',
        'Long streaks are not evidence of a broken generator. In a thousand coin flips, runs of six or seven in a row are ordinary — the intuition that they should not happen is the thing that is wrong.',
      ]],
    ],
  },
  'room-area': {
    sections: [
      ['Floor area is not floorable area', [
        'Length times width gives the footprint, but flooring, paint and air conditioning all need slightly different numbers. Flooring adds a waste factor of five to ten percent for cuts and pattern matching; paint subtracts doors and windows; cooling depends on volume and heat gain, not area alone.',
        'Measure at the widest point of each wall, then note obstructions. A room that measures 4 by 5 metres rarely gives 20 square metres of usable floor once a chimney breast or a fitted cupboard is in the way.',
      ]],
      ['Split irregular rooms into shapes', [
        'An L-shaped room is two rectangles; a bay window is a rectangle plus a triangle or a trapezium. Adding the pieces is more reliable than trying to average two long measurements, which is where most manual estimates drift.',
        'For a triangle the area is half the base times the perpendicular height, not half the product of two slanted sides. That distinction matters for attic rooms and angled alcoves.',
      ]],
      ['Sloped ceilings and unit conversions', [
        'In an attic, the floor area includes space you cannot stand in. Estate agents often count floor area; usable area is usually measured where head height clears about 1.5 metres, which can cut the figure by a third.',
        'One square metre is 10.764 square feet, and one square foot is 0.0929 square metres. Convert once, at the end, and keep the units of the original measurements visible in your notes.',
      ]],
    ],
  },
};

module.exports = { PACK };
