// Safe recursive descent math parser - replaces eval()
const SafeMathParser = (function () {
  const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: 1.6180339887 };
  const FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, log: Math.log10, ln: Math.log, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign, deg: (r) => r * 180 / Math.PI, rad: (d) => d * Math.PI / 180 };
  // Tokenizer with maxExprLen=1000 guard and inline state flags (no regex allocations)
  var MAX_EXPR_LEN = 1000;
  function tokenize(expr) {
    if (typeof expr !== 'string' || expr.length > MAX_EXPR_LEN) return [{ t: 'num', v: 0 }];
    var tokens = [];
    var i = 0;
    var len = expr.length;
    var c, num, name, code;
    while (i < len) {
      c = expr.charCodeAt(i);
      // Whitespace (space 32, tab 9, newline 10, cr 13)
      if (c === 32 || c === 9 || c === 10 || c === 13) { i++; continue; }
      // Digit or dot (0-9 .)
      if ((c >= 48 && c <= 57) || c === 46) {
        num = '';
        while (i < len && ((c = expr.charCodeAt(i)) >= 48 && c <= 57) || c === 46) { num += expr[i]; i++; }
        tokens.push({ t: 'num', v: parseFloat(num) });
        continue;
      }
      // Alpha (a-z A-Z) or underscore
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
        name = '';
        while (i < len) {
          code = expr.charCodeAt(i);
          if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            name += expr[i]; i++;
          } else break;
        }
        tokens.push({ t: 'id', v: name.toLowerCase() });
        continue;
      }
      // Operators: + - * / % ^ ! ( )
      c = expr[i];
      if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%' || c === '^' || c === '!' || c === '(' || c === ')') {
        tokens.push({ t: 'op', v: c });
        i++;
        continue;
      }
      throw new Error('Invalid char: ' + c);
    }
    return tokens;
  }
  function Parser(tokens) { let pos = 0; const peek = () => tokens[pos]; const next = () => tokens[pos++]; const eat = (v) => { if (peek() && peek().v === v) pos++; else throw new Error('Expected ' + v); };
    function parseExpr() { let left = parseTerm(); while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) { const op = next().v; const right = parseTerm(); left = op === '+' ? left + right : left - right; } return left; }
    function parseTerm() { let left = parseFactor(); while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) { const op = next().v; const right = parseFactor(); left = op === '*' ? left * right : op === '/' ? left / right : left % right; } return left; }
    function parseFactor() { let left = parseUnary(); while (peek() && peek().t === 'op' && (peek().v === '^' || peek().v === '!')) { const op = next().v; if (op === '^') left = Math.pow(left, parseUnary()); else { let f = 1; for (let k = 2; k <= left; k++) f *= k; left = f; } } return left; }
    function parseUnary() { if (peek() && peek().t === 'op' && peek().v === '-') { next(); return -parseUnary(); } if (peek() && peek().t === 'op' && peek().v === '+') { next(); return parseUnary(); } return parsePrimary(); }
    function parsePrimary() { const tk = peek(); if (!tk) throw new Error('Unexpected end'); if (tk.t === 'num') { next(); return tk.v; } if (tk.t === 'op' && tk.v === '(') { next(); const v = parseExpr(); eat(')'); return v; } if (tk.t === 'id') { next(); if (peek() && peek().t === 'op' && peek().v === '(') { next(); const arg = parseExpr(); eat(')'); if (FUNCS[tk.v]) return FUNCS[tk.v](arg); throw new Error('Unknown function: ' + tk.v); } if (CONSTS[tk.v] !== undefined) return CONSTS[tk.v]; throw new Error('Unknown identifier: ' + tk.v); } throw new Error('Unexpected token'); }
    this.parse = () => { const r = parseExpr(); if (pos < tokens.length) throw new Error('Unexpected token'); return r; }; }
  function safeEval(expr) { try { const tokens = tokenize(String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')); const raw = new Parser(tokens).parse(); return Number(raw.toFixed(10)); } catch (e) { return NaN; } }
  // evaluate() throws on invalid input (used by the Scientific Calculator UI which expects errors)
  function evaluate(expr) { const tokens = tokenize(String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')); const result = new Parser(tokens).parse(); if (typeof result !== 'number' || isNaN(result)) throw new Error('Invalid expression'); return result; }
  return { safeEval, evaluate };
})();
if (typeof window !== 'undefined') { window.safeEval = SafeMathParser.safeEval; window.SafeMathParser = SafeMathParser; }

// QR Code generator - client-side, no third-party API
const QRCode = (function () {
  const GF256 = (function () { const exp = new Array(512), log = new Array(256); let x = 1; for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) exp[i] = exp[i - 255]; return { exp, log }; })();
  function rsEncode(data, ecLen) { const gen = new Array(ecLen).fill(0); gen[0] = 1; for (let i = 0; i < ecLen; i++) { for (let j = ecLen - 1; j > 0; j--) gen[j] = gen[j - 1] ^ GF256.exp[(GF256.log[gen[j]] + i) % 255]; gen[0] = GF256.exp[(GF256.log[gen[0] || 1] + i) % 255]; } const res = new Array(ecLen).fill(0); for (let i = 0; i < data.length; i++) { const factor = data[i] ^ res[0]; res.shift(); res.push(0); if (factor) for (let j = 0; j < ecLen; j++) res[j] ^= GF256.exp[(GF256.log[factor] + GF256.log[gen[ecLen - 1 - j]]) % 255]; } return res; }
  const SIZES = [21,25,29,33,37,41,45,49,53,57,61,65,69,73,77,81,85,89,93,97,101,105,109,113,117,121,125,129,133,137,141,145,149,153,157,161,165,169,173,177];
  const CAP_L = [17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858,929,1003,1091,1171,1273,1367,1465,1528,1628,1732,1840,1952,2068,2188,2303,2431,2563,2699,2809,2953];
  const EC_L = [7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,28,28,28,28,30,30,30,30,30,30,30,30,30,30];
  function pickVersion(text) { for (let v = 0; v < 40; v++) if (text.length <= CAP_L[v]) return v; return 39; }
  function generate(text) { const v = pickVersion(text); const size = SIZES[v]; const matrix = new Array(size); for (let i = 0; i < size; i++) matrix[i] = new Array(size).fill(null);
    function placeFinder(r, c) { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const rr = r + i, cc = c + j; if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue; let val = false; if (i >= 0 && i <= 6 && j >= 0 && j <= 6) { if (i === 0 || i === 6 || j === 0 || j === 6) val = true; if (i >= 2 && i <= 4 && j >= 2 && j <= 4) val = true; } matrix[rr][cc] = val; } }
    placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0);
    for (let i = 8; i < size - 8; i++) { if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0; if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0; }
    const bytes = []; for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); if (code < 128) bytes.push(code); else if (code < 2048) { bytes.push(0xc0 | (code >> 6)); bytes.push(0x80 | (code & 0x3f)); } else { bytes.push(0xe0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3f)); bytes.push(0x80 | (code & 0x3f)); } }
    const bits = []; bits.push(0,1,0,0); const ccBits = v < 9 ? 8 : 16; const len = bytes.length; for (let i = ccBits - 1; i >= 0; i--) bits.push((len >> i) & 1); for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    const dataCap = CAP_L[v] + 2 + (v < 9 ? 1 : 2); while (bits.length < dataCap * 8) bits.push(0);
    const dataBytes = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8 && i + j < bits.length; j++) b = (b << 1) | bits[i + j]; dataBytes.push(b); }
    while (dataBytes.length < dataCap) { dataBytes.push(0xec); if (dataBytes.length < dataCap) dataBytes.push(0x11); }
    const ecBytes = rsEncode(dataBytes.slice(0, CAP_L[v]), EC_L[v]); const allBytes = dataBytes.concat(ecBytes);
    const allBits = []; for (const b of allBytes) for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);
    let bitIdx = 0; let upward = true;
    for (let col = size - 1; col > 0; col -= 2) { if (col === 6) col--; for (let i = 0; i < size; i++) { const row = upward ? size - 1 - i : i; for (let j = 0; j < 2; j++) { const c = col - j; if (matrix[row][c] === null) matrix[row][c] = allBits[bitIdx++] || false; } } upward = !upward; }
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) { if (matrix[r][c] !== null && (r + c) % 2 === 0 && !isReserved(r, c, size)) matrix[r][c] = !matrix[r][c]; }
    return matrix;
  }
  function isReserved(r, c, size) { const inFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8); return inFinder || r === 6 || c === 6; }
  function toDataURL(text, scale) { scale = scale || 8; const matrix = generate(text); const size = matrix.length; const canvas = document.createElement('canvas'); canvas.width = size * scale; canvas.height = size * scale; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000'; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (matrix[r][c]) ctx.fillRect(c * scale, r * scale, scale, scale); return canvas.toDataURL(); }
  return { generate, toDataURL };
})();
if (typeof window !== 'undefined') window.QRCode = QRCode;

