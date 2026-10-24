// ============================================================
// Deliverable B ka contract — keyword research table
// ------------------------------------------------------------
// Ye test spreadsheet ko PARHTA hai, banata nahi (generator chalana test ke andar
// files likh deta, jo test ka kaam nahi). Jo cheez test karta hai:
//
//   1. brief ke 15 fields ka apna column mojood ho
//   2. "measured" row ke paas asli GSC number ho, aur "targeted" row ke paas na ho
//   3. jo cell khaali/NA hai usme REASON likha ho (chup-chaap khaali cell nahi)
//   4. koi invented-looking number volume/CPC column mein na ho
//   5. priority pages (jo probe hue) par SERP observation atki ho, baqi par saaf
//      "Not probed yet"
//
// Fail hone ka matlab: table apne brief se ya apne sources se hat gayi hai.
// Regenerate: node scripts/build-keyword-research-table.cjs
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// Minimal RFC4180-ish parser — enough for this file (quoted fields, embedded commas).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const csv = readFileSync(join(ROOT, 'data', 'keyword-research.csv'), 'utf8');
const rows = parseCsv(csv);
const header = rows[0];
const data = rows.slice(1).filter((r) => r.length > 1 && r.some((c) => c !== ''));
const idx = (name) => header.indexOf(name);
const cell = (r, name) => r[idx(name)];

// Field 4 of the brief is "country and language" — two columns here.
const BRIEF_FIELDS = [
  'keyword', 'primary_topic', 'search_intent', 'country', 'language',
  'monthly_search_volume', 'keyword_difficulty', 'cpc',
  'serp_dominant_page_types', 'search_result_features', 'competing_urls',
  'current_calcpro_url', 'recommended_target_url', 'related_keyword_cluster',
  'evidence_source_date', 'confidence_level', 'missing_data',
];

