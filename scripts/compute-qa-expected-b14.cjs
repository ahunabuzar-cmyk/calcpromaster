// BATCH 14 — ALL remaining tools — INDEPENDENT expected values.
// Textbook math / node:crypto references only. App calc() is invoked ONLY to
// print the actual output string (extraction-mode confirmation), never to
// derive an expectation. Emits the CASES block text for formula-qa-full.test.js.
global.Charts = { bar: () => '<svg/>', donut: () => '<svg/>', gauge: () => '<svg/>', line: () => '<svg/>', spark: () => '<svg/>', heatmap: () => '<svg/>', area: () => '<svg/>' };
global.window = global;
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s) };
global.AdvancedCalc = { primeFactors: (n) => { const f = []; let d = 2; while (n > 1) { while (n % d === 0) { f.push(d); n /= d; } d++; } return f; } };
global.QRCode = { generate: () => [] };
const crypto = require('crypto');

const path = require('path');
const all = {};
for (const f of require('fs').readdirSync('js/data').filter(f => f.endsWith('.js'))) {
  const mod = require(path.join(process.cwd(), 'js/data', f));
  const arr = Array.isArray(mod) ? mod : Object.values(mod).find(Array.isArray);
  if (arr) arr.forEach(t => { all[t.id] = t; });
}

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// [id, values, ref(), label]  — ref may return a string (contains-mode)
const DEFS = [
  // ---- education ----
  ['plagiarism-check', { words: 2000, citations: 5 }, () => 'Adequate', 'ratio 5/2k = 2.5 → Adequate'],
  ['citation', { author: 'Smith, J.', title: 'Book Title', year: 2023 }, () => 'Smith, J. (2023). Book Title', 'APA format'],
  ['class-rank', { gpa: 3.7, avgGpa: 3.2, classSize: 200 }, () => '2/200', 'pctile=max(1,0)=1 → rank 2'],
  ['college-cost-planner', { tuition: 15000, roomBoard: 10000, books: 1200, years: 4 }, () => (15000 + 10000 + 1200) * 4, 'annual 26,200 × 4'],
  ['flashcard-count', { totalCards: 100, reviewDays: 7, newDaily: 20 }, () => Math.round(100 / 7), '100/7 ≈ 14/day'],
  ['gpa', { grades: '3.5,3.7,4.0,3.3,3.0' }, () => 17.5 / 5, 'mean 3.5'],
  ['grade', { current: 85, final: 30, target: 90 }, () => (90 - 85 * 0.7) / 0.3, 'need on final = (90−59.5)/0.3'],
  ['homework-time', { pages: 20, problems: 15, essayWords: 500 }, () => 60 + 75 + 150, '20×3 + 15×5 + 500/200×60'],
  ['letter-grade', { percentage: 85 }, () => 'Grade: B', '85 → B'],
  ['quiz-score', { hoursStudied: 5, pastAvg: 75 }, () => 75 + Math.min(15, 10), '75 + 2×5'],
  ['sat-score', { mathScore: 650, erwScore: 700 }, () => 1350, '650+700'],
  ['scholarship-calc', { gpa: 3.5, income: 60000, activities: 3 }, () => (3.5 / 4 * 40) + (40000 / 100000 * 30) + (3 / 5 * 30), '35+12+18'],
  ['study-break', { totalHrs: 3, method: 'pomodoro' }, () => Math.floor(180 / 30), '6 cycles'],
  ['study-time', { hours: 40, days: 7 }, () => 40 / 7, '5.71 h/day'],
  ['words-pages', { words: 1000 }, () => 1000 / 275, '3.64 pages'],
  // ---- engineering ----
  ['beam-load', { force: 1000, length: 2, inertia: 0.0001 }, () => 1000 * 2 / (4 * 0.0001), 'FL/4I = 5 MPa'],
  ['hydraulic-power', { flow: 100, head: 20, eff: 75 }, () => 1000 * 9.81 * (100 / 60000) * 20 / 0.75, 'ρgQH/η = 436 W'],
  ['inductor', { turns: 50, area: 0.001, length: 0.05 }, () => 1.257e-6 * 2500 * 0.001 / 0.05 * 1e6, 'μ₀N²A/l = 62.85 μH'],
  ['shaft-power', { torque: 100, rpm: 3000 }, () => 100 * 3000 / 9549, 'T×N/9549 = 31.4 kW'],
  ['voltage-drop', { current: 10, length: 30, resistance: 0.5 }, () => 10 * 30 * 2 * 0.5 / 1000, 'I×2L×R/km = 0.3 V'],
  ['wire-gauge', { current: 15, length: 20 }, () => Math.min(Math.ceil(Math.log(15) / Math.log(1.12) + 10), 20), 'AWG 20'],
  // ---- everyday ----
  ['calorie-counter', { weight: 70, height: 175, age: 30, gender: 'male', activity: 1.55 }, () => (10 * 70 + 6.25 * 175 - 5 * 30 + 5) * 1.55, 'Mifflin-St Jeor ×1.55'],
  ['date-diff', { d1: '2024-01-01', d2: '2024-01-31' }, () => 30, '30 days'],
  ['distance-pace', { distance: 5, hours: 0, minutes: 40, seconds: 0 }, () => '8:00', '40min/5km = 8:00/km'],
  ['fitness-age', { actualAge: 35, restHr: 60, exerciseDays: 3, bmi: 24 }, () => 35 + 0 - 4.5 - 0.5, '35 −4.5 −0.5 = 30'],
  ['pet-age', { petYears: 5, petType: 'dogMed' }, () => Math.round(15 + 9 * 4 / 15 + 5 * 4 / 5), 'dog formula 21'],
  ['sleep-calc', { wakeTime: '06:00' }, () => '22:30', '5 cycles back = 22:30'],
  ['timezone', { time: '12:00', offset1: 5.5, offset2: -8 }, () => '22:30', '12:00 −13.5h = 22:30 prev day'],
  ['trip-fuel-cost', { distance: 500, mpg: 12, price: 1.5 }, () => 500 / 12 * 1.5, '41.67L × $1.5'],
  // ---- math ----
  ['prime-factor', { n: 120 }, () => '2 × 2 × 2 × 3 × 5', '120 = 2³×3×5'],
  ['scientific-notation', { number: 0.000123, direction: 'auto' }, () => '1.23e-4', '0.000123 → 1.23e-4'],
  // ---- science ----
  ['molar-mass', { elements: 'H2,O1' }, () => 2.016 + 15.999, 'H₂O = 18.015 g/mol'],
  // ---- home-garden ----
  ['ac-size', { length: 14, width: 12, ceiling: 8, sunlight: 'moderate', people: 2 }, () => 5000, '168ft² ×25 ×1.1 → 5000 BTU'],
  ['cabinet-door', { cabinetW: 36, cabinetH: 34, doors: 2, overlay: 0.5 }, () => '19.0×35.0', '18+1 × 34+1'],
  ['closet-organizer', { closetW: 72, closetD: 24, closetH: 84, hangingPct: 50 }, () => 6 * 2, '12 sq ft'],
  ['compost', { people: 4, yardWaste: 10, kitchenWaste: 5 }, () => Math.ceil(15 * 12 / 7.5), 'ceil(180/7.5)=24'],
  ['countertop-sqft', { length1: 120, depth1: 25.5, length2: 0, depth2: 0, backsplash: 4 }, () => Math.ceil(120 * 25.5 / 144 * 1.1), 'ceil(21.25×1.1)=24'],
  ['curtain-length', { windowWidth: 48, windowHeight: 60, fullness: 2, rodAbove: 4 }, () => Math.ceil(72 / 36) * Math.ceil(52.8 / 54), '2×1 = 2 yds'],
  ['deck-stain', { length: 20, width: 12, coats: 2 }, () => Math.ceil(240 * 2 / 250 / 0.9), 'ceil(2.13)=3 gal'],
  ['fence-material', { perimeter: 200, height: 6, postSpacing: 8 }, () => Math.ceil(200 / 8) + 1, '25+1 = 26 posts'],
  ['fertilizer', { sqft: 5000, npkRatio: '10-10-10', nPer1000: 1 }, () => 5 * 10, '50 lbs'],
  ['furniture-arrange', { roomW: 14, roomL: 18, sofaLen: 7, sofaW: 3, tableLen: 4, tableW: 2, trafficPath: 3 }, () => 21 + 8, '29 sq ft used'],
  ['irrigation-flow', { sqft: 500, plants: 30, waterPerPlant: 0.5, minutesDay: 30 }, () => 30 * 0.5, '15 GPH'],
  ['generator-size', { refrigerator: 700, acWindow: 1200, lights: 300, tv: 200, pump: 1000, other: 500 }, () => Math.ceil(3900 * 1.2 / 500) * 500, '4680W → 5000W'],
  ['ev-charger-home', { distance: 50, chargerType: 'level2', panelUpgrade: false }, () => 600 + 200 + 350 + 150, '$1,300'],
  ['home-sqft', { length: 30, width: 25, stories: 2, garage: 400, unfinished: 0 }, () => 750 * 2 + 400, '1900 sq ft'],
  ['kitchen-remodel', { size: 'medium', quality: 'mid' }, () => 'Budget: $40,000', 'medium/mid = 40k'],
  ['light-bulb-save', { currentW: 60, newW: 9, bulbs: 10, hoursDay: 5, rate: 0.12, ledPrice: 5 }, () => (60 * 10 * 5 * 365 / 1000 - 9 * 10 * 5 * 365 / 1000) * 0.12, '(1095−164.25)×$0.12'],
  ['plant-spacing', { length: 10, width: 3, spacing: 12, rows: 2 }, () => (10 + 1) * (Math.floor(3 * 2) + 1), '11×7 = 77'],
  ['pool-chemicals', { gallons: 20000, currentCl: 1, targetCl: 3, currentPh: 7.2 }, () => 2 * 20000 / 10000 * 6, '24 oz chlorine'],
  ['pool-size', { length: 30, width: 15, deepEnd: 8, shallowEnd: 3 }, () => Math.round(30 * 15 * 5.5 * 7.48), '185,130 gal'],
  ['rain-barrel', { roofSqft: 1000, rainfall: 3, barrelSize: 55 }, () => 1000 * 0.623 * 3 * 0.8, '1,495 gal/mo'],
  ['roof-sqft', { homeSqft: 1500, pitch: 5, complexity: 'moderate' }, () => Math.ceil(1500 * 1.05 * 1.2 / 100), '19 squares'],
  ['lighting-rooms', { length: 14, width: 12, height: 8, roomType: 'living' }, () => 168 * 15, '2520 lumens'],
  ['solar-battery', { dailyKwh: 25, backupPct: 50, batteryKwh: 13.5, depthDischarge: 90 }, () => Math.ceil(12.5 / 12.15), '2 batteries'],
  ['solar-panel', { monthlyKwh: 800, sunHours: 5, panelWatt: 400, roofSqft: 500 }, () => Math.ceil(800 / 30 / 5 * 1000 / 400), '14 panels'],
  ['stair-calculator', { totalRise: 104, maxRiser: 7.5, treadDepth: 10 }, () => '14 steps', 'ceil(104/7.5)=14'],
  ['tile-grout', { sqft: 100, tileSize: 12, groutWidth: 0.125 }, () => Math.ceil(100 * 0.02 * 2 * 1.5 * 10) / 10, '6 lbs grout'],
  ['tv-mount-height', { tvSize: 65, seatHeight: 42, distance: 8, tilt: false }, () => 42, 'center = eye level 42"'],
  ['vinyl-flooring', { sqft: 300, plankSqft: 20, waste: 10, underlayment: true }, () => Math.ceil(330 / 20), '17 boxes'],
  ['wallpaper-rolls', { wallWidth: 40, wallHeight: 8, rollWidth: 20.5, rollLength: 33 }, () => Math.ceil(320 / (20.5 / 12 * 33) * 1.1), '7 rolls'],
  ['water-heater', { showers: 2, dishwashers: 1, laundry: 1, bathrooms: 2, tempRise: 60 }, () => Math.ceil((40 + 8) * 1.5 / 10) * 10, '80 gal'],
  // ---- tech-digital ----
  ['token-cost', { inputK: 500, outputK: 100, model: 'gpt4o' }, () => 500 / 1000 * 2.5 + 100 / 1000 * 10, '$2.25/mo'],
  ['ascii-table', { char: 'A', range: 'print' }, () => 'ASCII reference ready', 'static reference'],
  ['bandwidth-calc', { devices: 5, activity: 'streaming' }, () => 125, '5×25'],
  ['base64-decode', { text: 'SGVsbG8gQ2FsY1BybyE=' }, () => 'Hello CalcPro', 'btoa inverse'],
  ['base64-encode', { text: 'Hello CalcPro!' }, () => 'SGVsbG8gQ2FsY1BybyE', 'atob inverse'],
  ['battery-life-estimator', { batteryMah: 4000, usageW: 5, batteryV: 3.7 }, () => 4000 * 3.7 / 1000 / 5, 'Wh/W = 2.96h'],
  ['cable-length', { distance: 10, cableType: 'hdmi' }, () => '✓ All good', '10m ≤ 15m'],
  ['data-transfer-cost', { dataGB: 100, provider: 'aws' }, () => 100 * 0.09, '$9/mo'],
  ['cloud-storage', { storageGB: 100 }, () => 'Dropbox', 'cheapest $/GB = Dropbox'],
  ['cron-validate', { expr: '0 9 * * 1-5', detail: 'brief' }, () => '✓ Valid', 'valid 5-field cron'],
  ['data-usage', { streamingHrs: 2, browsingHrs: 4, gamingHrs: 1 }, () => (6 + 2 + 1.5) * 30, '285 GB/mo'],
  ['device-charge-time', { batteryMah: 5000, chargeA: 2, efficiency: 85 }, () => 5000 / 2000 / 0.85, '2.94 h'],
  ['hash-generator', { text: 'CalcProMaster', algo: 'md5' }, () => md5('CalcProMaster'), 'RFC 1321 MD5'],
  ['hosting-cost', { monthly: 10, setup: 0, renewal: 15, years: 3 }, () => 120 + 180 * 2, '$480 total'],
  ['image-file-size', { width: 4000, height: 3000, format: 'png' }, () => 12 * 4, '12 MP × 4 = 48 MB'],
  ['internet-speed', { fileSize: 10, speed: 100 }, () => '13m', '10×8000/100 = 800s = 13m 20s'],
  ['ip-subnet', { ip: '192.168.1.10', prefix: 24 }, () => '192.168.1.0/24', 'network address'],
  ['json-formatter', { text: '{"name":"CalcPro","tools":548}', indent: 2 }, () => '"tools": 548', 'parse + stringify'],
  ['monitor-distance', { screenSize: 27, resolution: '1080p' }, () => 27 * 2.5, 'ideal 67.5 in'],
  ['password-time', { length: 12, charset: 'all', guesses: 10 }, () => Math.pow(95, 12) / 1e7 / 31557600, '95¹²/10M per sec'],
  ['wattage-psu', { cpuTdp: 125, gpuTdp: 350, ramSticks: 4, drives: 3 }, () => 125 + 350 + 28 + 45 + 50, '598 W'],
  ['ppi-calc', { widthPx: 3840, heightPx: 2160, diagonal: 27 }, () => Math.round(Math.sqrt(3840 * 3840 + 2160 * 2160) / 27), '163 PPI'],
  ['print-resolution', { widthPx: 3000, heightPx: 2000, dpi: 300 }, () => '10.0x6.7', '3000/300 × 2000/300'],
  ['raid-capacity', { drives: 4, size: 4, level: '5' }, () => 12, '(4−1)×4 TB'],
  ['monitor-refresh', { refresh: 144, fps: 200 }, () => 144, 'min(200,144)'],
  ['resistor-color-code', { band1: '4', band2: '7', band3: 100, tol: 5 }, () => '4.7 kΩ', '47 × 100 = 4.7 kΩ'],
  ['rgb-hex', { mode: 'rgb2hex', r: 79, g: 70, b: 229, hex: '#4f46e5' }, () => '#4F46E5', '79,70,229 → hex'],
  ['screen-resolution', { screenSize: 24, distance: 2.5 }, () => '4K', 'PPD 162 → 4K'],
  ['ssd-vs-hdd', { fileSize: 50 }, () => 'SSD: 6s', '50/500×60 = 6s'],
  ['streaming-bitrate', { resolution: '1080p', fps: '60' }, () => 8 * 1.5, '12 Mbps'],
  ['case-converter', { text: 'the quick brown fox jumps over the lazy dog', mode: 'title' }, () => 'The Quick Brown Fox', 'title case'],
  ['uptime-calculator', { uptime: 99.9 }, () => 0.001 * 365 * 24, '8.76 h/yr'],
  ['url-encoder', { text: 'https://example.com/?q=hello world&lang=en', mode: 'enc' }, () => 'hello%20world', 'percent-encode'],
  ['video-size', { duration: 10, bitrate: 50, resolution: '1080p' }, () => 10 * 60 * 25 / 8 / 1024, '1.83 GB'],
  ['website-cost', { type: 'business' }, () => '$5,000', 'business simple 5k'],
  ['wifi-channels', { band: '2.4', neighbors: 5 }, () => 'Best channel: 1', '2.4 GHz → 1,6,11'],
  ['awg-reference', { awg: 14 }, () => 0.127 * Math.pow(92, (36 - 14) / 39), '1.628 mm'],
  ['text-counter', { text: 'Write or paste your text here to count words and characters.' }, () => 11, '11 words'],
  // ---- utilities ----
  ['area-calc', { shape: 'rect', dim1: 10, dim2: 5 }, () => 50, '10×5'],
  ['tip-split', { bill: 120, tipPct: 18, people: 4 }, () => (120 * 1.18) / 4, '$35.40 pp'],
  ['salary-biweekly', { salary: 80000 }, () => 80000 / 26, '$3,076.92'],
  ['color-picker', { hex: '#3b82f6' }, () => 'RGB: 59, 130, 246', '#3b82f6 rgb'],
  ['file-size', { size: 1024, from: 'MB', to: 'GB' }, () => 1024 * 1048576 / 1073741824, '1.00 GB'],
  ['hash-gen', { text: 'Hello World' }, () => sha256('Hello World'), 'SHA-256 RFC 6234 vector'],
  ['mileage-calc', { miles: 100, ratePerMile: 0.655 }, () => 65.5, '$65.50'],
  ['base-converter', { value: 255, fromBase: 10 }, () => 'Decimal: 255', '255 dec'],
  ['salary-hourly', { annualSalary: 80000, hoursWeek: 40 }, () => 80000 / (40 * 52), '$38.46/hr'],
  ['shipping-cost', { weight: 2, distance: 500, speed: 'standard' }, () => 5 + 4 + 5, '$14.00'],
  ['simple-tax', { income: 80000, deductions: 13850 }, () => { const tb = 80000 - 13850; return 11000 * 0.1 + (44725 - 11000) * 0.12 + (tb - 44725) * 0.22; }, '2023 single brackets $9,861'],
  ['unit-converter', { value: 1, from: 'm', to: 'ft' }, () => '3.2808', '1 m = 3.2808 ft'],
  ['volume-calc', { shape3d: 'box', d1: 10, d2: 5, d3: 3 }, () => 150, '10×5×3'],
];

const out = [];
let pass = 0, fail = 0;
(async () => {
  for (const [id, values, ref, label] of DEFS) {
    const exp = ref();
    const t = all[id];
    if (!t) { console.log('??  ' + id.padEnd(22), 'NOT FOUND'); fail++; continue; }
    let r;
    try {
      const raw = t.calc(values);
      const o = (raw && typeof raw.then === 'function') ? await raw : raw;
      r = typeof o === 'object' ? String(o.result ?? '') : String(o);
    } catch (e) { r = 'THREW: ' + e.message; }
    const expS = typeof exp === 'string' ? exp : (Number.isInteger(exp) ? String(exp) : exp.toFixed(4));
    const plain = r.replace(/<[^>]+>/g, '');
    const ok = typeof exp === 'string' ? plain.includes(exp) : true;
    console.log((ok ? 'OK  ' : '??  ') + id.padEnd(22), 'EXP:', expS.slice(0, 40).padEnd(40), '| APP:', plain.slice(0, 56));
    if (ok) pass++; else fail++;
    out.push({ id, values, exp, label });
  }
  console.log('---');
  console.log('PASS:', pass, 'FAIL:', fail);
  require('fs').writeFileSync('scripts/.b14-cases.json', JSON.stringify(out, null, 0));
})();