// History - localStorage based, max 200 items. Each entry stores the full input
// snapshot (values) so entries can be restored (save/load) and exported as JSON.
const CalcHistory = (function () {
  const KEY = 'calcpro_history'; const MAX = 200;
  function getAll() { return Security.safeGetItem(KEY, []); }
  function add(entry) { const items = getAll(); items.unshift({ ...entry, ts: Date.now(), time: entry.time || Date.now() }); if (items.length > MAX) items.length = MAX; localStorage.setItem(KEY, JSON.stringify(items)); }
  function remove(idx) { const items = getAll(); items.splice(idx, 1); localStorage.setItem(KEY, JSON.stringify(items)); }
  // Purge entries whose toolId was merged/removed (SEO dedupe) so stale
  // history never links to a deleted calculator. Returns count removed.
  function purgeToolIds(ids) {
    const set = ids instanceof Set ? ids : new Set(ids || []);
    if (!set.size) return 0;
    const items = getAll();
    const kept = items.filter(it => !set.has(it.toolId));
    if (kept.length === items.length) return 0;
    localStorage.setItem(KEY, JSON.stringify(kept));
    return items.length - kept.length;
  }
  function clear() { localStorage.removeItem(KEY); }
  function exportJSON() { return JSON.stringify(getAll(), null, 2); }
  function importJSON(json) {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return false;
      const seen = {};
      const merged = [];
      getAll().concat(arr).forEach(function (it) {
        const key = it.ts || (it.toolId + ':' + it.result);
        if (seen[key]) return;
        seen[key] = true;
        merged.push(it);
      });
      localStorage.setItem(KEY, JSON.stringify(merged.slice(0, MAX)));
      return true;
    } catch (e) { return false; }
  }
  function toggle() { const panel = document.getElementById('history-panel'); if (!panel) return; panel.classList.toggle('open'); if (panel.classList.contains('open')) render(); }
  function render() { const list = document.getElementById('history-list'); if (!list) return; const items = getAll(); if (items.length === 0) { list.innerHTML = '<p style="padding:1rem;color:var(--text-muted)">No history yet</p>'; return; } // XSS-hardening: history results can hold HTML/crafted values from shared URLs — always escape
  list.innerHTML = items.map((it, i) => `<div class="history-item"><div class="history-tool">${Security.sanitizeHtml(it.tool || 'Calculator')}</div><div class="history-result">${Security.sanitizeHtml(it.result || '')}</div><div class="history-time">${new Date(it.ts).toLocaleString()}</div><button class="history-del" onclick="CalcHistory.remove(${i})">×</button></div>`).join(''); }
  return { getAll, add, remove, clear, toggle, render, exportJSON, importJSON, purgeToolIds };
})();
if (typeof window !== 'undefined') window.CalcHistory = CalcHistory;

