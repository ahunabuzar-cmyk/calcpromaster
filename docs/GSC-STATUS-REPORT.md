# GSC status report — CalcProMaster

## Token state: ✅ LIVE (re-authorized 2026-10-16)

`npm run gsc:verify` — token exchange, property list and a `searchAnalytics` read all pass:

```
✅ step 1  token exchange        OK (expires in 3599s)
✅ step 2  property list          OK — 2 propert(y|ies) readable
   ✓ target property present: https://calcpromaster.com/
✅ step 3  searchAnalytics read   OK — 5 day(s) returned for 2026-10-09 → 2026-10-15
   clicks 2 · impressions 3099 · newest day with data: 2026-10-13
✅ ALL READ CHECKS PASSED — token, property and data access are live.
```

The 2026-10-15 refresh pull therefore reads **live** API data, not a cache:
`data/gsc-page-impressions.json`, `data/gsc-query-page.json`, `seo-indexing-audit.json`,
`data/index-panel.json` (all re-written 2026-10-15) and `docs/INDEX-PANEL.md`.
Re-run any of them at will:

```bash
npm run gsc:verify     # read-only: token → property → one searchAnalytics row
npm run seo:weekly     # refresh every GSC-fed artifact
```

### ⚠️ The 7-day expiry WILL come back until the consent screen is published

The root cause below is still unfixed at the Google side: an OAuth consent screen in
**Testing** status gets refresh tokens that Google expires **7 days** later, unconditionally.
The token refreshed here was minted 2026-10-15/16, so it dies again around **2026-10-22/23**
unless the owner sets **Publishing status → PUBLISH APP** (see *Root cause* below).
The difference now is that the failure is **self-explaining**: `npm run gsc:verify` prints
the diagnosis instead of a bare `invalid_grant`.

---

## Baseline snapshot (2026-10-02) — historical, superseded

> The coverage/performance tables below are the **early-October baseline** taken while the site
> was mid-migration from the paused Netlify host to Cloudflare Pages. They are kept because the
> "before" numbers are the only pre-migration reference that exists. For current numbers read
> the live artifacts listed above, not this section.

## Data provenance

| Field | Value |
|---|---|
| Property | `https://calcpromaster.com` |
| Coverage pull | `data/gsc-coverage-report.json` — last run **2026-10-02 14:08 UTC** |
| URLs inspected | **1167** unique, across 14 batches |
| Trend pull | `data/gsc-trend.csv` — last row **2026-09-29** |
| Query→page join | `data/gsc-query-page.json` — window **2026-09-09 → 2026-10-07** (3971 rows) |
| Sitemap now | **1417 URLs** (was 1415 when this report was written — re-counted against the 2026-10-13 build) |
| Token state | ✅ **live again since 2026-10-16** (was `invalid_grant` from 2026-10-12) — `npm run gsc:verify` passes all three read checks |
| Token death cause | ✅ **ROOT CAUSE (found 2026-10-14, still unfixed at Google):** the OAuth consent screen is in **"Testing"** publishing status; Google expires **every** refresh token for such apps after **7 days**. The token minted `2026-10-05` died on `2026-10-12` — exactly 7 days. It will repeat weekly until the app is published. |

**2026-10-13 re-check (historical — this is what the failure looked like before re-auth; read-only, no token values printed):**

```
OAuth refresh-token exchange failed (HTTP 400):
  {"error":"invalid_grant","error_description":"Token has been expired or revoked."}
```

**Root cause (identified 2026-10-14).** This was not a random revocation. An OAuth consent
screen in **"Testing"** publishing status gets refresh tokens that Google **expires after 7
days**, unconditionally. The stored token was obtained `2026-10-05`; `2026-10-12` is exactly
7 days later. That is the whole story, and it was sitting here mislabelled as "expired or
revoked" across two audits (`AUDIT-VERIFICATION-2026-10-13.md`, `SEO-CHANGE-AUDIT-2026-10-13.md`)
without the cause ever being named.

Two fixes, both required for different reasons:

