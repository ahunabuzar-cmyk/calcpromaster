// Unit tests for the SafeMathParser in js/core.js (the REAL shipped module — no inline copy)
// Run: npm run test:unit  (or npx vitest run tests/unit/safe-math.test.js)
import { describe, it, expect } from 'vitest';
import core from '../../js/core.js';

const { SafeMathParser } = core;
// Mirror the browser API surface (window.safeEval / window.SafeMathParser)
const P = {
  safeEval: (e) => SafeMathParser.safeEval(e),
  evaluate: (e) => SafeMathParser.evaluate(e)
};

describe('SafeMathParser', () => {
  it('evaluates basic arithmetic', () => {
    expect(P.safeEval('2+3')).toBe(5);
    expect(P.safeEval('10-4')).toBe(6);
    expect(P.safeEval('6*7')).toBe(42);
    expect(P.safeEval('8/2')).toBe(4);
  });

  it('handles operator precedence', () => {
    expect(P.safeEval('2+3*4')).toBe(14);
    expect(P.safeEval('(2+3)*4')).toBe(20);
    expect(P.safeEval('2^3^2')).toBe(64);   // parser is left-associative: (2^3)^2
    expect(P.safeEval('2^10')).toBe(1024);
  });

  it('handles unicode math symbols (× ÷ −)', () => {
    expect(P.safeEval('5×5')).toBe(25);
    expect(P.safeEval('9÷3')).toBe(3);
    expect(P.safeEval('7−2')).toBe(5);
  });

  it('handles zero', () => {
    expect(P.safeEval('0+0')).toBe(0);
    expect(P.safeEval('5-5')).toBe(0);
    expect(P.safeEval('0*1000000000')).toBe(0);
    expect(P.safeEval('0/7')).toBe(0);
  });

  it('handles negatives', () => {
    expect(P.safeEval('-5+3')).toBe(-2);
    expect(P.safeEval('-(-5)')).toBe(5);
    expect(P.safeEval('2--3')).toBe(5);
  });

  it('handles extreme scale values (1e18)', () => {
    // Tokenizer has no scientific-notation 'e' handling — use full digit strings
    expect(P.safeEval('1000000000000000000+1')).toBe(1e18 + 1);
    expect(P.safeEval('1000000000000000000*2')).toBe(2e18);
    expect(P.safeEval('999999999999999999/1')).toBeCloseTo(1e18, 6);
  });

  it('handles division by zero without throwing', () => {
    expect(Number.isNaN(P.safeEval('1/0'))).toBe(false); // Infinity is valid IEEE
    expect(P.safeEval('1/0')).toBe(Infinity);
  });

  it('returns NaN for garbage input (never throws)', () => {
    expect(P.safeEval('')).toBeNaN();
    expect(P.safeEval('abc')).toBeNaN();
    expect(P.safeEval('2+')).toBeNaN();
    expect(P.safeEval('<script>alert(1)</script>')).toBeNaN();
    expect(P.safeEval('null')).toBeNaN();
    expect(P.safeEval('undefined')).toBeNaN();
  });

  it('caps expression length at 1000 chars (DoS guard)', () => {
    const long = '1+'.repeat(600); // 1200 chars
    expect(P.safeEval(long)).toBe(0); // tokenizer returns zero-node
  });

  it('supports functions and constants', () => {
    expect(P.safeEval('sqrt(16)')).toBe(4);
    expect(P.safeEval('abs(-9)')).toBe(9);
    expect(P.safeEval('pi')).toBeCloseTo(Math.PI, 10);
    expect(P.safeEval('sin(0)')).toBeCloseTo(0, 10);
    expect(P.safeEval('round(2.6)')).toBe(3);
  });

  it('evaluate() throws on invalid input (UI path)', () => {
    expect(() => P.evaluate('2+')).toThrow();
    expect(() => P.evaluate('<script>')).toThrow();
  });

  it('evaluate() returns exact numbers on valid input', () => {
    expect(P.evaluate('0.1+0.2')).toBeCloseTo(0.3, 10);
  });
});