// ========== XSS Prevention & Data Security ==========
const Security = (function () {
  // HTML-escape a string for safe innerHTML usage
  function sanitizeHtml(str) {
    if (typeof str !== 'string') str = String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Safe localStorage getter with schema validation
  function safeGetItem(key, fallback, validator) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      // Optional validator function to check shape
      if (typeof validator === 'function' && !validator(parsed)) return fallback;
      return parsed;
    } catch (e) {
      localStorage.removeItem(key);
      return fallback;
    }
  }

  // Safe escaping for values inlined into onclick="fn('...')" JS string context.
  // NOTE: HTML-entity escaping (&#039;) is NOT enough there — the HTML parser decodes
  // entities BEFORE the JS engine runs, so a crafted ' would break out again.
  // Backslash-escapes survive HTML parsing untouched and are honored by JS.
  function sanitizeJsString(str) {
    return String(str == null ? '' : str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;'); // double-quote only breaks the attribute boundary — keep entity-encoded
  }

  // Safe JSON.parse with fallback
  function safeJsonParse(str, fallback) {
    try { return JSON.parse(str) || fallback; }
    catch (e) { return fallback; }
  }

  // Validate that a value is within allowed length/type bounds
  function validateInput(value, opts) {
    opts = opts || {};
    const maxLen = opts.maxLen || 500;
    const allowAlpha = opts.allowAlpha !== false;
    const allowNumeric = opts.allowNumeric !== false;
    const allowSymbols = opts.allowSymbols || '';
    
    const str = String(value);
    if (str.length > maxLen) return str.substring(0, maxLen);
    
    if (!allowAlpha || !allowNumeric) {
      let allowed = '';
      if (allowNumeric) allowed += '0-9';
      if (allowAlpha) allowed += 'a-zA-Z';
      const escapedSymbols = allowSymbols.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp('[^' + allowed + escapedSymbols + ']', 'g');
      return str.replace(regex, '');
    }
    return str;
  }

  // Sanitize a calculation input: ensure it's a safe number or 0
  function sanitizeCalcValue(value, fallback) {
    fallback = fallback || 0;
    var num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
    return isNaN(num) || !isFinite(num) ? fallback : Number(num.toFixed(10));
  }

  // ===== Crypto-grade randomness (Web Crypto API) =====
  // Replaces Math.random() in password/token/random-generator tools.
  // Falls back to Math.random ONLY in non-secure contexts (file://).
  function cryptoRandom() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  // Cryptographically-secure integer in [min, max] (inclusive)
  function cryptoRandomInt(min, max) {
    min = Math.ceil(min); max = Math.floor(max);
    if (max <= min) return min;
    return Math.floor(cryptoRandom() * (max - min + 1)) + min;
  }

  // Secure password / token generator
  // charset types: 'lower','upper','num','sym','hex','base64url'
  function generateSecureToken(length, charset) {
    length = length || 32;
    charset = charset || 'base64url';
    var pool = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      num: '0123456789',
      sym: '!@#$%^&*()-_=+[]{};:,.<>?',
      hex: '0123456789abcdef',
      base64url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    }[charset] || charset;
    var out = '';
    // Use crypto-native rejection sampling when available (avoids modulo bias)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(length);
      window.crypto.getRandomValues(buf);
      var max = Math.floor(4294967296 / pool.length) * pool.length;
      for (var i = 0; i < length; i++) {
        var v = buf[i];
        var guard = 0;
        while (v >= max && guard++ < 8) { // loop until unbiased (rejection sampling)
          window.crypto.getRandomValues(buf.subarray(i, i + 1));
          v = buf[i];
        }
        out += pool[v % pool.length];
      }
      return out;
    }
    for (var j = 0; j < length; j++) out += pool[Math.floor(Math.random() * pool.length)];
    return out;
  }

  // ===== Output sanitizer for tools that MUST render SVG/HTML =====
  // Tools returning result.isHtml === true pass through this allow-list filter
  // (structural tags + class + minimal safe attributes only). Everything else
  // goes through sanitizeHtml() which escapes fully.
  // Strict allow-list: NO style attribute (CSS exfiltration/UI-redress vector), NO href/src/on*
  // Only structural tags + a small set of presentational class attrs survive.
  var ALLOWED_TAGS = ['p','b','strong','i','em','u','s','ul','ol','li','br','hr','h3','h4','table','caption','thead','tbody','tr','td','th','code','pre','span','div'];
  var ALLOWED_ATTRS = ['class','colspan','rowspan'];
  function sanitizeOutput(html) {
    if (typeof html !== 'string') return '';
    // Quick pass: if no HTML chars, escape as plain text
    if (html.indexOf('<') === -1) return sanitizeHtml(html);
    var doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      return sanitizeHtml(html);
    }
    function walk(node) {
      var children = Array.prototype.slice.call(node.childNodes || []);
      for (var i = 0; i < children.length; i++) {
        var el = children[i];
        if (el.nodeType === 1) { // element
          var tag = el.tagName.toLowerCase();
          if (ALLOWED_TAGS.indexOf(tag) === -1) {
            // Strip disallowed element, keep its (sanitized) text
            var txt = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(txt, el);
          } else {
            // Strip everything not on the allow-list (class/colspan/rowspan only)
            Array.prototype.slice.call(el.attributes || []).forEach(function (attr) {
              var name = attr.name.toLowerCase();
              if (ALLOWED_ATTRS.indexOf(name) === -1) {
                el.removeAttribute(attr.name);
              }
            });
            walk(el);
          }
        } else if (el.nodeType === 8) { // comments
          el.parentNode.removeChild(el);
        }
      }
    }
    walk(doc.body);
    return doc.body.innerHTML;
  }

  return { sanitizeHtml, sanitizeJsString, safeGetItem, safeJsonParse, validateInput, sanitizeCalcValue, cryptoRandom, cryptoRandomInt, generateSecureToken, sanitizeOutput };
})();
if (typeof window !== 'undefined') window.Security = Security;

// Privacy-friendly local analytics
const CalcAnalytics = (function () {
  const KEY = 'calcpro_analytics';
  function load() { const d = Security.safeGetItem(KEY, null); if (d && typeof d.totalVisits === 'number') return d; return { firstVisit: Date.now(), totalVisits: 0, totalCalcs: 0, tools: {}, lastVisit: Date.now() }; }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
  function trackVisit() { const d = load(); d.totalVisits = (d.totalVisits || 0) + 1; d.lastVisit = Date.now(); save(d); }
  function trackCalc(toolId, toolName) { const d = load(); d.totalCalcs = (d.totalCalcs || 0) + 1; d.tools[toolId] = d.tools[toolId] || { name: toolName, count: 0 }; d.tools[toolId].count++; save(d); }
  function trackView(toolId, toolName) { trackCalc(toolId, toolName); }
  function getPopular() { const d = load(); return Object.entries(d.tools || {}).sort((a, b) => b[1].count - a[1].count).map(([id]) => id); }
  function getData() { return load(); }
  function renderWidget() { const d = load(); const el = document.getElementById('analytics-widget'); if (!el) return; const topTools = Object.entries(d.tools || {}).sort((a, b) => b[1].count - a[1].count).slice(0, 5); // XSS-hardening: analytics tool names can be crafted in localStorage — escape
  el.innerHTML = `<div class="analytics-grid"><div class="analytics-card"><div class="analytics-num">${d.totalVisits || 0}</div><div class="analytics-label">Visits</div></div><div class="analytics-card"><div class="analytics-num">${d.totalCalcs || 0}</div><div class="analytics-label">Calculations</div></div><div class="analytics-card"><div class="analytics-num">${Object.keys(d.tools || {}).length}</div><div class="analytics-label">Tools Used</div></div><div class="analytics-card"><div class="analytics-num">${Math.floor((Date.now() - d.firstVisit) / 86400000)}</div><div class="analytics-label">Days Active</div></div></div>${topTools.length ? `<div class="analytics-top"><h4>Most Used</h4>${topTools.map(([id, t]) => `<div class="analytics-tool-row"><span>${Security.sanitizeHtml(t.name)}</span><span class="analytics-count">${t.count}</span></div>`).join('')}</div>` : ''}`; }
  return { trackVisit, trackCalc, trackView, getPopular, getData, renderWidget };
})();
if (typeof window !== 'undefined') window.CalcAnalytics = CalcAnalytics;

