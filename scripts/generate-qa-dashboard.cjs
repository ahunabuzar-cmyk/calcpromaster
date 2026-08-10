// ============================================================
// CalcProMaster — FORMULA QA DASHBOARD GENERATOR
// Reads docs/qa-contracts.json + docs/review-tracker.json and
// emits docs/formula-review-dashboard.html — a fully self-
// contained page (embedded data, no fetch, no build deps).
// Run: node scripts/generate-qa-dashboard.cjs
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const contracts = require(path.join(ROOT, 'docs', 'qa-contracts.json'));
const tracker = require(path.join(ROOT, 'docs', 'review-tracker.json'));

// Ship as a site page (root, picked up by build-deploy.js FILES list) AND
// keep a canonical copy in docs/ for the repo.
const OUT = path.join(ROOT, 'qa-dashboard.html');
const OUT_DOCS = path.join(ROOT, 'docs', 'formula-review-dashboard.html');

// ---- aggregate by category ----
const byCat = {};
for (const c of contracts.contracts) {
  byCat[c.category] = byCat[c.category] || { total: 0, pass: 0, na: 0, review: 0 };
  byCat[c.category].total++;
  if (c.verificationStatus === 'PASS') byCat[c.category].pass++;
  else if (c.verificationStatus === 'NOT APPLICABLE') byCat[c.category].na++;
  else byCat[c.category].review++;
}
const catRows = Object.keys(byCat)
  .map((name) => ({ name, ...byCat[name] }))
  .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

