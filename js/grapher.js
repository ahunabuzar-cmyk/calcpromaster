/* ============================================================
 * Grapher — a small, dependency-free y = f(x) plotter
 * ------------------------------------------------------------
 * Pure parts (compile / sample) are unit-tested; render() draws to
 * a canvas. Supports + - * / ^, parentheses, unary minus, implicit
 * multiplication (2x, 3sin(x)), the variable x, constants pi and e,
 * and common functions. No network, no libraries.
 * ============================================================ */
(function (root) {
  'use strict';

  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign
  };
  var CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

  // Recursive-descent parser over a token stream.
  function tokenize(input) {
    var s = String(input == null ? '' : input).toLowerCase().replace(/\s+/g, '');
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[0-9.]/.test(c)) {
        var num = '';
        while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i++]; }
        if (num.split('.').length > 2) throw new Error('bad number: ' + num);
        tokens.push({ t: 'num', v: parseFloat(num) });
        continue;
      }
      if (/[a-z]/.test(c)) {
        var name = '';
        while (i < s.length && /[a-z0-9]/.test(s[i])) { name += s[i++]; }
        tokens.push({ t: 'name', v: name });
        continue;
      }
      if ('+-*/^()'.indexOf(c) >= 0) { tokens.push({ t: c }); i++; continue; }
      throw new Error('unexpected character: ' + c);
    }
    return tokens;
  }

  function compile(expr) {
    var tokens, pos = 0;

    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }

    function parseExpr() {
      var node = parseTerm();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        var op = next().t;
        var right = parseTerm();
        node = { type: 'bin', op: op, a: node, b: right };
      }
      return node;
    }
    function parseTerm() {
      var node = parseUnary();
      for (;;) {
        var p = peek();
        if (!p) break;
        if (p.t === '*' || p.t === '/') {
          var op = next().t;
          node = { type: 'bin', op: op, a: node, b: parseUnary() };
        } else if (p.t === 'name' || p.t === 'num' || p.t === '(') {
          // implicit multiplication: 2x, 3sin(x), (x+1)(x-1)
          node = { type: 'bin', op: '*', a: node, b: parseUnary() };
        } else break;
      }
      return node;
    }
    function parseUnary() {
      if (peek() && peek().t === '-') { next(); return { type: 'neg', a: parseUnary() }; }
      if (peek() && peek().t === '+') { next(); return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      var base = parsePrimary();
      if (peek() && peek().t === '^') {
        next();
        return { type: 'bin', op: '^', a: base, b: parseUnary() };
      }
      return base;
    }
    function parsePrimary() {
      var p = peek();
      if (!p) throw new Error('unexpected end of expression');
      if (p.t === 'num') { next(); return { type: 'num', v: p.v }; }
      if (p.t === '(') {
        next();
        var inner = parseExpr();
        if (!peek() || peek().t !== ')') throw new Error('missing closing parenthesis');
        next();
        return inner;
      }
      if (p.t === 'name') {
        next();
        if (p.v === 'x') return { type: 'var' };
        if (Object.prototype.hasOwnProperty.call(CONSTS, p.v)) return { type: 'num', v: CONSTS[p.v] };
        if (Object.prototype.hasOwnProperty.call(FUNCS, p.v)) {
          if (!peek() || peek().t !== '(') {
            // bare function name without parentheses, e.g. sin x is not supported
            throw new Error('function ' + p.v + ' needs parentheses');
          }
          next(); // (
          var arg = parseExpr();
          if (!peek() || peek().t !== ')') throw new Error('missing closing parenthesis for ' + p.v);
          next(); // )
          return { type: 'call', fn: p.v, a: arg };
        }
        throw new Error('unknown name: ' + p.v);
      }
      throw new Error('unexpected token: ' + p.t);
    }

    function evaluate(node, x) {
      switch (node.type) {
        case 'num': return node.v;
        case 'var': return x;
        case 'neg': return -evaluate(node.a, x);
        case 'call': return FUNCS[node.fn](evaluate(node.a, x));
        case 'bin':
          var a = evaluate(node.a, x), b = evaluate(node.b, x);
          if (node.op === '+') return a + b;
          if (node.op === '-') return a - b;
          if (node.op === '*') return a * b;
          if (node.op === '/') return a / b;
          if (node.op === '^') return Math.pow(a, b);
      }
      throw new Error('bad node');
    }

    tokens = tokenize(expr);
    if (!tokens.length) throw new Error('empty expression');
    var ast = parseExpr();
    if (pos !== tokens.length) throw new Error('unexpected trailing input');
    return function (x) { return evaluate(ast, x); };
  }

  // Sample the function across [xmin, xmax]; y is null where undefined/NaN.
  function sample(expr, xmin, xmax, steps) {
    if (!(xmax > xmin)) throw new Error('xmax must be greater than xmin');
    var fn = typeof expr === 'function' ? expr : compile(expr);
    var n = Math.max(2, Math.min(4000, steps || 600));
    var pts = [];
    var step = (xmax - xmin) / (n - 1);
    for (var i = 0; i < n; i++) {
      var x = xmin + i * step;
      var y;
      try { y = fn(x); } catch (e) { y = NaN; }
      pts.push([x, (isFinite(y) ? y : null)]);
    }
    return pts;
  }

  // Draw to a canvas element. Optional opts: {xmin,xmax,ymin,ymax,color,steps}
  function render(canvas, expr, opts) {
    opts = opts || {};
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('canvas required');
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var pad = 24;
    var xmin = opts.xmin != null ? opts.xmin : -10;
    var xmax = opts.xmax != null ? opts.xmax : 10;

    var pts = sample(expr, xmin, xmax, opts.steps || Math.max(200, W));
    var ys = pts.map(function (p) { return p[1]; }).filter(function (v) { return v != null; });
    var ymin = opts.ymin != null ? opts.ymin : (ys.length ? Math.min.apply(null, ys) : -10);
    var ymax = opts.ymax != null ? opts.ymax : (ys.length ? Math.max.apply(null, ys) : 10);
    if (!(ymax > ymin)) { ymax = ymin + 1; }

    var sx = function (x) { return pad + (x - xmin) / (xmax - xmin) * (W - 2 * pad); };
    var sy = function (y) { return H - pad - (y - ymin) / (ymax - ymin) * (H - 2 * pad); };

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    // axes
    ctx.beginPath();
    if (ymin <= 0 && ymax >= 0) { ctx.moveTo(sx(xmin), sy(0)); ctx.lineTo(sx(xmax), sy(0)); }
    if (xmin <= 0 && xmax >= 0) { ctx.moveTo(sx(0), sy(ymin)); ctx.lineTo(sx(0), sy(ymax)); }
    ctx.stroke();

    ctx.strokeStyle = opts.color || '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < pts.length; i++) {
      var px = pts[i][0], py = pts[i][1];
      if (py == null) { started = false; continue; }
      var X = sx(px), Y = sy(py);
      if (!started) { ctx.moveTo(X, Y); started = true; } else { ctx.lineTo(X, Y); }
    }
    ctx.stroke();
    return { points: pts, xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
  }

  var Grapher = { compile: compile, sample: sample, render: render, FUNCS: FUNCS, CONSTS: CONSTS };

  if (typeof module !== 'undefined' && module.exports) module.exports = Grapher;
  if (typeof window !== 'undefined') window.Grapher = Grapher;
})(typeof window !== 'undefined' ? window : globalThis);
