// ============================================================
// Grapher — expression compiler and sampler
// ============================================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Grapher = require(join(__dirname, '..', '..', 'js', 'grapher.js'));

describe('Grapher.compile', () => {
  const at = (expr, x) => Grapher.compile(expr)(x);

  it('evaluates polynomials', () => {
    expect(at('x^2 - 2', 5)).toBe(23);
    expect(at('2x + 1', 3)).toBe(7);
  });

  it('handles implicit multiplication', () => {
    expect(at('3x', 4)).toBe(12);
    expect(at('(x+1)(x-1)', 5)).toBe(24);
    expect(at('2sin(0)', 0)).toBe(0);
  });

  it('applies unary minus after power, not before', () => {
    expect(at('-x^2', 3)).toBe(-9);
    expect(at('-2^2', 0)).toBe(-4);
  });

  it('knows constants and functions', () => {
    expect(at('2pi', 0)).toBeCloseTo(2 * Math.PI, 10);
    expect(at('ln(e)', 0)).toBeCloseTo(1, 10);
    expect(at('abs(-5)+1', 0)).toBe(6);
    expect(at('sqrt(16)', 0)).toBe(4);
    expect(at('sin(pi/2)', 0)).toBeCloseTo(1, 10);
  });

  it('throws on malformed input', () => {
    expect(() => Grapher.compile('')).toThrow();
    expect(() => Grapher.compile('x +')).toThrow();
    expect(() => Grapher.compile('(x+1')).toThrow();
    expect(() => Grapher.compile('sin')).toThrow();
    expect(() => Grapher.compile('x $ 2')).toThrow();
  });
});

describe('Grapher.sample', () => {
  it('samples evenly and marks undefined points as null', () => {
    const pts = Grapher.sample('1/x', -2, 2, 5);
    expect(pts).toHaveLength(5);
    const mid = pts[2];
    expect(mid[0]).toBe(0);
    expect(mid[1]).toBeNull();
    expect(pts[0][1]).toBeCloseTo(-0.5, 10);
  });

  it('rejects an inverted range', () => {
    expect(() => Grapher.sample('x', 5, 0, 10)).toThrow();
  });
});
