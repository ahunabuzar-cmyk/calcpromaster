# SECURITY AUDIT REPORT — calcpromaster.com

Audit date: 4 October 2026
Method: static review of the shipped configuration (`_headers`, `netlify.toml`, `index.html`,
`build-deploy.js`, source scan of `js/*.js`) plus DNS lookups. Items that require a live crawl
of the production origin (securityheaders.com, SSL Labs) are marked PENDING-DEPLOY because the
hardened `_headers` is not live until the next Netlify deploy.

---

## 1.1 Security headers

State before: good, with two real defects.

Already present in `_headers` (single source of truth; `netlify.toml` intentionally sets none):
Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy, Strict-Transport-Security, Cross-Origin-Opener-Policy, Cache-Control.

Defect 1 — clickjacking. The global CSP ended with `frame-ancestors https:;`. Under CSP,
a `frame-ancestors` directive makes browsers ignore `X-Frame-Options`. So although the file
also set `X-Frame-Options: DENY`, any https page could still frame the site. The `/embed/*`
path rule (which legitimately needs framing) already overrides both, so the global rule did
not need to be permissive.
Fix: global `frame-ancestors https:` changed to `frame-ancestors 'self'`. The `/embed/*`
override is unchanged and still permits framing for the widget pages only.

Defect 2 — blocked images. `img-src` did not list the two backlink-badge hosts the footer
uses (`fazier.com`, `startupfa.me`), so those badge images were being blocked by CSP and
rendering broken.
Fix: added `https://fazier.com https://startupfa.me` to `img-src` in both the `_headers` CSP
and the in-page `http-equiv="Content-Security-Policy"` meta tag in `index.html`.

Known accepted weakness: `script-src` includes `'unsafe-inline'` because the app uses inline
event handlers and inline bootstrap scripts. Removing it would require hash/nonce plumbing
across a 4,000-line `index.html` and is deferred to avoid regression. Recorded as accepted
risk with rationale, not silently ignored.

Re-run after deploy: securityheaders.com — target grade A. Current grade cannot be measured
until the new `_headers` is live.

## 1.2 SSL / TLS

Netlify terminates TLS with a managed Let's Encrypt certificate and enforces TLS 1.2+ by
default; HSTS is declared with `max-age=63072000; includeSubDomains; preload`. This is the
Netlify default posture and is correct; no custom TLS configuration is possible on the
Netlify platform.
Action for owner: run ssllabs.com/ssltest against calcpromaster.com once and record the grade
in this file. Expected A. PENDING-DEPLOY.

## 1.3 Email authentication (SPF / DMARC / DKIM)

Checked with live DNS lookups on 4 Oct 2026:
- SPF: no TXT record returned for calcpromaster.com — SPF is MISSING.
- DMARC: `_dmarc.calcpromaster.com` returns NXDOMAIN — DMARC is MISSING.
- DKIM: cannot be verified from outside without the provider's selector; not in scope of DNS TXT lookups.

These records live at the DNS provider (Netlify DNS or the registrar), which the agent cannot
edit. Exact records to add, once the mail sender is confirmed:

SPF (only if the domain sends mail; if mail is via Google Workspace):
    v=spf1 include:_spf.google.com ~all

DMARC (start in monitoring mode):
    v=DMARC1; p=none; rua=mailto:dmarc@calcpromaster.com; fo=1

IMPORTANT: confirm which provider actually sends mail from this domain before publishing SPF,
and confirm the `rua` inbox exists before publishing DMARC. Do not publish an SPF that lists
the wrong provider. After 2-4 weeks of clean DMARC reports, move `p=none` to `p=quarantine`
then `p=reject`. This escalation is a manual follow-up, never automatic.

## 1.4 security.txt

State before: missing.
Fix: added `.well-known/security.txt` (RFC 9116) with two Contact entries (the contact page
and a security@ mailbox), an Expires date one year out, Preferred-Languages, Canonical and
Policy URLs. Wired into the build by adding `.well-known` to the deploy directory whitelist in
`build-deploy.js`, so it ships at https://calcpromaster.com/.well-known/security.txt.
Owner action: create the security@ mailbox (or edit the file to the inbox you actually monitor).

## 1.5 Dependency / third-party script audit

Third-party origins the shipped pages load or contact:
- www.googletagmanager.com, www.google-analytics.com, region1.google-analytics.com — Google
  Tag Manager / GA4. Loaded from Google's CDN, always current, no pinned version.
- pagead2.googlesyndication.com, googleads.g.doubleclick.net, tpc.googlesyndication.com,
  *.googlesyndication.com, *.g.doubleclick.net — Google AdSense/ads. First-party-hosted by Google.
- fonts.googleapis.com, fonts.gstatic.com — Google Fonts. Note: the site also self-hosts its
  primary latin woff2 fonts under /fonts, so the Google Fonts requests are for secondary faces only.
- open.er-api.com and api.frankfurter.app — keyless public currency-rate APIs, fetched at runtime
  for the currency converter (1-hour client cache, static fallback rates if both fail).
- fazier.com, startupfa.me — static badge images only (no script execution).

No JavaScript library is vendored with a pinned version that could carry a stale CVE — the only
third-party executable code is Google's own tag and ad scripts, which Google keeps current. The
runtime currency fetches are read-only JSON GETs to keyless endpoints.
Confirm after deploy: securityheaders.com will report CSP violations if any origin above is not
whitelisted; the `_headers` CSP already lists every origin used, so no violation is expected.

## 1.6 Client-side code exposure

Scanned all shipped `js/*.js` and `index.html` for api-key / secret / token / password /
bearer literals. The only matches are the password-generator tool's own UI strings and the
tokenizer's error message — no credentials. `js/currency.js` documents explicitly that the
API is keyless and no key literal is shipped. No secrets found; nothing to rotate.

## 1.7 Mixed content and outbound links

- Mixed content: the only `http://` string in `index.html` is `http://www.w3.org` — an XML
  namespace URI inside inline SVG, not a fetched resource. No real http:// resource references.
- Outbound links: the third-party badges and links use `rel="noopener"`. Recommend standardising
  on `rel="noopener noreferrer"` for all `target="_blank"` outbound links as a small hardening pass.

## 1.8 Cookie / consent security

The cookie-consent system stores its state in `localStorage`, which is exempt from the Secure /
HttpOnly / SameSite cookie attributes. GA4 and AdSense set their own first-party cookies with
their own attributes and cannot be re-scoped by site code. No custom site cookie is set, so
there is no site-owned cookie to harden. Recorded for completeness.

---

## Summary

Fixed this cycle: CSP `frame-ancestors` clickjacking gap; CSP `img-src` blocking the footer
badges; added `.well-known/security.txt` and wired it into the build.

Owner-only actions: add SPF + DMARC at the DNS provider (exact records above); run
securityheaders.com and SSL Labs after the next deploy and record grades here; create the
security@ mailbox.

Accepted risk (documented, not hidden): CSP `script-src 'unsafe-inline'`.
