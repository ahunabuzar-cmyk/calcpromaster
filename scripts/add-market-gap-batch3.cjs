#!/usr/bin/env node
// Market-gap batch 3 — religious/cultural (Part 1 item 4), legal/admin
// (Part 1 item 5 + Part 2 items 24-26), visa/immigration points (Part 1
// item 7 + Part 2 items 13-14). Deterministic models with documented
// formulas, worked examples and disclaimers. Idempotent via the shared
// library (comma-safe insertion).
// ESCAPING: prose avoids apostrophes and the dollar-digit sequence.
'use strict';
const LIB = require('./lib/market-gap-lib.cjs');
const { insertTools, selfCheck, buildSeo, insertSeo, selfCheckSeo, addContracts } = LIB;

const T = [
  {
    id: 'prayer-time', cat: 'regional',
    name: 'Prayer Time Calculator',
    desc: 'Location-based Islamic prayer times from the sun position and a chosen calculation method.',
    kw: 'prayer time calculator, salah times calculator, fajr maghrib time, islamic prayer times by city',
    inputs: [
      { id: 'city', label: 'City', type: 'select', options: ['Karachi', 'Lahore', 'Islamabad', 'Delhi', 'Mumbai', 'Dhaka', 'Dubai', 'Riyadh', 'Jeddah', 'Istanbul', 'Cairo', 'London', 'Birmingham', 'Manchester', 'New York', 'Toronto', 'Sydney', 'Kuala Lumpur', 'Jakarta'], def: 'Karachi' },
      { id: 'date', label: 'Date', type: 'date', def: '' },
      { id: 'method', label: 'Calculation method', type: 'select', options: ['MWL', 'ISNA', 'Egypt', 'Karachi'], def: 'MWL' },
      { id: 'asr', label: 'Asr shadow length', type: 'select', options: ['Standard', 'Hanafi'], def: 'Standard' }
    ],
    calc: function (v) {
      var C = { 'Karachi': [24.86, 67.01, 5], 'Lahore': [31.55, 74.34, 5], 'Islamabad': [33.69, 73.06, 5], 'Delhi': [28.61, 77.21, 5.5], 'Mumbai': [19.08, 72.88, 5.5], 'Dhaka': [23.81, 90.41, 6], 'Dubai': [25.20, 55.27, 4], 'Riyadh': [24.71, 46.68, 3], 'Jeddah': [21.49, 39.19, 3], 'Istanbul': [41.01, 28.98, 3], 'Cairo': [30.04, 31.24, 2], 'London': [51.51, -0.13, 0], 'Birmingham': [52.49, -1.90, 0], 'Manchester': [53.48, -2.24, 0], 'New York': [40.71, -74.01, -4], 'Toronto': [43.65, -79.38, -4], 'Sydney': [-33.87, 151.21, 10], 'Kuala Lumpur': [3.14, 101.69, 8], 'Jakarta': [-6.21, 106.85, 7] };
      var c = C[v.city];
      if (!c) return { result: 'Select a supported city', chart: '', extra: '' };
      var parts = String(v.date || '').split('-');
      var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), da = parseInt(parts[2], 10);
      var d = (y && mo && da) ? new Date(y, mo - 1, da) : new Date();
      var start = new Date(d.getFullYear(), 0, 1);
      var N = Math.floor((d - start) / 86400000) + 1;
      var dec = (23.45 * Math.sin(2 * Math.PI * (284 + N) / 365)) * Math.PI / 180;
      var Bb = 2 * Math.PI * (N - 81) / 364;
      var eot = 9.87 * Math.sin(2 * Bb) - 7.53 * Math.cos(Bb) - 1.5 * Math.sin(Bb);
      var lat = c[0] * Math.PI / 180, lng = c[1], tz = c[2];
      var noon = 12 - lng / 15 + tz - eot / 60;
      function ha(altDeg) { var alt = altDeg * Math.PI / 180; var x = (Math.sin(alt) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec)); if (x < -1 || x > 1) return null; return Math.acos(x) * 180 / Math.PI / 15; }
      var A = ({ 'MWL': [18, 17], 'ISNA': [15, 15], 'Egypt': [19.5, 17.5], 'Karachi': [18, 18] })[v.method] || [18, 17];
      var fajr = ha(-A[0]); var sr = ha(-0.833); var isha = ha(-A[1]);
      var shadow = v.asr === 'Hanafi' ? 2 : 1;
      var asrAlt = Math.atan(1 / (shadow + Math.tan(Math.abs(lat - dec)))) * 180 / Math.PI;
      var asr = ha(asrAlt);
      function hm(h) { if (h == null) return '--:--'; h = ((h % 24) + 24) % 24; var hh = Math.floor(h); var mm = Math.round((h - hh) * 60); if (mm === 60) { mm = 0; hh = (hh + 1) % 24; } return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
      if (fajr == null || isha == null || asr == null) return { result: 'The sun does not reach the required angle on this date at this location.', chart: '', extra: 'Try a different calculation method, a different city, or a season when the sun rises higher.' };
      var fajrT = noon - fajr, sunT = noon - sr, dhuhrT = noon, asrT = noon + asr, maghribT = noon + sr, ishaT = noon + isha;
      return {
        result: 'Fajr ' + hm(fajrT) + ' | Dhuhr ' + hm(dhuhrT) + ' | Asr ' + hm(asrT) + ' | Maghrib ' + hm(maghribT) + ' | Isha ' + hm(ishaT),
        chart: Charts.bar([fajrT, dhuhrT, asrT, maghribT, ishaT], ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']),
        extra: 'Sunrise ' + hm(sunT) + ' | ' + v.city + ' | ' + v.method + ' method, ' + v.asr + ' Asr | Times are approximate and should be confirmed with your local mosque'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Look up the latitude, longitude and timezone for ' + v.city + '.',
        'Step 2: Work out the solar declination and the equation of time for the date.',
        'Step 3: Solar noon = 12 minus longitude divided by 15 plus the timezone offset, corrected by the equation of time.',
        'Step 4: Fajr and Isha use the sun depression angle for the ' + v.method + ' method, and Asr uses the ' + v.asr + ' shadow length.',
        'Step 5: Convert each solar time to local clock time. Confirm the result with your local mosque before relying on it.'
      ];
    }
  },
  {
    id: 'mirath-calculator', cat: 'regional',
    name: 'Islamic Inheritance Calculator',
    desc: 'Simplified Mirath (faraid) share estimate for spouse, parents, sons and daughters.',
    kw: 'islamic inheritance calculator, mirath calculator, faraid shares calculator, inheritance share islam',
    inputs: [
      { id: 'estate', label: 'Net estate', type: 'number', def: 100000 },
      { id: 'spouse', label: 'Spouse', type: 'select', options: ['Wife', 'Husband', 'None'], def: 'Wife' },
      { id: 'sons', label: 'Sons', type: 'number', def: 1 },
      { id: 'daughters', label: 'Daughters', type: 'number', def: 0 },
      { id: 'father', label: 'Father alive', type: 'checkbox', def: true },
      { id: 'mother', label: 'Mother alive', type: 'checkbox', def: true }
    ],
    calc: function (v) {
      var net = v.estate;
      var sons = Math.max(0, Math.round(v.sons));
      var daughters = Math.max(0, Math.round(v.daughters));
      var hasChildren = sons > 0 || daughters > 0;
      var sp = 0;
      if (v.spouse === 'Husband') sp = hasChildren ? 0.25 : 0.5;
      else if (v.spouse === 'Wife') sp = hasChildren ? 0.125 : 0.25;
      var mother = v.mother ? (hasChildren ? 1 / 6 : 1 / 3) : 0;
      var father = (v.father && sons > 0) ? 1 / 6 : 0;
      var residue = 1 - sp - mother - father;
      if (residue < 0) residue = 0;
      var sSons = 0, sDaughters = 0;
      if (sons > 0) {
        var units = sons * 2 + daughters;
        sSons = residue * (sons * 2) / units;
        sDaughters = residue * daughters / units;
      } else if (daughters > 0) {
        sDaughters = residue;
      } else if (v.father) {
        father += residue;
      }
      var children = sSons + sDaughters;
      return {
        result: 'Spouse ' + (sp * net).toFixed(0) + ' | Children ' + (children * net).toFixed(0),
        chart: Charts.donut([sp, mother, father, children], ['Spouse', 'Mother', 'Father', 'Children']),
        extra: 'Shares: spouse ' + (sp * 100).toFixed(1) + ' percent | mother ' + (mother * 100).toFixed(1) + ' | father ' + (father * 100).toFixed(1) + ' | children ' + (children * 100).toFixed(1) + ' | Simplified model, confirm with a scholar'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Deduct funeral costs and debts first; this tool starts from the net estate you enter.',
        'Step 2: The spouse takes one eighth of the net estate when there are children, or one quarter when there are none.',
        'Step 3: The mother takes one sixth when there are children, or one third when there are none.',
        'Step 4: The father takes one sixth when there are sons, otherwise he is a residuary heir.',
        'Step 5: The children share the residue, with a son receiving twice the share of a daughter.',
        'Step 6: This is a simplified model. Full faraid also covers grandfathers, siblings, awl and radd, so confirm the final shares with a qualified scholar.'
      ];
    }
  },
  {
    id: 'hijri-converter', cat: 'regional',
    name: 'Hijri Gregorian Date Converter',
    desc: 'Convert between the Gregorian and Hijri (Islamic) calendars using the tabular arithmetic calendar.',
    kw: 'hijri date converter, gregorian to hijri, islamic calendar converter, hijri to gregorian',
    inputs: [
      { id: 'direction', label: 'Direction', type: 'select', options: ['Gregorian to Hijri', 'Hijri to Gregorian'], def: 'Gregorian to Hijri' },
      { id: 'date', label: 'Gregorian date', type: 'date', def: '' },
      { id: 'hy', label: 'Hijri year', type: 'number', def: 1448 },
      { id: 'hm', label: 'Hijri month (1-12)', type: 'number', def: 1 },
      { id: 'hd', label: 'Hijri day (1-30)', type: 'number', def: 1 }
    ],
    calc: function (v) {
      function gregToJD(y, m, d) { if (m < 3) { y--; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
      function jdToHijri(jd) { jd += 0.5; var l = jd - 1948440 + 10632; var n = Math.floor((l - 1) / 10631); l = l - 10631 * n + 354; var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238)); l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29; var m = Math.floor((24 * l) / 709); var d = l - Math.floor((709 * m) / 24); return { y: 30 * n + j - 30, m: m, d: d }; }
      function hijriToJD(y, m, d) { return Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m - Math.floor((m - 1) / 2) + d + 1948440 - 385; }
      function jdToGreg(jd) { jd += 0.5; var z = Math.floor(jd); var a = z; if (z >= 2299161) { var al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); } var b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d2 = Math.floor(365.25 * c), e = Math.floor((b - d2) / 30.6001); var dy = b - d2 - Math.floor(30.6001 * e); var mo = (e < 14) ? e - 1 : e - 13; var yr = (mo > 2) ? c - 4716 : c - 4715; return { y: yr, m: mo, d: dy }; }
      function pad(n) { return (n < 10 ? '0' : '') + n; }
      if (v.direction === 'Hijri to Gregorian') {
        var hy = Math.round(v.hy), hm = Math.round(v.hm), hd = Math.round(v.hd);
        if (hm < 1 || hm > 12 || hd < 1 || hd > 30) return { result: 'Enter a Hijri month 1-12 and a day 1-30', chart: '', extra: '' };
        var g = jdToGreg(hijriToJD(hy, hm, hd));
        return { result: 'Hijri ' + hy + '-' + pad(hm) + '-' + pad(hd) + ' = Gregorian ' + g.y + '-' + pad(g.m) + '-' + pad(g.d), chart: Charts.gauge(hm, 12), extra: 'Tabular arithmetic Islamic calendar; observed dates can differ by a day depending on moon sighting' };
      }
      var parts = String(v.date || '').split('-');
      var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), da = parseInt(parts[2], 10);
      if (!y || !mo || !da) { var now = new Date(); y = now.getFullYear(); mo = now.getMonth() + 1; da = now.getDate(); }
      var h = jdToHijri(gregToJD(y, mo, da));
      return { result: 'Gregorian ' + y + '-' + pad(mo) + '-' + pad(da) + ' = Hijri ' + h.y + '-' + pad(h.m) + '-' + pad(h.d), chart: Charts.gauge(h.m, 12), extra: 'Tabular arithmetic Islamic calendar; observed dates can differ by a day depending on moon sighting' };
    },
    steps: function (v) {
      return [
        'Step 1: Convert the Gregorian date to a Julian day number using the standard civil calendar formula.',
        'Step 2: Shift into the Islamic epoch and work out the 30-year cycle and the year within it.',
        'Step 3: Find the month and day within the Hijri year using the tabular arithmetic rule.',
        'Step 4: The reverse direction uses the same arithmetic in reverse, from the Hijri year, month and day to the Gregorian date.',
        'Step 5: Religious dates are usually confirmed by moon sighting, so observed dates can differ by a day.'
      ];
    }
  },
  {
    id: 'alimony-estimator', cat: 'family',
    name: 'Alimony and Spousal Support Estimator',
    desc: 'Rough monthly spousal support estimate from the income gap, length of marriage and children.',
    kw: 'alimony calculator, spousal support estimator, monthly alimony estimate, divorce support calculator',
    inputs: [
      { id: 'payerIncome', label: 'Higher earner monthly income', type: 'number', def: 6000 },
      { id: 'recipientIncome', label: 'Lower earner monthly income', type: 'number', def: 2000 },
      { id: 'years', label: 'Years married', type: 'number', def: 10 },
      { id: 'children', label: 'Children', type: 'number', def: 0 }
    ],
    calc: function (v) {
      var diff = v.payerIncome - v.recipientIncome;
      if (diff <= 0) return { result: 'No support indicated: the payer does not earn more', chart: '', extra: 'These estimates assume the higher earner pays the lower earner' };
      var rate = 0.2 + 0.02 * Math.min(v.years, 15);
      var boost = v.children > 0 ? 1.1 : 1;
      var monthly = diff * rate * boost;
      var cap = 0.4 * v.payerIncome;
      if (monthly > cap) monthly = cap;
      var duration = Math.min(v.years, 15) * 0.4;
      return {
        result: 'Estimated monthly support: ' + monthly.toFixed(0),
        chart: Charts.bar([diff, monthly], ['Income gap', 'Support']),
        extra: 'Suggested duration about ' + duration.toFixed(1) + ' years | Capped at 40 percent of payer income | State and country rules vary widely, this is a rough guide only'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Find the income gap: ' + v.payerIncome + ' minus ' + v.recipientIncome + ' = ' + (v.payerIncome - v.recipientIncome) + '.',
        'Step 2: A common guideline pays a share of that gap, rising with the length of the marriage: about 40 percent after ten years here.',
        'Step 3: Add roughly a tenth when there are children.',
        'Step 4: Cap the result at about 40 percent of the payer income for reasonableness.',
        'Step 5: Duration is often set near 40 percent of the marriage length, but courts decide the real figure and every jurisdiction differs.'
      ];
    }
  },
  {
    id: 'statute-of-limitations', cat: 'everyday',
    name: 'Statute of Limitations Date Calculator',
    desc: 'Deadline date for common claim types from the incident date and the typical time limit.',
    kw: 'statute of limitations calculator, claim deadline calculator, time limit to sue, legal filing deadline',
    inputs: [
      { id: 'claimType', label: 'Claim type', type: 'select', options: ['Personal injury', 'Contract dispute', 'Debt recovery', 'Property damage', 'Medical malpractice', 'Defamation', 'Workers compensation'], def: 'Personal injury' },
      { id: 'incidentDate', label: 'Incident date', type: 'date', def: '' }
    ],
    calc: function (v) {
      var map = { 'Personal injury': 2, 'Contract dispute': 6, 'Debt recovery': 6, 'Property damage': 3, 'Medical malpractice': 2, 'Defamation': 1, 'Workers compensation': 2 };
      var yrs = map[v.claimType] || 2;
      var parts = String(v.incidentDate || '').split('-');
      var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), da = parseInt(parts[2], 10);
      if (!y || !mo || !da) return { result: 'Enter the incident date', chart: '', extra: '' };
      var deadline = new Date(y + yrs, mo - 1, da);
      function pad(n) { return (n < 10 ? '0' : '') + n; }
      var ds = deadline.getFullYear() + '-' + pad(deadline.getMonth() + 1) + '-' + pad(deadline.getDate());
      return {
        result: 'File by ' + ds,
        chart: Charts.gauge(yrs, 10),
        extra: v.claimType + ' is commonly limited to ' + yrs + ' year(s) in many jurisdictions | Illustrative only, confirm your local rule and any discovery rule'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Identify the claim type, which sets the typical limitation period.',
        'Step 2: Start the clock on the incident date, or on the date the harm was discovered in many jurisdictions.',
        'Step 3: Add the period for the claim type. Many US states use two years for personal injury and six years for contract.',
        'Step 4: Some claims have shorter or longer special rules, and deadlines can be paused for minors.',
        'Step 5: This is an illustrative guide only. Confirm the real deadline with a qualified lawyer in your jurisdiction.'
      ];
    }
  },
  {
    id: 'canada-crs', cat: 'career',
    name: 'Canada CRS Score Estimator',
    desc: 'Simplified Express Entry CRS core points estimate from age, education, language and work.',
    kw: 'canada crs calculator, express entry crs estimator, immigration points calculator canada, pr points canada',
    inputs: [
      { id: 'age', label: 'Age', type: 'number', def: 30 },
      { id: 'education', label: 'Education', type: 'select', options: ['Secondary', 'One-year post-secondary', 'Two-year post-secondary', 'Bachelors', 'Two or more certificates', 'Masters', 'Doctoral'], def: 'Bachelors' },
      { id: 'clb', label: 'First official language CLB', type: 'number', def: 9 },
      { id: 'canadianWorkYears', label: 'Canadian skilled work years', type: 'number', def: 1 },
      { id: 'foreignWorkYears', label: 'Foreign skilled work years', type: 'number', def: 3 }
    ],
    calc: function (v) {
      var age = Math.round(v.age);
      var agePts = 0;
      if (age >= 18 && age <= 44) {
        if (age === 18) agePts = 90;
        else if (age === 19) agePts = 95;
        else if (age <= 29) agePts = 110;
        else { var t = { 30: 105, 31: 99, 32: 94, 33: 88, 34: 83, 35: 77, 36: 72, 37: 66, 38: 61, 39: 55, 40: 50, 41: 39, 42: 28, 43: 17, 44: 6 }; agePts = t[age] || 0; }
      }
      var eduPts = ({ 'Secondary': 30, 'One-year post-secondary': 90, 'Two-year post-secondary': 98, 'Bachelors': 120, 'Two or more certificates': 128, 'Masters': 135, 'Doctoral': 150 })[v.education] || 0;
      var clb = Math.round(v.clb);
      var per = clb < 4 ? 0 : clb <= 5 ? 6 : clb === 6 ? 8 : clb === 7 ? 16 : clb === 8 ? 22 : clb === 9 ? 29 : 32;
      var langPts = per * 4;
      var cw = Math.round(v.canadianWorkYears);
      var workPts = cw >= 5 ? 80 : cw >= 4 ? 72 : cw >= 3 ? 64 : cw >= 2 ? 53 : cw >= 1 ? 40 : 0;
      var fw = Math.round(v.foreignWorkYears);
      var foreignPts = fw >= 2 ? 25 : fw >= 1 ? 13 : 0;
      var total = agePts + eduPts + langPts + workPts + foreignPts;
      return {
        result: 'Estimated CRS core: ' + total + ' points',
        chart: Charts.bar([agePts, eduPts, langPts, workPts + foreignPts], ['Age', 'Education', 'Language', 'Work']),
        extra: 'Age ' + agePts + ' | Education ' + eduPts + ' | Language ' + langPts + ' | Canadian work ' + workPts + ' | Foreign work ' + foreignPts + ' | Core human capital only, skill transferability and additional points not included'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Age points peak at 110 for ages 20 to 29 and fall each year after 30.',
        'Step 2: Education points run from 30 for secondary up to 150 for a doctorate.',
        'Step 3: Language points are awarded per ability at CLB level, here ' + v.clb + ' across four abilities.',
        'Step 4: Canadian skilled work experience adds up to 80 points at five years or more; foreign experience adds a smaller amount.',
        'Step 5: Add the parts. The full CRS also includes skill transferability, spouse factors and additional points, so treat this as a core estimate only.'
      ];
    }
  },
  {
    id: 'australia-pr-points', cat: 'career',
    name: 'Australia PR Points Calculator',
    desc: 'Simplified skilled migration points estimate for age, English, qualifications and experience.',
    kw: 'australia pr points calculator, skilled migration points, australia immigration points test, subclass 189 points',
    inputs: [
      { id: 'age', label: 'Age', type: 'number', def: 30 },
      { id: 'english', label: 'English level', type: 'select', options: ['Competent', 'Proficient', 'Superior'], def: 'Proficient' },
      { id: 'qualification', label: 'Qualification', type: 'select', options: ['Diploma', 'Bachelors', 'Masters', 'Doctorate'], def: 'Bachelors' },
      { id: 'overseasYears', label: 'Overseas skilled work years', type: 'number', def: 5 },
      { id: 'australianYears', label: 'Australian skilled work years', type: 'number', def: 0 },
      { id: 'partner', label: 'Partner status', type: 'select', options: ['Single', 'Partner skilled', 'Partner not skilled'], def: 'Single' }
    ],
    calc: function (v) {
      var age = Math.round(v.age);
      var agePts = (age >= 25 && age <= 32) ? 30 : (age >= 18 && age <= 24) ? 25 : (age >= 33 && age <= 39) ? 25 : (age >= 40 && age <= 44) ? 15 : 0;
      var engPts = v.english === 'Superior' ? 20 : v.english === 'Proficient' ? 10 : 0;
      var qualPts = ({ 'Diploma': 10, 'Bachelors': 15, 'Masters': 15, 'Doctorate': 20 })[v.qualification] || 0;
      var ov = Math.round(v.overseasYears);
      var ovPts = ov >= 8 ? 15 : ov >= 5 ? 10 : ov >= 3 ? 5 : 0;
      var au = Math.round(v.australianYears);
      var auPts = au >= 8 ? 20 : au >= 5 ? 15 : au >= 3 ? 10 : au >= 1 ? 5 : 0;
      var partnerPts = v.partner === 'Partner not skilled' ? 0 : 10;
      var total = agePts + engPts + qualPts + ovPts + auPts + partnerPts;
      return {
        result: 'Estimated points: ' + total,
        chart: Charts.bar([agePts, engPts, qualPts, ovPts + auPts, partnerPts], ['Age', 'English', 'Qualification', 'Experience', 'Partner']),
        extra: 'Age ' + agePts + ' | English ' + engPts + ' | Qualification ' + qualPts + ' | Overseas ' + ovPts + ' | Australian ' + auPts + ' | Partner ' + partnerPts + ' | The skilled visa threshold is generally 65 points'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Age awards 30 points between 25 and 32, 25 points at 18 to 24 and 33 to 39, and 15 points at 40 to 44.',
        'Step 2: English awards 10 points for proficient and 20 for superior.',
        'Step 3: Qualifications award 10 for a diploma, 15 for a degree or masters, and 20 for a doctorate.',
        'Step 4: Skilled work experience awards points by years, with Australian experience worth more than overseas.',
        'Step 5: Partner and single status add 10 points. Add the parts, and remember the visa threshold is generally 65 points.'
      ];
    }
  },
  {
    id: 'power-of-attorney-cost', cat: 'finance',
    name: 'Power of Attorney and Will Cost Estimator',
    desc: 'Planning cost estimate for wills, power of attorney and trust documents by route and complexity.',
    kw: 'power of attorney cost, will writing cost, estate document cost estimator, living trust cost',
    inputs: [
      { id: 'docType', label: 'Document', type: 'select', options: ['Simple will', 'Complex will', 'Power of attorney', 'Living trust'], def: 'Simple will' },
      { id: 'route', label: 'Preparation route', type: 'select', options: ['Online service', 'Local lawyer', 'Specialist firm'], def: 'Online service' },
      { id: 'complexity', label: 'Complexity', type: 'select', options: ['Simple', 'Moderate', 'Complex'], def: 'Simple' }
    ],
    calc: function (v) {
      var base = ({ 'Simple will': 150, 'Complex will': 600, 'Power of attorney': 120, 'Living trust': 1500 })[v.docType] || 150;
      var routeF = v.route === 'Online service' ? 0.5 : v.route === 'Specialist firm' ? 1.8 : 1;
      var cxF = v.complexity === 'Simple' ? 1 : v.complexity === 'Moderate' ? 1.5 : 2.4;
      var est = base * routeF * cxF;
      return {
        result: 'Estimated cost: ' + est.toFixed(0),
        chart: Charts.bar([est * 0.7, est, est * 1.4], ['Low', 'Mid', 'High']),
        extra: 'Typical range ' + (est * 0.7).toFixed(0) + ' to ' + (est * 1.4).toFixed(0) + ' | Base ' + base + ' x route factor ' + routeF + ' x complexity factor ' + cxF + ' | Forms alone are cheaper but a lawyer review reduces the risk of an invalid document'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Start from a base cost for the document type: a simple will is cheapest, a living trust the most involved.',
        'Step 2: Apply the preparation route. An online service is roughly half a local lawyer, a specialist firm close to double.',
        'Step 3: Apply the complexity factor. Moderate adds about half again, complex more than double.',
        'Step 4: Estimated cost = ' + v.docType + ' base x route x complexity.',
        'Step 5: Shop around and read reviews. An invalid or ambiguous document costs far more to fix than a careful one costs to prepare.'
      ];
    }
  }
];

