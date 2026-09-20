#!/usr/bin/env node
/* Plan B login — one-time browser consent for GSC/GA4 without any
 * service-account KEY file (Google org policy iam.disableServiceAccountKeyCreation
 * blocks key creation; it does NOT block OAuth clients).
 *
 * Two modes:
 *   node scripts/gsc-oauth-login.cjs           → server mode (localhost:3737
 *                                                receives the callback itself)
 *   node scripts/gsc-oauth-login.cjs --paste   → paste mode (no server needed:
 *                                                user pastes the callback URL,
 *                                                code is exchanged directly)
 *
 * Saves gsc-refresh-token.json (root, git-ignored). gsc-indexing.cjs /
 * ga4-events.cjs pick it up automatically via scripts/lib/google-oauth.cjs.
 * Docs: docs/api-credentials-setup.md → "Plan B"
 */
'use strict';
const http = require('http');
const https = require('https');
const readline = require('readline');
const fs = require('fs');
const { loadOAuthClient, OAUTH_REDIRECT_URI, REFRESH_TOKEN_FILE } = require('./lib/google-oauth.cjs');

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');
const PORT = 3737;

const client = loadOAuthClient();
if (!client) {
  console.error('✖ OAuth client-secret JSON not found.');
  console.error('  Save the downloaded file as gsc-client-secret.json in the project root');
  console.error('  (or set GSC_OAUTH_CLIENT_SECRET=/path/to/file).');
  console.error('  How: docs/api-credentials-setup.md → Plan B → Step 2.');
  process.exit(2);
}

function buildAuthUrl() {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', client.clientId);
  u.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('access_type', 'offline'); // ← refresh token
  u.searchParams.set('prompt', 'consent');      // ← refresh token even if granted before
  return u;
}

function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: OAUTH_REDIRECT_URI,
    grant_type: 'authorization_code',
  }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(data); } catch (e) { /* fallthrough */ }
        if (res.statusCode !== 200 || !json.refresh_token) {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 300)));
          return;
        }
        resolve(json);
      });
    });
    req.on('timeout', () => req.destroy(new Error('token timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function saveToken(json) {
  const out = {
    obtained_at: new Date().toISOString(),
    scope: json.scope || SCOPES,
    refresh_token: json.refresh_token,
  };
  fs.writeFileSync(REFRESH_TOKEN_FILE, JSON.stringify(out, null, 2));
  console.log('✅ Refresh token saved: ' + REFRESH_TOKEN_FILE);
  console.log('   Now run:  npm run monitor:gsc');
}

// ---------- paste mode: no local server at all ----------
async function pasteMode() {
  console.log('PASTE MODE — local server ki zaroorat nahi');
  console.log('');
  console.log('1. Ye URL us browser mein kholo jahan fazliabuzar7@gmail.com logged in hai');
  console.log('   (phone par bhi chalega):');
  console.log('');
  console.log(buildAuthUrl().toString());
  console.log('');
  console.log('2. Allow karne ke baad browser jo bhi page dikhaye (blank /');
  console.log('   "site can\'t be reached" / error — SAB chalega). Address bar ka');
  console.log('   POORA URL copy karo — wo aisa hoga:');
  console.log('   http://localhost:3737/oauth2callback?code=4/0Axxx...&scope=...');
  console.log('3. Wohi URL yahan paste karke Enter dabao:');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const line = await new Promise((res) => rl.question('> ', res));
  rl.close();
  const m = String(line).match(/code=([^&\s]+)/);
  if (!m) {
    console.error('✖ Isme code nahi mila — poora address-bar URL paste karna tha.');
    process.exit(1);
  }
  try {
    const json = await exchangeCode(decodeURIComponent(m[1]));
    saveToken(json);
    process.exit(0);
  } catch (e) {
    console.error('✖ Token exchange failed: ' + e.message);
    process.exit(1);
  }
}

// ---------- server mode: localhost:3737 receives the callback ----------
function serverMode() {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    if (u.pathname !== '/oauth2callback') {
      res.writeHead(404).end();
      return;
    }
    const code = u.searchParams.get('code');
    const err = u.searchParams.get('error');
    if (!code && !err) {
      // Stray hit (favicon/prefetch/curl probe) — keep the session alive.
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<p>Waiting for the real OAuth callback…</p>');
      return;
    }
    if (err || !code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Authorization failed</h2><p>' + (err || 'no code') + '</p>');
      console.error('✖ Consent failed: ' + (err || 'no code in callback'));
      process.exit(1);
    }
    exchangeCode(code)
      .then((json) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>✅ Done — refresh token saved.</h2><p>You can close this tab and go back to the terminal.</p>');
        saveToken(json);
        server.close(() => process.exit(0));
      })
      .catch((e) => {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>Token exchange failed</h2><pre>' + String(e.message).slice(0, 400) + '</pre>');
        console.error('✖ Token exchange failed: ' + e.message);
        process.exit(1);
      });
  });

  // Bind without host = dual-stack (IPv4 + IPv6) — 'localhost' in the browser
  // may resolve to ::1; binding only 127.0.0.1 would refuse the callback.
  server.listen(PORT, () => {
    console.log('Plan B login — browser consent (no service-account key needed)');
    console.log('');
    console.log('1. Is URL ko browser mein kholo (agar khud na khule):');
    console.log('');
    console.log(buildAuthUrl().toString());
    console.log('');
    console.log('2. Google account choose karo → "Allow" (the "hasn\'t been verified"');
    console.log('   screen is normal — this app is only for you: Continue → Allow).');
    console.log('3. Consent ke baad yahin ✅ aa jayega, aur token file ban jayegi.');
    console.log('   (Ye window band na karo jab tak browser mein ✅ na dikhe.)');
    console.log('   Server na chale to: node scripts/gsc-oauth-login.cjs --paste');
  });
}

if (process.argv.includes('--paste')) pasteMode();
else serverMode();