// Advanced calculation helpers + SVG charts
const AdvancedCalc = (function () {
  function generateAmortization(principal, annualRate, years, currency) { const r = annualRate / 100 / 12; const n = years * 12; const emi = r > 0 ? principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : principal / n; let bal = principal; const schedule = []; for (let i = 1; i <= n; i++) { const interest = bal * r; const payment = emi - interest; bal -= payment; schedule.push({ month: i, payment: emi, interest, principal: payment, balance: Math.max(0, bal) }); } const totalPayment = emi * n; const totalInterest = totalPayment - principal; return { emi, schedule, totalPayment, totalInterest, principal }; }
  function compoundSteps(principal, rate, years, freq) { const n = freq || 12; const r = rate / 100; const steps = []; for (let y = 0; y <= years; y++) { const amount = principal * Math.pow(1 + r / n, n * y); steps.push({ year: y, amount, interest: amount - principal }); } const final = principal * Math.pow(1 + r / n, n * years); return { final, interest: final - principal, steps }; }
  function bmiSteps(weight, heightCm) { const h = heightCm / 100; if (!Number.isFinite(h) || h <= 0) { return { bmi: '0.0', category: 'Invalid input (height must be > 0)' }; } const bmi = weight / (h * h); if (!Number.isFinite(bmi)) { return { bmi: '0.0', category: 'Invalid input' }; } let cat = 'Normal'; if (bmi < 18.5) cat = 'Underweight'; else if (bmi >= 25 && bmi < 30) cat = 'Overweight'; else if (bmi >= 30) cat = 'Obese'; return { bmi: bmi.toFixed(1), category: cat }; }
  function pctSteps(part, whole) { if (whole === 0 || !Number.isFinite(whole)) { return { percent: '—', decimal: '—' }; } return { percent: (part / whole * 100).toFixed(2), decimal: (part / whole).toFixed(4) }; }
  function taxSteps(income, rate, deductions) { const taxable = Math.max(0, income - deductions); const tax = taxable * (rate / 100); return { taxableIncome: taxable, tax, netIncome: income - tax }; }
  function tipSteps(bill, tipPct, people) { const tip = bill * (tipPct / 100); const total = bill + tip; const perPerson = total / (people || 1); return { tip, total, perPerson }; }
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  function lcm(a, b) { return (a * b) / gcd(a, b); }
  function primeFactors(n) { const factors = []; for (let i = 2; i * i <= n; i++) { while (n % i === 0) { factors.push(i); n /= i; } } if (n > 1) factors.push(n); return factors; }
  function stats(arr) { const n = arr.length; const sum = arr.reduce((a, b) => a + b, 0); const mean = sum / n; const sorted = [...arr].sort((a, b) => a - b); const median = n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2; const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n; return { n, sum, mean, median, min: sorted[0], max: sorted[n - 1], stdDev: Math.sqrt(variance), variance }; }
  function irr(cashflows, guess) { guess = guess || 0.1; let rate = guess; for (let iter = 0; iter < 100; iter++) { let npv = 0, dnpv = 0; for (let t = 0; t < cashflows.length; t++) { npv += cashflows[t] / Math.pow(1 + rate, t); dnpv -= t * cashflows[t] / Math.pow(1 + rate, t + 1); } if (Math.abs(npv) < 1e-7) return rate; if (dnpv === 0) break; rate -= npv / dnpv; } return rate; }
  function blackScholes(S, K, T, r, sigma, type) { const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T)); const d2 = d1 - sigma * Math.sqrt(T); if (type === 'call') return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2); return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1); }
  function normCdf(x) { return 0.5 * (1 + erf(x / Math.sqrt(2))); }
  function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
  return { generateAmortization, compoundSteps, bmiSteps, pctSteps, taxSteps, tipSteps, gcd, lcm, primeFactors, stats, irr, blackScholes };
})();

