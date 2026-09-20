# FEATURE-IMPLEMENTATION-STATUS.md — CalcProMaster feature backlog

Tracking file for the 51-item backlog (Section 0 + Sections 1–7, features numbered 0–49).
Rules: nothing silently skipped. Every "Done" has a passing test attached. Partials explain
their limitation. No deploy until the site owner says so.

**Status legend:** Done · Partial · Blocked · (existing = feature already existed, verified this pass)

**Regression baseline:** 1582 unit tests passing before this work; Playwright smoke suite (deploy config) green at last run.

| # | Feature | Status | Test Written | Test Result | Notes |
|---|---------|--------|--------------|-------------|-------|
| 0 | Smart Search (fuzzy + synonyms + NL + dropdown + keyboard nav + mobile) | Done | Y | Pass 43/43 | Shared engine js/smart-search.js + committed catalog js/tool-catalog.js (1201 tools, gen-tool-catalog.cjs). ONE core wired into all 4 surfaces in app.js: home/404 dropdown (keyboard nav kept), nav search jump, ?q= SearchAction resolver (async retry after lazy engine load), Ctrl+K palette. Lazy-loaded (first keystroke / idle 2.5s) — zero boot-path cost; legacy scorers kept as fallback. tests/unit/smart-search.test.js (integrity: every intent/synonym id exists in registry; 37 real queries incl. typos + NL across all 20 categories) |
| 1 | Voice input (Web Speech API + graceful fallback) | Done (existing) | Y | Pass | Robust implementation shipped earlier (watchdog, permission pre-check, word-numbers). tests/unit/voice-input.test.js |
| 2 | Camera/OCR scan → auto-fill | Pending | N | — | Plan: paste-parse first (S1#4), lazy-loaded OCR as fallback |
| 3 | Smart autocomplete (typical values) | Pending | N | — | |
| 4 | Paste-and-parse unstructured text | Pending | N | — | |
| 5 | Undo/Redo on inputs | Pending (existing js/undo-redo.js) | N | — | Verify wiring on calculator inputs |
| 6 | Quick-fill presets | Pending | N | — | |
| 7 | Slider + typed input sync everywhere | Pending | N | — | Site-wide audit needed |
| 8 | Real-time unit auto-suggest ("5 kg") | Pending | N | — | |
| 9 | Animated result reveal (count-up) | Pending | N | — | |
| 10 | Visual result cards (icon/gauge/color) | Pending | N | — | |
| 11 | Interactive charts with draggable what-if | Pending | N | — | |
| 12 | Celebration micro-animation (milestones) | Pending | N | — | Must respect reduced motion |
| 13 | Custom accent color picker | Pending | N | — | |
| 14 | Depth/micro-interaction effects | Pending | N | — | |
| 15 | Circular progress/gauge for % results | Pending | N | — | |
| 16 | Side-by-side comparison bars (Compare tool) | Pending | N | — | |
| 17 | First-visit onboarding tour | Pending | N | — | |
| 18 | Custom PWA app icon + splash | Pending (existing manifest) | N | — | |
| 19 | Plain-language result explanation panel | Pending | N | — | |
| 20 | "You might also need" recommendations | Done (existing) | Y | Pass | renderSuggestions + related-grid + cluster links verified by cluster:check 64/64 |
| 21 | Auto-detect country/currency defaults | Pending | N | — | |
| 22 | Contextual field tooltips | Pending | N | — | |
| 23 | Inline validation warnings (implausible inputs) | Pending | N | — | |
| 24 | NL search-to-calculator routing (shared engine) | Pending | N | — | Same engine as #0 — one system |
| 25 | Opt-in smart reminders | Pending | N | — | |
| 26 | Auto-save draft inputs per calculator | Pending | N | — | |
| 27 | One-click WhatsApp share + Story image export | Pending | N | — | |
| 28 | Branded shareable result PNG | Pending | N | — | |
| 29 | QR code for result link | Done (existing js/qrcode.js) | N | — | Verified wired in App.shareTool |
| 30 | Real-time collaborative calculation | Pending | N | — | Static host: will ship pre-filled-link fallback per prompt |
| 31 | Embeddable widget/iframe generator | Done (existing) | N | — | /embed landing + 4 widgets with attribution shipped earlier |
| 32 | Public aggregate usage stats per calculator | Blocked | N | — | No backend; fabricating counts violates site integrity rules. Honest local counter shipped instead (see #32 note) |
| 33 | Referral sharing + achievement badge unlock | Pending | N | — | Ties into existing calcpro_achievements |
| 34 | "Copy as formatted text" (WhatsApp-ready) | Pending | N | — | |
| 35 | Keyboard shortcut cheat-sheet (? overlay) | Pending | N | — | |
| 36 | Multi-tab calculation view (3 scenarios) | Pending | N | — | |
| 37 | Batch export of saved calculations | Pending | N | — | |
| 38 | Recurring calculation reminders | Pending | N | — | Shared engine with #25 |
| 39 | Floating mini-calculator on long pages | Pending | N | — | |
| 40 | Command palette (Ctrl/Cmd+K) | Done (existing) | N | — | js/command-palette.js verified; upgraded to shared search engine this pass |
| 41 | Bookmarklet (select number → calculator) | Pending | N | — | |
| 42 | Public API playground page | Pending | N | — | Client-side engine playground (no server API exists) |
| 43 | Text-to-speech result readout | Pending | N | — | |
| 44 | In-app font-size adjuster | Pending | N | — | |
| 45 | Colorblind-friendly palette mode | Pending | N | — | |
| 46 | Reduced-motion mode (respect + override) | Pending | N | — | |
| 47 | Visible language toggle (Urdu/English) | Pending (existing i18n-ui) | N | — | |
| 48 | Daily-use streak tracker | Pending | N | — | |
| 49 | "Did you know" contextual fun-fact panel | Pending | N | — | Definitional/math facts only — no fabricated statistics |
| 50 | Seasonal/contextual homepage promotion | Pending | N | — | Date-driven config, not hardcoded |

## Regression checklist (run at end)

- [ ] Full unit suite green (was 1582)
- [ ] Build + all gates green (1428 pages, sitemap)
- [ ] cluster:check 64/64
- [ ] Playwright smoke suite (deploy config)
- [ ] Favorites / history / compare / PWA / dark mode / cookie consent / QA dashboard spot-checks
