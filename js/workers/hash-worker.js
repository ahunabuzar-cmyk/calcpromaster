// ====== CalcPro Hash Worker ======
// Offloads SHA-256 (and future heavy ops) to a Web Worker so the main UI
// thread stays at 60fps. Wrapped by HashWorker in js/monitoring.js — tools
// never touch this file directly.
self.addEventListener('message', async function (e) {
  const { id, type, data } = e.data || {};
  try {
    if (type === 'sha256') {
      const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      self.postMessage({ id, ok: true, result: hex });
      return;
    }
    if (type === 'sha256-hex-array') {
      // Hash a batch of strings — returns array of hex digests
      const results = [];
      for (const s of data) {
        const b = new TextEncoder().encode(String(s));
        const d = await crypto.subtle.digest('SHA-256', b);
        results.push(Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, '0')).join(''));
      }
      self.postMessage({ id, ok: true, result: results });
      return;
    }
    if (type === 'ping') {
      self.postMessage({ id, ok: true, result: 'pong' });
      return;
    }
    self.postMessage({ id, ok: false, error: 'Unknown op: ' + type });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
});

// Keep-alive signal (worker must never die mid-hash)
self.addEventListener('error', function (e) {
  self.postMessage({ id: -1, ok: false, error: 'Worker runtime error' });
});
