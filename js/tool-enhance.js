// ====== CalcProMaster — per-tool content enhancements ======
// Optional extra section (formula breakdown + verified data table) appended to a
// specific tool page. Used to give high-impression pages that sit on Google page 2
// a unique, accuracy-checked section no other page carries.
//
// Read by BOTH:
//   - scripts/ssg-pages.cjs  → baked into the prerendered HTML at build time
//   - js/app.js renderExplain() → rendered client-side (so SPA navigation and
//     Googlebot's rendered DOM keep the section — the prerendered copy alone is
//     replaced by renderTool() on hydration)
//
// RULES: only deterministic formula/maths content with hand-verified numbers.
// No medical or financial advice. Every number below must be derivable from the
// stated formula — re-check with the calculator before editing.
var TOOL_ENHANCE = {
  'pmi-calculator':
    '<h2>How PMI is calculated</h2>' +
    '<p>Private mortgage insurance (PMI) is charged as an annual percentage of your original loan amount, then split into 12 monthly payments:</p>' +
    '<p><strong>Monthly PMI = Loan amount \u00d7 Annual PMI rate \u00f7 12</strong></p>' +
    '<p>On a $400,000 loan at a 0.5% annual rate: $400,000 \u00d7 0.005 \u00f7 12 = <strong>$166.67 per month</strong>.</p>' +
    '<table><thead><tr><th>Annual PMI rate</th><th>Monthly PMI on $300,000</th><th>Monthly PMI on $400,000</th></tr></thead><tbody>' +
    '<tr><td>0.30%</td><td>$75.00</td><td>$100.00</td></tr>' +
    '<tr><td>0.50%</td><td>$125.00</td><td>$166.67</td></tr>' +
    '<tr><td>0.75%</td><td>$187.50</td><td>$250.00</td></tr>' +
    '<tr><td>1.00%</td><td>$250.00</td><td>$333.33</td></tr>' +
    '<tr><td>1.50%</td><td>$375.00</td><td>$500.00</td></tr>' +
    '</tbody></table>' +
    '<h3>Which rate applies where you are</h3>' +
    '<p>PMI is priced by the insurer rather than by one national table, so the annual rate you type in is a lender-side number: insurers file rates state by state and price within them on credit score and loan-to-value, which is why two quotes for the same loan can come out different. Countries also name and place the charge differently \u2014 the USA calls it PMI, Canada covers high-ratio mortgages through CMHC default insurance whose premium is added to the loan balance, and UK lenders usually build the cost of high loan-to-value lending into the interest rate rather than billing it monthly. If your loan is FHA-insured there is no state pricing at all \u2014 the mortgage insurance rate is set nationally and does not vary by state, so the <a href="/finance/fha-loan/">FHA loan calculator</a> is the right page instead of this one.</p>' +
    '<p>Most conventional loans fall in the 0.3%\u20131.5% band; smaller down payments and lower credit scores sit at the top of it. PMI is normally removable once you reach 80% loan-to-value \u2014 check that with our <a href="/finance/loan-to-value/">loan-to-value calculator</a>, see the whole payment in the <a href="/finance/loan-emi/">loan EMI calculator</a> and read the <a href="/guides/loans-mortgages">mortgage guides</a>.</p>',

  'prorated-rent':
    '<h2>The prorated rent formula</h2>' +
    '<p>Prorated rent charges only the days you actually occupy the unit:</p>' +
    '<p><strong>Prorated rent = Monthly rent \u00f7 Days in the month \u00d7 Days occupied</strong></p>' +
    '<p>For $1,800 rent in a 30-day month, moving in on the 16th (15 days): $1,800 \u00f7 30 \u00d7 15 = <strong>$900</strong>.</p>' +
    '<table><thead><tr><th>Days occupied</th><th>Prorated rent at $1,800/mo (30-day month)</th><th>Daily rate</th></tr></thead><tbody>' +
    '<tr><td>5</td><td>$300.00</td><td>$60.00</td></tr>' +
    '<tr><td>10</td><td>$600.00</td><td>$60.00</td></tr>' +
    '<tr><td>15</td><td>$900.00</td><td>$60.00</td></tr>' +
    '<tr><td>20</td><td>$1,200.00</td><td>$60.00</td></tr>' +
    '<tr><td>25</td><td>$1,500.00</td><td>$60.00</td></tr>' +
    '</tbody></table>' +
    '<p>Some landlords divide by 30 or 31, others use the 365-day method \u2014 confirm which convention your lease uses. Related: <a href="/finance/roommate-rent-split/">roommate rent split</a> and <a href="/lifestyle/relocation-cost/">relocation cost</a>.</p>',

  'presentation-time':
    '<h2>How speaking time is calculated</h2>' +
    '<p><strong>Speaking time = Total words \u00f7 Speaking rate</strong></p>' +
    '<p>A comfortable presentation pace is roughly 130\u2013150 words per minute; the table below uses 140 wpm.</p>' +
    '<table><thead><tr><th>Script length</th><th>Time at 140 wpm</th><th>Time at 120 wpm</th></tr></thead><tbody>' +
    '<tr><td>500 words</td><td>3 min 34 s</td><td>4 min 10 s</td></tr>' +
    '<tr><td>1,000 words</td><td>7 min 9 s</td><td>8 min 20 s</td></tr>' +
    '<tr><td>1,500 words</td><td>10 min 43 s</td><td>12 min 30 s</td></tr>' +
    '<tr><td>2,000 words</td><td>14 min 17 s</td><td>16 min 40 s</td></tr>' +
    '<tr><td>2,500 words</td><td>17 min 51 s</td><td>20 min 50 s</td></tr>' +
    '<tr><td>3,000 words</td><td>21 min 26 s</td><td>25 min 0 s</td></tr>' +
    '</tbody></table>' +
    '<p>Leave 10\u201315% of the slot for pauses and questions. Related: <a href="/education/grade-needed/">grade needed calculator</a> and <a href="/everyday/jet-lag/">jet lag planner</a>.</p>',

  'margin-call':
    '<h2>How a margin call is calculated</h2>' +
    '<p>Your equity must stay above the broker\u2019s maintenance requirement, expressed as a share of position value:</p>' +
    '<p><strong>Equity = Position value \u2212 Borrowed amount</strong>, and the call triggers when <strong>Equity \u00f7 Position value &lt; Maintenance margin</strong></p>' +
    '<p>Example: 100 shares at $200 = $20,000, with $10,000 borrowed and a 25% maintenance requirement. The call price solves 100P \u2212 10,000 = 0.25 \u00d7 100P, giving P = <strong>$133.33</strong>.</p>' +
    '<table><thead><tr><th>Share price</th><th>Position value</th><th>Equity</th><th>Equity %</th></tr></thead><tbody>' +
    '<tr><td>$200.00</td><td>$20,000</td><td>$10,000</td><td>50.0%</td></tr>' +
    '<tr><td>$180.00</td><td>$18,000</td><td>$8,000</td><td>44.4%</td></tr>' +
    '<tr><td>$160.00</td><td>$16,000</td><td>$6,000</td><td>37.5%</td></tr>' +
    '<tr><td>$140.00</td><td>$14,000</td><td>$4,000</td><td>28.6%</td></tr>' +
    '<tr><td>$133.33</td><td>$13,333</td><td>$3,333</td><td>25.0% \u2014 call</td></tr>' +
    '</tbody></table>' +
    '<p>Higher maintenance requirements (30\u201340%) trigger the call sooner. Related: <a href="/finance/credit-utilization/">credit utilisation</a> and <a href="/finance/investment/">investment return</a>.</p>',

  'fha-loan':
    '<h2>How FHA mortgage insurance works</h2>' +
    '<p>FHA loans carry two insurance charges. An <strong>upfront MIP of 1.75%</strong> of the base loan is added at closing, and an <strong>annual MIP of 0.55%</strong> (the common rate for 30-year loans above 90% LTV) is billed monthly:</p>' +
    '<p><strong>Monthly MIP = Base loan \u00d7 0.55% \u00f7 12</strong></p>' +
    '<p>On a $350,000 base loan: upfront MIP = $350,000 \u00d7 0.0175 = <strong>$6,125</strong>; monthly MIP = $350,000 \u00d7 0.0055 \u00f7 12 = <strong>$160.42</strong>.</p>' +
    '<h3>Your county sets the limit; the MIP rate does not change</h3>' +
    '<p>Two things about an FHA loan are regional and one is not. The MIP percentages above are set nationally, so they are the same in every state. The maximum loan amount is not: HUD publishes a limit for every county in the USA each year, with a floor for low-cost areas and a higher ceiling for high-cost ones, revised annually with house prices. Look up your own county\u2019s current limit before modelling a loan here \u2014 an amount that sits comfortably inside the limit in one county can be over it in the next, and anything above the limit needs a conventional or jumbo product instead. This calculator prices MIP from the base loan you enter; it does not check that amount against your county limit.</p>' +
    '<p>The programme itself is USA-only \u2014 Canada covers high-ratio mortgages through CMHC default insurance added to the loan balance, and UK lenders usually price high loan-to-value borrowing into the interest rate instead of an insurance charge \u2014 so these limits and these MIP figures describe US properties.</p>' +
    '<table><thead><tr><th>Base loan</th><th>Upfront MIP (1.75%)</th><th>Monthly MIP (0.55%)</th></tr></thead><tbody>' +
    '<tr><td>$200,000</td><td>$3,500</td><td>$91.67</td></tr>' +
    '<tr><td>$300,000</td><td>$5,250</td><td>$137.50</td></tr>' +
    '<tr><td>$400,000</td><td>$7,000</td><td>$183.33</td></tr>' +
    '<tr><td>$500,000</td><td>$8,750</td><td>$229.17</td></tr>' +
    '</tbody></table>' +
    '<p>MIP rates and duration depend on the loan term and LTV \u2014 confirm the current schedule on HUD\u2019s website. Related: the <a href="/finance/loan-emi/">loan EMI calculator</a> for the payment itself, the <a href="/finance/pmi-calculator/">PMI calculator</a> for conventional loans, and <a href="/finance/closing-costs/">closing costs</a>.</p>',

  'baby-weight-gain':
    '<h2>How weekly gain is calculated</h2>' +
    '<p><strong>Average weekly gain = Total gain \u00f7 Weeks elapsed</strong></p>' +
    '<p>Example: 14 kg gained over 28 completed weeks = 14 \u00f7 28 = <strong>0.5 kg per week</strong>.</p>' +
    '<table><thead><tr><th>Total gain</th><th>Average weekly gain over 40 weeks</th></tr></thead><tbody>' +
    '<tr><td>9 kg</td><td>0.225 kg</td></tr>' +
    '<tr><td>11 kg</td><td>0.275 kg</td></tr>' +
    '<tr><td>12 kg</td><td>0.30 kg</td></tr>' +
    '<tr><td>14 kg</td><td>0.35 kg</td></tr>' +
    '<tr><td>16 kg</td><td>0.40 kg</td></tr>' +
    '</tbody></table>' +
    '<p>The rate is rarely even: most clinicians expect little gain in the first trimester and faster gain later. Recommended ranges depend on the pre-pregnancy BMI and are set by a midwife or clinician, so treat this page as arithmetic only. Related: <a href="/health/bmi/">BMI calculator</a> and <a href="/guides/health-fitness">health guides</a>.</p>',

  'closing-costs':
    '<h2>Estimating closing costs</h2>' +
    '<p>Closing costs are usually quoted as a percentage of the purchase price:<br><strong>Closing costs = Purchase price \u00d7 Cost rate</strong></p>' +
    '<p>On a $400,000 home, 3.5% works out to $400,000 \u00d7 0.035 = <strong>$14,000</strong>.</p>' +
    '<table><thead><tr><th>Purchase price</th><th>2%</th><th>3.5%</th><th>5%</th></tr></thead><tbody>' +
    '<tr><td>$300,000</td><td>$6,000</td><td>$10,500</td><td>$15,000</td></tr>' +
    '<tr><td>$400,000</td><td>$8,000</td><td>$14,000</td><td>$20,000</td></tr>' +
    '<tr><td>$500,000</td><td>$10,000</td><td>$17,500</td><td>$25,000</td></tr>' +
    '</tbody></table>' +
    '<p>The 2\u20135% band covers lender fees, title, appraisal and prepaid taxes and insurance. Related: <a href="/finance/fha-loan/">FHA loan</a> and <a href="/guides/loans-mortgages">mortgage guides</a>.</p>',

  'carpet':
    '<h2>Carpet area and the waste allowance</h2>' +
    '<p><strong>Ordered area = Room area \u00d7 (1 + Waste %)</strong></p>' +
    '<p>A 12 \u00d7 12 ft room is 144 sq ft; at 10% waste you order 144 \u00d7 1.10 = <strong>158.4 sq ft</strong>.</p>' +
    '<table><thead><tr><th>Room size</th><th>Area</th><th>+10% waste</th></tr></thead><tbody>' +
    '<tr><td>10 \u00d7 14 ft</td><td>140 sq ft</td><td>154.0 sq ft</td></tr>' +
    '<tr><td>12 \u00d7 12 ft</td><td>144 sq ft</td><td>158.4 sq ft</td></tr>' +
    '<tr><td>15 \u00d7 15 ft</td><td>225 sq ft</td><td>247.5 sq ft</td></tr>' +
    '<tr><td>20 \u00d7 15 ft</td><td>300 sq ft</td><td>330.0 sq ft</td></tr>' +
    '</tbody></table>' +
    '<p>Waste covers seams, doorways and pattern matching \u2014 stairs need noticeably more. Related: <a href="/guides/room-area">room area guide</a> and <a href="/guides/construction">construction guides</a>.</p>',

  'parking-cost':
    '<h2>Working out a monthly parking cost</h2>' +
    '<p><strong>Monthly cost = Daily rate \u00d7 Days parked per month</strong></p>' +
    '<p>At $15 a day for 22 working days: 15 \u00d7 22 = <strong>$330 per month</strong>.</p>' +
    '<table><thead><tr><th>Daily rate</th><th>22 days/month</th><th>Annual</th></tr></thead><tbody>' +
    '<tr><td>$5</td><td>$110</td><td>$1,320</td></tr>' +
    '<tr><td>$10</td><td>$220</td><td>$2,640</td></tr>' +
    '<tr><td>$15</td><td>$330</td><td>$3,960</td></tr>' +
    '<tr><td>$20</td><td>$440</td><td>$5,280</td></tr>' +
    '<tr><td>$25</td><td>$550</td><td>$6,600</td></tr>' +
    '</tbody></table>' +
    '<p>Compare against a monthly permit if your city offers one. Related: <a href="/auto/commute-cost/">commute cost</a> and <a href="/guides/auto">auto guides</a>.</p>',

  'child-height':
    '<h2>The mid-parental height formula</h2>' +
    '<p><strong>Boys: (father + mother + 13) \u00f7 2 cm.</strong><br><strong>Girls: (father + mother \u2212 13) \u00f7 2 cm.</strong></p>' +
    '<p>The result is a genetic midpoint, not a prediction \u2014 most children land within about \u00b18.5 cm of it.</p>' +
    '<table><thead><tr><th>Father / mother (cm)</th><th>Predicted boy</th><th>Predicted girl</th></tr></thead><tbody>' +
    '<tr><td>180 / 165</td><td>179 cm</td><td>166 cm</td></tr>' +
    '<tr><td>175 / 160</td><td>174 cm</td><td>161 cm</td></tr>' +
    '<tr><td>170 / 155</td><td>169 cm</td><td>156 cm</td></tr>' +
    '</tbody></table>' +
    '<p>This is the standard mid-parental formula; nutrition, sleep and general health also shape adult height. Related: <a href="/health/bmi/">BMI calculator</a> and <a href="/guides/health-fitness">health guides</a>.</p>',

  'roommate-rent-split':
    '<h2>Splitting rent by income</h2>' +
    '<p><strong>Your share = (Your income \u00f7 Total income) \u00d7 Rent</strong></p>' +
    '<p>Rent $1,800 with incomes of $3,000 and $2,000 (total $5,000): the higher earner pays 3,000 \u00f7 5,000 \u00d7 1,800 = <strong>$1,080</strong>, the other <strong>$720</strong>.</p>' +
    '<table><thead><tr><th>Rent</th><th>Incomes A / B</th><th>A pays</th><th>B pays</th></tr></thead><tbody>' +
    '<tr><td>$1,800</td><td>$3,000 / $2,000</td><td>$1,080</td><td>$720</td></tr>' +
    '<tr><td>$2,100</td><td>$4,000 / $3,000</td><td>$1,200</td><td>$900</td></tr>' +
    '<tr><td>$2,400</td><td>$5,000 / $3,000</td><td>$1,500</td><td>$900</td></tr>' +
    '</tbody></table>' +
    '<p>Some households split by room size instead of income. Related: <a href="/finance/prorated-rent/">prorated rent</a> and <a href="/guides/loans-mortgages">housing guides</a>.</p>',

  'coffee-cost':
    '<h2>The habit maths</h2>' +
    '<p><strong>Annual cost = Cups per day \u00d7 Price per cup \u00d7 Days per week \u00d7 52</strong></p>' +
    '<p>One $4 cup on 5 days a week: 4 \u00d7 5 \u00d7 52 = <strong>$1,040 a year</strong>.</p>' +
    '<table><thead><tr><th>Price per cup</th><th>Weekly (5 days)</th><th>Annual</th></tr></thead><tbody>' +
    '<tr><td>$3</td><td>$15</td><td>$780</td></tr>' +
    '<tr><td>$4</td><td>$20</td><td>$1,040</td></tr>' +
    '<tr><td>$5</td><td>$25</td><td>$1,300</td></tr>' +
    '<tr><td>$6</td><td>$30</td><td>$1,560</td></tr>' +
    '</tbody></table>' +
    '<p>Brewing at home runs roughly $0.30\u2013$0.60 a cup \u2014 the gap is the real number. Related: <a href="/guides/screen-time">screen time guide</a> and <a href="/guides/everyday">everyday guides</a>.</p>',

  'vacation-with-kids':
    '<h2>Building the trip budget</h2>' +
    '<p><strong>Total = (Adults \u00d7 Adult share) + (Children \u00d7 Child share)</strong></p>' +
    '<p>With a $1,200 adult share (flights plus lodging) and $800 per child, two adults and two children need 2 \u00d7 1,200 + 2 \u00d7 800 = <strong>$4,000</strong>.</p>' +
    '<table><thead><tr><th>Adults / children</th><th>Adults</th><th>Children</th><th>Total</th></tr></thead><tbody>' +
    '<tr><td>2 / 1</td><td>$2,400</td><td>$800</td><td>$3,200</td></tr>' +
    '<tr><td>2 / 2</td><td>$2,400</td><td>$1,600</td><td>$4,000</td></tr>' +
    '<tr><td>2 / 3</td><td>$2,400</td><td>$2,400</td><td>$4,800</td></tr>' +
    '<tr><td>2 / 4</td><td>$2,400</td><td>$3,200</td><td>$5,600</td></tr>' +
    '</tbody></table>' +
    '<p>Add food, activities and a 10% buffer. Related: <a href="/lifestyle/relocation-cost/">relocation cost</a> and <a href="/guides/family">family guides</a>.</p>',

  'jet-lag':
    '<h2>Estimating adjustment time</h2>' +
    '<p>A common rule of thumb is <strong>about one day to adjust per hour of time-zone shift</strong>, and it is usually tougher flying east than west.</p>' +
    '<table><thead><tr><th>Time zones crossed</th><th>Rough adjustment</th></tr></thead><tbody>' +
    '<tr><td>3 hours</td><td>~3 days</td></tr>' +
    '<tr><td>5 hours</td><td>~5 days</td></tr>' +
    '<tr><td>8 hours</td><td>~8 days</td></tr>' +
    '<tr><td>12 hours</td><td>~12 days</td></tr>' +
    '</tbody></table>' +
    '<p>This is a rough planning guide, not medical advice. Related: <a href="/everyday/coffee-cost/">coffee cost</a> and <a href="/guides/everyday">everyday guides</a>.</p>',

  'safe-withdrawal':
    '<h2>How the withdrawal is calculated</h2>' +
    '<p><strong>Annual withdrawal = Portfolio \u00d7 Withdrawal rate</strong>, and the monthly figure is that amount \u00f7 12.</p>' +
    '<p>A $1,000,000 portfolio at 4% gives 1,000,000 \u00d7 0.04 = <strong>$40,000 a year</strong> \u2014 about $3,333 a month.</p>' +
    '<table><thead><tr><th>Portfolio</th><th>3.5%</th><th>4%</th><th>4.5%</th></tr></thead><tbody>' +
    '<tr><td>$500,000</td><td>$17,500</td><td>$20,000</td><td>$22,500</td></tr>' +
    '<tr><td>$750,000</td><td>$26,250</td><td>$30,000</td><td>$33,750</td></tr>' +
    '<tr><td>$1,000,000</td><td>$35,000</td><td>$40,000</td><td>$45,000</td></tr>' +
    '</tbody></table>' +
    '<p>The 4% guideline assumes a long retirement and a balanced portfolio; the sequence of returns matters as much as the rate. Related: <a href="/finance/retirement/">retirement calculator</a> and <a href="/guides/retirement">retirement guide</a>.</p>',

  'gutter':
    '<h2>Sizing gutters to the roof</h2>' +
    '<p>A common rule of thumb is <strong>1 sq inch of gutter cross-section per 100 sq ft of roof area</strong>, with roughly one downspout per 600\u2013800 sq ft.</p>' +
    '<table><thead><tr><th>Roof area</th><th>Gutter cross-section</th><th>Downspouts (at ~700 sq ft each)</th></tr></thead><tbody>' +
    '<tr><td>1,000 sq ft</td><td>10 sq in</td><td>2</td></tr>' +
    '<tr><td>2,000 sq ft</td><td>20 sq in</td><td>3</td></tr>' +
    '<tr><td>3,000 sq ft</td><td>30 sq in</td><td>5</td></tr>' +
    '</tbody></table>' +
    '<p>Steep roofs and heavy-rainfall regions need more capacity \u2014 confirm against local code. Related: <a href="/construction/drywall/">drywall calculator</a> and <a href="/guides/construction">construction guides</a>.</p>',

  'poker-flush':
    '<h2>The odds of a flush</h2>' +
    '<p>There are <strong>2,598,960</strong> different 5-card hands (52 choose 5). A flush is five cards of one suit: 4 suits \u00d7 1,287 combinations = 5,148 hands once straight flushes are included.</p>' +
    '<table><thead><tr><th>Hand</th><th>Ways</th><th>Probability</th></tr></thead><tbody>' +
    '<tr><td>Flush (excluding straight flush)</td><td>5,108</td><td>0.1965%</td></tr>' +
    '<tr><td>Straight flush (excluding royal)</td><td>36</td><td>0.00139%</td></tr>' +
    '<tr><td>Royal flush</td><td>4</td><td>0.000154%</td></tr>' +
    '<tr><td>Any flush (including straight)</td><td>5,148</td><td>0.1981%</td></tr>' +
    '</tbody></table>' +
    '<p>So a flush turns up roughly once in every 509 five-card hands. Related: <a href="/math/random-generator/">random number generator</a> and <a href="/guides/math-statistics">statistics guides</a>.</p>',

  'drywall':
    '<h2>Sheets and the waste allowance</h2>' +
    '<p><strong>Sheets = Area \u00d7 (1 + Waste %) \u00f7 32</strong>, rounded up (a standard sheet is 4 \u00d7 8 ft = 32 sq ft).</p>' +
    '<p>500 sq ft with 10% waste: 500 \u00d7 1.10 \u00f7 32 = 17.2 \u2192 <strong>18 sheets</strong>.</p>' +
    '<table><thead><tr><th>Wall / ceiling area</th><th>+10% waste</th><th>Sheets (4 \u00d7 8 ft)</th></tr></thead><tbody>' +
    '<tr><td>500 sq ft</td><td>550</td><td>18</td></tr>' +
    '<tr><td>800 sq ft</td><td>880</td><td>28</td></tr>' +
    '<tr><td>1,000 sq ft</td><td>1,100</td><td>35</td></tr>' +
    '<tr><td>1,200 sq ft</td><td>1,320</td><td>42</td></tr>' +
    '</tbody></table>' +
    '<p>Ceilings and odd shapes add more offcuts. Related: <a href="/construction/carpet/">carpet calculator</a> and <a href="/guides/construction">construction guides</a>.</p>',

  'gift-wrap':
    '<h2>How much paper a box needs</h2>' +
    '<p>A practical estimate from the box dimensions:<br><strong>Paper length = 2 \u00d7 (Length + Height) + 10 cm overlap</strong><br><strong>Paper width = Width + 2 \u00d7 Height + 5 cm overlap</strong></p>' +
    '<table><thead><tr><th>Box (L \u00d7 W \u00d7 H)</th><th>Paper length</th><th>Paper width</th></tr></thead><tbody>' +
    '<tr><td>20 \u00d7 15 \u00d7 10 cm</td><td>70 cm</td><td>40 cm</td></tr>' +
    '<tr><td>25 \u00d7 20 \u00d7 12 cm</td><td>84 cm</td><td>49 cm</td></tr>' +
    '<tr><td>30 \u00d7 20 \u00d7 15 cm</td><td>100 cm</td><td>55 cm</td></tr>' +
    '<tr><td>15 \u00d7 10 \u00d7 8 cm</td><td>56 cm</td><td>31 cm</td></tr>' +
    '</tbody></table>' +
    '<p>Square boxes use the least paper; a 70 cm wide roll covers every size above. Related: <a href="/everyday/coffee-cost/">coffee cost</a> and <a href="/guides/everyday">everyday guides</a>.</p>',

  // Added Oct 2026: the #1 page by measured impressions but with no table on it
  // (see docs/QUERY-REACH.md §5). Every figure below is the calculator's own
  // formula, re-computed by hand: premium = (home value \u00f7 1,000) \u00d7 rate.
  'home-insurance':
    '<h2>How the home insurance estimate is calculated</h2>' +
    '<p>Home insurance is quoted as a rate per $1,000 of coverage, so the annual estimate is a two-step multiplication:</p>' +
    '<p><strong>Annual premium = (Home value \u00f7 1,000) \u00d7 Rate per $1,000</strong><br><strong>Monthly premium = Annual premium \u00f7 12</strong></p>' +
    '<p><strong>Worked example:</strong> a $350,000 home at $3.50 per $1,000: (350,000 \u00f7 1,000) \u00d7 3.50 = <strong>$1,225 per year</strong>, which is <strong>$102.08 per month</strong>.</p>' +
    '<table><thead><tr><th>Rate ($ per $1,000 of coverage)</th><th>$150,000</th><th>$250,000</th><th>$350,000</th><th>$500,000</th></tr></thead><tbody>' +
    '<tr><td>$2.00</td><td>$300</td><td>$500</td><td>$700</td><td>$1,000</td></tr>' +
    '<tr><td>$3.00</td><td>$450</td><td>$750</td><td>$1,050</td><td>$1,500</td></tr>' +
    '<tr><td>$3.50</td><td>$525</td><td>$875</td><td>$1,225</td><td>$1,750</td></tr>' +
    '<tr><td>$5.00</td><td>$750</td><td>$1,250</td><td>$1,750</td><td>$2,500</td></tr>' +
    '<tr><td>$7.00</td><td>$1,050</td><td>$1,750</td><td>$2,450</td><td>$3,500</td></tr>' +
    '</tbody></table>' +
    '<h3>Where your region and the policy year change the number</h3>' +
    '<p>The rate per $1,000 is the one input your location really moves. Two identical $350,000 houses are not rated alike in different states or provinces, because the rate carries the local cost of rebuilding: wind, hail, wildfire and coastal-storm exposure, local labour and material prices, and how much reinsurance insurers can buy for that territory. The rate from a quote for your own address is the right number to type here \u2014 a state average, and a national one even more so, will miss what your postcode adds.</p>' +
    '<p>Quoting conventions differ by country too, and the calculator expects one shape. Policies in the US and Canada are usually rated per $1,000 of dwelling coverage, which is what these fields ask for. Buildings cover in the UK and Australia is normally quoted as a single annual premium against a sum insured, so convert before comparing: \u00a3480 a year on a \u00a3240,000 sum insured is 480 \u00f7 240 = <strong>\u00a32.00 per $1,000</strong>, and entering 2.00 here reproduces that premium exactly.</p>' +
    '<p>Renewals re-rate for the same reason: rebuild costs move with construction inflation, so the rate you signed up to is not the rate on this year\u2019s renewal. Re-run the estimate each time rather than trusting an old figure.</p>' +
    '<p>The rate is the only uncertain input: it is not a national constant, it depends on your rebuild cost, deductible, construction type, roof age and claim history. Compare the quoted rate against the annual premium, not the monthly figure \u2014 a $200 monthly difference is a $2,400 annual one. Unlike a home value estimate, this calculator covers the dwelling structure only: it does not price your contents or liability, so a renters policy is the right tool when you do not own the building. Related: <a href="/lifestyle/renters-insurance/">renters insurance estimate</a>, <a href="/lifestyle/relocation-cost/">relocation cost</a> and the <a href="/guides/loans-mortgages">loans and mortgages guide</a>.</p>' +
    '<h3>Working backwards: choose the premium, get the rate</h3>' +
    '<p>The grid above runs value \u00d7 rate \u2192 premium. The question most people arrive with is the reverse, and it is the same arithmetic rearranged:</p>' +
    '<p><strong>Rate per $1,000 \u2264 (Target monthly premium \u00d7 12) \u00f7 (Home value \u00f7 1,000)</strong></p>' +
    '<p><strong>Worked example:</strong> a $350,000 home with a ceiling of $100 a month. The annual allowance is $1,200, so the rate has to be at or below 1,200 \u00f7 350 = <strong>3.4286</strong> per $1,000. Rounding that to the nearest cent overshoots the ceiling \u2014 $3.43 gives 350 \u00d7 3.43 = $1,200.50 a year, which is $100.04 a month. Round down instead: <strong>$3.42</strong> gives 350 \u00d7 3.42 = <strong>$1,197.00 a year</strong>, or <strong>$99.75 a month</strong>.</p>' +
    '<table><thead><tr><th>Home value</th><th>Target monthly premium</th><th>Max rate per $1,000</th><th>Annual premium at that rate</th></tr></thead><tbody>' +
    '<tr><td>$250,000</td><td>$100</td><td>$4.80</td><td>$1,200.00 \u2014 $100.00/mo</td></tr>' +
    '<tr><td>$350,000</td><td>$100</td><td>$3.42</td><td>$1,197.00 \u2014 $99.75/mo</td></tr>' +
    '<tr><td>$350,000</td><td>$150</td><td>$5.14</td><td>$1,799.00 \u2014 $149.92/mo</td></tr>' +
    '<tr><td>$500,000</td><td>$100</td><td>$2.40</td><td>$1,200.00 \u2014 $100.00/mo</td></tr>' +
    '<tr><td>$500,000</td><td>$200</td><td>$4.80</td><td>$2,400.00 \u2014 $200.00/mo</td></tr>' +
    '</tbody></table>' +
    '<p>Where the division lands exactly on a cent \u2014 the $250,000 and $500,000 rows \u2014 the ceiling is met exactly rather than beaten, which is why those two stay at a round $100.00.</p>' +
    '<h3>The other lever: the deductible</h3>' +
    '<p>A deductible and a premium pull in opposite directions: agree to carry more of a loss yourself and the rate you are quoted is lower. How much lower is a quote-side number this page cannot know, but the trade becomes arithmetic the moment you hold two quotes. The break-even is how long the annual saving takes to repay the extra amount you agreed to carry:</p>' +
    '<p><strong>Break-even (years) = Extra deductible \u00f7 Annual premium saved</strong></p>' +
    '<p>Method example with illustrative quotes rather than market figures: moving the deductible from $1,000 to $2,500 adds $1,500 of risk, and if that drops the premium by $120 a year then 1,500 \u00f7 120 = <strong>12.5 years</strong> before the saving has repaid it. Put your own two quotes into the same division \u2014 they are quotes, not averages.</p>' +
    '<p>One difference worth stating: this page has no address field, no lead form and no request for contact details. The estimate is the whole transaction, and the arithmetic above is the same arithmetic the calculator runs.</p>',

  'apy-calculator':
    '<h2>The APY formula</h2>' +
    '<p><strong>APY = (1 + Nominal rate \u00f7 Compounding periods)<sup>Periods</sup> \u2212 1</strong></p>' +
    '<p>A 5% nominal rate compounded monthly: (1 + 0.05 \u00f7 12)<sup>12</sup> \u2212 1 = <strong>5.116%</strong>.</p>' +
    '<table><thead><tr><th>Nominal rate</th><th>Monthly</th><th>Daily</th><th>Annual</th></tr></thead><tbody>' +
    '<tr><td>4.00%</td><td>4.074%</td><td>4.081%</td><td>4.000%</td></tr>' +
    '<tr><td>5.00%</td><td>5.116%</td><td>5.127%</td><td>5.000%</td></tr>' +
    '<tr><td>6.00%</td><td>6.168%</td><td>6.183%</td><td>6.000%</td></tr>' +
    '</tbody></table>' +
    '<h3>What a given APY actually earns on $10,000</h3>' +
    '<p>Once a rate is quoted as APY, the compounding is already inside it, so the one-year interest is a single multiplication: <strong>balance \u00d7 APY</strong>. That is why APY is the number to compare advertisements with and the nominal rate is not.</p>' +
    '<table><thead><tr><th>APY</th><th>Interest on $10,000 for one year</th><th>Balance after a year</th><th>Monthly rate that produces it</th></tr></thead><tbody>' +
    '<tr><td>3.00%</td><td>$300</td><td>$10,300</td><td>0.2466%</td></tr>' +
    '<tr><td>3.50%</td><td>$350</td><td>$10,350</td><td>0.2871%</td></tr>' +
    '<tr><td>4.00%</td><td>$400</td><td>$10,400</td><td>0.3274%</td></tr>' +
    '<tr><td>4.10%</td><td>$410</td><td>$10,410</td><td>0.3354%</td></tr>' +
    '<tr><td>4.50%</td><td>$450</td><td>$10,450</td><td>0.3675%</td></tr>' +
    '<tr><td>5.00%</td><td>$500</td><td>$10,500</td><td>0.4074%</td></tr>' +
    '</tbody></table>' +
    '<p>For any other balance, scale the row: 5.00% APY on $1,000 is $50, and on $100,000 it is $5,000. The last column matters when you check a statement \u2014 a bank that credits interest monthly does not pay APY \u00f7 12 each month, it pays (1 + APY)<sup>1/12</sup> \u2212 1, the smaller figure in that column. Over a full year the two routes meet exactly at the APY.</p>' +
    '<h3>APY, AER and APR \u2014 same number or different?</h3>' +
    '<p>The label changes with the country, not the arithmetic. What this page calls <strong>APY</strong> is the standard US disclosure for deposit accounts; in the UK and Ireland the same compounded figure is quoted as <strong>AER</strong> (annual equivalent rate), and deposit rates in Australia and Canada are also quoted on an effective annual basis. A 5% nominal rate compounded monthly is 5.116% APY and 5.12% AER \u2014 one number, two names, which is what makes savings rates from different countries comparable once both are quoted this way.</p>' +
    '<p><strong>APR is not interchangeable with APY.</strong> APR describes borrowing, and a lending APR can include fees on top of the compounding, so a savings APY and a loan APR are built differently. Compare deposit accounts on APY (or AER) and borrowing on APR.</p>' +
    '<p>More frequent compounding means a higher APY for the same nominal rate. Related: <a href="/finance/compound-interest/">compound interest</a> and <a href="/guides/loans-mortgages">finance guides</a>.</p>' +
    '<h3>What a monthly contribution earns</h3>' +
    '<p>The calculator above compounds a single balance. Most savings plans also add money every month, and the same rate covers both cases. With deposits going in at the end of each month and interest credited monthly at the rate the APY implies \u2014 <strong>i = (1 + APY)<sup>1/12</sup> \u2212 1</strong> \u2014 the balance after n months is:</p>' +
    '<p><strong>Balance = Deposit \u00d7 ((1 + i)<sup>n</sup> \u2212 1) \u00f7 i</strong></p>' +
    '<p>At 5.00% APY, i is 0.4074% a month. Paying in $1,000 at the end of every month for a year builds <strong>$12,272.58</strong>: $12,000 of your own deposits plus <strong>$272.58</strong> of interest.</p>' +
    '<table><thead><tr><th>APY</th><th>Balance after 12 months at $1,000/mo</th><th>Interest earned</th><th>Balance after 24 months</th><th>Interest earned</th></tr></thead><tbody>' +
    '<tr><td>3.00%</td><td>$12,164.12</td><td>$164.12</td><td>$24,693.16</td><td>$693.16</td></tr>' +
    '<tr><td>4.00%</td><td>$12,218.44</td><td>$218.44</td><td>$24,925.62</td><td>$925.62</td></tr>' +
    '<tr><td>5.00%</td><td>$12,272.58</td><td>$272.58</td><td>$25,158.78</td><td>$1,158.78</td></tr>' +
    '</tbody></table>' +
    '<p>The same $12,000 parked as a lump sum for a year at 5.00% APY ends at <strong>$12,600.00</strong> \u2014 <strong>$327.42</strong> more than the monthly route. That gap is not a fee or a penalty: it is the interest the money earned during the months it would not yet have been deposited, which is why a savings projection is only comparable next to the deposit schedule it assumes.</p>' +
    '<h3>APY and APR, side by side</h3>' +
    '<p>Deposits and loans run on the same compounding arithmetic; what differs is the label \u2014 and, on the borrowing side, whether fees sit inside the number. The two rows below are one rate written both ways:</p>' +
    '<table><thead><tr><th>Quoted as</th><th>Arithmetic</th><th>The other label</th></tr></thead><tbody>' +
    '<tr><td>5.000% nominal, compounded monthly</td><td>(1 + 0.05 \u00f7 12)<sup>12</sup> \u2212 1</td><td>= <strong>5.116% effective</strong> \u2014 the APY, and the AER in the UK and Ireland</td></tr>' +
    '<tr><td>4.889% nominal, compounded monthly</td><td>12 \u00d7 ((1.05)<sup>1/12</sup> \u2212 1)</td><td>= <strong>5.000% effective</strong></td></tr>' +
    '</tbody></table>' +
    '<p>Read the first row backwards and it becomes the second: a 5.000% effective rate is a 4.889% monthly-compounded nominal rate, and both describe the same account. On the deposit side the effective figure is what gets advertised as APY. On the borrowing side an APR can also carry fees on top of that compounding \u2014 once fees are inside the number the two stop matching, and the APR is no longer the same maths relabelled. That is the whole difference, and it is why a savings APY and a loan APR are two different constructions rather than two names for one rate.</p>' +
    '<p>One caution the arithmetic cannot fix: a promotional APY applies only while the promotion runs. Every table on this page assumes the rate holds for the whole period, so treat a rate that reverts as a shorter period at a lower rate, and re-run the numbers when it changes.</p>',

  // Added Oct 2026: /health/bmr-mifflin was the only page in the query-reach backlog
  // classified `write` and carrying no enhancement card (docs/QUERY-REACH.md §5).
  // Equation, multipliers and a boundary only \u2014 three of the PAA questions on this
  // SERP are clinical and are deliberately NOT answered here.
  'bmr-mifflin':
    '<h2>The equation this calculator runs</h2>' +
    '<p>This page uses the <strong>Mifflin-St Jeor</strong> equation, and naming it matters: pages on this SERP return different numbers for the same person because they run different equations (Harris-Benedict and Katch-McArdle are the usual alternatives) without always saying which one is in use.</p>' +
    '<p><strong>BMR = 10 \u00d7 weight (kg) + 6.25 \u00d7 height (cm) \u2212 5 \u00d7 age + 5</strong> \u2014 men<br><strong>BMR = 10 \u00d7 weight (kg) + 6.25 \u00d7 height (cm) \u2212 5 \u00d7 age \u2212 161</strong> \u2014 women</p>' +
    '<p><strong>Worked example:</strong> 80 kg, 180 cm, age 40, male \u2192 800 + 1,125 \u2212 200 + 5 = <strong>1,730 kcal/day</strong>. Run the identical inputs as female and the answer is 800 + 1,125 \u2212 200 \u2212 161 = <strong>1,320 kcal/day</strong>; the 166 kcal gap is the sex term and nothing else.</p>' +
    '<table><thead><tr><th>Input</th><th>Term in the equation</th><th>Value</th></tr></thead><tbody>' +
    '<tr><td>Weight 80 kg</td><td>10 \u00d7 80</td><td>800</td></tr>' +
    '<tr><td>Height 180 cm</td><td>6.25 \u00d7 180</td><td>1,125</td></tr>' +
    '<tr><td>Age 40</td><td>\u2212 5 \u00d7 40</td><td>\u2212 200</td></tr>' +
    '<tr><td>Sex (male)</td><td>+ 5</td><td>+ 5</td></tr>' +
    '<tr><td><strong>Total</strong></td><td><strong>BMR</strong></td><td><strong>1,730 kcal/day</strong></td></tr>' +
    '</tbody></table>' +
    '<h3>From BMR to a daily total</h3>' +
    '<p>BMR is the resting figure. Multiplying it by an activity factor turns it into a daily energy estimate (TDEE), and that factor is the only judgement in the chain \u2014 the default view on the calculator uses moderate:</p>' +
    '<table><thead><tr><th>Activity level</th><th>Factor</th><th>At a 1,730 kcal BMR</th><th>At a 1,320 kcal BMR</th></tr></thead><tbody>' +
    '<tr><td>Sedentary</td><td>1.2</td><td>2,076</td><td>1,584</td></tr>' +
    '<tr><td>Light</td><td>1.375</td><td>2,379</td><td>1,815</td></tr>' +
    '<tr><td>Moderate (calculator default)</td><td>1.55</td><td>2,682</td><td>2,046</td></tr>' +
    '<tr><td>Very active</td><td>1.725</td><td>2,984</td><td>2,277</td></tr>' +
    '<tr><td>Extra active</td><td>1.9</td><td>3,287</td><td>2,508</td></tr>' +
    '</tbody></table>' +
    '<p>Feed the same four inputs through the same equation and the answer is identical every time \u2014 the only guarantee a four-input estimate can offer.</p>' +
    '<h3>What this page does not do</h3>' +
    '<p>It is arithmetic on four inputs: weight, height, age and sex. It does not diagnose anything, it cannot know about thyroid conditions, medication, pregnancy or body composition, and it does not say how much anyone should eat. Questions in those areas \u2014 including the ones search engines show beside this query \u2014 need a clinician who has the history, not a formula with four variables. Muscle mass is the clearest internal limit: the equation reads weight, not what the weight is made of, so a very muscular person and a person of the same weight with more fat get identical output.</p>' +
    '<p>Related: <a href="/health/body-fat/">body fat calculator</a>, <a href="/health/calorie-deficit/">calorie deficit calculator</a> and <a href="/health/">health calculators</a>.</p>',

  // ===== position 20-50 targets (added Oct 2026) =====
  'pipe-volume':
    '<h2>The pipe volume formula</h2>' +
    '<p>A pipe is a cylinder, so its internal volume is the cross-sectional area times its length:</p>' +
    '<p><strong>Volume = \u03c0 \u00d7 (Inner diameter \u00f7 2)\u00b2 \u00d7 Length</strong></p>' +
    '<p>A 2-inch pipe running 50 ft holds \u03c0 \u00d7 (2\u00f712 \u00f7 2)\u00b2 \u00d7 50 = <strong>1.09 ft\u00b3, about 8.2 US gallons</strong>.</p>' +
    '<table><thead><tr><th>Inner diameter</th><th>Volume per 50 ft</th><th>US gallons</th></tr></thead><tbody>' +
    '<tr><td>1 in</td><td>0.27 ft\u00b3</td><td>2.0 gal</td></tr>' +
    '<tr><td>1.5 in</td><td>0.61 ft\u00b3</td><td>4.6 gal</td></tr>' +
    '<tr><td>2 in</td><td>1.09 ft\u00b3</td><td>8.2 gal</td></tr>' +
    '<tr><td>3 in</td><td>2.45 ft\u00b3</td><td>18.4 gal</td></tr>' +
    '<tr><td>4 in</td><td>4.36 ft\u00b3</td><td>32.6 gal</td></tr>' +
    '</tbody></table>' +
    '<p>Volume scales with the square of the diameter, so doubling the bore holds about four times as much. Related: <a href="/construction/water-tank/">water tank capacity</a> and <a href="/construction/">construction calculators</a>.</p>',

  'pf-ratio':
    '<h2>How the P/F ratio is calculated</h2>' +
    '<p>The P/F ratio compares arterial oxygen to the fraction of oxygen you are breathing:</p>' +
    '<p><strong>P/F ratio = PaO\u2082 \u00f7 FiO\u2082 (as a decimal)</strong></p>' +
    '<p>A PaO\u2082 of 100 mmHg on 50% oxygen: 100 \u00f7 0.50 = <strong>200</strong>.</p>' +
    '<table><thead><tr><th>PaO\u2082 (mmHg)</th><th>FiO\u2082</th><th>P/F ratio</th><th>Band</th></tr></thead><tbody>' +
    '<tr><td>100</td><td>21%</td><td>476</td><td>Normal</td></tr>' +
    '<tr><td>100</td><td>40%</td><td>250</td><td>Mild</td></tr>' +
    '<tr><td>100</td><td>50%</td><td>200</td><td>Mild / moderate</td></tr>' +
    '<tr><td>80</td><td>60%</td><td>133</td><td>Moderate</td></tr>' +
    '<tr><td>60</td><td>80%</td><td>75</td><td>Severe</td></tr>' +
    '</tbody></table>' +
    '<p>Lower ratios mean worse oxygenation. This tool is for reference only \u2014 clinical decisions belong with the treating team. Related: <a href="/health/anion-gap/">anion gap</a> and <a href="/health/">health calculators</a>.</p>',

  'insulation':
    '<h2>How much insulation you need</h2>' +
    '<p>The quantity follows straight from the area and the thickness that delivers your target R-value:</p>' +
    '<p><strong>Volume = Area \u00d7 Thickness</strong>, and <strong>R-value = Thickness \u00f7 Conductivity</strong></p>' +
    '<p>For 100 m\u00b2 at 0.1 m thickness: 100 \u00d7 0.1 = <strong>10 m\u00b3 of insulation</strong>.</p>' +
    '<table><thead><tr><th>Area (m\u00b2)</th><th>Thickness (m)</th><th>Volume (m\u00b3)</th></tr></thead><tbody>' +
    '<tr><td>50</td><td>0.1</td><td>5.0</td></tr>' +
    '<tr><td>100</td><td>0.1</td><td>10.0</td></tr>' +
    '<tr><td>100</td><td>0.2</td><td>20.0</td></tr>' +
    '<tr><td>150</td><td>0.15</td><td>22.5</td></tr>' +
    '<tr><td>200</td><td>0.2</td><td>40.0</td></tr>' +
    '</tbody></table>' +
    '<p>Thicker insulation raises the R-value but multiplies the volume, so check the target R-value for your climate first. Related: <a href="/construction/drywall/">drywall</a> and <a href="/construction/">construction calculators</a>.</p>',

  'swim-pace':
    '<h2>How swim pace is calculated</h2>' +
    '<p>Swimmers normally quote pace per 100 m (or per 100 yd):</p>' +
    '<p><strong>Pace per 100 m = Total time \u00f7 Distance \u00d7 100</strong></p>' +
    '<p>1,500 m in 25 minutes: 25 \u00f7 1500 \u00d7 100 = <strong>1 min 40 s per 100 m</strong>.</p>' +
    '<table><thead><tr><th>Distance</th><th>Time</th><th>Pace /100 m</th></tr></thead><tbody>' +
    '<tr><td>400 m</td><td>7:20</td><td>1:50</td></tr>' +
    '<tr><td>750 m</td><td>13:00</td><td>1:44</td></tr>' +
    '<tr><td>1,000 m</td><td>17:00</td><td>1:42</td></tr>' +
    '<tr><td>1,500 m</td><td>25:00</td><td>1:40</td></tr>' +
    '<tr><td>2,000 m</td><td>34:00</td><td>1:42</td></tr>' +
    '</tbody></table>' +
    '<p>A steady pace across distances usually signals good aerobic control; a fade late in the set is a cue to build endurance. Related: <a href="/fitness/rowing-split/">rowing split</a> and <a href="/fitness/running-pace/">running pace</a>.</p>',

  'pump-power':
    '<h2>The pump power formula</h2>' +
    '<p>Hydraulic power comes from flow and head; shaft power divides by efficiency:</p>' +
    '<p><strong>Hydraulic power = \u03c1 \u00d7 g \u00d7 Q \u00d7 H</strong>, and <strong>Shaft power = Hydraulic power \u00f7 Efficiency</strong></p>' +
    '<p>20 L/s against 30 m of head at 75% efficiency: (1000 \u00d7 9.81 \u00d7 0.020 \u00d7 30) \u00f7 0.75 = <strong>about 7.8 kW</strong>.</p>' +
    '<table><thead><tr><th>Flow (L/s)</th><th>Head (m)</th><th>Hydraulic (kW)</th><th>Shaft @75% (kW)</th></tr></thead><tbody>' +
    '<tr><td>10</td><td>20</td><td>1.96</td><td>2.62</td></tr>' +
    '<tr><td>20</td><td>30</td><td>5.89</td><td>7.85</td></tr>' +
    '<tr><td>30</td><td>30</td><td>8.83</td><td>11.77</td></tr>' +
    '<tr><td>40</td><td>40</td><td>15.70</td><td>20.93</td></tr>' +
    '<tr><td>50</td><td>50</td><td>24.53</td><td>32.70</td></tr>' +
    '</tbody></table>' +
    '<p>Lower efficiency means a bigger motor for the same duty point. Add a safety margin when sizing the motor. Related: <a href="/engineering/voltage-drop/">voltage drop</a> and <a href="/engineering/">engineering calculators</a>.</p>',

  'rowing-split':
    '<h2>How the rowing split is calculated</h2>' +
    '<p>Rowers report the time to cover 500 m:</p>' +
    '<p><strong>Split per 500 m = Total time \u00f7 Distance \u00d7 500</strong></p>' +
    '<p>2,000 m in 8:00 (480 s): 480 \u00f7 2000 \u00d7 500 = <strong>2:00 per 500 m</strong>.</p>' +
    '<table><thead><tr><th>Distance</th><th>Time</th><th>Split /500 m</th></tr></thead><tbody>' +
    '<tr><td>500 m</td><td>1:55</td><td>1:55</td></tr>' +
    '<tr><td>1,000 m</td><td>3:56</td><td>1:58</td></tr>' +
    '<tr><td>2,000 m</td><td>8:00</td><td>2:00</td></tr>' +
    '<tr><td>5,000 m</td><td>20:50</td><td>2:05</td></tr>' +
    '<tr><td>6,000 m</td><td>25:30</td><td>2:07</td></tr>' +
    '</tbody></table>' +
    '<p>Power rises with the cube of speed, so shaving a few seconds per split costs far more effort than it looks. Related: <a href="/fitness/swim-pace/">swim pace</a> and <a href="/fitness/one-rep-max/">one-rep max</a>.</p>',

  'bike-loan':
    '<h2>How the bike loan EMI is calculated</h2>' +
    '<p>The equated monthly instalment uses the standard amortising formula:</p>' +
    '<p><strong>EMI = P \u00d7 r \u00d7 (1 + r)\u207f \u00f7 ((1 + r)\u207f \u2212 1)</strong>, where r is the monthly rate and n the number of months</p>' +
    '<p>A $5,000 bike at 9.5% over 36 months: monthly r = 0.007917, giving an EMI of <strong>$160.16</strong> and total interest of about <strong>$765.76</strong>.</p>' +
    '<table><thead><tr><th>Bike price</th><th>Rate</th><th>Months</th><th>EMI</th></tr></thead><tbody>' +
    '<tr><td>$3,000</td><td>9.5%</td><td>36</td><td>$96.10</td></tr>' +
    '<tr><td>$5,000</td><td>9.5%</td><td>36</td><td>$160.16</td></tr>' +
    '<tr><td>$5,000</td><td>12%</td><td>48</td><td>$131.67</td></tr>' +
    '<tr><td>$8,000</td><td>9.5%</td><td>60</td><td>$168.02</td></tr>' +
    '</tbody></table>' +
    '<p>A longer term lowers the EMI but raises the total interest paid. Related: <a href="/auto/">auto calculators</a> and <a href="/finance/amortization/">amortization schedule</a>.</p>',

  'tow-capacity':
    '<h2>How much you can safely tow</h2>' +
    '<p>Your towing limit is what is left of the combined rating after the truck and everything in it:</p>' +
    '<p><strong>Tow capacity = GCWR \u2212 Truck weight \u2212 Passengers + cargo</strong></p>' +
    '<p>5,000 kg GCWR \u2212 2,200 kg truck \u2212 400 kg load = <strong>2,400 kg of towing capacity</strong>.</p>' +
    '<table><thead><tr><th>GCWR (kg)</th><th>Truck (kg)</th><th>Payload (kg)</th><th>Tow capacity (kg)</th></tr></thead><tbody>' +
    '<tr><td>5,000</td><td>2,200</td><td>400</td><td>2,400</td></tr>' +
    '<tr><td>6,000</td><td>2,200</td><td>400</td><td>3,400</td></tr>' +
    '<tr><td>6,000</td><td>2,500</td><td>600</td><td>2,900</td></tr>' +
    '<tr><td>7,000</td><td>2,500</td><td>600</td><td>3,900</td></tr>' +
    '<tr><td>7,000</td><td>2,800</td><td>800</td><td>3,400</td></tr>' +
    '</tbody></table>' +
    '<p>Every extra kilogram of passengers or cargo takes a kilogram off your towing capacity. Related: <a href="/auto/cargo-volume/">cargo volume</a> and <a href="/auto/">auto calculators</a>.</p>',

  'vacation-budget':
    '<h2>How the vacation budget adds up</h2>' +
    '<p>Each line is multiplied out and summed:</p>' +
    '<p><strong>Total = Flights + Hotel \u00d7 Nights + Food \u00d7 Nights + Activities</strong></p>' +
    '<p>$500 flights + $150 \u00d7 5 nights + $60 \u00d7 5 nights + $300 activities = <strong>$1,850</strong>.</p>' +
    '<table><thead><tr><th>Item</th><th>Rate</th><th>Units</th><th>Subtotal</th></tr></thead><tbody>' +
    '<tr><td>Flights</td><td>$500</td><td>1</td><td>$500</td></tr>' +
    '<tr><td>Hotel</td><td>$150/night</td><td>5</td><td>$750</td></tr>' +
    '<tr><td>Food</td><td>$60/day</td><td>5</td><td>$300</td></tr>' +
    '<tr><td>Activities</td><td>$300</td><td>1</td><td>$300</td></tr>' +
    '<tr><td><strong>Total</strong></td><td></td><td></td><td><strong>$1,850</strong></td></tr>' +
    '</tbody></table>' +
    '<p>Add 10\u201315% for buffer and you have a realistic trip figure. Related: <a href="/family/vacation-with-kids/">vacation with kids</a> and <a href="/everyday/moving-truck/">moving truck size</a>.</p>',

  'cost-of-debt':
    '<h2>The after-tax cost of debt</h2>' +
    '<p>Interest is usually tax-deductible, so the effective cost is lower than the headline rate:</p>' +
    '<p><strong>After-tax cost of debt = Pre-tax rate \u00d7 (1 \u2212 Tax rate)</strong></p>' +
    '<p>A 6% loan in a 25% tax bracket: 6% \u00d7 (1 \u2212 0.25) = <strong>4.5%</strong>.</p>' +
    '<table><thead><tr><th>Pre-tax rate</th><th>Tax rate</th><th>After-tax cost</th></tr></thead><tbody>' +
    '<tr><td>5%</td><td>20%</td><td>4.0%</td></tr>' +
    '<tr><td>6%</td><td>25%</td><td>4.5%</td></tr>' +
    '<tr><td>7%</td><td>30%</td><td>4.9%</td></tr>' +
    '<tr><td>8%</td><td>21%</td><td>6.3%</td></tr>' +
    '<tr><td>10%</td><td>35%</td><td>6.5%</td></tr>' +
    '</tbody></table>' +
    '<p>This figure is what gets compared against the return on new projects in a weighted average cost of capital. Related: <a href="/finance/effective-tax-rate/">effective tax rate</a> and <a href="/finance/">finance calculators</a>.</p>',

  'water-tank':
    '<h2>How tank capacity is calculated</h2>' +
    '<p>For a rectangular tank, capacity is simply volume, converted to litres:</p>' +
    '<p><strong>Capacity = Length \u00d7 Width \u00d7 Height</strong>, and <strong>1 m\u00b3 = 1,000 litres</strong></p>' +
    '<p>A 2 m \u00d7 1.5 m \u00d7 1 m tank: 2 \u00d7 1.5 \u00d7 1 = 3 m\u00b3 = <strong>3,000 litres</strong>.</p>' +
    '<table><thead><tr><th>Length</th><th>Width</th><th>Height</th><th>Volume</th><th>Litres</th></tr></thead><tbody>' +
    '<tr><td>1.0 m</td><td>1.0 m</td><td>1.0 m</td><td>1.0 m\u00b3</td><td>1,000 L</td></tr>' +
    '<tr><td>1.5 m</td><td>1.0 m</td><td>1.0 m</td><td>1.5 m\u00b3</td><td>1,500 L</td></tr>' +
    '<tr><td>2.0 m</td><td>1.5 m</td><td>1.0 m</td><td>3.0 m\u00b3</td><td>3,000 L</td></tr>' +
    '<tr><td>2.0 m</td><td>2.0 m</td><td>1.5 m</td><td>6.0 m\u00b3</td><td>6,000 L</td></tr>' +
    '<tr><td>3.0 m</td><td>2.0 m</td><td>2.0 m</td><td>12.0 m\u00b3</td><td>12,000 L</td></tr>' +
    '</tbody></table>' +
    '<p>Leave headroom below the top so the tank can overflow safely. Related: <a href="/construction/pipe-volume/">pipe volume</a> and <a href="/construction/">construction calculators</a>.</p>',

  'commute-cost':
    '<h2>How commute cost is calculated</h2>' +
    '<p>The round trip is charged against your fuel economy and the fuel price:</p>' +
    '<p><strong>Daily cost = (One-way distance \u00d7 2 \u00f7 Mileage) \u00d7 Fuel price + Parking</strong></p>' +
    '<p>A 25 km one-way trip at 15 km/L with $1.50/L fuel: (25 \u00d7 2 \u00f7 15) \u00d7 1.50 = <strong>$5.00 per day</strong>, or <strong>$25.00 a week</strong> over 5 days.</p>' +
    '<table><thead><tr><th>One-way km</th><th>Mileage (km/L)</th><th>Fuel/day</th><th>Weekly (5 days)</th></tr></thead><tbody>' +
    '<tr><td>10</td><td>15</td><td>$2.00</td><td>$10.00</td></tr>' +
    '<tr><td>25</td><td>15</td><td>$5.00</td><td>$25.00</td></tr>' +
    '<tr><td>25</td><td>10</td><td>$7.50</td><td>$37.50</td></tr>' +
    '<tr><td>40</td><td>15</td><td>$8.00</td><td>$40.00</td></tr>' +
    '<tr><td>40</td><td>20</td><td>$6.00</td><td>$30.00</td></tr>' +
    '</tbody></table>' +
    '<p>Parking and tolls often rival fuel, so enter them if you pay them. Related: <a href="/auto/taxi-fare/">taxi fare</a> and <a href="/auto/">auto calculators</a>.</p>',

  'depreciation':
    '<h2>The straight-line depreciation formula</h2>' +
    '<p>Straight-line spreads the loss in value evenly over the asset\u2019s life:</p>' +
    '<p><strong>Annual depreciation = (Asset cost \u2212 Salvage value) \u00f7 Useful life</strong></p>' +
    '<p>A $50,000 asset with a $5,000 salvage value over 5 years: (50,000 \u2212 5,000) \u00f7 5 = <strong>$9,000 per year</strong>.</p>' +
    '<table><thead><tr><th>Year</th><th>Opening value</th><th>Depreciation</th><th>Closing value</th></tr></thead><tbody>' +
    '<tr><td>1</td><td>$50,000</td><td>$9,000</td><td>$41,000</td></tr>' +
    '<tr><td>2</td><td>$41,000</td><td>$9,000</td><td>$32,000</td></tr>' +
    '<tr><td>3</td><td>$32,000</td><td>$9,000</td><td>$23,000</td></tr>' +
    '<tr><td>4</td><td>$23,000</td><td>$9,000</td><td>$14,000</td></tr>' +
    '<tr><td>5</td><td>$14,000</td><td>$9,000</td><td>$5,000</td></tr>' +
    '</tbody></table>' +
    '<p>Straight-line gives an equal charge each year; accelerated methods front-load it. Related: <a href="/business/depreciation/">business depreciation</a> and <a href="/business/">business calculators</a>.</p>',

  'cycling-speed':
    '<h2>How cycling time is calculated</h2>' +
    '<p>Time follows directly from distance and average speed:</p>' +
    '<p><strong>Time = Distance \u00f7 Average speed</strong></p>' +
    '<p>40 km at 25 km/h: 40 \u00f7 25 = 1.6 h = <strong>96 minutes</strong>.</p>' +
    '<table><thead><tr><th>Distance</th><th>Speed</th><th>Time</th></tr></thead><tbody>' +
    '<tr><td>10 km</td><td>20 km/h</td><td>30 min</td></tr>' +
    '<tr><td>20 km</td><td>25 km/h</td><td>48 min</td></tr>' +
    '<tr><td>40 km</td><td>25 km/h</td><td>1 h 36 m</td></tr>' +
    '<tr><td>40 km</td><td>30 km/h</td><td>1 h 20 m</td></tr>' +
    '<tr><td>100 km</td><td>25 km/h</td><td>4 h 00 m</td></tr>' +
    '</tbody></table>' +
    '<p>Hills, wind and stops lower the real average, so treat the figure as a moving-time estimate. Related: <a href="/fitness/running-pace/">running pace</a> and <a href="/fitness/rowing-split/">rowing split</a>.</p>',

  'moving-truck':
    '<h2>How truck size is estimated</h2>' +
    '<p>Furnished rooms are converted to a total volume, then matched to a truck:</p>' +
    '<p><strong>Volume = Rooms of furniture \u00d7 Cubic feet per room</strong></p>' +
    '<p>3 rooms at 150 ft\u00b3 each: 3 \u00d7 150 = <strong>450 ft\u00b3</strong>.</p>' +
    '<table><thead><tr><th>Rooms</th><th>Volume (ft\u00b3)</th><th>Typical truck</th></tr></thead><tbody>' +
    '<tr><td>1</td><td>150</td><td>Cargo van</td></tr>' +
    '<tr><td>2</td><td>300</td><td>10 ft box truck</td></tr>' +
    '<tr><td>3</td><td>450</td><td>15 ft box truck</td></tr>' +
    '<tr><td>4</td><td>600</td><td>16\u201320 ft box truck</td></tr>' +
    '<tr><td>6</td><td>900</td><td>26 ft truck</td></tr>' +
    '</tbody></table>' +
    '<p>Bulky items like sofas eat volume fast, so round up when in doubt. Related: <a href="/auto/cargo-volume/">cargo volume</a> and <a href="/everyday/">everyday calculators</a>.</p>',

  'siding-squares':
    '<h2>How siding squares are calculated</h2>' +
    '<p>Measure the wall area, deduct openings, then add a waste factor. One square = 100 ft\u00b2:</p>' +
    '<p><strong>Squares = (Wall area \u2212 Openings) \u00d7 (1 + Waste) \u00f7 100</strong></p>' +
    '<p>Four 40 ft \u00d7 10 ft walls minus 100 ft\u00b2 of openings, plus 10% waste: (1,600 \u2212 100) \u00d7 1.10 = 1,650 ft\u00b2 = <strong>16.5 squares</strong>.</p>' +
    '<table><thead><tr><th>Walls (40\u00d710)</th><th>Openings (ft\u00b2)</th><th>Waste</th><th>Squares</th></tr></thead><tbody>' +
    '<tr><td>1</td><td>30</td><td>10%</td><td>4.07</td></tr>' +
    '<tr><td>2</td><td>60</td><td>10%</td><td>8.14</td></tr>' +
    '<tr><td>4</td><td>100</td><td>10%</td><td>16.50</td></tr>' +
    '<tr><td>4</td><td>100</td><td>15%</td><td>17.25</td></tr>' +
    '<tr><td>6</td><td>150</td><td>10%</td><td>24.75</td></tr>' +
    '</tbody></table>' +
    '<p>Gable ends add triangular area, so measure them separately. Related: <a href="/construction/gutter/">gutter length</a> and <a href="/construction/">construction calculators</a>.</p>',

  // === Interactive math tools: in-content links to /graph and /geometry-lab ===
  'quadratic':
    '<h2>See the roots on a graph</h2>' +
    '<p>A quadratic <strong>ax\u00b2 + bx + c = 0</strong> has roots where the parabola crosses the x-axis. The discriminant <strong>b\u00b2 \u2212 4ac</strong> decides how many: positive gives two real roots, zero a repeated root, negative none.</p>' +
    '<p>For x\u00b2 \u2212 2 = 0 the roots are x = \u00b1\u221a2 \u2248 \u00b11.414 \u2014 exactly where the curve meets the axis. Plot it with our free <a href="/graph">function grapher</a>: type <code>x^2 - 2</code> and watch where it crosses zero. Related: <a href="/math/completing-square/">completing the square</a> and <a href="/math/cubic-equation/">cubic equation solver</a>.</p>',

  'cubic-equation':
    '<h2>Plotting a cubic</h2>' +
    '<p>A cubic <strong>ax\u00b3 + bx\u00b2 + cx + d = 0</strong> always has at least one real root, because the curve runs to +\u221e at one end and \u2212\u221e at the other. The number of turns is at most two.</p>' +
    '<p>Take x\u00b3 \u2212 x = 0, which factors as x(x \u2212 1)(x + 1): it crosses the axis at \u22121, 0 and 1. Confirm the shape with the <a href="/graph">function grapher</a> \u2014 enter <code>x^3 - x</code>. Related: <a href="/math/quadratic/">quadratic solver</a> and <a href="/math/nth-root/">nth root</a>.</p>',

  'trigonometry':
    '<h2>Sine and cosine as waves</h2>' +
    '<p>On a unit circle, <strong>sin \u03b8</strong> and <strong>cos \u03b8</strong> trace repeating waves with period 2\u03c0 \u2248 6.283 and range \u22121 to 1. The tangent function repeats every \u03c0 with vertical breaks where cosine is zero.</p>' +
    '<p>Plot them with our <a href="/graph">function grapher</a>: <code>sin(x)</code> or <code>sin(x)*3</code> shows the amplitude change, and <code>tan(x)</code> shows the asymptotes. Remember the grapher works in radians. Related: <a href="/math/law-of-sines/">law of sines</a> and <a href="/math/law-of-cosines/">law of cosines</a>.</p>',

  'slope':
    '<h2>Slope, seen on a line</h2>' +
    '<p>Slope is rise over run: <strong>m = (y\u2082 \u2212 y\u2081) \u00f7 (x\u2082 \u2212 x\u2081)</strong>. A line through (1, 1) and (3, 5) has m = (5 \u2212 1) \u00f7 (3 \u2212 1) = 2.</p>' +
    '<p>Draw it for yourself with the <a href="/graph">function grapher</a>: <code>2x - 1</code> is the same line, and changing the number in front of x tilts it. Related: <a href="/math/slope-intercept/">slope-intercept form</a> and <a href="/math/distance-formula/">distance formula</a>.</p>',

  'slope-intercept':
    '<h2>Reading y = mx + b as a graph</h2>' +
    '<p>In <strong>y = mx + b</strong>, m is the slope and b is the y-intercept \u2014 the point where the line crosses the y-axis at x = 0. For y = 3x + 1, the line starts at (0, 1) and rises 3 units for every 1 to the right.</p>' +
    '<p>See it instantly with the <a href="/graph">function grapher</a>: enter <code>3x + 1</code>. Related: <a href="/math/slope/">slope calculator</a> and <a href="/math/direct-variation/">direct variation</a>.</p>',

  'triangle':
    '<h2>Explore a triangle by dragging it</h2>' +
    '<p>A triangle\u2019s three angles always total 180\u00b0, and its area is <strong>\u00bd \u00d7 base \u00d7 height</strong> \u2014 or by Heron\u2019s formula from the three sides alone. Side lengths are locked by the triangle inequality: no side may exceed the sum of the other two.</p>' +
    '<p>Try our interactive <a href="/geometry-lab">geometry lab</a>: drag the three corners and watch the sides, angles, perimeter and area update live, so the rules above become visible. Related: <a href="/math/pythagorean/">Pythagorean theorem</a> and <a href="/math/law-of-cosines/">law of cosines</a>.</p>',

  'pythagorean':
    '<h2>Why a\u00b2 + b\u00b2 = c\u00b2</h2>' +
    '<p>In a right triangle the two shorter sides squared add to the hypotenuse squared: <strong>a\u00b2 + b\u00b2 = c\u00b2</strong>. A 3-4-5 triangle checks out: 9 + 16 = 25.</p>' +
    '<p>Build one visually with the <a href="/geometry-lab">geometry lab</a> \u2014 drag a corner until one angle reads 90\u00b0, then square the two shorter sides. Related: <a href="/math/triangle/">triangle calculator</a> and <a href="/math/distance-formula/">distance formula</a>.</p>',

  'circle':
    '<h2>Circle measurements at a glance</h2>' +
    '<p>A circle\u2019s circumference is <strong>2\u03c0r</strong> and its area is <strong>\u03c0r\u00b2</strong>. Doubling the radius doubles the circumference but quadruples the area, because area scales with the square of the radius.</p>' +
    '<p>Drag a triangle around our <a href="/geometry-lab">geometry lab</a> to see how the same fixed rules constrain every shape. Related: <a href="/math/sector-area/">sector area</a> and <a href="/math/annulus-area/">annulus area</a>.</p>',

  'snow-day':
    '<h2>How the snow-day score is calculated</h2>' +
    '<p>Three parts add up, and each is shown rather than hidden in the code:</p>' +
    '<p><strong>Score = min(1, snowfall \u00f7 district threshold) \u00d7 55 + cold + roads</strong></p>' +
    '<p>Snow is capped at 55 points, so snow past the threshold cannot push the score on its own. Cold adds 25 below 20 \u00b0F, 15 up to 28 \u00b0F and 5 up to freezing. Road clearing adds 25 for untreated or rural routes, 15 for mixed and 5 for cleared main roads.</p>' +
    '<table><thead><tr><th>Snowfall vs threshold</th><th>Overnight low</th><th>Roads</th><th>Score</th><th>Band</th></tr></thead><tbody>' +
    '<tr><td>4\u2033 of 4\u2033</td><td>28 \u00b0F</td><td>mixed</td><td>85</td><td>Very likely</td></tr>' +
    '<tr><td>3\u2033 of 4\u2033</td><td>30 \u00b0F</td><td>mixed</td><td>61</td><td>Likely</td></tr>' +
    '<tr><td>2\u2033 of 4\u2033</td><td>34 \u00b0F</td><td>good</td><td>33</td><td>Unlikely</td></tr>' +
    '<tr><td>6\u2033 of 4\u2033</td><td>22 \u00b0F</td><td>poor</td><td>95</td><td>Very likely</td></tr>' +
    '</tbody></table>' +
    '<p>Bands: 75+ very likely, 55\u201374 likely, 35\u201354 possible, below 35 unlikely. A district also weighs timing (snow at 4am versus 4pm), wind chill, bus-route safety and staffing, none of which a forecast alone answers \u2014 so this is a transparent estimate of the weather case, not an announcement. Related: <a href="/everyday/date-diff/">date difference</a> and <a href="/auto/fuel-cost/">fuel cost</a>.</p>',

  // === 2026-10-17 · batch 1: measured page-2 add-term pages ===
  // Each row below exists because the page's GSC impressions arrive on a query
  // the page answered only in passing. Every number is the tool's own formula
  // at its own default input, re-computed independently in
  // tests/unit/enhance-claims.test.js.

  'situp-test':
    '<h2>How the sit-up test is scored</h2>' +
    '<p>The score is the number of full sit-ups completed in 60 seconds, counted when the shoulders return to the floor. This page scores that count against four bands:</p>' +
    '<table><thead><tr><th>Sit-ups in 60 s</th><th>Rating</th><th>What it means here</th></tr></thead><tbody>' +
    '<tr><td>45+</td><td>Excellent</td><td>one every 1.3 s or faster</td></tr>' +
    '<tr><td>35\u201344</td><td>Good</td><td>one every 1.4\u20131.7 s</td></tr>' +
    '<tr><td>25\u201334</td><td>Average</td><td>one every 1.8\u20132.4 s</td></tr>' +
    '<tr><td>under 25</td><td>Needs work</td><td>slower than one every 2.4 s</td></tr>' +
    '</tbody></table>' +
    '<p>An <strong>average</strong> result is 25\u201334 sit-ups per minute. That is the tool\u2019s own split rather than a clinical norm \u2014 published standards vary by age and sex \u2014 so the useful comparison is your own repeat test under the same conditions. A steady cadence beats a fast start: 35 sit-ups in a minute is one every 1.7 seconds, and most people lose more time to a pause at 25 than to a slightly slower first ten.</p>' +
    '<p>Related: <a href="/fitness/plank-test/">plank hold test</a> and <a href="/fitness/vo2max/">VO2 max estimate</a>.</p>',

  'vo2max':
    '<h2>Resting heart rate method vs the step test</h2>' +
    '<p>This page estimates VO2 max from resting heart rate and age:</p>' +
    '<p><strong>Men: 15.3 \u00d7 (220 \u2212 age) \u00f7 resting HR</strong> \u00b7 <strong>Women: 14.7 \u00d7 (226 \u2212 age) \u00f7 resting HR</strong></p>' +
    '<p>A 30-year-old man with a resting rate of 65 bpm: 15.3 \u00d7 190 \u00f7 65 = <strong>44.7 ml/kg/min</strong>.</p>' +
    '<p>The step test uses recovery heart rate instead, so it measures how quickly you recover rather than how low your resting rate sits. After three minutes of stepping, count the pulse for 15 seconds and multiply by four, then apply the Queen\u2019s College equations:</p>' +
    '<p><strong>Men: 111.33 \u2212 0.42 \u00d7 recovery HR</strong> \u00b7 <strong>Women: 65.81 \u2212 0.1847 \u00d7 recovery HR</strong></p>' +
    '<table><thead><tr><th>Recovery HR (bpm)</th><th>Men (ml/kg/min)</th><th>Women (ml/kg/min)</th></tr></thead><tbody>' +
    '<tr><td>120</td><td>60.9</td><td>43.6</td></tr>' +
    '<tr><td>140</td><td>52.5</td><td>40.0</td></tr>' +
    '<tr><td>150</td><td>48.3</td><td>38.1</td></tr>' +
    '<tr><td>170</td><td>39.9</td><td>34.4</td></tr>' +
    '</tbody></table>' +
    '<p>The two methods can differ by several points because they measure different things; neither replaces a lab test. Related: <a href="/fitness/situp-test/">sit-up test</a> and <a href="/health/heart-rate/">heart rate zones</a>.</p>',

  'sharpe-ratio':
    '<h2>What the Sharpe ratio measures</h2>' +
    '<p>The Sharpe ratio is excess return per unit of volatility:</p>' +
    '<p><strong>Sharpe = (Portfolio return \u2212 Risk-free rate) \u00f7 Standard deviation</strong></p>' +
    '<p>A 12% return against a 4% risk-free rate with 15% volatility: (12 \u2212 4) \u00f7 15 = <strong>0.533</strong>.</p>' +
    '<table><thead><tr><th>Volatility</th><th>Sharpe at 12% return, 4% risk-free</th><th>Tool label</th></tr></thead><tbody>' +
    '<tr><td>10%</td><td>0.800</td><td>Adequate</td></tr>' +
    '<tr><td>15%</td><td>0.533</td><td>Adequate</td></tr>' +
    '<tr><td>20%</td><td>0.400</td><td>Poor</td></tr>' +
    '<tr><td>25%</td><td>0.320</td><td>Poor</td></tr>' +
    '</tbody></table>' +
    '<p>Same return, more risk, lower score: that is the whole point of a risk-adjusted <strong>measure</strong>. A ratio of 1 or more is labelled good here, 0.5\u20131 adequate and below 0.5 poor. A negative ratio means the portfolio did worse than the risk-free asset. Related: <a href="/finance/investment/">investment return</a> and <a href="/finance/wacc/">cost of capital</a>.</p>',

  'percentile-rank':
    '<h2>Percentile rank formula</h2>' +
    '<p><strong>Percentile rank = (scores below + 0.5 \u00d7 scores equal) \u00f7 number of scores \u00d7 100</strong></p>' +
    '<p>For the dataset 65, 70, 75, 80, 90 and a score of 75: two scores are below, one is equal, so (2 + 0.5) \u00f7 5 \u00d7 100 = <strong>50.0</strong>.</p>' +
    '<table><thead><tr><th>Score</th><th>Scores below</th><th>Percentile rank</th></tr></thead><tbody>' +
    '<tr><td>65</td><td>0</td><td>10.0</td></tr>' +
    '<tr><td>70</td><td>1</td><td>30.0</td></tr>' +
    '<tr><td>75</td><td>2</td><td>50.0</td></tr>' +
    '<tr><td>80</td><td>3</td><td>70.0</td></tr>' +
    '<tr><td>90</td><td>4</td><td>90.0</td></tr>' +
    '</tbody></table>' +
    '<p>Going the other way, <strong>rank from a percentile</strong>: rank \u2248 (1 \u2212 percentile \u00f7 100) \u00d7 class size + 1. In a class of 200, the 90th percentile is about 21st. Related: <a href="/education/class-rank/">class rank</a> and <a href="/education/grade-needed/">grade needed</a>.</p>',

  'anion-gap':
    '<h2>Anion gap, albumin correction and the delta ratio</h2>' +
    '<p><strong>Anion gap = Na\u207a \u2212 (Cl\u207b + HCO\u2083\u207b)</strong></p>' +
    '<p>At the default inputs: 140 \u2212 (104 + 24) = <strong>12 mEq/L</strong>, the top of the usual 8\u201312 range.</p>' +
    '<p>Low albumin hides a high gap, because albumin is the main unmeasured anion. <strong>Corrected gap = gap + 2.5 \u00d7 (4 \u2212 albumin in g/dL)</strong>: an albumin of 2.0 adds 5 mEq/L to the measured value.</p>' +
    '<p>The delta ratio asks whether a high gap is explained by the fall in bicarbonate:</p>' +
    '<p><strong>Delta ratio = (gap \u2212 12) \u00f7 (24 \u2212 HCO\u2083\u207b)</strong></p>' +
    '<table><thead><tr><th>Anion gap</th><th>HCO\u2083\u207b</th><th>Delta ratio</th></tr></thead><tbody>' +
    '<tr><td>16</td><td>20</td><td>1.00</td></tr>' +
    '<tr><td>20</td><td>12</td><td>0.67</td></tr>' +
    '<tr><td>24</td><td>8</td><td>0.75</td></tr>' +
    '</tbody></table>' +
    '<p>Rough reading: under 0.4 suggests a normal-gap acidosis, 0.4\u20131 a mixed picture, 1\u20132 a pure high-gap acidosis, and above 2 a concurrent metabolic alkalosis. The delta gap is the same arithmetic without the division: (20 \u2212 12) \u2212 (24 \u2212 12) = \u22124. This is a screening aid, not a diagnosis. Related: <a href="/health/winters-formula/">Winter\u2019s formula</a> and <a href="/health/serum-osmolality/">serum osmolality</a>.</p>',

  'rms':
    '<h2>Root mean square, step by step</h2>' +
    '<p><strong>RMS = \u221a((x\u2081\u00b2 + x\u2082\u00b2 + \u2026 + x\u2099\u00b2) \u00f7 n)</strong></p>' +
    '<p>For 3 and 4: (9 + 16) \u00f7 2 = 12.5, and \u221a12.5 = <strong>3.5355</strong>.</p>' +
    '<table><thead><tr><th>Values</th><th>Mean of squares</th><th>RMS</th></tr></thead><tbody>' +
    '<tr><td>3, 4</td><td>12.5</td><td>3.5355</td></tr>' +
    '<tr><td>1, 2, 3, 4</td><td>7.5</td><td>2.7386</td></tr>' +
    '<tr><td>2, 2, 2</td><td>4</td><td>2.0000</td></tr>' +
    '<tr><td>\u22123, 4</td><td>12.5</td><td>3.5355</td></tr>' +
    '</tbody></table>' +
    '<p>The last row is why RMS is used for AC signals: squaring removes the sign, so a negative half-cycle counts as much as a positive one. For a pure sine wave, <strong>RMS = peak \u00f7 \u221a2</strong>; a 230 V peak is 162.6 V RMS, which is the figure mains voltage quotes. Related: <a href="/math/weighted-average/">weighted average</a> and <a href="/science/sound-intensity/">sound intensity</a>.</p>',

  'wavelength':
    '<h2>Wavelength, frequency and the de Broglie wavelength</h2>' +
    '<p><strong>\u03bb = v \u00f7 f</strong>, where v is the wave speed and f the frequency. Sound in air at 343 m/s and 440 Hz: 343 \u00f7 440 = <strong>0.7795 m</strong>.</p>' +
    '<table><thead><tr><th>Frequency (Hz)</th><th>Wavelength at 343 m/s</th></tr></thead><tbody>' +
    '<tr><td>100</td><td>3.43 m</td></tr>' +
    '<tr><td>440</td><td>0.7795 m</td></tr>' +
    '<tr><td>1,000</td><td>0.343 m</td></tr>' +
    '<tr><td>10,000</td><td>0.0343 m</td></tr>' +
    '</tbody></table>' +
    '<p>Matter has a wavelength too. The <strong>de Broglie wavelength</strong> is \u03bb = h \u00f7 (m \u00d7 v), with h = 6.626 \u00d7 10\u207b\u00b3\u2074 J\u00b7s. An electron (9.109 \u00d7 10\u207b\u00b3\u00b9 kg) moving at 1 \u00d7 10\u2076 m/s: 6.626 \u00d7 10\u207b\u00b3\u2074 \u00f7 (9.109 \u00d7 10\u207b\u00b2\u2075) = 7.27 \u00d7 10\u207b\u00b9\u2070 m, about 0.73 nm \u2014 the scale that makes electron diffraction possible.</p>' +
    '<p>This calculator solves the wave equation, not the matter-wave one, because the inputs are speed and frequency. Related: <a href="/science/speed-of-sound/">speed of sound</a> and <a href="/science/photon-energy/">photon energy</a>.</p>',

  'storage-need':
    '<h2>How to decide how much storage you need</h2>' +
    '<p>The estimate adds four file types at fixed averages: <strong>5 GB per million photos</strong>, <strong>3 GB per hour of 1080p video</strong>, documents in GB as typed, and <strong>0.1 GB per hour of music</strong>.</p>' +
    '<p>At the default inputs: 10M photos = 50 GB, 20 h of video = 60 GB, 5 GB of documents and 200 h of music = 20 GB. Total <strong>135 GB</strong>, which fits a 200 GB plan but not a 100 GB one.</p>' +
    '<table><thead><tr><th>Photos</th><th>Photos alone (GB)</th><th>With defaults for the rest</th></tr></thead><tbody>' +
    '<tr><td>1 million</td><td>5</td><td>90 GB</td></tr>' +
    '<tr><td>5 million</td><td>25</td><td>110 GB</td></tr>' +
    '<tr><td>10 million</td><td>50</td><td>135 GB</td></tr>' +
    '<tr><td>20 million</td><td>100</td><td>185 GB</td></tr>' +
    '</tbody></table>' +
    '<p>Decide in two steps: total the files you already have, then add 20\u201330% headroom. Drives stay comfortable below about 80% full, and 135 GB \u00d7 1.25 = 169 GB, which still lands on a 200 GB plan. Video is the item that moves the total fastest \u2014 one extra hour is 3 GB, the same as 600 photos.</p>' +
    '<p>Related: <a href="/tech/data-transfer-cost/">data transfer cost</a> and <a href="/tech/internet-speed/">internet speed</a>.</p>',

  'cleaning-time':
    '<h2>How cleaning time is calculated</h2>' +
    '<p><strong>Minutes = rooms \u00d7 per-room rate + bathrooms \u00d7 per-bath rate + floor area \u00d7 0.02</strong></p>' +
    '<table><thead><tr><th>Clean depth</th><th>Per room</th><th>Per bathroom</th><th>Floors</th></tr></thead><tbody>' +
    '<tr><td>Quick tidy</td><td>5 min</td><td>15 min</td><td>0.02 min/ft\u00b2</td></tr>' +
    '<tr><td>Regular</td><td>12 min</td><td>15 min</td><td>0.02 min/ft\u00b2</td></tr>' +
    '<tr><td>Deep clean</td><td>25 min</td><td>30 min</td><td>0.02 min/ft\u00b2</td></tr>' +
    '</tbody></table>' +
    '<p>Four rooms, two bathrooms and 1,200 ft\u00b2 at the regular rate: 48 + 30 + 24 = <strong>102 minutes</strong>. The same home as a quick tidy: 20 + 30 + 24 = 74 minutes; as a deep clean: 100 + 60 + 24 = 184 minutes.</p>' +
    '<p>Floor time is the only part that does not change with depth here, because 1,200 \u00d7 0.02 = 24 minutes whatever the label. Bathrooms are the most expensive room per square foot, so a second bathroom adds more than a second bedroom of the same size.</p>' +
    '<p>Related: <a href="/lifestyle/">lifestyle calculators</a> and <a href="/everyday/">everyday calculators</a>.</p>',

  'dividend':
    '<h2>Dividends and savings interest are different things</h2>' +
    '<p><strong>Annual dividend = shares \u00d7 dividend per share</strong>. 100 shares at $2.50 pays 100 \u00d7 2.50 = <strong>$250</strong> a year.</p>' +
    '<p>A savings account does not pay a dividend; it pays interest on the balance. $10,000 at 4% APY earns <strong>$400</strong> in a year. To match $250 of dividends at 4% you would need $250 \u00f7 0.04 = <strong>$6,250</strong> on deposit.</p>' +
    '<table><thead><tr><th>Balance</th><th>Interest at 4% APY</th><th>Shares needed at $2.50 to match</th></tr></thead><tbody>' +
    '<tr><td>$5,000</td><td>$200</td><td>80</td></tr>' +
    '<tr><td>$10,000</td><td>$400</td><td>160</td></tr>' +
    '<tr><td>$25,000</td><td>$1,000</td><td>400</td></tr>' +
    '</tbody></table>' +
    '<p>The risk differs too: a dividend is declared by the company and can be cut, while savings interest is contractual within deposit-insurance limits. The reinvestment field on this page compounds the dividend at the rate you enter; it does not model dividend growth or share-price change.</p>' +
    '<p>Related: <a href="/finance/apy-calculator/">APY calculator</a>, <a href="/finance/dividend-yield/">dividend yield</a> and <a href="/finance/compound-interest/">compound interest</a>.</p>',

  // === 2026-10-17 · batch 2: explanation-intent pages ===
  // These pages rank for a question (how / formula / normal range / meaning)
  // but shipped only a form. Each section answers the question in the page.

  'dew-point':
    '<h2>How dew point is calculated (Magnus formula)</h2>' +
    '<p><strong>\u03b1 = ln(RH \u00f7 100) + (17.27 \u00d7 T) \u00f7 (237.7 + T)</strong>, then <strong>Td = (237.7 \u00d7 \u03b1) \u00f7 (17.27 \u2212 \u03b1)</strong>.</p>' +
    '<p>At 30 \u00b0C and 70% relative humidity: \u03b1 = ln 0.7 + 518.1 \u00f7 267.7 = \u22120.3567 + 1.9354 = 1.5787, so Td = 375.3 \u00f7 15.691 = <strong>23.9 \u00b0C</strong>.</p>' +
    '<table><thead><tr><th>RH at 30 \u00b0C</th><th>Dew point</th></tr></thead><tbody>' +
    '<tr><td>40%</td><td>14.9 \u00b0C</td></tr>' +
    '<tr><td>60%</td><td>21.4 \u00b0C</td></tr>' +
    '<tr><td>70%</td><td>23.9 \u00b0C</td></tr>' +
    '<tr><td>80%</td><td>26.2 \u00b0C</td></tr>' +
    '<tr><td>90%</td><td>28.2 \u00b0C</td></tr>' +
    '</tbody></table>' +
    '<p>At 100% RH the dew point equals the air temperature, which is why fog forms when the two meet. Dew point is an absolute measure of moisture: the same 23.9 \u00b0C dew point feels muggy at 30 \u00b0C but is unchanged if the air warms to 35 \u00b0C, while relative humidity falls.</p>' +
    '<p>Related: <a href="/science/speed-of-sound/">speed of sound</a> and <a href="/science/">science calculators</a>.</p>',

  'serum-osmolality':
    '<h2>Calculated osmolality and the osmolar gap</h2>' +
    '<p><strong>Osmolality = 2 \u00d7 Na + glucose \u00f7 18 + BUN \u00f7 2.8</strong></p>' +
    '<p>Sodium 140, glucose 90, BUN 14: 280 + 5 + 5 = <strong>290 mOsm/kg</strong>, inside the usual 275\u2013295 reference range.</p>' +
    '<table><thead><tr><th>Sodium</th><th>Osmolality (glucose 90, BUN 14)</th><th>Position</th></tr></thead><tbody>' +
    '<tr><td>130</td><td>270 mOsm/kg</td><td>below range</td></tr>' +
    '<tr><td>140</td><td>290 mOsm/kg</td><td>within range</td></tr>' +
    '<tr><td>150</td><td>310 mOsm/kg</td><td>above range</td></tr>' +
    '</tbody></table>' +
    '<p>The divisors convert units: glucose 180 mg/dL is 1 mmol/L because its molecular weight is 180, and urea nitrogen is divided by 2.8 rather than 28 because BUN reports nitrogen, not urea. The <strong>osmolar gap</strong> is measured osmolality minus this calculated value; a gap above about 10 suggests osmoles the formula does not count, such as mannitol or a toxic alcohol.</p>' +
    '<p>Related: <a href="/health/anion-gap/">anion gap</a> and <a href="/health/winters-formula/">Winter\u2019s formula</a>.</p>',

  'auto-fare':
    '<h2>What an auto fare is made of</h2>' +
    '<p><strong>Fare = base fare + distance \u00d7 per-kilometre rate</strong></p>' +
    '<p>A 5 km ride at a 25 base fare and 12 per km: 25 + (5 \u00d7 12) = <strong>85</strong>.</p>' +
    '<table><thead><tr><th>Distance</th><th>Fare at base 25, 12/km</th></tr></thead><tbody>' +
    '<tr><td>2 km</td><td>49</td></tr>' +
    '<tr><td>5 km</td><td>85</td></tr>' +
    '<tr><td>10 km</td><td>145</td></tr>' +
    '<tr><td>15 km</td><td>205</td></tr>' +
    '</tbody></table>' +
    '<p>\u201cAuto fare\u201d means the metered fare for an auto-rickshaw: a flag-down charge plus a per-kilometre rate, with waiting time, luggage and night surcharges added under local rules. This calculator applies only the first two, so treat the number as the metered base rather than the final bill.</p>' +
    '<p>Related: <a href="/auto/fuel-cost/">fuel cost</a> and <a href="/auto/">auto calculators</a>.</p>',

  'winters-formula':
    '<h2>Winter\u2019s formula and what the range means</h2>' +
    '<p><strong>Expected PCO\u2082 = 1.5 \u00d7 HCO\u2083\u207b + 8, \u00b1 2 mmHg</strong></p>' +
    '<p>With a bicarbonate of 12 mEq/L: 1.5 \u00d7 12 + 8 = 26, so the expected range is <strong>24\u201328 mmHg</strong>.</p>' +
    '<table><thead><tr><th>HCO\u2083\u207b</th><th>Expected PCO\u2082</th><th>Range (\u00b12)</th></tr></thead><tbody>' +
    '<tr><td>10</td><td>23</td><td>21\u201325</td></tr>' +
    '<tr><td>12</td><td>26</td><td>24\u201328</td></tr>' +
    '<tr><td>18</td><td>35</td><td>33\u201337</td></tr>' +
    '<tr><td>24</td><td>44</td><td>42\u201346</td></tr>' +
    '</tbody></table>' +
    '<p>If the measured PCO\u2082 sits inside the range, respiratory compensation matches the metabolic acidosis. Above the range there is an added respiratory acidosis; below it, an added respiratory alkalosis. The formula is a compensation check, not a diagnosis.</p>' +
    '<p>Related: <a href="/health/anion-gap/">anion gap</a> and <a href="/health/serum-osmolality/">serum osmolality</a>.</p>',

  'ideal-body-weight':
    '<h2>The Devine formula, and what it is for</h2>' +
    '<p><strong>Men: 50 + 2.3 \u00d7 (height in inches \u2212 60)</strong> \u00b7 <strong>Women: 45.5 + 2.3 \u00d7 (height in inches \u2212 60)</strong></p>' +
    '<p>170 cm is 66.93 inches, so a man: 50 + 2.3 \u00d7 6.93 = <strong>65.9 kg</strong>; a woman: 45.5 + 15.9 = <strong>61.4 kg</strong>.</p>' +
    '<table><thead><tr><th>Height</th><th>Men (kg)</th><th>Women (kg)</th></tr></thead><tbody>' +
    '<tr><td>150 cm</td><td>47.8</td><td>43.3</td></tr>' +
    '<tr><td>160 cm</td><td>56.9</td><td>52.4</td></tr>' +
    '<tr><td>170 cm</td><td>65.9</td><td>61.4</td></tr>' +
    '<tr><td>180 cm</td><td>75.0</td><td>70.5</td></tr>' +
    '<tr><td>190 cm</td><td>84.0</td><td>79.5</td></tr>' +
    '</tbody></table>' +
    '<p>The Devine formula was written for drug dosing, where a single weight is needed to size a dose. It is not a personal target weight and it ignores frame size and muscle mass, so a BMI range is a different and usually more useful screen.</p>' +
    '<p>Related: <a href="/health/bmi/">BMI calculator</a> and <a href="/health/">health calculators</a>.</p>',

  'bond-price':
    '<h2>How a bond price is calculated</h2>' +
    '<p>A bond price is the present value of every future payment:</p>' +
    '<p><strong>Price = \u03a3 coupon \u00f7 (1 + yield)\u1d57 + face \u00f7 (1 + yield)\u207f</strong></p>' +
    '<p>$1,000 face value, 5% coupon, 4% yield, 10 years: the $50 coupons are worth $405.54 today and the face value $675.56, so the price is <strong>$1,081.11</strong>.</p>' +
    '<table><thead><tr><th>Market yield</th><th>Price</th><th>Trades at</th></tr></thead><tbody>' +
    '<tr><td>3%</td><td>$1,170.60</td><td>premium</td></tr>' +
    '<tr><td>4%</td><td>$1,081.11</td><td>premium</td></tr>' +
    '<tr><td>5%</td><td>$1,000.00</td><td>par</td></tr>' +
    '<tr><td>6%</td><td>$926.40</td><td>discount</td></tr>' +
    '</tbody></table>' +
    '<p>When the market yield is below the coupon the bond pays more than the market, so buyers pay extra and it trades at a premium; above the coupon it trades at a discount. At the same rate it is worth exactly face value. A longer maturity makes the price more sensitive to the same yield change.</p>' +
    '<p>Related: <a href="/finance/bond-yield/">bond yield</a> and <a href="/finance/yield-to-maturity/">yield to maturity</a>.</p>',

  'keyword-density':
    '<h2>Keyword density formula, and why it is a weak target</h2>' +
    '<p><strong>Density = occurrences \u00f7 total words \u00d7 100</strong></p>' +
    '<p>A 1,000-word page that uses \u201cloan calculator\u201d 10 times: 10 \u00f7 1,000 \u00d7 100 = <strong>1.0%</strong>.</p>' +
    '<table><thead><tr><th>Occurrences in 1,000 words</th><th>Density</th></tr></thead><tbody>' +
    '<tr><td>5</td><td>0.5%</td></tr>' +
    '<tr><td>10</td><td>1.0%</td></tr>' +
    '<tr><td>20</td><td>2.0%</td></tr>' +
    '<tr><td>30</td><td>3.0%</td></tr>' +
    '</tbody></table>' +
    '<p>The 1\u20133% band is an SEO convention, not a published ranking rule; Google has said there is no ideal keyword density. Use the number to catch accidental repetition, not as a quota to fill: a phrase repeated to hit a percentage reads worse and does not rank better. The useful check is whether the page answers the query in the first paragraph, not how often the phrase appears.</p>' +
    '<p>Related: <a href="/tech/reading-grade/">reading grade</a> and <a href="/tech/">tech calculators</a>.</p>',

  'wall-area':
    '<h2>How to calculate wall area</h2>' +
    '<p><strong>Net wall area = length \u00d7 height \u2212 doors \u2212 windows</strong></p>' +
    '<p>A 10 m wall at 3 m high is 30 m\u00b2 gross; minus a 2 m\u00b2 door and 3 m\u00b2 of window, the net area is <strong>25 m\u00b2</strong>.</p>' +
    '<table><thead><tr><th>Gross area</th><th>Openings</th><th>Net area</th></tr></thead><tbody>' +
    '<tr><td>30 m\u00b2</td><td>5 m\u00b2</td><td>25 m\u00b2</td></tr>' +
    '<tr><td>40 m\u00b2</td><td>6 m\u00b2</td><td>34 m\u00b2</td></tr>' +
    '<tr><td>50 m\u00b2</td><td>8 m\u00b2</td><td>42 m\u00b2</td></tr>' +
    '</tbody></table>' +
    '<p>Deduct the openings once, not per coat: paint is estimated from the net area, then multiplied by the number of coats. At 10 m\u00b2 per litre per coat, 25 m\u00b2 needs 2.5 L for one coat and 5 L for two. Measure each wall separately if the lengths differ, and add gable triangles as half of base \u00d7 height.</p>' +
    '<p>Related: <a href="/construction/paint-quantity/">paint quantity</a> and <a href="/construction/drywall/">drywall sheets</a>.</p>',

  'leap-year':
    '<h2>How a leap year is calculated</h2>' +
    '<p>A year is a leap year if it is <strong>divisible by 4</strong>, unless it is <strong>divisible by 100 but not by 400</strong>.</p>' +
    '<table><thead><tr><th>Year</th><th>\u00f74</th><th>\u00f7100</th><th>\u00f7400</th><th>Result</th></tr></thead><tbody>' +
    '<tr><td>2024</td><td>yes</td><td>no</td><td>no</td><td>leap \u2014 366 days</td></tr>' +
    '<tr><td>2026</td><td>no</td><td>no</td><td>no</td><td>common \u2014 365 days</td></tr>' +
    '<tr><td>1900</td><td>yes</td><td>yes</td><td>no</td><td>common \u2014 365 days</td></tr>' +
    '<tr><td>2000</td><td>yes</td><td>yes</td><td>yes</td><td>leap \u2014 366 days</td></tr>' +
    '</tbody></table>' +
    '<p>The 100 rule exists because a solar year is 365.2422 days, slightly less than 365.25; skipping three century leap years every 400 years removes the drift. Leap years add 29 February, which is why a 29 February birthday only recurs on the calendar in leap years.</p>' +
    '<p>Related: <a href="/guides/age">age calculator guide</a> and <a href="/everyday/">everyday calculators</a>.</p>',

  'class-rank':
    '<h2>How class rank is actually calculated</h2>' +
    '<p>A school ranks by counting, not by averaging: <strong>rank = 1 + number of students with a higher GPA</strong>, and <strong>percentile = (1 \u2212 rank \u00f7 class size) \u00d7 100</strong>.</p>' +
    '<p>This calculator estimates instead. It maps the gap between your GPA and the class average onto a 0\u2013100 scale, assuming 0.5 GPA spans the range. A 3.7 GPA against a 3.2 average in a class of 200 gives the top 1%, or rank 2.</p>' +
    '<table><thead><tr><th>GPA (average 3.2)</th><th>Estimated percentile</th><th>Rank in 200</th></tr></thead><tbody>' +
    '<tr><td>3.20</td><td>100th</td><td>200</td></tr>' +
    '<tr><td>3.45</td><td>50th</td><td>100</td></tr>' +
    '<tr><td>3.60</td><td>20th</td><td>40</td></tr>' +
    '<tr><td>3.70</td><td>1st</td><td>2</td></tr>' +
    '</tbody></table>' +
    '<p>Treat the estimate as a planning shortcut. Schools usually rank on weighted GPA, may exclude or weight specific courses, and some rank only the top decile or not at all, so the official figure comes from the transcript.</p>' +
    '<p>Related: <a href="/education/gpa/">GPA calculator</a> and <a href="/education/grade-needed/">grade needed</a>.</p>',
};

