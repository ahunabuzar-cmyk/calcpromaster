// Restart the deploy server on 3100 cleanly: kill whatever holds the port
// (a stale server.js child from a previously killed Playwright run can keep
// serving broken responses and poison reuseExistingServer), then spawn a
// fresh detached server and poll until it answers 200.
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3100;
const ROOT = path.join(__dirname, '..');

function killPort(p) {
  try {
    const out = execSync(`netstat -ano | findstr :${p} | findstr LISTENING`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().split(/\s+/);
      const pid = m[m.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (e) { /* already dead */ }
    }
    if (pids.size) console.log(`killed ${pids.size} stale process(es) on :${p}`);
  } catch (e) { /* nothing listening */ }
}

killPort(PORT);

const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: { ...process.env, PORT: String(PORT), ROOT: 'deploy' },
});
child.unref();
console.log('DEPLOY_SERVE_LAUNCHED pid=' + child.pid);

// Poll until the server answers 200 (or give up after ~15s).
const deadline = Date.now() + 15000;
function poll() {
  const req = http.get({ host: 'localhost', port: PORT, path: '/', timeout: 2000 }, (res) => {
    if (res.statusCode === 200) {
      console.log('DEPLOY_SERVER_READY 200');
      process.exit(0);
    } else {
      res.resume();
      retry();
    }
  });
  req.on('error', retry);
  req.on('timeout', () => { req.destroy(); retry(); });
}
function retry() {
  if (Date.now() > deadline) {
    console.error('DEPLOY_SERVER_TIMEOUT');
    process.exit(1);
  }
  setTimeout(poll, 500);
}
poll();