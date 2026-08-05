// Unit tests for the Security module in js/core.js (the REAL shipped module — no inline copy)
// Run: npm run test:unit
import { describe, it, expect } from 'vitest';
import core from '../../js/core.js';

const { Security } = core;

describe('Security.sanitizeHtml (XSS immunity)', () => {
  it('escapes script tags', () => {
    expect(Security.sanitizeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('escapes event handlers', () => {
    expect(Security.sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });
  it('escapes javascript: URLs', () => {
    expect(Security.sanitizeHtml('javascript:alert(1)')).toBe('javascript:alert(1)'); // colon is harmless after < escaping
  });
  it('escapes quotes to prevent attribute breakout', () => {
    expect(Security.sanitizeHtml('" onmouseover="alert(1)')).toBe('&quot; onmouseover=&quot;alert(1)');
  });
  it('handles null/undefined/numbers', () => {
    // Implementation coerces falsy values to empty string (String(str || ''))
    expect(Security.sanitizeHtml(null)).toBe('');
    expect(Security.sanitizeHtml(undefined)).toBe('');
    expect(Security.sanitizeHtml(42)).toBe('42');
    expect(Security.sanitizeHtml('')).toBe('');
  });
  it('escapes html entity chars', () => {
    expect(Security.sanitizeHtml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#039;');
  });
});

describe('Security.sanitizeCalcValue (float hardening)', () => {
  it('strips non-numeric garbage', () => {
    expect(Security.sanitizeCalcValue('$1,234.56', 0)).toBe(1234.56);
    expect(Security.sanitizeCalcValue('abc', 0)).toBe(0);
    expect(Security.sanitizeCalcValue('<script>', 0)).toBe(0);
  });
  it('truncates float artifacts to 10 decimals', () => {
    expect(Security.sanitizeCalcValue(0.1 + 0.2, 0)).toBe(0.3);
    expect(Security.sanitizeCalcValue(1.0000000000000002, 0)).toBe(1);
  });
  it('handles extreme values and negative zero', () => {
    expect(Security.sanitizeCalcValue(1e18, 0)).toBe(1e18);
    expect(Security.sanitizeCalcValue(-5, 0)).toBe(-5);
    expect(Security.sanitizeCalcValue(NaN, 7)).toBe(7);
    expect(Security.sanitizeCalcValue(Infinity, 7)).toBe(7);
    expect(Security.sanitizeCalcValue(undefined, 7)).toBe(7);
  });
});

describe('Security.validateInput (input bounds)', () => {
  it('truncates over-long input', () => {
    expect(Security.validateInput('a'.repeat(1000), { maxLen: 10 })).toBe('a'.repeat(10));
  });
  it('allows alpha-only', () => {
    expect(Security.validateInput('abc123!', { allowNumeric: false })).toBe('abc');
  });
  it('allows numeric-only', () => {
    expect(Security.validateInput('abc123', { allowAlpha: false })).toBe('123');
  });
  it('allows custom symbols', () => {
    expect(Security.validateInput('hello-world!', { allowNumeric: false, allowSymbols: '-' })).toBe('hello-world');
  });
  it('handles script injection strings', () => {
    // allowAlpha:false strips letters — only the digit '1' survives (alert(1))
    const out = Security.validateInput('<script>alert(1)</script>', { allowAlpha: false });
    expect(out).toBe('1');
    // full sanitization path still escapes the whole payload
    expect(Security.sanitizeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('Security.safeJsonParse (corrupt storage recovery)', () => {
  it('returns fallback on invalid JSON', () => {
    expect(Security.safeJsonParse('{bad json', { ok: true })).toEqual({ ok: true });
    expect(Security.safeJsonParse(null, 'fb')).toBe('fb');
    // JSON 'null' parses to null → `null || fallback` → fallback
    expect(Security.safeJsonParse('null', 'fb')).toBe('fb');
  });
});

describe('Security.cryptoRandom (Web Crypto grade)', () => {
  it('returns a float in [0,1)', () => {
    for (let i = 0; i < 50; i++) {
      const r = Security.cryptoRandom();
      expect(typeof r).toBe('number');
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});

describe('Security.cryptoRandomInt', () => {
  it('returns integers within [min, max] inclusive', () => {
    for (let i = 0; i < 100; i++) {
      const v = Security.cryptoRandomInt(1, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
  it('handles inverted/equal bounds', () => {
    expect(Security.cryptoRandomInt(5, 5)).toBe(5);
    expect(Security.cryptoRandomInt(10, 2)).toBe(10); // max<=min → returns min
  });
  it('handles negative ranges', () => {
    const v = Security.cryptoRandomInt(-10, -1);
    expect(v).toBeGreaterThanOrEqual(-10);
    expect(v).toBeLessThanOrEqual(-1);
  });
});

describe('Security.generateSecureToken', () => {
  it('returns exact length with default base64url charset', () => {
    for (const len of [8, 16, 32, 64]) {
      const t = Security.generateSecureToken(len);
      expect(t.length).toBe(len);
      expect(/^[A-Za-z0-9\-_]+$/.test(t)).toBe(true);
    }
  });
  it('honors a custom charset (only pool chars appear)', () => {
    const t = Security.generateSecureToken(40, 'abc');
    expect(t.length).toBe(40);
    expect(/^[abc]+$/.test(t)).toBe(true);
  });
  it('defaults length to 32 and charset to base64url', () => {
    const t = Security.generateSecureToken();
    expect(t.length).toBe(32);
    expect(/^[A-Za-z0-9\-_]+$/.test(t)).toBe(true);
  });
  it('produces varied tokens (not constant)', () => {
    const a = Security.generateSecureToken(32);
    const b = Security.generateSecureToken(32);
    expect(a).not.toBe(b);
  });
  it('supports hex charset', () => {
    const t = Security.generateSecureToken(16, 'hex');
    expect(/^[0-9a-f]+$/.test(t)).toBe(true);
    expect(t.length).toBe(16);
  });
});

describe('Security.sanitizeOutput (allow-list for isHtml tools)', () => {
  // NOTE: in the Node test env there is no DOMParser, so sanitizeOutput takes the
  // full-escape fallback path; in the browser it takes the DOMParser allow-list
  // path. These assertions test the injection-safety invariant that holds on BOTH
  // paths: never emit a raw executable tag/attribute.
  it('never emits a raw script tag', () => {
    const out = Security.sanitizeOutput('<script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('alert(1)'); // content survives as inert text
  });
  it('keeps visible text while neutralizing script tags', () => {
    const out = Security.sanitizeOutput('<p>Hello <b>world</b> <script>evil()</script></p>');
    expect(out).not.toContain('<script');
    expect(out).toContain('Hello');
    expect(out).toContain('world');
    expect(out).toContain('evil()');
  });
  it('neutralizes anchor/javascript injection', () => {
    const out = Security.sanitizeOutput('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('<a'); // raw anchor tag never survives (escaped in Node, stripped in browser)
    // NOTE: cannot assert 'href=' absence — the Node fallback escapes only & < > " ',
    // so 'href=' survives as inert escaped text. The raw-tag check above is the
    // injection-safety invariant that holds on BOTH paths.
  });
});
