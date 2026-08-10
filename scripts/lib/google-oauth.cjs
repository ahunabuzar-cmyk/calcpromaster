// ============================================================
// CalcProMaster — Google Service-Account OAuth helper (shared)
// ------------------------------------------------------------
// Zero-dependency OAuth2 access-token flow for server-to-server
// Google APIs (GA4 Data API, Search Console API) using a Google
// Cloud service account. Uses only Node built-ins (crypto RS256
// JWT signing + https token exchange).
//
// Credentials source (in priority order):
//   1. env  GOOGLE_APPLICATION_CREDENTIALS  → path to service-account JSON
//   2. env  GA4_SERVICE_ACCOUNT / GSC_SERVICE_ACCOUNT → path (alias)
//   3. ./service-account.json (project root, git-ignored)
//
// Setup (one time, ~10 min): docs/api-credentials-setup.md
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

// Returns { access_token, expires_in } for the given scope.
async function getAccessToken(scope) {
  const cred = loadCredentials();
  if (!cred) {
    const err = new Error('NO_CREDENTIALS');
    err.hint = 'Google service-account credentials not found.\n' +
      '   Setup (one time): see docs/api-credentials-setup.md\n' +
      '   Then point GOOGLE_APPLICATION_CREDENTIALS to the JSON file,\n' +
      '   or save it as service-account.json in the project root (git-ignored).';
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

module.exports = { getAccessToken, loadCredentials, findCredentialsPath };
