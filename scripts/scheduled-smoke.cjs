// ============================================================
// CalcProMaster — Scheduled Smoke Test Runner
// ------------------------------------------------------------
// Runs the production-artifact E2E suites (deploy smoke, PDF/export,
// responsive, accessibility) against the deploy/ folder served on the
// DEPLOY_PORT, then reports PASS/FAIL and sends an alert on failure.
//
// Environment:
//   ALERT_WEBHOOK_URL  webhook to POST an alert to (Slack/Discord/Telegram/ntfy)
//   DEPLOY_PORT        port to serve deploy/ on (default 3100)
//
// Manual run:  node scripts/scheduled-smoke.cjs
// ============================================================
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.DEPLOY_PORT || '3100';
const BASE = `http://localhost:${PORT}`;
const WEBHOOK = process.env.ALERT_WEBHOOK_URL || '';
const CHANNEL = process.env.ALERT_CHANNEL || 'calcpro-master';

function sendAlert(subject, details) {
  if (!WEBHOOK) {
    console.error(`[ALERT WOULD FIRE] ${subject}\n${details}\n(no ALERT_WEBHOOK_URL — set it to enable delivery)`);
    return;
  }
  const body = JSON.stringify({ text: `🚨 [${CHANNEL}] ${subject}\n${details}` });
  return new Promise((resolve) => {
    try {
      const u = new URL(WEBHOOK);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => { res.resume(); res.on('end', resolve); });
      req.on('error', () => resolve());
      req.end(body);
    } catch { resolve(); }
  });
}

function waitForServer(url, tries = 20) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      http.get(url, (res) => { res.resume(); resolve(true); }).on('error', () => {
        if (n <= 0) resolve(false); else setTimeout(() => attempt(n - 1), 1000);
      });
    };
    attempt(tries);
  });
}

(async () => {
  console.log(`Smoke base: ${BASE}`);
  // Serve deploy/ on DEPLOY_PORT if not already listening.
  const up = await waitForServer(BASE + '/', 5);
  if (!up) {
    console.log('Starting deploy server on :' + PORT);
    const serve = spawnSync(process.execPath, ['scripts/serve-deploy.cjs'], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
    console.log(serve.stdout || serve.stderr || '');
    const nowUp = await waitForServer(BASE + '/', 20);
    if (!nowUp) { console.error('✗ deploy server failed to start'); process.exit(1); }
  }

  const SPECS = [
    'tests/e2e/deploy-smoke.spec.js',
    'tests/e2e/pdf-export-header.spec.js',
    'tests/e2e/responsive.spec.js',
    'tests/e2e/mobile-mic-layout.spec.js',
  ];
  let failed = 0;
  for (const spec of SPECS) {
    console.log(`\n=== ${spec} ===`);
    // Windows: bare 'npx' is not resolvable by spawnSync (it's npx.cmd, which
    // needs a shell) and always returns a non-zero status, falsely failing the
    // smoke. Invoke the Playwright CLI directly via the current node binary so
    // it works identically on every platform with no shell or .cmd resolution.
    const pwCli = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
    const r = spawnSync(process.execPath, [pwCli, 'test', spec, '-c', 'playwright.deploy.config.js', '--project=deploy-chromium'], {
      cwd: ROOT, encoding: 'utf8', timeout: 600000, maxBuffer: 20 * 1024 * 1024,
    });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    const summary = out.match(/\d+ passed[\s\S]*?\d+ failed/)?.[0] || out.match(/passed|failed/gi)?.join(' ') || 'no summary';
    console.log('  ' + summary.trim());
    if (r.status !== 0) {
      failed++;
      console.log(out.split('\n').filter((l) => /✘|failed|Error/i.test(l)).slice(0, 12).join('\n'));
    }
  }

  if (failed > 0) {
    await sendAlert(`SCHEDULED SMOKE FAILED (${failed} suite(s))`, `Suite ${BASE} — ${failed} Playwright suite(s) failed. Run "node scripts/scheduled-smoke.cjs" locally and inspect test-results/.`);
    console.error(`✗ SCHEDULED SMOKE FAILED: ${failed} suite(s)`);
    process.exit(1);
  }
  console.log('\n✅ SCHEDULED SMOKE PASS — all suites green on ' + BASE);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