const Charts = (function () {
  // Registry hook — records raw chart data so the Next.js app can re-render
  // any chart with interactive Recharts (bar/donut/line/gauge). Harmless in
  // the vanilla SPA: just a tiny window property written on each chart call.
  function record(type, payload) {
    try { if (typeof window !== 'undefined') { window.__calcproChart = { type: type, data: payload.data, labels: payload.labels, value: payload.value, max: payload.max, opts: payload.opts || {}, ts: Date.now() }; } } catch (e) { /* non-fatal */ }
  }
  function bar(data, labels, opts) { opts = opts || {}; record('bar', { data: data, labels: labels, opts: opts }); const w = opts.width || 400, h = opts.height || 200, pad = 30; // Negative-safe baseline: min/max span INCLUDES 0 so negative values
  // (NPV/IRR cash flows, timezone offsets) render below a zero line instead
  // of producing an invalid negative rect height (SVG console error).
  // Non-finite guard: any NaN/Infinity from an upstream calc becomes 0 so
  // the SVG rect never gets an invalid (NaN/Infinity) height.
  data = data.map(function (v) { return Number.isFinite(v) ? v : 0; });
  const max = Math.max(...data, 0.001); const min = Math.min(...data, 0); const range = (max - min) || 1; const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2); const bw = (w - pad * 2) / data.length * 0.7; const gap = (w - pad * 2) / data.length * 0.3; let bars = ''; data.forEach((v, i) => { const bh = Math.abs(v / range) * (h - pad * 2); const x = pad + i * (bw + gap); const y = v >= 0 ? zeroY - bh : zeroY; const fill = v < 0 ? '#ef4444' : (opts.color || '#4f7cff'); bars += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(bh, 0.5)}" fill="${fill}" rx="4" class="chart-bar" data-label="${labels[i]}" data-value="${v.toFixed(2)}"></rect>`; bars += `<text x="${x + bw / 2}" y="${h - pad + 15}" text-anchor="middle" font-size="10" fill="var(--text-light)">${labels[i]}</text>`; }); return `<svg viewBox="0 0 ${w} ${h}" class="chart" onmousemove="Charts.showTooltip(event)" onmouseleave="Charts.hideTooltip()">${bars}<rect id="chart-tooltip" x="0" y="0" width="0" height="0" fill="var(--surface)" stroke="var(--border)" rx="4" style="pointer-events:none;display:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.15))"></rect><text id="chart-tooltip-text" x="0" y="0" font-size="12" fill="var(--text)" style="pointer-events:none;display:none"></text></svg>`; }
  function donut(data, labels, opts) { opts = opts || {}; record('donut', { data: data, labels: labels, opts: opts }); const r = 80, cx = 100, cy = 100, sw = 30; const total = data.reduce((a, b) => a + b, 0) || 1; const colors = opts.colors || ['#4f7cff', '#2dd4bf', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']; let angle = -Math.PI / 2; let arcs = ''; data.forEach((v, i) => { const frac = v / total; const end = angle + frac * Math.PI * 2; const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle); const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); const large = frac > 0.5 ? 1 : 0; arcs += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" stroke="${colors[i % colors.length]}" stroke-width="${sw}" fill="none" stroke-linecap="round" class="chart-arc" data-label="${labels[i]}" data-value="${v.toFixed(2)}"></path>`; angle = end; }); const legend = labels.map((l, i) => `<div class="chart-legend-item"><span style="background:${colors[i % colors.length]}"></span>${l}: ${data[i].toFixed(2)}</div>`).join(''); return `<svg viewBox="0 0 200 200" class="chart" onmousemove="Charts.showTooltip(event)" onmouseleave="Charts.hideTooltip()">${arcs}<text x="100" y="105" text-anchor="middle" font-size="20" font-weight="bold" fill="var(--text)">${opts.center || ''}</text><rect id="chart-tooltip" x="0" y="0" width="0" height="0" fill="var(--surface)" stroke="var(--border)" rx="4" style="pointer-events:none;display:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.15))"></rect><text id="chart-tooltip-text" x="0" y="0" font-size="12" fill="var(--text)" style="pointer-events:none;display:none"></text></svg><div class="chart-legend">${legend}</div>`; }
function line(data, labels, opts) { 
    opts = opts || {}; record('line', { data: data, labels: labels, opts: opts }); 
    const w = 400, h = 200, pad = 30; 
    const max = Math.max(...data, 0.001); 
    const min = Math.min(...data, 0); 
    const range = max - min || 1; 
    const pts = data.map((v, i) => { 
      const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2); 
      const y = h - pad - ((v - min) / range) * (h - pad * 2); 
      return `${x},${y}`; 
    }).join(' '); 
    const dots = data.map((v, i) => { 
      const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2); 
      const y = h - pad - ((v - min) / range) * (h - pad * 2); 
      return `<circle cx="${x}" cy="${y}" r="4" fill="${opts.color || '#4f7cff'}" class="chart-dot" data-label="${labels[i] || ''}" data-value="${v.toFixed(2)}"></circle>`; 
    }).join(''); 
    
    // Milestone markers
    let milestones = '';
    if (opts.milestones) {
      opts.milestones.forEach((m, i) => {
        const x = pad + (m.index / (data.length - 1 || 1)) * (w - pad * 2);
        const y = h - pad - ((data[m.index] - min) / range) * (h - pad * 2);
        milestones += `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${m.color || '#f59e0b'}" stroke-width="2" stroke-dasharray="4,4"/>`;
        milestones += `<text x="${x}" y="${y - 12}" text-anchor="middle" font-size="10" fill="${m.color || '#f59e0b'}" font-weight="bold">${m.label}</text>`;
      });
    }
    
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" onmousemove="Charts.showTooltip(event)" onmouseleave="Charts.hideTooltip()"><polyline points="${pts}" fill="none" stroke="${opts.color || '#4f7cff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect id="chart-tooltip" x="0" y="0" width="0" height="0" fill="var(--surface)" stroke="var(--border)" rx="4" style="pointer-events:none;display:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.15))"></rect><text id="chart-tooltip-text" x="0" y="0" font-size="12" fill="var(--text)" style="pointer-events:none;display:none"></text>${dots}${milestones}</svg>`; 
  }
  function gauge(value, max, opts) { opts = opts || {}; record('gauge', { value: value, max: max, opts: opts }); const cx = 100, cy = 100, r = 80; const frac = Math.min(value / max, 1); const angle = -Math.PI + frac * Math.PI; const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle); const x0 = cx + r * Math.cos(-Math.PI), y0 = cy + r * Math.sin(-Math.PI); const large = frac > 0.5 ? 1 : 0; const color = opts.color || '#4f7cff'; return `<svg viewBox="0 0 200 200" class="chart"><path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x} ${y}" stroke="#e2e8f0" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x} ${y}" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round"/><text x="100" y="120" text-anchor="middle" font-size="28" font-weight="bold" fill="var(--text)">${value.toFixed(1)}</text></svg>`; }

  // Tooltip handling
  let tooltipTimer = null;
  function showTooltip(e) {
    const svg = e.currentTarget;
    const rect = svg.querySelector('#chart-tooltip');
    const text = svg.querySelector('#chart-tooltip-text');
    if (!rect || !text) return;
    clearTimeout(tooltipTimer);
    const target = e.target;
    const label = target.dataset.label;
    const value = target.dataset.value;
    if (!label && !value) { hideTooltip(); return; }
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const tooltipText = label ? `${label}: ${value}` : value;
    text.textContent = tooltipText;
    const bbox = text.getBBox();
    const padding = 8;
    rect.setAttribute('x', svgPt.x + 12);
    rect.setAttribute('y', svgPt.y - bbox.height - padding);
    rect.setAttribute('width', bbox.width + padding * 2);
    rect.setAttribute('height', bbox.height + padding * 2);
    text.setAttribute('x', svgPt.x + 12 + padding);
    text.setAttribute('y', svgPt.y - padding / 2);
    rect.style.display = 'block';
    text.style.display = 'block';
  }
  function hideTooltip() {
    clearTimeout(tooltipTimer);
    document.querySelectorAll('.chart #chart-tooltip, .chart #chart-tooltip-text').forEach(el => el.style.display = 'none');
  }
  // Multi-scenario overlay chart — renders N series on one master SVG so
  // users can compare several scenarios side-by-side (SEO-safe: text + titles).
  function overlay(series, labels, opts) {
    opts = opts || {};
    // record() payload exposes data + labels so the Next.js re-render registry stays valid
    record('overlay', { data: series, labels: labels, opts: opts });
    const w = opts.width || 400, h = opts.height || 200, pad = 30;
    const all = [].concat.apply([], series.map(function (s) { return s.data || []; }));
    if (!all.length) return '';
    const max = Math.max.apply(null, all.concat([0.001]));
    const min = Math.min.apply(null, all.concat([0]));
    const range = (max - min) || 1;
    const colors = opts.colors || ['#4f7cff', '#2dd4bf', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const n = Math.max(labels.length, Math.max.apply(null, series.map(function (s) { return s.data.length; })), 2);
    let paths = '', dots = '', legend = '';
    series.forEach(function (s, si) {
      const color = s.color || colors[si % colors.length];
      const pts = s.data.map(function (v, i) {
        const x = pad + (i / (n - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      paths += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>';
      s.data.forEach(function (v, i) {
        const x = pad + (i / (n - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + color + '" class="chart-dot" data-label="' + Security.sanitizeHtml(s.name + ' · ' + (labels[i] || '')) + '" data-value="' + v.toFixed(2) + '"><title>' + Security.sanitizeHtml(s.name) + ': ' + v.toFixed(2) + '</title></circle>';
      });
      legend += '<div class="chart-legend-item"><span style="background:' + color + '"></span>' + Security.sanitizeHtml(s.name) + '</div>';
    });
    let xlabels = '';
    labels.forEach(function (l, i) {
      // Use the same n as the data points so labels never drift off-center
      const x = pad + (i / (n - 1)) * (w - pad * 2);
      xlabels += '<text x="' + x.toFixed(1) + '" y="' + (h - pad + 15) + '" text-anchor="middle" font-size="10" fill="var(--text-light)">' + Security.sanitizeHtml(l) + '</text>';
    });
    const desc = 'Overlay comparison of ' + series.map(function (s) { return s.name; }).join(', ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" role="img" aria-label="' + Security.sanitizeHtml(opts.title || 'Scenario comparison chart') + '" onmousemove="Charts.showTooltip(event)" onmouseleave="Charts.hideTooltip()"><title>' + Security.sanitizeHtml(opts.title || 'Scenario comparison') + '</title><desc>' + Security.sanitizeHtml(opts.desc || desc) + '</desc>' + paths + dots + xlabels + '<rect id="chart-tooltip" x="0" y="0" width="0" height="0" fill="var(--surface)" stroke="var(--border)" rx="4" style="pointer-events:none;display:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.15))"></rect><text id="chart-tooltip-text" x="0" y="0" font-size="12" fill="var(--text)" style="pointer-events:none;display:none"></text></svg><div class="chart-legend">' + legend + '</div>';
  }
  return { bar, donut, line, gauge, overlay, showTooltip, hideTooltip };
})();
if (typeof window !== 'undefined') { window.AdvancedCalc = AdvancedCalc; window.Charts = Charts; }

// Currency module - live rates with 1hr caching + fallback
const Currency = (function () {
  const CACHE_KEY = 'calcpro_currency_cache'; const CACHE_TTL = 3600000;
  const FALLBACK_RATES = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24, INR: 83.2, PKR: 278.5, CAD: 1.36, AUD: 1.52, CHF: 0.88, SGD: 1.34, HKD: 7.82, NZD: 1.64, SEK: 10.6, NOK: 10.7, DKK: 6.9, KRW: 1330, MXN: 17.1, BRL: 4.97, RUB: 92.5, ZAR: 18.8, TRY: 32.1, AED: 3.67, SAR: 3.75, THB: 35.8, IDR: 15700, MYR: 4.67, PHP: 56.2, VND: 24500, PLN: 4.0, CZK: 23.2, HUF: 360, ILS: 3.7, EGP: 48.9, NGN: 1560, KES: 149, MAD: 9.9, QAR: 3.64, KWD: 0.31, BHD: 0.376, OMR: 0.385, JOD: 0.709, LKR: 325, BDT: 110, NPR: 133, AFN: 71, IRR: 42000, IQD: 1310, LBP: 89500, SYP: 13000, YER: 530, PAB: 1, GTQ: 7.8, HNL: 24.6, NIO: 36.7, CRC: 530, DOP: 58.5, CUP: 240, JMD: 155, TTD: 6.8, BBD: 2, BSD: 1, BZD: 2, XCD: 2.7, AWG: 1.8, ANG: 1.8, SRD: 38, GYD: 209, PYG: 7300, UYU: 39.5, ARS: 1020, CLP: 950, BOB: 6.9, PEN: 3.75, COP: 3900, GHS: 15.2, XOF: 605, XAF: 605, XPF: 110, DJF: 178, KMF: 470, RWF: 1290, BIF: 2950, ETB: 56, SLL: 23000, LRD: 190, GNF: 8600, MZN: 64, SDG: 600, SOS: 570, ERN: 15, NAD: 18.8, BWP: 13.6, ZWL: 13.5, MUR: 46, MGA: 4700, SCR: 14.5, CVE: 110, STN: 24, ZMW: 26, MWK: 1700, TND: 3.1, DZD: 134, LYD: 4.85, TMT: 3.5, AMD: 390, AZN: 1.7, GEL: 2.7, UAH: 39.5, BYN: 3.2, MDL: 17.5, RON: 4.6, BGN: 1.8, ALL: 94.5, RSD: 108, MKD: 58, BAM: 1.8, HRK: 6.95, ISK: 138, FKP: 0.79, GIP: 0.79, SHP: 0.79, TJS: 11, KGS: 89, UZS: 12500, MNT: 3400, LAK: 21000, KHR: 4100, MMK: 2100, BTN: 83.2, TWD: 31.8, WST: 2.7, FJD: 2.2, TOP: 2.4, PGK: 3.7, SBD: 8.5, VUV: 120, BTC: 0.0000166, ETH: 0.00034, XRP: 1.85, LTC: 0.012, DOGE: 12.5, ADA: 2.4, TZS: 2650, UGX: 3820, MOP: 8.06, SZL: 18.9, LSL: 18.9, HTG: 131.5, BMD: 1, KYD: 0.83, MVR: 15.4, BND: 1.34, XAU: 0.00043, XAG: 0.034 };
  const CURRENCY_INFO = { USD: { name: 'US Dollar', symbol: '$' }, EUR: { name: 'Euro', symbol: '€' }, GBP: { name: 'British Pound', symbol: '£' }, JPY: { name: 'Japanese Yen', symbol: '¥' }, CNY: { name: 'Chinese Yuan', symbol: '¥' }, INR: { name: 'Indian Rupee', symbol: '₹' }, PKR: { name: 'Pakistani Rupee', symbol: '₨' }, CAD: { name: 'Canadian Dollar', symbol: 'C$' }, AUD: { name: 'Australian Dollar', symbol: 'A$' }, CHF: { name: 'Swiss Franc', symbol: 'Fr' }, SGD: { name: 'Singapore Dollar', symbol: 'S$' }, HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' }, NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' }, SEK: { name: 'Swedish Krona', symbol: 'kr' }, NOK: { name: 'Norwegian Krone', symbol: 'kr' }, DKK: { name: 'Danish Krone', symbol: 'kr' }, KRW: { name: 'South Korean Won', symbol: '₩' }, MXN: { name: 'Mexican Peso', symbol: '$' }, BRL: { name: 'Brazilian Real', symbol: 'R$' }, RUB: { name: 'Russian Ruble', symbol: '₽' }, ZAR: { name: 'South African Rand', symbol: 'R' }, TRY: { name: 'Turkish Lira', symbol: '₺' }, AED: { name: 'UAE Dirham', symbol: 'د.إ' }, SAR: { name: 'Saudi Riyal', symbol: '﷼' }, THB: { name: 'Thai Baht', symbol: '฿' }, IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' }, MYR: { name: 'Malaysian Ringgit', symbol: 'RM' }, PHP: { name: 'Philippine Peso', symbol: '₱' }, VND: { name: 'Vietnamese Dong', symbol: '₫' }, PLN: { name: 'Polish Zloty', symbol: 'zł' }, CZK: { name: 'Czech Koruna', symbol: 'Kč' }, HUF: { name: 'Hungarian Forint', symbol: 'Ft' }, ILS: { name: 'Israeli Shekel', symbol: '₪' }, EGP: { name: 'Egyptian Pound', symbol: '£' }, NGN: { name: 'Nigerian Naira', symbol: '₦' }, KES: { name: 'Kenyan Shilling', symbol: 'KSh' }, MAD: { name: 'Moroccan Dirham', symbol: 'د.م.' }, QAR: { name: 'Qatari Riyal', symbol: '﷼' }, KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك' }, BHD: { name: 'Bahraini Dinar', symbol: 'د.ب' }, OMR: { name: 'Omani Rial', symbol: '﷼' }, JOD: { name: 'Jordanian Dinar', symbol: 'د.ا' }, LKR: { name: 'Sri Lankan Rupee', symbol: '₨' }, BDT: { name: 'Bangladeshi Taka', symbol: '৳' }, NPR: { name: 'Nepalese Rupee', symbol: '₨' }, AFN: { name: 'Afghan Afghani', symbol: '؋' }, IRR: { name: 'Iranian Rial', symbol: '﷼' }, IQD: { name: 'Iraqi Dinar', symbol: 'ع.د' }, LBP: { name: 'Lebanese Pound', symbol: 'ل.ل' }, SYP: { name: 'Syrian Pound', symbol: '£' }, YER: { name: 'Yemeni Rial', symbol: '﷼' }, PAB: { name: 'Panamanian Balboa', symbol: 'B/.' }, GTQ: { name: 'Guatemalan Quetzal', symbol: 'Q' }, HNL: { name: 'Honduran Lempira', symbol: 'L' }, NIO: { name: 'Nicaraguan Córdoba', symbol: 'C$' }, CRC: { name: 'Costa Rican Colón', symbol: '₡' }, DOP: { name: 'Dominican Peso', symbol: 'RD$' }, CUP: { name: 'Cuban Peso', symbol: '₱' }, JMD: { name: 'Jamaican Dollar', symbol: 'J$' }, TTD: { name: 'Trinidad Dollar', symbol: 'TT$' }, BBD: { name: 'Barbadian Dollar', symbol: 'Bds$' }, BSD: { name: 'Bahamian Dollar', symbol: 'B$' }, BZD: { name: 'Belize Dollar', symbol: 'BZ$' }, XCD: { name: 'East Caribbean Dollar', symbol: 'EC$' }, AWG: { name: 'Aruban Florin', symbol: 'ƒ' }, ANG: { name: 'Netherlands Antillean Guilder', symbol: 'ƒ' }, SRD: { name: 'Surinamese Dollar', symbol: 'Sr$' }, GYD: { name: 'Guyanese Dollar', symbol: 'G$' }, PYG: { name: 'Paraguayan Guaraní', symbol: '₲' }, UYU: { name: 'Uruguayan Peso', symbol: '$U' }, ARS: { name: 'Argentine Peso', symbol: '$' }, CLP: { name: 'Chilean Peso', symbol: '$' }, BOB: { name: 'Bolivian Boliviano', symbol: 'Bs' }, PEN: { name: 'Peruvian Sol', symbol: 'S/' }, COP: { name: 'Colombian Peso', symbol: '$' }, GHS: { name: 'Ghanaian Cedi', symbol: '₵' }, XOF: { name: 'West African CFA Franc', symbol: 'CFA' }, XAF: { name: 'Central African CFA Franc', symbol: 'FCFA' }, XPF: { name: 'CFP Franc', symbol: '₣' }, DJF: { name: 'Djiboutian Franc', symbol: 'Fdj' }, KMF: { name: 'Comorian Franc', symbol: 'CF' }, RWF: { name: 'Rwandan Franc', symbol: 'FRw' }, BIF: { name: 'Burundian Franc', symbol: 'FBu' }, ETB: { name: 'Ethiopian Birr', symbol: 'Br' }, SLL: { name: 'Sierra Leonean Leone', symbol: 'Le' }, LRD: { name: 'Liberian Dollar', symbol: 'L$' }, GNF: { name: 'Guinean Franc', symbol: 'FG' }, MZN: { name: 'Mozambican Metical', symbol: 'MT' }, SDG: { name: 'Sudanese Pound', symbol: '£' }, SOS: { name: 'Somali Shilling', symbol: 'Sh' }, ERN: { name: 'Eritrean Nakfa', symbol: 'Nfk' }, NAD: { name: 'Namibian Dollar', symbol: 'N$' }, BWP: { name: 'Botswana Pula', symbol: 'P' }, ZWL: { name: 'Zimbabwean Dollar', symbol: 'Z$' }, MUR: { name: 'Mauritian Rupee', symbol: '₨' }, MGA: { name: 'Malagasy Ariary', symbol: 'Ar' }, SCR: { name: 'Seychellois Rupee', symbol: '₨' }, CVE: { name: 'Cape Verdean Escudo', symbol: '$' }, STN: { name: 'São Tomé Dobra', symbol: 'Db' }, ZMW: { name: 'Zambian Kwacha', symbol: 'ZK' }, MWK: { name: 'Malawian Kwacha', symbol: 'MK' }, TND: { name: 'Tunisian Dinar', symbol: 'د.ت' }, DZD: { name: 'Algerian Dinar', symbol: 'د.ج' }, LYD: { name: 'Libyan Dinar', symbol: 'ل.د' }, TMT: { name: 'Turkmenistani Manat', symbol: 'm' }, AMD: { name: 'Armenian Dram', symbol: '֏' }, AZN: { name: 'Azerbaijani Manat', symbol: '₼' }, GEL: { name: 'Georgian Lari', symbol: '₾' }, UAH: { name: 'Ukrainian Hryvnia', symbol: '₴' }, BYN: { name: 'Belarusian Ruble', symbol: 'Br' }, MDL: { name: 'Moldovan Leu', symbol: 'L' }, RON: { name: 'Romanian Leu', symbol: 'lei' }, BGN: { name: 'Bulgarian Lev', symbol: 'лв' }, ALL: { name: 'Albanian Lek', symbol: 'L' }, RSD: { name: 'Serbian Dinar', symbol: 'дин' }, MKD: { name: 'Macedonian Denar', symbol: 'ден' }, BAM: { name: 'Bosnian Mark', symbol: 'KM' }, HRK: { name: 'Croatian Kuna', symbol: 'kn' }, ISK: { name: 'Icelandic Króna', symbol: 'kr' }, FKP: { name: 'Falkland Pound', symbol: '£' }, GIP: { name: 'Gibraltar Pound', symbol: '£' }, SHP: { name: 'Saint Helena Pound', symbol: '£' }, TJS: { name: 'Tajikistani Somoni', symbol: 'ЅМ' }, KGS: { name: 'Kyrgyzstani Som', symbol: 'с' }, UZS: { name: 'Uzbekistani Som', symbol: 'сўм' }, MNT: { name: 'Mongolian Tugrik', symbol: '₮' }, LAK: { name: 'Lao Kip', symbol: '₭' }, KHR: { name: 'Cambodian Riel', symbol: '៛' }, MMK: { name: 'Burmese Kyat', symbol: 'K' }, BTN: { name: 'Bhutanese Ngultrum', symbol: 'Nu' }, TWD: { name: 'Taiwan Dollar', symbol: 'NT$' }, WST: { name: 'Samoan Tala', symbol: 'WS$' }, FJD: { name: 'Fijian Dollar', symbol: 'FJ$' }, TOP: { name: 'Tongan Paʻanga', symbol: 'T$' }, PGK: { name: 'Papua New Guinean Kina', symbol: 'K' }, SBD: { name: 'Solomon Islands Dollar', symbol: 'SI$' }, VUV: { name: 'Vanuatu Vatu', symbol: 'Vt' }, CDF: { name: 'Congolese Franc', symbol: 'FC' }, GMD: { name: 'Gambian Dalasi', symbol: 'D' }, BTC: { name: 'Bitcoin', symbol: '₿' }, ETH: { name: 'Ethereum', symbol: 'Ξ' }, XRP: { name: 'Ripple', symbol: 'X' }, LTC: { name: 'Litecoin', symbol: 'Ł' }, DOGE: { name: 'Dogecoin', symbol: 'Ð' }, ADA: { name: 'Cardano', symbol: '₳' }, TZS: { name: 'Tanzanian Shilling', symbol: 'TSh' }, UGX: { name: 'Ugandan Shilling', symbol: 'USh' }, MOP: { name: 'Macanese Pataca', symbol: 'MOP$' }, SZL: { name: 'Eswatini Lilangeni', symbol: 'E' }, LSL: { name: 'Lesotho Loti', symbol: 'L' }, HTG: { name: 'Haitian Gourde', symbol: 'G' }, BMD: { name: 'Bermudian Dollar', symbol: 'BD$' }, KYD: { name: 'Cayman Islands Dollar', symbol: 'CI$' }, MVR: { name: 'Maldivian Rufiyaa', symbol: 'Rf' }, BND: { name: 'Brunei Dollar', symbol: 'B$' }, XAU: { name: 'Gold (Troy Ounce)', symbol: 'XAU' }, XAG: { name: 'Silver (Troy Ounce)', symbol: 'XAG' } };
  async function fetchLiveRates() { let cached=null; try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch(e) { cached=null; } if (cached && cached.rates && Date.now() - cached.ts < CACHE_TTL) return cached.rates; for (const url of ['https://open.er-api.com/v6/latest/USD','https://api.frankfurter.app/latest?from=USD']) { try { const res = await fetch(url); if (!res.ok) continue; const data = await res.json(); if (data && data.rates) { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates })); return data.rates; } } catch (e) {} } if (cached && cached.rates && Date.now() - cached.ts < 86400000) return cached.rates; return FALLBACK_RATES; }
  async function convertCurrency(amount, from, to) { const rates = await fetchLiveRates(); const fromRate = rates[from] || FALLBACK_RATES[from] || 1; const toRate = rates[to] || FALLBACK_RATES[to] || 1; return (amount / fromRate) * toRate; }
  // Locale-aware money formatter (e.g. $1,234.56 / ₹1,234.56 / ¥1,234)
  function formatAmount(amount, code, locale) {
    try {
      const l = (locale && typeof locale === 'string') ? locale : ((typeof I18n !== 'undefined' && I18n.getLocale) ? I18n.getLocale() : 'en-US');
      return new Intl.NumberFormat(l, { style: 'currency', currency: code || 'USD', maximumFractionDigits: 2 }).format(Number(amount) || 0);
    } catch (e) {
      const sym = getCurrencySymbol(code || 'USD');
      return sym + ' ' + (Number(amount) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  }
  // Async wrapper for the currency-converter tool: { amount, from, to } → { result, extra }
  async function convert(values) {
    const amount = parseFloat(values && values.amount) || 0;
    const from = (values && values.from || 'USD').toUpperCase();
    const to = (values && values.to || 'EUR').toUpperCase();
    const converted = await convertCurrency(amount, from, to);
    const rate = amount !== 0 ? converted / amount : 0;
    return {
      result: formatAmount(converted, to) + ' (' + getCurrencyName(to) + ')',
      extra: '1 ' + from + ' = ' + formatAmount(rate, to) + ' • ' + getCurrencyName(from) + ' → ' + getCurrencyName(to)
    };
  }
  function getCurrencySymbol(code) { return (CURRENCY_INFO[code] && CURRENCY_INFO[code].symbol) || code; }
  function getCurrencyName(code) { return (CURRENCY_INFO[code] && CURRENCY_INFO[code].name) || code; }
  function getAllCurrencyCodes() { return Object.keys(CURRENCY_INFO).sort(); }
  return { fetchLiveRates, convertCurrency, convert, getCurrencySymbol, getCurrencyName, getAllCurrencyCodes, formatAmount, FALLBACK_RATES, CURRENCY_INFO };
})();
if (typeof window !== 'undefined') window.Currency = Currency;
// Node/test export — lets unit tests exercise the REAL shipped modules (no inline drift)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SafeMathParser, Security, AdvancedCalc, Charts, Currency };
}
