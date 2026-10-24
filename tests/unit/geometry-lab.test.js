// ============================================================
// GeometryLab — pure geometry helpers
// ============================================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Geo = require(join(__dirname, '..', '..', 'js', 'geometry-lab.js'));

describe('GeometryLab', () => {
  it('measures distance', () => {
    expect(Geo.dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('computes a right triangle: sides, perimeter, area', () => {
    const t = Geo.triangle({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 });
    expect(t.sides.a).toBeCloseTo(5, 10); // opposite p1 = hypotenuse
    expect(t.perimeter).toBeCloseTo(12, 10);
    expect(t.area).toBeCloseTo(6, 10);
    expect(t.heronArea).toBeCloseTo(t.area, 10);
  });

  it('angles sum to 180 degrees', () => {
    const t = Geo.triangle({ x: 1, y: 2 }, { x: 7, y: 3 }, { x: 4, y: 9 });
    expect(t.angles.A + t.angles.B + t.angles.C).toBeCloseTo(180, 6);
  });

  it('computes an equilateral triangle from a right-triangle check', () => {
    const side = 2;
    const h = Math.sqrt(3);
    const t = Geo.triangle({ x: 0, y: 0 }, { x: side, y: 0 }, { x: side / 2, y: h });
    expect(t.area).toBeCloseTo(Math.sqrt(3), 6);
    expect(t.angles.A).toBeCloseTo(60, 6);
  });

  it('computes circle measurements', () => {
    const c = Geo.circle({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(c.radius).toBe(3);
    expect(c.circumference).toBeCloseTo(6 * Math.PI, 10);
    expect(c.area).toBeCloseTo(9 * Math.PI, 10);
  });

  it('computes rectangle measurements', () => {
    const r = Geo.rectangle({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(r.width).toBe(3);
    expect(r.height).toBe(4);
    expect(r.area).toBe(12);
    expect(r.perimeter).toBe(14);
    expect(r.diagonal).toBe(5);
  });

  it('computes polygon area by shoelace', () => {
    const square = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
    expect(Geo.polygonArea(square)).toBe(16);
    expect(Geo.polygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});
