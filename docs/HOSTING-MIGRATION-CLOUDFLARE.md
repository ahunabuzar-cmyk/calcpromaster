# CalcProMaster — Move from Netlify to Cloudflare Pages (free, no bandwidth cap)

Status: **site currently paused on Netlify** (HTTP 503) because the free plan hit its
monthly usage limit. This guide moves the site to Cloudflare Pages, whose free plan has
**unlimited bandwidth**, so the pause cannot happen again.

---

## 1. Why the site went down

- The live URL `https://calcpromaster.com/` returns **503 Service Unavailable** with the
  message "This site was paused as it reached its usage limits."
- That message is Netlify's free-plan pause. It is **not** a bug in the site, a security
  issue, or an SEO issue. Nothing in the code needs fixing to un-pause it.
- Netlify's free plan is now credit-based (since Sept 2025): roughly **300 credits/month**,
  about **15 GB of bandwidth** — far less than the old 100 GB. A paused site stays down
  until the next billing cycle or until the plan is upgraded (Pro is ~$19/month).
- Why this site hits it so fast: each page load ships about **1.3 MB of eager JS**, and
  there are ~1,255 tool pages. Crawlers plus normal traffic exhaust 15 GB quickly.

## 2. Why Cloudflare Pages is the right free fix

| Thing | This site needs | Cloudflare Pages free plan |
|---|---|---|
| Bandwidth | a lot, spiky | **unlimited** (no GB cap) |
| Files per site | 2,919 | 20,000 |
| Largest single file | 1.5 MB | 25 MB |
| `_headers` rules | 11 (longest line 1,267 chars) | 100 rules, 2,000 chars/line |
| `_redirects` rules | 123 | 2,000 static + 100 dynamic |
| Custom domain + SSL | yes | free, automatic |
| Builds | occasional | 500/month |

**Everything fits with headroom.** The same `_headers` and `_redirects` files are used, so
CSP, HSTS, X-Frame-Options and all URL redirects carry over. Same domain and same URLs
means **SEO is preserved**.

> Note: Netlify's `_redirects` `404` rewrites and `301!` / absolute-source rules are not
> supported by Cloudflare and are simply ignored. This loses nothing important: Cloudflare
> serves `404.html` with a real 404 status for unknown paths automatically.

## 3. Before you start

- The site must be rebuilt so `deploy/` is current: `node build-deploy.js` (already run).
- You need a **Cloudflare account** (free) and access to the domain's registrar to change
  nameservers.
- The agent cannot log in for you — account creation, the wrangler browser login, and the
  nameserver change are done by you.

## 4. Deploy (about 5 minutes)

```bash
cd /c/Users/ok/Documents/Calculator/project

# 1. Build the current deploy folder (already done, rerun to be safe)
node build-deploy.js

# 2. Deploy to Cloudflare Pages. First run opens a browser to log in / create the project.
npm run deploy:cf
```

`npm run deploy:cf` runs:

```bash
npx --yes wrangler@latest pages deploy deploy --project-name=calcpromaster
```

When it finishes it prints a `https://<hash>.calcpromaster.pages.dev` URL. Open it and
check a few pages (home, a tool, `/about.html`, a category).

## 5. Point the domain at Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → project `calcpromaster` → **Custom domains**
   → **Set up a domain** → enter `calcpromaster.com` (and `www.calcpromaster.com`).
2. Cloudflare shows two **nameservers**. Log in to your domain registrar and replace the
   current nameservers with those two.
3. Wait for propagation (minutes to a few hours). Cloudflare issues the SSL certificate
   automatically.
4. Keep the Netlify site as-is for now; do not delete it until the domain is confirmed live
   on Cloudflare.

## 6. Verify after the switch (must-pass checklist)

Run these against the live domain once DNS has moved:

```bash
# Security headers present (CSP, HSTS, X-Frame-Options, etc.)
curl -sI https://calcpromaster.com/ | grep -iE "content-security-policy|strict-transport|x-frame|referrer|permissions-policy"

# security.txt still served from the dot-directory
curl -sI https://calcpromaster.com/.well-known/security.txt

# A redirect rule still works
curl -sI https://calcpromaster.com/anything-that-redirects

# Unknown path returns the custom 404 page with a 404 status
curl -sI https://calcpromaster.com/this-page-does-not-exist-xyz

# Embed widget is still frameable (permissive frame-ancestors on /embed/*)
curl -sI https://calcpromaster.com/embed/<tool-id> | grep -iE "content-security-policy|x-frame"
```

- If `.well-known/security.txt` returns 404, tell the agent — a Pages Function or a plain
  redirect can expose it.
- Re-run securityheaders.com on the live domain and confirm the grade is unchanged.

## 7. After go-live (SEO hygiene)

1. Google Search Console → **Sitemaps** → resubmit `sitemap.xml`.
2. Use **URL Inspection** on the homepage and a few top tool pages → **Request indexing**.
3. Confirm `robots.txt` and `sitemap.xml` load and reference `calcpromaster.com`.
4. Keep the Netlify deploy available as a fallback for a week or two, then retire it.

## 8. Stop the root cause (recommended next)

Unlimited bandwidth removes the pause, but the site is still heavy. Worth doing anyway:

- The homepage sends ~1.3 MB of eager JS. Split it and lazy-load per-category bundles so
  each page sends only what it needs.
- Add `Cache-Control: immutable` to any content-hashed assets (already done for
  `/fonts/*`, `/og/*`, `/icons/*`).
- Consider a Cloudflare cache rule / Brotli (Cloudflare enables Brotli by default) to
  shrink transfer size for repeat visitors.
- Do **not** enable Cloudflare "Bot Fight Mode" without checking My Activity — verified
  crawlers like Googlebot are allowed, but confirm crawling in GSC for a few days after.

## 9. Rollback

If anything looks wrong, point the registrar nameservers back to Netlify. The
`deploy/` folder and `netlify.toml` are unchanged, so the Netlify site still works whenever
its plan limit resets or is upgraded.
