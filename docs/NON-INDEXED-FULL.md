# Non-indexed pages — full data (2026-10-28)

> Measured with the URL Inspection API, one call per sitemap URL, on 2026-10-28.
> Every "not indexed" URL was then fetched from the live site to check whether the
> status is a real defect or a stale snapshot from an earlier crawl.
> No number here is copied from an older report.

## 1. Headline numbers

| measure | value |
|---|---|
| sitemap URLs | 1420 |
| inspected today | 1326 |
| **indexed** ("Submitted and indexed") | **557** (42.0%) |
| not indexed, any reason | 769 |
| not inspected (API daily quota) | 94 |

## 2. Every non-indexed status, counted

| GSC status | URLs |
|---|---|
| URL is unknown to Google | 371 |
| Discovered - currently not indexed | 213 |
| Page with redirect | 107 |
| Excluded by ‘noindex’ tag | 30 |
| Crawled - currently not indexed | 29 |
| Alternate page with proper canonical tag | 19 |

## 3. Did the site break? — live re-probe of all 769 non-indexed URLs

Each of those URLs was fetched from `https://calcpromaster.com` today:

| live result | URLs |
|---|---|
| ok-indexable | 769 |

`ok-indexable` = HTTP 200, `<meta name="robots" content="index, follow">`, no
`X-Robots-Tag`, canonical pointing at the URL itself, a real `<title>`/`<h1>` and
at least 200 words of text.

**All 769 of them pass.** There is no noindex, no canonical
misdirection, no redirect, no thin page and no server error left to fix. Whatever
is keeping these pages out of the index is not in the HTML the server sends today.

## 4. Non-indexed per category

| category | total | indexed | not indexed | indexed % |
|---|---|---|---|---|
| finance | 218 | 54 | 164 | 24.8% |
| math | 121 | 34 | 87 | 28.1% |
| engineering | 67 | 9 | 58 | 13.4% |
| science | 82 | 40 | 42 | 48.8% |
| career | 46 | 7 | 39 | 15.2% |
| regional | 82 | 43 | 39 | 52.4% |
| business | 45 | 7 | 38 | 15.6% |
| construction | 57 | 24 | 33 | 42.1% |
| conversion | 36 | 5 | 31 | 13.9% |
| food | 37 | 8 | 29 | 21.6% |
| health | 68 | 42 | 26 | 61.8% |
| guides | 73 | 50 | 23 | 68.5% |
| everyday | 50 | 29 | 21 | 58.0% |
| (flat) | 34 | 14 | 20 | 41.2% |
| homegarden | 52 | 32 | 20 | 61.5% |
| family | 40 | 20 | 20 | 50.0% |
| auto | 47 | 29 | 18 | 61.7% |
| lifestyle | 49 | 31 | 18 | 63.3% |
| education | 42 | 25 | 17 | 59.5% |
| fitness | 42 | 26 | 16 | 61.9% |
| hub | 19 | 13 | 6 | 68.4% |
| tech | 12 | 9 | 3 | 75.0% |
| blog | 6 | 5 | 1 | 83.3% |
| (root) | 1 | 1 | 0 | 100.0% |

## 5. Non-indexed pages that used to earn impressions (fix/request these first)

| page | last known impressions | current GSC state |
|---|---|---|
| `/regional/dubai-salary/` | 388 | Page with redirect |
| `/lifestyle/renters-insurance/` | 203 | Page with redirect |
| `/finance/va-loan/` | 132 | Page with redirect |
| `/finance/royalty-payment/` | 131 | Page with redirect |
| `/auto/mileage-calculator/` | 103 | Page with redirect |
| `/regional/pk-salary/` | 96 | Crawled - currently not indexed |
| `/everyday/gift-wrap/` | 95 | Crawled - currently not indexed |
| `/hub/fitness/` | 95 | Crawled - currently not indexed |
| `/family/vacation-with-kids/` | 90 | Page with redirect |
| `/science/moment-of-inertia/` | 82 | Page with redirect |
| `/homegarden/deck-stain/` | 75 | Page with redirect |
| `/homegarden/room-area/` | 66 | Page with redirect |
| `/auto/trip-time/` | 64 | Crawled - currently not indexed |
| `/homegarden/pool-chemicals/` | 64 | Page with redirect |
| `/lifestyle/road-trip-cost/` | 48 | Crawled - currently not indexed |
| `/guides/water-intake` | 44 | Crawled - currently not indexed |
| `/finance/dividend/` | 41 | Page with redirect |
| `/fitness/rowing-split/` | 36 | Page with redirect |
| `/finance/tax-equivalent-yield/` | 35 | Page with redirect |
| `/regional/home-loan-emi-india/` | 33 | Crawled - currently not indexed |
| `/math/scientific-notation/` | 32 | Crawled - currently not indexed |
| `/everyday/laundry-cost/` | 28 | Page with redirect |
| `/lifestyle/haircut-annual/` | 26 | Page with redirect |
| `/guides/calories` | 24 | Crawled - currently not indexed |
| `/everyday/business-days/` | 24 | Page with redirect |
| `/homegarden/lighting-rooms/` | 24 | Page with redirect |
| `/embed/` | 21 | Crawled - currently not indexed |
| `/finance/geometric-mean/` | 21 | Page with redirect |
| `/finance/emergency-fund/` | 18 | Page with redirect |
| `/finance/factoring-fee/` | 18 | Page with redirect |
| `/construction/roof-pitch/` | 17 | Page with redirect |
| `/homegarden/garden-fence/` | 17 | Page with redirect |
| `/lifestyle/candle-wax/` | 17 | Page with redirect |
| `/finance/dca-calculator/` | 15 | Page with redirect |
| `/finance/bond-price/` | 14 | Page with redirect |
| `/finance/coupon-payment/` | 14 | Page with redirect |
| `/finance/zero-coupon-bond/` | 12 | Page with redirect |
| `/lifestyle/paint-coverage/` | 12 | Page with redirect |
| `/finance/duration-bond/` | 11 | Page with redirect |
| `/lifestyle/` | 11 | Alternate page with proper canonical tag |