1. **Immediate** — re-run the consent (`npm run gsc:login`) to mint a fresh token.
2. **Permanent** — Google Cloud Console → APIs & Services → OAuth consent screen →
   **Publishing status → PUBLISH APP**. Without it, step 1 dies again in 7 days. The app stays
   unverified and the "Continue" warning screen keeps working; only the 7-day cap goes away.

`npm run gsc:verify` now prints this diagnosis itself when it hits `invalid_grant`, and
`scripts/lib/google-oauth.cjs` attaches it to every script that exchanges the token — so the
next occurrence is self-explaining instead of a fresh investigation.

The baseline section below is frozen at its 2026-10-02 pull date **by design** (it is the
pre-migration reference). Live readings now exist again and live in the artifacts listed at the
top of this document — do not quote the baseline as today's numbers.

## Coverage tally (2026-10-02)

| Verdict | URLs | Share | Meaning |
|---|---:|---:|---|
| **INDEXED** | 375 | 32% | In Google's index — healthy |
| **DISCOVERED** | 339 | 29% | URL known, **not crawled yet** — crawl-budget backlog |
| **UNKNOWN** | 445 | 38% | Google has no data on the URL yet |
| **CANONICAL** | 3 | 0.3% | Duplicate correctly folded to the chosen canonical ✅ |
| **REDIRECT** | 2 | 0.2% | Old Netlify URLs 301ing to `.com` ✅ |
| **OTHER** | 3 | 0.3% | Catch-all (see `lists.OTHER` in the JSON) |

A third are indexed; ~two-thirds
(784) are *known but not crawled* or *unknown*. On a fresh domain migration that
is expected — Google has to re-discover every URL under `calcpromaster.com`, and
the paused-Netlify window throttled crawling exactly when the DNS moved. The
current build emits **1417** public sitemap URLs (1417 indexable + 199 deliberately
`noindex` variant pages + 1 Search Console verification file = 1617 built pages;
see `docs/SEO-CHANGE-AUDIT-2026-10-13.md` §4).

## Search performance (7-day window, 2026-09-29)

| Metric | Value |
|---|---|
| Clicks | 5 |
| Impressions | 2731 |
| CTR | 0.18% |
| Average position | 26.9 |

The impression jump (194 → 2731) is the `.com` property starting to report; the
low CTR at position ~27 is normal for page 3. Position trending from ~50 toward
~27 across the migration is the positive signal.

## What this means / actions

1. **Refresh the token first** — every number here is ~2 weeks stale.
2. **Resubmit the sitemap** in GSC (`sitemap.xml`, 1417 URLs) so the 339
   DISCOVERED URLs get re-queued for crawling.
3. **Request indexing** for the highest-value DISCOVERED tool pages (crawl budget
   is the bottleneck; internal-link depth fixes in this build help).
4. **Validate fix** on the Host status report (robots.txt + server-connectivity
   fail rates were from the paused-Netlify window — see the crawl-fix notes).
5. Nothing here is a red flag *for a migration*; the job is to get Google to
   re-crawl. The internal-link + title fixes shipped in this build serve that.

## How to refresh

Server-mode login cannot work in this environment (no background processes; the
`localhost:3737` callback refuses). Use **paste mode** — this is the exact command,
and it is the only step that needs a human (the browser consent screen):

```bash
cd /c/Users/ok/Documents/Calculator/project
node scripts/gsc-oauth-login.cjs --paste
```

(Last run 2026-10-15/16 — this is the command to use again when the 7-day token expires.)

It prints a consent URL, you approve, then paste the full `localhost:3737/...`
callback URL back into the terminal. The token writes to
`gsc-refresh-token.json` (gitignored — never commit it) and every GSC script
(`seo:gsc-join`, `seo:panel:inspect`, `seo:coverage-diff`, `seo:weekly`) works again.

**Verify before trusting any metric** — this reads only (token exchange → property
list → one searchAnalytics row) and writes nothing. Exit 0 = live, 1 = access
problem, 2 = token still dead:

```bash
npm run gsc:verify
```

And confirm the token file can never be committed:

```bash
git check-ignore -v gsc-refresh-token.json   # must print the .gitignore rule
```

In CI the same token lives in the `GSC_REFRESH_TOKEN_B64` secret; rotate it after a
successful local login (`docs/api-credentials-setup.md` → Plan B).
