// ============================================================
// CalcProMaster — Google OAuth helper (shared)
// ------------------------------------------------------------
// Zero-dependency OAuth2 access tokens for Google APIs (GA4 Data
// API, Search Console API). TWO credential paths, checked in order:
//
//   Plan B  user-OAuth refresh token — one-time browser consent via
//           scripts/gsc-oauth-login.cjs; stores gsc-refresh-token.json.
//           Needed when the Google org blocks service-account KEY
//           creation (org policy iam.disableServiceAccountKeyCreation).
//   Plan A  service-account JSON key (JWT bearer flow).
//
// Service-account key sources (priority):
//   1. env  GOOGLE_APPLICATION_CREDENTIALS  → path to service-account JSON
//   2. env  GA4_SERVICE_ACCOUNT / GSC_SERVICE_ACCOUNT → path (alias)
//   3. ./service-account.json (project root, git-ignored)
//
// Setup: docs/api-credentials-setup.md (Plan A) · Plan B section same file
// ============================================================
'use strict';
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function findCredentialsPath() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.GA4_SERVICE_ACCOUNT,
    process.env.GSC_SERVICE_ACCOUNT,
    path.join(__dirname, '..', '..', 'service-account.json'),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function loadCredentials() {
  const p = findCredentialsPath();
  if (!p) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!raw.client_email || !raw.private_key) return null;
    return { path: p, clientEmail: raw.client_email, privateKey: raw.private_key };
  } catch (e) {
    return null;
  }
}

// ---------- Plan B: user-OAuth (refresh token) ----------
const REFRESH_TOKEN_FILE = path.join(__dirname, '..', '..', 'gsc-refresh-token.json');
const OAUTH_REDIRECT_URI = 'http://localhost:3737/oauth2callback';

// Finds the downloaded OAuth client-secret JSON ("Web application" type;
// Google nests it under `installed` or `web`). No refresh-token requirement —
// the login script calls this BEFORE any token exists.
function loadOAuthClient() {
  const candidates = [
    process.env.GSC_OAUTH_CLIENT_SECRET,
    path.join(__dirname, '..', '..', 'gsc-client-secret.json'),
    path.join(__dirname, '..', '..', 'client-secret.json'),
  ];
  for (const p of candidates) {
    if (!p || !fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      const c = raw.installed || raw.web || raw;
      if (c.client_id && c.client_secret) {
        return { path: p, clientId: c.client_id, clientSecret: c.client_secret, redirectUri: OAUTH_REDIRECT_URI };
      }
    } catch (e) { /* try next candidate */ }
  }
  return null;
}

// Client + stored refresh token — the shape getAccessToken() needs.
function loadRefreshCreds() {
  const client = loadOAuthClient();
  if (!client) return null;
  const rtPath = process.env.GSC_REFRESH_TOKEN_FILE || REFRESH_TOKEN_FILE;
  if (!fs.existsSync(rtPath)) return null;
  try {
    const rt = JSON.parse(fs.readFileSync(rtPath, 'utf8'));
    if (!rt.refresh_token) return null;
    return { ...client, refreshToken: rt.refresh_token, rtPath, obtainedAt: rt.obtained_at || null };
  } catch (e) {
    return null;
  }
}

