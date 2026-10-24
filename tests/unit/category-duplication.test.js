import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const CD = require('../../js/category-depth.js');
const { run } = require('../../scripts/check-category-duplication.cjs');

const ROOT = path.join(__dirname, '..', '..');

const TOOLS = [
  {
    id: 'loan-emi',
    name: 'Loan EMI Calculator',
    desc: 'Solve for payment, loan amount, rate or term',
    inputs: [{ id: 'amount', label: 'Loan Amount' }, { id: 'rate', label: 'Interest Rate (% per year)' }],
  },
  {
    id: 'mortgage',
    name: 'Mortgage Calculator',
    desc: 'Mortgage payment with interest-only mode',
    inputs: [{ id: 'price', label: 'Home Price' }, { id: 'down', label: 'Down Payment' }],
  },
];

describe('compareTableHtml — the block that makes a hub a comparison page', () => {
  it('is exported for both the SSG and the client', () => {
    expect(typeof CD.compareTableHtml).toBe('function');
  });

  it('renders one row per tool with the REAL input labels', () => {
    const html = CD.compareTableHtml('finance', TOOLS);
    expect(html).toContain('class="comparison-table hub-compare-table"');
    expect(html).toContain('<th>Calculator</th>');
    expect(html).toContain('<th>What it works out</th>');
    expect(html).toContain('<th>What you enter</th>');
    // One row per tool, each linking its own page (the crawl paths the old
    // 48-card grid used to carry).
    expect(html.match(/<tr><td class="tool-name">/g)).toHaveLength(2);
    expect(html).toContain('href="/finance/loan-emi/"');
    expect(html).toContain('href="/finance/mortgage/"');
    expect(html).toContain('Loan Amount · Interest Rate (% per year)');
    expect(html).toContain('Home Price · Down Payment');
  });

  it('never prints a bare column heading without the category name (prerender === hydrate)', () => {
    // The SSG's CAT_NAME and the client's CALC_DATA disagree for 6 categories,
    // so any interpolated name would make the two renders differ.
    const html = CD.compareTableHtml('health', TOOLS);
    expect(html).toContain('<h2>Compare calculators by what you enter</h2>');
    expect(html).not.toMatch(/Health/);
  });

  it('escapes tool text so stored content can never inject markup', () => {
    const html = CD.compareTableHtml('finance', [
      { id: 'a', name: 'A <script>alert(1)</script>', desc: 'x & y "z"', inputs: [{ label: 'B & B' }] },
      { id: 'b', name: 'B', desc: 'ok', inputs: [{ label: 'C' }] },
    ]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('B &amp; B');
  });

  it('refuses to emit a table it cannot back with real input labels', () => {
    expect(CD.compareTableHtml('finance', [])).toBe('');
    expect(CD.compareTableHtml('finance', [TOOLS[0]])).toBe('');
    const noInputs = [
      { id: 'a', name: 'A', desc: 'x' },
      { id: 'b', name: 'B', desc: 'y' },
    ];
    expect(CD.compareTableHtml('finance', noInputs)).toBe('');
  });

  it('strips anything unsafe out of a tool id used in an href', () => {
    const html = CD.compareTableHtml('finance', [
      { id: 'ok-1"onmouseover="x', name: 'A', desc: 'd', inputs: [{ label: 'L' }] },
      { id: 'b', name: 'B', desc: 'd', inputs: [{ label: 'L' }] },
    ]);
    // The injected quote/equals are gone, so the id cannot break out of the
    // attribute — every href stays inside the /finance/<slug>/ shape.
    expect(html).not.toContain('onmouseover="');
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toHaveLength(2);
    for (const h of hrefs) expect(h).toMatch(/^\/finance\/[A-Za-z0-9_-]+\/$/);
    expect(hrefs[0]).toBe('/finance/ok-1onmouseoverx/');
  });
});

describe('category / hub block ownership (the duplication fix)', () => {
  it('the shared client hub renderer no longer ships the category catalog, methodology or FAQ', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'category-hub.js'), 'utf8');
    // The blocks each have exactly one owner now (the category page + tool pages).
    expect(src).not.toContain('hub-tools-grid');
    expect(src).not.toContain('methodologyHtml');
    expect(src).not.toContain('CategoryDepth.faqHtml');
    // ...but the hub still renders the comparison table it exists for.
    expect(src).toContain('compareTableHtml');
  });

  it('the category page renders the FAQ (client) and the SSG does not put it back on the hub', () => {
    const app = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
    const ssg = fs.readFileSync(path.join(ROOT, 'scripts', 'ssg-pages.cjs'), 'utf8');
    // Client: /<cat>/ renders the FAQ.
    const catRender = app.slice(app.indexOf('function renderCategory('), app.indexOf('function showMoreTools('));
    expect(catRender).toContain('CategoryDepth.faqHtml');
    // SSG: the hub loop must not call methodologyHtml / faqHtml / the card grid.
    const hubLoop = ssg.slice(ssg.indexOf('// 7c. Hub pages'), ssg.indexOf('// 7d. Long-tail'));
    expect(hubLoop).toContain('compareTableHtml');
    expect(hubLoop).not.toContain('methodologyHtml');
    expect(hubLoop).not.toContain('faqHtml');
    expect(hubLoop).not.toContain('hub-tools-grid');
    // The category loop owns the FAQ block instead.
    const catLoop = ssg.slice(ssg.indexOf('// 7b. Category pages'), ssg.indexOf('// 7c. Hub pages'));
    expect(catLoop).toContain('CategoryDepth.faqHtml');
  });

  it('measures the built pages when deploy/ is present (gate exits 0)', () => {
    const hubDir = path.join(ROOT, 'deploy', 'hub');
    if (!fs.existsSync(hubDir)) {
      console.warn('deploy/hub missing — build first (`node build-deploy.js`); gate not exercised');
      return;
    }
    expect(run()).toBe(0);
  });
});
