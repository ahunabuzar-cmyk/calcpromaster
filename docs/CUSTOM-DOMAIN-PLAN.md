# Custom Domain Switch Plan — calcpromaster.netlify.app → Own Domain

The netlify.app subdomain is the #2 SEO blocker (after backlinks): it caps brand trust, shares reputation with millions of subdomains, and some high-authority sites refuse to link to hosted-subdomain sites. This is the exact, ordered plan. Estimated effort: ~2 hours active work + 2–4 weeks of search settling.

## Phase 0 — Buy & prepare (Day 0)

1. **Buy the domain** (Namecheap / Cloudflare / Porkbun). Recommended: `calcpromaster.com` (exact brand, easiest recall). Alternatives: `.app`, `.io`. Price band: $10–35/yr.
2. **Do NOT change code yet.** `build-deploy.js` already centralizes the whole domain pipeline in `js/site-config.js` → the `domain:` field. `substituteDomain()` rewrites every hardcoded `calcpromaster.netlify.app` across the entire deploy tree at build time — sitemap, canonicals, schema, robots, llms.txt, verification files. One config change drives everything (verified in build-deploy.js lines 249–278).

## Phase 1 — Pre-flight checks (Day 0, 30 min)

1. Verify the pipeline: temporarily set `domain: 'calcpromaster.com'` in `js/site-config.js`, run `node build-deploy.js`, then:
   ```bash
   grep -rl "calcpromaster.netlify.app" deploy/ | wc -l   # must be 0
   ```
2. **Revert** `site-config.js` back to `calcpromaster.netlify.app` until launch day (the live site must keep working).
3. Confirm all search-engine verifications survive the swap — they are plain files copied verbatim: `googled1ac20b54b36e7cf.html` (Google), `BingSiteAuth.xml`, the IndexNow key file.
4. Diff the build output with the new domain: sitemap.xml, robots.txt, llms.txt, canonical + JSON-LD URLs, and the `_redirects`/`.htaccess` copies must all reference the new domain.

## Phase 2 — Launch day (~1 hour)

1. In Netlify: **Domain management → Add custom domain** → set it primary. Wait for DNS verification + Let's Encrypt HTTPS to show green.
2. **DNS records** at the registrar:
   - apex `A` record → `75.2.60.5` (Netlify load balancer)
   - `www` CNAME → `your-domain.netlify.app` (or apex CNAME flattening if the registrar supports it)
   - Cloudflare users: proxy OFF (grey cloud) during initial cert issuance, optionally re-enable after.
3. Set the canonical host — **pick exactly one** (www or apex) and 301 the other. Netlify's "primary domain" setting does this for you on their side.
4. In `js/site-config.js` set the `domain:` field to the new domain, rebuild, deploy.
5. **Verify the old-subdomain redirect**:
   ```bash
   curl -sI https://calcpromaster.netlify.app/finance/loan-emi | head -3
   # expect: 301 with Location: https://<your-domain>/finance/loan-emi
   ```
   Netlify issues this automatically once the custom domain is primary; confirm it is a 301 (permanent), not 302.
6. **Verify the 404 contract survived** on the new host: a prerendered page → 200, a garbage extensionless URL → true 404 (the `_redirects` rules are domain-agnostic and carried over verbatim).
7. If the canonical host differs from what old links used, add one forced redirect at the very top of `_redirects` (before all other rules) so every request lands on the canonical host:
   ```
   # Example only (apex is canonical; www redirects to apex):
   https://www.example.com/*  https://example.com/:splat  301!
   ```

## Phase 3 — Post-switch (Day 0–7)

1. Google Search Console: **Settings → Change of address** (netlify-app property → new domain property). This accelerates signal transfer.
2. Submit the new-domain sitemap in GSC (it already carries the new domain after the rebuild).
3. Bing Webmaster: same change-of-address + sitemap submit.
4. Watch GSC → Pages daily for two weeks: old URLs should fall toward zero as 301s consolidate; new URLs should climb toward the old count (1,330+ URLs).
5. Update every link you control: social profiles, directory listings, email signatures, README/blog bios.
6. Keep BOTH GSC properties; the old property keeps reporting the 301 sources.

## Phase 4 — Success criteria (2–4 weeks)

- `site:calcpromaster.netlify.app` results trending to zero on Google.
- GSC "Pages → Indexed" on the new property climbing toward the previous count.
- No 404 spike in GSC (a spike means a redirect hole — inspect the newest URLs failing first).
- Rankings typically dip 0–3 days and recover within 2–4 weeks on a clean 1:1 301 map.

## Why this is SEO-safe by design

- Every URL is 1:1 301-mapped — no URL structure change, no content change.
- The domain lives in one config field; `substituteDomain()` rewrites the whole deploy tree at build time, so nothing is hand-edited.
- GSC change-of-address + sitemap resubmission accelerate re-crawling.
- The soft-404 fix (whitelisted rewrites + true-404 catch-all) is domain-agnostic and carries over verbatim.
- Honest risk: domain authority does not transfer 100% — expect a temporary dip. The netlify.app subdomain's inherent authority was near zero anyway, so net-net the switch is upside.

## Open decisions (user)

- Domain name: `calcpromaster.com` vs `.app`/`.io`?
- Canonical host: www or apex (pick one, 301 the other)?
- Registrar / DNS provider (plain DNS or Cloudflare)?
