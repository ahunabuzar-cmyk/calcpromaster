import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// S2 #18 — iOS PWA splash screens: generator metadata, rendered SVG shape,
// and that every splash <link> in index.html points to a real, non-empty PNG.
import { THEMES, SIZES, svgFor, APP_NAME } from '../../scripts/gen-ios-splash.cjs';

describe('gen-ios-splash (S2 #18)', () => {
  it('defines 12 Apple device sizes x 3 theme variants', () => {
    expect(SIZES).toHaveLength(12);
    expect(Object.keys(THEMES).sort()).toEqual(['black', 'dark', 'light']);
  });

  it('renders SVG with correct canvas, background, icon and app name', () => {
    const svg = svgFor(640, 1136, '#f8fafc');
    expect(svg).toContain('width="640"');
    expect(svg).toContain('height="1136"');
    expect(svg).toContain('fill="#f8fafc"');
    expect(svg).toContain('href="/icon.svg"');
    expect(svg).toContain(APP_NAME);
  });

  it('escapes special characters in SVG text', () => {
    const svg = svgFor(100, 100, '#000000');
    expect(svg).not.toMatch(/&(?!amp;|lt;|gt;)/);
  });

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/href="(icons\/splash\/[^"]+)"/g)].map((m) => m[1]);

  it('index.html links exactly 12 light + 12 dark splash screens', () => {
    expect(refs.filter((r) => r.includes('light-'))).toHaveLength(12);
    expect(refs.filter((r) => r.includes('dark-'))).toHaveLength(12);
    expect(refs.filter((r) => r.includes('black-'))).toHaveLength(0);
  });

  it('light and dark links use prefers-color-scheme media', () => {
    const linkRe = /<link rel="apple-touch-startup-image" media="([^"]+)" href="([^"]+)"/g;
    let m;
    let light = 0;
    let dark = 0;
    while ((m = linkRe.exec(html)) !== null) {
      if (m[2].includes('light-')) {
        expect(m[1]).toContain('prefers-color-scheme: light');
        light++;
      } else if (m[2].includes('dark-')) {
        expect(m[1]).toContain('prefers-color-scheme: dark');
        dark++;
      }
    }
    expect(light).toBe(12);
    expect(dark).toBe(12);
  });

  it('every referenced splash file exists on disk as a real PNG', () => {
    expect(refs.length).toBeGreaterThan(0);
    for (const rel of refs) {
      const p = join(ROOT, rel);
      expect(existsSync(p), rel).toBe(true);
      expect(statSync(p).size, rel).toBeGreaterThan(1000);
      const magic = readFileSync(p).subarray(0, 4);
      expect(magic[0]).toBe(0x89);
      expect(magic[1]).toBe(0x50); // 'P'
      expect(magic[2]).toBe(0x4e); // 'N'
      expect(magic[3]).toBe(0x47); // 'G'
    }
  });

  it('ship list: build-deploy copies icons/ so splashes reach production', () => {
    const bd = readFileSync(join(ROOT, 'build-deploy.js'), 'utf8');
    expect(bd).toMatch(/'embed',\s*'icons'\]/);
  });
});
