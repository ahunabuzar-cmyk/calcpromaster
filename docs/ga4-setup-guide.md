# CalcProMaster — GA4 status & remaining owner steps

**Tracking is done and live; reporting is blocked (re-checked 2026-10-15).** The Measurement ID is a real property, not a placeholder, and it
is served by production right now. What is still open is the *reporting* side (reading GA4 back
with the Data API), and the only thing blocking it is two API toggles in Google Cloud — an owner
action, listed below with exact links.

## 1. Tracking — DONE (verified against production, not just the repo)

| Piece | Where | Status |
|---|---|---|
| Measurement ID | `js/site-config.js` → `ga4Id: 'G-8QCP0TP1TD'` | ✅ real ID (not `G-XXXXXXXXXX`) |
| Live site serves it | `https://calcpromaster.com/js/site-config.js` | ✅ verified via HTTP fetch |
| gtag.js loader | `index.html` (lazy: first interaction or ~5s idle) | ✅ present on the live homepage |
| Consent Mode | `index.html` → `gtag('consent', 'default', …)` | ✅ `analytics_storage: denied` until Accept |
| `calculator_use` event | `js/app.js` | ✅ `{ tool_id, tool_category }` — no input values, no PII |
| Load gate | `js/site-config.js` → `SITE_GA4_READY` regex | ✅ placeholder IDs never load gtag |

Reproduce the live check any time:

```bash
curl -s https://calcpromaster.com/js/site-config.js | grep -o "ga4Id: '[^']*'"
curl -s https://calcpromaster.com/ | grep -c googletagmanager     # expect 3
```

In the browser (F12 → Network → filter `gtag`): the request
`googletagmanager.com/gtag/js?id=G-8QCP0TP1TD` returns 200 after first interaction, and a
`collect` request follows a calculation with `en=calculator_use`. GA4 → **Realtime** then shows
the page view within ~30 s.

## 2. Reporting (numeric property ID) — BLOCKED on two API toggles

`npm run monitor:ga4` reads events back with the GA4 Data API. It needs the **numeric** property
ID (e.g. `123456789`) — never the `G-XXXX` measurement ID — and Google will not serve either
Analytics API to this project yet:

```
✖ Google Analytics Admin API is DISABLED on Cloud project 601116511726
✖ Google Analytics Data  API is DISABLED on Cloud project 601116511726
```

The OAuth token is healthy and already carries `analytics.readonly` — verified by exchanging it
and reading back its scopes — so this is **not** a credential problem and not `invalid_grant`.
The APIs were simply never enabled for the project that owns the OAuth client.

### Fix (owner, ~2 minutes, no billing, no card)

Enable both APIs in the Google Cloud project **601116511726**:

1. Admin API (property discovery) —
   https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=601116511726
2. Data API (event/report reads) —
   https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=601116511726

Clear **Enable** on each, wait ~2 minutes, then:

```bash
npm run ga4:discover                                  # prints every property + its numeric ID
GA4_PROPERTY_ID=<numeric-id> npm run monitor:ga4 -- --days 28
```

`npm run ga4:discover` prints the exact command with the ID already filled in, so nothing has to
be copied out of the GA4 UI. It also maps each numeric property back to its `G-XXXX` stream, which
is how the running site is matched to the property.

To make the checks permanent in CI, set the two repository secrets (already referenced by
`.github/workflows/analytics-trackers.yml`):

| Secret | Value |
|---|---|
| `GA4_PROPERTY_ID` | the numeric property ID from `npm run ga4:discover` |
| `SERVICE_ACCOUNT_B64` | base64 service-account JSON with Viewer on the property — see [api-credentials-setup.md](api-credentials-setup.md) |

Until then `analytics-trackers.yml` skips the GA4 job instead of failing, which is the honest
state: tracking live, reporting not yet readable.

### 2026-10-15 re-check (still blocked, and it is not a token problem)

Retried `npm run ga4:discover` on 2026-10-15: **both APIs are still disabled** on
Cloud project `601116511726` (`analyticsadmin.googleapis.com` → 403
`SERVICE_DISABLED`). The OAuth refresh token exchanged successfully in the same run
(GSC reads worked), so the failure is the project's API enablement, not
`invalid_grant`, not a missing scope.

What is genuinely missing, in order:

| # | Missing piece | Who can supply it |
|---|---|---|
| 1 | Admin API enabled on project 601116511726 (property discovery) | owner, 1 click (link above) |
| 2 | Data API enabled on project 601116511726 (report/event reads) | owner, 1 click (link above) |
| 3 | `GA4_PROPERTY_ID` — the numeric property id | printed by `npm run ga4:discover` once (1) is on |
| 4 | `SERVICE_ACCOUNT_B64` — base64 service-account JSON, Viewer on the property (CI path only) | owner, GCP → IAM → Service accounts |
| 5 | `analytics-trackers.yml` GA4 job stops skipping | automatic once (3) + (4) are set |

Nothing in the repo can produce (3): the numeric property id exists only inside the
Google account, and the Data API rejects the `G-XXXX` measurement id with HTTP 404.
Until (1)–(3) land, `npm run monitor:ga4` stays unrunnable and CI keeps skipping the
GA4 job by design rather than failing on it.

## 3. Why the property ID cannot be committed

The numeric ID is not derivable from the repo — it only exists inside the Google account. The
`G-8QCP0TP1TD` measurement ID identifies the *stream*, not the property, and the Data API rejects
it with HTTP 404. That is why this is an owner step and not a build step; the tooling around it
(discovery, exact command, CI secrets) is already in place.

## Typical timeline once the APIs are on

- Realtime GA4 events: instant.
- Standard reports (Traffic acquisition, Pages, Events): 24–48 h.
- GSC query/click data: separate system, 1–2 weeks — join it with GA4 traffic via `npm run seo:gsc-join`.
