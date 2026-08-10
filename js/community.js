// ====== CommunityGrowth (Pillar 2: Zero-Friction Lead Generation) ======
// 100% free tools → the only ask is a weekly newsletter email.
// "Export Result as PDF / Send to Email" opens a clean modal that captures the
// email, stores the lead locally, and generates a client-side CSV/printable-PDF
// report of the current calculation. No backend required.
const CommunityGrowth = (function () {
  var LEADS_KEY = 'calcpro_newsletter_leads';
  var EMAIL_KEY = 'calcpro_email';
  var CAPTURED_KEY = 'calcpro_capture_shown';

  function isValidEmail(v) {
    return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  }

  // Persist lead locally (owner can export from localStorage). Never sent anywhere.
  function saveLead(email, context) {
    try {
      var leads = JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
      leads.push({ email: email, context: context || '', ts: Date.now() });
      if (leads.length > 500) leads = leads.slice(-500);
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      localStorage.setItem(EMAIL_KEY, email);
    } catch (e) { /* quota */ }
  }

  // Grab the current result + inputs for the report
  function collectReport() {
    var report = {
      tool: '', toolId: '', inputs: {}, result: '', extra: '',
      url: window.location.href, ts: new Date().toISOString()
    };
    try {
      var cur = window.App && App._currentTool;
      if (cur && cur.tool) {
        report.tool = cur.tool.name || '';
        report.toolId = cur.tool.id || '';
      }
    } catch (e) {}
    var rm = document.getElementById('result-area');
    if (rm) {
      var main = rm.querySelector('.result-main');
      var extra = rm.querySelector('.result-extra');
      if (main) report.result = main.textContent.trim();
      if (extra) report.extra = extra.textContent.trim();
    }
    try {
      var vals = App._collectValues ? App._collectValues() : {};
      report.inputs = vals;
    } catch (e) {}
    return report;
  }

  // CSV export (download)
  function exportCSV(report) {
    var rows = [
      ['CalcProMaster Result Report'],
      ['Tool', report.tool],
      ['URL', report.url],
      ['Date', report.ts],
      [],
      ['Input', 'Value']
    ];
    Object.entries(report.inputs || {}).forEach(function (kv) { rows.push([kv[0], String(kv[1])]); });
    rows.push([], ['Result', report.result], ['Details', report.extra]);
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? '' : c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'calcpro-' + (report.toolId || 'report') + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // PDF export via print dialog (100% client-side, zero deps, offline-friendly)
  function exportPDF(report) {
    var w = window.open('', '_blank');
    if (!w) { if (window.App) App.showToast('Allow pop-ups to export PDF'); return; }
    // Escape EVERYTHING — report.inputs can contain raw text-input values that a
    // crafted shareable URL (auto-filled via URLStateManager) could weaponize.
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    var rows = Object.entries(report.inputs || {})
      .map(function (kv) { return '<tr><td>' + esc(kv[0]) + '</td><td>' + esc(kv[1]) + '</td></tr>'; }).join('');
    // DOM API print document (no document.write — CSP-friendly)
    var d = w.document;
    d.open();
    d.title = 'CalcProMaster — ' + esc(report.tool || 'Result Report');
    var st = d.createElement('style');
    st.textContent = 'body{font-family:Inter,Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#1e293b}' +
      'h1{font-size:22px;border-bottom:2px solid #4f46e5;padding-bottom:10px}' +
      'table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #e2e8f0;padding:8px 10px;font-size:13px;text-align:left}' +
      'th{background:#f1f5f9}.result{font-size:20px;font-weight:700;color:#4f46e5;padding:12px;background:#eef2ff;border-radius:8px;margin:12px 0}' +
      '.extra{color:#64748b;font-size:14px;margin:8px 0}.meta{color:#94a3b8;font-size:12px}';
    d.head.appendChild(st);
    d.body.innerHTML =
      '<h1>CalcProMaster — ' + esc(report.tool || 'Result Report') + '</h1>' +
      '<div class="meta">Generated: ' + esc(report.ts) + '<br>URL: ' + esc(report.url) + '</div>' +
      '<div class="result">' + esc(report.result || '—') + '</div>' +
      (report.extra ? '<div class="extra">' + esc(report.extra) + '</div>' : '') +
      '<h2>Inputs</h2><table><thead><tr><th>Input</th><th>Value</th></tr></thead><tbody>' + (rows || '<tr><td colspan="2">—</td></tr>') + '</tbody></table>' +
      '<p style="font-size:11px;color:#94a3b8;margin-top:24px">Generated by CalcProMaster — 566+ free calculators. Estimates only; verify independently.</p>';
    d.close();
    setTimeout(function () { w.focus(); w.print(); }, 400);
  }

  // Open the email-capture modal (used for "Send to Email" + "Join Newsletter")
  function openEmailModal(mode, report) {
    report = report || collectReport();
    var modal = document.getElementById('modalOverlay');
    var body = document.getElementById('modalBody');
    if (!modal || !body) return;
    var savedEmail = '';
    try { savedEmail = localStorage.getItem(EMAIL_KEY) || ''; } catch (e) {}
    // Escape before injecting into the value attribute (defense in depth)
    savedEmail = String(savedEmail).replace(/"/g, '&quot;');
    var isSend = mode === 'send';
    body.innerHTML =
      '<h3>' + (isSend ? '📧 Send this Report' : '💌 Join the Free Weekly Newsletter') + '</h3>' +
      '<p style="font-size:14px;color:var(--text-light);margin:8px 0 16px">' +
      (isSend
        ? 'All tools are 100% free forever. Enter your email and we will send you this result as a PDF report.'
        : 'One email per week with new calculators, tips, and features. No spam, unsubscribe anytime.') +
      '</p>' +
      '<form onsubmit="CommunityGrowth.submitEmail(event,\'' + (isSend ? 'send' : 'newsletter') + '\')">' +
      '<div class="input-group"><label for="cg-email">Email address</label>' +
      '<input type="email" id="cg-email" class="calc-input" value="' + savedEmail + '" placeholder="you@example.com" required autocomplete="email"></div>' +
      '<div style="display:flex;gap:8px;margin-top:16px">' +
      '<button type="submit" class="calc-btn" style="flex:1">' + (isSend ? 'Send Report' : 'Subscribe') + '</button>' +
      (isSend
        ? '<button type="button" class="action-btn" onclick="CommunityGrowth.exportCSV(CommunityGrowth.collectReport())">⬇️ CSV</button>' +
          '<button type="button" class="action-btn" onclick="CommunityGrowth.exportPDF(CommunityGrowth.collectReport())">🖨️ PDF</button>'
        : '') +
      '</div></form>' +
      '<p style="font-size:12px;color:var(--text-light);margin-top:12px">We never share your email. Everything runs client-side.</p>';
    modal.classList.add('active');
    setTimeout(function () { var el = document.getElementById('cg-email'); if (el) el.focus(); }, 50);
  }

  function submitEmail(e, mode) {
    e.preventDefault();
    var input = document.getElementById('cg-email');
    if (!input) return;
    var email = input.value.trim();
    if (!isValidEmail(email)) {
      if (window.App) App.showToast('Please enter a valid email address', 3000);
      input.focus();
      return;
    }
    var report = collectReport();
    saveLead(email, mode === 'send' ? ('send-report:' + (report.toolId || '')) : 'newsletter');
    document.getElementById('modalOverlay').classList.remove('active');
    if (mode === 'send') {
      exportPDF(report);
      if (window.App) App.showToast('Report ready — check the print dialog 📄');
    } else {
      if (window.App) App.showToast('🎉 Subscribed! Welcome to the weekly letter.');
    }
  }

  // Show a subtle "Export result" action next to the result area.
  // NOTE: #result-area sits inside <form id="calc-form"> — buttons MUST be
  // type="button" or they trigger a form submit (re-running the calc).
  function attachResultActions() {
    var area = document.getElementById('result-area');
    if (!area || area.querySelector('.cg-export-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'cg-export-bar';
    bar.innerHTML =
      '<button type="button" class="action-btn small" onclick="CommunityGrowth.openEmailModal(\'send\')">📤 Send to Email</button>' +
      '<button type="button" class="action-btn small" onclick="CommunityGrowth.exportCSV(CommunityGrowth.collectReport())">⬇️ CSV</button>' +
      '<button type="button" class="action-btn small" onclick="CommunityGrowth.exportPDF(CommunityGrowth.collectReport())">🖨️ PDF</button>';
    area.appendChild(bar);
  }

  // Gentle newsletter nudge: after the 2nd calculation, offer a one-time capture
  function maybeNudge() {
    try {
      if (sessionStorage.getItem(CAPTURED_KEY)) return;
      var count = 0;
      try { count = (window.CalcAnalytics && CalcAnalytics.getData().totalCalcs) || 0; } catch (e) {}
      if (count >= 2) {
        sessionStorage.setItem(CAPTURED_KEY, '1');
        // Delay so it never interrupts the calculation flow
        setTimeout(function () { CommunityGrowth.openEmailModal('newsletter'); }, 1200);
      }
    } catch (e) { /* non-blocking */ }
  }

  function init() {
    // #result-area is recreated on every tool render (main.innerHTML reset), so a
    // persistent MutationObserver on it is useless — the document-level calc:done
    // event (dispatched by executeCalc after every render) covers attach + nudge.
    document.addEventListener('calc:done', maybeNudge);
    document.addEventListener('calc:done', function () {
      var el = document.getElementById('result-area');
      if (el) CommunityGrowth.attachResultActions();
    });
  }

  return {
    init: init,
    openEmailModal: openEmailModal,
    submitEmail: submitEmail,
    collectReport: collectReport,
    exportCSV: exportCSV,
    exportPDF: exportPDF,
    attachResultActions: attachResultActions,
    maybeNudge: maybeNudge
  };
})();

if (typeof window !== 'undefined') window.CommunityGrowth = CommunityGrowth;
if (typeof module !== 'undefined' && module.exports) module.exports = { CommunityGrowth };
