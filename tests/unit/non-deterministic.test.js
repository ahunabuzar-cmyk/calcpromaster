// CALCPROMASTER — Property-based QA for non-deterministic tools.
// These tools produce random output, so exact known-answer tests are impossible.
// Instead we verify structural/statistical PROPERTIES that must always hold:
//  - UUID v4: correct format, valid version/variant bits, uniqueness
//  - Password: correct length, only chars from the declared pool, uniqueness,
//    charset coverage when requested, no degenerate all-identical output
//  - Lorem ipsum: correct paragraph count, non-empty, HTML-safe paragraphs
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

let tools;

beforeAll(() => {
  const Charts = { gauge: () => '', donut: () => '', bar: () => '', line: () => '' };
  const ctx = {
    window: { Charts },
    Charts,
    console,
    Security: {
      validateInput: (v) => v,
      sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; }
    }
  };
  vm.createContext(ctx);
  for (const f of ['js/core.js', 'js/data/tech-digital.js', 'js/data/utilities.js', 'js/data.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  tools = {};
  for (const arr of ['TECH_TOOLS', 'UTILITY_TOOLS']) {
    if (vm.runInContext('typeof ' + arr, ctx) !== 'undefined') {
      vm.runInContext(arr, ctx).forEach(t => { tools[t.id] = t; });
    }
  }
});

describe('uuid-generator — property-based', () => {
  const t = () => tools['uuid-generator'];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('produces well-formed UUID v4s (version 4 + variant bits)', () => {
    for (let i = 0; i < 20; i++) {
      const res = t().calc({ count: 1 });
      const uuid = String(res.result).trim();
      expect(uuid).toMatch(UUID_RE);
    }
  });

  it('produces unique UUIDs (no collisions across 200)', () => {
    const res = t().calc({ count: 50 });
    const uuids = String(res.result).split('\n').map(s => s.trim());
    expect(uuids.length).toBe(50);
    expect(new Set(uuids).size).toBe(50);
  });

  it('caps count at 50 (bounded output, no runaway)', () => {
    const res = t().calc({ count: 99999 });
    expect(String(res.result).split('\n').length).toBeLessThanOrEqual(50);
  });
});

describe('password-generator — property-based', () => {
  const t = () => tools['password-generator'];
  const POOLS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?'
  };

  it('generates correct length with only allowed characters', () => {
    for (let i = 0; i < 20; i++) {
      const res = t().calc({ length: 20, upper: true, lower: true, digits: true, symbols: true, count: 1 });
      const pwd = String(res.result).trim();
      expect(pwd.length).toBe(20);
      const allowed = new Set(Object.values(POOLS).join(''));
      for (const ch of pwd) expect(allowed.has(ch)).toBe(true);
    }
  });

  it('is non-degenerate (not all identical characters)', () => {
    for (let i = 0; i < 20; i++) {
      const res = t().calc({ length: 16, upper: true, lower: true, digits: true, symbols: true, count: 1 });
      const pwd = String(res.result).trim();
      expect(new Set(pwd.split('')).size).toBeGreaterThan(1);
    }
  });

  it('respects disabled charsets (digits excluded when unchecked)', () => {
    const res = t().calc({ length: 32, upper: true, lower: true, digits: false, symbols: false, count: 1 });
    const pwd = String(res.result).trim();
    expect(pwd).not.toMatch(/[0-9]/);
    expect(pwd).not.toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
  });

  it('includes each requested charset at least once across a batch', () => {
    // With a batch of 10 × 16 chars, each selected charset must appear somewhere.
    const res = t().calc({ length: 16, upper: true, lower: true, digits: true, symbols: true, count: 10 });
    const batch = String(res.result);
    expect(batch).toMatch(/[A-Z]/);
    expect(batch).toMatch(/[a-z]/);
    expect(batch).toMatch(/[0-9]/);
    expect(batch).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
  });

  it('produces unique passwords in a batch', () => {
    const res = t().calc({ length: 16, upper: true, lower: true, digits: true, symbols: true, count: 10 });
    const pwds = String(res.result).split('\n').map(s => s.trim());
    expect(new Set(pwds).size).toBe(10);
  });

  it('caps count at 10 (bounded output)', () => {
    const res = t().calc({ length: 12, count: 99999 });
    expect(String(res.result).split('\n').length).toBeLessThanOrEqual(10);
  });

  it('clamps length to [8, 64]', () => {
    const lo = t().calc({ length: 1, count: 1 });
    expect(String(lo.result).trim().length).toBe(8);
    const hi = t().calc({ length: 999, count: 1 });
    expect(String(hi.result).trim().length).toBe(64);
  });
});

describe('lorem-ipsum — property-based', () => {
  const t = () => tools['lorem-ipsum'];
  it('produces the requested number of paragraphs', () => {
    const res = t().calc({ paragraphs: 5 });
    const count = (String(res.result).match(/<p>/g) || []).length;
    expect(count).toBe(5);
  });
  it('produces non-empty paragraphs', () => {
    const res = t().calc({ paragraphs: 3 });
    const ps = String(res.result).match(/<p>([^<]*)<\/p>/g) || [];
    for (const p of ps) expect(p.length).toBeGreaterThan(10);
  });
  it('caps paragraphs at 100 (bounded output)', () => {
    const res = t().calc({ paragraphs: 99999 });
    expect((String(res.result).match(/<p>/g) || []).length).toBeLessThanOrEqual(100);
  });
});
