// Google Suggest volume estimator — free demand signal for long-tail keywords.
// For each long-tail keyword, query Google autocomplete and record:
//  - suggestionCount: how many real user queries contain it (demand proxy)
//  - topSuggestions: the actual suggested queries (gold for content targeting)
// Output: scripts/kw-volume.json + a ranked CSV report.
const https = require('https');

function suggest(q) {
  return new Promise((resolve) => {
    const url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=' + encodeURIComponent(q);
    const req = https.get(url, { timeout: 6000 }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          const arr = Array.isArray(j[1]) ? j[1] : [];
          resolve({ count: arr.length, suggestions: arr.slice(0, 8) });
        } catch (e) { resolve({ count: 0, suggestions: [], err: 'parse' }); }
      });
    });
    req.on('error', () => resolve({ count: 0, suggestions: [], err: 'net' }));
    req.on('timeout', () => { req.destroy(); resolve({ count: 0, suggestions: [], err: 'timeout' }); });
  });
}

async function main() {
  const report = JSON.parse(require('fs').readFileSync('scripts/kw-report.json', 'utf8'));
  // collect unique long-tail keywords
  const seen = new Set();
  const longTails = [];
  for (const f of Object.keys(report)) {
    for (const t of report[f]) {
      for (const k of t.kws) {
        const words = k.split(/[\s-]+/).filter(Boolean).length;
        if (words >= 3 && !seen.has(k.toLowerCase())) {
          seen.add(k.toLowerCase());
          longTails.push({ toolId: t.id, kw: k, words });
        }
      }
    }
  }
  console.log('Unique long-tail kws to check:', longTails.length);

  const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : longTails.length;
  const results = [];
  let done = 0;
  // concurrency 5
  const queue = longTails.slice(0, LIMIT);
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      const s = await suggest(item.kw);
      const demand = s.count >= 8 ? 'HIGH' : s.count >= 4 ? 'MEDIUM' : 'LOW';
      results.push({ toolId: item.toolId, kw: item.kw, suggestionCount: s.count, demand, suggestions: s.suggestions });
      done++;
      if (done % 25 === 0 || done === LIMIT) console.log('  checked', done, '/', Math.min(LIMIT, longTails.length));
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);

  results.sort((a, b) => b.suggestionCount - a.suggestionCount);
  require('fs').writeFileSync('scripts/kw-volume.json', JSON.stringify(results, null, 1));
  const csv = ['kw,toolId,suggestionCount,demand'].join('\n') + '\n' +
    results.map(r => [r.kw, r.toolId, r.suggestionCount, r.demand].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
  require('fs').writeFileSync('scripts/kw-volume.csv', csv);
  console.log('\nDone. Total:', results.length);
  console.log('HIGH demand:', results.filter(r => r.demand === 'HIGH').length);
  console.log('MEDIUM:', results.filter(r => r.demand === 'MEDIUM').length);
  console.log('LOW:', results.filter(r => r.demand === 'LOW').length);
  console.log('\n=== TOP 15 HIGH-DEMAND LONG-TAILS ===');
  results.slice(0, 15).forEach(r => console.log('  [' + r.demand + ' x' + r.suggestionCount + '] ' + r.kw));
  console.log('\nReport: scripts/kw-volume.json + .csv');
}

main();
