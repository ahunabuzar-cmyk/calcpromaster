// Minimal GSC URL Inspection helper for new scripts. The older scripts
// (gsc-inspect-list.cjs, gsc-batch-inspect.cjs) keep their own inline versions —
// they are resumable and battle-tested, so this exists for new callers only.
//
// The weekly panel calls this with concurrency, so the transport has to be honest
// about *why* a call failed: Google throttling us (429 / 5xx) is worth retrying,
// a 403 or 404 is not. `isRetryable` draws that line, `withRetry` applies
// exponential backoff with jitter, and callers can hook `onRetry` to slow the
// whole pool down when a throttle is seen.
'use strict';
const https = require('https');
const { getAccessToken } = require('./google-oauth.cjs');

const HOST = 'searchconsole.googleapis.com';
const DEFAULT_TIMEOUT_MS = 30000;

async function token() {
  const t = await getAccessToken('https://www.googleapis.com/auth/webmasters');
  return typeof t === 'object' && t !== null ? t.access_token : t;
}

function request(method, urlPath, body, tok, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: HOST,
      path: urlPath,
      method,
      headers: {
        Authorization: 'Bearer ' + tok,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const err = new Error('HTTP ' + res.statusCode + ': ' + d.slice(0, 200));
          err.status = res.statusCode;
          return reject(err);
        }
        try { resolve(JSON.parse(d || '{}')); }
        catch (e) { reject(new Error('unparseable response: ' + d.slice(0, 120))); }
      });
    });
    // A hung socket must not stall a pool slot forever.
    req.setTimeout(timeoutMs, () => {
      const err = new Error('timeout after ' + timeoutMs + 'ms');
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------- retry policy (pure, unit-tested) ----------

const NETWORK_ERRORS = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE', 'ENOTFOUND']);

// A throttle or a Google-side hiccup is worth another attempt; a permission or
// not-found error never fixes itself.
function isRetryable(err) {
  if (!err) return false;
  if (NETWORK_ERRORS.has(err.code)) return true;
  if (/timeout|socket hang up|unparseable/i.test(String(err.message || ''))) return true;
  const status = Number(err.status);
  if (!Number.isFinite(status) || status === 0) return true;
  return status === 408 || status === 429 || status >= 500;
}

// Exponential backoff with ±30% jitter (so a pool that gets throttled together
// does not retry in lockstep), capped. attempt is 1-based.
function backoffMs(attempt, baseMs = 1000, capMs = 30000) {
  const raw = baseMs * 2 ** (Math.max(1, attempt) - 1);
  const jittered = raw * (0.7 + Math.random() * 0.6);
  // Clamp AFTER the jitter, so the cap is a real ceiling rather than something
  // the jitter can push past.
  return Math.round(Math.min(capMs, jittered));
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, opts = {}) {
  const attempts = opts.attempts || 4;
  const sleep = opts.sleep || defaultSleep;
  const onRetry = typeof opts.onRetry === 'function' ? opts.onRetry : () => {};
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      if (attempt === attempts || !isRetryable(e)) throw e;
      const wait = backoffMs(attempt, opts.baseMs, opts.capMs);
      onRetry({ attempt, wait, error: e });
      await sleep(wait);
    }
  }
  throw lastErr;
}

// siteUrl must be the exact Search Console property form (trailing slash).
async function inspectUrl(siteUrl, url, tok, opts = {}) {
  const r = await request('POST', '/v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl }, tok, opts.timeoutMs);
  const idx = (r.inspectionResult && r.inspectionResult.indexStatusResult) || {};
  return { url, coverage: idx.coverageState || 'UNKNOWN', verdict: idx.verdict || 'NEUTRAL' };
}

module.exports = { token, inspectUrl, request, isRetryable, backoffMs, withRetry };
