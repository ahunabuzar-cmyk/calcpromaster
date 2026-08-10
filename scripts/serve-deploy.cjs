// Detached deploy server launcher: runs the project's own static server (server.js)
// against the built deploy/ artifact on port 3100, then exits. The child is detached
// + unref'd so it survives the parent shell (Git Bash on Windows).
//
// Uses the same server.js (gzip + SPA fallback + soft-404 handling) instead of `npx serve`,
// so there is no extra dependency and deep-route smoke tests behave identically to dev.
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: { ...process.env, PORT: '3100', ROOT: 'deploy' },
});
child.unref();
console.log('DEPLOY_SERVE_LAUNCHED pid=' + child.pid + ' (server.js PORT=3100 ROOT=deploy)');
setTimeout(() => process.exit(0), 500);
