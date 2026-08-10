// ============================================================
// CalcProMaster — Production Uptime Checker
// ------------------------------------------------------------
// Verifies the live production URL answers HTTP 200 for the
// homepage + a set of critical routes. On failure it sends an
// alert to a configured webhook (if ALERT_WEBHOOK_URL is set)
// and exits non-zero (so CI/CRON can react).
//
// Config (environment variables — never hardcode secrets):
//   PROD_URL          base URL to check (default https://calcpromaster.netlify.app)
//   ALERT_WEBHOOK_URL webhook to POST a JSON alert to (Slack/Discord/Telegram/ntfy)
//   ALERT_CHANNEL     optional channel/room label used in the message
//
// Manual run:  node scripts/uptime-check.cjs
// Test alert:  node scripts/uptime-check.cjs --test-alert
// ============================================================
'use strict';
const http = require('http');
const https = require('https');

const PROD_URL = process.env.PROD_URL || 'https://calcpromaster.netlify.app';
const WEBHOOK = process.env.ALERT_WEBHOOK_URL || '';
const CHANNEL = process.env.ALERT_CHANNEL || 'calcpro-master';

// Critical routes to check (SPA routes respond 200 with index.html).
const ROUTES = ['/', '/finance/loan-emi', '/health/bmi', '/math/percentage', '/hub/finance', '/about'];

function fetchStatus(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 12000 }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, url });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', (e) => reject(e));
  });
}

async function sendAlert(subject, details) {
  if (!WEBHOOK) {
    console.error(`[ALERT WOULD FIRE] ${subject}\n${details}\n(no ALERT_WEBHOOK_URL configured — set it to enable delivery)`);
    return;
  }
  const body = JSON.stringify({ text: `🚨 [${CHANNEL}] ${subject}\n${details}` });
  try {
    await new Promise((resolve, reject) => {
      const u = new URL(WEBHOOK);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => { res.resume(); res.on('end', resolve); });
      req.on('error', reject);
      req.end(body);
    });
    console.log(`[ALERT SENT] ${subject}`);
  } catch (e) {
    console.error('[ALERT DELIVERY FAILED]', e.message);
  }
}

(async () => {
  if (process.argv.includes('--test-alert')) {
    await sendAlert('Test alert — monitoring is live', 'This is a test message from scripts/uptime-check.cjs.');
    process.exit(0);
  }
  const failures = [];
  for (const route of ROUTES) {
    try {
      const { status } = await fetchStatus(PROD_URL + route);
      if (status >= 400) failures.push(`${route} → HTTP ${status}`);
      else console.log(`  ✓ ${route} → ${status}`);
    } catch (e) {
      failures.push(`${route} → ${e.message}`);
    }
  }
  if (failures.length) {
    await sendAlert(`PRODUCTION DOWN/ERROR (${failures.length}/${ROUTES.length} routes failed)`, failures.join('\n'));
    console.error('✗ UPTIME CHECK FAILED:\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log(`✅ Uptime check PASS — ${PROD_URL} all ${ROUTES.length} routes healthy.`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