if (typeof module !== 'undefined' && module.exports) module.exports = TOOL_ENHANCE;
if (typeof window !== 'undefined') window.TOOL_ENHANCE = TOOL_ENHANCE;

// ---------- runtime injector (browser only) ----------
// The SSG bakes the enhancement into the prerendered HTML, but renderTool()/
// renderExplain() replace #mainContent on hydration — so re-attach it client
// side. Re-runs on every SPA navigation via a MutationObserver, and is
// idempotent (bails when the section is already present).
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function toolIdFromPath() {
    var m = (location.pathname || '').match(/^\/[a-z0-9-]+\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : null;
  }

  function inject() {
    var id = toolIdFromPath();
    if (!id || !TOOL_ENHANCE[id]) return;
    var area = document.getElementById('explain-area');
    if (!area || area.querySelector('.tool-enhance')) return;
    var card = area.querySelector('.explain-card') || area;
    var div = document.createElement('div');
    div.className = 'tool-enhance';
    // Content is authored in this file (trusted), so innerHTML is intentional.
    div.innerHTML = TOOL_ENHANCE[id];
    // Pehle ye `appendChild` tha, yani card us explain-block ke *aakhir* mein
    // baithta tha — aur us block mein aakhir mein FAQ hota hai. Nateeja: SSG
    // ka prerender card ko aeo ke baad rakhta tha, magar hydration ke baad user
    // usay FAQ ke baad dekhta tha (crawler aur reader ka order alag). Ab card
    // block ke shuru mein jaata hai, is liye dono order ek jaise hain.
    card.prepend(div);
  }

  function start() {
    var target = document.getElementById('mainContent') || document.body;
    if (!target) return;
    new MutationObserver(inject).observe(target, { childList: true, subtree: true });
    inject();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