// ---- embed data (escape </script>) ----
const DATA_JSON = JSON.stringify({
  generated: contracts.generated,
  tracker: {
    total: tracker.total, pass: tracker.pass,
    needsReview: tracker.needsReview, notApplicable: tracker.notApplicable,
    reviewable: tracker.reviewable, progressPct: tracker.progressPct,
  },
  byCat: catRows,
  contracts: contracts.contracts,
}).replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>CalcProMaster — Formula QA Dashboard</title>
<style>
  :root{
    --bg:#0f172a; --panel:#1e293b; --panel2:#273449; --ink:#e2e8f0; --muted:#94a3b8;
    --green:#22c55e; --amber:#f59e0b; --red:#ef4444; --blue:#38bdf8; --violet:#a78bfa;
    --radius:14px; --shadow:0 10px 30px rgba(2,6,23,.45);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55;padding:28px 20px 60px}
  .wrap{max-width:1100px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;margin-bottom:22px}
  h1{font-size:26px;letter-spacing:-.02em}
  h1 span{background:linear-gradient(90deg,var(--blue),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}
  .gen{color:var(--muted);font-size:13px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px}
  .stat{background:var(--panel);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.05)}
  .stat .num{font-size:30px;font-weight:800}
  .stat .lbl{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
  .stat.pass .num{color:var(--green)} .stat.review .num{color:var(--amber)} .stat.na .num{color:var(--blue)} .stat.total .num{color:var(--violet)}
  .bar-wrap{background:var(--panel);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);margin-bottom:22px;border:1px solid rgba(255,255,255,.05)}
  .bar-wrap h2{font-size:15px;margin-bottom:14px;color:var(--muted);font-weight:600}
  .cat-row{display:grid;grid-template-columns:200px 1fr 70px;gap:12px;align-items:center;margin-bottom:8px}
  .cat-name{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar-track{background:#0b1220;border-radius:99px;height:14px;overflow:hidden;display:flex}
  .bar-pass{background:linear-gradient(90deg,#15803d,var(--green));height:100%}
  .bar-na{background:var(--blue);height:100%}
  .cat-nums{font-size:12px;color:var(--muted);text-align:right;white-space:nowrap}
  .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
  input[type=search]{flex:1;min-width:220px;background:var(--panel);border:1px solid rgba(255,255,255,.1);color:var(--ink);border-radius:10px;padding:10px 14px;font-size:14px;outline:none}
  input[type=search]:focus{border-color:var(--blue)}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .chip{background:var(--panel2);border:1px solid rgba(255,255,255,.08);color:var(--ink);border-radius:99px;padding:6px 14px;font-size:13px;cursor:pointer;transition:.15s}
  .chip:hover{border-color:var(--blue)}
  .chip.active{background:var(--blue);border-color:var(--blue);color:#062033;font-weight:700}
  table{width:100%;border-collapse:collapse;background:var(--panel);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);font-size:13px}
  th{text-align:left;padding:11px 14px;background:var(--panel2);color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em;position:sticky;top:0}
  td{padding:10px 14px;border-top:1px solid rgba(255,255,255,.05);vertical-align:top}
  tr:hover td{background:rgba(56,189,248,.05)}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
  .b-pass{background:rgba(34,197,94,.15);color:var(--green)} .b-na{background:rgba(56,189,248,.15);color:var(--blue)}
  .route{color:var(--blue);font-family:ui-monospace,Consolas,monospace;font-size:12px}
  .formula{color:var(--muted);font-family:ui-monospace,Consolas,monospace;font-size:11px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .empty{display:none;text-align:center;color:var(--muted);padding:30px}
  footer{margin-top:26px;color:var(--muted);font-size:12px;text-align:center}
  .progress-ring-wrap{display:flex;align-items:center;gap:18px}
  .progress-ring{width:92px;height:92px;flex:none}
  .ring-label{font-size:13px;color:var(--muted);max-width:260px}
  .ring-label b{color:var(--green);font-size:15px}
  @media(max-width:640px){ .cat-row{grid-template-columns:110px 1fr 60px} .formula{max-width:150px} }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>CalcProMaster — <span>Formula QA Dashboard</span></h1>
      <div class="gen">Generated ${new Date().toISOString().slice(0,10)} · source: docs/qa-contracts.json + docs/review-tracker.json</div>
    </div>
    <div class="progress-ring-wrap">
      <svg class="progress-ring" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#0b1220" stroke-width="10"/>
        <circle id="ring" cx="50" cy="50" r="42" fill="none" stroke="var(--green)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264" transform="rotate(-90 50 50)"/>
        <text x="50" y="56" text-anchor="middle" fill="var(--ink)" font-size="20" font-weight="800" id="pct-text">0%</text>
      </svg>
      <div class="ring-label"><b id="pct-big">0%</b> of reviewable calculators carry an independent formula/property contract.</div>
    </div>
  </header>

  <div class="stats">
    <div class="stat total"><div class="num" id="s-total">0</div><div class="lbl">Total Calculators</div></div>
    <div class="stat pass"><div class="num" id="s-pass">0</div><div class="lbl">PASS (tested)</div></div>
    <div class="stat na"><div class="num" id="s-na">0</div><div class="lbl">Not Applicable</div></div>
    <div class="stat review"><div class="num" id="s-review">0</div><div class="lbl">Needs Review</div></div>
  </div>

  <div class="bar-wrap">
    <h2>Coverage by category</h2>
    <div id="bars"></div>
  </div>

  <div class="toolbar">
    <input type="search" id="q" placeholder="Search calculator name, route, or formula…" aria-label="Search calculators">
    <div class="chips" id="chips">
      <button class="chip active" data-f="all">All</button>
      <button class="chip" data-f="PASS">PASS</button>
      <button class="chip" data-f="NOT APPLICABLE">N/A</button>
      <button class="chip" data-f="NEEDS HUMAN REVIEW">Review</button>
    </div>
  </div>

  <table>
    <thead><tr><th>Status</th><th>Calculator</th><th>Category</th><th>Route</th><th>Inputs</th><th>Formula (source hint)</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <div class="empty" id="empty">No calculators match your filter.</div>

  <footer>Evidence-backed statuses only — a calculator leaves review only when its contract lives in <code>tests/unit/formula-qa-full.test.js</code>.</footer>
</div>

<script>
const DATA = ${DATA_JSON};
const fmt = (n) => n.toLocaleString('en-US');
// progress ring
const pct = DATA.tracker.progressPct || 0;
document.getElementById('pct-text').textContent = pct + '%';
document.getElementById('pct-big').textContent = pct + '%';
document.getElementById('ring').style.strokeDashoffset = String(264 - (264 * pct / 100));
// stats
document.getElementById('s-total').textContent = fmt(DATA.tracker.total);
document.getElementById('s-pass').textContent = fmt(DATA.tracker.pass);
document.getElementById('s-na').textContent = fmt(DATA.tracker.notApplicable);
document.getElementById('s-review').textContent = fmt(DATA.tracker.needsReview);
// bars
const barsEl = document.getElementById('bars');
for (const c of DATA.byCat) {
  const pctW = c.total ? Math.round(c.pass / c.total * 100) : 0;
  const naW = c.total ? Math.round(c.na / c.total * 100) : 0;
  const row = document.createElement('div');
  row.className = 'cat-row';
  row.innerHTML = '<div class="cat-name" title="' + c.name + '">' + c.name + '</div>' +
    '<div class="bar-track"><div class="bar-pass" style="width:' + pctW + '%"></div>' +
    (naW ? '<div class="bar-na" style="width:' + naW + '%"></div>' : '') + '</div>' +
    '<div class="cat-nums">' + fmt(c.pass) + '/' + fmt(c.total) + (c.na ? ' +' + c.na + ' N/A' : '') + '</div>';
  barsEl.appendChild(row);
}
// table
let filter = 'all', query = '';
const tbody = document.getElementById('rows');
const emptyEl = document.getElementById('empty');
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function render(){
  tbody.innerHTML = '';
  let shown = 0;
  const q = query.toLowerCase();
  for (const c of DATA.contracts) {
    if (filter !== 'all' && c.verificationStatus !== filter) continue;
    if (q && !(c.name.toLowerCase().includes(q) || c.route.toLowerCase().includes(q) || String(c.formula).toLowerCase().includes(q))) continue;
    shown++;
    const badge = c.verificationStatus === 'PASS'
      ? '<span class="badge b-pass">PASS</span>'
      : c.verificationStatus === 'NOT APPLICABLE'
        ? '<span class="badge b-na">N/A</span>'
        : '<span class="badge" style="background:rgba(245,158,11,.15);color:var(--amber)">REVIEW</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + badge + '</td><td><b>' + esc(c.name) + '</b></td>' +
      '<td>' + esc(c.category) + '</td><td class="route">' + esc(c.route) + '</td>' +
      '<td>' + esc(c.inputs) + '</td><td class="formula" title="' + esc(c.formula) + '">' + esc(c.formula) + '</td>';
    tbody.appendChild(tr);
  }
  emptyEl.style.display = shown ? 'none' : 'block';
}
document.getElementById('q').addEventListener('input', e => { query = e.target.value; render(); });
document.getElementById('chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  filter = chip.dataset.f; render();
});
render();
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
fs.writeFileSync(OUT_DOCS, html, 'utf8');
console.log('Wrote ' + OUT + ' (+ docs/formula-review-dashboard.html)');
console.log('Embedded ' + contracts.contracts.length + ' contracts | ' + tracker.pass + ' PASS | ' + tracker.notApplicable + ' N/A | ' + tracker.needsReview + ' REVIEW');
