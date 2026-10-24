# Backlink Verification — 10 Submissions (2026-10-04)

**Root blocker (pehle ye samjho):** `calcpromaster.com` **abhi live nahi**.
- `https://calcpromaster.com/` → connect fail (domain cutover pending)
- `https://www.calcpromaster.com/` → **HTTP 503** (purana paused Netlify)
- `https://calcpromaster.pages.dev/` → 200 ✅ (naya Cloudflare build)
- Cloudflare zone status → **`initializing`** (NS registry me Cloudflare par hain, par zone activate nahi hua)

Isliye **har wo directory jo URL fetch karke verify karti hai, 503/fail par reject ya error deti hai** —
jaise StackShare ka "Website returned error 503". Domain live hone se pehle dobara submit karna faida nahi dega.

---

## Verification table (public checks, 2026-10-04)

| # | Site | DR | Verified result |
|---|---|---|---|
| 1 | GitHub Awesome Lists (PR) | 95 | ⏳ PR merge confirm nahi hua (profile/repo live, awesome-list entry nahi mili) |
| 2 | Hacker News Show HN | 96 | ⏳ post nahi mila — retry window Oct 6+ |
| 3 | AlternativeTo | 85 | ⏳ bot 403; tracker = pending review (account se hi confirm hoga) |
| 4 | **StackShare** | 91 | ❌ **aap ka submit 503 par fail** — live nahi. Domain live hone ke baad dobara |
| 5 | Indie Hackers | 80 | ✅ **LIVE** par text purana: "1206 free calculators", 0 posts → tagline + build-log baaki |
| 6 | LibHunt | 78 | ❌ listing nahi mili |
| 7 | Uneed | 74 | ❌ `uneed.best/tool/calcpromaster` = **404** — live nahi |
| 8 | Peerlist | 74 | ⏳ profile live; launchpad project verify pending |
| 9 | Slant.co | 70 | ❌ pehle 526 blocked; abhi listing nahi |
| 10 | OpenAlternative | 68 | ❌ `/calcpromaster` generic page return karta hai — live nahi |

**Sirf 1 (Indie Hackers) LIVE mila; baaki pending/failed — sab ka common cause: `.com` down.**

---

## Fix order (important — isi tarteeb se)

### Step 1 — Domain ko 200 par lao (SABSE PEHLE)
1. Cloudflare dashboard → **calcpromaster.com** zone kholo.
2. Agar **"Check nameservers now"** button dikhe → **click karo** (ye stuck `initializing` zone ko turant re-check karta hai).
3. Zone `active` hote hi DNS + HTTPS auto-set ho jayega (custom domains `calcpromaster.com` + `www` **attach ho chuke hain** — agent ne 2026-10-04 ko add kiye).
4. Verify: `curl -I https://calcpromaster.com/` → **200**.

### Step 2 — Netlify ko chhedо mat
Netlify paused hi rahe → purana duplicate/503 dobara live na ho.

### Step 3 — Domain live hone ke BAAD re-submit karo
- ❌ Failed/not-live: **StackShare, Uneed, LibHunt, OpenAlternative, Slant** → dobara submit.
- ✅ Indie Hackers → tagline `1,282 free calculators with step-by-step formulas` karo + 1 build-log post.
- ⏳ AlternativeTo / Peerlist / GitHub PR / HN → jo pending hai wahi complete karo (naya account na banao).

### Step 4 — Sab kuch tracker me likho
`docs/backlink-tracker.csv` me status update: `FAILED-503-RESUBMIT` etc.

---

## Kyun ye safe hai (Google rules)
- Re-submission = **same listing fix karna**, naya spam nahi. Koi duplicate listing nahi banayi ja rahi.
- Har site ek hi baar → koi mass blast nahi, velocity natural.
- Content sach (1,282 calculators) — koi fake claim nahi.

## Honest bottom line
Aaj ki asli rukawat **backlinks nahi, domain hai**. Jab tak `.com` 200 nahi deta, koi bhi directory
submission succeed nahi karegi. **Step 1 (Check nameservers now) sabse pehle karo** — uske baad baaki
sab unlock ho jayega.
