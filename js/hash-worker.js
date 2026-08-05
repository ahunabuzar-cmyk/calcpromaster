// ====== HashWorker — main-thread wrapper for js/workers/hash-worker.js ======
// Single shared worker instance. Falls back to main-thread crypto.subtle if
// Worker API is unavailable (file:// or very old browsers).
const HashWorker = (function () {
  var worker = null;
  var pending = {};   // id -> { resolve, reject }
  var counter = 0;
  var fallback = false;

  function getWorker() {
    if (worker) return worker;
    try {
      worker = new Worker('js/workers/hash-worker.js');
      worker.onmessage = function (e) {
        var msg = e.data;
        if (!msg || !pending[msg.id]) return;
        var p = pending[msg.id];
        delete pending[msg.id];
        if (msg.ok) p.resolve(msg.result);
        else p.reject(new Error(msg.error || 'hash worker error'));
      };
      worker.onerror = function () { fallback = true; };
      return worker;
    } catch (e) {
      fallback = true;
      return null;
    }
  }

  function post(op, data) {
    var id = ++counter;
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      var w = getWorker();
      if (!w) {
        // Fallback path — compute on main thread (UI-blocking only for tiny inputs)
        delete pending[id];
        if (op === 'sha256' && window.crypto && window.crypto.subtle) {
          crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(data)))
            .then(function (d) {
              resolve(Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join(''));
            })
            .catch(function (e) { reject(e); });
        } else {
          reject(new Error('Worker unavailable for ' + op));
        }
        return;
      }
      try {
        w.postMessage({ id: id, type: op, data: data });
      } catch (e) {
        delete pending[id];
        reject(e);
      }
    });
  }

  function sha256(text) { return post('sha256', text); }
  function sha256Batch(arr) { return post('sha256-hex-array', arr); }
  function terminate() {
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    pending = {};
  }

  return { sha256: sha256, sha256Batch: sha256Batch, terminate: terminate, isWorker: function () { return !fallback; } };
})();

if (typeof window !== 'undefined') window.HashWorker = HashWorker;
