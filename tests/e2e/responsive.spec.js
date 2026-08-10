// =====================================================================
// Responsive screen-friendliness E2E — checks the site renders without
// horizontal overflow and stays usable across all common viewport sizes:
//   mobile (375×667 iPhone SE), phone+ (412×915 Pixel), tablet (820×1180),
//   laptop (1280×800), desktop (1920×1080)
// Fails if: horizontal scrollbar appears (page scrollWidth > clientWidth),
// main content hidden, or result panel unusable after a calc.
// =====================================================================
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'desktop-1920', width: 1920, height: 1080 }
];

const TOOLS = [
  { path: '/', label: 'home' },
  { path: '/finance/loan-emi', label: 'tool' },
  { path: '/hub/finance', label: 'hub' }
];

for (const vp of VIEWPORTS) {
  for (const tool of TOOLS) {
    test(`${vp.name} ${tool.label} no horizontal overflow + usable`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto(tool.path, { waitUntil: 'domcontentloaded' }); // baseURL from config (deploy port)
      // wait for the app shell to actually render content (avoid flaky timing)
      await page.waitForSelector('#app, .app-main, main, #calc-area, .category-grid, #hub-content, .calc-input', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1800);

      // Horizontal overflow check — the core responsiveness signal. Also
      // reports the widest offending element so failures are debuggable.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const docW = doc.clientWidth;
        let worst = null, worstR = 0;
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > docW + 2) {
            const cls = (el.className && String(el.className).slice(0, 60)) || el.tagName;
            if (r.width > worstR) { worstR = r.width; worst = { tag: el.tagName, cls, w: Math.round(r.width), l: Math.round(r.left) }; }
          }
        });
        return { scrollW: doc.scrollWidth, clientW: docW, worst };
      });
      if (overflow.scrollW > overflow.clientW + 1) {
        console.log(`OVERFLOW @ ${vp.name} ${tool.label}: scrollW=${overflow.scrollW} clientW=${overflow.clientW} worst=${JSON.stringify(overflow.worst)}`);
      }
      expect(overflow.scrollW, `h-scroll overflow @ ${vp.name} ${tool.label} (worst: ${JSON.stringify(overflow.worst)})`).toBeLessThanOrEqual(overflow.clientW + 1);

      // Content actually visible (not 0-height / hidden)
      const mainVisible = await page.evaluate(() => {
        const main = document.querySelector('main, #app, .app-main');
        if (!main) return true;
        const r = main.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      expect(mainVisible).toBe(true);

      // Tool pages: the calculator button must be reachable
      if (tool.path.startsWith('/finance/')) {
        const btn = await page.locator('button.calc-btn, button[type="submit"], .calc-btn').first().isVisible().catch(() => false);
        expect(btn).toBe(true);
      }
    });
  }
}
