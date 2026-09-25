# CalcProMaster — GSC Sitemap Submit + Indexing Request (Click-by-Click Guide)

> Ye guide "video guide" ki tarah hai — har click, har screen, har button ka exact path.
> Total time: **~10 minutes**. Koi paid tool nahi, koi code change nahi — sirf GSC UI.
> Site + verification file pehle se live hai — bas ye steps follow karo.

---

## PREREQUISITE — Property verify ho (1 check, 1 min)

1. Browser kholo → **https://search.google.com/search-console**
2. Google account se login (wohi account jisme website hai — koi bhi chalega).
3. Agar pehli baar hai: **Start now** dabao.
4. Dashboard pe **property list** — `https://calcpromaster.com` **dikhta hai to skip** (property already verified). Niche ka Step 0 chhodo, seedha **PART A** pe jao.
5. Agar nahi dikhta → **Add property** → **URL prefix** tab → paste:
   ```
   https://calcpromaster.com
   ```
   → **Continue**.
6. Verification screen pe → **HTML file** method select karo.
7. Google ek file download karne ko bolega — **download mat karna** (file pehle se live hai). Bas **VERIFY** button dabao.
8. ✅ **Property verified** dikhega → dashboard khulega.

---

## PART A — Sitemap Submit (5 min)

### Step A1 — Sitemaps page kholo
1. Left sidebar (dashboard ke) → niche scroll karo.
2. **Indexing** section mein **Sitemaps** pe click karo.
   - *Sidebar nahi dikh raha?* Left top corner pe **hamburger (☰)** icon dabao → sidebar khul jayega.

### Step A2 — Sitemap URL daalo
1. **"Add a new sitemap"** box dikhega (screen ke beech, ya upar).
2. Box mein bas ye likho (poora URL nahi — sirf naam):
   ```
   sitemap.xml
   ```
   - *Domain `https://calcpromaster.com` pehle se grey mein dikhega — usse mat chhedo.*
3. **Submit** button dabao (green button).

### Step A3 — Result check (kya dikhna chahiye)
1. Neeche **Submitted sitemaps** table mein `sitemap.xml` dikhega.
2. Status column: **Success** ya **"Success"** halke green mein.
3. **"Found 1 sitemap"** message aayega (kabhi "Found" column mein).
4. ~24-48 ghante baad **"Discovered URLs: 778"** type count dikhega — matlab Google ne saari URLs dekh li.
5. **Errors/Warnings column: 0** honi chahiye.
   - Agar "Couldn't fetch" aaye → 10 min baad page refresh (Google crawl slow ho sakta hai).
   - Agar koi error count > 0 → mujhe batao, main sitemap check kar ke fix dunga.

### Step A4 — Verification done ✅
Isi page ko chhodo, ab **PART B** karo.

---

## PART B — Request Indexing (top-5 URLs, ~4 min)

> Har URL ke liye alag-alag karna hoga — sirf **6 URLs** karne hain, baaki 772 sitemap se khud
> mil jayenge. Sab pe request karna zaroori nahi (aur Google limit bhi lagata hai).

### Step B1 — URL Inspection kholo
1. Left sidebar → **URL inspection** (Indexing section ke andar).
   - *Top pe search bar bhi hai — wahan bhi URL paste kar sakte ho.*
2. Ye URL paste karo (pehla):
   ```
   https://calcpromaster.com/
   ```
3. **Enter** dabao.

### Step B2 — Inspect hua result dekho
1. Google 2-5 sec mein **"URL is on Google"** ya **"URL is not on Google"** dikhayega.
2. Koi bhi status ho — **REQUEST INDEXING** button screen ke upar-right (ya card ke andar) milta hai.
   - **"Request indexing"** pe click karo.
   - ✅ Green toast/notification: *"Requested indexing"* — ho gaya.

### Step B3 — Baaki 5 URLs (repeat)
URL inspection ke search box mein dobara paste karo + **Request indexing**:

1. `https://calcpromaster.com/finance/loan-emi`
2. `https://calcpromaster.com/math/percentage`
3. `https://calcpromaster.com/health/bmi`
4. `https://calcpromaster.com/conversion/unit-converter` *(jo bhi popular ho — sitemap se koi bhi 2-3 aur)*
5. `https://calcpromaster.com/engineering/beam-deflection` *(example — apni top calculators chuno)*

> Tip: Kaunse calculators popular hain wo dekhne ke liye `sitemap.xml` kholo aur jo top pe
> lag rahe hain unhe request karo. Homepage + finance + math + health + conversion — ye mix
> best hai.

---

## PART C — Kya Expected Hai (kya normal hai, kya problem)

| Time | Kya hoga | Normal? |
|---|---|---|
| Day 0 | Sitemap "Success" + Request Indexing done | ✅ |
| 24-48h | 778 URLs "Discovered" (Sitemaps page) | ✅ |
| Days 1-7 | 5-30 pages "Indexed" (Pages report) | ✅ |
| Days 1-14 | "Discovered – not yet indexed" / "Crawled – not indexed" labels | ✅ **NORMAL** — Google ka crawl time hai |
| Week 2-4 | Indexed count 50 → 200 → 500+ slow growth | ✅ |
| Week 2-4 | Search mein results aana shuru | ✅ (2-4 hafte lagte hain) |
| **Red flags** | 500/404 spikes, sitemap errors, robots blocked | ❌ Problem — mujhe report karo |

**Golden line:** 2-4 hafte tak "indexed nahi" hona **error nahi hai**. Technical readiness
pehle hi verified hai (23/23 checks PASS). Bas patience + weekly monitoring.

---

## WEEKLY MONITORING (5 min, abhi chala bhi sakte ho)

```bash
node scripts/indexing-monitor.cjs
# → "23 passed · 0 failed — ALL INDEXING HEALTH CHECKS PASS"
```

GSC mein hafte mein ek baar:
1. **Sitemaps** → "Discovered URLs" badh raha hai?
2. **Pages** (Indexing → Pages) → Indexed count badh raha hai?
3. **URL inspection** → 2-3 calculators ka status kya hai?

---

## PROBLEM-SOLVING

| Problem | Cause | Fix |
|---|---|---|
| "Couldn't fetch" sitemap | Google crawl slow / transient | 15-30 min baad refresh |
| Sitemap errors > 0 | Sitemap mein 404 URL | `node scripts/indexing-monitor.cjs` se check, mujhe report karo |
| Request indexing button disabled | Behtareen recently request kia | 2-3 din wait karo, dobara try |
| "URL is on Google" nahi dikhta | Abhi index nahi hua | Normal — request karo, wait karo |
| Verification screen pe file nahi | Site pe file missing | File live hai — URL bar mein manually kholo: `https://calcpromaster.com/googled1ac20b54b36e7cf.html` → 200 aaye to GSC pe VERIFY dobara |

---

**Ek line summary:** GSC → Sitemaps → `sitemap.xml` → Submit → Success → URL inspection →
homepage + 5 calculators → Request indexing → **ho gaya, bas 2-4 hafte wait karo.**
