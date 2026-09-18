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
