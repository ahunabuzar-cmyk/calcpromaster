import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseCsv, rowsToPages, windowFromChart } = require('../../scripts/import-gsc-pages-csv.cjs');

describe('GSC Pages CSV import', () => {
  it('parses quoted fields with commas and escaped quotes', () => {
    const rows = parseCsv('a,"b,1","say ""hi"""\n2,3,4\n');
    expect(rows[0]).toEqual(['a', 'b,1', 'say "hi"']);
    expect(rows[1]).toEqual(['2', '3', '4']);
  });

  it('keeps only the page rows: a URL plus four metrics', () => {
    const rows = [
      ['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'],
      ['https://calcpromaster.com/health/bmr-mifflin/', '0', '749', '0%', '6.5'],
      ['Search appearance', 'Clicks', 'Impressions', 'CTR', 'Position'],
      ['Rich results', '1', '2', '50%', '3'],
    ];
    const pages = rowsToPages(rows);
    expect(Object.keys(pages)).toEqual(['https://calcpromaster.com/health/bmr-mifflin/']);
    expect(pages['https://calcpromaster.com/health/bmr-mifflin/']).toMatchObject({
      clicks: 0, impressions: 749, position: 6.5,
    });
  });

  it('recomputes CTR from clicks/impressions instead of trusting the rounding', () => {
    const pages = rowsToPages([['/x', '1', '388', '0.26%', '22.39']]);
    expect(pages['/x'].ctr).toBe(0.0026);
  });

  it('merges duplicate URL rows rather than dropping the second one', () => {
    const pages = rowsToPages([
      ['/x', '0', '749', '0%', '6.5'],
      ['/x', '0', '359', '0%', '6.2'],
    ]);
    expect(pages['/x'].impressions).toBe(1108);
    expect(pages['/x'].clicks).toBe(0);
  });

  it('reads the window from Chart.csv instead of inventing one', () => {
    const chart = [
      'Date,Clicks,Impressions,CTR,Position',
      '2026-09-24,0,0,,',
      '2026-09-25,0,63,0%,12.7',
      '2026-10-21,0,1,0%,12.8',
    ].join('\n');
    expect(windowFromChart(chart)).toEqual({ startDate: '2026-09-24', endDate: '2026-10-21' });
  });

  it('returns null when there is no Chart.csv to read', () => {
    expect(windowFromChart('')).toBeNull();
    expect(windowFromChart('Date,Clicks\nnope,0\n')).toBeNull();
  });
});
