# Host consolidation → `calcpromaster.com` (DONE ✅)

**Status: LIVE** (deployed 8 October 2026 via `wrangler pages deploy`).

The same site used to answer on **three** hostnames. Now only the canonical apex
serves content; the two duplicates issue a **301** to it:

| Host | Before | Now |
|---|---|---|
| `https://calcpromaster.com` | 200 | **200** (canonical — unchanged) |
| `https://www.calcpromaster.com` | 200 (duplicate) | **301 → apex** |
| `https://calcpromaster.pages.dev` | 200 (duplicate) | **301 → apex** |
| `https://<hash>.calcpromaster.pages.dev` (preview/deploy URL) | 200 | 200 (left alone, so previews keep working) |

Live check (run from the repo terminal):

```bash
curl -sI https://www.calcpromaster.com/health/pf-ratio/?x=1 | grep -iE 'HTTP/|location:'
# HTTP/1.1 301 ... location: https://calcpromaster.com/health/pf-ratio/?x=1   (path + query preserved)

curl -sI https://calcpromaster.pages.dev/math/percentage/ | grep -iE 'HTTP/|location:'
# HTTP/1.1 301 ... location: https://calcpromaster.com/math/percentage/

curl -sI https://calcpromaster.com/ | grep -iE 'HTTP/'
# HTTP/1.1 200 OK
```

---

## How it works (why this method)

A **zone-level Redirect Rule never fires** for a `*.pages.dev` request — that
host is served by Cloudflare's own `pages.dev` zone, not ours. The documented
fix is account-level **Bulk Redirects** (a dashboard task).

Instead we used **Pages Functions middleware**, which is repo-owned, version
-controlled and needs no dashboard access:

- File: [`functions/_middleware.js`](../functions/_middleware.js)
- It runs in front of static assets for every request to the Pages project.
- If `hostname` is `www.calcpromaster.com` or `calcpromaster.pages.dev`, it
  returns `Response.redirect('https://calcpromaster.com' + pathname + search, 301)`.
- Otherwise it calls `context.next()` (the site serves normally).
- Any error falls through — it can never break the site.
- It ships with the normal build: `node build-deploy.js && npx wrangler pages deploy deploy --project-name=calcpromaster`.

Tests: [`tests/unit/redirect-middleware.test.js`](../tests/unit/redirect-middleware.test.js).

## To turn it off

Delete `functions/_middleware.js` and redeploy. Nothing else changes.

## One operational note (free tier)

Adding Functions means **every request now invokes a Worker**. Cloudflare's
Workers Free plan includes **100,000 Function requests/day** (a page view plus
its assets ≈ a handful of requests). Current traffic is tiny, so this is a
non-issue — but two things to keep in mind long term:

1. If traffic ever approaches the daily allowance, move to a paid plan.
2. Check **Workers & Pages → `calcpromaster` → Settings → Runtime → Fail open /
   closed**. Set it to **Fail open** so that if the allowance is ever exhausted,
   static assets keep serving instead of the site going down.

---

## Alternative (dashboard, owner-only)

If you ever prefer to manage this in the Cloudflare dashboard instead, use
**Bulk Redirects** (account level). One list, two entries, then one rule.

| # | Source URL | Target URL | Status | Parameters |
|---|---|---|---|---|
| 1 | `www.calcpromaster.com` | `https://calcpromaster.com` | `301` | ☑ Preserve query string, ☑ Subpath matching, ☑ Preserve path suffix, ☑ Include subdomains |
| 2 | `calcpromaster.pages.dev` | `https://calcpromaster.com` | `301` | ☑ Preserve query string, ☑ Subpath matching, ☑ Preserve path suffix, ⬜ Include subdomains (OFF, so previews keep working) |

1. dash.cloudflare.com → **Bulk Redirects** → **Create Bulk Redirect List** (e.g. `apex-consolidation`).
2. Add the two entries above → **Save**.
3. **Bulk Redirect Rules → Create Bulk Redirect Rule** → select the list → **Save**.

> Do **not** delete the Pages project — that takes `calcpromaster.com` down too.

Reference: Cloudflare docs — *Redirecting www to domain apex* and
*Redirecting \*.pages.dev to a Custom Domain*.
