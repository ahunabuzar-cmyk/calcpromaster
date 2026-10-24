# TWA / PWA-to-Store Packaging Evaluation

Competitive-gap item 10. Status: **Deferred** (not blocked), with the path and
prerequisites recorded so it can be picked up later without rework.

## What a TWA is

A Trusted Web Activity wraps the existing PWA in a thin Android shell so it can
be listed on the Google Play Store. It reuses the live site, so there is no
second codebase to maintain. The app is a browser with no address bar, verified
against the site through Digital Asset Links.

## Is it feasible for CalcProMaster?

Yes, technically. The site is already a PWA (there is a `manifest.json` and a
service worker, `sw.js`, with a versioned cache). That is the main prerequisite.

What is needed:

1. A Play Store developer account (one-time 25 USD, owner-only payment).
2. A signing key for the Android package, kept safe.
3. A small Android project (or Bubblewrap CLI) that points at
   `https://calcpromaster.com` and uses the existing manifest.
4. A `/.well-known/assetlinks.json` file on the site matching the app signing
   fingerprint, so the wrapper is trusted and shows no URL bar.
5. A store listing: icon, screenshots, description, privacy policy link.
6. Ongoing: rebuild and resubmit when the target URL or signing key changes.

## Costs and effort

| Item | Cost | Effort |
|---|---|---|
| Play developer account | 25 USD one-time | Owner action |
| Bubblewrap setup + build | 0 | A few hours of dev time |
| assetlinks.json on site | 0 | Small, code-only |
| Store listing assets | 0 | A few hours |
| Ongoing maintenance | 0 | Low, only on key/URL changes |

## Recommendation

**Defer for now.** The site is not yet indexed and stable after the host
migration. A store listing is a distribution channel, not a ranking lever, and it
adds an account and a signing key to manage. The higher-value work is indexing,
authority and content.

Revisit once:

- The site is stably hosted (Cloudflare Pages migration complete).
- Indexing has grown, so the app has real users to retain.

## Prerequisites already met

- `manifest.json` present and referenced.
- Service worker (`sw.js`) with a cache version.
- HTTPS on the production domain.

## Not met yet (owner action)

- Play Store developer account and signing key.
- The `assetlinks.json` file (can be added by an agent once the signing
  fingerprint is known).
