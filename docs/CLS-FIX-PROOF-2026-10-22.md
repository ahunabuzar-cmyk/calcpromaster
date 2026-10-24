# CLS 0.178 ka proof + jo abhi bhi baqi hai

> Measured 2026-10-22. Har number yahan **reproduce** ho sakta hai — command neeche diya hai.
> Ye document sirf woh likhta hai jo measure hua; jo fix local `deploy/` mein hai magar live
> nahi, us par "live" nahi likha gaya.

## 1. CLS ki asli wajah: webfont swap (proven, A/B)

Ek hi built artifact, sirf `@font-face` ka `font-display` badla — baaki byte-identical.
Test: real CDP throttling (slow 4G: 150ms RTT, 1.6 Mbps down, 750 kbps up) + 4x CPU throttle,
412x823 viewport, cold cache, `node .tmp-lh/ab-cls.cjs`.

| variant | CLS | shifts | hero height | shifted node |
|---|---:|---:|---:|---|
| `font-display: swap` (jo aaj LIVE hai) | **0.1718** | 5 | 487px | `DIV.skeleton-cod`, `.home-cat-links` |
| `font-display: optional` (jo ab deploy/ mein hai) | **0.0000** | 0 | 467px | — |

- 0.1718 vs aap ke Lighthouse ka **0.178** — same phenomenon, same magnitude.
- Shift ka reason: Inter `~1.5s` baad aata hai, swap hota hai, hero ka text ek line barh jata hai
  (+20px @412px, +74px @360px) aur neeche sab kuch jump karta hai.
- `optional` = us view ke liye fallback font, baad mein swap nahi. Font cached ya time par
  aaya to asli font use hota hai (dono preload + 1-year immutable cache).

**Lighthouse khud is shift ko local par nahi pakadta** (before/after dono runs: CLS audit = 0).
Isi liye sirf Lighthouse ke "CLS 0" par bharosa karna ghalat tha — real-throttle probe ne pakda.
Production par Lighthouse ne 0.178 dikhaya kyunki wahan font CDN se late aata hai.

## 2. Live site abhi bhi purana build serve kar rahi hai (proof)

| | live `https://calcpromaster.com/` | local `deploy/index.html` |
|---|---|---|
| bytes | 80,346 | 162,865 (37KB gzip) |
| `<script src>` tags | **60** | **9** (8 hashed bundles + site-extras) |
| render-blocking stylesheet | **1** | 0 (CSS inline) |
| inline critical CSS | 0 | 88,919 B |
| font preloads | 1 | 2 (Inter + Space Grotesk) |
| `font-display` in `/styles.css` | **swap** (84,947 B file) | **optional** (87,370 B file) |

Yani: CLS fix, script bundling (58→8 requests), font preloads, aur snow-day hero 404 — sab
local `deploy/` mein hain, **production par nahi**. Jab tak deploy nahi hota, aap ke users
ko wahi 0.178 CLS milta rahega.

## 3. Lighthouse (local artifact, mobile emulation — yahi machine)

Pehle ye saaf: purana number `data/cwv-baseline.json` **2026-10-13** ka hai, jab site par
1,224 tools the — aaj 1,285 hain. Is liye neeche wali table controlled before/after **nahi**
hai, sirf "kahan se kahan" ka record hai.

| metric | old baseline (2026-10-13 build) | 2026-10-22 build |
|---|---|---|
| performance | 80 | **77** |
| FCP | 2.4 s | 1.8 s |
| LCP | 3.4 s | 3.8 s |
| TBT | 360 ms | 440 ms |
| CLS | 0 | **0** |
| Speed Index | 2.4 s | 1.8 s |
| total bytes | 493 KiB | 378 KiB |

**Same build ka controlled run** (swap vs optional, `run-lh.cjs`, ek hi artifact): perf **78 vs
77**, TBT **400ms vs 440ms**, LCP 3.8s dono, CLS **0 dono** — yani Lighthouse local par CDP probe
wali shift reproduce nahi karta, aur score ka farq run-to-run noise hai.

Honest reading: **FCP, Speed Index aur total bytes behtar hue; performance score, LCP aur TBT
behtar nahi hue.** CLS ka proof section 1 hai (A/B, real throttling), yeh table nahi.

## 4. Jo abhi bhi baqi hai (LCP/TBT ka asli kaam)

Lighthouse 13.5 mobile, `deploy/`, 2026-10-22:

- **LCP element: `<h1>` in `.hero`** (element render delay dominant, TTFB sirf 18ms). Hero par
  `animation: fadeInUp 0.8s` chalti hai — LCP paint us animation ke saath late hota hai.
- **Long tasks 5**, sabse bara `b-a408657795.js` (app.js, 199KB): 260ms + 232ms,
  `site-extras.js` 90ms, `tool-catalog.js` parse 56ms.
- **Main-thread 2.0s**, jismein **Style & Layout 974ms** — 88KB inline CSS + bara DOM.
- **Home page JS: 859KB raw / 271KB gzip** 9 requests mein. Lighthouse kehta hai 85KB unused.
- **Aage ka rasta (measure karke, andaze se nahi):** home par `app.js` ko `defer` se aage
  rakho magar non-critical modules (calendar-of-day spotlight, advanced-features) idle par
  load karo; ya home ke liye ek chhota boot bundle banao. Yeh TBT 440ms → ~200ms la sakta hai.
  Hero animation ko `opacity`-only rakho ya `prefers-reduced-motion` par band karo — LCP
  render delay girta hai. Dono change measure ke baad hi "ho gaya" kehna.

## 5. Reproduce

```bash
cd project
node build-deploy.js                                  # deploy/ + asset gate
node .tmp-lh/ab-cls.cjs                               # swap vs optional, real throttling
LH_PORT=3355 LH_OUT=.tmp-lh/report-after.json node .tmp-lh/run-lh.cjs
curl -s https://calcpromaster.com/ | grep -c '<script[^>]*src='   # live = 60
```
