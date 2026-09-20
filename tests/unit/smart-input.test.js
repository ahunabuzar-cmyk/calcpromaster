// S1 Smart Input tests — pure logic: unit parsing, paste-parse extraction,
// field mapping, presets integrity. (DOM helpers are exercised in smoke suite.)
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const src = fs.readFileSync(path.join(ROOT, 'js', 'smart-input.js'), 'utf8');
const sandbox = { window: {}, module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const SI = sandbox.window.SmartInput;
expect(SI).toBeTruthy();

describe('S1: parseUnitValue — unit auto-suggest', () => {
  it('parses plain numbers', () => {
    expect(SI.parseUnitValue('75').value).toBe(75);
    expect(SI.parseUnitValue('75').unit).toBeNull();
    expect(SI.parseUnitValue('1,200,000').value).toBe(1200000);
    expect(SI.parseUnitValue('-3.5').value).toBe(-3.5);
  });
  it('converts weight units to kg', () => {
    expect(SI.parseUnitValue('70 kg').value).toBe(70);
    expect(SI.parseUnitValue('154 lb').value).toBeCloseTo(69.85, 2);
    expect(SI.parseUnitValue('11 stone').value).toBeCloseTo(69.85, 2);
    expect(SI.parseUnitValue('500 g').value).toBeCloseTo(0.5, 5);
    expect(SI.parseUnitValue('70 kg').unit).toBe('kg');
  });
  it('converts length units to m', () => {
    expect(SI.parseUnitValue('180 cm').value).toBeCloseTo(1.8, 5);
    expect(SI.parseUnitValue('6 feet').value).toBeCloseTo(1.8288, 4);
    expect(SI.parseUnitValue('5 km').value).toBe(5000);
    expect(SI.parseUnitValue('3 miles').value).toBeCloseTo(4828.02, 1);
  });
  it('returns null for garbage / unknown units', () => {
    expect(SI.parseUnitValue('abc')).toBeNull();
    expect(SI.parseUnitValue('5 xyz')).toBeNull();
    expect(SI.parseUnitValue('')).toBeNull();
    expect(SI.parseUnitValue(null)).toBeNull();
  });
  it('provides a human note for converted values', () => {
    const r = SI.parseUnitValue('154 lb');
    expect(r.note).toMatch(/154 lb = 69\.8\d+ kg/);
  });
});

describe('S1: extractNumbers — paste-and-parse', () => {
  it('extracts labeled values from a pasted bill', () => {
    const text = 'Electricity Bill\nUnits consumed: 420\nAmount due: 8,450.50\nDue date: 15 Aug';
    const r = SI.extractNumbers(text);
    const labels = r.map(x => x.label);
    expect(labels).toContain('units consumed');
    expect(labels).toContain('amount due');
    const units = r.find(x => x.label === 'units consumed');
    expect(units.value).toBe(420);
    const amt = r.find(x => x.label === 'amount due');
    expect(amt.value).toBe(8450.5);
  });
  it('extracts bare numbers with thousands separators', () => {
    const r = SI.extractNumbers('total 1,250,000 and 42.5 and 17');
    const vals = r.map(x => x.value);
    expect(vals).toContain(1250000);
    expect(vals).toContain(42.5);
    expect(vals).toContain(17);
  });
  it('does not re-extract the same bare value twice', () => {
    const r = SI.extractNumbers('100 then 100 again');
    expect(r.filter(x => x.value === 100).length).toBe(1);
  });
  it('caps extraction at 12 values', () => {
    const text = Array.from({ length: 30 }, (_, i) => 'field' + i + ': ' + i).join('\n');
    expect(SI.extractNumbers(text).length).toBeLessThanOrEqual(12);
  });
  it('handles empty / null input', () => {
    expect(SI.extractNumbers('')).toEqual([]);
    expect(SI.extractNumbers(null)).toEqual([]);
  });
});

describe('S1: mapExtractedToInputs — field mapping', () => {
  const inputs = [
    { id: 'units', label: 'Units consumed' },
    { id: 'amount', label: 'Total amount' },
    { id: 'rate', label: 'Rate per unit' }
  ];
  it('maps labeled values to matching inputs (id or label overlap)', () => {
    const ex = [{ label: 'units consumed', value: 420 }, { label: 'amount due', value: 8450 }];
    const m = SI.mapExtractedToInputs(ex, inputs);
    expect(m.units).toBe(420);
    expect(m.amount).toBe(8450);
    expect(m.rate).toBeUndefined();
  });
  it('fills remaining numeric inputs with bare values in order', () => {
    const ex = [{ label: 'units consumed', value: 420 }, { label: null, value: 12.5 }];
    const m = SI.mapExtractedToInputs(ex, inputs);
    expect(m.amount).toBe(12.5); // first remaining slot, order of appearance
    expect(m.rate).toBeUndefined();
  });
  it('never maps values into selects/checkboxes', () => {
    const mixed = [{ id: 'units', label: 'Units' }, { id: 'mode', label: 'Mode', type: 'select' }];
    const m = SI.mapExtractedToInputs([{ label: null, value: 7 }], mixed);
    expect(m.mode).toBeUndefined();
    expect(m.units).toBe(7);
  });
  it('OCR text pipeline: text → extraction → mapping', () => {
    const m = SI.ocrExtractFromText('Invoice\nSubtotal: 3,200\nTax: 480', [{ id: 'subtotal', label: 'Subtotal' }, { id: 'tax', label: 'Tax' }]);
    expect(m.subtotal).toBe(3200);
    expect(m.tax).toBe(480);
  });
});

describe('S1: OCR scan surface', () => {
  it('scanPhoto and loadTesseract are exported for the browser wiring', () => {
    expect(typeof SI.scanPhoto).toBe('function');
    expect(typeof SI.loadTesseract).toBe('function');
  });
});

describe('S1: presets — integrity', () => {
  it('every preset has label + non-empty fields object', () => {
    for (const [cat, list] of Object.entries(SI.PRESETS)) {
      expect(list.length, cat).toBeGreaterThan(0);
      for (const p of list) {
        expect(typeof p.label).toBe('string');
        expect(p.label.length).toBeGreaterThan(0);
        expect(Object.keys(p.fields).length).toBeGreaterThan(0);
        for (const v of Object.values(p.fields)) expect(typeof v).toBe('number');
      }
    }
  });
  it('typical values are finite positive numbers', () => {
    for (const [k, vals] of Object.entries(SI.TYPICAL)) {
      expect(vals.length, k).toBeGreaterThan(0);
      for (const v of vals) { expect(isFinite(v)).toBe(true); expect(v).toBeGreaterThan(0); }
    }
  });
});