const S = {
  'prayer-time': {
    title: 'Prayer Time Calculator: Location-Based Salah Times',
    metaDesc: 'Estimate the five daily Islamic prayer times, Fajr, Dhuhr, Asr, Maghrib and Isha, from your city and date using standard sun-angle methods.',
    lsi: ['prayer time calculator', 'salah times calculator', 'fajr maghrib time', 'islamic prayer times by city'],
    what: 'It estimates the five daily prayer times for a chosen city and date, using the sun position and a standard calculation method, so you have a printable schedule without installing an app.',
    inputsText: 'a city, a date, a calculation method and the Asr shadow length.',
    outputText: 'the five prayer times in local clock time, plus sunrise.',
    methodText: 'solar declination and the equation of time give solar noon, and sun depression angles give Fajr, Isha and the other times.',
    quick: 'Prayer times shift with the seasons because they follow the sun. A shorter Fajr-to-Isha window in summer means very early Fajr and late Isha, which is why the method you choose changes the result by a few minutes.',
    body: 'Prayer times are astronomical, not fixed. The sun crosses local solar noon at Dhuhr, sets at Maghrib, and reaches specific angles below the horizon for Fajr and Isha, and the whole schedule moves a little every day. This tool takes a city, a date and a calculation method and returns the five daily times. The calculation method sets how far below the horizon the sun must dip for Fajr and Isha: the Muslim World League uses 18 and 17 degrees, ISNA 15 and 15, the Egyptian authority 19.5 and 17.5, and the University of Islamic Sciences in Karachi 18 and 18. Asr depends on shadow length: the standard school uses a shadow equal to the object height plus the noon shadow, while the Hanafi school uses twice the height, making Asr later.',
    formula: 'Solar noon = 12 minus longitude divided by 15 plus the timezone offset, corrected by the equation of time. For each angle, the hour angle H satisfies cos H = (sin(altitude) minus sin(latitude) sin(declination)) divided by cos(latitude) cos(declination), and the time is solar noon plus or minus H divided by 15. Fajr and Isha use a negative altitude equal to the method angle; Asr uses the altitude where the shadow equals the chosen multiple of the object height.',
    example: 'Karachi on 21 June at the Muslim World League method gives Fajr 04:14, sunrise 05:43, Dhuhr 12:33, Asr 15:55, Maghrib 19:24 and Isha 20:48. The same city in winter gives a much tighter day, because the sun rises later and sets earlier.',
    mistakes: ['Using a single method for a city where the local mosque follows a different one, then finding a small mismatch.', 'Forgetting daylight saving, which shifts the clock by an hour even though the sun position has not changed.', 'Assuming the tool can anchor to the true local horizon, whereas a flat angle ignores hills and buildings that delay sunrise or advance sunset.'],
    assumptions: 'City coordinates and timezone offsets are approximate, and the calculator ignores elevation, local horizon and daylight saving. High latitudes can return no valid Fajr or Isha in summer, which the tool reports instead of guessing.',
    disclaimer: 'These times are a planning aid only. Always follow the timetable of your local mosque or recognised authority for worship, since small method and horizon differences change the accepted time.',
    related: [
      { href: '/regional/hijri-converter', text: 'Hijri Gregorian Date Converter', note: 'check the Islamic date alongside the times' },
      { href: '/regional/zakat-calculator', text: 'Zakat Calculator', note: 'the other pillar calculation many users need' },
      { href: '/regional/mirath-calculator', text: 'Islamic Inheritance Calculator' }
    ],
    howAnswer: 'Solar noon is found from longitude, timezone and the equation of time, then each prayer is placed at a sun angle: a depression angle for Fajr and Isha, a shadow length for Asr, and the horizon for Maghrib. The steps panel shows the sequence.',
    needAnswer: 'A city, a date, a calculation method and the Asr shadow length. All the coordinates and timezones are built in.',
    resultAnswer: 'The five prayer times in local clock time plus sunrise, rounded to the nearest minute and based on the method you selected.',
    extraFaqs: [
      ['Which prayer time calculation method should I use?', 'Follow your local mosque. The Muslim World League is a common default, while the Karachi method is widely used in South Asia and ISNA in North America.'],
      ['Why are the times slightly different from my mosque timetable?', 'Mosques allow for local horizon, elevation, daylight saving and their own method. This tool is a close estimate, not the final authority your mosque publishes.']
    ],
    contractInputs: 'City (select); Date (date); Calculation method (select); Asr shadow length (select)',
    contractFormula: 'Solar noon = 12 - longitude/15 + timezone - equationOfTime/60; hour angle H = acos((sin(alt) - sin(lat)sin(dec)) / (cos(lat)cos(dec))); Fajr/Isha at method depression angle, Asr at arctan(1/(shadow + tan(lat - dec))), Maghrib at -0.833 degrees'
  },
  'mirath-calculator': {
    title: 'Islamic Inheritance Calculator: Mirath Shares',
    metaDesc: 'Estimate Mirath (faraid) shares for spouse, parents, sons and daughters from the net estate, with a clear note that scholars confirm final shares.',
    lsi: ['islamic inheritance calculator', 'mirath calculator', 'faraid shares calculator', 'inheritance share islam'],
    what: 'It estimates the main faraid shares, spouse, mother, father and children, from the net estate, so you can see roughly how the estate divides before consulting a scholar.',
    inputsText: 'the net estate, the spouse, the number of sons and daughters, and whether the parents are alive.',
    outputText: 'the shares for the spouse and children in money, plus a percentage breakdown.',
    methodText: 'fixed Quranic shares for the spouse, mother and father, with the residue split among children at two shares for a son to one for a daughter.',
    quick: 'With a wife, one son and both parents alive, a net estate of 100,000 divides roughly as spouse 12,500, mother 16,667, father 16,667 and the son 54,167. A qualified scholar should confirm the final shares.',
    body: 'Islamic inheritance, or faraid, is a precise system. Some heirs take fixed shares set out in the Quran, and the rest is distributed as residue to the closest male relatives. This tool models the most common case: a spouse, a mother, a father and children. The spouse takes one quarter or one eighth depending on whether there are children, the mother takes one third or one sixth on the same basis, and the father takes one sixth when there are sons or becomes a residuary heir when there are none. The children then share the residue, with each son receiving twice the share of each daughter. It is deliberately simple: real faraid also covers grandfathers, grandmothers, siblings, awl (proportional reduction) and radd (return of surplus), so use this as an overview and confirm with a scholar.',
    formula: 'Spouse share = 1/4 (husband, no children), 1/8 (wife, children), 1/2 (husband, no children), 1/4 (wife, no children). Mother = 1/3 with no children, 1/6 with children. Father = 1/6 when there are sons, else residuary. Residue = 1 minus the fixed shares, split among children so each son gets two units and each daughter one.',
    example: 'A net estate of 100,000 with a wife, one son, and both parents alive. The wife takes one eighth, 12,500. The mother takes one sixth, 16,667. The father takes one sixth, 16,667. The residue is 54,166 and the single son takes all of it, giving spouse 12,500 and the son 54,167 with rounding.',
    mistakes: ['Distributing the gross estate before debts and funeral costs, which must be paid first.', 'Ignoring a valid will, which can only cover up to one third of the estate.', 'Assuming this simplified model matches every family, when grandparents, siblings and awl change the outcome.'],
    assumptions: 'Debts, funeral costs and any wasiyyah up to one third are assumed already deducted from the net estate you enter. Only spouse, parents and children are modelled, with no awl, radd, grandparents or siblings.',
    disclaimer: 'This is an educational estimate, not a legal or religious ruling. Faraid has many cases this model does not cover, so confirm the final distribution with a qualified Islamic scholar or an authorised inheritance office.',
    related: [
      { href: '/regional/zakat-calculator', text: 'Zakat Calculator', note: 'the other major Islamic financial calculation' },
      { href: '/family/inheritance-estate', text: 'Inheritance and Estate Calculator' },
      { href: '/family/child-support-split', text: 'Child Support Split Calculator' }
    ],
    howAnswer: 'Fixed Quranic shares are assigned to the spouse, mother and father, then the remaining residue is divided among the children at two shares for a son to one for a daughter. The steps panel lists each stage.',
    needAnswer: 'The net estate after debts, the spouse, the number of sons and daughters, and whether each parent is alive.',
    resultAnswer: 'The spouse and children shares in money, plus a percentage breakdown of every modelled heir.',
    extraFaqs: [
      ['What is the difference between fixed shares and residue?', 'Fixed shares are set amounts named in the Quran, such as the spouse one quarter or one eighth. Residue is whatever remains, and it goes to the closest male relatives or is shared among the children.'],
      ['Does a will override faraid?', 'Only within limits. A Muslim may bequeath up to one third of the estate to non-heirs, while the rest follows faraid rules.']
    ],
    contractInputs: 'Net estate (number); Spouse (select); Sons (number); Daughters (number); Father alive (checkbox); Mother alive (checkbox)',
    contractFormula: 'Spouse share fixed (1/8 or 1/4 wife, 1/4 or 1/2 husband); mother 1/6 with children else 1/3; father 1/6 when sons exist else residuary; residue split among children at 2:1 son:daughter'
  },
  'hijri-converter': {
    title: 'Hijri Gregorian Date Converter',
    metaDesc: 'Convert any Gregorian date to the Hijri (Islamic) calendar and back, using the tabular arithmetic calendar with a clear note on moon sighting.',
    lsi: ['hijri date converter', 'gregorian to hijri', 'islamic calendar converter', 'hijri to gregorian'],
    what: 'It converts dates between the Gregorian and Hijri calendars in either direction, using the tabular arithmetic method used in many civil applications.',
    inputsText: 'a direction, and either a Gregorian date or a Hijri year, month and day.',
    outputText: 'the date in the other calendar.',
    methodText: 'both calendars are converted through a Julian day number, using the standard arithmetic Hijri calendar.',
    quick: 'The Gregorian date 4 October 2026 is 21 Rabi al-Thani 1448 in the arithmetic Hijri calendar. Observed dates can differ by a day because religious months begin at moon sighting.',
    body: 'The Hijri calendar is lunar, with twelve months of 29 or 30 days and a year about eleven days shorter than the solar year, which is why Islamic dates drift earlier each Gregorian year. Converting between the two is arithmetic: the Gregorian date becomes a Julian day number, then the Hijri date is derived from the Islamic epoch using a 30-year cycle of leap years. This tool uses the tabular arithmetic calendar, the same method used in many civil and software calendars. It does not use sighting data, so a religious date may land one day earlier or later than your local announcement.',
    formula: 'Julian day from the Gregorian date uses the standard civil formula with the century correction. The Hijri date is found from the Julian day minus the Islamic epoch, divided into 30-year cycles and years with the tabular leap-year rule, then the month and day from a fixed month-length pattern.',
    example: '4 October 2026 Gregorian converts to 1448-04-21 Hijri. Going the other way, 1 Muharram 1448 converts to 17 June 2026, and 1 Muharram 1447 to 27 June 2025, matching the roughly eleven-day annual drift.',
    mistakes: ['Treating the result as the officially observed date, when moon sighting can shift it by a day.', 'Switching the direction select and then reading the wrong date.', 'Assuming the Islamic New Year is a fixed Gregorian date, when it moves about eleven days earlier every year.'],
    assumptions: 'The arithmetic (tabular) calendar is used throughout, with a fixed 30-year leap cycle and no local sighting adjustment. Years are given as plain numbers without the AH or CE suffix.',
    disclaimer: 'This is a date arithmetic tool, not a religious authority. For worship and official purposes, confirm the date with your local moon-sighting body, since observed months can begin a day apart from the arithmetic calendar.',
    related: [
      { href: '/regional/prayer-time', text: 'Prayer Time Calculator' },
      { href: '/everyday/date-diff', text: 'Date Difference Calculator', note: 'count days between two dates' },
      { href: '/regional/zakat-calculator', text: 'Zakat Calculator' }
    ],
    howAnswer: 'The Gregorian date is turned into a Julian day number, then shifted into the Islamic epoch and resolved through the tabular 30-year cycle to give the Hijri year, month and day. The reverse direction uses the same arithmetic backwards.',
    needAnswer: 'A direction, plus either a Gregorian date or a Hijri year, month and day. No account or app is needed.',
    resultAnswer: 'The equivalent date in the other calendar, shown with zero-padded month and day for clarity.',
    extraFaqs: [
      ['Why does the Hijri year move earlier each Gregorian year?', 'Because the lunar year is about eleven days shorter than the solar year, so the same Hijri date lands about eleven days earlier on the Gregorian calendar every year.'],
      ['Is this the same date my mosque will announce?', 'Usually within a day. This tool uses the arithmetic calendar, while mosques often follow actual moon sighting, which can begin a month a day earlier or later.']
    ],
    contractInputs: 'Direction (select); Gregorian date (date); Hijri year (number); Hijri month (number); Hijri day (number)',
    contractFormula: 'Gregorian to Julian day via the civil formula; Julian day to Hijri by subtracting the Islamic epoch and resolving the 30-year cycle; Hijri to Julian day by floor((11y+3)/30) + 354y + 30m - floor((m-1)/2) + d + 1948440 - 385'
  },
  'alimony-estimator': {
    title: 'Alimony and Spousal Support Estimator',
    metaDesc: 'Rough monthly alimony or spousal support estimate from the income gap, the length of the marriage and whether there are children.',
    lsi: ['alimony calculator', 'spousal support estimator', 'monthly alimony estimate', 'divorce support calculator'],
    what: 'It gives a rough monthly spousal support figure based on the gap between the two incomes, scaled by the length of the marriage and whether children are involved.',
    inputsText: 'both monthly incomes, the number of years married and the number of children.',
    outputText: 'an estimated monthly support figure and a suggested duration.',
    methodText: 'a share of the income gap that grows with the marriage length, plus a small uplift for children, capped at 40 percent of payer income.',
    quick: 'A ten-year marriage with a monthly income gap of 4,000 and no children comes out near 1,600 a month, with a suggested duration of about four years. Every jurisdiction differs.',
    body: 'Spousal support has no single formula, but most guidelines start from the same idea: the greater the income gap and the longer the marriage, the more support is due. This tool applies a rate to the income gap that rises from about 20 percent for a short marriage to 40 percent after fifteen years, adds a small uplift when there are children, and caps the result at 40 percent of the payer net-style income as a reasonableness check. It also suggests a duration of roughly 40 percent of the marriage length. Real awards depend on the jurisdiction, the standard of living during the marriage, both parties needs and earning capacity, and any child support that runs separately.',
    formula: 'Monthly support = (payer income minus recipient income) x (0.2 + 0.02 x min(years, 15)) x (1.1 if children else 1), capped at 0.4 x payer income. Suggested duration = 0.4 x min(years, 15).',
    example: 'A ten-year marriage with the higher earner on 6,000 a month and the lower earner on 2,000. The gap is 4,000, the rate after ten years is 0.4, so the estimate is 1,600 a month, below the 2,400 cap. The suggested duration is about four years.',
    mistakes: ['Confusing alimony with child support, which is calculated separately and on different rules.', 'Forgetting that support is usually taxable or deductible depending on jurisdiction and tax law.', 'Assuming a single lump sum and a monthly payment are interchangeable, when the present values differ.'],
    assumptions: 'Incomes are treated as stable and net of nothing in particular, since jurisdictions differ on whether they use gross or net. Child support is not included. The formula is a rough guideline, not a legal calculation.',
    disclaimer: 'This is a rough estimate and educational only, not legal or tax advice. Spousal support rules vary enormously by jurisdiction and by the facts of each case, so consult a qualified family lawyer before relying on any figure.',
    related: [
      { href: '/family/child-support-split', text: 'Child Support Split Calculator' },
      { href: '/family/family-budget', text: 'Family Budget Calculator', note: 'see the full monthly picture' },
      { href: '/family/inheritance-estate', text: 'Inheritance and Estate Calculator' }
    ],
    howAnswer: 'The income gap is multiplied by a rate that grows with the marriage length, adjusted slightly for children, then capped at 40 percent of the payer income. The steps panel shows each figure.',
    needAnswer: 'Both monthly incomes, the number of years married and the number of children. Everything else is built in.',
    resultAnswer: 'An estimated monthly support figure and a suggested duration, with the income gap behind it.',
    extraFaqs: [
      ['How long does alimony usually last?', 'It varies widely, from a few years for a short marriage to long or indefinite terms for long marriages. This tool suggests roughly 40 percent of the marriage length as a starting point.'],
      ['Is alimony the same as child support?', 'No. Child support is for the children and generally has set guidelines, while spousal support is for the former partner and depends on the marriage and the income gap.']
    ],
    contractInputs: 'Higher earner monthly income (number); Lower earner monthly income (number); Years married (number); Children (number)',
    contractFormula: 'Monthly support = (payer - recipient) x (0.2 + 0.02 x min(years,15)) x (children>0 ? 1.1 : 1), capped at 0.4 x payer'
  },
  'statute-of-limitations': {
    title: 'Statute of Limitations Date Calculator',
    metaDesc: 'Work out the deadline to file common claim types from the incident date, with typical limitation periods and a reminder to confirm local rules.',
    lsi: ['statute of limitations calculator', 'claim deadline calculator', 'time limit to sue', 'legal filing deadline'],
    what: 'It gives an approximate filing deadline by adding the typical limitation period for a claim type to the incident date.',
    inputsText: 'the claim type and the incident date.',
    outputText: 'the approximate deadline date to file within.',
    methodText: 'a typical limitation period per claim type is added to the incident date.',
    quick: 'A personal injury incident on 15 January 2026 with a two-year limit gives a deadline of 15 January 2028. Many jurisdictions also start the clock from the date the harm was discovered.',
    body: 'A statute of limitations sets the time within which a claim must be filed. Once it passes, the right to sue is usually lost entirely, so these deadlines matter more than almost any other date in a legal matter. The periods differ by claim type and by jurisdiction: many US states allow about two years for personal injury and medical malpractice, three for property damage, six for contract and debt, and one for defamation, while workers compensation often has its own short notice rules. Many jurisdictions also apply a discovery rule, which starts the clock when the harm was or should have been discovered rather than on the incident itself, and certain claims are paused while the claimant is a minor.',
    formula: 'Deadline date = incident date plus the typical limitation period for the claim type. This tool adds whole years (two, three, six or one) to the incident date.',
    example: 'A contract dispute with an incident on 15 January 2026 uses the six-year period and gives a deadline of 15 January 2032. A defamation claim on the same date, at one year, gives 15 January 2027, and a personal injury claim at two years gives 15 January 2028.',
    mistakes: ['Missing the notice deadline, which for some defendants, especially public bodies, is far shorter than the filing deadline.', 'Counting from the wrong start date and ignoring a discovery rule that may start the clock later.', 'Assuming the rule is the same in every state or country.'],
    assumptions: 'Typical US-style periods are used as an illustration, with no discovery rule, tolling for minors or notice periods applied. The tool adds whole years without adjusting for weekends or court holidays.',
    disclaimer: 'This is an illustrative educational guide, not legal advice. Limitation periods vary by jurisdiction, claim type and the facts, and missing one can end a claim permanently. Confirm the real deadline with a qualified lawyer immediately.',
    related: [
      { href: '/everyday/date-diff', text: 'Date Difference Calculator', note: 'count the days that remain' },
      { href: '/finance/power-of-attorney-cost', text: 'Power of Attorney and Will Cost Estimator' },
      { href: '/family/alimony-estimator', text: 'Alimony and Spousal Support Estimator' }
    ],
    howAnswer: 'The typical limitation period for the claim type is added to the incident date as whole years. The steps panel shows the period, the start date and the resulting deadline.',
    needAnswer: 'The claim type and the incident date. The illustrative periods are built in.',
    resultAnswer: 'An approximate deadline date to file within, plus the period applied to that claim type.',
    extraFaqs: [
      ['When does the clock usually start?', 'Often on the incident date, but many jurisdictions use a discovery rule that starts it when the harm was or should have been discovered, which can be much later.'],
      ['Does the limitation period ever pause?', 'Yes. Tolling can pause it, for example while the claimant is a minor or the defendant is out of the jurisdiction, so the real deadline can differ from the simple calculation.']
    ],
    contractInputs: 'Claim type (select); Incident date (date)',
    contractFormula: 'Deadline = incidentDate + typical years per claim type (personal injury 2, contract 6, debt 6, property damage 3, malpractice 2, defamation 1, workers comp 2)'
  },
  'canada-crs': {
    title: 'Canada CRS Score Estimator',
    metaDesc: 'Estimate your Express Entry CRS core human capital points from age, education, language and skilled work experience in Canada and abroad.',
    lsi: ['canada crs calculator', 'express entry crs estimator', 'immigration points calculator canada', 'pr points canada'],
    what: 'It estimates the core human capital part of the Express Entry CRS score, the largest block of points, from age, education, language and work experience.',
    inputsText: 'age, education level, first official language CLB, Canadian skilled work years and foreign skilled work years.',
    outputText: 'an estimated core CRS points total with a breakdown by factor.',
    methodText: 'published point tables for age, education, language per ability and work experience are summed.',
    quick: 'Age 30 with a Bachelors, CLB 9, one year of Canadian work and three years abroad scores about 406 core points. The full CRS adds skill transferability and additional points on top.',
    body: 'Canada Express Entry ranks candidates with the Comprehensive Ranking System. The biggest block is core human capital: age, education, official language ability and skilled work experience. Age peaks young and falls after 30, education rises from secondary school to a doctorate, language is scored per ability by CLB level across four abilities, and work experience rewards Canadian employment more than foreign employment. This tool sums those core points so you can see, roughly, where you stand and which factor to improve. It does not include skill transferability, spouse or partner factors, or the additional points for a provincial nomination, a job offer or French ability.',
    formula: 'CRS core = age points + education points + 4 x language points per ability at the CLB level + Canadian work points + foreign work points. Age 20 to 29 earns 110, dropping each year to 6 at 44; education runs 30 to 150; language runs 0 to 32 per ability; Canadian work runs 0 to 80; foreign work adds 13 or 25.',
    example: 'Age 30 scores 105. A Bachelors scores 120. CLB 9 scores 29 per ability across four abilities, 116. One year of Canadian work scores 40, and three years abroad adds 25. The total is 406 core points.',
    mistakes: ['Forgetting that language points are awarded four times, once for each ability, so a strong CLB score matters a lot.', 'Assuming foreign work experience scores the same as Canadian work, when Canadian work is worth far more.', 'Ignoring the separate additional points for a provincial nomination or French, which can add 50 or more.'],
    assumptions: 'Spouse factors, skill transferability and additional points are excluded, so the real CRS is usually higher. Values are a single applicant style core estimate and do not reflect every category of points.',
    disclaimer: 'This is an educational estimate, not immigration advice and not an official score. Immigration rules and point tables change, and only a full profile on the official system produces a binding CRS score. Confirm your situation with a licensed immigration consultant.',
    related: [
      { href: '/career/australia-pr-points', text: 'Australia PR Points Calculator' },
      { href: '/finance/currency-converter', text: 'Currency Converter', note: 'convert salary and savings between currencies' },
      { href: '/finance/cost-of-living', text: 'Cost of Living Calculator' }
    ],
    howAnswer: 'Points are looked up for age, education, language at the CLB level across four abilities, and skilled work experience, then summed. The steps panel shows how each factor scores.',
    needAnswer: 'Your age, education level, CLB level for your first official language and your years of Canadian and foreign skilled work.',
    resultAnswer: 'An estimated core CRS points total, broken down by age, education, language and work, with a note that the full score adds transferability and additional points.',
    extraFaqs: [
      ['What CRS score is usually needed for an invitation?', 'It varies by draw and category, often landing in the 400s to 500s for general draws but lower for category-based draws. A higher score always improves the odds.'],
      ['What can raise my CRS the most?', 'Language is often the biggest lever because it is scored four times, followed by a provincial nomination or a Canadian job offer in the additional points section.']
    ],
    contractInputs: 'Age (number); Education (select); First official language CLB (number); Canadian skilled work years (number); Foreign skilled work years (number)',
    contractFormula: 'CRS core = agePts + eduPts + 4 x langPerAbility(CLB) + canadianWorkPts + foreignWorkPts; age 20-29 = 110 down to 6 at 44; education 30-150; language 0-32 per ability; Canadian work 0-80; foreign work 13/25'
  },
  'australia-pr-points': {
    title: 'Australia PR Points Calculator',
    metaDesc: 'Estimate skilled migration points for Australia from age, English level, qualifications, skilled work experience and partner status.',
    lsi: ['australia pr points calculator', 'skilled migration points', 'australia immigration points test', 'subclass 189 points'],
    what: 'It estimates points under the Australian skilled migration points test from age, English, qualifications, experience and partner status.',
    inputsText: 'age, English level, qualification, overseas and Australian skilled work years, and partner status.',
    outputText: 'an estimated points total with a breakdown by factor.',
    methodText: 'published points test tables for each factor are summed, and the result is compared with the usual 65-point threshold.',
    quick: 'Age 30, proficient English, a Bachelors, five years overseas experience and single status come to about 75 points. The general skilled visa threshold is 65.',
    body: 'Australia scores skilled migration applicants on a points test, with a general threshold of 65 points and higher scores in practice for competitive occupations. Age awards the most between 25 and 32, English rewards proficient and superior levels, qualifications rise from a diploma to a doctorate, and skilled work experience is worth more when it was gained in Australia. Partner status adds 10 points for a skilled partner or for being single. This tool sums the main factors so you can see where points come from. It does not include state nomination, regional study, professional year or specialist education, each of which can add points.',
    formula: 'Points = age + English + qualification + overseas experience + Australian experience + partner. Age is 30 at 25 to 32, 25 at 18 to 24 and 33 to 39, 15 at 40 to 44. English is 10 for proficient and 20 for superior. Qualifications are 10 to 20. Experience rises with years and is higher in Australia. Partner status is 10 unless the partner is not skilled.',
    example: 'Age 30 scores 30. Proficient English scores 10. A Bachelors scores 15. Five years of overseas experience scores 10. Single status scores 10. The total is 75 points, comfortably above the 65 threshold.',
    mistakes: ['Ignoring that points can expire, for example age points drop when you turn 33 or 40 and English tests are only valid for a few years.', 'Forgetting the separate points for state nomination or regional study, which can push a borderline score over.', 'Assuming a higher qualification always scores more, when a doctorate only adds five over a degree.'],
    assumptions: 'Only the main factors are modelled. State nomination, regional study, professional year, specialist education and partner skill details are excluded, and the real test is run on the official system.',
    disclaimer: 'This is an educational estimate, not immigration advice and not an official score. The points test and thresholds change, so confirm your eligibility with the official system or a registered migration agent.',
    related: [
      { href: '/career/canada-crs', text: 'Canada CRS Score Estimator' },
      { href: '/finance/currency-converter', text: 'Currency Converter', note: 'convert salary and savings between currencies' },
      { href: '/finance/cost-of-living', text: 'Cost of Living Calculator' }
    ],
    howAnswer: 'Points are looked up for age, English, qualification, skilled work experience and partner status, then summed. The steps panel shows how each factor scores.',
    needAnswer: 'Your age, English test level, highest qualification, overseas and Australian skilled work years, and partner status.',
    resultAnswer: 'An estimated points total with a breakdown by factor, compared with the usual 65-point threshold for a skilled visa.',
    extraFaqs: [
      ['What is the minimum points for an Australian skilled visa?', 'The general threshold is 65 points, but many occupations and invitations need more because places are limited and candidates are ranked.'],
      ['Do points for age expire?', 'The age points are based on your age at the time of invitation, so they drop when you move into an older band, which is why timing matters.']
    ],
    contractInputs: 'Age (number); English level (select); Qualification (select); Overseas skilled work years (number); Australian skilled work years (number); Partner status (select)',
    contractFormula: 'Points = agePts (30 at 25-32, 25 at 18-24/33-39, 15 at 40-44) + english (0/10/20) + qualification (10/15/15/20) + overseas experience (5/10/15) + Australian experience (5/10/15/20) + partner (0 or 10)'
  },
  'power-of-attorney-cost': {
    title: 'Power of Attorney and Will Cost Estimator',
    metaDesc: 'Estimate the cost of a will, power of attorney or living trust by document type, preparation route and complexity, with a typical price range.',
    lsi: ['power of attorney cost', 'will writing cost', 'estate document cost estimator', 'living trust cost'],
    what: 'It estimates what a will, power of attorney or trust document costs depending on whether you use an online service, a local lawyer or a specialist firm.',
    inputsText: 'the document type, the preparation route and the complexity.',
    outputText: 'an estimated cost and a typical low-to-high range.',
    methodText: 'a base cost per document type is adjusted by route and complexity factors.',
    quick: 'A simple will prepared through an online service comes out near 75, with a typical range of about 53 to 105. A complex will through a specialist firm can run into the thousands.',
    body: 'Estate planning documents vary hugely in cost because both the document and the way it is prepared matter. A simple will is short and cheap, while a complex will with trusts and tax planning is not. A power of attorney is usually the least expensive document, and a living trust the most involved. The preparation route moves the price as much as the document: online services and software sit well below a local lawyer, and a specialist firm that handles large estates sits above. Complexity then scales the whole thing. This tool puts those three factors together so you can plan a realistic budget and know when a quote looks out of line.',
    formula: 'Estimated cost = base x route factor x complexity factor. Base is 150 for a simple will, 600 for a complex will, 120 for a power of attorney and 1,500 for a living trust. Route is 0.5 online, 1.0 local lawyer and 1.8 specialist. Complexity is 1.0 simple, 1.5 moderate and 2.4 complex.',
    example: 'A simple will through an online service with simple complexity: 150 x 0.5 x 1.0 = 75, with a range of about 53 to 105. A complex will through a specialist firm with complex complexity: 600 x 1.8 x 2.4 = 2,592, before any extra advice fees.',
    mistakes: ['Choosing the cheapest template and ending up with an invalid document that costs far more to fix.', 'Forgetting that the cost of probate or a trust administration often dwarfs the drafting fee.', 'Assuming an online document covers unusual family situations, when it may not.'],
    assumptions: 'Figures are indicative planning estimates and vary by country, state and firm. Court fees, probate costs, notarisation and ongoing trust administration are not included.',
    disclaimer: 'This is a budgeting estimate, not legal advice. Estate documents must comply with local law to be valid, so have anything important reviewed by a qualified lawyer.',
    related: [
      { href: '/family/inheritance-estate', text: 'Inheritance and Estate Calculator' },
      { href: '/family/life-insurance', text: 'Life Insurance Calculator' },
      { href: '/everyday/statute-of-limitations', text: 'Statute of Limitations Date Calculator' }
    ],
    howAnswer: 'A base cost for the document type is multiplied by a route factor for how it is prepared and a complexity factor for how involved it is. The steps panel shows each factor.',
    needAnswer: 'The document type, the preparation route and the complexity level. Nothing else is required.',
    resultAnswer: 'An estimated cost and a typical low-to-high range, so you can tell whether a quote is reasonable.',
    extraFaqs: [
      ['Is a cheap online will good enough?', 'For a simple, straightforward estate it can be, but review it carefully and get witness requirements right. Unusual families or larger estates usually justify a lawyer.'],
      ['Why is a living trust so much more expensive?', 'Because a trust must be drafted, funded and administered, which takes more legal work than a will, so both the drafting and the ongoing cost are higher.']
    ],
    contractInputs: 'Document (select); Preparation route (select); Complexity (select)',
    contractFormula: 'Cost = base (150 simple will, 600 complex will, 120 POA, 1500 trust) x route (0.5 online, 1 lawyer, 1.8 specialist) x complexity (1, 1.5, 2.4)'
  }
};