describe('keyword-research.csv — brief ka field contract', () => {
  it('has a column for every field the brief asked for', () => {
    const missing = BRIEF_FIELDS.filter((f) => !header.includes(f));
    expect(missing, 'missing brief columns').toEqual([]);
  });

  it('carries the measured evidence columns separately from the modelled ones', () => {
    for (const c of ['gsc_impressions_28d', 'gsc_clicks_28d', 'gsc_ctr', 'gsc_avg_position', 'row_type']) {
      expect(header, c).toContain(c);
    }
  });

  it('has rows of both kinds, and each row declares which kind it is', () => {
    const kinds = new Set(data.map((r) => cell(r, 'row_type')));
    expect([...kinds].every((k) => k === 'measured' || k === 'targeted')).toBe(true);
    expect(kinds.has('measured')).toBe(true);
    expect(data.length).toBeGreaterThan(100);
  });

  it('measured rows carry real GSC numbers, targeted rows do not claim any', () => {
    for (const r of data) {
      const kind = cell(r, 'row_type');
      const impressions = cell(r, 'gsc_impressions_28d');
      if (kind === 'measured') {
        expect(Number.isFinite(Number(impressions)) && Number(impressions) > 0, cell(r, 'keyword')).toBe(true);
        expect(Number.isFinite(Number(cell(r, 'gsc_clicks_28d')))).toBe(true);
        expect(cell(r, 'gsc_ctr')).toMatch(/%$/);
        expect(cell(r, 'gsc_avg_position')).toMatch(/^\d+(\.\d+)?$/);
      } else {
        expect(String(impressions).trim(), cell(r, 'keyword')).toBe('');
      }
    }
  });

  it('every keyword and target URL is filled in', () => {
    for (const r of data) {
      expect(String(cell(r, 'keyword')).trim().length, 'keyword empty').toBeGreaterThan(1);
      expect(String(cell(r, 'recommended_target_url')).trim().length).toBeGreaterThan(1);
      expect(String(cell(r, 'current_calcpro_url')).trim().length).toBeGreaterThan(1);
    }
  });

  it('never invents a volume or a CPC — those cells say Not available with the reason', () => {
    for (const r of data) {
      for (const col of ['monthly_search_volume', 'cpc']) {
        const v = String(cell(r, col));
        expect(v, col + ' must not look like a measurement').toMatch(/^Not available — /);
        expect(v).toMatch(/provider|Keyword Planner|Ahrefs|Semrush/i);
      }
    }
    // No numeric-only cell anywhere in those two columns.
    expect(data.every((r) => !/^[\d,.]+$/.test(String(cell(r, 'monthly_search_volume'))))).toBe(true);
  });

  it('difficulty is labelled as a model, never presented as a provider score', () => {
    for (const r of data) {
      const v = String(cell(r, 'keyword_difficulty'));
      expect(v, cell(r, 'keyword')).toMatch(/MODEL/);
      expect(v).toMatch(/EASY|MEDIUM|HARD|BRAND/);
    }
  });

  it('names the evidence source and the window for every row', () => {
    for (const r of data) {
      const v = String(cell(r, 'evidence_source_date'));
      expect(v, cell(r, 'keyword')).toMatch(/20\d\d-\d\d-\d\d/);
      expect(v).toMatch(/Search Console|js\/data|curated/i);
    }
  });

  it('intent comes from the stated rule set, never a blank or a mystery label', () => {
    const allowed = new Set([
      'informational-question', 'commercial-comparison', 'transactional-tool',
      'informational-definition', 'unclassified',
    ]);
    for (const r of data) expect(allowed.has(String(cell(r, 'search_intent'))), cell(r, 'keyword')).toBe(true);
  });

  it('probed pages carry the SERP observation, the rest say so honestly', () => {
    const probed = data.filter((r) => String(cell(r, 'serp_dominant_page_types')) !== 'Not probed yet');
    for (const r of probed) {
      expect(String(cell(r, 'competing_urls')), cell(r, 'keyword')).toMatch(/^https?:\/\//);
      expect(String(cell(r, 'search_result_features'))).toMatch(/PAA:/);
    }
    const unprobed = data.filter((r) => String(cell(r, 'serp_dominant_page_types')) === 'Not probed yet');
    for (const r of unprobed) {
      expect(String(cell(r, 'competing_urls'))).toBe('Not available');
      expect(String(cell(r, 'missing_data'))).toMatch(/probe|provider|dimension/i);
    }
    // The four clusters analysed in docs/SERP-OPPORTUNITY-REPORT.md must be present.
    const probedUrls = new Set(probed.map((r) => String(cell(r, 'current_calcpro_url'))));
    for (const u of ['/lifestyle/home-insurance', '/guides/business-days', '/finance/apy-calculator', '/health/bmr-mifflin']) {
      expect(probedUrls.has(u), u + ' probed rows').toBe(true);
    }
  });

  it('country is not guessed — the missing dimension is stated', () => {
    for (const r of data) {
      expect(String(cell(r, 'country')), cell(r, 'keyword')).toMatch(/^Not available — /);
      expect(String(cell(r, 'country'))).toMatch(/country|dimension/i);
    }
  });
});

describe('KEYWORD-RESEARCH.md — companion doc matches the csv', () => {
  const md = readFileSync(join(ROOT, 'docs', 'KEYWORD-RESEARCH.md'), 'utf8');

  it('states the row count that the csv actually has', () => {
    expect(md).toContain(String(data.length));
  });

  it('says plainly what is measured, modelled and unavailable', () => {
    expect(md).toMatch(/Honesty box/);
    expect(md).toMatch(/Not available/);
    expect(md).toMatch(/structural model/i);
  });

  it('lists the probed clusters with their confidence', () => {
    for (const u of ['/lifestyle/home-insurance', '/guides/business-days', '/finance/apy-calculator', '/health/bmr-mifflin']) {
      expect(md).toContain(u);
    }
    expect(md).toMatch(/LOW|MEDIUM|HIGH/);
  });
});
