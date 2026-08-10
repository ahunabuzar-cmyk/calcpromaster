// Safe recursive descent math parser - replaces eval()
const SafeMathParser = (function () {
  const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: 1.6180339887 };
  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    log: Math.log10, ln: Math.log, sqrt: Math.sqrt,
    cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sign: Math.sign, deg: (r) => r * 180 / Math.PI,
    rad: (d) => d * Math.PI / 180,
  };

  function tokenize(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      const c = expr[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let num = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
        tokens.push({ t: 'num', v: parseFloat(num) });
        continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        let name = '';
        while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) name += expr[i++];
        tokens.push({ t: 'id', v: name.toLowerCase() });
        continue;
      }
      if ('+-*/%^!()'.includes(c)) {
        tokens.push({ t: 'op', v: c });
        i++;
        continue;
      }
      throw new Error('Invalid char: ' + c);
    }
    return tokens;
  }

  function Parser(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const eat = (v) => { if (peek() && peek().v === v) pos++; else throw new Error('Expected ' + v); };

    function parseExpr() {
      let left = parseTerm();
      while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        const op = next().v;
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }
    function parseTerm() {
      let left = parseFactor();
      while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
        const op = next().v;
        const right = parseFactor();
        left = op === '*' ? left * right : op === '/' ? left / right : left % right;
      }
      return left;
    }
    function parseFactor() {
      let left = parseUnary();
      while (peek() && peek().t === 'op' && (peek().v === '^' || peek().v === '!')) {
        const op = next().v;
        if (op === '^') { left = Math.pow(left, parseUnary()); }
        else { let f = 1; for (let k = 2; k <= left; k++) f *= k; left = f; }
      }
      return left;
    }
    function parseUnary() {
      if (peek() && peek().t === 'op' && peek().v === '-') { next(); return -parseUnary(); }
      if (peek() && peek().t === 'op' && peek().v === '+') { next(); return parseUnary(); }
      return parsePrimary();
    }
    function parsePrimary() {
      const tk = peek();
      if (!tk) throw new Error('Unexpected end');
      if (tk.t === 'num') { next(); return tk.v; }
      if (tk.t === 'op' && tk.v === '(') { next(); const v = parseExpr(); eat(')'); return v; }
      if (tk.t === 'id') {
        next();
        if (peek() && peek().t === 'op' && peek().v === '(') {
          next();
          const arg = parseExpr();
          eat(')');
          if (FUNCS[tk.v]) return FUNCS[tk.v](arg);
          throw new Error('Unknown function: ' + tk.v);
        }
        if (CONSTS[tk.v] !== undefined) return CONSTS[tk.v];
        throw new Error('Unknown identifier: ' + tk.v);
      }
      throw new Error('Unexpected token: ' + JSON.stringify(tk));
    }
    this.parse = () => { const r = parseExpr(); if (pos < tokens.length) throw new Error('Unexpected token'); return r; };
  }

  function safeEval(expr) {
    try {
      const tokens = tokenize(String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'));
      const raw = new Parser(tokens).parse();
      // Trim floating-point precision artifacts (e.g., 0.1+0.2 → 0.30000000000000004)
      return Number(raw.toFixed(10));
    } catch (e) { return NaN; }
  }
  // evaluate() throws on invalid input (used by the Scientific Calculator UI which expects errors)
  function evaluate(expr) { const tokens = tokenize(String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')); const result = new Parser(tokens).parse(); if (typeof result !== 'number' || isNaN(result)) throw new Error('Invalid expression'); return result; }
  return { safeEval, evaluate };
})();
if (typeof window !== 'undefined') { window.safeEval = SafeMathParser.safeEval; window.SafeMathParser = SafeMathParser; }