function postForm(url, formBody) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = new URLSearchParams(formBody).toString();
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
          catch (e) { reject(new Error('bad token response: ' + data.slice(0, 200))); }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('token timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------- Plan B: one-shot authorization-code exchange ----------
// Exchanges an OAuth `code` (from ?code=... in the redirect callback) for a
// refresh token. Used by scripts/gsc-oauth-login.cjs (server + paste modes)
// and scripts/gsc-paste-token.cjs (one-command non-interactive helper).
// Resolves to the raw token JSON ({ refresh_token, scope, ... }).
async function exchangeAuthCode(code) {
  const client = loadOAuthClient();
  if (!client) {
    const err = new Error('NO_OAUTH_CLIENT');
    err.hint = 'gsc-client-secret.json (OAuth client) not found in the project root.\n' +
      '   See docs/api-credentials-setup.md → Plan B → Step 2.';
    throw err;
  }
  const res = await postForm('https://oauth2.googleapis.com/token', {
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: OAUTH_REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  if (res.status !== 200 || !res.json.refresh_token) {
    const err = new Error('Token exchange failed (HTTP ' + res.status + '): ' + JSON.stringify(res.json).slice(0, 300));
    if (res.json && res.json.error === 'invalid_grant') {
      err.hint = 'Authorization codes are single-use and expire in ~10 minutes.\n' +
        '   Get a fresh consent URL: node scripts/gsc-oauth-login.cjs --paste';
    }
    throw err;
  }
  return res.json;
}

// Persists the refresh token to gsc-refresh-token.json (root, git-ignored).
// Returns the absolute path written.
function saveRefreshToken(json, fallbackScope) {
  const out = {
    obtained_at: new Date().toISOString(),
    scope: json.scope || fallbackScope || '',
    refresh_token: json.refresh_token,
  };
  fs.writeFileSync(REFRESH_TOKEN_FILE, JSON.stringify(out, null, 2));
  return REFRESH_TOKEN_FILE;
}

// Returns { access_token, expires_in } for the given scope.
async function getAccessToken(scope) {
  // Plan B first: user-OAuth refresh token. Org policies commonly block
  // service-account key creation outright; this path needs none.
  const ro = loadRefreshCreds();
  if (ro) {
    const res = await postForm('https://oauth2.googleapis.com/token', {
      grant_type: 'refresh_token',
      refresh_token: ro.refreshToken,
      client_id: ro.clientId,
      client_secret: ro.clientSecret,
    });
    if (res.status === 200 && res.json.access_token) return res.json;
    const err = new Error('OAuth refresh-token exchange failed (HTTP ' + res.status + '): ' + JSON.stringify(res.json).slice(0, 300));
    if (res.json && res.json.error === 'invalid_grant') {
      // invalid_grant on the refresh-token grant has exactly one recurring cause on
      // this project: an OAuth consent screen left in "Testing" publishing status,
      // where Google caps EVERY refresh token at 7 days. Obtained 2026-10-05 → dead
      // 2026-10-12, which is how it actually went down. Say so, loudly, with both
      // the immediate and the permanent fix — otherwise it re-reads as a mystery
      // every week (docs/GSC-STATUS-REPORT.md spent two audits with no root cause).
      const age = ro.obtainedAt
        ? '  (stored token obtained ' + ro.obtainedAt.slice(0, 10) + ')'
        : '';
      err.hint = 'invalid_grant — the stored refresh token is dead.' + age + '\n' +
        '   Known cause on this project: the OAuth consent screen is in "Testing" publishing\n' +
        '   status, where Google expires every refresh token after 7 days.\n' +
        '   \u2022 Re-consent now (needs a browser, ?code= expires in ~10 min):\n' +
        '       node scripts/gsc-oauth-login.cjs          # server mode — captures the callback\n' +
        '       node scripts/gsc-oauth-login.cjs --paste  # fallback — paste the callback URL\n' +
        '   \u2022 Permanent fix so this stops recurring every 7 days:\n' +
        '       Google Cloud Console \u2192 APIs & Services \u2192 OAuth consent screen \u2192\n' +
        '       Publishing status \u2192 "PUBLISH APP" (app stays unverified; the "not verified"\n' +
        '       warning + Continue keep working for you).\n' +
        '       https://console.cloud.google.com/apis/credentials/consent';
    } else {
      err.hint = 'Refresh token expired/revoked — re-run: node scripts/gsc-oauth-login.cjs';
    }
    throw err;
  }

  const cred = loadCredentials();
  if (!cred) {
    const err = new Error('NO_CREDENTIALS');
    err.hint = 'No Google credentials found. Two supported paths:\n' +
      '   Plan B (no key file needed): node scripts/gsc-oauth-login.cjs\n' +
      '     — needs gsc-client-secret.json (OAuth client) in project root;\n' +
      '     see docs/api-credentials-setup.md Plan B section.\n' +
      '   Plan A: service-account.json in project root (or GOOGLE_APPLICATION_CREDENTIALS).';
    throw err;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: cred.clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = header + '.' + claims;
  let signature;
  try {
    signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), cred.privateKey).toString('base64url');
  } catch (e) {
    const err = new Error('Could not sign JWT with the private key — is ' + cred.path + ' a real Google service-account key? (' + e.message + ')');
    err.hint = 'Download a fresh key from Google Cloud: APIs & Services → Credentials → your service account → Keys → Add Key → JSON.\n' +
      '   Save it as service-account.json in the project root.';
    throw err;
  }

  const res = await postForm('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signingInput + '.' + signature,
  });

  if (res.status !== 200 || !res.json.access_token) {
    const err = new Error('OAuth token exchange failed (HTTP ' + res.status + '): ' + JSON.stringify(res.json).slice(0, 300));
    err.hint = 'Check the service-account has permission. For GA4: add the service-account email as Viewer\n' +
      '   in the GA4 property (Admin → Property access management). For GSC: add it as User\n' +
      '   in Search Console (Settings → Users and permissions).';
    throw err;
  }
  return res.json;
}

module.exports = { getAccessToken, exchangeAuthCode, saveRefreshToken, loadCredentials, findCredentialsPath, loadOAuthClient, loadRefreshCreds, OAUTH_REDIRECT_URI, REFRESH_TOKEN_FILE };
