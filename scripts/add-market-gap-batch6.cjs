#!/usr/bin/env node
// Market-gap batch 6 — more regional tools (Part 1 item 8: reinforce the
// Regional differentiation). Gold value, Eid Qurbani cost, Umrah cost,
// remittance fee, property stamp duty (India/Pakistan) and school fee
// inflation. Deterministic models with worked examples and disclaimers.
// ESCAPING: prose avoids apostrophes and the dollar-digit sequence.
'use strict';
const LIB = require('./lib/market-gap-lib.cjs');
const { insertTools, selfCheck, buildSeo, insertSeo, selfCheckSeo, addContracts } = LIB;

const T0 = [
  {
    id: 'gold-price', cat: 'regional',
    name: 'Gold Price and Value Calculator',
    desc: 'Value gold by weight and price per gram, adding making charges, with tola and gram conversions.',
    kw: 'gold price calculator, gold value calculator, tola to gram gold, gold rate per gram value',
    inputs: [
      { id: 'weightGrams', label: 'Weight (grams)', type: 'number', def: 50 },
      { id: 'pricePerGram', label: 'Gold price per gram', type: 'number', def: 75 },
      { id: 'makingPct', label: 'Making charges (percent)', type: 'number', def: 5 }
    ],
    calc: function (v) {
      var base = v.weightGrams * v.pricePerGram;
      var making = base * v.makingPct / 100;
      var total = base + making;
      var tola = v.weightGrams / 11.6638;
      return {
        result: 'Gold value: ' + total.toFixed(0),
        chart: Charts.bar([base, making], ['Gold value', 'Making charges']),
        extra: 'Metal ' + base.toFixed(0) + ' | Making ' + making.toFixed(0) + ' | ' + v.weightGrams + ' grams = ' + tola.toFixed(2) + ' tola | Confirm the live rate and purity before dealing'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Multiply the weight in grams by the price per gram for the metal value.',
        'Step 2: Add making charges as a percentage of the metal value for jewellery.',
        'Step 3: One tola is about 11.6638 grams, so grams divided by that gives the weight in tola.',
        'Step 4: Purity matters: 24 karat is pure, while 22 karat is about 91.6 percent and 18 karat about 75 percent, so adjust the price accordingly.',
        'Step 5: Gold rates move constantly, so use the current rate and confirm the purity stamp before any sale.'
      ];
    }
  },
  {
    id: 'qurbani-cost', cat: 'regional',
    name: 'Qurbani Cost Calculator',
    desc: 'Total the cost of Eid al-Adha Qurbani from the number of animals and their prices, including cow shares.',
    kw: 'qurbani cost calculator, eid al adha cost, qurbani animal price, cow share cost eid',
    inputs: [
      { id: 'sheepCount', label: 'Sheep or goats', type: 'number', def: 1 },
      { id: 'sheepPrice', label: 'Price per sheep or goat', type: 'number', def: 350 },
      { id: 'cowShares', label: 'Cow shares (1 to 7 per cow)', type: 'number', def: 0 },
      { id: 'cowSharePrice', label: 'Price per cow share', type: 'number', def: 550 }
    ],
    calc: function (v) {
      var sheep = v.sheepCount * v.sheepPrice;
      var cows = v.cowShares * v.cowSharePrice;
      var total = sheep + cows;
      return {
        result: 'Qurbani total cost: ' + total.toFixed(0),
        chart: Charts.bar([sheep, cows], ['Sheep and goats', 'Cow shares']),
        extra: 'Sheep and goats ' + sheep.toFixed(0) + ' | Cow shares ' + cows.toFixed(0) + ' | One cow serves seven shares and one sheep or goat serves one person'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Multiply the number of sheep and goats by their price.',
        'Step 2: Multiply the number of cow shares by the share price; a cow has seven shares.',
        'Step 3: Add the two for the total Qurbani cost.',
        'Step 4: One sheep or goat counts for one person and a cow share counts for one person, so match the numbers to your household and any intended charity.',
        'Step 5: Prices vary by market and season, so check local rates closer to Eid.'
      ];
    }
  },
  {
    id: 'umrah-cost', cat: 'regional',
    name: 'Umrah Cost Calculator',
    desc: 'Estimate the total cost of an Umrah trip from package level, travellers, flights, visa, hotel nights and transport.',
    kw: 'umrah cost calculator, umrah package cost, umrah trip budget, umrah expense estimator',
    inputs: [
      { id: 'packageType', label: 'Package level', type: 'select', options: ['Economy', 'Standard', 'Premium'], def: 'Economy' },
      { id: 'people', label: 'Travellers', type: 'number', def: 2 },
      { id: 'flights', label: 'Return flight per person', type: 'number', def: 700 },
      { id: 'visa', label: 'Visa and fees per person', type: 'number', def: 150 },
      { id: 'hotelPerNight', label: 'Hotel per night', type: 'number', def: 80 },
      { id: 'nights', label: 'Nights', type: 'number', def: 10 },
      { id: 'transport', label: 'Local transport per person', type: 'number', def: 200 }
    ],
    calc: function (v) {
      var mult = v.packageType === 'Premium' ? 1.8 : v.packageType === 'Standard' ? 1.3 : 1;
      var per = (v.flights + v.visa + v.transport) * mult + v.hotelPerNight * v.nights;
      var total = per * v.people;
      return {
        result: 'Estimated Umrah cost: ' + total.toFixed(0),
        chart: Charts.bar([v.flights * v.people, v.hotelPerNight * v.nights * v.people, v.visa * v.people + v.transport * v.people], ['Flights', 'Hotel', 'Other']),
        extra: v.packageType + ' | Per person ' + per.toFixed(0) + ' | ' + v.people + ' travellers for ' + v.nights + ' nights | Excludes shopping, food and insurance'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Add flights, visa fees and local transport per person.',
        'Step 2: Apply the package multiplier: economy 1.0, standard 1.3, premium 1.8.',
        'Step 3: Add the hotel cost, which is the nightly rate times the nights.',
        'Step 4: Multiply the per-person total by the number of travellers.',
        'Step 5: Prices swing with season, especially in Ramadan, so book early and add a margin for food, shopping and insurance.'
      ];
    }
  },
  {
    id: 'remittance-fee', cat: 'regional',
    name: 'Remittance Fee Calculator',
    desc: 'See how much a recipient actually gets after flat fees, percentage fees and the exchange-rate margin.',
    kw: 'remittance fee calculator, money transfer cost, exchange rate margin calculator, how much does transfer cost',
    inputs: [
      { id: 'amount', label: 'Amount you send', type: 'number', def: 1000 },
      { id: 'feeFlat', label: 'Flat fee', type: 'number', def: 5 },
      { id: 'feePct', label: 'Transfer fee (percent)', type: 'number', def: 1 },
      { id: 'fxMarginPct', label: 'Exchange rate margin (percent)', type: 'number', def: 2 }
    ],
    calc: function (v) {
      var pctFee = v.amount * v.feePct / 100;
      var fxMargin = v.amount * v.fxMarginPct / 100;
      var cost = v.feeFlat + pctFee + fxMargin;
      var recipient = v.amount - cost;
      return {
        result: 'Recipient receives: ' + recipient.toFixed(0),
        chart: Charts.bar([v.feeFlat, pctFee, fxMargin], ['Flat fee', 'Percent fee', 'FX margin']),
        extra: 'Total cost ' + cost.toFixed(0) + ' | Effective cost ' + (cost / v.amount * 100).toFixed(2) + ' percent | The FX margin is often the hidden cost'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Add the flat fee, which does not change with the amount.',
        'Step 2: Add the percentage fee on the amount sent.',
        'Step 3: Add the exchange-rate margin, the gap between the mid-market rate and the rate offered.',
        'Step 4: Subtract the total cost from the amount to find what the recipient actually gets.',
        'Step 5: The FX margin is often larger than the visible fee, so compare the received amount, not the advertised fee.'
      ];
    }
  },
  {
    id: 'stamp-duty', cat: 'finance',
    name: 'Property Stamp Duty Calculator',
    desc: 'Estimate property transfer stamp duty for India and Pakistan from the property value and buyer category.',
    kw: 'stamp duty calculator, property registration charges, stamp duty india, stamp duty pakistan',
    inputs: [
      { id: 'country', label: 'Country', type: 'select', options: ['India', 'Pakistan'], def: 'India' },
      { id: 'propertyValue', label: 'Property value', type: 'number', def: 5000000 },
      { id: 'buyer', label: 'Buyer category', type: 'select', options: ['Male', 'Female', 'Joint'], def: 'Male' }
    ],
    calc: function (v) {
      var rate;
      if (v.country === 'Pakistan') rate = 0.03;
      else rate = v.buyer === 'Female' ? 0.04 : 0.06;
      var duty = v.propertyValue * rate;
      return {
        result: 'Estimated stamp duty: ' + duty.toFixed(0),
        chart: Charts.donut([duty, Math.max(0, v.propertyValue - duty)], ['Duty', 'Balance']),
        extra: v.country + ' | Effective rate ' + (rate * 100).toFixed(1) + ' percent | Registration and other charges may apply on top'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Identify the jurisdiction, since stamp duty is set locally and varies by state or province.',
        'Step 2: Determine the buyer category, as some places offer a lower rate for female buyers.',
        'Step 3: Apply the rate to the property value: this example uses 6 percent for male buyers in India, 4 percent for female, and 3 percent in Pakistan.',
        'Step 4: Registration fees, transfer tax and other charges may add to the total.',
        'Step 5: Rates and concessions change and vary by locality, so confirm with the local registration authority before you commit.'
      ];
    }
  },
  {
    id: 'school-fee-inflation', cat: 'education',
    name: 'School Fee Inflation Calculator',
    desc: 'Project future school or college fees from today fees, an annual increase and the number of years.',
    kw: 'school fee inflation calculator, future tuition cost, education fee projection, fee increase calculator',
    inputs: [
      { id: 'currentAnnualFee', label: 'Current annual fee', type: 'number', def: 3000 },
      { id: 'inflationPct', label: 'Annual fee increase (percent)', type: 'number', def: 8 },
      { id: 'years', label: 'Years of schooling', type: 'number', def: 12 }
    ],
    calc: function (v) {
      var r = v.inflationPct / 100;
      var finalFee = v.currentAnnualFee * Math.pow(1 + r, v.years);
      var total = r === 0 ? v.currentAnnualFee * v.years : v.currentAnnualFee * (Math.pow(1 + r, v.years) - 1) / r;
      return {
        result: 'Fee in final year: ' + Math.round(finalFee),
        chart: Charts.bar([v.currentAnnualFee, Math.round(finalFee), Math.round(total)], ['This year', 'Final year', 'Total paid']),
        extra: 'Total over ' + v.years + ' years ' + Math.round(total) + ' | Assumes ' + v.inflationPct + ' percent a year | Start saving early to spread the cost'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Convert the annual increase to a decimal rate.',
        'Step 2: The fee in the final year is the current fee times one plus the rate, raised to the number of years.',
        'Step 3: The total paid is the sum of each year growing fee, given by the geometric series formula.',
        'Step 4: Compare the final-year fee with today to see how much fees climb over a full course.',
        'Step 5: Fee increases vary by school and can be raised without notice, so keep a margin and revisit the estimate each year.'
      ];
    }
  }
];

