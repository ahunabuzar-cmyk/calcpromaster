# Targets vs Real Rankings — CalcProMaster (2026-09-18)

Companion to **docs/KEYWORD-TARGETS.md** (what the site targets) and
**docs/KEYWORD-AUDIT.md** (targeting quality). This file answers: *what does
Google actually show today?*

## Verdict (honest)

| Question | Answer |
|---|---|
| Is the site indexed at all? | ✅ Yes — `site:calcpromaster.netlify.app` returns pages |
| Do indexed titles match current content? | ❌ No — Google still shows the old "543+ free online calculators" era titles; site is at 1201+ |
| Does the brand term rank? | ⚠️ Partially — bare "calcpromaster" → site at ~#4 (Google suggests "calc promaster"); "calcpromaster calculators" → **GitHub repo ranks #1/#3, the site itself is not in the top 10** |
| Do the 1,331 curated long-tail phrases rank? | ❌ Not the probed ones — spot-checked targets are not in the top 10 (see table) |
| Full ranking coverage possible today? | ❌ No — GSC API credentials unconfigured; only small-sample SERP probes below. GSC is the only way to see every query/position/impression |

## Live SERP spot-checks (2026-09-18, en-US, point-in-time)

| Query (target from KEYWORD-TARGETS.md) | Expected page | Observed |
|---|---|---|
| `site:calcpromaster.netlify.app` | — | Indexed; ~10 results; titles stale ("543+") |
| `calcpromaster` | `/` | Site ≈ #4; organic SERP otherwise unrelated (Google suggests "calc promaster") |
| `"calcpromaster" calculators` | `/` | **github.com/ahunabuzar-cmyk/calcpromaster at #1 and #3; site not in top 10** |
| `loan emi calculator` | `/finance/loan-emi` | Not in top 10 (SERP: groww, banks, calculator.net, bankrate) |
| `home loan emi calculator with monthly prepayment` | `/finance/loan-emi` | Not in top 10 (smartemicalc, jupiter, groww, navi…) |
| `concrete volume calculator in cubic yards` | `/construction/concrete` | Not in top 10 (calculator.net, concretenetwork…) |
| `cgpa to percentage conversion calculator` | `/education/cgpa-to-percentage` | Not in top 10 (dedicated CGPA sites, GeeksforGeeks) |

Probe caveats: point-in-time, personalized/geo-variable, position beyond 10
not measurable this way. Treat this table as a snapshot, not a dashboard.

## What the snapshot implies (evidence → action)

1. **Stale indexed titles** — after deploy, ping IndexNow (`npm run indexnow`)
   and request indexing in GSC for priority pages; titles were recently
   overhauled (count-consistency work) but Google hasn't re-fetched.
2. **GitHub repo outranks the site for the brand** — add the live site URL to
   the repo description + README (free authority signal + likely #1 brand fix).
3. **Head terms are unwinnable for now** — zero-backlink netlify.app subdomain
   cannot beat banks/asset sites on "loan emi calculator". Compete on
   long-tail + brand first; the audit's C2 list shows which phrases need a
   single owner page to stop splitting their own votes.
4. **Scale requires GSC** — impressions/positions for all 1,331 phrases can
   only come from Search Console.

## How to refresh this comparison

- **Once GSC credentials exist** (docs/api-credentials-setup.md):
  `GSC_SITE_URL=https://calcpromaster.netlify.app node scripts/gsc-indexing.cjs --days 28`
  — then replace this section with real query/position data.
- **Spot-check rerun:** re-run the same query set; note date; append rows.
- **Target inventory refresh:** `npm run keywords:fresh` (regenerates
  KEYWORD-TARGETS.md + KEYWORD-AUDIT.md; CI fails if they go stale).

---

## Update — 2026-09-19 (live audit run)

**Production state (curl-verified today):**
- Homepage: correct 1201+ title/count, security headers ✓
- Sitemap: 1,320 URLs — **purana deploy live hai**. Local build (1,332 + /embed +
  cluster links + Featured-On footer) deploy-push ke baad replace hoga.
  Widgets (/embed/*.html) production par abhi 404 hain — build mein ready.
- Cluster links production par abhi 0 (expected — fix pending deploy).

**Backlink/mention scan (Google, "calcpromaster"/"CalcProMaster"):**
- External mentions: **0** — top results sab site ke apne pages + GitHub repo.
- Ek unrelated lemon8 post (HP 50g calculator review) match hai, link nahi.
- Cached snippets /about, /contact, /history, /compare abhi bhi purana "543+"
  count dikhate hain → deploy ke baad GSC URL Inspection se in 4 ka re-index
  request karna (owner, ~2 min).

**Tier-A keyword pages (EASY-KEYWORD-LIST.md) — sab 5/5 exist + aligned:**
| Keyword | Page | Status |
|---|---|---|
| late payment interest calculator overdue invoice | /finance/late-fee-interest | ✅ registry + deploy |
| speech time calculator words per minute | /utilities/speech-time | ✅ |
| post hole concrete calculator fence posts | /construction/post-hole-concrete | ✅ |
| UPS battery sizing calculator ah runtime backup | /engineering/ups-sizing | ✅ |
| lawn fertilizer calculator nitrogen rate per 1000 sq ft | /lifestyle/lawn-fertilizer | ✅ |

In 5 ke liye content already hai; sirf **deploy + IndexNow ping + GSC re-index**
trigger bacha hai (owner steps, BING-WEBMASTER-GUIDE.md Step 4 se IndexNow).

**GSC report ka honest gap:** GSC API credentials abhi bhi unconfigured hain —
positions/impressions ka real data sirf manual GSC dashboard se dekha ja sakta hai
ya credentials set karke `scripts/gsc-indexing.cjs` chala kar. Ye doc replace
hoga real data aane par.
