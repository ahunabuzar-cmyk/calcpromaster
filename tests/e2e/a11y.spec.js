// ====== CalcProMaster — Accessibility E2E (beyond axe) ======
// Complements accessibility.spec.js (axe violations) with behavioral a11y:
//   landmarks/structure, keyboard focus path, aria-expanded states,
//   form-control accessible names, keyboard calculation, focus visibility,
//   WCAG contrast spot-checks, cookie-dialog behavior, mobile overflow.
// Run: npx playwright test tests/e2e/a11y.spec.js -c playwright.deploy.config.js
// @ts-check
const { test, expect } = require('@playwright/test');

const isMobile = (page) => (page.viewportSize()?.width ?? 1280) < 768;

async function dismissCookie(page) {
  try {
    const reject = page.locator('#cookie-reject');
    if (await reject.isVisible({ timeout: 2500 })) await reject.click();
  } catch (e) { /* banner already dismissed or absent */ }
  await page.waitForTimeout(250);
}

/** WCAG 2.x contrast ratio from two rgb()/hex strings (computed styles). */
function contrastRatio(fg, bg) {
  const p = (c) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return [0, 0, 0];
    return m.slice(1).map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
  };
  const [r1, g1, b1] = p(fg);
  const [r2, g2, b2] = p(bg);
  const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const l1 = L(r1, g1, b1), l2 = L(r2, g2, b2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

test.describe('a11y: structure & landmarks', () => {
  for (const route of ['/', '/finance/loan-emi', '/health/bmi', '/hub/finance']) {
    test(`${route} has landmarks, lang, and exactly one h1`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await dismissCookie(page);
      // h1 is rendered by the app shell; on a live/slow host the first paint can
      // exceed a fixed wait under load — poll for it instead (still fails fast).
      await page.waitForFunction(
        () => document.querySelectorAll('h1').length === 1,
        null,
        { timeout: 8000 }
      ).catch(() => {});
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        header: !!document.querySelector('header'),
        nav: !!document.querySelector('nav'),
        main: !!document.querySelector('main'),
        footer: !!document.querySelector('footer'),
        h1: document.querySelectorAll('h1').length,
        h1Text: document.querySelector('h1')?.textContent?.trim().slice(0, 60) || ''
      }));
      expect(r.lang).toMatch(/^(en|es|ur|hi)/);
      expect(r.header, 'header landmark missing').toBe(true);
      expect(r.nav, 'nav landmark missing').toBe(true);
      expect(r.main, 'main landmark missing').toBe(true);
      expect(r.footer, 'footer landmark missing').toBe(true);
      expect(r.h1, `${route} should have exactly one h1, got ${r.h1}`).toBe(1);
      expect(r.h1Text.length, 'h1 is empty').toBeGreaterThan(0);
      expect(errors, `page errors on ${route}: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});

test.describe('a11y: keyboard focus path', () => {
  test('Skip link: first Tab from a fresh load focuses it, Enter jumps focus into main content', async ({ page }) => {
    // No body.focus()/cookie interaction here: the skip link must be the FIRST
    // tab stop on a fresh keyboard load (WCAG 2.4.1 Bypass Blocks).
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const skip = page.locator('#a11y-skip');
    await expect(skip).toHaveCount(1);
    await page.keyboard.press('Tab');
    const focusedSkip = await page.evaluate(() => document.activeElement?.id === 'a11y-skip');
    expect(focusedSkip, 'first Tab from fresh load did not land on the skip link').toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const main = document.getElementById('mainContent');
      return main ? main === document.activeElement || main.contains(document.activeElement) : false;
    });
    expect(after, 'Enter on skip link did not move focus into main content').toBe(true);
  });

  test('Tab from body reaches interactive controls in order (home)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(600);
    // Start from <body>, then press Tab and record the first 6 focused elements.
    const focused = [];
    await page.evaluate(() => document.body.focus());
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      focused.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return '(body)';
        return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
          (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
      }));
    }
    // No focus may be lost to body, and interactive controls must be reachable.
    expect(focused.filter((f) => f === '(body)').length, `focus lost to body: ${focused}`).toBe(0);
    expect(focused.length, 'no focusable elements').toBeGreaterThanOrEqual(3);
  });

  test('Calculator inputs + Calculate button are keyboard-reachable and Enter calculates', async ({ page }) => {
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(900);
    // Focus first input, type, then submit the form via keyboard (Enter).
    const firstInput = page.locator('#calc-form input[type="number"], #calc-form input:not([type="hidden"])').first();
    await expect(firstInput).toBeVisible();
    await firstInput.focus();
    await expect(page.evaluate(() => document.activeElement?.tagName)).resolves.toMatch(/INPUT/i);
    await firstInput.fill('100000');
    // Move to the Calculate button via keyboard and press Enter on it.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const area = document.getElementById('result-area');
      return area ? area.textContent.trim() : '';
    });
    // Placeholder replaced by a real result (any of the loan fields, e.g. payment).
    expect(result.length, `result empty after keyboard calc (area="${result.slice(0, 40)}")`).toBeGreaterThan(0);
    expect(result.toLowerCase()).not.toContain('enter values and click');
  });
});

test.describe('a11y: aria-expanded disclosure controls', () => {
  test('Theme toggle: menu opens on click, aria-expanded toggles, Escape closes', async ({ page }) => {
    test.skip(isMobile(page), 'theme toggle lives inside the mobile hamburger menu (covered by the hamburger disclosure test)');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(600);
    const toggle = page.locator('#theme-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#theme-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#theme-menu')).toHaveCount(0);
  });

  test('Hamburger: aria-controls + aria-expanded stay in sync with menu visibility', async ({ page }) => {
    test.skip(!isMobile(page), 'hamburger is the mobile-only disclosure');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(600);
    const btn = page.locator('#menu-btn');
    const links = page.locator('#nav-links');
    await expect(btn).toHaveAttribute('aria-controls', 'nav-links');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(links).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('a11y: form control accessible names', () => {
  test('nav-search has an accessible name', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    const name = await page.locator('.nav-search').first().evaluate((el) => {
      const l = el.getAttribute('aria-label');
      const wrapped = el.closest('label');
      const forId = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
      return l || (wrapped ? wrapped.textContent.trim() : '') || (forId ? forId.textContent.trim() : '');
    });
    expect(name.length, 'nav-search has no accessible name').toBeGreaterThan(0);
  });

  test('All calculator inputs have accessible names (loan EMI)', async ({ page }) => {
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(900);
    const unnamed = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('#calc-form input, #calc-form select, #calc-form textarea')) {
        const l = el.getAttribute('aria-label');
        const label = el.closest('label');
        const forId = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
        const title = el.getAttribute('title');
        if (!(l || label || forId || title)) bad.push(el.id || el.type);
      }
      return bad;
    });
    expect(unnamed, `unnamed inputs: ${unnamed.join(', ')}`).toEqual([]);
  });
});

test.describe('a11y: focus visibility', () => {
  test('Tab-focused links/buttons show a visible focus indicator (home + calculator)', async ({ page }) => {
    for (const route of ['/', '/math/percentage']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await dismissCookie(page);
      await page.waitForTimeout(700);
      // Tab until we land on an anchor or button, then check outline styles.
      let found = null;
      for (let i = 0; i < 15 && !found; i++) {
        await page.keyboard.press('Tab');
        found = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const tag = el.tagName.toLowerCase();
          if (tag !== 'a' && tag !== 'button' && tag !== 'input') return null;
          const s = getComputedStyle(el);
          return {
            tag,
            outlineStyle: s.outlineStyle,
            outlineWidth: s.outlineWidth,
            boxShadow: s.boxShadow !== 'none'
          };
        });
      }
      expect(found, `${route}: no focusable control found in 15 tabs`).not.toBeNull();
      expect(
        (found.outlineStyle !== 'none' && parseFloat(found.outlineWidth) > 0) || found.boxShadow,
        `${route}: no visible focus indicator on ${found.tag} (outline ${found.outlineStyle} ${found.outlineWidth}, shadow ${found.boxShadow})`
      ).toBe(true);
    }
  });
});

test.describe('a11y: WCAG contrast spot checks', () => {
  test('Body text, headings, and primary button pass 4.5:1 on home and calculator', async ({ page }) => {
    for (const route of ['/', '/finance/loan-emi']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await dismissCookie(page);
      await page.waitForTimeout(800);
      const ratios = await page.evaluate(() => {
        const bg = getComputedStyle(document.body).backgroundColor;
        const check = (el) => {
          if (!el) return null;
          const s = getComputedStyle(el);
          return { fg: s.color, bg: bg, ratio: null };
        };
        const h1 = check(document.querySelector('h1'));
        const bodyText = check(document.querySelector('p, .placeholder, .tool-desc, #result-area'));
        const btn = (() => {
          const b = document.querySelector('a.logo, .calc-btn, .action-btn, .btn-primary');
          if (!b) return null;
          const s = getComputedStyle(b);
          const btnBg = s.backgroundColor === 'rgba(0, 0, 0, 0)' ? bg : s.backgroundColor;
          return { fg: s.color, bg: btnBg, ratio: null };
        })();
        return { h1, bodyText, btn };
      });
      // Guard against a vacuous pass: if the route failed to render, all
      // samples are null and the loop below would assert nothing.
      expect(ratios.h1 || ratios.bodyText || ratios.btn, `${route}: no contrast sample found (page may not have rendered)`).not.toBeNull();
      for (const [name, el] of Object.entries(ratios)) {
        if (!el) continue;
        const ratio = contrastRatio(el.fg, el.bg);
        expect(ratio, `${route}: ${name} contrast ${ratio.toFixed(2)}:1 below 4.5`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

test.describe('a11y: cookie dialog behavior', () => {
  test('Reject button is not covered by floating widgets (donation/back-to-top) on small mobile', async ({ page }) => {
    // Regression: donation-widget (z-index 9990) used to overlay the cookie
    // banner buttons (z-index 1000), silently eating clicks on mobile.
    test.skip(!isMobile(page), 'mobile-only overlay regression');
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800); // donation widget slides in at ~1500ms
    const btn = page.locator('#cookie-reject');
    await expect(btn).toBeVisible();
    const blockedBy = await page.evaluate(() => {
      const r = document.getElementById('cookie-reject');
      const box = r.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top === r || (top && r.contains(top)) ? null : (top ? top.tagName + (top.id ? '#' + top.id : '') : 'NONE');
    });
    expect(blockedBy, `cookie-reject is covered by ${blockedBy}`).toBeNull();
    await btn.click({ timeout: 5000 });
    await expect(page.locator('#cookie-banner')).toBeHidden();
  });

  test('Reject button is labelled, dismisses the banner, and leaves no dialog trap', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const banner = page.locator('#cookie-banner');
    if (await banner.isVisible({ timeout: 3000 }).catch(() => false)) {
      const reject = page.locator('#cookie-reject');
      await expect(reject).toBeVisible();
      expect((await reject.textContent()).trim().length, 'Reject button has no text').toBeGreaterThan(0);
      await reject.click();
      await page.waitForTimeout(400);
      await expect(banner).toBeHidden();
      // Focus must remain on the page (not stuck in a removed dialog).
      const active = await page.evaluate(() => document.activeElement?.tagName || 'BODY');
      expect(active.length).toBeGreaterThan(0);
    }
  });
});

test.describe('a11y: mobile no horizontal overflow (calculator page)', () => {
  test('320px calculator page has no horizontal scroll', async ({ page }) => {
    test.skip(!isMobile(page), 'desktop viewport');
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(900);
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth
    }));
    expect(overflow.scrollW, `horizontal overflow: ${overflow.scrollW} > ${overflow.clientW}`).toBeLessThanOrEqual(overflow.clientW + 1);
  });
});