// stamp-duty already exists in the registry (regional.js), so it is dropped
// here to avoid a duplicate id.
const T = T0.filter(function (t) { return t.id !== 'stamp-duty'; });

const EXPECTED = [
  ['gold-price', { weightGrams: 50, pricePerGram: 75, makingPct: 5 }, 'Gold value: 3938'],
  ['qurbani-cost', { sheepCount: 1, sheepPrice: 350, cowShares: 0, cowSharePrice: 550 }, 'Qurbani total cost: 350'],
  ['umrah-cost', { packageType: 'Economy', people: 2, flights: 700, visa: 150, hotelPerNight: 80, nights: 10, transport: 200 }, 'Estimated Umrah cost: 3700'],
  ['remittance-fee', { amount: 1000, feeFlat: 5, feePct: 1, fxMarginPct: 2 }, 'Recipient receives: 965'],
  ['school-fee-inflation', { currentAnnualFee: 3000, inflationPct: 8, years: 12 }, 'Fee in final year: 7555']
];

const S = {
  'gold-price': {
    title: 'Gold Price and Value Calculator',
    metaDesc: 'Value gold by weight and price per gram, add making charges, and convert grams to tola with purity guidance.',
    lsi: ['gold price calculator', 'gold value calculator', 'tola to gram gold', 'gold rate per gram value'],
    what: 'It values gold from the weight and price per gram, adds making charges for jewellery, and converts grams to tola.',
    inputsText: 'the weight in grams, the price per gram and a making-charge percentage.',
    outputText: 'the total gold value, split into metal value and making charges, plus the weight in tola.',
    methodText: 'weight times price per gram, plus making charges as a percentage of the metal value.',
    quick: 'Fifty grams at seventy-five per gram is 3,750 of metal, and adding five percent making charges gives about 3,938, which is about 4.29 tola.',
    body: 'Gold is priced by weight and purity, and the trick is to keep the metal value separate from the jewellery markup. This tool multiplies the weight in grams by the price per gram to get the metal value, then adds making charges as a percentage for jewellery. It also converts grams to tola, since one tola is about 11.6638 grams and gold is commonly quoted in tola across South Asia and the Gulf. Purity is the missing piece in most estimates: 24 karat is pure, 22 karat is about 91.6 percent and 18 karat about 75 percent, so a piece sold as 22 karat should be priced on that lower pure content, not the 24 karat rate. Buy-back prices are typically below the sale price, and shops use their own live rate. Use the current rate, check the hallmark, and treat the result as an estimate before any sizeable transaction.',
    formula: 'Metal value = weight in grams x price per gram. Making charges = metal value x making percent / 100. Total = metal value + making charges. Tola = grams / 11.6638.',
    example: 'For 50 grams at 75 per gram, the metal value is 3,750. A five percent making charge adds 187.5, so the total is about 3,938, and 50 grams is about 4.29 tola.',
    mistakes: ['Valuing 22 karat jewellery at the 24 karat rate, which overstates it by roughly eight percent.', 'Forgetting making charges, which are a real and often large part of the price.', 'Confusing the sale price with the buy-back price, which is usually lower.'],
    assumptions: 'A single price per gram is used and the karat purity is not applied automatically, so adjust the price for the purity of the piece. Buy-back spreads, taxes and shop-specific rates are excluded.',
    disclaimer: 'This is an educational estimate, not investment advice. Gold prices move constantly, so use the current live rate and confirm purity and charges with the dealer before buying or selling.',
    related: [
      { href: '/regional/zakat-calculator', text: 'Zakat Calculator', note: 'gold is part of a zakatable estate' },
      { href: '/regional/qurbani-cost', text: 'Qurbani Cost Calculator' },
      { href: '/regional/remittance-fee', text: 'Remittance Fee Calculator' }
    ],
    howAnswer: 'Metal value is the weight times the price per gram, making charges are a percentage of that, and the two are added while grams convert to tola. The steps panel shows each part.',
    needAnswer: 'The weight in grams, the current price per gram and any making-charge percentage.',
    resultAnswer: 'The total gold value split into metal value and making charges, with the weight in tola.',
    extraFaqs: [
      ['How many grams are in a tola?', 'One tola is about 11.6638 grams. Gold is often quoted per tola in South Asia and per gram elsewhere, so convert before comparing prices.'],
      ['Why is 22 karat gold worth less than 24 karat?', 'Because it contains less pure gold, about 91.6 percent. Jewellery is usually 22 karat for strength, so its metal value is based on the lower pure content.']],
    contractInputs: 'Weight (grams); Price per gram; Making charges percent',
    contractFormula: 'base = weight * pricePerGram; making = base * makingPct/100; total = base + making; tola = weight / 11.6638'
  },
  'qurbani-cost': {
    title: 'Qurbani Cost Calculator',
    metaDesc: 'Total the cost of Eid al-Adha Qurbani from the number of sheep and cow shares, with the share rules explained.',
    lsi: ['qurbani cost calculator', 'eid al adha cost', 'qurbani animal price', 'cow share cost eid'],
    what: 'It totals the cost of Qurbani from the number of sheep or goats and cow shares and their prices.',
    inputsText: 'the number and price of sheep or goats and the number and price of cow shares.',
    outputText: 'the total Qurbani cost split between sheep and cow shares.',
    methodText: 'sheep count times price plus cow shares times share price.',
    quick: 'One sheep at 350 and no cow shares gives a Qurbani cost of 350. A cow has seven shares, so a full cow is seven share prices.',
    body: 'Qurbani at Eid al-Adha is a well-defined obligation, and the costs are simple to total once you know the rules. A sheep or goat serves one person, and a cow or camel has seven shares, each share serving one person. This tool multiplies the number of sheep and goats by their price and the number of cow shares by the share price, then adds them. Families often combine a cow share with another household, which spreads the cost, while a full cow covers seven shares. Prices rise sharply as Eid approaches, so booking early and splitting a cow can save a great deal. If you intended an animal for a specific person or for charity, match the head count to the shares you buy. Add any transport, slaughter and distribution costs on top, since those are not part of the animal price.',
    formula: 'Total = (sheep count x sheep price) + (cow shares x cow share price), where a cow or camel has seven shares.',
    example: 'One sheep at 350 with no cow shares costs 350. If instead you buy three cow shares at 550 each, that part is 1,650, and a full cow of seven shares is 3,850.',
    mistakes: ['Buying more shares than there are people to count, which is not required.', 'Waiting until the last days, when prices can jump sharply.', 'Forgetting transport, slaughter and distribution costs, which sit outside the animal price.'],
    assumptions: 'The model counts only the animal and share prices. Transport, slaughter, skinning and distribution costs are excluded, and local prices vary by market and season.',
    disclaimer: 'This is a budgeting estimate, not religious guidance. Confirm the share rules and the correct number of animals for your household with a qualified scholar, and check local prices before Eid.',
    related: [
      { href: '/regional/zakat-calculator', text: 'Zakat Calculator' },
      { href: '/finance/hajj-cost', text: 'Hajj Cost Calculator' },
      { href: '/regional/gold-price', text: 'Gold Price and Value Calculator' }
    ],
    howAnswer: 'Sheep and goats are multiplied by their price, cow shares by the share price, and the two totals are added. The steps panel explains the share rules.',
    needAnswer: 'The number and price of sheep or goats and the number and price of cow shares.',
    resultAnswer: 'The total Qurbani cost split between sheep and goats and cow shares.',
    extraFaqs: [
      ['How many shares does a cow have?', 'A cow or camel has seven shares, and each share counts for one person. A sheep or goat counts for one person on its own.'],
      ['Can several families share one cow?', 'Yes, commonly. The seven shares can be split between households, which spreads the cost while meeting the obligation for each person counted.']],
    contractInputs: 'Sheep or goats (number); Price per sheep or goat (number); Cow shares (number); Price per cow share (number)',
    contractFormula: 'sheep = sheepCount*sheepPrice; cows = cowShares*cowSharePrice; total = sheep + cows'
  },
  'umrah-cost': {
    title: 'Umrah Cost Calculator',
    metaDesc: 'Estimate the total cost of an Umrah trip from package level, travellers, flights, visa, hotel nights and local transport.',
    lsi: ['umrah cost calculator', 'umrah package cost', 'umrah trip budget', 'umrah expense estimator'],
    what: 'It estimates the total Umrah cost from the package level, the number of travellers and the main cost lines.',
    inputsText: 'the package level, travellers, flights, visa fees, hotel rate, nights and local transport.',
    outputText: 'the total estimated cost and the per-person cost.',
    methodText: 'flights, visa and transport per person scaled by the package level, plus hotel per night, across travellers.',
    quick: 'Two travellers on an economy package with 700 flights, 150 visa, 200 transport and ten nights at 80 come to about 3,700 in total, or 1,850 each.',
    body: 'An Umrah trip has a handful of cost lines, and they vary hugely with season and package. This tool adds flights, visa fees and local transport per person, applies a package multiplier for the standard of the trip, adds the hotel cost for the nights you stay, and multiplies by the number of travellers. Economy uses a multiplier of one, standard 1.3 and premium 1.8, reflecting better hotels and service. Hotel cost dominates for longer stays, and availability in the holy cities pushes rates up sharply during Ramadan and school holidays. Travellers often forget food, shopping, insurance and the costs of getting to the departure airport, so add a margin. Booking early and travelling in the quieter months are the two biggest levers on the total. Confirm current visa rules, which have changed frequently in recent years, before you budget.',
    formula: 'Per person = (flights + visa + transport) x package multiplier + hotel per night x nights. Total = per person x travellers. Multipliers: economy 1.0, standard 1.3, premium 1.8.',
    example: 'Two travellers on economy with flights of 700, visa 150, transport 200 and ten nights at 80 a night come to a per-person cost of 1,850 and a total of about 3,700, before food and shopping.',
    mistakes: ['Booking in Ramadan without checking the holiday surcharge and hotel availability.', 'Forgetting food, insurance and shopping, which can add substantially.', 'Ignoring the cost of getting to the departure city and any currency risk on the fare.'],
    assumptions: 'Flights, visa and transport are per person and the hotel rate is flat per night. Food, shopping, insurance, local travel within the cities and peak-season surcharges are excluded, and visa rules may change.',
    disclaimer: 'This is a budgeting estimate, not travel or religious advice. Prices and rules change often, so confirm current figures with a licensed operator and the relevant authority before booking.',
    related: [
      { href: '/finance/hajj-cost', text: 'Hajj Cost Calculator' },
      { href: '/regional/qurbani-cost', text: 'Qurbani Cost Calculator' },
      { href: '/finance/moving-abroad-cost', text: 'Moving Abroad Cost Estimator' }
    ],
    howAnswer: 'Flights, visa and transport are added per person, scaled by the package level, then the hotel cost for the nights is added and multiplied by travellers. The steps panel shows each part.',
    needAnswer: 'The package level, number of travellers, flights, visa fees, hotel nightly rate, nights and local transport.',
    resultAnswer: 'The total estimated Umrah cost and the per-person cost, before food and shopping.',
    extraFaqs: [
      ['When is Umrah most expensive?', 'Ramadan and the last ten days especially, plus school holidays. Travelling in the quieter months can cut the hotel and flight cost significantly.'],
      ['What is usually left out of package prices?', 'Food, shopping, travel insurance and sometimes local transport. Add a margin for these so the budget is realistic.']],
    contractInputs: 'Package level (select); Travellers (number); Return flight per person (number); Visa and fees per person (number); Hotel per night (number); Nights (number); Local transport per person (number)',
    contractFormula: 'mult: economy 1, standard 1.3, premium 1.8; per = (flights + visa + transport) * mult + hotelPerNight * nights; total = per * people'
  },
  'remittance-fee': {
    title: 'Remittance Fee Calculator',
    metaDesc: 'See how much a recipient actually gets after flat fees, percentage fees and the hidden exchange-rate margin.',
    lsi: ['remittance fee calculator', 'money transfer cost', 'exchange rate margin calculator', 'cost to send money abroad'],
    what: 'It shows how much a recipient receives after flat fees, percentage fees and the exchange-rate margin are deducted.',
    inputsText: 'the amount sent, a flat fee, a percentage fee and the exchange-rate margin.',
    outputText: 'the amount the recipient receives and the effective total cost percentage.',
    methodText: 'the amount minus the flat fee, the percentage fee and the FX margin.',
    quick: 'Sending 1,000 with a 5 flat fee, one percent fee and a two percent exchange margin leaves the recipient about 965, an effective cost of 3.5 percent.',
    body: 'The true cost of sending money abroad is rarely just the headline fee. Three charges usually apply: a flat fee per transfer, a percentage fee on the amount, and an exchange-rate margin, which is the gap between the mid-market rate and the rate the provider offers. The margin is often the largest and the least visible, because it is baked into the rate rather than shown as a fee. This tool adds all three and shows what the recipient actually gets, which is the only number that matters for comparison. A provider advertising no fee can be more expensive than one charging a fee but using a near mid-market rate, so always compare the received amount. Fees matter more on small transfers and margins matter more on large ones. Batch transfers, regular transfers and transfers to a bank account often beat instant cash pick-up on cost, so weigh speed against price.',
    formula: 'Cost = flat fee + amount x fee percent / 100 + amount x FX margin percent / 100. Recipient receives = amount minus cost. Effective cost percent = cost / amount x 100.',
    example: 'Sending 1,000 with a 5 flat fee, a one percent fee and a two percent exchange margin costs 5 plus 10 plus 20, which is 35. The recipient gets 965, an effective cost of 3.5 percent.',
    mistakes: ['Comparing headline fees and ignoring the exchange-rate margin.', 'Sending several small transfers instead of one larger one, which multiplies the flat fee.', 'Not checking what the recipient actually receives once converted into local currency.'],
    assumptions: 'The amount sent is fixed and all charges are deducted from the transfer. Bank-to-bank timing, receiving fees at the destination bank and currency timing are not modelled.',
    disclaimer: 'This is an educational estimate, not financial advice. Fees and rates change and vary by provider and corridor, so compare the amount received and confirm terms before sending.',
    related: [
      { href: '/regional/gold-price', text: 'Gold Price and Value Calculator' },
      { href: '/finance/moving-abroad-cost', text: 'Moving Abroad Cost Estimator' },
      { href: '/finance/cosigning-loan-risk', text: 'Cosigning a Loan Risk Calculator' }
    ],
    howAnswer: 'The flat fee, the percentage fee and the exchange margin are added, then subtracted from the amount to show what the recipient gets. The steps panel lists each charge.',
    needAnswer: 'The amount you send, the flat fee, the percentage fee and the exchange-rate margin.',
    resultAnswer: 'The amount the recipient receives and the effective total cost as a percentage of the amount sent.',
    extraFaqs: [
      ['What is the exchange-rate margin?', 'It is the gap between the mid-market rate and the rate the provider gives you. It is often the largest cost in a transfer and is hidden inside the exchange rate.'],
      ['Are cheap transfers always best?', 'Not always, because speed, reliability and payout options matter too. But for regular remittances, comparing the amount received is the quickest way to cut cost.']],
    contractInputs: 'Amount you send (number); Flat fee (number); Transfer fee percent (number); Exchange rate margin percent (number)',
    contractFormula: 'cost = feeFlat + amount*feePct/100 + amount*fxMarginPct/100; recipient = amount - cost'
  },
  'stamp-duty': {
    title: 'Property Stamp Duty Calculator',
    metaDesc: 'Estimate property transfer stamp duty for India and Pakistan from the property value and buyer category.',
    lsi: ['stamp duty calculator', 'property registration charges', 'stamp duty india', 'stamp duty pakistan'],
    what: 'It estimates the stamp duty on a property transfer in India or Pakistan from the value and buyer category.',
    inputsText: 'the country, the property value and the buyer category.',
    outputText: 'the estimated stamp duty and the effective rate.',
    methodText: 'the property value multiplied by the applicable rate for the jurisdiction and buyer.',
    quick: 'A five million property in India bought by a male buyer at six percent attracts about 300,000 of stamp duty; female buyers often get a lower rate and Pakistan is much lower.',
    body: 'Stamp duty is a tax on the transfer of a property and is one of the larger transaction costs a buyer faces. It is set locally, so the rate depends on the state or province and sometimes the city, and many places offer a concession for female buyers. This tool applies representative rates: six percent for male buyers in India, four percent for female buyers, and three percent in Pakistan. The property value used should be the higher of the consideration actually paid and the government circle or ready-reckoner value, which is a common trap, because authorities tax the higher figure. Registration fees, transfer tax and sometimes a surcharge add to the total, and the seller often has a separate capital gains liability. Rates change in every budget, so confirm the current rate with the local registration authority before you commit.',
    formula: 'Stamp duty = property value x rate, where the rate is 6 percent for male buyers in India, 4 percent for female buyers in India, and 3 percent in Pakistan. A joint purchase usually uses the higher male rate.',
    example: 'A five million property in India bought by a male buyer attracts about 300,000 of stamp duty at six percent. The same property bought by a female buyer attracts about 200,000 at four percent.',
    mistakes: ['Using the price paid rather than the higher circle or ready-reckoner value, which is what tax is based on.', 'Forgetting registration fees and other charges that sit on top of stamp duty.', 'Assuming the rate is national when it is usually set by the state or province.'],
    assumptions: 'Representative national rates are used and state or provincial variation, concessions by locality, surcharges and registration fees are not modelled. The value entered is assumed to be the taxable value.',
    disclaimer: 'This is an educational estimate, not legal, tax or property advice. Stamp duty rules vary by state and province and change often, so confirm the exact figure with the registration authority before transacting.',
    related: [
      { href: '/finance/inheritance-tax-uk-india', text: 'Inheritance Tax Calculator (UK and India)' },
      { href: '/homegarden/homeowner-first-year-budget', text: 'First-Year Homeowner Cost Calculator' },
      { href: '/finance/power-of-attorney-cost', text: 'Power of Attorney and Will Cost Estimator' }
    ],
    howAnswer: 'The property value is multiplied by the rate for the country and buyer category. The steps panel explains how the rate is chosen.',
    needAnswer: 'The country, the property value and the buyer category.',
    resultAnswer: 'The estimated stamp duty and the effective rate, before registration and other charges.',
    extraFaqs: [
      ['Do female buyers pay less stamp duty?', 'In several Indian states, yes, with a lower rate for female buyers. The concession varies by state, so confirm locally.'],
      ['Is stamp duty based on the price I pay?', 'Usually on the higher of the price paid and the government circle or ready-reckoner value, so a below-market price does not reduce the tax.']],
    contractInputs: 'Country (select); Property value (number); Buyer category (select)',
    contractFormula: 'rate = Pakistan ? 0.03 : (female ? 0.04 : 0.06); duty = propertyValue * rate'
  },
  'school-fee-inflation': {
    title: 'School Fee Inflation Calculator',
    metaDesc: 'Project future school or college fees from today fees, an annual increase and the years ahead, with the total cost.',
    lsi: ['school fee inflation calculator', 'future tuition cost', 'education fee projection', 'fee increase calculator'],
    what: 'It projects future education fees from a current fee, an annual increase and the number of years, and totals the cost.',
    inputsText: 'the current annual fee, the annual fee increase and the number of years.',
    outputText: 'the fee in the final year and the total paid across the years.',
    methodText: 'the current fee compounded by the annual increase for the final year, and the sum of the growing fees for the total.',
    quick: 'A fee of 3,000 rising at eight percent a year reaches about 7,555 in the twelfth year, and the total across twelve years is about 56,931.',
    body: 'Education costs rise faster than general inflation almost everywhere, which makes long-term planning harder than a simple multiplication. This tool compounds the current fee by the annual increase to show what the final year will cost, and sums each year growing fee to show the total across the whole course. The difference is striking: a modest eight percent annual rise roughly doubles fees in about nine years and more than doubles them in twelve. Starting to save early spreads the cost and gives compounding investments time to work. The model assumes the same fee each year adjusted only for the increase, so it ignores one-off admission, exam and activity charges, and it ignores boarding, transport and uniforms. Fee increases can also be raised without much notice, so keep a margin and revisit the projection every year.',
    formula: 'Fee in final year = current fee x (1 + rate)^years. Total paid = current fee x ((1 + rate)^years minus 1) / rate.',
    example: 'A current fee of 3,000 rising at eight percent a year reaches about 7,555 in year twelve. The total across the twelve years is about 56,931, far above twelve times today fee.',
    mistakes: ['Multiplying today fee by the years and missing the compounding entirely.', 'Assuming fees rise with general inflation, when education often rises faster.', 'Forgetting one-off admission, exam, activity and boarding costs.'],
    assumptions: 'One annual fee per year is assumed, rising at the same rate each year, with no one-off charges, sibling discounts or boarding. Fees are nominal and inflation is not separated out.',
    disclaimer: 'This is an educational projection, not financial advice. Fee increases vary by school and can change without notice, so verify current fees and revisit the plan each year.',
    related: [
      { href: '/education/scholarship-gap', text: 'Scholarship Funding Gap Calculator' },
      { href: '/education/study-abroad-cost', text: 'Study Abroad Cost Calculator' },
      { href: '/education/student-loan-vs-scholarship', text: 'Student Loan vs Scholarship Calculator' }
    ],
    howAnswer: 'The current fee compounds by the annual increase to give the final year, and the geometric series gives the total across the years. The steps panel shows each part.',
    needAnswer: 'The current annual fee, the expected annual fee increase and the number of years of schooling.',
    resultAnswer: 'The fee in the final year and the total paid across all the years, at the assumed increase.',
    extraFaqs: [
      ['Why do school fees rise faster than inflation?', 'Staff costs, facilities and demand push fees up, and many schools raise them above general inflation. That is why long-term planning should use a realistic increase.'],
      ['How can I prepare for rising fees?', 'Start saving early so compounding works for you, compare the total cost across schools, and revisit the projection each year as fees change.']],
    contractInputs: 'Current annual fee (number); Annual fee increase percent (number); Years of schooling (number)',
    contractFormula: 'finalFee = currentAnnualFee * (1+r)^years; total = currentAnnualFee * ((1+r)^years - 1)/r (or currentAnnualFee*years if r=0)'
  }
};

// ---- run ----
const inserted = insertTools(T);
console.log('inserted tools:', inserted);

const toolBad = selfCheck(T, EXPECTED);
if (toolBad.length) { console.error('TOOL SELF-CHECK FAILED:\n' + toolBad.join('\n')); process.exit(1); }
console.log('tool self-check: all ' + EXPECTED.length + ' PASS');

const entries = T.map(function (t) { return buildSeo(Object.assign({ id: t.id, cat: t.cat }, S[t.id])); });
const seoInserted = insertSeo(entries);
console.log('seo entries inserted:', seoInserted);

const seoBad = selfCheckSeo(entries);
if (seoBad.length) { console.error('SEO SELF-CHECK FAILED:\n' + seoBad.join('\n')); process.exit(1); }
console.log('seo self-check: all ' + entries.length + ' PASS');

const contractItems = T.map(function (t) {
  const s = S[t.id];
  return { id: t.id, name: t.name, cat: t.cat, contractInputs: s.contractInputs, contractFormula: s.contractFormula };
});
const res = addContracts(contractItems, 'market-gap batch 6 — regional reinforcement');
console.log('qa contracts added:', res.added, 'total:', res.total);
