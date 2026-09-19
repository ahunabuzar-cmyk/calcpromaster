#!/usr/bin/env node
/* Plan B login — one-time browser consent for GSC/GA4 without any
 * service-account KEY file (Google org policy iam.disableServiceAccountKeyCreation
 * blocks key creation; it does NOT block OAuth clients).
 *
 * What it does:
 *  1. Reads the downloaded OAuth client-secret JSON (gsc-client-secret.json
 *     or client-secret.json in project root, "Web application" type).
 *  2. Starts a tiny local server on 127.0.0.1:3737 and opens/states the
 *     consent URL (scope: webmasters.readonly + analytics.readonly).
 *  3. Exchanges ?code= for tokens; saves gsc-refresh-token.json (root,
 *     git-ignored). gsc-indexing.cjs / ga4-events.cjs pick it up automatically.
 *
 * Run: node scripts/gsc-oauth-login.cjs
 * Docs: docs/api-credentials-setup.md → "Plan B"
 */
'use strict';
const http = require('http');
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

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', client.clientId);
authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');   // ← refresh token
authUrl.searchParams.set('prompt', 'consent');         // ← force refresh token even if previously granted

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
  if (u.pathname !== '/oauth2callback') {
    res.writeHead(404).end();
    return;
  }
  const code = u.searchParams.get('code');
  const err = u.searchParams.get('error');
  if (err || !code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Authorization failed</h2><p>' + (err || 'no code') + '</p>');
    console.error('✖ Consent failed: ' + (err || 'no code in callback'));
    process.exit(1);
  }
  const body = new URLSearchParams({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: OAUTH_REDIRECT_URI,
    grant_type: 'authorization_code',
  }).toString();
  const opts = {
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    timeout: 15000,
  };
  const treq = require('https').request(opts, (tres) => {
    let data = '';
    tres.on('data', (c) => { data += c; });
    tres.on('end', () => {
      let json = {};
      try { json = JSON.parse(data); } catch (e) { /* fallthrough */ }
      if (tres.statusCode !== 200 || !json.refresh_token) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>Token exchange failed</h2><pre>' + data.slice(0, 400) + '</pre>');
        console.error('✖ Token exchange failed (HTTP ' + tres.statusCode + '): ' + data.slice(0, 300));
        process.exit(1);
      }
      const fs = require('fs');
      const out = {
        obtained_at: new Date().toISOString(),
        scope: json.scope || SCOPES,
        refresh_token: json.refresh_token,
      };
      fs.writeFileSync(REFRESH_TOKEN_FILE, JSON.stringify(out, null, 2));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>✅ Done — refresh token saved.</h2><p>You can close this tab and go back to the terminal.</p>');
      console.log('✅ Refresh token saved: ' + REFRESH_TOKEN_FILE);
      console.log('   Now run:  node scripts/gsc-indexing.cjs   (GSC report)');
      console.log('        or:  GA4_PROPERTY_ID=<numeric-id> node scripts/ga4-events.cjs');
      server.close(() => process.exit(0));
    });
  });
  treq.on('timeout', () => treq.destroy(new Error('token timeout')));
  treq.on('error', (e) => {
    console.error('✖ Token exchange error: ' + e.message);
    process.exit(1);
  });
  treq.write(body);
  treq.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Plan B login — browser consent (no service-account key needed)');
  console.log('');
  console.log('1. Is URL ko browser mein kholo (agar khud na khule):');
  console.log('');
  console.log(authUrl.toString());
  console.log('');
  console.log('2. Google account choose karo → "Allow" (the "hasn\'t been verified"');
  console.log('   screen is normal — this app is only for you: Continue → Allow).');
  console.log('3. Consent ke baad yahin ✅ aa jayega, aur token file ban jayegi.');
});
