// ====== CalcPro PWA Installability + Offline Test ======
// Verifies the installability checklist Chromium uses before showing the
// "Install app" prompt: valid manifest with 192+512 icons, start_url, a
// registered + active service worker, and a cached shell that loads offline.
// Run: npx playwright test tests/e2e/pwa-install.spec.js
const { test, expect } = require('@playwright/test');

test.describe('PWA installability', () => {
  test('manifest.json is valid and installable', async ({ request }) => {
    const resp = await request.get('/manifest.json');
    expect(resp.ok()).toBeTruthy();
    const manifest = await resp.json();

    // Installability checklist (Chromium requirements)
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();

    // Icons: at least one 192x192 and one 512x512 PNG that actually loads
    const icons = manifest.icons || [];
    const sizes = icons.map(i => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of icons) {
      if (icon.sizes === '192x192' || icon.sizes === '512x512') {
        const iconResp = await request.get(icon.src);
        expect(iconResp.ok()).toBeTruthy();
        const ct = iconResp.headers()['content-type'] || '';
        expect(ct).toContain('image');
      }
    }
  });

  test('service worker registers and activates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);

    const state = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { available: false };
      const regs = await navigator.serviceWorker.getRegistrations();
      if (!regs.length) return { available: true, registered: false };
      const reg = regs[0];
      return {
        available: true,
        registered: true,
        active: !!reg.active,
        scope: reg.scope,
        controller: !!navigator.serviceWorker.controller
      };
    });

    expect(state.available).toBe(true);
    expect(state.registered).toBe(true);
    expect(state.active).toBe(true);
  });

  test('install prompt prerequisites: SW controls page + start_url is installable', async ({ page }) => {
    // Chromium only shows the "Install app" prompt when ALL of these hold:
    // manifest valid, SW active AND controlling the page, secure context
    // (localhost counts), start_url same-origin and reachable. Headless builds
    // suppress the raw beforeinstallprompt event, so we assert the concrete
    // conditions Chrome itself checks (deterministic — no flaky event capture).
    let promptFired = false;
    await page.addInitScript(() => {
      window.__bip = false;
      window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__bip = true; });
    });
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000); // SW activate + claim

    const state = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      const reg = regs[0];
      let startUrlOk = false;
      try {
        const res = await fetch(new URL((await (await fetch('/manifest.json')).json()).start_url, location.origin), { method: 'GET' });
        startUrlOk = res.ok;
      } catch (e) { /* offline window etc. */ }
      return {
        secure: window.isSecureContext,
        swActive: !!(reg && reg.active),
        swControlling: !!navigator.serviceWorker.controller,
        startUrlOk,
        promptFired: window.__bip === true
      };
    });

    expect(state.secure).toBe(true);
    expect(state.swActive).toBe(true);
    expect(state.swControlling, 'SW must control the page before Chrome offers install').toBe(true);
    expect(state.startUrlOk).toBe(true);
    // In headed Chromium the event does fire — in headless it may be suppressed,
    // so we log it rather than fail the run on it.
    console.log('beforeinstallprompt fired in this browser: ' + state.promptFired);
  });

  test('app shell + a tool page load offline from SW cache', async ({ page, context }) => {
    // Warm the cache: load home + one deep tool link while online
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500); // let the SW activate + cache the shell

    // Load a tool page so its bundle is cached too
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1500);

    // Go offline — the SW must serve everything from cache
    await context.setOffline(true);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const shellOk = await page.evaluate(() => {
      return {
        hasMain: !!document.getElementById('main-content') || !!document.getElementById('mainContent'),
        hasApp: !!document.querySelector('#app'),
        bodyText: (document.body && document.body.innerText || '').slice(0, 60)
      };
    });
    expect(shellOk.hasMain || shellOk.hasApp).toBe(true);
    // The app must actually boot (not a blank/404 page)
    expect(shellOk.bodyText.length).toBeGreaterThan(5);

    await context.setOffline(false);
  });
});
