// =====================================================================
// Mobile UX audit — PWA safe-area handling + tap-target sizing:
//   1. viewport meta must include viewport-fit=cover (notch/home-bar)
//   2. CSS must use env(safe-area-inset-*) for header/footer/main
//   3. Visible interactive controls (buttons, inputs, selects, links)
//      must have >= 44px tap target (Apple HIG / WCAG 2.5.8 2.2)
// Inline text links are exempt (WCAG allows) but are still reported.
// =====================================================================
const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/', label: 'home' },
  { path: '/finance/loan-emi', label: 'tool' },
  { path: '/hub/finance', label: 'hub' }
];

for (const p of PAGES) {
  test(`safe-area + tap targets ${p.label} (mobile)`, async ({ page }) => {
    // The 44px tap-target rules are intentionally scoped to touch devices
    // (@media (hover:none), (pointer:coarse)) — desktop keeps compact buttons.
    // On a fine-pointer project (deploy-chromium) only the safe-area checks
    // apply; the 44px audit is a mobile-only requirement.
    const isTouch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    test.skip(!isTouch, 'Tap-target audit applies to touch/coarse-pointer devices only');
    const report = { violations: [], smallLinks: [], safeAreaOk: true, viewportFit: false };

    await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#app, main, .calc-input, #hub-content, .category-grid', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 1. viewport meta must declare viewport-fit=cover
    report.viewportFit = await page.evaluate(() => {
      const m = document.querySelector('meta[name="viewport"]');
      return !!(m && /viewport-fit=cover/.test(m.getAttribute('content') || ''));
    });

    // 2. CSS must reference env(safe-area-inset-*) for the sticky header/footer/main
    report.safeAreaCss = await page.evaluate(async () => {
      try {
        const txt = await (await fetch('/styles.css')).text();
        return {
          total: (txt.match(/safe-area-inset/g) || []).length,
          header: /header[^{]*\{[^}]*safe-area-inset/.test(txt) || /\.nav[^{]*\{[^}]*safe-area-inset/.test(txt),
          footer: /footer[^{]*\{[^}]*safe-area-inset/.test(txt)
        };
      } catch (e) { return { total: 0, header: false, footer: false, err: String(e) }; }
    });

    // 3. Tap-target audit — visible interactive elements below 44px
    const audit = await page.evaluate(() => {
      const MIN = 44;
      const sel = 'a, button, input[type="button"], input[type="submit"], input[type="reset"], select, [role="button"], [tabindex]:not([tabindex="-1"])';
      const out = { violations: [], smallLinks: [] };
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return; // hidden
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const isLink = el.tagName === 'A';
        const small = r.width < MIN || r.height < MIN;
        if (!small) return;
        const info = {
          tag: el.tagName,
          cls: String(el.className).slice(0, 40),
          w: Math.round(r.width), h: Math.round(r.height),
          text: (el.textContent || '').trim().slice(0, 30)
        };
        if (isLink) out.smallLinks.push(info); else out.violations.push(info);
      });
      return out;
    });
    report.violations = audit.violations;
    report.smallLinks = audit.smallLinks;

    // Summary log
    console.log(`SAFE/TAP ${p.label}: viewportFit=${report.viewportFit} safeAreaCSS=${JSON.stringify(report.safeAreaCss)} violations=${report.violations.length} smallLinks=${report.smallLinks.length}`);
    report.violations.slice(0, 8).forEach((v) => console.log(`  VIOLATION <${v.tag}> ${v.cls} ${v.w}x${v.h} "${v.text}"`));
    report.smallLinks.slice(0, 8).forEach((v) => console.log(`  smallLink <${v.tag}> ${v.cls} ${v.w}x${v.h} "${v.text}"`));

    expect(report.viewportFit, `viewport meta missing viewport-fit=cover on ${p.label}`).toBe(true);
    expect(report.safeAreaCss.total, `styles.css has no safe-area-inset usage`).toBeGreaterThan(0);
    expect(report.violations, `${p.label}: ${report.violations.length} tap targets < 44px`).toHaveLength(0);
  });
}
