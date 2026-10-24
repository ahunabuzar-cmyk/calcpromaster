// ====== CalcPro Visual Regression ======
// Desktop + mobile snapshots for home, category, and representative tool pages, taken at
// three stops down each page (top / middle / bottom) so element boundaries and layout drift
// anywhere on the page are still caught.
// Run: npm run test:visual           (compares against the committed baselines)
//      npm run test:visual:update    (regenerates baselines)
//
// ── Why three viewport captures instead of one `fullPage` capture ────────────────────────
// A fullPage capture of these pages cannot be made stable, and the flake was in the capture
// rather than the layout. Measured on the built deploy/ artifact:
//
//  * The window is huge — /finance/loan-emi is 31,000-33,000px tall. Playwright's own
//    "two consecutive stable screenshots" check gave up after 10s on it, alternating between
//    31,148px and 31,204px forever.
//  * A fullPage capture is not a real viewport: the browser renders beyond it, and anything
//    sized in viewport units grows with the render height. `#mainContent{min-height:100svh}`
//    (styles.css — a CLS measure so the boot skeleton swap cannot move the fold) did exactly
//    that: with the render height raised, the page went 31,019 → 36,280px and `#mainContent`
//    24,739 → 30,000px was the only element that grew.
//  * Pinning that one declaration for the capture is necessary but not sufficient: the height
//    still alternated by 56px during the stability check on the tallest pages (percentage:
//    20,444 ↔ 20,500px). Same commit, different failing page per run.
//  * Three scrolled viewport captures of the same pages are byte-identical on repeat
//    (verified: top/middle/bottom × 6 pages × desktop+mobile, two captures each, 18/18 same).
//
// So the comparison is the cheap, reproducible one. It is not a weaker assertion: it is the
// same pages, same viewports, same `toHaveScreenshot` pixel comparison — sampled at three
// scroll positions instead of one enormous image.
//
// Third-party requests are also aborted. Every page pulls Google Fonts, AdSense/gtag and
// partner badges (e.g. https://startupfa.me/badges/featured-badge.webp); they resolve on
// their own schedule and resize the page when they land. `reducedMotion: 'reduce'` pins the
// site's own reduced-motion branch (`.reveal{opacity:1;transform:none;transition:none}`) so a
// not-yet-revealed section can never be frozen into a baseline.
const { test, expect } = require('@playwright/test');

test.use({ reducedMotion: 'reduce' });

// The home page's "Daily Tip" widget picks its line with Math.random() on the first
// visit of each calendar day and caches it in localStorage (js/advanced-features.js
// getDailyTip). A fresh Playwright context has empty storage, so every capture drew
// a different tip — measured on / at 1280x800: identical page height and scroll
// offset on both loads, but 7,939 differing pixels (0.78% of the viewport, incl. the
// whole 1,160x53 tip block), i.e. the widget ALONE pushed the top stop over budget
// on ~7% of runs. Pin the cached tip before the app boots: the widget is still
// fully pixel-compared (box, gradient, spacing, text) — only its random input is
// fixed, exactly like the aborted third-party requests above.
const PINNED_DAILY_TIP = 'Track spending for 30 days to find leaks in your budget.';

