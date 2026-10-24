#!/usr/bin/env node
/* GSC paste-token helper — ONE command, no local server, no interaction loop.
 *
 * Paste the FULL callback URL your browser landed on after Google consent
 * (e.g. http://localhost:3737/oauth2callback?code=4/0A...&scope=...) and this
 * script exchanges the `code` for a fresh refresh token, saving it where the
 * GSC/GA4 scripts already look: gsc-refresh-token.json (root, git-ignored).
 *
 * Usage:
 *   node scripts/gsc-paste-token.cjs "http://localhost:3737/oauth2callback?code=4/0A..."
 *   echo "http://localhost:3737/oauth2callback?code=4/0A..." | node scripts/gsc-paste-token.cjs
 *   npm run gsc:token -- "http://localhost:3737/oauth2callback?code=4/0A..."
 *
 * No consent URL yet?  node scripts/gsc-oauth-login.cjs --paste
 * Docs: docs/api-credentials-setup.md → "Plan B"
 */
'use strict';
const { exchangeAuthCode, saveRefreshToken, loadOAuthClient } = require('./lib/google-oauth.cjs');

const EXIT_USAGE = 2;
const EXIT_FAIL = 1;

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function extractCode(raw) {
  const m = String(raw).match(/[?&]?code=([^&\s"'<>]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

(async function main() {
  let input = process.argv.slice(2).join(' ').trim();
  if (!input) input = (await readStdin()).trim();

  if (!input) {
    console.error('✖ No callback URL given.');
    console.error('');
    console.error('  Usage:');
    console.error('    node scripts/gsc-paste-token.cjs "http://localhost:3737/oauth2callback?code=4/0A..."');
    console.error('    echo "<callback URL>" | node scripts/gsc-paste-token.cjs');
    console.error('');
    console.error('  No consent URL yet?  node scripts/gsc-oauth-login.cjs --paste');
    process.exit(EXIT_USAGE);
  }

  const code = extractCode(input);
  if (!code) {
    console.error('✖ Could not find a `code=` value in that text.');
    console.error('  Paste the FULL address-bar URL you landed on after clicking Allow —');
    console.error('  it looks like: http://localhost:3737/oauth2callback?code=4/0A...&scope=...');
    console.error('  (A bare code with no URL works too.)');
    process.exit(EXIT_USAGE);
  }

  const client = loadOAuthClient();
  if (!client) {
    console.error('✖ OAuth client not found. Save the downloaded JSON as');
    console.error('  gsc-client-secret.json in the project root (or set GSC_OAUTH_CLIENT_SECRET).');
    console.error('  How: docs/api-credentials-setup.md → Plan B → Step 2.');
    process.exit(EXIT_FAIL);
  }

  try {
    const token = await exchangeAuthCode(code);
    const savedPath = saveRefreshToken(token);
    console.log('✅ Fresh GSC refresh token saved.');
    console.log('   File: ' + savedPath);
    console.log('   Scope: ' + (token.scope || '(not reported)'));
    console.log('');
    console.log('   Next:  npm run monitor:gsc');
  } catch (e) {
    console.error('✖ Token exchange failed: ' + e.message);
    if (e.hint) {
      console.error('');
      console.error('  ' + e.hint);
    }
    process.exit(EXIT_FAIL);
  }
})();
