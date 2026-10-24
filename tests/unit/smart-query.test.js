import { describe, it, expect } from 'vitest';
import SmartSearch from '../../js/smart-search.js';

describe('SmartSearch.parse — natural-language values for smart search', () => {
  it('reads a lakh amount, a term and a rate from a sentence', () => {
    const p = SmartSearch.parse('EMI on 5 lakh for 20 years at 8.5%');
    expect(p.money).toBe(500000);
    expect(p.years).toBe(20);
    expect(p.percent).toBe(8.5);
    expect(p.numbers).toEqual([]);
  });

  it('reads a percent tip and leaves the bill as a bare number', () => {
    const p = SmartSearch.parse('15% tip on 60 dollar bill');
    expect(p.percent).toBe(15);
    expect(p.numbers).toEqual([60]);
  });

  it('converts metric weight and height, and does not leak their digits', () => {
    const p = SmartSearch.parse('BMI for 70 kg 175 cm');
    expect(p.weight).toBe(70);
    expect(p.height).toBe(175);
    expect(p.numbers).toEqual([]);
  });

  it('reads months and percent but keeps an unlabelled principal', () => {
    const p = SmartSearch.parse('100000 loan 7 percent 60 months');
    expect(p.percent).toBe(7);
    expect(p.months).toBe(60);
    expect(p.numbers).toEqual([100000]);
  });

  it('handles k/m suffixes and imperial weight', () => {
    expect(SmartSearch.parse('250k mortgage').money).toBe(250000);
    expect(SmartSearch.parse('1.2m house').money).toBe(1200000);
    expect(Math.round(SmartSearch.parse('150 lbs').weight)).toBe(68);
  });

  it('reports no values for a plain keyword query', () => {
    const p = SmartSearch.parse('loan emi calculator');
    expect(p.hasAny).toBe(false);
    expect(p.numbers).toEqual([]);
  });
});