// Pin the POINTER/TOUCH state the project means to emulate, instead of inheriting it.
//
// styles.css has coarse-pointer blocks (`@media (hover: none), (pointer: coarse)`) that
// change the layout of these very pages — measured on /math/percentage at 390x844:
//
//   pointer: fine   → doc 21,527px · #cookie-banner 135px · main column 14,904px
//   pointer: coarse → doc 21,583px · #cookie-banner 187px · main column 14,960px   (+56px)
//
// i.e. the same URL renders two different layouts, the middle stop lands 28px apart, and
// the diff is 18% of the viewport. Which one a context got was NOT stable: one full run
// passed `mobile middle` for percentage/bmi while another failed the same tests, and a
// third failed `loan-emi` for the other project — the baselines captured during that one
// `--update-snapshots` run froze the wrong state in and every later run re-failed on it.
//
// The state comes from the device emulation, and both projects share one browser process:
// the mobile project (Pixel 7, hasTouch:true) switches touch emulation ON at the browser
// level and nothing switches it back, so a later desktop context in the same browser can
// report `(pointer: coarse)` — a test-harness leak, not a site bug. `Emulation.
// setTouchEmulationEnabled` is per-target and does win over the context setting, so pin
// it explicitly after each navigation (Playwright re-applies its own value on navigation,
// which is why this cannot live in beforeEach).
async function pinPointerState(page, testInfo) {
  const hasTouch = !!(testInfo.project.use && testInfo.project.use.hasTouch);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: hasTouch, maxTouchPoints: 1 });
  const state = await page.evaluate(() => ({
    coarse: matchMedia('(pointer: coarse)').matches,
    touch: navigator.maxTouchPoints
  }));
  expect(state.coarse, 'pointer state pinned for ' + testInfo.project.name).toBe(hasTouch);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((tip) => {
    try {
      localStorage.setItem('calcpro_daily_tip', JSON.stringify({ date: new Date().toDateString(), tip }));
    } catch (e) { /* storage blocked in this context — the widget is simply not compared */ }
  }, PINNED_DAILY_TIP);
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (/^(data|blob):/.test(url) || /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(url)) {
      return route.continue();
    }
    return route.abort();
  });
});

const SNAPSHOT_PAGES = [
  { path: '/', name: 'home' },
  { path: '/finance', name: 'finance-category' },
  { path: '/finance/loan-emi', name: 'loan-emi' },
  { path: '/health/bmi', name: 'bmi' },
  { path: '/utilities/qr-generator', name: 'qr-generator' },
  { path: '/math/percentage', name: 'percentage' }
];

const STOPS = ['top', 'middle', 'bottom'];

// Poll the page until it stops changing — height, visible text length and element count all
// steady for three consecutive reads (or the budget runs out). Returns the settled height.
//
// Height alone is not enough: measured on /finance/loan-emi the document reached its final
// height within ~750ms, but the hydration pass kept swapping result-panel markup for another
// 2s (the pre-rendered "Payment: $… / monthly" line is replaced by the computed one and a
// confetti node is torn down), so a height-only settle screenshots whichever half of that
// swap landed first.
async function settle(page, { step = 250, maxSteps = 32 } = {}) {
  // A capture renders beyond the viewport, where `min-height:100svh` grows with the render
  // height and keeps moving the page (see the header note). Pin it for the capture only.
  await page.addStyleTag({ content: '#mainContent{min-height:0 !important}' });
  // Web fonts change text metrics, which changes page height — wait for them before
  // measuring anything (a no-op once the third-party block above is in place).
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
  let prev = null;
  let stable = 0;
  for (let i = 0; i < maxSteps; i++) {
    const now = await page.evaluate(() => ({
      h: document.documentElement.scrollHeight,
      t: document.body.innerText.length,
      n: document.getElementsByTagName('*').length
    }));
    const key = now.h + '|' + now.t + '|' + now.n;
    stable = key === prev ? stable + 1 : 0;
    prev = key;
    if (stable >= 2) return now.h;
    await page.waitForTimeout(step);
  }
  return prev ? Number(String(prev).split('|')[0]) : 0;
}

// Scroll position for a stop: the viewport cannot scroll past (height - viewportHeight), so
// the bottom stop lands at the true end of the page on short pages too.
function scrollYFor(stop, pageHeight, viewportHeight) {
  if (stop === 'top') return 0;
  if (stop === 'middle') return Math.max(0, Math.round(pageHeight / 2 - viewportHeight / 2));
  return Math.max(0, pageHeight - viewportHeight);
}