const EXPECTED = [
  ['prayer-time', { city: 'Karachi', date: '2026-06-21', method: 'MWL', asr: 'Standard' }, 'Fajr 04:14 | Dhuhr 12:33 | Asr 15:55 | Maghrib 19:24 | Isha 20:48'],
  ['mirath-calculator', {}, 'Spouse 12500 | Children 54167'],
  ['hijri-converter', { direction: 'Gregorian to Hijri', date: '2026-10-04' }, 'Gregorian 2026-10-04 = Hijri 1448-04-21'],
  ['alimony-estimator', {}, 'Estimated monthly support: 1600'],
  ['statute-of-limitations', { claimType: 'Personal injury', incidentDate: '2026-01-15' }, 'File by 2028-01-15'],
  ['canada-crs', {}, 'Estimated CRS core: 406 points'],
  ['australia-pr-points', {}, 'Estimated points: 75'],
  ['power-of-attorney-cost', {}, 'Estimated cost: 75']
];

const inserted = insertTools(T);
console.log('tool blocks inserted:', inserted, 'of', T.length);

const bad = selfCheck(T, EXPECTED);
if (bad.length) { console.error('tool self-check FAILED:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('tool self-check: PASS (' + T.length + ' tools)');

const entries = T.map(function (t) { return buildSeo(Object.assign({ id: t.id, cat: t.cat }, S[t.id])); });
const seoAdded = insertSeo(entries);
console.log('seo entries inserted:', seoAdded, 'of', entries.length);

const badSeo = selfCheckSeo(entries);
if (badSeo.length) { console.error('SEO self-check FAILED:\n  ' + badSeo.join('\n  ')); process.exit(1); }
console.log('seo self-check: PASS');

const res = addContracts(T.map(function (t) {
  return { id: t.id, name: t.name, cat: t.cat, contractInputs: S[t.id].contractInputs, contractFormula: S[t.id].contractFormula };
}));
console.log('qa contracts added:', res.added, '| total:', res.total);
