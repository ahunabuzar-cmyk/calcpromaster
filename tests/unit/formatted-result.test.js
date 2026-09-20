// S4 #34: buildFormattedResult — pure WhatsApp-ready summary builder.
// app.js is a browser IIFE, so we extract the function body and eval it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const src = readFileSync(join(ROOT, 'js', 'app.js'), 'utf8');

const m = src.match(/function buildFormattedResult\([\s\S]*?\n  \}/);
expect(m, 'buildFormattedResult found in app.js').toBeTruthy();
const sandbox = {};
vm.createContext(sandbox);
const f = vm.runInContext(m[0] + '; buildFormattedResult;', sandbox);

describe('S4 #34: buildFormattedResult', () => {
  it('builds an emoji-formatted multi-line summary', () => {
    const out = f('Loan EMI Calculator', 'Monthly EMI: $1,200', 'Total interest: $44,000', 'https://x.dev/finance/loan-emi?v=1');
    expect(out).toContain('🧮 Loan EMI Calculator — Result');
    expect(out).toContain('📊 Monthly EMI: $1,200');
    expect(out).toContain('ℹ️ Total interest: $44,000');
    expect(out).toContain('🔗 https://x.dev/finance/loan-emi?v=1');
    expect(out.split('\n').length).toBe(5);
  });
  it('omits empty extras and link', () => {
    const out = f('BMI Calculator', 'BMI: 24.2', '', '');
    expect(out).not.toContain('ℹ️');
    expect(out).not.toContain('🔗');
  });
  it('collapses whitespace in results', () => {
    const out = f('T', 'A\n\n  B   C', '  x  ', '');
    expect(out).toContain('📊 A B C');
    expect(out).toContain('ℹ️ x');
  });
  it('returns null when there is no main result', () => {
    expect(f('T', '', '', '')).toBeNull();
    expect(f('T', null, null, null)).toBeNull();
  });
});
