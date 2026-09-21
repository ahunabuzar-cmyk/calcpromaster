#!/usr/bin/env node
/**
 * gen-ios-splash.cjs — generate iOS Apple-Touch splash screens (S2 #18).
 *
 * Renders the real site icon (icon.svg) + app name over a background matching
 * the theme-color of each supported theme (light / dark / high-contrast black),
 * at every size Apple devices request for a PWA launched from the home screen.
 *
 * Needs sharp for SVG rasterization:  npm i -D sharp
 * Output: icons/splash/*.png  (committed; iOS has no manifest-splash support)
 *
 * Run:  node scripts/gen-ios-splash.cjs [--force]
 * Test: see tests/unit/ios-splash.test.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'icons', 'splash');
const ICON_SVG = path.join(ROOT, 'icon.svg');

const THEMES = {
  light: '#f8fafc',
  dark: '#0f172a',
  black: '#000000',
};

const SIZES = [
  { w: 640, h: 1136, file: 'apple-touch-startup-image-640x1136.png' },
  { w: 750, h: 1334, file: 'apple-touch-startup-image-750x1334.png' },
  { w: 828, h: 1792, file: 'apple-touch-startup-image-828x1792.png' },
  { w: 1125, h: 2436, file: 'apple-touch-startup-image-1125x2436.png' },
  { w: 1242, h: 2208, file: 'apple-touch-startup-image-1242x2208.png' },
  { w: 1242, h: 2688, file: 'apple-touch-startup-image-1242x2688.png' },
  { w: 1284, h: 2778, file: 'apple-touch-startup-image-1284x2778.png' },
  { w: 1290, h: 2796, file: 'apple-touch-startup-image-1290x2796.png' },
  { w: 1536, h: 2048, file: 'apple-touch-startup-image-1536x2048.png' },
  { w: 1668, h: 2224, file: 'apple-touch-startup-image-1668x2224.png' },
  { w: 1668, h: 2388, file: 'apple-touch-startup-image-1668x2388.png' },
  { w: 2048, h: 2732, file: 'apple-touch-startup-image-2048x2732.png' },
];

// Escaped literal, not template, so the generated SVG keeps exact hex values.
const APP_NAME = 'CalcProMaster';
const ACCENT = '#f59e0b';
const TEXT = '#1e293b';
const SUB = '#64748b';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svgFor(w, h, bg) {
  const s = Math.min(w, h);
  const iconSize = Math.round(s * 0.22);
  const ix = Math.round((w - iconSize) / 2);
  const iy = Math.round(h * 0.38 - iconSize / 2);
  const titleSize = Math.round(s * 0.045);
  const subSize = Math.round(s * 0.024);
  const ty = iy + iconSize + Math.round(titleSize * 2.2);
  const sy = ty + Math.round(titleSize * 1.1);
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>' +
    '<g transform="translate(' + ix + ',' + iy + ')">' +
    '<image href="/icon.svg" x="0" y="0" width="' + iconSize + '" height="' + iconSize + '"/>' +
    '</g>' +
    '<text x="' + w / 2 + '" y="' + ty + '" font-family="-apple-system,system-ui,Segoe UI,Roboto,sans-serif" font-size="' + titleSize + '" font-weight="700" fill="' + TEXT + '" text-anchor="middle">' + esc(APP_NAME) + '</text>' +
    '<text x="' + w / 2 + '" y="' + sy + '" font-family="-apple-system,system-ui,Segoe UI,Roboto,sans-serif" font-size="' + subSize + '" font-weight="400" fill="' + SUB + '" text-anchor="middle">' + esc('1,201+ free online calculators') + '</text>' +
    '<rect x="0" y="' + (h - 6) + '" width="' + w + '" height="6" fill="' + ACCENT + '"/>' +
    '</svg>'
  );
}

async function main() {
  const force = process.argv.includes('--force');
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('sharp is required for splash generation: npm i -D sharp');
    process.exit(2);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const iconSvg = fs.readFileSync(ICON_SVG, 'utf8');

  let made = 0;
  for (const theme of Object.keys(THEMES)) {
    for (const { w, h, file } of SIZES) {
      const out = path.join(OUT_DIR, theme + '-' + file);
      if (!force && fs.existsSync(out)) continue;
      const svg = svgFor(w, h, THEMES[theme]);
      await sharp(Buffer.from(svg), { density: 96 })
        .png({ compressionLevel: 9 })
        .toFile(out);
      made++;
    }
  }
  console.log('splash screens written: ' + made + ' -> icons/splash/');
}

if (require.main === module) main();

module.exports = { THEMES, SIZES, svgFor, OUT_DIR, APP_NAME };
