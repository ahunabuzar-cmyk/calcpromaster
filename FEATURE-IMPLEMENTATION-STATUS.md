# FEATURE-IMPLEMENTATION-STATUS.md — CalcProMaster feature backlog (91 items)

Tracking file for the full advanced backlog: Section 0 Smart Search (#0, also counted as #91) +
Sections 1–7 (features 1–50) + Sections 8–12 (features 51–90).
Rules: nothing silently skipped. Every "Done" has a passing test attached. Partials explain
their limitation. No deploy until the site owner says so.

**Status legend:** Done · Partial · Blocked · (existing = already shipped, re-verified this pass by grep/build/runtime)

**Second-pass re-check (Sept 2026):** every Done row below was re-verified AFTER all other
features landed — via module/wiring greps, the full unit suite, deploy-build quality gates,
and runtime smoke. `Re-Checked` column: **Pass** = re-verified this pass. Items needing a
real device/browser (or a live deploy) are marked and listed in the regression checklist.

**Verified state (Sept 2026):** unit tests **1809/1809** (31 files) · all-tools smoke 1206/1206 · count audit ✓ (1206) · drift check ✓ · cluster links 64/64 · deploy:build quality gate **0 failures** · performance budgets **PASS** · deploy-smoke 58 passed / 2 skipped (live-CDN checks valid post-deploy)

**FINAL TALLY: 82 Done · 7 Partial · 2 Blocked** (of 91)

| # | Feature | Status | Advanced/Basic | Test Written | Test Result | Re-Checked | Checked On | Notes |
|---|---------|--------|----------------|--------------|-------------|------------|------------|-------|
| 0/91 | Smart Search (fuzzy + synonyms + NL + dropdown + keyboard nav + mobile overlay) | Done | Advanced | Y | Pass 43/43 | Pass | Unit (Node) + runtime smoke | Shared engine js/smart-search.js + committed catalog js/tool-catalog.js (registry-derived). ONE core wired into all 4 surfaces in app.js: home/404 dropdown (keyboard nav), nav search, ?q= SearchAction resolver, Ctrl+K palette. Lazy-loaded (first keystroke / idle 2.5s) — zero boot-path cost. tests/unit/smart-search.test.js: integrity (every intent/synonym id exists in registry) + 37 real queries incl. typos + NL across all 20 categories |
| 1 | Voice input (Web Speech API + graceful fallback) | Done | Advanced | Y | Pass 33/33 | Pass | Unit + manual mic pending | Watchdog, permission pre-check, word-number parser ("seventy five" → 75.5), iOS honest message. tests/unit/voice-input.test.js. Live-mic check needs real hardware |
| 2 | Camera/OCR scan → auto-fill | Done | Advanced | Y | Pass 17/17 | Pass | Unit + manual camera pending | 📷 Scan photo button wired into paste-parse row; Tesseract.js (~2MB) lazy-loads from CDN only on first use (that click IS consent; image never uploaded). Unit tests: extraction pipeline + export surface. Live-camera verify is manual post-deploy (headless has no camera) |
| 3 | Smart autocomplete (typical values) | Done | Advanced | Y | Pass | Pass | Unit + smoke | TYPICAL map + attachTypicalValues datalists wired in SmartInput.enhance(); integrity covered in tests/unit/smart-input.test.js |
| 4 | Paste-and-parse unstructured text | Done | Advanced | Y | Pass | Pass | Unit + smoke | 📋 Paste bill/text → extractNumbers → mapExtractedToInputs → fills numeric fields with review note. tests/unit/smart-input.test.js |
| 5 | Undo/Redo on inputs | Done | Advanced | Y | Pass 8/8 | Pass | Unit + smoke | js/undo-redo.js wired in app.js (Ctrl+Z/Y + buttons); onRestore hook re-applies values. tests/unit/undo-redo.test.js |
| 6 | Quick-fill presets | Done | Advanced | Y | Pass | Pass | Unit + smoke | Category presets render only fields matching the tool; applyPreset dispatches input events. Presets integrity tests pass |
| 7 | Slider + typed input sync everywhere | Done (existing) | Advanced | Y | Pass | Pass | Unit + e2e | inp.slider renders range+number pairs, syncSlider keeps both in sync (app.js). tests/e2e/mobile-sliders.spec.js |
| 8 | Real-time unit auto-suggest ("5 kg") | Done | Advanced | Y | Pass 17/17 | Pass | Unit | parseUnitValue converts kg/lb/m/ft etc. into the field's expected unit + aria-live note. tests/unit/smart-input.test.js |
| 9 | Animated result reveal (count-up) | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | animateResultNumber on .result-main (app.js), reduced-motion-safe (animation durations zeroed) |
| 10 | Visual result cards | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | .result-card wrapper with icon/color treatment (app.js) |
| 11 | Interactive what-if chart (draggable scenario) | Done | Advanced | Y | Pass 14/14 | Pass | Unit + runtime | balance-over-time line chart on loan/savings/investment tools, updates live with slider drag; SVG chart fn unit-tested. tests/unit/visual-polish.test.js |
| 12 | Celebration micro-animation (milestones) | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | confetti-lite showSuccessAnimation on success results; disabled under prefers-reduced-motion + manual override (#46) |
| 13 | Custom accent color picker | Done | Advanced | Y | Pass | Pass | Unit + smoke | ACCENT_PALETTES, saved per user, applied via CSS vars without breaking dark mode; picker in Display Preferences. tests/unit/visual-polish.test.js |
| 14 | Depth/micro-interaction effects | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | ripple.js + initTiltEffect + hover/press states site-wide |
| 15 | Circular progress/gauge for % results | Done | Advanced | Y | Pass 14/14 | Pass | Unit | SVG gauge(pct) in visual-polish; unit-tested (Node + browser paths) |
| 16 | Side-by-side comparison bars (Compare tool) | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | Scenario compare renders visual chart + table (advanced-features buildScenarioComparison) |
| 17 | First-visit onboarding tour | Done | Advanced | Y | Pass | Pass | Unit + runtime | TOUR_STEPS + startTour fires once (localStorage flag) via VisualPolish.init; reduceMotion-aware |
| 18 | Custom PWA app icon + splash | Done | Advanced | Y | Pass 24/24 | Pass | Unit + e2e install | iOS apple-touch-startup-image splash NOW GENERATED: 12 sizes × light/dark = 24 links (prefers-color-scheme media per family), all files exist. Manifest icons + install flow: tests/e2e/pwa-install.spec.js. tests/unit/ios-splash.test.js |
| 19 | Plain-language result explanation panel | Partial | Basic→Advanced hybrid | Y | Pass | Pass | Unit | ConfidenceNotes (confidence level, accuracy band, assumptions per tool) auto-attaches under results. LIMITATION: coverage limited to tools in ACCURACY_DATA — bespoke "why is my EMI high" prose for all 1206 tools remains template-bound; needs per-domain rules follow-up |
| 20 | "You might also need" recommendations | Done (existing) | Advanced | Y | Pass | Pass | Unit + cluster gate | renderSuggestions + related-grid + cluster links; cluster:check 64/64 |
| 21 | Auto-detect country/currency defaults | Done | Advanced | Y | Pass | Pass | Unit | SmartAssist.detectCurrency maps navigator.language region → currency (PK→PKR, IN→INR, …); wired into currency-converter From-select. No IP lookup, no network. tests/unit/smart-assist.test.js |
| 22 | Contextual field tooltips | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | GlossaryTooltips (hover/tap) initialized in app.js |
| 23 | Inline validation warnings (implausible inputs) | Done | Advanced | Y | Pass | Pass | Unit | RULES engine (rate>30% "double check?" style) — non-blocking warnings. tests/unit/smart-assist.test.js |
| 24 | NL search-to-calculator routing | Done | Advanced | Y | Pass 43/43 | Pass | Unit | Same shared engine as #0 ("calculate EMI for my car loan" → auto/car-loan-emi). One system, not two |
| 25 | Opt-in smart reminders | Done | Advanced | Y | Pass | Pass | Unit | setReminder/checkDueReminders via Notification API, strictly opt-in, no dark patterns. tests/unit/smart-assist.test.js |
| 26 | Auto-save draft inputs per calculator | Done | Advanced | Y | Pass | Pass | Unit | cpm_draft_<toolId> namespace separate from history; restore bar. tests/unit/smart-assist.test.js |
| 27 | WhatsApp share + Story image export | Done | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | wa.me deep link in share modal + exportStoryImage (9:16 story format) wired into App.shareTool |
| 28 | Branded shareable result PNG | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | exportResultAsImage (canvas, branding + URL) |
| 29 | QR code for result link | Done (existing) | Advanced | Y | Pass | Pass | Unit + smoke | js/qrcode.js in share modal (App.shareTool); drift-check synchronized |
| 30 | Real-time collaborative calculation | Partial | Basic (sanctioned fallback) | Y | Pass (fallback) | Pass | Unit | True realtime sync needs a backend — not feasible on static host. Prompt-sanctioned fallback shipped: shareable pre-filled link (generateShareLink + share modal) so a second person opens the same calculation with values |
| 31 | Embeddable widget/iframe generator | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Cluster gate + smoke | /embed landing + 4 widgets with attribution link (cluster checker covers slugs) |
| 32 | Public aggregate usage stats per calculator | Blocked | — | N | — | — | — | No backend = no real counts. Fabricating "12,000 people used this" would violate the no-fabrication rule, so nothing was faked. Revisit when an analytics backend exists. NEEDS OWNER DECISION |
| 33 | Referral sharing + achievement badge | Done | Advanced | Y | Pass | Pass | Unit | trackShare() + referral-1/referral-5 badges wired into App.shareTool. Dedicated unit tests NOW EXIST: tests/unit/referral-badges.test.js (share-count storage + unlock thresholds) |
| 34 | "Copy as formatted text" (WhatsApp-ready) | Done | Advanced | Y | Pass 4/4 | Pass | Unit | buildFormattedResult: emoji + line breaks + result + link, copied to clipboard from share modal ("🧾 Formatted text"). tests/unit/formatted-result.test.js |
| 35 | Keyboard shortcut cheat-sheet (?) | Done | Advanced | Y | Pass 10/10 | Pass | Unit | PowerTools.renderShortcuts overlay on "?" key. tests/unit/power-tools.test.js |
| 36 | Multi-tab calculation view (3 scenarios) | Partial | Basic | N | — | — | — | Existing compare tool already pins/compares multiple scenarios of a tool with visual chart. A dedicated same-screen triple-view of the same calculator was not built — overlaps with compare; NEEDS UX DECISION |
| 37 | Batch export of saved calculations | Done (existing) | Advanced | Y | Pass | Pass | Smoke | Batch selection + CSV export + PDF print report verified in code and smoke |
| 38 | Recurring calculation reminders | Done | Advanced | Y | Pass | Pass | Unit | Same reminder engine: monthly/weekly nextDue (month-end clamping tested) + checkDueReminders on boot |
| 39 | Floating mini-calculator | Done | Advanced | Y | Pass 10/10 | Pass | Unit | PowerTools.initMiniCalc — persistent while scrolling guides/blog. tests/unit/power-tools.test.js |
| 40 | Command palette (Ctrl/Cmd+K) | Done (existing) | Advanced | Y | Pass 43/43 | Pass | Unit | js/command-palette.js upgraded to shared SmartSearch engine |
| 41 | Bookmarklet (select number → calculator) | Done | Advanced | Y | Pass 10/10 | Pass | Unit | Bookmarklet generator (correctly scoped eval — bug found & fixed by tests). tests/unit/power-tools.test.js |
| 42 | Public API playground page | Blocked | — | N | — | — | — | No server API exists (fully client-side engine), so there is nothing to "play against". Building a fake playground would mislead developers. NEEDS OWNER DECISION: in-browser engine sandbox page or drop this item |
| 43 | Text-to-speech result readout | Done | Advanced | Y | Pass 15/15 | Pass | Unit | Comfort.speakResult (user-initiated 🔊 button on result — no auto-speak), Web Speech Synthesis. tests/unit/comfort.test.js |
| 44 | In-app font-size adjuster | Done | Advanced | Y | Pass 15/15 | Pass | Unit | 5-step font scale on <html>, persisted, independent of browser zoom; in Display Preferences. tests/unit/comfort.test.js |
| 45 | Colorblind-friendly palette mode | Done | Advanced | Y | Pass 15/15 | Pass | Unit | protanopia/deuteranopia (Okabe-Ito blue/orange) + tritanopia (purple/teal) palettes; data-cb attribute + full CSS var override. tests/unit/comfort.test.js. Simulation check manual post-deploy |
| 46 | Reduced-motion mode (respect + override) | Done | Advanced | Y | Pass 15/15 | Pass | Unit | prefers-reduced-motion respected by default; manual on/off override (data-reduced-motion) + matching CSS. tests/unit/comfort.test.js |
| 47 | Visible language toggle (Urdu/English) | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | i18n-ui toggle visible on every page, RTL support |
| 48 | Daily-use streak tracker | Done (existing) | Advanced | Y | Pass | Pass | Unit | streak-3/7/30 achievements from visit analytics (calcpro_achievements) |
| 49 | "Did you know" contextual fun-fact panel | Done | Advanced | Y | Pass 13/13 | Pass | Unit | Facts dataset per category/tool (definitional + math facts, zero fabricated statistics); renderFactPanel on result. tests/unit/engagement.test.js |
| 50 | Seasonal/contextual homepage promotion | Done | Advanced | Y | Pass 13/13 | Pass | Unit | Date-window config (Ramadan zakat, tax season, winter energy) — no year hardcoding; banner wired on homepage. Overlap-priority tested. tests/unit/engagement.test.js |
| 51 | Distraction-free reading mode (guides/blog) | Done | Advanced | Y | Pass | Pass | Unit + runtime | reading-ui zen mode: hides sidebar/nav/ads, content-only column, toggle button, state persisted. Wired via reading.js exports + reading-ui.js DOM. tests/unit/reading.test.js |
| 52 | Sticky Table of Contents (guides) | Done | Advanced | Y | Pass | Pass | Unit + runtime | reading.js buildToc + scroll-spy active-section highlight; sticky sidebar on long guide pages. tests/unit/reading.test.js |
| 53 | Reading-progress bar | Done | Advanced | Y | Pass | Pass | Unit + runtime | Thin top progress bar on guide/blog pages, rAF-throttled scroll handler. tests/unit/reading.test.js |
| 54 | Line-height/letter-spacing adjuster | Done | Advanced | Y | Pass | Pass | Unit | 3-step spacing control on <html>, persisted per user, in reading toolbar. tests/unit/reading.test.js |
| 55 | Dyslexia-friendly font toggle | Done | Advanced | Y | Pass | Pass | Unit | OpenDyslexic (self-hosted subset, lazy) + letter-spacing boost, site-wide, persisted. tests/unit/reading.test.js |
| 56 | Collapsible/expandable content sections | Done | Advanced | Y | Pass | Pass | Unit + wiring test | reading.js makeCollapsible (tested lib) + reading-ui auto-wraps FAQ/formula/tips sections as native <details> — SEO-safe (content in DOM, crawlable). tests/unit/reading.test.js + tests/unit/reading-ui-wiring.test.js |
| 57 | Tab-based content organization (SEO-safe) | Done | Advanced | Y | Pass | Pass | Unit + wiring test | reading.js makeTabs (accessible tablist/arrow-keys, tested lib) + reading-ui "Tabs" toggle reorganizes section cards; default stays long-scroll; tabs keep all content in DOM (no display:none of crawled content). tests/unit/reading.test.js + reading-ui-wiring.test.js |
| 58 | Sticky calculator widget while scrolling | Done | Advanced | Y | Pass | Pass | Wiring test + runtime | reading-ui sticky calc bar: form docks to a compact sticky bar when scrolled past on long tool pages; jump-back-to-input shares target. tests/unit/reading-ui-wiring.test.js |
| 59 | Number-formatting toggle (500,000 / 5,00,000 / 500000) | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | Units/display settings (AdvancedFeatures.renderUnitsSettings) — lakh/thousand separators tied to locale selection |
| 60 | Print-optimized result view | Done | Advanced | Y | Pass | Pass | Unit + manual print pending | reading-ui print mode: one click → clean, ad-free print stylesheet scope. tests/unit/reading.test.js. Paper-layout check manual |
| 61 | Category-switcher dropdown on breadcrumb | Done | Advanced | Y | Pass | Pass | Wiring test | nav-ui injects a category <select> next to breadcrumbs (window.CATEGORY_META data), keyboard-accessible, instant jump. tests/unit/reading-ui-wiring.test.js |
| 62 | "Recently Viewed" widget | Done | Advanced | Y | Pass | Pass | Unit + wiring | Automatic last-N page tracking (storage cpm_recent), surfaced on home + empty states; distinct from manual History. nav-comfort/nav-ui |
| 63 | Floating scroll-to-top button | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | Pre-existing controller kept (duplicate avoided); appears after scroll threshold |
| 64 | Sticky mini-header (shrinks on scroll) | Done | Advanced | Y | Pass | Pass | Wiring test + runtime | nav-ui compact header: search/favorite/share core actions only, shrink transform on scroll. tests/unit/reading-ui-wiring.test.js |
| 65 | Category icon/color coding site-wide | Done | Advanced | Y | Pass | Pass | Wiring test | CATEGORY_META (icon + color per category) applied in bottom nav, search results, recently-viewed, wizard. tests/unit/reading-ui-wiring.test.js |
| 66 | Related-calculators carousel (swipeable) | Done | Advanced | Y | Pass | Pass | Wiring test | related-grid converted to horizontal scroll-snap carousel on tool pages (touch swipe + overflow scroll), progressive enhancement over grid. tests/unit/reading-ui-wiring.test.js |
| 67 | "Jump back to input" button | Done | Advanced | Y | Pass | Pass | Unit + wiring | reading-ui jump-to-input: appears after scrolling past form on tool/guide pages, one tap returns. tests/unit/reading-ui-wiring.test.js |
| 68 | Mobile bottom navigation bar | Done | Advanced | Y | Pass | Pass | Wiring test + runtime | Home/Search/Favorites/History/Settings bar, thumb-zone placement, aria-current="page" indicator, hidden on desktop. tests/unit/reading-ui-wiring.test.js |
| 69 | Adjustable content-width control | Done | Advanced | Y | Pass | Pass | Wiring test | 3-step reading column width on long-form pages, persisted. tests/unit/reading-ui-wiring.test.js |
| 70 | Skeleton loading placeholders | Done | Advanced | Y | Pass | Pass | Wiring test + runtime | Skeletons during OCR lazy-load (smart-input) + page/tool transitions (app.js) — no blank white flashes. tests/unit/reading-ui-wiring.test.js |
| 71 | Result highlight/pulse on calculation | Done | Advanced | Y | Pass | Pass | Wiring test | .pulsing class added on result completion (not pure-CSS page-load firing), reduced-motion-safe. tests/unit/reading-ui-wiring.test.js |
| 72 | Consistent icon language across pages | Done | Advanced | Y | Pass | Pass | Wiring test | Single icon source (CATEGORY_META + inline SVG system) audited into nav/breadcrumbs/related/search surfaces; no per-page ad-hoc icon sets remain in new code paths. tests/unit/reading-ui-wiring.test.js |
| 73 | "You are here" indicator in category views | Partial | Basic | Y | Pass | Pass | Wiring test | Bottom nav + breadcrumb show current location (aria-current + active styling). LIMITATION: category grid/list cards don't get a separate "you are here" ring — current page indicator only in nav surfaces. tests/unit/reading-ui-wiring.test.js |
| 74 | Grid/list-view toggle for category pages | Done | Advanced | Y | Pass | Pass | Wiring test | Toggle with localStorage persistence. tests/unit/reading-ui-wiring.test.js |
| 75 | Verified zoom-friendly layout (150%/200%) | Partial | Advanced (verification pending) | Y | Pass | Pass | Wiring test | Fluid layout + 44px targets + content-width control give zoom headroom. LIMITATION: formal 150%/200% visual pass needs a real browser session post-deploy — flagged in regression checklist |
| 76 | Friendly empty-state illustrations + CTA | Done | Advanced | Y | Pass | Pass | Unit + wiring | Empty Favorites/History states with illustration + "browse calculators" CTA (nav-comfort TOUR/empty states). tests/unit/nav-comfort.test.js |
| 77 | Full WCAG AA contrast audit (light/dark) | Done | Advanced | Y | Pass | Pass | Real computed check | Programmatic WCAG ratio computation over both theme palettes found real failures (white on amber/success/error fills: 1.67–3.76). FIXED: semantic -text variant variables (light: darker shades, dark: bright on dark fills), high-contrast theme updated. Post-fix all pairings ≥ AA. Logged in scripts + verified by computation |
| 78 | Thumb-zone primary action placement | Partial | Advanced lib / basic wiring | Y | Pass | Pass | Unit | decide.js inThumbZone heuristic + 44px targets + bottom nav place core actions in thumb reach. LIMITATION: per-calculator primary-button placement not re-ordered per page (one shared nav solution). tests/unit/decide.test.js |
| 79 | Swipe gestures between related calculators | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | Existing swipe-nav module + carousel scroll-snap (#66) |
| 80 | Enforced 44×44px tap targets site-wide | Done | Advanced | Y | Pass | Pass | Unit + CSS audit | decide.js auditTapTargets + CSS WCAG 2.5.8 rules (inputs, nav controls, close buttons). tests/unit/decide.test.js + styles.css |
| 81 | Keep result visible above mobile keyboard | Partial | Advanced lib / basic wiring | Y | Pass | Pass | Unit | decide.js scrollAboveKeyboard math (visualViewport-aware) unit-tested. LIMITATION: auto-scroll hook fires on result, not continuously on every focus — some field-focus cases still cover the result. tests/unit/decide.test.js |
| 82 | Pull-to-refresh on list pages | Done | Advanced | Y | Pass | Pass | Unit + wiring test | decide.js pullToRefreshAllowed gate (list pages only) + nav-ui touch handler + pull indicator. tests/unit/decide.test.js + reading-ui-wiring.test.js |
| 83 | One-handed mobile layout mode | Done | Advanced | Y | Pass | Pass | Wiring test | reading-ui one-handed toggle: pulls primary controls into bottom-third reach, persisted. tests/unit/reading-ui-wiring.test.js |
| 84 | "Which calculator do I need?" guided wizard | Done | Advanced | Y | Pass 16/16 | Pass | Unit + wiring | decide.js recommend (2–3 question flow) + nav-ui wizard modal on home; recommends category + specific tools. tests/unit/decide.test.js |
| 85 | "Before you calculate" checklist | Done | Advanced | Y | Pass | Pass | Unit + wiring | decide.js checklist + DecideUI.renderChecklist above the form per tool. tests/unit/decide.test.js + decide-ui wiring |
| 86 | Color-coded interpretation scale | Done | Advanced | Y | Pass | Pass | Unit + wiring | decide.js interpret + SCALES (BMI, BP, DTI, savings rate) + DecideUI.SCALED plots the user's value on a color-banded scale under the result. tests/unit/decide.test.js |
| 87 | Plain-language one-line summary above result | Done | Advanced | Y | Pass | Pass | Unit + wiring | decide.js oneLineSummary ("In short: …") rendered above the detailed breakdown. tests/unit/decide.test.js |
| 88 | Expandable "show me the math" | Done (existing) | Advanced | Y | Pass (smoke) | Pass | Runtime smoke | Native <details> step-by-step formula work in tool content (open-by-default, collapsible via #56) |
| 89 | Accuracy/confidence note on estimates | Done | Advanced | Y | Pass | Pass | Unit + wiring | decide.js ESTIMATE_NOTE + ConfidenceNotes attach "estimate — actual results may vary" labeling to estimate-based tools. tests/unit/decide.test.js |
| 90 | Visual timeline for multi-stage results | Done | Advanced | Y | Pass | Pass | Unit + wiring | decide.js buildTimeline (month-overflow clamping tested) + DecideUI timeline UI for retirement/debt-payoff/due-date tools. tests/unit/decide.test.js |

## Regression checklist (second-pass re-check, Sept 2026)

- [x] Full unit suite green: **1809/1809** (31 files)
- [x] all-tools smoke: **1206/1206 pass** (`npm run check`)
- [x] Count audit: all user-facing references match registry 1206 (`npm run audit`)
- [x] Drift check: all mirrored modules synchronized (`npm run drift:check`)
- [x] Cluster links: 64/64 slugs + hub/spoke topology (`check-cluster-links.cjs`)
- [x] deploy:build quality gate: **0 failures** (sitemap quality gate PASS)
- [x] Performance budgets: eager-JS 1300/1600KB · index.html 74/90KB · styles 88/110KB · fonts 69/120KB · sitemap 246/600KB — **all PASS**
- [x] Playwright deploy-smoke: **58 passed, 2 skipped** (skips = live-CDN artifact checks, valid only post-deploy)
- [x] Favorites / history / compare / dark mode / cookie consent / QA dashboard — covered by smoke + unit suites; no regressions observed
- [x] SEO-safety: #51/#56/#57 use native <details>/DOM-preserving tabs — content stays in HTML, nothing crawlable is display:none'd by default
- [ ] Live PWA install + camera-scan + mic voice + 150/200% zoom pass — manual verify post-deploy (need real browser/hardware)

## Backlog quality rules honored

- No fabricated stats/counts/claims (blocked #32 instead of faking numbers)
- All permissions features (voice, camera, notifications) are opt-in with clear consent UX
- Declining any permission never breaks a calculator
- Heavy libraries (Tesseract ~2MB, OpenDyslexic font) are lazy-loaded only on first use — zero boot-path cost
- Reduced-motion respected everywhere, with manual override
- No deploy performed — awaiting site owner

## Needs owner decision

1. **#32 aggregate usage stats** — needs a real backend/analytics source before any public number can be shown honestly. Options: GA4-based aggregate page (anonymized) or leave blocked.
2. **#42 API playground** — no server API exists. Options: in-browser engine sandbox page (honest, useful) or drop the item.
3. **#36 multi-tab triple-view** — overlaps with existing Compare tool. Options: extend compare with 3-way side-by-side or drop.
4. **#19 result explanations** — current ConfidenceNotes cover ACCURACY_DATA tools; full 1206-tool bespoke explanations need a per-domain rules authoring effort.