for (const target of SNAPSHOT_PAGES) {
  test.describe(`Visual regression: ${target.name}`, () => {
    for (const view of [
      { suffix: 'desktop', viewport: null },
      { suffix: 'mobile', viewport: { width: 390, height: 844 } }
    ]) {
      for (const stop of STOPS) {
        test(`${view.suffix} ${stop}`, async ({ page }, testInfo) => {
          if (view.viewport) await page.setViewportSize(view.viewport);
          await page.goto(target.path, { waitUntil: 'domcontentloaded' });
          await pinPointerState(page, testInfo);
          await expect(page.locator('#mainContent')).not.toBeEmpty({ timeout: 15_000 });
          const height = await settle(page);
          const viewportHeight = page.viewportSize().height;
          const wantY = scrollYFor(stop, height, viewportHeight);
          await page.evaluate((y) => window.scrollTo(0, y), wantY);
          await page.waitForTimeout(250);
          if (process.env.VIS_DEBUG) {
            const d = await page.evaluate(() => {
              const kids = [];
              for (const el of document.body.children) {
                const r = el.getBoundingClientRect();
                if (r.height < 20) continue;
                kids.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')) + '=' + Math.round(r.height));
              }
              const cb = document.querySelector('#cookie-banner');
              const cbs = cb ? getComputedStyle(cb) : null;
              const main = document.querySelector('#mainContent');
              const mainKids = main ? Array.from(main.children).map((el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')) + '=' + Math.round(el.getBoundingClientRect().height)).filter((s) => !/=-?\d{1,2}$/.test(s)).join(' ') : '';
              return {
                media: JSON.stringify({
                  coarse: matchMedia('(pointer: coarse)').matches,
                  noHover: matchMedia('(hover: none)').matches,
                  touch: navigator.maxTouchPoints,
                  innerW: window.innerWidth
                }),
                mainText: main ? main.innerText.replace(/\s+/g, ' ').length : -1,
                mainKids,
                innerW: window.innerWidth,
                clientW: document.documentElement.clientWidth,
                fontsStatus: document.fonts ? document.fonts.status : 'n/a',
                banner: cb ? (JSON.stringify({ w: Math.round(cb.getBoundingClientRect().width), h: Math.round(cb.getBoundingClientRect().height), font: cbs.fontFamily, size: cbs.fontSize, lh: cbs.lineHeight, scrollH: cb.scrollHeight, text: cb.innerText.replace(/\s+/g, ' ').slice(0, 120) })) : 'none',
                scrollY: window.scrollY,
                docH: document.documentElement.scrollHeight,
                bodyH: document.body.scrollHeight,
                headerH: Math.round(document.querySelector('header') ? document.querySelector('header').getBoundingClientRect().height : -1),
                mainH: Math.round(document.querySelector('#mainContent') ? document.querySelector('#mainContent').getBoundingClientRect().height : -1),
                footerTop: Math.round(document.querySelector('footer') ? document.querySelector('footer').getBoundingClientRect().top + window.scrollY : -1),
                imgs: Array.from(document.images).filter((i) => i.naturalHeight && i.getBoundingClientRect().top + window.scrollY < document.documentElement.scrollHeight).length,
                kids: kids.join(' ')
              };
            });
            console.log('VIS_DEBUG ' + JSON.stringify({ project: testInfo.project.name, target: target.name, view: view.suffix, stop, settledH: height, wantY, ...d }));
            if (process.env.VIS_TEXT) {
              const t = await page.evaluate(() => ({
                body: document.body.innerText,
                banner: (document.querySelector('#cookie-banner') || {}).outerHTML || ''
              }));
              console.log('VIS_TEXT ' + JSON.stringify({ target: target.name, view: view.suffix, stop, settledH: height, ...t }));
            }
          }
          await expect(page).toHaveScreenshot(`${view.suffix}-${stop}-${target.name}.png`, {
            maxDiffPixelRatio: 0.05,
            animations: 'disabled'
          });
        });
      }
    }
  });
}