## 6. Full list

Per-URL detail (status, live check, word count, title, in-sitemap flag) is in
`data/nonindexed-full.json` — `rows` array, filter `coverage !== "indexed"`.

### Not inspected today (quota)

The URL Inspection API allows 2,000 inspections per property per day; today's run
used the allowance at 1326 URLs. These 94 are the remainder:

- `/tech/ppi-calc/`
- `/tech/wattage-psu/`
- `/tech/print-resolution/`
- `/tech/password-time/`
- `/tech/image-file-size/`
- `/tech/hosting-cost/`
- `/tech/monitor-refresh/`
- `/tech/streaming-bitrate/`
- `/tech/raid-capacity/`
- `/tech/uptime-calculator/`
- `/tech/device-charge-time/`
- `/tech/data-transfer-cost/`
- `/tech/token-cost/`
- `/tech/base64-encode/`
- `/tech/base64-decode/`
- `/tech/url-encoder/`
- `/tech/json-formatter/`
- `/tech/text-counter/`
- `/tech/case-converter/`
- `/tech/hash-generator/`
- `/tech/rgb-hex/`
- `/tech/uuid-generator/`
- `/tech/password-generator/`
- `/tech/ip-subnet/`
- `/tech/cron-validate/`
- `/tech/resistor-color-code/`
- `/tech/ascii-table/`
- `/tech/awg-reference/`
- `/tech/aspect-ratio/`
- `/tech/color-contrast/`
- `/tech/read-time/`
- `/tech/font-size-conv/`
- `/tech/storage-need/`
- `/tech/latency-bandwidth/`
- `/tech/download-time/`
- `/tech/audio-file-size/`
- `/tech/backup-size/`
- `/tech/screen-size/`
- `/tech/streaming-quality/`
- `/tech/code-line-count/`
- `/tech/dbm-watts/`
- `/tech/api-cost/`
- `/tech/keyword-density/`
- `/tech/reading-grade/`
- `/tech/typing-speed/`
- `/tech/ad-revenue/`
- `/tech/click-through-rate/`
- `/tech/subnet-cidr/`
- `/tech/video-bitrate/`
- `/tech/cidr-convert/`
- `/tech/gpu-comparison-perf/`
- `/tech/data-center-pue/`
- `/tech/screen-ppi/`
- `/tech/hash-rate/`
- `/tech/storage-array/`
- `/tech/docker-resource/`
- `/tech/load-test-users/`
- `/tech/wifi-throughput/`
- `/tech/data-usage-est/`
- `/tech/image-size-calc/`
- `/utilities/`
- `/hub/utilities/`
- `/utilities/qr-generator/`
- `/utilities/password-gen/`
- `/utilities/color-picker/`
- `/utilities/unit-converter/`
- `/utilities/base-converter/`
- `/utilities/hash-gen/`
- `/utilities/lorem-ipsum/`
- `/utilities/uuid-gen/`
- `/utilities/tip-split/`
- `/utilities/timer-calc/`
- `/utilities/file-size/`
- `/utilities/salary-hourly/`
- `/utilities/area-calc/`
- `/utilities/volume-calc/`
- `/utilities/shipping-cost/`
- `/utilities/salary-biweekly/`
- `/utilities/simple-tax/`
- `/utilities/mileage-calc/`
- `/utilities/ratio-simplifier/`
- `/utilities/gcd-lcm/`
- `/utilities/prime-check/`
- `/utilities/rounding-calc/`
- `/utilities/coin-flip/`
- `/utilities/dice-roller/`
- `/utilities/date-add/`
- `/utilities/age-exact/`
- `/utilities/units-per/`
- `/utilities/random-name/`
- `/utilities/password-entropy/`
- `/utilities/speech-time/`
- `/utilities/qr-content-size/`
- `/utilities/timestamp-convert/`

