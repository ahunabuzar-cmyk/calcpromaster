# Bing Webmaster Guide — CalcProMaster

**2026-09-19 · ~15 min active work** · Bing/Yandex/DuckDuckGo (jo Bing index use karte hain) mein site ki visibility ka seedha rasta. Tumhari verification file `BingSiteAuth.xml` (key `CC0D44E3...`) already repo root mein hai aur **build pipeline deploy copy banata hai** (`deploy/BingSiteAuth.xml`).

## Step 1 — Deploy push (precondition)

Bing verification file live URL par honi chahiye:
`https://calcpromaster.com/BingSiteAuth.xml` → deploy push ke baad ye 200 dega.
(Abhi tak deploy nahi hua — isliye pehle Netlify par push karo.)

## Step 2 — Bing Webmaster signup + verify

1. https://www.bing.com/webmasters kholo → **Sign in** (Microsoft/Google/GitHub account chalega)
2. **Add site** → URL type karo: `https://calcpromaster.com`
3. Verification method: **XML file** chuno → Bing `BingSiteAuth.xml` maangta hai →
   kyunki file already root par deploy ho chuki hai, bas **Verify** dabao → green.
   - (Backup method: CNAME bhi hai, par XML wala zero-effort hai.)

## Step 3 — Sitemap submit

1. Dashboard → **Sitemaps** → **Submit sitemap**
2. URL: `https://calcpromaster.com/sitemap.xml` → Submit
3. Status "Processing" se "Success" hone mein 1-3 din.

## Step 4 — IndexNow connect (already built!)

- `ping-indexnow.js` repo mein ready hai aur key file site par serve hoti hai
- CI workflow (`.github/workflows/indexnow.yml`) deploy ke baad **auto-ping** karta hai — Bing ko naya content minutes mein milta hai
- Bing Webmaster dashboard → **IndexNow** section → yahan submitted URLs ka status dikhega (1332 URLs, aakhri real ping: 0 failed)

## Step 5 — Kya check karna (weekly, 5 min)

| Section | Kya dekho | Kya matlab |
|---|---|---|
| **Search Performance** | clicks/impressions by query | Tumhare Tier-A keywords (EASY-KEYWORD-LIST.md) yahan dikhne lage = strategy kaam kar rahi |
| **URL Inspection** | koi bhi tool page | "Discovered, not indexed" dikhe to internal links kamzor hain (cluster links madad karenge) |
| **Index Explorer** | total indexed pages | 1,332 ke qareeb aana chahiye |
| **SEO Report** | Bing's own audit | Long-URL/meta warnings fix karo |

## Step 6 — Google parity (yaad-dilani)

Bing Webmaster ka data **Google Search Console ka backup truth** hai — Google wali taraf
`service-account.json` + GSC setup chahiye (`docs/api-credentials-setup.md`). Dono chalu
ho jayein to main dono ka combined ranking report bana dunga.

## Kya main khud kar sakta hoon / kya nahi

- **Nahi:** Bing Webmaster signup/verify — browser + tumhara Microsoft/Google account chahiye (login-only step, automation nahi).
- **Haan:** deploy ke baad verification file ka 200 check, sitemap reachability, IndexNow ping status — bolo to turant verify kar dunga.
