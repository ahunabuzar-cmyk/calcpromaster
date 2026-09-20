# FEATURE-IMPLEMENTATION-STATUS.md — CalcProMaster feature backlog

Tracking file for the 51-item backlog (Section 0 + Sections 1–7, features numbered 0–50).
Rules: nothing silently skipped. Every "Done" has a passing test attached. Partials explain
their limitation. No deploy until the site owner says so.

**Status legend:** Done · Partial · Blocked · (existing = already shipped, re-verified this pass by grep/build/runtime)

**Verified state (Sept 2026):** unit tests 1723/1723 · all-tools smoke 1201/1201 · count audit ✓ · drift check ✓ · cluster links 64/64 · deploy-smoke 29 passed / 1 skipped (live-CDN check needs a deploy) · **Final tally: 44 Done · 5 Partial · 2 Blocked**

| # | Feature | Status | Test Written | Test Result | Notes |
|---|---------|--------|--------------|-------------|-------|
| 0 | Smart Search (fuzzy + synonyms + NL + dropdown + keyboard nav + mobile) | Done | Y | Pass 43/43 | Shared engine js/smart-search.js + committed catalog js/tool-catalog.js (1201 tools, gen-tool-catalog.cjs). ONE core wired into all 4 surfaces in app.js: home/404 dropdown (keyboard nav), nav search, ?q= SearchAction resolver, Ctrl+K palette. Lazy-loaded (first keystroke / idle 2.5s) — zero boot-path cost. tests/unit/smart-search.test.js: integrity (every intent/synonym id exists in registry) + 37 real queries incl. typos + NL across all 20 categories |
| 1 | Voice input (Web Speech API + graceful fallback) | Done (existing) | Y | Pass 33/33 | Watchdog, permission pre-check, word-number parser ("seventy five" → 75.5), iOS honest message. tests/unit/voice-input.test.js |
| 2 | Camera/OCR scan → auto-fill | Done | Y | Pass 17/17 | 📷 Scan photo button wired into paste-parse row; Tesseract.js (~2MB) lazy-loads from CDN only on first use (that click IS consent; image never uploaded). Unit tests: extraction pipeline + export surface. Live-camera verify is manual post-deploy (headless has no camera) |
| 3 | Smart autocomplete (typical values) | Done | Y | Pass | TYPICAL map + attachTypicalValues datalists wired in SmartInput.enhance(); integrity covered in tests/unit/smart-input.test.js; DOM attach exercised by smoke |
| 4 | Paste-and-parse unstructured text | Done | Y | Pass | 📋 Paste bill/text → extractNumbers → mapExtractedToInputs → fills numeric fields with review note. tests/unit/smart-input.test.js |
| 5 | Undo/Redo on inputs | Done | Y | Pass 8/8 | js/undo-redo.js wired in app.js (Ctrl+Z/Y + buttons); onRestore hook added this pass so restore actually re-applies values. tests/unit/undo-redo.test.js |
| 6 | Quick-fill presets | Done | Y | Pass | Category presets render only fields matching the tool; applyPreset dispatches input events. Presets integrity tests pass |
| 7 | Slider + typed input sync everywhere | Done (existing) | Y | Pass | inp.slider renders range+number pairs, syncSlider keeps both in sync (app.js). tests/e2e/mobile-sliders.spec.js |
| 8 | Real-time unit auto-suggest ("5 kg") | Done | Y | Pass 17/17 | parseUnitValue converts kg/lb/m/ft etc. into the field's expected unit + aria-live note. tests/unit/smart-input.test.js |
| 9 | Animated result reveal (count-up) | Done (existing) | Y | Pass (smoke) | animateResultNumber on .result-main (app.js:1886), reduced-motion-safe (animation durations zeroed) |
| 10 | Visual result cards | Done (existing) | Y | Pass (smoke) | .result-card wrapper with icon/color treatment (app.js:939) |
| 11 | Interactive what-if chart (draggable scenario) | Done | Y | Pass 14/14 | balance-over-time line chart on loan/savings/investment tools, updates live with slider drag; SVG chart fn unit-tested. tests/unit/visual-polish.test.js |
| 12 | Celebration micro-animation (milestones) | Done (existing) | Y | Pass (smoke) | confetti-lite showSuccessAnimation on success results (app.js:1897); disabled under prefers-reduced-motion + manual override |
| 13 | Custom accent color picker | Done | Y | Pass | ACCENT_PALETTES, saved per user, applied via CSS vars without breaking dark mode; picker in Display Preferences. tests/unit/visual-polish.test.js |
| 14 | Depth/micro-interaction effects | Done (existing) | Y | Pass (smoke) | ripple.js + initTiltEffect + hover/press states site-wide |
| 15 | Circular progress/gauge for % results | Done | Y | Pass 14/14 | SVG gauge(pct) in visual-polish; unit-tested (Node + browser paths) |
| 16 | Side-by-side comparison bars (Compare tool) | Done (existing) | Y | Pass (smoke) | Scenario compare renders visual chart + table (advanced-features buildScenarioComparison) |
| 17 | First-visit onboarding tour | Done | Y | Pass | TOUR_STEPS + startTour fires once (localStorage flag) via VisualPolish.init; reduceMotion-aware |
| 18 | Custom PWA app icon + splash | Partial | Y | Pass (install) | Manifest icons + install flow verified (tests/e2e/pwa-install.spec.js). Dedicated iOS apple-touch-startup-image splash not generated — cosmetic follow-up, does not affect install/use |
| 19 | Plain-language result explanation panel | Partial | Y | Pass | ConfidenceNotes (confidence level, accuracy band, assumptions per tool) auto-attaches under results. Coverage limited to tools in ACCURACY_DATA — bespoke "why is my EMI high" prose for all 1201 tools remains template-bound; flagged for follow-up |
| 20 | "You might also need" recommendations | Done (existing) | Y | Pass | renderSuggestions + related-grid + cluster links; cluster:check 64/64 |
| 21 | Auto-detect country/currency defaults | Done | Y | Pass | SmartAssist.detectCurrency maps navigator.language region → currency (PK→PKR, IN→INR, …); wired into currency-converter From-select. No IP lookup, no network. tests/unit/smart-assist.test.js (3 new tests) |
| 22 | Contextual field tooltips | Done (existing) | Y | Pass (smoke) | GlossaryTooltips (hover/tap) initialized app.js:1323 |
| 23 | Inline validation warnings (implausible inputs) | Done | Y | Pass | RULES engine (rate>30% "double check?" style) — non-blocking warnings. tests/unit/smart-assist.test.js |
| 24 | NL search-to-calculator routing | Done | Y | Pass 43/43 | Same shared engine as #0 ("calculate EMI for my car loan" → auto/car-loan-emi). One system, not two |
| 25 | Opt-in smart reminders | Done | Y | Pass | setReminder/checkDueReminders via Notification API, strictly opt-in, no dark patterns. tests/unit/smart-assist.test.js |
| 26 | Auto-save draft inputs per calculator | Done | Y | Pass | cpm_draft_<toolId> namespace separate from history; restore bar. tests/unit/smart-assist.test.js |
| 27 | WhatsApp share + Story image export | Done | Y | Pass (smoke) | wa.me deep link in share modal + exportStoryImage (9:16 story format) wired into App.shareTool |
| 28 | Branded shareable result PNG | Done (existing) | Y | Pass (smoke) | exportResultAsImage (canvas, branding + URL) |
| 29 | QR code for result link | Done (existing) | Y | Pass | js/qrcode.js in share modal (App.shareTool); drift-check synchronized |
| 30 | Real-time collaborative calculation | Partial | Y | Pass (fallback) | True realtime sync needs a backend — not feasible on static host. Prompt-sanctioned fallback shipped: shareable pre-filled link (generateShareLink + share modal) so a second person opens the same calculation with values |
| 31 | Embeddable widget/iframe generator | Done (existing) | Y | Pass (smoke) | /embed landing + 4 widgets with attribution link (cluster checker covers slugs) |
| 32 | Public aggregate usage stats per calculator | Blocked | N | — | No backend = no real counts. Fabricating "12,000 people used this" would violate the no-fabrication rule, so nothing was faked. Honest alternative: none shipped. Revisit when analytics backend exists |
| 33 | Referral sharing + achievement badge | Partial | N | — | trackShare() + referral-1/referral-5 badges implemented and wired into App.shareTool (share count in calcpro_share_count). Logic is DOM/storage-dependent — no dedicated unit test yet; smoke exercises the share modal. Test follow-up flagged |
| 34 | "Copy as formatted text" (WhatsApp-ready) | Done | Y | Pass 4/4 | buildFormattedResult: emoji + line breaks + result + link, copied to clipboard from share modal ("🧾 Formatted text"). tests/unit/formatted-result.test.js |
| 35 | Keyboard shortcut cheat-sheet (?) | Done | Y | Pass 10/10 | PowerTools.renderShortcuts overlay on "?" key. tests/unit/power-tools.test.js |
| 36 | Multi-tab calculation view (3 scenarios) | Partial | N | — | Existing compare tool already pins/compares multiple scenarios of a tool with visual chart. A dedicated same-screen triple-view of the same calculator was not built — needs UX decision (overlap with compare) |
| 37 | Batch export of saved calculations | Done (existing) | Y | Pass | Batch selection + CSV export + PDF print report verified in code and smoke |
| 38 | Recurring calculation reminders | Done | Y | Pass | Same reminder engine: monthly/weekly nextDue (month-end clamping tested) + checkDueReminders on boot |
| 39 | Floating mini-calculator | Done | Y | Pass 10/10 | PowerTools.initMiniCalc — persistent while scrolling guides/blog. tests/unit/power-tools.test.js |
| 40 | Command palette (Ctrl/Cmd+K) | Done (existing) | Y | Pass 43/43 | js/command-palette.js upgraded to shared SmartSearch engine |
| 41 | Bookmarklet (select number → calculator) | Done | Y | Pass 10/10 | Bookmarklet generator (correctly scoped eval — bug found & fixed by tests). tests/unit/power-tools.test.js |
| 42 | Public API playground page | Blocked | N | — | No server API exists (fully client-side engine), so there is nothing to "play against". Building a fake playground would mislead developers. Needs owner decision: either ship an in-browser engine sandbox page or drop this item |
| 43 | Text-to-speech result readout | Done | Y | Pass 15/15 | Comfort.speakResult (user-initiated 🔊 button on result — no auto-speak), Web Speech Synthesis. tests/unit/comfort.test.js |
| 44 | In-app font-size adjuster | Done | Y | Pass 15/15 | 5-step font scale on <html>, persisted, independent of browser zoom; in Display Preferences. tests/unit/comfort.test.js |
| 45 | Colorblind-friendly palette mode | Done | Y | Pass 15/15 | protanopia/deuteranopia (Okabe-Ito blue/orange) + tritanopia (purple/teal) palettes; data-cb attribute + full CSS var override added this pass. tests/unit/comfort.test.js |
| 46 | Reduced-motion mode (respect + override) | Done | Y | Pass 15/15 | prefers-reduced-motion respected by default; manual on/off override (data-reduced-motion) + matching CSS added this pass. tests/unit/comfort.test.js |
| 47 | Visible language toggle (Urdu/English) | Done (existing) | Y | Pass (smoke) | i18n-ui toggle visible on every page, RTL support |
| 48 | Daily-use streak tracker | Done (existing) | Y | Pass | streak-3/7/30 achievements from visit analytics (calcpro_achievements) |
| 49 | "Did you know" contextual fun-fact panel | Done | Y | Pass 13/13 | Facts dataset per category/tool (definitional + math facts, zero fabricated statistics); renderFactPanel on result. tests/unit/engagement.test.js |
| 50 | Seasonal/contextual homepage promotion | Done | Y | Pass 13/13 | Date-window config (Ramadan zakat, tax season, winter energy) — no year hardcoding; banner wired on homepage. Overlap-priority tested. tests/unit/engagement.test.js |

## Regression checklist (final run, Sept 2026)

- [x] Full unit suite green: **1723/1723** (was 1582 before backlog — +141 tests)
- [x] all-tools smoke: **1201/1201 pass** (`npm run check`)
- [x] Count audit: all user-facing references match registry 1201 (`npm run audit`)
- [x] Drift check: all mirrored modules synchronized (`npm run drift:check`)
- [x] Cluster links: 64/64 slugs + hub/spoke topology (`check-cluster-links.cjs`)
- [x] Playwright deploy-smoke: **29 passed, 1 skipped** (skipped = live-CDN artifact check, valid only post-deploy)
- [x] Favorites / history / compare / dark mode / cookie consent / QA dashboard — covered by smoke + unit suites; no regressions observed
- [ ] Live PWA install + camera-scan + mic voice — manual verify post-deploy (need real browser/hardware)

## Backlog quality rules honored

- No fabricated stats/counts/claims (blocked #32 instead of faking numbers)
- All permissions features (voice, camera, notifications) are opt-in with clear consent UX
- Declining any permission never breaks a calculator
- Heavy libraries (Tesseract ~2MB) are lazy-loaded only on first use — zero boot-path cost
- Reduced-motion respected everywhere, with manual override
- No deploy performed — awaiting site owner
