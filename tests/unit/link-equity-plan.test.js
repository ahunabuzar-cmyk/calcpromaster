import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { normalizeRoute, linksFrom, anchorFor, pickSources } = require('../../scripts/build-link-equity-plan.cjs');

describe('link-equity / normalizeRoute', () => {
  it('keeps internal routes and drops outbound or anchor links', () => {
    expect(normalizeRoute('/bmi')).toBe('/bmi');
    expect(normalizeRoute('/bmi/')).toBe('/bmi/');
    expect(normalizeRoute('/')).toBe('/');
    expect(normalizeRoute('https://elsewhere.com/x')).toBeNull();
    expect(normalizeRoute('//cdn.example.com/x')).toBeNull();
    expect(normalizeRoute('#top')).toBeNull();
    expect(normalizeRoute('mailto:a@b.com')).toBeNull();
  });

  it('drops query strings and fragments so one page counts once', () => {
    expect(normalizeRoute('/bmi?utm_source=x')).toBe('/bmi');
    expect(normalizeRoute('/bmi#faq')).toBe('/bmi');
  });
});

describe('link-equity / linksFrom', () => {
  const html = `
    <a href="/bmi/">BMI</a>
    <a class="x" href="/health/bmr">BMR</a>
    <a href="https://other.example/">out</a>
    <a href="/?ref=nav">home</a>
    <a href="/bmi/">duplicate</a>`;

  it('collects internal targets in served form, de-duplicated', () => {
    const links = linksFrom(html);
    expect([...links].sort()).toEqual(['/bmi/', '/health/bmr/']);
  });

  it('treats the homepage as not a link target (it is the shell, not an offer)', () => {
    expect(linksFrom('<a href="/">Home</a>').size).toBe(0);
  });

  it('does not crash on an empty document', () => {
    expect(linksFrom('').size).toBe(0);
  });
});

describe('link-equity / anchorFor', () => {
  it('uses the page’s own best query as the anchor', () => {
    expect(anchorFor('bmi calculator', 'BMI: Free Calculator')).toBe('bmi calculator');
  });

  it('truncates an over-long query instead of shipping a sentence as an anchor', () => {
    const a = anchorFor('how much should i weigh for my height and age in kg', '');
    expect(a.split(' ').length).toBeLessThanOrEqual(5);
  });

  it('falls back to the title head, then to a generic word', () => {
    expect(anchorFor('', 'Heart Rate Zones: Explained')).toBe('Heart Rate Zones');
    expect(anchorFor('', '')).toBe('calculator');
  });
});

describe('link-equity / pickSources', () => {
  const target = { path: '/health/bmr/' };
  const candidates = [
    { path: '/health/', impressions: 900 },
    { path: '/health/bmi/', impressions: 5000 },
    { path: '/health/ideal-weight/', impressions: 1200 },
    { path: '/finance/emi/', impressions: 9000 },
    { path: '/health/bmr/', impressions: 800 },
  ];

  it('prefers the strongest indexed pages in the same category', () => {
    const picked = pickSources(target, candidates, new Set(), 3);
    expect(picked.map((p) => p.path)).toEqual(['/health/bmi/', '/health/ideal-weight/', '/health/']);
  });

  it('never suggests a page that already links to the target', () => {
    const picked = pickSources(target, candidates, new Set(['/health/bmi/']), 3);
    expect(picked.map((p) => p.path)).not.toContain('/health/bmi/');
  });

  it('never suggests the target itself', () => {
    const picked = pickSources(target, candidates, new Set(), 3);
    expect(picked.map((p) => p.path)).not.toContain('/health/bmr/');
  });

  it('never suggests a page that is itself still waiting to be indexed', () => {
    const picked = pickSources(target, candidates, new Set(), 3, new Set(['/health/bmi/']));
    expect(picked.map((p) => p.path)).not.toContain('/health/bmi/');
    expect(picked[0].path).toBe('/health/ideal-weight/');
  });

  it('passes on a page too when every same-category source is withheld', () => {
    const blocked = new Set(candidates.map((c) => c.path));
    expect(pickSources(target, candidates, new Set(), 3, blocked)).toEqual([]);
  });

  it('returns an empty list when the category has no other source', () => {
    expect(pickSources(target, [{ path: '/finance/emi/', impressions: 9000 }], new Set(), 3)).toEqual([]);
  });
});
